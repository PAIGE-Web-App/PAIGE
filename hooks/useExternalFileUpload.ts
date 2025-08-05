import { useEffect, useCallback } from 'react';

interface UseExternalFileUploadProps {
  uploadFile: (uploadData: any) => Promise<string | undefined>;
  showSuccessToast: (message: string) => void;
  showErrorToast: (message: string) => void;
}

export const useExternalFileUpload = ({
  uploadFile,
  showSuccessToast,
  showErrorToast
}: UseExternalFileUploadProps) => {
  const handleExternalFileDrop = useCallback(async (event: CustomEvent) => {
    const { files, folderId } = event.detail;
    
    try {
      for (const file of files) {
        await uploadFile({
          file,
          fileName: file.name,
          description: '',
          category: folderId,
        });
      }
      
      showSuccessToast(`${files.length} file(s) uploaded successfully!`);
    } catch (error) {
      console.error('Error uploading dropped files:', error);
      showErrorToast('Failed to upload file(s)');
    }
  }, [uploadFile, showSuccessToast, showErrorToast]);

  const handleExternalFileDropWithProgress = useCallback(async (event: CustomEvent) => {
    const { files, folderId, fileIndex, totalFiles } = event.detail;
    
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Update progress
        const progress = ((fileIndex + i) / totalFiles) * 100;
        window.dispatchEvent(new CustomEvent('uploadProgress', {
          detail: { fileIndex: fileIndex + i, totalFiles, progress }
        }));
        
        await uploadFile({
          file,
          fileName: file.name,
          description: '',
          category: folderId,
        });
      }
      
      // Signal completion
      window.dispatchEvent(new CustomEvent('uploadComplete'));
      showSuccessToast(`${files.length} file(s) uploaded successfully!`);
    } catch (error) {
      console.error('Error uploading dropped files:', error);
      showErrorToast('Failed to upload file(s)');
      window.dispatchEvent(new CustomEvent('uploadComplete'));
    }
  }, [uploadFile, showSuccessToast, showErrorToast]);

  useEffect(() => {
    window.addEventListener('uploadFiles', handleExternalFileDrop as EventListener);
    window.addEventListener('uploadFilesWithProgress', handleExternalFileDropWithProgress as EventListener);
    
    return () => {
      window.removeEventListener('uploadFiles', handleExternalFileDrop as EventListener);
      window.removeEventListener('uploadFilesWithProgress', handleExternalFileDropWithProgress as EventListener);
    };
  }, [handleExternalFileDrop, handleExternalFileDropWithProgress]);

  return {
    handleExternalFileDrop,
    handleExternalFileDropWithProgress
  };
}; 