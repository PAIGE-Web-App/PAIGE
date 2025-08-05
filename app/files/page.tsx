"use client";

import React, { useCallback, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useUserProfileData } from '@/hooks/useUserProfileData';
import { useFileFolders } from '@/hooks/useFileFolders';
import { useFiles } from '@/hooks/useFiles';
import { useStorageUsage } from '@/hooks/useStorageUsage';
import { useFilesPageState } from '@/hooks/useFilesPageState';
import { useCustomToast } from '@/hooks/useCustomToast';
import { useExternalFileUpload } from '@/hooks/useExternalFileUpload';
import { useModalHandlers } from '@/hooks/useModalHandlers';
import { useFileNavigation } from '@/hooks/useFileNavigation';
import { useFileUploadCompletion } from '@/hooks/useFileUploadCompletion';
import { useContentDetection } from '@/hooks/useContentDetection';
import { useFolderPersistence } from '@/hooks/useFolderPersistence';

// Components
import WeddingBanner from '@/components/WeddingBanner';
import FilesSidebar from '@/components/FilesSidebar';
import FilesSidebarSkeleton from '@/components/FilesSidebarSkeleton';
import FilesContentArea from '@/components/FilesContentArea';
import FilesEmptyState from '@/components/FilesEmptyState';
import { DragDropProvider } from '@/components/DragDropContext';

// Lazy load heavy components
import dynamic from 'next/dynamic';

const FileItemComponent = dynamic(() => import('@/components/FileItemComponent'), {
  loading: () => <div className="bg-white border border-[#E0DBD7] rounded-[5px] p-4 animate-pulse h-32" />
});

// Lazy load modals and heavy components
const FilesModals = dynamic(() => import('@/components/FilesModals'), {
  loading: () => <div className="hidden" />
});

const EditFolderModal = dynamic(() => import('@/components/EditFolderModal'), {
  loading: () => <div className="hidden" />
});

const AIFileAnalyzer = dynamic(() => import('@/components/AIFileAnalyzer'), {
  loading: () => <div className="bg-white rounded-lg p-6 animate-pulse h-96" />
});

// Types
import { FileFolder } from '@/types/files';

// Constants
const STARTER_TIER_MAX_SUBFOLDER_LEVELS = 3;

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



  // Move file to different folder
  const handleMoveFile = useCallback(async (fileId: string, newFolderId: string) => {
    try {
      await updateFile(fileId, { folderId: newFolderId });
      
      // Get the target folder name for better feedback
      const targetFolder = folders.find(f => f.id === newFolderId);
      const folderName = targetFolder ? targetFolder.name : (newFolderId === 'all' ? 'All Files' : 'Unknown Folder');
      
      showSuccessToast(`File moved to "${folderName}" successfully`);
    } catch (error) {
      console.error('Error moving file:', error);
      showErrorToast('Failed to move file');
    }
  }, [updateFile, folders]);

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
    showEditFolderModal,
    folderToEdit,
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
    setShowEditFolderModal,
    setFolderToEdit,
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
    handleEditSubfolder,
    handleUpdateFolder,
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

  // Custom hooks for optimization
  const { handleUploadComplete } = useFileUploadCompletion({
    files,
    setSelectedFile
  });

  const { hasContent } = useContentDetection({
    folders,
    files,
    foldersLoading,
    filesLoading
  });

  // External file upload handling
  useExternalFileUpload({
    uploadFile,
    showSuccessToast,
    showErrorToast
  });

  // Folder persistence
  useFolderPersistence({
    folders,
    selectedFolder,
    setSelectedFolder,
    foldersLoading,
    filesLoading
  });

  // Additional handlers needed for the component
  const {
    handleCloseUploadModal,
    handleCloseSubfolderModal,
    handleCloseNewFolderModal,
    handleCloseDeleteConfirmation,
    handleCloseDeleteFolderModal,
    handleCloseUpgradeModal,
    handleShowUpgradeModal,
    handleDismissSubfolderLimitBanner
  } = useModalHandlers({
    setShowUploadModal,
    setShowSubfolderModal,
    setShowNewFolderInput,
    setShowDeleteConfirmation,
    setShowDeleteFolderModal,
    setShowUpgradeModal,
    setShowSubfolderLimitBanner
  });

  const {
    handleNavigateToParent,
    handleSelectSubfolder,
    handleNavigateToFolder
  } = useFileNavigation({
    folders,
    parentFolder,
    setSelectedFolder
  });



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
              <FilesEmptyState
                onCreateFolder={() => setShowNewFolderInput(true)}
                onUploadFiles={() => setShowUploadModal(true)}
              />
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
            onUploadComplete={(fileId) => {
              const uploadedFile = files.find(f => f.id === fileId);
              if (uploadedFile) {
                setSelectedFile(uploadedFile);
              }
            }}
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
                    onMoveFile={handleMoveFile}
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
                onNavigateToFolder={(folder) => setSelectedFolder(folder)}
                onSelectFile={setSelectedFile}
                onDeleteFile={handleDeleteFile}
                onEditFile={(file) => console.log('Edit file:', file)}
                onSelectSubfolder={handleSelectSubfolder}
                onCreateSubfolder={handleCreateSubfolder}
                onUploadFile={() => setShowUploadModal(true)}
                onUploadComplete={(fileId) => {
                  // Find the uploaded file and select it
                  const uploadedFile = files.find(f => f.id === fileId);
                  if (uploadedFile) {
                    setSelectedFile(uploadedFile);
                  }
                }}
                onShowUpgradeModal={handleShowUpgradeModal}
                onDismissSubfolderLimitBanner={handleDismissSubfolderLimitBanner}
                onMoveFile={handleMoveFile}
                onEditSubfolder={handleEditSubfolder}
                onDeleteSubfolder={(subfolder) => handleDeleteFolder(subfolder.id)}
                folders={folders}
                folderFileCounts={folderFileCounts}
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
          onUploadComplete={(fileId) => {
            const uploadedFile = files.find(f => f.id === fileId);
            if (uploadedFile) {
              setSelectedFile(uploadedFile);
            }
          }}
        />

        {/* Edit Folder Modal */}
        <EditFolderModal
          isOpen={showEditFolderModal}
          folder={folderToEdit}
          onClose={() => setShowEditFolderModal(false)}
          onSave={handleUpdateFolder}
          isLoading={foldersLoading}
        />
    </div>
    </DragDropProvider>
  );
} 