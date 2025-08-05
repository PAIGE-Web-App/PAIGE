import { useMemo } from 'react';
import { FileFolder, FileItem } from '@/types/files';

interface UseContentDetectionProps {
  folders: FileFolder[];
  files: FileItem[];
  foldersLoading: boolean;
  filesLoading: boolean;
}

export const useContentDetection = ({
  folders,
  files,
  foldersLoading,
  filesLoading
}: UseContentDetectionProps) => {
  const hasContent = useMemo(() => {
    if (foldersLoading || filesLoading) return true; // Return true when loading to prevent empty state flash
    // Exclude the "All Files" folder from the count
    const userFolders = folders.filter(folder => folder.id !== 'all');
    const hasFiles = files.length > 0;
    const hasFolders = userFolders.length > 0;
    const result = hasFiles || hasFolders;
    
    // Debug logging (commented out for production)
    // console.log('Content Detection Debug:', {
    //   foldersLoading,
    //   filesLoading,
    //   totalFolders: folders.length,
    //   userFolders: userFolders.length,
    //   totalFiles: files.length,
    //   hasFiles,
    //   hasFolders,
    //   result,
    //   folderIds: folders.map(f => f.id)
    // });
    
    return result;
  }, [folders, foldersLoading, filesLoading, files.length]);

  return {
    hasContent
  };
}; 