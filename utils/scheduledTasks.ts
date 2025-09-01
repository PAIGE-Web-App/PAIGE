// utils/scheduledTasks.ts
// Scheduled tasks system for automated maintenance and updates

import { jobQueue } from './jobQueue';
import { Timestamp } from 'firebase/firestore';

export interface ScheduledTask {
  id: string;
  name: string;
  description: string;
  cronExpression: string;
  jobType: string;
  jobData: any;
  isActive: boolean;
  lastRun?: Date;
  nextRun?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CronExpression {
  minute: string; // 0-59 or *
  hour: string;   // 0-23 or *
  day: string;    // 1-31 or *
  month: string;  // 1-12 or *
  weekday: string; // 0-6 (Sunday=0) or *
}

// Parse cron expression
function parseCronExpression(expression: string): CronExpression {
  const parts = expression.split(' ');
  if (parts.length !== 5) {
    throw new Error('Invalid cron expression. Must have 5 parts: minute hour day month weekday');
  }

  return {
    minute: parts[0],
    hour: parts[1],
    day: parts[2],
    month: parts[3],
    weekday: parts[4]
  };
}

// Check if cron expression matches current time
function shouldRunNow(cronExpression: string): boolean {
  const now = new Date();
  const cron = parseCronExpression(cronExpression);

  // Check minute
  if (cron.minute !== '*' && !cron.minute.includes(now.getMinutes().toString())) {
    return false;
  }

  // Check hour
  if (cron.hour !== '*' && !cron.hour.includes(now.getHours().toString())) {
    return false;
  }

  // Check day
  if (cron.day !== '*' && !cron.day.includes(now.getDate().toString())) {
    return false;
  }

  // Check month
  if (cron.month !== '*' && !cron.month.includes((now.getMonth() + 1).toString())) {
    return false;
  }

  // Check weekday
  if (cron.weekday !== '*' && !cron.weekday.includes(now.getDay().toString())) {
    return false;
  }

  return true;
}

// Calculate next run time
function getNextRunTime(cronExpression: string): Date {
  const now = new Date();
  const cron = parseCronExpression(cronExpression);
  
  // Simple implementation - find next occurrence
  let nextRun = new Date(now);
  
  // Add 1 minute and check if it matches
  nextRun.setMinutes(nextRun.getMinutes() + 1);
  
  while (!shouldRunNow(cronExpression)) {
    nextRun.setMinutes(nextRun.getMinutes() + 1);
  }
  
  return nextRun;
}

// Predefined scheduled tasks
export const defaultScheduledTasks: Omit<ScheduledTask, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    name: 'Daily Vendor Data Sync',
    description: 'Sync vendor data from Google Places API daily',
    cronExpression: '0 2 * * *', // 2 AM daily
    jobType: 'vendor_sync',
    jobData: { syncAll: true },
    isActive: true
  },
  {
    name: 'Weekly Data Cleanup',
    description: 'Clean up old completed jobs and temporary data',
    cronExpression: '0 3 * * 0', // 3 AM every Sunday
    jobType: 'data_cleanup',
    jobData: { cleanupJobs: true, cleanupTempData: true },
    isActive: true
  },
  {
    name: 'Monthly Analytics Report',
    description: 'Generate monthly analytics and send report',
    cronExpression: '0 4 1 * *', // 4 AM on 1st of every month
    jobType: 'analytics_report',
    jobData: { reportType: 'monthly' },
    isActive: true
  },
  {
    name: 'Hourly System Health Check',
    description: 'Check system health and send alerts if needed',
    cronExpression: '0 * * * *', // Every hour
    jobType: 'health_check',
    jobData: { checkServices: true, sendAlerts: true },
    isActive: true
  },
  {
    name: 'Daily Email Queue Cleanup',
    description: 'Clean up failed email jobs and retry important ones',
    cronExpression: '30 1 * * *', // 1:30 AM daily
    jobType: 'email_cleanup',
    jobData: { cleanupFailed: true, retryImportant: true },
    isActive: true
  },
  {
    name: 'Daily Credit Refresh Queue',
    description: 'Create credit refresh jobs for all users at midnight',
    cronExpression: '0 0 * * *', // Midnight daily
    jobType: 'credit_refresh_queue',
    jobData: { createJobs: true },
    isActive: true
  },
  {
    name: 'Credit Refresh Worker',
    description: 'Process credit refresh jobs every 5 minutes',
    cronExpression: '*/5 * * * *', // Every 5 minutes
    jobType: 'credit_refresh_worker',
    jobData: { maxJobs: 20, processTime: 60000 },
    isActive: true
  }
];

