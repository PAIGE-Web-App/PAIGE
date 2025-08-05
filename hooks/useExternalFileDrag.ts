import { useState, useCallback } from 'react';
import { FileFolder } from '@/types/files';

interface UseExternalFileDragProps {
  selectedFolder: FileFolder | null;
  onUploadComplete?: (fileId: string) => void;
}

export const useExternalFileDrag = ({ selectedFolder, onUploadComplete }: UseExternalFileDragProps) => {
  const [isExternalDragging, setIsExternalDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent, setDropTarget: (target: string | null) => void, targetId: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Check if this is a file drag from outside the app
    if (e.dataTransfer.types.includes('Files')) {
      setIsExternalDragging(true);
      setDropTarget(targetId);
    } else {
      setDropTarget(targetId);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent, setDropTarget: (target: string | null) => void) => {
    e.preventDefault();
    e.stopPropagation();
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDropTarget(null);
      setIsExternalDragging(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, setDropTarget: (target: string | null) => void) => {
    e.preventDefault();
    e.stopPropagation();
    setDropTarget(null);
    setIsExternalDragging(false);
    
    // Handle external file drops
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      // Trigger file upload for each dropped file with progress tracking
      files.forEach((file, index) => {
        const uploadEvent = new CustomEvent('uploadFilesWithProgress', {
          detail: {
            files: [file],
            folderId: selectedFolder?.id || 'all',
            fileIndex: index,
            totalFiles: files.length
          }
        });
        window.dispatchEvent(uploadEvent);
      });
    }
  }, [selectedFolder]);

  return {
    isExternalDragging,
    handleDragOver,
    handleDragLeave,
    handleDrop
  };
}; 