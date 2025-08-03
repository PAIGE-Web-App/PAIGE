import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from './useAuth';
import { useCustomToast } from './useCustomToast';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  Timestamp,
  limit,
} from 'firebase/firestore';
import { getUserCollectionRef } from '@/lib/firebase';
import { db } from '@/lib/firebase';
import type { FileCategory, FileItem, AIAnalysisResult, FileUploadData, FileSearchFilters } from '@/types/files';

// Memoized date processing function
const processDate = (dateField: any): Date | undefined => {
  if (!dateField) return undefined;
  if (typeof dateField.toDate === 'function') return dateField.toDate();
  if (dateField instanceof Date) return dateField;
  return undefined;
};

// Memoized file data transformation
const transformFileData = (doc: any): FileItem => {
  const data = doc.data();
  return {
    id: doc.id,
    name: data.name,
    description: data.description,
    category: data.category,
    categoryId: data.categoryId,
    uploadedAt: processDate(data.uploadedAt) || new Date(),
    fileType: data.fileType,
    fileSize: data.fileSize,
    fileUrl: data.fileUrl,
    userId: data.userId,
    aiSummary: data.aiSummary,
    keyPoints: data.keyPoints || [],
    vendorAccountability: data.vendorAccountability || [],
    importantDates: data.importantDates || [],
    paymentTerms: data.paymentTerms || [],
    cancellationPolicy: data.cancellationPolicy || [],
    vendorId: data.vendorId,
    vendorName: data.vendorName,
    messageId: data.messageId,
    isProcessed: data.isProcessed || false,
    processingStatus: data.processingStatus || 'pending',
    createdAt: processDate(data.createdAt) || new Date(),
    updatedAt: processDate(data.updatedAt) || new Date(),
  };
};

// Memoized category data transformation
const transformCategoryData = (doc: any): FileCategory => {
  const data = doc.data();
  return {
    id: doc.id,
    name: data.name,
    count: data.count || 0,
    color: data.color,
    createdAt: processDate(data.createdAt) || new Date(),
    updatedAt: processDate(data.updatedAt) || new Date(),
  };
};

