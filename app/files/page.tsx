"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useUserProfileData } from '@/hooks/useUserProfileData';
import { useFileFolders } from '@/hooks/useFileFolders';
import { useFiles } from '@/hooks/useFiles';
import { useCustomToast } from '@/hooks/useCustomToast';
import { Search, Plus, Upload, FileText, X, ChevronDown, Edit, Trash2, List, Grid3X3, Folder, FolderOpen, Copy } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import dynamic from 'next/dynamic';

// Components
import Banner from '@/components/Banner';
import BottomNavBar from '@/components/BottomNavBar';
import WeddingBanner from '@/components/WeddingBanner';
import FilesSidebar from '@/components/FilesSidebar';
import AIFileAnalyzer from '@/components/AIFileAnalyzer';
import SearchBar from '@/components/SearchBar';
import FolderContentView from '@/components/FolderContentView';
import FolderBreadcrumb from '@/components/FolderBreadcrumb';
import { DragDropProvider } from '@/components/DragDropContext';

// Lazy load heavy components
const FileItemComponent = dynamic(() => import('@/components/FileItemComponent'), {
  loading: () => <div className="bg-white border border-[#E0DBD7] rounded-[5px] p-4 animate-pulse h-32" />
});

// Types
import { FileItem, FileFolder } from '@/types/files';

// Storage components
import { useStorageUsage } from '@/hooks/useStorageUsage';
import StorageProgressBar from '@/components/StorageProgressBar';

