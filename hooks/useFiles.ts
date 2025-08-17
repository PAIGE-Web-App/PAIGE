import { useState, useEffect } from 'react';
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
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getUserCollectionRef } from '@/lib/firebase';
import { db, storage } from '@/lib/firebase';
import type { FileCategory, FileItem, AIAnalysisResult, FileUploadData, FileSearchFilters } from '@/types/files';

export function useFiles() {
  const { user } = useAuth();
  const { showSuccessToast, showErrorToast } = useCustomToast();

  // State
  const [files, setFiles] = useState<FileItem[]>([]);
  const [categories, setCategories] = useState<FileCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [processingFile, setProcessingFile] = useState<string | null>(null);

  // Optimized files listener with proper cleanup
  useEffect(() => {
    let isSubscribed = true;
    
    if (user) {
      const q = query(
        getUserCollectionRef('files', user.uid),
        orderBy('uploadedAt', 'desc'),
        limit(100) // Limit for better performance
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        if (!isSubscribed) return;
        
        const fileList: FileItem[] = snapshot.docs.map(doc => {
          const data = doc.data() as any;
          return {
            id: doc.id,
            name: data.name,
            description: data.description,
            category: data.category,
            categoryId: data.categoryId,
            folderId: data.folderId || data.categoryId || 'all', // Use folderId if available, fallback to categoryId, then 'all'
            uploadedAt: data.uploadedAt?.toDate() || new Date(),
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
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date(),
          };
        });

        if (isSubscribed) {


          setFiles(fileList);
          setLoading(false);
        }
      }, (error) => {
        if (isSubscribed) {
          console.error('Error fetching files:', error);
          showErrorToast('Failed to load files');
          setLoading(false);
        }
      });

      return () => {
        isSubscribed = false;
        unsubscribe();
      };
    }
  }, [user]);

  // Optimized categories listener with proper cleanup
  useEffect(() => {
    let isSubscribed = true;
    
    if (user) {
      const q = query(
        getUserCollectionRef('fileCategories', user.uid),
        orderBy('createdAt', 'asc'),
        limit(50) // Limit for better performance
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        if (!isSubscribed) return;
        
        const categoryList: FileCategory[] = snapshot.docs.map(doc => {
          const data = doc.data() as any;
          return {
            id: doc.id,
            name: data.name,
            count: data.count || 0,
            color: data.color,
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date(),
          };
        });

        if (isSubscribed) {
          // Add "All Files" category
          const allFilesCategory: FileCategory = {
            id: 'all',
            name: 'All Files',
            count: files.length,
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          setCategories([allFilesCategory, ...categoryList]);
        }
      }, (error) => {
        if (isSubscribed) {
          console.error('Error fetching file categories:', error);
          showErrorToast('Failed to load file categories');
        }
      });

      return () => {
        isSubscribed = false;
        unsubscribe();
      };
    }
  }, [user, files.length]);

  // Upload file
  const uploadFile = async (uploadData: FileUploadData) => {
    if (!user) return;

    setUploading(true);
    try {
      // Upload file to Firebase Storage
      const fileName = `${Date.now()}_${uploadData.fileName}`;
      const fileRef = storageRef(storage, `users/${user.uid}/files/${fileName}`);
      

      const snapshot = await uploadBytes(fileRef, uploadData.file);
      const downloadURL = await getDownloadURL(snapshot.ref);
      


      const fileDoc = {
        name: uploadData.fileName,
        description: uploadData.description,
        category: uploadData.category,
        categoryId: uploadData.category,
        folderId: uploadData.category, // Use category as folderId for now
        uploadedAt: new Date(),
        fileType: uploadData.file.type,
        fileSize: uploadData.file.size,
        fileUrl: downloadURL, // Use actual Firebase Storage URL
        userId: user.uid,
        // Only include optional fields if they have values
        ...(uploadData.vendorId && { vendorId: uploadData.vendorId }),
        ...(uploadData.messageId && { messageId: uploadData.messageId }),
        isProcessed: false,
        processingStatus: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const docRef = await addDoc(getUserCollectionRef('files', user.uid), fileDoc);
      
      // Start AI processing
      await processFileWithAI(docRef.id);
      
      // Don't show toast here - let the modal handle it
      return docRef.id;
    } catch (error) {
      console.error('Error uploading file:', error);
      showErrorToast('Failed to upload file');
      throw error;
    } finally {
      setUploading(false);
    }
  };

  // Process file with AI
  const processFileWithAI = async (fileId: string) => {
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

      // Don't show toast for AI completion - let the upload modal handle success
      // showSuccessToast('File analysis completed!');
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
  };

  // Add category
  const addCategory = async (name: string, color?: string) => {
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
  };

  // Delete file
  const deleteFile = async (fileId: string) => {
    if (!user) return;

    try {
      await deleteDoc(doc(getUserCollectionRef('files', user.uid), fileId));
      // Don't show toast here - let the calling component handle user feedback
    } catch (error) {
      console.error('Error deleting file:', error);
      showErrorToast('Failed to delete file');
    }
  };

  // Update file
  const updateFile = async (fileId: string, updates: Partial<FileItem>) => {
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
  };

  // Search files
  const searchFiles = (query: string, filters?: FileSearchFilters) => {
    let filteredFiles = files;

    // Text search
    if (query) {
      filteredFiles = filteredFiles.filter(file =>
        file.name.toLowerCase().includes(query.toLowerCase()) ||
        file.description.toLowerCase().includes(query.toLowerCase()) ||
        file.aiSummary?.toLowerCase().includes(query.toLowerCase())
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
  };

  return {
    // State
    files,
    categories,
    loading,
    uploading,
    processingFile,

    // Actions
    uploadFile,
    processFileWithAI,
    addCategory,
    deleteFile,
    updateFile,
    searchFiles,
  };
} 