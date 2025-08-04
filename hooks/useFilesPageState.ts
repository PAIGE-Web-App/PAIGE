import { useState, useCallback, useMemo } from 'react';
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

  // UI State
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
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
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showSubfolderLimitBanner, setShowSubfolderLimitBanner] = useState(true);

  // Computed values
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

  const filteredFiles = useMemo(() => {
    return currentFiles.filter(file => {
      const matchesSearch = file.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           file.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    });
  }, [currentFiles, searchQuery]);

  const folderFileCounts = useMemo(() => {
    const counts = new Map<string, number>();
    folders.forEach(folder => {
      const count = files.filter(file => file.folderId === folder.id).length;
      counts.set(folder.id, count);
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

    try {
      await deleteFolder(folderId);
      showSuccessToast(`"${folder.name}" deleted successfully!`);
      
      if (selectedFolder?.id === folderId) {
        const allFilesFolder = folders.find(f => f.id === 'all');
        if (allFilesFolder) {
          setSelectedFolder(allFilesFolder);
        }
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

  const handleViewModeChange = useCallback((mode: 'list' | 'grid') => {
    setViewMode(mode);
  }, []);

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
    viewMode,
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
    showUpgradeModal,
    showSubfolderLimitBanner,
    
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
    setViewMode,
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
    setShowUpgradeModal,
    setShowSubfolderLimitBanner,
    
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
    handleViewModeChange,
    handleSearchToggle,
    handleAddFile,
    handleEditFolder,
    handleCancelEdit,
    handleCreateSubfolder,
  };
} 