import { useCallback } from 'react';
import { FileItem } from '@/types/files';

interface UseFileUploadCompletionProps {
  files: FileItem[];
  setSelectedFile: (file: FileItem | null) => void;
}

export const useFileUploadCompletion = ({
  files,
  setSelectedFile
}: UseFileUploadCompletionProps) => {
  const handleUploadComplete = useCallback((fileId: string) => {
    // Find the uploaded file and select it
    const uploadedFile = files.find(f => f.id === fileId);
    if (uploadedFile) {
      setSelectedFile(uploadedFile);
    }
  }, [files, setSelectedFile]);

  return {
    handleUploadComplete
  };
}; 