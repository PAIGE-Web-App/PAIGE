// utils/jobQueue.ts
// Background job queue system for handling heavy tasks

import { db } from '@/lib/firebase';
import { collection, addDoc, updateDoc, doc, getDoc, getDocs, query, where, orderBy, limit, Timestamp, writeBatch } from 'firebase/firestore';

export interface Job {
  id?: string;
  type: 'email' | 'image_processing' | 'data_update' | 'scheduled_task' | 'vendor_sync';
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'retrying';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  data: any;
  attempts: number;
  maxAttempts: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  startedAt?: Timestamp;
  completedAt?: Timestamp;
  error?: string;
  result?: any;
  scheduledFor?: Timestamp;
  userId?: string;
  metadata?: {
    source?: string;
    description?: string;
    tags?: string[];
  };
}

export interface JobProcessor {
  type: string;
  processor: (job: Job) => Promise<any>;
  concurrency?: number;
  timeout?: number;
}

export interface QueueConfig {
  maxConcurrentJobs: number;
  retryDelays: number[];
  maxRetries: number;
  jobTimeout: number;
  cleanupInterval: number;
}

class JobQueue {
  private processors: Map<string, JobProcessor> = new Map();
  private config: QueueConfig;
  private isRunning = false;
  private activeJobs = 0;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(config: Partial<QueueConfig> = {}) {
    this.config = {
      maxConcurrentJobs: 5,
      retryDelays: [1000, 5000, 15000, 60000, 300000], // 1s, 5s, 15s, 1m, 5m
      maxRetries: 3,
      jobTimeout: 300000, // 5 minutes
      cleanupInterval: 3600000, // 1 hour
      ...config
    };

    this.startCleanup();
  }

  /**
   * Register a job processor
   */
  registerProcessor(processor: JobProcessor): void {
    this.processors.set(processor.type, processor);
  }

  /**
   * Add a job to the queue
   */
  async addJob(jobData: Omit<Job, 'id' | 'status' | 'attempts' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const job: Omit<Job, 'id'> = {
      ...jobData,
      status: 'pending',
      attempts: 0,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };

    const docRef = await addDoc(collection(db, 'jobs'), job);
    console.log(`Job added to queue: ${docRef.id} (${job.type})`);
    
    // Start processing if not already running
    if (!this.isRunning) {
      this.startProcessing();
    }

    return docRef.id;
  }

  /**
   * Start processing jobs
   */
  async startProcessing(): Promise<void> {
    if (this.isRunning) return;
    
    this.isRunning = true;
    console.log('Job queue started');

    while (this.isRunning) {
      try {
        // Check if we can process more jobs
        if (this.activeJobs >= this.config.maxConcurrentJobs) {
          await this.sleep(1000);
          continue;
        }

        // Get next job
        const job = await this.getNextJob();
        if (!job) {
          await this.sleep(5000);
          continue;
        }

        // Process job
        this.activeJobs++;
        this.processJob(job).finally(() => {
          this.activeJobs--;
        });

      } catch (error) {
        console.error('Error in job processing loop:', error);
        await this.sleep(5000);
      }
    }
  }

  /**
   * Stop processing jobs
   */
  stopProcessing(): void {
    this.isRunning = false;
    console.log('Job queue stopped');
  }