// Scheduled task manager
class ScheduledTaskManager {
  private tasks: Map<string, ScheduledTask> = new Map();
  private interval: NodeJS.Timeout | null = null;
  private isRunning = false;

  constructor() {
    this.loadDefaultTasks();
  }

  /**
   * Load default scheduled tasks
   */
  private loadDefaultTasks(): void {
    defaultScheduledTasks.forEach(task => {
      const id = `default_${task.name.toLowerCase().replace(/\s+/g, '_')}`;
      this.tasks.set(id, {
        ...task,
        id,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    });
  }

  /**
   * Start the scheduled task manager
   */
  start(): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    console.log('Scheduled task manager started');

    // Check every minute
    this.interval = setInterval(() => {
      this.checkAndRunTasks();
    }, 60000); // 1 minute

    // Run initial check
    this.checkAndRunTasks();
  }

  /**
   * Stop the scheduled task manager
   */
  stop(): void {
    if (!this.isRunning) return;
    
    this.isRunning = false;
    console.log('Scheduled task manager stopped');

    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  /**
   * Check and run scheduled tasks
   */
  private async checkAndRunTasks(): Promise<void> {
    const now = new Date();
    
    for (const [id, task] of this.tasks) {
      if (!task.isActive) continue;
      
      try {
        if (shouldRunNow(task.cronExpression)) {
          await this.runTask(task);
        }
      } catch (error) {
        console.error(`Error checking task ${id}:`, error);
      }
    }
  }

  /**
   * Run a scheduled task
   */
  private async runTask(task: ScheduledTask): Promise<void> {
    try {
      console.log(`Running scheduled task: ${task.name}`);

      // Add job to queue
      const jobId = await jobQueue.addJob({
        type: task.jobType as any,
        priority: 'normal',
        data: task.jobData,
        maxAttempts: 3,
        metadata: {
          source: 'scheduled_task',
          description: task.description,
          tags: ['scheduled', 'automated']
        }
      });

      // Update task last run time
      task.lastRun = new Date();
      task.nextRun = getNextRunTime(task.cronExpression);
      task.updatedAt = new Date();

      console.log(`Scheduled task ${task.name} queued as job ${jobId}`);

    } catch (error) {
      console.error(`Error running scheduled task ${task.name}:`, error);
    }
  }

  /**
   * Add a new scheduled task
   */
  addTask(task: Omit<ScheduledTask, 'id' | 'createdAt' | 'updatedAt'>): string {
    const id = `custom_${Date.now()}_${task.name.toLowerCase().replace(/\s+/g, '_')}`;
    
    const newTask: ScheduledTask = {
      ...task,
      id,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.tasks.set(id, newTask);
    console.log(`Added scheduled task: ${task.name} (${id})`);

    return id;
  }

  /**
   * Update a scheduled task
   */
  updateTask(id: string, updates: Partial<ScheduledTask>): boolean {
    const task = this.tasks.get(id);
    if (!task) return false;

    const updatedTask = {
      ...task,
      ...updates,
      updatedAt: new Date()
    };

    this.tasks.set(id, updatedTask);
    console.log(`Updated scheduled task: ${task.name} (${id})`);

    return true;
  }

  /**
   * Remove a scheduled task
   */
  removeTask(id: string): boolean {
    const task = this.tasks.get(id);
    if (!task) return false;

    this.tasks.delete(id);
    console.log(`Removed scheduled task: ${task.name} (${id})`);

    return true;
  }

  /**
   * Get all scheduled tasks
   */
  getTasks(): ScheduledTask[] {
    return Array.from(this.tasks.values());
  }

  /**
   * Get a specific scheduled task
   */
  getTask(id: string): ScheduledTask | undefined {
    return this.tasks.get(id);
  }

  /**
   * Enable/disable a scheduled task
   */
  setTaskActive(id: string, active: boolean): boolean {
    return this.updateTask(id, { isActive: active });
  }
}

// Global scheduled task manager instance
export const scheduledTaskManager = new ScheduledTaskManager();

// Start the scheduled task manager (only on server side)
if (typeof window === 'undefined') {
  scheduledTaskManager.start();
}

export default scheduledTaskManager; 