import { useState, useCallback } from 'react';
import { uploadImageToStorage, addImageToBoard } from '../utils/moodBoardUtils';
import { useCustomToast } from './useCustomToast';
import { MoodBoard } from '../types/inspiration';

interface UseImageUploadOptions {
  onBoardsUpdate: (boards: MoodBoard[]) => void;
  onFirstImageUpload?: (imageUrl: string, file: File) => void;
}

interface UploadProgress {
  fileName: string;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  error?: string;
}

export const useImageUpload = ({ onBoardsUpdate, onFirstImageUpload }: UseImageUploadOptions) => {
  const { showSuccessToast, showErrorToast } = useCustomToast();
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([]);

  const validateImage = useCallback((file: File): Promise<string | null> => {
    // Check file type
    if (!file.type.startsWith('image/')) {
      return Promise.resolve('Please select a valid image file');
    }

    // Check file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return Promise.resolve('Image size must be less than 10MB');
    }

    // Check image dimensions (basic validation)
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        if (img.width > 4000 || img.height > 4000) {
          resolve('Image dimensions must be less than 4000x4000 pixels');
        } else {
          resolve(null);
        }
      };
      img.onerror = () => resolve('Invalid image file');
      img.src = URL.createObjectURL(file);
    });
  }, []);

  const compressImage = useCallback((file: File, maxWidth = 1920, quality = 0.8): Promise<File> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        // Calculate new dimensions
        let { width, height } = img;
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        // Set canvas dimensions
        canvas.width = width;
        canvas.height = height;

        // Draw and compress
        ctx?.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now()
              });
              resolve(compressedFile);
            } else {
              resolve(file); // Fallback to original
            }
          },
          'image/jpeg',
          quality
        );
      };

      img.src = URL.createObjectURL(file);
    });
  }, []);

  const uploadImages = useCallback(async (files: File[], userId: string, boardId: string, moodBoards: MoodBoard[]) => {
    if (!files.length) return;

    setUploading(true);
    setUploadProgress(files.map(file => ({
      fileName: file.name,
      progress: 0,
      status: 'pending' as const
    })));

    // Keep track of current boards state for each upload
    let currentBoards = [...moodBoards];
    const uploadedImages: { imageUrl: string; file: File }[] = [];

    const uploadPromises = files.map(async (file, index) => {
      try {
        // Validate image
        const validationError = await validateImage(file);
        if (validationError) {
          setUploadProgress(prev => prev.map((item, i) => 
            i === index ? { ...item, status: 'error', error: validationError } : item
          ));
          return null;
        }

        // Update progress to uploading
        setUploadProgress(prev => prev.map((item, i) => 
          i === index ? { ...item, status: 'uploading', progress: 10 } : item
        ));

        // Compress image if needed
        const compressedFile = file.size > 2 * 1024 * 1024 ? await compressImage(file) : file;

        // Update progress
        setUploadProgress(prev => prev.map((item, i) => 
          i === index ? { ...item, progress: 30 } : item
        ));

        // Upload to storage
        const imageUrl = await uploadImageToStorage(compressedFile, userId, boardId);

        // Update progress
        setUploadProgress(prev => prev.map((item, i) => 
          i === index ? { ...item, progress: 90 } : item
        ));

        // Add to current boards state
        currentBoards = addImageToBoard(currentBoards, boardId, imageUrl, file.name);
        
        // Update the boards state
        onBoardsUpdate(currentBoards);

        // Store for first image callback
        uploadedImages.push({ imageUrl, file });

        // Update progress to completed
        setUploadProgress(prev => prev.map((item, i) => 
          i === index ? { ...item, status: 'completed', progress: 100 } : item
        ));

        showSuccessToast(`Uploaded ${file.name} successfully!`);
        return imageUrl;

      } catch (error) {
        console.error(`Error uploading ${file.name}:`, error);
        setUploadProgress(prev => prev.map((item, i) => 
          i === index ? { 
            ...item, 
            status: 'error', 
            error: error instanceof Error ? error.message : 'Upload failed' 
          } : item
        ));
        return null;
      }
    });

    try {
      await Promise.all(uploadPromises);
      
      // Call first image callback after all uploads complete
      if (uploadedImages.length > 0 && onFirstImageUpload) {
        onFirstImageUpload(uploadedImages[0].imageUrl, uploadedImages[0].file);
      }
    } catch (error) {
      console.error('Error in batch upload:', error);
      showErrorToast('Some images failed to upload. Please try again.');
    } finally {
      setUploading(false);
      // Clear progress after a delay
      setTimeout(() => setUploadProgress([]), 3000);
    }
  }, [validateImage, compressImage, onBoardsUpdate, onFirstImageUpload, showSuccessToast, showErrorToast]);

  const cancelUpload = useCallback(() => {
    setUploading(false);
    setUploadProgress([]);
  }, []);

  return {
    uploading,
    uploadProgress,
    uploadImages,
    cancelUpload
  };
};
