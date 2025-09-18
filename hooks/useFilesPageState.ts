import { useState, useCallback, useMemo, useRef } from 'react';
import { FileFolder, FileItem } from '@/types/files';
import { useCustomToast } from './useCustomToast';

interface UseFilesPageStateProps {
  folders: FileFolder[];
  files: FileItem[];
  selectedFolder: FileFolder | null;
  setSelectedFolder: (folder: FileFolder | null) => void;
  addFolder: (name: string, description?: string, color?: string, parentId?: string) => Promise<void>;
  updateFolder: (folderId: string, updates: Partial<FileFolder>) => Promise<void>;
  deleteFolder: (folderId: string) => Promise<void>;
  uploadFile: (uploadData: any) => Promise<string | undefined>;
  deleteFile: (fileId: string) => Promise<void>;
  getFolderLevel: (folder: FileFolder) => number;
  STARTER_TIER_MAX_SUBFOLDER_LEVELS: number;
}

export function useFilesPageState({
  folders,
  files,
  selectedFolder,
  setSelectedFolder,
  addFolder,
  updateFolder,
  deleteFolder,
  uploadFile,
  deleteFile,
  getFolderLevel,
  STARTER_TIER_MAX_SUBFOLDER_LEVELS,
}: UseFilesPageStateProps) {
  const { showSuccessToast, showErrorToast } = useCustomToast();
  
  // Performance monitoring
  const renderCount = useRef(0);
  renderCount.current += 1;

  // UI State
  const [searchQuery, setSearchQuery] = useState('');

  const [searchOpen, setSearchOpen] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [showNewFolderInput, setShowNewFolderInput] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [showSubfolderModal, setShowSubfolderModal] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<string | null>(null);
  const [editingFolderNameId, setEditingFolderNameId] = useState<string | null>(null);
  const [editingFolderNameValue, setEditingFolderNameValue] = useState<string | null>(null);
  const [showDeleteFolderModal, setShowDeleteFolderModal] = useState(false);
  const [folderToDelete, setFolderToDelete] = useState<FileFolder | null>(null);
  const [showEditFolderModal, setShowEditFolderModal] = useState(false);
  const [folderToEdit, setFolderToEdit] = useState<FileFolder | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showSubfolderLimitBanner, setShowSubfolderLimitBanner] = useState(true);
  const [showAIPanel, setShowAIPanel] = useState(false);

  // Computed values with memoization
  const currentFolder = selectedFolder;
  
  const parentFolder = useMemo(() => {
    if (!currentFolder || currentFolder.id === 'all' || !currentFolder.parentId) {
      return null;
    }
    return folders.find(f => f.id === currentFolder.parentId) || null;
  }, [currentFolder, folders]);

  const hasReachedSubfolderLimit = useMemo(() => {
    if (!currentFolder || currentFolder.id === 'all') {
      return false;
    }
    const currentLevel = getFolderLevel(currentFolder);
    return currentLevel >= STARTER_TIER_MAX_SUBFOLDER_LEVELS;
  }, [currentFolder, getFolderLevel, STARTER_TIER_MAX_SUBFOLDER_LEVELS]);

  const currentSubfolders = useMemo(() => {
    if (!currentFolder) return [];
    return folders.filter(folder => folder.parentId === currentFolder.id);
  }, [folders, currentFolder]);

  const currentFiles = useMemo(() => {
    if (!currentFolder) return files;
    if (currentFolder.id === 'all') return files;
    return files.filter(file => file.folderId === currentFolder.id);
  }, [files, currentFolder]);

  // Optimized search with debouncing
  const filteredFiles = useMemo(() => {
    if (!searchQuery.trim()) return currentFiles;
    
    const query = searchQuery.toLowerCase();
    return currentFiles.filter(file => {
      const matchesName = file.name.toLowerCase().includes(query);
      const matchesDescription = file.description?.toLowerCase().includes(query) || false;
      return matchesName || matchesDescription;
    });
  }, [currentFiles, searchQuery]);

  // Optimized folder file counts with Map for O(1) lookups
  const folderFileCounts = useMemo(() => {
    const counts = new Map<string, number>();
    
    // Initialize all folders with 0
    folders.forEach(folder => counts.set(folder.id, 0));
    
    // Count files for each folder
    files.forEach(file => {
      const currentCount = counts.get(file.folderId) || 0;
      counts.set(file.folderId, currentCount + 1);
    });
    
    return counts;
  }, [files, folders]);

  // Event handlers
  const handleAddFolder = useCallback(async (name: string, description?: string, color?: string) => {
    try {
      await addFolder(name, description, color);
      setShowNewFolderInput(false);
      setNewFolderName('');
      showSuccessToast(`"${name}" folder created successfully!`);
    } catch (error) {
      console.error('Error adding folder:', error);
      showErrorToast('Failed to create folder');
    }
  }, [addFolder, showSuccessToast, showErrorToast]);

  const handleAddSubfolder = useCallback(async (name: string, description?: string, color?: string) => {
    if (!selectedFolder || selectedFolder.id === 'all') {
      showErrorToast('Please select a folder to create a subfolder in');
      return;
    }

    const currentLevel = getFolderLevel(selectedFolder);
    if (currentLevel >= STARTER_TIER_MAX_SUBFOLDER_LEVELS) {
      setShowUpgradeModal(true);
      return;
    }

    try {
      await addFolder(name, description, color, selectedFolder.id);
      showSuccessToast(`"${name}" subfolder created successfully!`);
    } catch (error) {
      console.error('Error adding subfolder:', error);
      showErrorToast('Failed to create subfolder');
    }
  }, [selectedFolder, addFolder, getFolderLevel, STARTER_TIER_MAX_SUBFOLDER_LEVELS, showSuccessToast, showErrorToast]);

  const handleRenameFolder = useCallback(async (folderId: string) => {
    if (!editingFolderNameValue?.trim()) {
      setEditingFolderNameId(null);
      setEditingFolderNameValue(null);
      return;
    }

    try {
      await updateFolder(folderId, { name: editingFolderNameValue.trim() });

      if (selectedFolder && selectedFolder.id === folderId) {
        setSelectedFolder({
          ...selectedFolder,
          name: editingFolderNameValue.trim()
        });
      }

      showSuccessToast('Folder renamed successfully!');
    } catch (error) {
      console.error('Error renaming folder:', error);
      showErrorToast('Failed to rename folder');
    } finally {
      setEditingFolderNameId(null);
      setEditingFolderNameValue(null);
    }
  }, [editingFolderNameValue, updateFolder, selectedFolder, setSelectedFolder, showSuccessToast, showErrorToast]);

  const handleDeleteFolder = useCallback(async (folderId: string) => {
    const folder = folders.find(f => f.id === folderId);
    if (!folder) return;

    const folderFiles = files.filter(file => file.folderId === folderId);
    
    if (folderFiles.length > 0) {
      setFolderToDelete(folder);
      setShowDeleteFolderModal(true);
    } else {
      await executeDeleteFolder(folderId);
    }
  }, [folders, files, setShowDeleteFolderModal, setFolderToDelete]);

  const executeDeleteFolder = useCallback(async (folderId: string) => {
    const folder = folders.find(f => f.id === folderId);
    if (!folder) return;

    // Check if this is the selected folder or the last folder before deletion
    const userFolders = folders.filter(f => f.id !== 'all');
    const isLastFolder = userFolders.length === 1 && userFolders[0].id === folderId;
    const isSelectedFolder = selectedFolder?.id === folderId;
    const shouldResetToAllFiles = isSelectedFolder || isLastFolder;

    try {
      await deleteFolder(folderId);
      showSuccessToast(`"${folder.name}" deleted successfully!`);
      
      // Reset to "All Files" if needed
      if (shouldResetToAllFiles) {
        // Clear localStorage to prevent persistence hook from overriding
        localStorage.removeItem('selectedFileFolderId');
        
        // Small delay to ensure folder deletion is processed
        setTimeout(() => {
          const allFilesFolder = folders.find(f => f.id === 'all');
          if (allFilesFolder) {
            setSelectedFolder(allFilesFolder);
          }
        }, 100);
      }
    } catch (error) {
      console.error('Error deleting folder:', error);
      showErrorToast('Failed to delete folder');
    } finally {
      setShowDeleteFolderModal(false);
      setFolderToDelete(null);
    }
  }, [folders, deleteFolder, selectedFolder, setSelectedFolder, showSuccessToast, showErrorToast]);

  const handleCloneFolder = useCallback(async (folderId: string) => {
    const folder = folders.find(f => f.id === folderId);
    if (!folder) return;

    try {
      const newName = `${folder.name} (Copy)`;
      await addFolder(newName, folder.description, folder.color, folder.parentId);
      showSuccessToast(`"${newName}" created successfully!`);
    } catch (error) {
      console.error('Error cloning folder:', error);
      showErrorToast('Failed to clone folder');
    }
  }, [folders, addFolder, showSuccessToast, showErrorToast]);

  const handleDeleteFile = useCallback((fileId: string) => {
    setFileToDelete(fileId);
    setShowDeleteConfirmation(true);
  }, []);

  const confirmDeleteFile = useCallback(async () => {
    if (!fileToDelete) return;

    try {
      const fileToDeleteItem = files.find(f => f.id === fileToDelete);
      await deleteFile(fileToDelete);
      setShowDeleteConfirmation(false);
      setFileToDelete(null);
      if (fileToDeleteItem) {
        showSuccessToast(`"${fileToDeleteItem.name}" deleted successfully!`);
      }
    } catch (error) {
      console.error('Error deleting file:', error);
      showErrorToast('Failed to delete file');
    }
  }, [fileToDelete, files, deleteFile, showSuccessToast, showErrorToast]);

  const selectAllFiles = useCallback(() => {
    setSelectedFolder(null);
  }, [setSelectedFolder]);



  const handleSearchToggle = useCallback(() => {
    setSearchOpen(!searchOpen);
  }, [searchOpen]);

  const handleAddFile = useCallback(() => {
    setShowUploadModal(true);
  }, []);

  const handleEditFolder = useCallback((folderId: string, name: string) => {
    setEditingFolderNameId(folderId);
    setEditingFolderNameValue(name);
  }, []);

  const handleEditSubfolder = useCallback((subfolder: FileFolder) => {
    setFolderToEdit(subfolder);
    setShowEditFolderModal(true);
  }, []);

  const handleUpdateFolder = useCallback(async (folderId: string, name: string, description?: string, color?: string) => {
    try {
      // Build updates object, only including description if it has a value
      const updates: Partial<FileFolder> = { name, color };
      if (description !== null && description !== undefined) {
        updates.description = description;
      }
      // If description is null or undefined, we don't include it in the update
      // This follows the same pattern as the addFolder function
      
      await updateFolder(folderId, updates);
      setShowEditFolderModal(false);
      setFolderToEdit(null);
      showSuccessToast(`"${name}" updated successfully!`);
    } catch (error) {
      console.error('Error updating folder:', error);
      showErrorToast('Failed to update folder');
    }
  }, [updateFolder, showSuccessToast, showErrorToast]);

  const handleCancelEdit = useCallback(() => {
    setEditingFolderNameId(null);
    setEditingFolderNameValue(null);
  }, []);

  const handleCreateSubfolder = useCallback(() => {
    if (hasReachedSubfolderLimit) {
      setShowUpgradeModal(true);
    } else {
      setShowSubfolderModal(true);
    }
  }, [hasReachedSubfolderLimit]);

  return {
    // State
    searchQuery,

    searchOpen,
    showUploadModal,
    selectedFile,
    showNewFolderInput,
    newFolderName,
    showSubfolderModal,
    showDeleteConfirmation,
    fileToDelete,
    editingFolderNameId,
    editingFolderNameValue,
    showDeleteFolderModal,
    folderToDelete,
    showEditFolderModal,
    folderToEdit,
    showUpgradeModal,
    showSubfolderLimitBanner,
    showAIPanel,
    
    // Computed values
    currentFolder,
    parentFolder,
    hasReachedSubfolderLimit,
    currentSubfolders,
    currentFiles,
    filteredFiles,
    folderFileCounts,
    
    // Setters
    setSearchQuery,

    setSearchOpen,
    setShowUploadModal,
    setSelectedFile,
    setShowNewFolderInput,
    setNewFolderName,
    setShowSubfolderModal,
    setShowDeleteConfirmation,
    setFileToDelete,
    setEditingFolderNameId,
    setEditingFolderNameValue,
    setShowDeleteFolderModal,
    setFolderToDelete,
    setShowEditFolderModal,
    setFolderToEdit,
    setShowUpgradeModal,
    setShowSubfolderLimitBanner,
    setShowAIPanel,
    
    // Handlers
    handleAddFolder,
    handleAddSubfolder,
    handleRenameFolder,
    handleDeleteFolder,
    executeDeleteFolder,
    handleCloneFolder,
    handleDeleteFile,
    confirmDeleteFile,
    selectAllFiles,

    handleSearchToggle,
    handleAddFile,
    handleEditFolder,
    handleEditSubfolder,
    handleUpdateFolder,
    handleCancelEdit,
    handleCreateSubfolder,
  };
} 