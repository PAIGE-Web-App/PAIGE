export interface FileCategory {
  id: string;
  name: string;
  count: number;
  color?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface FileItem {
  id: string;
  name: string;
  description: string;
  category: string;
  categoryId: string;
  uploadedAt: Date;
  fileType: string;
  fileSize: number;
  fileUrl: string;
  userId: string;
  
  // AI Analysis Results
  aiSummary?: string;
  keyPoints?: string[];
  vendorAccountability?: string[];
  importantDates?: string[];
  paymentTerms?: string[];
  cancellationPolicy?: string[];
  
  // Metadata
  vendorId?: string;
  vendorName?: string;
  messageId?: string; // If file came from messaging
  isProcessed?: boolean;
  processingStatus?: 'pending' | 'processing' | 'completed' | 'failed';
  
  createdAt: Date;
  updatedAt: Date;
}

export interface AIAnalysisResult {
  summary: string;
  keyPoints: string[];
  vendorAccountability: string[];
  importantDates: string[];
  paymentTerms: string[];
  cancellationPolicy: string[];
  riskFactors: string[];
  recommendations: string[];
}

export interface FileUploadData {
  file: File;
  category: string;
  fileName: string;
  description: string;
  vendorId?: string;
  messageId?: string;
}

export interface FileSearchFilters {
  category?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
  fileType?: string;
  vendorId?: string;
  hasAIAnalysis?: boolean;
} 