export function useFilesOptimized() {
  const { user } = useAuth();
  const { showSuccessToast, showErrorToast } = useCustomToast();

  // State
  const [files, setFiles] = useState<FileItem[]>([]);
  const [categories, setCategories] = useState<FileCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [processingFile, setProcessingFile] = useState<string | null>(null);

  // Memoized file statistics
  const fileStats = useMemo(() => {
    const totalFiles = files.length;
    const processedFiles = files.filter(f => f.isProcessed).length;
    const pendingFiles = files.filter(f => f.processingStatus === 'pending').length;
    const processingFiles = files.filter(f => f.processingStatus === 'processing').length;
    const failedFiles = files.filter(f => f.processingStatus === 'failed').length;

    return {
      total: totalFiles,
      processed: processedFiles,
      pending: pendingFiles,
      processing: processingFiles,
      failed: failedFiles,
      processingPercentage: totalFiles > 0 ? (processedFiles / totalFiles) * 100 : 0,
    };
  }, [files]);

  // Memoized categories with real-time counts
  const categoriesWithCounts = useMemo(() => {
    const categoryCounts = files.reduce((acc, file) => {
      acc[file.category] = (acc[file.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return categories.map(category => ({
      ...category,
      count: category.id === 'all' ? files.length : categoryCounts[category.id] || 0,
    }));
  }, [categories, files]);

  // Optimized file fetching with pagination support
  useEffect(() => {
    if (!user) return;

    const q = query(
      getUserCollectionRef('files', user.uid),
      orderBy('uploadedAt', 'desc'),
      limit(100) // Limit initial load for better performance
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fileList: FileItem[] = snapshot.docs.map(transformFileData);
      setFiles(fileList);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching files:', error);
      showErrorToast('Failed to load files');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, showErrorToast]);

  // Optimized category fetching
  useEffect(() => {
    if (!user) return;

    const q = query(
      getUserCollectionRef('fileCategories', user.uid),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const categoryList: FileCategory[] = snapshot.docs.map(transformCategoryData);

      // Add "All Files" category
      const allFilesCategory: FileCategory = {
        id: 'all',
        name: 'All Files',
        count: files.length,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      setCategories([allFilesCategory, ...categoryList]);
    }, (error) => {
      console.error('Error fetching file categories:', error);
      showErrorToast('Failed to load file categories');
    });

    return () => unsubscribe();
  }, [user, files.length, showErrorToast]);

  // Memoized upload function
  const uploadFile = useCallback(async (uploadData: FileUploadData) => {
    if (!user) return;

    setUploading(true);
    try {
      // TODO: Implement actual file upload to storage (Firebase Storage, AWS S3, etc.)
      // For now, we'll simulate the upload
      
      const fileDoc = {
        name: uploadData.fileName,
        description: uploadData.description,
        category: uploadData.category,
        categoryId: uploadData.category,
        uploadedAt: new Date(),
        fileType: uploadData.file.type,
        fileSize: uploadData.file.size,
        fileUrl: 'https://example.com/uploaded-file.pdf', // Placeholder
        userId: user.uid,
        vendorId: uploadData.vendorId,
        messageId: uploadData.messageId,
        isProcessed: false,
        processingStatus: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const docRef = await addDoc(getUserCollectionRef('files', user.uid), fileDoc);
      
      // Start AI processing
      await processFileWithAI(docRef.id);
      
      showSuccessToast('File uploaded successfully!');
      return docRef.id;
    } catch (error) {
      console.error('Error uploading file:', error);
      showErrorToast('Failed to upload file');
      throw error;
    } finally {
      setUploading(false);
    }
  }, [user, showSuccessToast, showErrorToast]);

  // Memoized AI processing function
  const processFileWithAI = useCallback(async (fileId: string) => {
    if (!user) return;

    setProcessingFile(fileId);
    try {
      // Update status to processing
      const fileRef = doc(getUserCollectionRef('files', user.uid), fileId);
      await updateDoc(fileRef, {
        processingStatus: 'processing',
        updatedAt: new Date(),
      });

      // TODO: Implement actual AI processing
      // This would involve:
      // 1. Extracting text from the file (PDF, image, etc.)
      // 2. Sending to AI service for analysis
      // 3. Storing results back to Firestore
      
      // Simulate AI processing delay
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Mock AI analysis result
      const aiResult: AIAnalysisResult = {
        summary: 'Contract for wedding photography services covering ceremony and reception...',
        keyPoints: [
          'Payment schedule: 50% deposit, 50% 2 weeks before',
          'Coverage: 8 hours on wedding day',
          'Delivery: 4-6 weeks after wedding'
        ],
        vendorAccountability: [
          'Must deliver photos within 6 weeks',
          'Must provide backup photographer if unavailable',
          'Must attend rehearsal dinner for planning'
        ],
        importantDates: [
          'Deposit due: Upon signing',
          'Final payment: 2 weeks before wedding',
          'Photo delivery: 4-6 weeks after wedding'
        ],
        paymentTerms: [
          '50% deposit required to secure date',
          'Remaining 50% due 2 weeks before wedding'
        ],
        cancellationPolicy: [
          'Full refund if cancelled 30+ days before',
          '50% refund if cancelled 14-30 days before',
          'No refund if cancelled less than 14 days before'
        ],
        riskFactors: [
          'No backup photographer clause',
          'No weather contingency plan'
        ],
        recommendations: [
          'Add backup photographer requirement',
          'Include weather contingency clause',
          'Request sample albums before signing'
        ]
      };

      // Update file with AI results
      await updateDoc(fileRef, {
        aiSummary: aiResult.summary,
        keyPoints: aiResult.keyPoints,
        vendorAccountability: aiResult.vendorAccountability,
        importantDates: aiResult.importantDates,
        paymentTerms: aiResult.paymentTerms,
        cancellationPolicy: aiResult.cancellationPolicy,
        isProcessed: true,
        processingStatus: 'completed',
        updatedAt: new Date(),
      });

      showSuccessToast('File analysis completed!');
    } catch (error) {
      console.error('Error processing file with AI:', error);
      
      // Update status to failed
      const fileRef = doc(getUserCollectionRef('files', user.uid), fileId);
      await updateDoc(fileRef, {
        processingStatus: 'failed',
        updatedAt: new Date(),
      });
      
      showErrorToast('Failed to process file with AI');
    } finally {
      setProcessingFile(null);
    }
  }, [user, showSuccessToast, showErrorToast]);

  // Memoized category management functions
  const addCategory = useCallback(async (name: string, color?: string) => {
    if (!user) return;

    try {
      await addDoc(getUserCollectionRef('fileCategories', user.uid), {
        name: name.trim(),
        count: 0,
        color: color || '#A85C36',
        userId: user.uid,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      showSuccessToast(`Category "${name}" added!`);
    } catch (error) {
      console.error('Error adding category:', error);
      showErrorToast('Failed to add category');
    }
  }, [user, showSuccessToast, showErrorToast]);

  const deleteFile = useCallback(async (fileId: string) => {
    if (!user) return;

    try {
      await deleteDoc(doc(getUserCollectionRef('files', user.uid), fileId));
      showSuccessToast('File deleted successfully');
    } catch (error) {
      console.error('Error deleting file:', error);
      showErrorToast('Failed to delete file');
    }
  }, [user, showSuccessToast, showErrorToast]);

  const updateFile = useCallback(async (fileId: string, updates: Partial<FileItem>) => {
    if (!user) return;

    try {
      const fileRef = doc(getUserCollectionRef('files', user.uid), fileId);
      await updateDoc(fileRef, {
        ...updates,
        updatedAt: new Date(),
      });

      showSuccessToast('File updated successfully');
    } catch (error) {
      console.error('Error updating file:', error);
      showErrorToast('Failed to update file');
    }
  }, [user, showSuccessToast, showErrorToast]);

  // Memoized search function with optimized filtering
  const searchFiles = useCallback((query: string, filters?: FileSearchFilters) => {
    let filteredFiles = files;

    // Text search with optimized string matching
    if (query) {
      const searchTerm = query.toLowerCase();
      filteredFiles = filteredFiles.filter(file =>
        file.name.toLowerCase().includes(searchTerm) ||
        file.description.toLowerCase().includes(searchTerm) ||
        file.aiSummary?.toLowerCase().includes(searchTerm)
      );
    }

    // Category filter
    if (filters?.category && filters.category !== 'all') {
      filteredFiles = filteredFiles.filter(file => file.category === filters.category);
    }

    // File type filter
    if (filters?.fileType) {
      filteredFiles = filteredFiles.filter(file => file.fileType === filters.fileType);
    }

    // Vendor filter
    if (filters?.vendorId) {
      filteredFiles = filteredFiles.filter(file => file.vendorId === filters.vendorId);
    }

    // AI analysis filter
    if (filters?.hasAIAnalysis !== undefined) {
      filteredFiles = filteredFiles.filter(file => 
        filters.hasAIAnalysis ? file.isProcessed : !file.isProcessed
      );
    }

    return filteredFiles;
  }, [files]);

  // Memoized file operations
  const retryProcessing = useCallback(async (fileId: string) => {
    await processFileWithAI(fileId);
  }, [processFileWithAI]);

  const bulkDelete = useCallback(async (fileIds: string[]) => {
    if (!user) return;

    try {
      // Bulk delete using Promise.all for better performance
      const deletePromises = fileIds.map(fileId => {
        const fileRef = doc(getUserCollectionRef('files', user.uid), fileId);
        return deleteDoc(fileRef);
      });
      await Promise.all(deletePromises);
      showSuccessToast(`${fileIds.length} files deleted successfully`);
    } catch (error) {
      console.error('Error bulk deleting files:', error);
      showErrorToast('Failed to delete files');
    }
  }, [user, showSuccessToast, showErrorToast]);

  return {
    // State
    files,
    categories: categoriesWithCounts,
    loading,
    uploading,
    processingFile,
    fileStats,

    // Actions
    uploadFile,
    processFileWithAI,
    addCategory,
    deleteFile,
    updateFile,
    searchFiles,
    retryProcessing,
    bulkDelete,
  };
} 