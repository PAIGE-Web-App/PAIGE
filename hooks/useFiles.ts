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
  getDoc,
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
        limit(50) // Reduced from 100 to 50 for better performance
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
      
      // Don't automatically process with AI - let user trigger analysis manually
      // await processFileWithAI(docRef.id);
      
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

      // Get the file data to extract content
      let fileDoc = files.find(f => f.id === fileId);
      
      // If file not found in local files array, try to get it from Firestore
      if (!fileDoc) {
        try {
          const fileRef = doc(getUserCollectionRef('files', user.uid), fileId);
          const fileSnap = await getDoc(fileRef);
          if (fileSnap.exists()) {
            const data = fileSnap.data() as any;
            fileDoc = {
              id: fileSnap.id,
              name: data.name,
              description: data.description,
              category: data.category,
              categoryId: data.categoryId,
              folderId: data.folderId || data.categoryId || 'all',
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
            } as FileItem;
          }
        } catch (fetchError) {
          console.warn('Could not fetch file from Firestore:', fetchError);
        }
      }
      
      if (!fileDoc) {
        throw new Error('File not found in local state or Firestore');
      }

      // For now, we'll use a placeholder since we can't access the actual file content
      // In a real implementation, you'd need to store the file content or re-upload it
      // This is a limitation of the current architecture
      const fileContent = `[File: ${fileDoc.name}] - Content extraction will be implemented in the next phase.`;
      
      // Call the AI analysis API
      const response = await fetch('/api/analyze-file', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileName: fileDoc.name,
          fileContent: fileContent,
          fileType: fileDoc.fileType,
          userId: user?.uid || ''
        }),
      });

      if (!response.ok) {
        throw new Error(`AI analysis failed: ${response.status}`);
      }

      const result = await response.json();
      
      // Update file with AI results
      await updateDoc(fileRef, {
        aiSummary: result.analysis ? JSON.stringify(result.analysis, null, 2) : 'Analysis completed',
        keyPoints: result.analysis?.keyPoints || [],
        vendorAccountability: result.analysis?.vendorAccountability || [],
        importantDates: result.analysis?.importantDates || [],
        paymentTerms: result.analysis?.paymentTerms || [],
        cancellationPolicy: result.analysis?.cancellationPolicy || [],
        isProcessed: true,
        processingStatus: 'completed',
        updatedAt: new Date(),
      });

      // Don't show toast for AI completion - let the calling component handle success
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
  const updateFile = async (fileId: string, updates: Partial<FileItem>, suppressToast: boolean = false) => {
    if (!user) return;

    try {
      const fileRef = doc(getUserCollectionRef('files', user.uid), fileId);
      await updateDoc(fileRef, {
        ...updates,
        updatedAt: new Date(),
      });

      if (!suppressToast) {
        showSuccessToast('File updated successfully');
      }
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