export default function FilesPage() {
  const { user, loading } = useAuth();
  const { daysLeft, userName, profileLoading } = useUserProfileData();
  const { showSuccessToast, showErrorToast } = useCustomToast();
  const {
    folders,
    selectedFolder,
    setSelectedFolder,
    loading: foldersLoading,
    error: foldersError,
    addFolder,
    updateFolder,
    deleteFolder,
    updateFolderFileCount,
  } = useFileFolders();
  
  const {
    files,
    loading: filesLoading,
    uploadFile,
    deleteFile,
    updateFile,
  } = useFiles();
  
  // Storage usage statistics
  const storageStats = useStorageUsage();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [showNewFolderInput, setShowNewFolderInput] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [searchOpen, setSearchOpen] = useState(false);
  const [currentFolderPath, setCurrentFolderPath] = useState<FileFolder[]>([]);
  const [showSubfolderModal, setShowSubfolderModal] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<string | null>(null);
  const [editingFolderNameId, setEditingFolderNameId] = useState<string | null>(null);
  const [editingFolderNameValue, setEditingFolderNameValue] = useState<string | null>(null);
  const [showDeleteFolderModal, setShowDeleteFolderModal] = useState(false);
  const [folderToDelete, setFolderToDelete] = useState<FileFolder | null>(null);

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
  }, [foldersLoading, filesLoading, selectedFolder, folders]);

  // Save selected folder to localStorage whenever it changes
  useEffect(() => {
    if (selectedFolder) {
      localStorage.setItem('selectedFileFolderId', selectedFolder.id);
    }
  }, [selectedFolder]);

  // Check if user has any content (files or folders)
  const hasContent = useMemo(() => {
    if (foldersLoading || filesLoading) return false;
    // Exclude the "All Files" folder from the count
    const userFolders = folders.filter(folder => folder.id !== 'all');
    const hasFiles = files.length > 0;
    const hasFolders = userFolders.length > 0;
    const result = hasFiles || hasFolders;
    
    return result;
  }, [folders, foldersLoading, filesLoading, files.length]);

  // Get current folder (simplified - just use selected folder)
  const currentFolder = selectedFolder;

  // Get the parent folder of the current folder
  const parentFolder = useMemo(() => {
    if (!currentFolder || currentFolder.id === 'all' || !currentFolder.parentId) {
      return null;
    }
    
    return folders.find(f => f.id === currentFolder.parentId) || null;
  }, [currentFolder, folders]);

  // Get subfolders for current folder
  const currentSubfolders = useMemo(() => {
    if (!currentFolder) return [];
    return folders.filter(folder => folder.parentId === currentFolder.id);
  }, [folders, currentFolder]);

  // Get files for current folder
  const currentFiles = useMemo(() => {
    if (!currentFolder) return files; // Show all files when no folder is selected
    if (currentFolder.id === 'all') return files; // Show all files when "All Files" folder is selected
    return files.filter(file => file.folderId === currentFolder.id);
  }, [files, currentFolder]);

  // Filter files based on search
  const filteredFiles = useMemo(() => {
    return currentFiles.filter(file => {
      const matchesSearch = file.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           file.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    });
  }, [currentFiles, searchQuery]);

  // Calculate file counts for folders
  const folderFileCounts = useMemo(() => {
    const counts = new Map<string, number>();
    folders.forEach(folder => {
      const count = files.filter(file => file.categoryId === folder.id).length;
      counts.set(folder.id, count);
    });
    return counts;
  }, [files, folders]);



  // Handle folder operations
  const handleAddFolder = async (name: string, description?: string, color?: string) => {
    try {
      await addFolder(name, description, color);
      setShowNewFolderInput(false);
      setNewFolderName('');
      showSuccessToast(`"${name}" folder created successfully!`);
      // The page will automatically transition to full interface when hasContent becomes true
    } catch (error) {
      console.error('Error adding folder:', error);
      showErrorToast('Failed to create folder');
    }
  };

  const handleAddSubfolder = async (name: string, description?: string, color?: string) => {
    if (!selectedFolder || selectedFolder.id === 'all') {
      showErrorToast('Please select a folder to create a subfolder in');
      return;
    }

    try {
      await addFolder(name, description, color, selectedFolder.id);
      showSuccessToast(`"${name}" subfolder created successfully!`);
    } catch (error) {
      console.error('Error adding subfolder:', error);
      showErrorToast('Failed to create subfolder');
    }
  };

  const selectAllFiles = () => {
    setSelectedFolder(null);
  };

  const handleDeleteFile = (fileId: string) => {
    setFileToDelete(fileId);
    setShowDeleteConfirmation(true);
  };

  const confirmDeleteFile = async () => {
    if (fileToDelete) {
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
    }
  };

  // Folder management functions
  const handleRenameFolder = async (folderId: string) => {
    if (!editingFolderNameValue || editingFolderNameValue.trim() === '') {
      setEditingFolderNameId(null);
      setEditingFolderNameValue(null);
      return;
    }

    try {
      await updateFolder(folderId, { name: editingFolderNameValue.trim() });
      
      // Update the selectedFolder state with the new name
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
  };

  const handleEditFolder = async (folderId: string, updates: Partial<FileFolder>) => {
    try {
      await updateFolder(folderId, updates);
      showSuccessToast('Folder updated successfully!');
    } catch (error) {
      console.error('Error editing folder:', error);
      showErrorToast('Failed to update folder');
    }
  };

  const handleDeleteFolder = async (folderId: string) => {
    const folderToDelete = folders.find(f => f.id === folderId);
    if (!folderToDelete) return;

    // Check if folder has files
    const filesInFolder = files.filter(file => file.folderId === folderId);
    
    if (filesInFolder.length > 0) {
      // Show confirmation modal if folder has files
      setFolderToDelete(folderToDelete);
      setShowDeleteFolderModal(true);
    } else {
      // Delete immediately if no files
      await executeDeleteFolder(folderId);
    }
  };

  const executeDeleteFolder = async (folderId: string) => {
    try {
      const folderToDelete = folders.find(f => f.id === folderId);
      if (!folderToDelete) return;

      // Delete the folder
      await deleteFolder(folderId);
      
      // If the deleted folder was selected, switch to "All Files"
      if (selectedFolder?.id === folderId) {
        const allFilesFolder = folders.find(f => f.id === 'all');
        if (allFilesFolder) {
          setSelectedFolder(allFilesFolder);
        }
      }
      
      showSuccessToast(`"${folderToDelete.name}" folder deleted successfully!`);
    } catch (error) {
      console.error('Error deleting folder:', error);
      showErrorToast('Failed to delete folder');
    } finally {
      setShowDeleteFolderModal(false);
      setFolderToDelete(null);
    }
  };

  const handleCloneFolder = async (folderId: string) => {
    try {
      const folderToClone = folders.find(f => f.id === folderId);
      if (!folderToClone) return;

      // Create a new folder with "Copy" suffix
      const newName = `${folderToClone.name} Copy`;
      await addFolder(newName, folderToClone.description, folderToClone.color);
      showSuccessToast(`"${newName}" folder created successfully!`);
    } catch (error) {
      console.error('Error cloning folder:', error);
      showErrorToast('Failed to clone folder');
    }
  };

  if (loading || profileLoading || filesLoading) {
    return (
      <div className="min-h-screen bg-[#F3F2F0] flex items-center justify-center">
        <div className="text-[#332B42]">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#F3F2F0] flex items-center justify-center">
        <div className="text-[#332B42]">Please log in to access files.</div>
      </div>
    );
  }

  // Show empty state when no content exists
  if (!hasContent && !foldersLoading && !filesLoading) {
    return (
      <DragDropProvider>
        <div className="flex flex-col h-full bg-linen">
          <WeddingBanner 
            daysLeft={daysLeft}
            userName={userName}
            isLoading={profileLoading}
            onSetWeddingDate={() => {}}
          />

          <div className="app-content-container flex-1 overflow-hidden flex flex-col">
            {/* Full Width Empty State - No Sidebar */}
            <div className="flex-1 flex flex-col border border-[#AB9C95] rounded-[5px] overflow-hidden">
              {/* Top Bar */}
              <div className="bg-white border-b border-[#E0DBD7] p-6 flex-shrink-0">
                <div className="flex items-center justify-between">
                  <h5 className="text-[#332B42]">
                    Files
                  </h5>
                  
                  {/* Right Side - Empty for clean look */}
                  <div className="flex items-center gap-3">
                    {/* Add File button removed - Upload Files button available in empty state */}
                  </div>
                </div>
              </div>

              {/* Empty State */}
              <div className="flex-1 flex items-center justify-center p-6 bg-[#F3F2F0]">
                <div className="text-center max-w-md">
                  <div className="w-24 h-24 bg-[#F8F6F4] border-2 border-[#E0DBD7] rounded-full flex items-center justify-center mx-auto mb-6">
                    <Folder className="w-12 h-12 text-[#AB9C95]" />
                  </div>
                  
                  <h2 className="text-2xl font-playfair font-semibold text-[#332B42] mb-3">
                    Create a folder or upload files
                  </h2>
                  
                  <p className="text-[#AB9C95] mb-8 leading-relaxed">
                    Organize your wedding documents, contracts, and photos by creating folders or uploading files directly.
                  </p>
                  
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <button
                      onClick={() => setShowNewFolderInput(true)}
                      className="btn-primary flex items-center justify-center gap-2 px-6 py-3"
                    >
                      <Folder className="w-5 h-5" />
                      Create Folder
                    </button>
                    
                    <button
                      onClick={() => setShowUploadModal(true)}
                      className="btn-primaryinverse flex items-center justify-center gap-2 px-6 py-3 border-2 border-[#A85C36] text-[#A85C36] hover:bg-[#A85C36] hover:text-white transition-colors"
                    >
                      <Upload className="w-5 h-5" />
                      Upload Files
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

                {/* Upload Modal */}
      {showUploadModal && (
        <UploadModal 
          onClose={() => setShowUploadModal(false)} 
          showSuccessToast={showSuccessToast}
          showErrorToast={showErrorToast}
        />
      )}

      {/* Delete Folder Confirmation Modal */}
      {showDeleteFolderModal && folderToDelete && (
        <DeleteFolderConfirmationModal
          folder={folderToDelete}
          onConfirm={() => executeDeleteFolder(folderToDelete.id)}
          onClose={() => {
            setShowDeleteFolderModal(false);
            setFolderToDelete(null);
          }}
        />
      )}

      {/* New Folder Modal for Empty State */}
      {showNewFolderInput && (
        <NewFolderModal 
          onClose={() => setShowNewFolderInput(false)}
          onAddFolder={handleAddFolder}
        />
      )}
        </div>
      </DragDropProvider>
    );
  }

  return (
    <DragDropProvider>
      <div className="flex flex-col h-full bg-linen">
        <WeddingBanner 
          daysLeft={daysLeft}
          userName={userName}
          isLoading={profileLoading}
          onSetWeddingDate={() => {}}
        />

        <div className="app-content-container flex-1 overflow-hidden flex flex-col">
        <div className="flex flex-1 gap-4 md:flex-row flex-col overflow-hidden">
          {/* Main Content Area */}
          <main className="unified-container">
            {/* Files Sidebar - Only show when there's content */}
            <div className="w-80 bg-white border-r border-[#E0DBD7] flex flex-col">
              <FilesSidebar
                folders={folders}
                selectedFolder={selectedFolder}
                setSelectedFolder={setSelectedFolder}
                userId={user.uid}
                showNewFolderInput={showNewFolderInput}
                setShowNewFolderInput={setShowNewFolderInput}
                newFolderName={newFolderName}
                setNewFolderName={setNewFolderName}
                handleAddFolder={handleAddFolder}
                folderFileCounts={folderFileCounts}
                setFileSearchQuery={setSearchQuery}
                selectAllFiles={selectAllFiles}
                allFileCount={files.length}
              />
            </div>

            {/* Files Content Area */}
            <div className="flex-1 flex flex-col min-h-0">
              {/* Top Bar */}
              <div className="bg-white border-b border-[#E0DBD7] p-6 flex-shrink-0">
                <div className="flex items-center gap-4">
                  {/* Left Side - Folder Name and Controls */}
                  <div className="flex items-center gap-4 flex-shrink-0">
                    <div
                      className="relative flex items-center transition-all duration-300"
                      style={{
                        width: editingFolderNameId ? '240px' : 'auto',
                        minWidth: editingFolderNameId ? '240px' : 'auto',
                      }}
                    >
                      <h6
                        className={`transition-opacity duration-300 truncate max-w-[300px] ${
                          editingFolderNameId ? 'opacity-0' : 'opacity-100'
                        }`}
                        title={currentFolder ? currentFolder.name : 'All Files'}
                      >
                        {currentFolder ? currentFolder.name : 'All Files'}
                      </h6>
                      <input
                        type="text"
                        value={editingFolderNameValue || ''}
                        onChange={(e) => setEditingFolderNameValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && currentFolder) {
                            handleRenameFolder(currentFolder.id);
                          } else if (e.key === 'Escape') {
                            setEditingFolderNameId(null);
                            setEditingFolderNameValue(null);
                          }
                        }}
                        onBlur={() => {
                          if (editingFolderNameValue && currentFolder) {
                            handleRenameFolder(currentFolder.id);
                          } else {
                            setEditingFolderNameId(null);
                            setEditingFolderNameValue(null);
                          }
                        }}
                        className={`absolute left-0 w-full h-8 px-2 border border-[#D6D3D1] rounded-[5px] bg-white text-sm focus:outline-none focus:border-[#A85C36] transition-all duration-300 ${
                          editingFolderNameId
                            ? 'opacity-100 pointer-events-auto'
                            : 'opacity-0 pointer-events-none'
                        }`}
                        autoFocus
                      />
                    </div>
                    
                    {/* Folder Controls - Only show for non-All Files folders */}
                    {currentFolder && currentFolder.id !== 'all' && (
                      <div className="flex items-center gap-2">
                        {/* Edit Folder Button */}
                        <button
                          onClick={() => {
                            if (currentFolder && currentFolder.id !== 'all') {
                              setEditingFolderNameId(currentFolder.id);
                              setEditingFolderNameValue(currentFolder.name);
                            }
                          }}
                          className="p-1 hover:bg-[#EBE3DD] rounded-[5px]"
                          title="Rename Folder"
                        >
                          <span className="inline-block align-middle text-[#AB9C95] -scale-x-100">
                            ✏️
                          </span>
                        </button>
                        
                        {/* Clone Folder Button */}
                        <button
                          onClick={() => {
                            if (currentFolder && currentFolder.id !== 'all') {
                              handleCloneFolder(currentFolder.id);
                            }
                          }}
                          className="p-1 hover:bg-[#EBE3DD] rounded-[5px]"
                          title="Clone Folder"
                          aria-label="Clone Folder"
                        >
                          <Copy className="w-4 h-4 text-[#364257]" />
                        </button>
                        
                        {/* Delete Folder Button */}
                        <button
                          onClick={() => {
                            if (currentFolder && currentFolder.id !== 'all') {
                              handleDeleteFolder(currentFolder.id);
                            }
                          }}
                          className="p-1 hover:bg-[#FDEAEA] rounded-[5px]"
                          title="Delete Folder"
                          aria-label="Delete Folder"
                        >
                          <Trash2 className="w-4 h-4 text-[#D63030]" />
                        </button>
                        
                        {/* Divider */}
                        <div className="w-px h-4 bg-[#E0DBD7]"></div>
                      </div>
                    )}
                  </div>
                  
                  {/* Middle - Search Bar (Flex Grow) */}
                  <div className="flex items-center transition-all duration-300 gap-3 flex-grow min-w-0" style={{ height: '32px' }}>
                    <SearchBar
                      value={searchQuery}
                      onChange={setSearchQuery}
                      placeholder="Search files..."
                      isOpen={searchOpen}
                      setIsOpen={setSearchOpen}
                    />
                  </div>
                  
                  {/* Right Side - View Toggle and Add Button */}
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {/* View Toggle */}
                    <div className="flex rounded-full border border-gray-400 overflow-hidden" style={{ height: 32 }}>
                      <button
                        className={`flex items-center justify-center px-2 transition-colors duration-150 ${viewMode === 'list' ? 'bg-[#EBE3DD]' : 'bg-white'} border-r border-gray-300`}
                        style={{ outline: 'none' }}
                        onClick={() => setViewMode('list')}
                        type="button"
                        title="List view"
                      >
                        <List className="w-4 h-4" stroke={viewMode === 'list' ? '#A85C36' : '#364257'} />
                      </button>
                      <button
                        className={`flex items-center justify-center px-2 transition-colors duration-150 ${viewMode === 'grid' ? 'bg-[#EBE3DD]' : 'bg-white'}`}
                        style={{ outline: 'none' }}
                        onClick={() => setViewMode('grid')}
                        type="button"
                        title="Grid view"
                      >
                        <Grid3X3 className="w-4 h-4" stroke={viewMode === 'grid' ? '#A85C36' : '#364257'} />
                      </button>
                    </div>
                    
                    {/* Add File Button */}
                    <button
                      onClick={() => setShowUploadModal(true)}
                      className="btn-primary ml-2 flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Add File
                    </button>
                  </div>
                </div>
              </div>



              {/* Breadcrumb Navigation */}
              <FolderBreadcrumb
                currentFolder={currentFolder}
                parentFolder={parentFolder}
                onNavigateToParent={() => {
                  if (parentFolder) {
                    setSelectedFolder(parentFolder);
                  } else {
                    const allFilesFolder = folders.find(f => f.id === 'all');
                    if (allFilesFolder) {
                      setSelectedFolder(allFilesFolder);
                    }
                  }
                }}
              />

              {/* Folder Content View */}
              <FolderContentView
                selectedFolder={currentFolder}
                subfolders={currentSubfolders}
                files={filteredFiles}
                viewMode={viewMode}
                onSelectFile={setSelectedFile}
                selectedFile={selectedFile}
                onDeleteFile={handleDeleteFile}
                onEditFile={(file) => console.log('Edit file:', file)}
                onCreateSubfolder={() => setShowSubfolderModal(true)}
                onUploadFile={() => setShowUploadModal(true)}
                onSelectSubfolder={(subfolder) => {
                  setCurrentFolderPath([...currentFolderPath, subfolder]);
                }}
              />
            </div>
          </main>

          {/* AI File Analyzer Panel */}
          <div className="md:w-[420px] w-full">
            <AIFileAnalyzer
              selectedFile={selectedFile}
              onClose={() => setSelectedFile(null)}
              onAnalyzeFile={async (fileId: string, analysisType: string) => {
                // TODO: Implement file analysis
                console.log('Analyze file:', fileId, analysisType);
              }}
              onAskQuestion={async (fileId: string, question: string) => {
                // TODO: Implement AI question answering
                console.log('Ask question:', fileId, question);
                return `This is a mock response to: "${question}". In the future, this will be powered by AI analysis of your file.`;
              }}
            />
          </div>
        </div>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <UploadModal 
          onClose={() => setShowUploadModal(false)} 
          showSuccessToast={showSuccessToast}
          showErrorToast={showErrorToast}
        />
      )}

      {/* New Subfolder Modal */}
      {showSubfolderModal && (
        <NewSubfolderModal 
          onClose={() => setShowSubfolderModal(false)}
          onAddSubfolder={handleAddSubfolder}
          parentFolder={selectedFolder}
        />
      )}

      {/* New Folder Modal for Main Content */}
      {showNewFolderInput && (
        <NewFolderModal 
          onClose={() => setShowNewFolderInput(false)}
          onAddFolder={handleAddFolder}
        />
      )}

          {/* Delete Confirmation Modal */}
          {showDeleteConfirmation && (
            <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-[5px] shadow-xl max-w-md w-full p-6">
                <div className="text-center mb-6">
                  <div className="flex justify-center mb-4">
                    <Trash2 className="w-8 h-8 text-red-500" />
                  </div>
                  <h5 className="h5 mb-2">Delete File</h5>
                  <p className="text-sm text-gray-600">
                    Are you sure you want to delete this file? This action cannot be undone.
                  </p>
                </div>

                <div className="flex justify-center gap-3">
                  <button
                    onClick={() => setShowDeleteConfirmation(false)}
                    className="btn-primaryinverse px-4 py-2 text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmDeleteFile}
                    className="btn-primary px-4 py-2 text-sm bg-red-600 hover:bg-red-700 border-red-600"
                  >
                    Delete File
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </DragDropProvider>
    );
  }

