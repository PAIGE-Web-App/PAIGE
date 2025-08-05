import { useState, useEffect } from 'react';

export const useUploadProgress = () => {
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentFileIndex, setCurrentFileIndex] = useState(0);
  const [totalFiles, setTotalFiles] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    const handleUploadProgress = (event: CustomEvent) => {
      const { fileIndex, totalFiles: total, progress } = event.detail;
      setCurrentFileIndex(fileIndex + 1);
      setTotalFiles(total);
      setUploadProgress(progress);
      setIsUploading(true);
    };

    const handleUploadComplete = () => {
      setIsUploading(false);
      setUploadProgress(0);
      setCurrentFileIndex(0);
      setTotalFiles(0);
    };

    window.addEventListener('uploadProgress', handleUploadProgress as EventListener);
    window.addEventListener('uploadComplete', handleUploadComplete as EventListener);

    return () => {
      window.removeEventListener('uploadProgress', handleUploadProgress as EventListener);
      window.removeEventListener('uploadComplete', handleUploadComplete as EventListener);
    };
  }, []);

  return {
    uploadProgress,
    currentFileIndex,
    totalFiles,
    isUploading
  };
}; 