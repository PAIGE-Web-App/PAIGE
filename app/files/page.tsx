"use client";

import React, { useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useUserProfileData } from '@/hooks/useUserProfileData';
import { useFileFolders } from '@/hooks/useFileFolders';
import { useFiles } from '@/hooks/useFiles';
import { useStorageUsage } from '@/hooks/useStorageUsage';
import { useFilesPageState } from '@/hooks/useFilesPageState';
import { Folder, Upload } from 'lucide-react';

// Components
import WeddingBanner from '@/components/WeddingBanner';
import FilesSidebar from '@/components/FilesSidebar';
import FilesSidebarSkeleton from '@/components/FilesSidebarSkeleton';
import AIFileAnalyzer from '@/components/AIFileAnalyzer';
import FilesContentArea from '@/components/FilesContentArea';
import FilesModals from '@/components/FilesModals';
import { DragDropProvider } from '@/components/DragDropContext';

// Lazy load heavy components
import dynamic from 'next/dynamic';
const FileItemComponent = dynamic(() => import('@/components/FileItemComponent'), {
  loading: () => <div className="bg-white border border-[#E0DBD7] rounded-[5px] p-4 animate-pulse h-32" />
});

// Types
import { FileFolder } from '@/types/files';

// Constants
const STARTER_TIER_MAX_SUBFOLDER_LEVELS = 3;

