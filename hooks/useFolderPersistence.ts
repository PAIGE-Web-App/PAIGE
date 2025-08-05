import { useEffect } from 'react';
import { FileFolder } from '@/types/files';

interface UseFolderPersistenceProps {
  folders: FileFolder[];
  selectedFolder: FileFolder | null;
  setSelectedFolder: (folder: FileFolder | null) => void;
  foldersLoading: boolean;
  filesLoading: boolean;
}

export const useFolderPersistence = ({
  folders,
  selectedFolder,
  setSelectedFolder,
  foldersLoading,
  filesLoading
}: UseFolderPersistenceProps) => {
  // Set selected folder on page load (remember last selection or default to "All Files")
  useEffect(() => {
    if (!foldersLoading && !filesLoading && selectedFolder === null && folders.length > 0) {
      // Try to restore the last selected folder from localStorage
      const savedFolderId = localStorage.getItem('selectedFileFolderId');
      
      if (savedFolderId) {
        // Check if the saved folder still exists
        const savedFolder = folders.find(folder => folder.id === savedFolderId);
        if (savedFolder) {
          setSelectedFolder(savedFolder);
          return;
        }
      }
      
      // Fallback to "All Files" if no saved folder or saved folder doesn't exist
      const allFilesFolder = folders.find(folder => folder.id === 'all');
      if (allFilesFolder) {
        setSelectedFolder(allFilesFolder);
      }
    }
  }, [foldersLoading, filesLoading, selectedFolder, folders, setSelectedFolder]);

  // Save selected folder to localStorage whenever it changes
  useEffect(() => {
    if (selectedFolder) {
      localStorage.setItem('selectedFileFolderId', selectedFolder.id);
    }
  }, [selectedFolder]);
}; 