// New Folder Modal Component
function NewFolderModal({ onClose, onAddFolder }: { onClose: () => void; onAddFolder: (name: string, description?: string, color?: string) => Promise<void> }) {
  const [folderName, setFolderName] = useState('');
  const [folderDescription, setFolderDescription] = useState('');
  const [selectedColor, setSelectedColor] = useState('#A85C36');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (folderName.trim() && !isSubmitting) {
      setIsSubmitting(true);
      try {
        await onAddFolder(folderName.trim(), folderDescription.trim(), selectedColor);
        onClose();
      } catch (error) {
        console.error('Error creating folder:', error);
        setIsSubmitting(false);
      }
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center p-4 z-50"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -50, opacity: 0 }}
          className="bg-white rounded-[5px] shadow-xl max-w-xl w-full p-6 relative"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={onClose}
            className="absolute top-3 right-3 text-[#7A7A7A] hover:text-[#332B42] p-1 rounded-full"
            title="Close"
          >
            <X size={20} />
          </button>

          <div className="text-center mb-6">
            <div className="flex justify-center mb-4">
              <Folder className="w-8 h-8 text-[#A85C36]" />
            </div>
            <h5 className="h5 mb-2">Create New Folder</h5>
            <p className="text-sm text-gray-600">Organize your wedding documents by creating a new folder to store related files.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#332B42] mb-2">
                Folder Name *
              </label>
              <input
                type="text"
                value={folderName}
                onChange={(e) => setFolderName(e.target.value)}
                className="w-full px-3 py-2 border border-[#E0DBD7] rounded-[5px] text-[#332B42] focus:outline-none focus:border-[#A85C36]"
                placeholder="e.g., Vendor Contracts, Invoices, Photos"
                required
                autoFocus
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-[#332B42] mb-2">
                Description (optional)
              </label>
              <textarea
                value={folderDescription}
                onChange={(e) => setFolderDescription(e.target.value)}
                className="w-full px-3 py-2 border border-[#E0DBD7] rounded-[5px] text-[#332B42] focus:outline-none focus:border-[#A85C36] resize-none"
                placeholder="Brief description of what this folder contains..."
                rows={3}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-[#332B42] mb-2">
                Folder Color
              </label>
              <div className="flex gap-2">
                {['#A85C36', '#E53E3E', '#3182CE', '#38A169', '#D69E2E', '#805AD5', '#DD6B20', '#319795'].map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setSelectedColor(color)}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                      selectedColor === color 
                        ? 'border-[#332B42] scale-110' 
                        : 'border-[#E0DBD7] hover:border-[#AB9C95]'
                    }`}
                    style={{ backgroundColor: color }}
                    title={`Color: ${color}`}
                  />
                ))}
              </div>
            </div>

            <div className="mb-6">
              <h6 className="font-medium text-[#332B42] mb-3">What you can do with folders:</h6>
              <ul className="space-y-2">
                <li className="flex items-center text-sm text-gray-600">
                  <div className="w-2 h-2 bg-[#A85C36] rounded-full mr-3"></div>
                  Organize files by category or vendor
                </li>
                <li className="flex items-center text-sm text-gray-600">
                  <div className="w-2 h-2 bg-[#A85C36] rounded-full mr-3"></div>
                  Create subfolders for better organization
                </li>
                <li className="flex items-center text-sm text-gray-600">
                  <div className="w-2 h-2 bg-[#A85C36] rounded-full mr-3"></div>
                  Color-code folders for easy identification
                </li>
                <li className="flex items-center text-sm text-gray-600">
                  <div className="w-2 h-2 bg-[#A85C36] rounded-full mr-3"></div>
                  Share folders with your wedding team
                </li>
              </ul>
            </div>
            
            <div className="flex justify-center">
              <button
                type="submit"
                className="btn-primary px-6 py-2 text-sm"
                disabled={!folderName.trim() || isSubmitting}
              >
                {isSubmitting ? 'Creating...' : 'Create Folder'}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// Upload Modal Component
function UploadModal({ onClose, showSuccessToast, showErrorToast }: { 
  onClose: () => void; 
  showSuccessToast: (message: string) => void;
  showErrorToast: (message: string) => void;
}) {
  // Get storage stats for validation
  const storageStats = useStorageUsage();
  const { uploadFile } = useFiles();
  const [dragActive, setDragActive] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [fileDescriptions, setFileDescriptions] = useState<Record<string, string>>({});

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const files = Array.from(e.dataTransfer.files);
      setSelectedFiles(files);
      // Initialize descriptions for new files
      const newDescriptions = { ...fileDescriptions };
      files.forEach(file => {
        if (!newDescriptions[file.name]) {
          newDescriptions[file.name] = '';
        }
      });
      setFileDescriptions(newDescriptions);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setSelectedFiles(files);
      // Initialize descriptions for new files
      const newDescriptions = { ...fileDescriptions };
      files.forEach(file => {
        if (!newDescriptions[file.name]) {
          newDescriptions[file.name] = '';
        }
      });
      setFileDescriptions(newDescriptions);
    }
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;
    
    // Validate storage limits before uploading
    const totalNewFileSize = selectedFiles.reduce((sum, file) => sum + file.size, 0);
    const fileSizeMB = totalNewFileSize / (1024 * 1024);
    
    // Check file size limit
    if (fileSizeMB > storageStats.limits.maxFileSizeMB) {
      showErrorToast(`File too large. Max size: ${storageStats.limits.maxFileSizeMB}MB`);
      return;
    }
    
    // Check storage limit
    if (storageStats.usedStorage + totalNewFileSize > storageStats.totalStorage) {
      showErrorToast('Storage limit reached. Please upgrade your plan.');
      return;
    }
    
    // Check file count limit
    if (storageStats.usedFiles + selectedFiles.length > storageStats.maxFiles) {
      showErrorToast('File limit reached. Please upgrade your plan.');
      return;
    }
    
    setUploading(true);
    try {
      // Upload each file
      for (const file of selectedFiles) {
        const description = fileDescriptions[file.name] || '';
        
        await uploadFile({
          file,
          fileName: file.name,
          description,
          category: 'all', // Default to "all" category when no folders exist
        });
      }
      
      // Close modal
      onClose();
      
      // Clear selected files
      setSelectedFiles([]);
      setFileDescriptions({});
      
      // Show success message
      if (selectedFiles.length === 1) {
        showSuccessToast(`"${selectedFiles[0].name}" uploaded successfully!`);
      } else {
        showSuccessToast(`${selectedFiles.length} files uploaded successfully!`);
      }
      
    } catch (error) {
      console.error('Error uploading files:', error);
      showErrorToast('Failed to upload files');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-[5px] shadow-xl max-w-2xl w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-playfair text-xl font-semibold text-[#332B42]">Upload Files</h3>
          <button
            onClick={onClose}
            className="text-[#7A7A7A] hover:text-[#332B42] p-1 rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div
          className={`border-2 border-dashed rounded-[5px] p-8 text-center ${
            dragActive ? 'border-[#A85C36] bg-[#F8F6F4]' : 'border-[#E0DBD7]'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <Upload className="w-12 h-12 text-[#AB9C95] mx-auto mb-4" />
          <h4 className="text-lg font-medium text-[#332B42] mb-2">
            Drop files here or click to browse
          </h4>
          <p className="text-[#AB9C95] mb-4">
            Upload contracts, invoices, photos, and other wedding-related files
          </p>
          <input
            type="file"
            multiple
            onChange={handleFileSelect}
            className="hidden"
            id="file-upload"
          />
          <label
            htmlFor="file-upload"
            className="btn-primary cursor-pointer"
          >
            Choose Files
          </label>
        </div>

        {selectedFiles.length > 0 && (
          <div className="mt-6">
            <h4 className="font-medium text-[#332B42] mb-3">Selected Files:</h4>
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {selectedFiles.map((file, index) => (
                <div key={index} className="p-3 bg-[#F8F6F4] rounded-[5px]">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-[#332B42]">{file.name}</span>
                    <span className="text-xs text-[#AB9C95]">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </span>
                  </div>
                  <input
                    type="text"
                    placeholder="Add a description (optional)"
                    value={fileDescriptions[file.name] || ''}
                    onChange={(e) => setFileDescriptions({
                      ...fileDescriptions,
                      [file.name]: e.target.value
                    })}
                    className="w-full px-2 py-1 text-xs border border-[#E0DBD7] rounded-[3px] text-[#332B42] focus:outline-none focus:border-[#A85C36]"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="btn-primaryinverse px-4 py-2"
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={selectedFiles.length === 0 || uploading}
            className="btn-primary px-4 py-2 disabled:opacity-50"
          >
            {uploading ? 'Uploading...' : 'Upload Files'}
          </button>
        </div>
      </div>
    </div>
  );
}

// New Subfolder Modal Component
function NewSubfolderModal({ 
  onClose, 
  onAddSubfolder, 
  parentFolder 
}: { 
  onClose: () => void; 
  onAddSubfolder: (name: string, description?: string, color?: string) => Promise<void>;
  parentFolder: FileFolder | null;
}) {
  const [subfolderName, setSubfolderName] = useState('');
  const [subfolderDescription, setSubfolderDescription] = useState('');
  const [selectedColor, setSelectedColor] = useState('#A85C36');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (subfolderName.trim() && !isSubmitting) {
      setIsSubmitting(true);
      try {
        await onAddSubfolder(subfolderName.trim(), subfolderDescription.trim(), selectedColor);
        onClose();
      } catch (error) {
        console.error('Error creating subfolder:', error);
        setIsSubmitting(false);
      }
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center p-4 z-50"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -50, opacity: 0 }}
          className="bg-white rounded-[5px] shadow-xl max-w-xl w-full p-6 relative"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={onClose}
            className="absolute top-3 right-3 text-[#7A7A7A] hover:text-[#332B42] p-1 rounded-full"
            title="Close"
          >
            <X size={20} />
          </button>

          <div className="mb-6">
            <h3 className="font-playfair text-xl font-semibold text-[#332B42] mb-2">
              Create New Subfolder
            </h3>
            {parentFolder && (
              <p className="text-sm text-[#AB9C95]">
                Creating subfolder in "{parentFolder.name}"
              </p>
            )}
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#332B42] mb-2">
                Subfolder Name *
              </label>
              <input
                type="text"
                value={subfolderName}
                onChange={(e) => setSubfolderName(e.target.value)}
                className="w-full px-3 py-2 border border-[#E0DBD7] rounded-[5px] text-[#332B42] focus:outline-none focus:border-[#A85C36]"
                placeholder="e.g., Contracts, Invoices, Photos"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-[#332B42] mb-2">
                Description (optional)
              </label>
              <textarea
                value={subfolderDescription}
                onChange={(e) => setSubfolderDescription(e.target.value)}
                className="w-full px-3 py-2 border border-[#E0DBD7] rounded-[5px] text-[#332B42] focus:outline-none focus:border-[#A85C36] resize-none"
                placeholder="Brief description of what this subfolder contains..."
                rows={3}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-[#332B42] mb-2">
                Subfolder Color
              </label>
              <div className="flex gap-2">
                {['#A85C36', '#E53E3E', '#3182CE', '#38A169', '#D69E2E', '#805AD5', '#DD6B20', '#319795'].map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setSelectedColor(color)}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                      selectedColor === color 
                        ? 'border-[#332B42] scale-110' 
                        : 'border-[#E0DBD7] hover:border-[#AB9C95]'
                    }`}
                    style={{ backgroundColor: color }}
                    title={`Color: ${color}`}
                  />
                ))}
              </div>
            </div>
            
            <div className="flex justify-end gap-2 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="btn-primaryinverse px-4 py-2 text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary px-4 py-2 text-sm"
                disabled={!subfolderName.trim() || isSubmitting}
              >
                {isSubmitting ? 'Creating...' : 'Create Subfolder'}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// Delete Folder Confirmation Modal Component
function DeleteFolderConfirmationModal({ 
  folder, 
  onConfirm, 
  onClose 
}: { 
  folder: FileFolder; 
  onConfirm: () => void; 
  onClose: () => void; 
}) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center p-4 z-50"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -50, opacity: 0 }}
          className="bg-white rounded-[10px] shadow-xl max-w-xl w-full max-w-sm p-6 relative"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={onClose}
            className="absolute top-3 right-3 text-[#7A7A7A] hover:text-[#332B42] p-1 rounded-full"
            title="Close"
          >
            <X size={20} />
          </button>

          <h5 className="h5 mb-4">Confirm Folder Deletion</h5>

          <p className="text-sm text-[#364257] mb-4">
            Are you sure you want to delete the folder "
            <span className="font-semibold">{folder.name}</span>"?
          </p>
          <p className="text-sm text-[#E5484D] font-medium mb-6">
            Removing this folder will also permanently delete all files associated with it.
            If you want to keep your files, please move them to another folder first.
          </p>

          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-[#332B42] border border-[#AB9C95] rounded-[5px] hover:bg-[#F3F2F0] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="px-4 py-2 text-sm text-white bg-[#E5484D] rounded-[5px] hover:bg-[#D63030] transition-colors"
            >
              Delete Folder
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
} 