export default function FilesPage() {
  const { user, loading } = useAuth();
  const { daysLeft, userName, profileLoading } = useUserProfileData();
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

  // Calculate folder level function
  const getFolderLevel = useCallback((folder: FileFolder): number => {
    let level = 1;
    let current = folder;
    
    while (current.parentId) {
      level++;
      const parent = folders.find(f => f.id === current.parentId);
      if (parent) {
        current = parent;
      } else {
        break;
      }
    }
    
    return level;
  }, [folders]);

  // Custom state management hook
  const {
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
  } = useFilesPageState({
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
  });

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

  // Check if user has any content (files or folders) - only when not loading
  const hasContent = React.useMemo(() => {
    if (foldersLoading || filesLoading) return true; // Return true when loading to prevent empty state flash
    // Exclude the "All Files" folder from the count
    const userFolders = folders.filter(folder => folder.id !== 'all');
    const hasFiles = files.length > 0;
    const hasFolders = userFolders.length > 0;
    const result = hasFiles || hasFolders;
    
    return result;
  }, [folders, foldersLoading, filesLoading, files.length]);

  // Navigation handlers
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

  // Modal close handlers
  const handleCloseUploadModal = useCallback(() => {
    setShowUploadModal(false);
  }, [setShowUploadModal]);

  const handleCloseSubfolderModal = useCallback(() => {
    setShowSubfolderModal(false);
  }, [setShowSubfolderModal]);

  const handleCloseNewFolderModal = useCallback(() => {
    setShowNewFolderInput(false);
  }, [setShowNewFolderInput]);

  const handleCloseDeleteConfirmation = useCallback(() => {
    setShowDeleteConfirmation(false);
  }, [setShowDeleteConfirmation]);

  const handleCloseDeleteFolderModal = useCallback(() => {
    setShowDeleteFolderModal(false);
  }, [setShowDeleteFolderModal]);

  const handleCloseUpgradeModal = useCallback(() => {
    setShowUpgradeModal(false);
  }, [setShowUpgradeModal]);

  const handleShowUpgradeModal = useCallback(() => {
    setShowUpgradeModal(true);
  }, [setShowUpgradeModal]);

  const handleDismissSubfolderLimitBanner = useCallback(() => {
    setShowSubfolderLimitBanner(false);
  }, [setShowSubfolderLimitBanner]);

  // If no content and not loading, show empty state
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
            <div className="flex flex-1 gap-4 md:flex-row flex-col overflow-hidden">
              {/* Empty State */}
              <div className="flex-1 flex items-center justify-center p-6 bg-[#F3F2F0]">
                <div className="text-center max-w-md">
                  <div className="w-24 h-24 bg-[#F8F6F4] border-2 border-[#E0DBD7] rounded-full flex items-center justify-center mx-auto mb-6">
                    <Folder className="w-12 h-12" style={{ strokeWidth: 1, fill: '#AB9C95', color: '#AB9C95' }} />
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
                      <Folder className="w-5 h-5" style={{ strokeWidth: 1, fill: '#A85C36' }} />
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

          {/* Modals for empty state */}
          <FilesModals
            showUploadModal={showUploadModal}
            showSubfolderModal={false}
            showNewFolderInput={showNewFolderInput}
            showDeleteConfirmation={false}
            showDeleteFolderModal={false}
            showUpgradeModal={false}
            folderToDelete={null}
            selectedFolder={null}
            STARTER_TIER_MAX_SUBFOLDER_LEVELS={STARTER_TIER_MAX_SUBFOLDER_LEVELS}
            onCloseUploadModal={handleCloseUploadModal}
            onCloseSubfolderModal={() => {}}
            onCloseNewFolderModal={handleCloseNewFolderModal}
            onCloseDeleteConfirmation={() => {}}
            onCloseDeleteFolderModal={() => {}}
            onCloseUpgradeModal={() => {}}
            onAddFolder={handleAddFolder}
            onAddSubfolder={handleAddSubfolder}
            onConfirmDeleteFile={() => Promise.resolve()}
            onConfirmDeleteFolder={() => Promise.resolve()}
            showSuccessToast={() => {}}
            showErrorToast={() => {}}
          />
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
                          {/* Files Sidebar */}
              <div className="w-80 bg-white border-r border-[#E0DBD7] flex flex-col">
                {foldersLoading ? (
                  <FilesSidebarSkeleton />
                ) : (
                  <FilesSidebar
                    folders={folders}
                    selectedFolder={selectedFolder}
                    setSelectedFolder={setSelectedFolder}
                    userId={user?.uid || ''}
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
                )}
              </div>

                          {/* Files Content Area */}
              <FilesContentArea
                currentFolder={currentFolder}
                parentFolder={parentFolder}
                viewMode={viewMode}
                editingFolderNameId={editingFolderNameId}
                editingFolderNameValue={editingFolderNameValue}
                hasReachedSubfolderLimit={hasReachedSubfolderLimit}
                showSubfolderLimitBanner={showSubfolderLimitBanner}
                currentSubfolders={currentSubfolders}
                filteredFiles={filteredFiles}
                selectedFile={selectedFile}
                STARTER_TIER_MAX_SUBFOLDER_LEVELS={STARTER_TIER_MAX_SUBFOLDER_LEVELS}
                isLoading={foldersLoading || filesLoading}
                searchQuery={searchQuery}
                onSearchQueryChange={setSearchQuery}
                onViewModeChange={handleViewModeChange}
                onSearchToggle={handleSearchToggle}
                onEditFolder={handleEditFolder}
                onCloneFolder={handleCloneFolder}
                onDeleteFolder={handleDeleteFolder}
                onRenameFolder={handleRenameFolder}
                onEditingFolderNameChange={setEditingFolderNameValue}
                onCancelEdit={handleCancelEdit}
                onNavigateToParent={handleNavigateToParent}
                onSelectFile={setSelectedFile}
                onDeleteFile={handleDeleteFile}
                onEditFile={(file) => console.log('Edit file:', file)}
                onSelectSubfolder={handleSelectSubfolder}
                onCreateSubfolder={handleCreateSubfolder}
                onUploadFile={() => setShowUploadModal(true)}
                onShowUpgradeModal={handleShowUpgradeModal}
                onDismissSubfolderLimitBanner={handleDismissSubfolderLimitBanner}
              />
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

        {/* Modals */}
        <FilesModals
          showUploadModal={showUploadModal}
          showSubfolderModal={showSubfolderModal}
          showNewFolderInput={showNewFolderInput}
          showDeleteConfirmation={showDeleteConfirmation}
          showDeleteFolderModal={showDeleteFolderModal}
          showUpgradeModal={showUpgradeModal}
          folderToDelete={folderToDelete}
          selectedFolder={selectedFolder}
          STARTER_TIER_MAX_SUBFOLDER_LEVELS={STARTER_TIER_MAX_SUBFOLDER_LEVELS}
          onCloseUploadModal={handleCloseUploadModal}
          onCloseSubfolderModal={handleCloseSubfolderModal}
          onCloseNewFolderModal={handleCloseNewFolderModal}
          onCloseDeleteConfirmation={handleCloseDeleteConfirmation}
          onCloseDeleteFolderModal={handleCloseDeleteFolderModal}
          onCloseUpgradeModal={handleCloseUpgradeModal}
          onAddFolder={handleAddFolder}
          onAddSubfolder={handleAddSubfolder}
          onConfirmDeleteFile={confirmDeleteFile}
          onConfirmDeleteFolder={executeDeleteFolder}
          showSuccessToast={() => {}}
          showErrorToast={() => {}}
        />
    </div>
    </DragDropProvider>
  );
} 