  /**
   * Get the next job to process
   */
  private async getNextJob(): Promise<Job | null> {
    const now = Timestamp.now();
    
    const q = query(
      collection(db, 'jobs'),
      where('status', 'in', ['pending', 'retrying']),
      where('scheduledFor', '<=', now),
      orderBy('priority', 'desc'),
      orderBy('createdAt', 'asc'),
      limit(1)
    );

    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;

    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() } as Job;
  }

  /**
   * Process a single job
   */
  private async processJob(job: Job): Promise<void> {
    const processor = this.processors.get(job.type);
    if (!processor) {
      await this.markJobFailed(job, `No processor found for job type: ${job.type}`);
      return;
    }

    try {
      // Update job status
      await this.updateJobStatus(job.id!, 'processing', { startedAt: Timestamp.now() });

      // Process with timeout
      const result = await this.withTimeout(
        processor.processor(job),
        processor.timeout || this.config.jobTimeout
      );

      // Mark as completed
      await this.updateJobStatus(job.id!, 'completed', {
        completedAt: Timestamp.now(),
        result
      });

      console.log(`Job completed: ${job.id} (${job.type})`);

    } catch (error) {
      console.error(`Job failed: ${job.id} (${job.type})`, error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await this.handleJobFailure(job, errorMessage);
    }
  }

  /**
   * Handle job failure with retry logic
   */
  private async handleJobFailure(job: Job, error: string): Promise<void> {
    const newAttempts = job.attempts + 1;
    
    if (newAttempts >= this.config.maxRetries) {
      await this.markJobFailed(job, error);
      return;
    }

    // Calculate retry delay
    const delayIndex = Math.min(newAttempts - 1, this.config.retryDelays.length - 1);
    const delay = this.config.retryDelays[delayIndex];
    const retryAt = new Date(Date.now() + delay);

    await this.updateJobStatus(job.id!, 'retrying', {
      attempts: newAttempts,
      error,
      scheduledFor: Timestamp.fromDate(retryAt)
    });

    console.log(`Job scheduled for retry: ${job.id} (attempt ${newAttempts})`);
  }

  /**
   * Mark job as failed
   */
  private async markJobFailed(job: Job, error: string): Promise<void> {
    await this.updateJobStatus(job.id!, 'failed', {
      completedAt: Timestamp.now(),
      error
    });

    console.log(`Job failed permanently: ${job.id} (${job.type})`);
  }

  /**
   * Update job status
   */
  private async updateJobStatus(jobId: string, status: Job['status'], updates: Partial<Job> = {}): Promise<void> {
    const jobRef = doc(db, 'jobs', jobId);
    await updateDoc(jobRef, {
      status,
      updatedAt: Timestamp.now(),
      ...updates
    });
  }

  /**
   * Execute function with timeout
   */
  private async withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    return Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Job timeout')), timeoutMs);
      })
    ]);
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get job status
   */
  async getJobStatus(jobId: string): Promise<Job | null> {
    const jobRef = doc(db, 'jobs', jobId);
    const jobSnap = await getDoc(jobRef);
    
    if (!jobSnap.exists()) return null;
    
    return { id: jobSnap.id, ...jobSnap.data() } as Job;
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(): Promise<{
    pending: number;
    processing: number;
    completed: number;
    failed: number;
    retrying: number;
    total: number;
  }> {
    const stats = { pending: 0, processing: 0, completed: 0, failed: 0, retrying: 0, total: 0 };
    
    const statuses: Job['status'][] = ['pending', 'processing', 'completed', 'failed', 'retrying'];
    
    for (const status of statuses) {
      const q = query(collection(db, 'jobs'), where('status', '==', status));
      const snapshot = await getDocs(q);
      stats[status] = snapshot.size;
      stats.total += snapshot.size;
    }
    
    return stats;
  }

  /**
   * Clean up old completed jobs
   */
  private async cleanupOldJobs(): Promise<void> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const q = query(
      collection(db, 'jobs'),
      where('status', 'in', ['completed', 'failed']),
      where('completedAt', '<', Timestamp.fromDate(thirtyDaysAgo))
    );
    
    const snapshot = await getDocs(q);
    const batch = writeBatch(db);
    
    snapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    if (snapshot.docs.length > 0) {
      await batch.commit();
      console.log(`Cleaned up ${snapshot.docs.length} old jobs`);
    }
  }

  /**
   * Start cleanup interval
   */
  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupOldJobs().catch(console.error);
    }, this.config.cleanupInterval);
  }

  /**
   * Stop cleanup interval
   */
  stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}

// Global job queue instance
export const jobQueue = new JobQueue();

// Job processors
export const jobProcessors: JobProcessor[] = [
  // Email processor
  {
    type: 'email',
    processor: async (job: Job) => {
      const { to, subject, body, from } = job.data;
      
      // Send email using your email service
      const response = await fetch('/api/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to, subject, body, from })
      });
      
      if (!response.ok) {
        throw new Error(`Email sending failed: ${response.statusText}`);
      }
      
      return { messageId: 'sent', timestamp: new Date().toISOString() };
    },
    concurrency: 3,
    timeout: 30000
  },

  // Image processing processor
  {
    type: 'image_processing',
    processor: async (job: Job) => {
      const { imagePath, options } = job.data;
      
      // Process image using Sharp
      const sharp = require('sharp');
      const path = require('path');
      
      const inputPath = path.join(process.cwd(), 'public', imagePath);
      const image = sharp(inputPath);
      
      if (options.width || options.height) {
        image.resize(options.width, options.height, {
          fit: 'inside',
          withoutEnlargement: true
        });
      }
      
      if (options.format) {
        image.toFormat(options.format, { quality: options.quality || 85 });
      }
      
      const buffer = await image.toBuffer();
      
      return { 
        processed: true, 
        size: buffer.length,
        format: options.format || 'original'
      };
    },
    concurrency: 2,
    timeout: 60000
  },

  // Data update processor
  {
    type: 'data_update',
    processor: async (job: Job) => {
      const { collection, documentId, updates } = job.data;
      
      const docRef = doc(db, collection, documentId);
      await updateDoc(docRef, {
        ...updates,
        updatedAt: Timestamp.now()
      });
      
      return { updated: true, documentId };
    },
    concurrency: 5,
    timeout: 30000
  },

  // Vendor sync processor
  {
    type: 'vendor_sync',
    processor: async (job: Job) => {
      const { placeId } = job.data;
      
      // Sync vendor data from Google Places API
      const response = await fetch('/api/google-place-details', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ placeId })
      });
      
      if (!response.ok) {
        throw new Error(`Vendor sync failed: ${response.statusText}`);
      }
      
      const vendorData = await response.json();
      
      // Update vendor in database
      const vendorRef = doc(db, 'vendors', placeId);
      await updateDoc(vendorRef, {
        ...vendorData,
        lastSynced: Timestamp.now()
      });
      
      return { synced: true, placeId };
    },
    concurrency: 2,
    timeout: 45000
  }
];

// Register all processors
jobProcessors.forEach(processor => {
  jobQueue.registerProcessor(processor);
});

// Start the job queue
if (typeof window === 'undefined') {
  jobQueue.startProcessing();
}

export default jobQueue; 