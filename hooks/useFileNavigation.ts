import { useCallback } from 'react';
import { FileFolder } from '@/types/files';

interface UseFileNavigationProps {
  folders: FileFolder[];
  parentFolder: FileFolder | null;
  setSelectedFolder: (folder: FileFolder | null) => void;
}

export const useFileNavigation = ({
  folders,
  parentFolder,
  setSelectedFolder
}: UseFileNavigationProps) => {
  const handleNavigateToParent = useCallback(() => {
    if (parentFolder) {
      setSelectedFolder(parentFolder);
    } else {
      const allFilesFolder = folders.find(f => f.id === 'all');
      if (allFilesFolder) {
        setSelectedFolder(allFilesFolder);
      }
    }
  }, [parentFolder, folders, setSelectedFolder]);

  const handleSelectSubfolder = useCallback((subfolder: FileFolder) => {
    setSelectedFolder(subfolder);
  }, [setSelectedFolder]);

  const handleNavigateToFolder = useCallback((folder: FileFolder) => {
    setSelectedFolder(folder);
  }, [setSelectedFolder]);

  return {
    handleNavigateToParent,
    handleSelectSubfolder,
    handleNavigateToFolder
  };
}; 