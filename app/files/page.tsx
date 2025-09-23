"use client";

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useUserProfileData } from '@/hooks/useUserProfileData';
import { useFileFolders } from '@/hooks/useFileFolders';
import { useFiles } from '@/hooks/useFiles';
import { useStorageUsage } from '@/hooks/useStorageUsage';
import { useFilesPageState } from '@/hooks/useFilesPageState';
import { useCustomToast } from '@/hooks/useCustomToast';
import { useGlobalCompletionToasts } from '@/hooks/useGlobalCompletionToasts';
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

const NotEnoughCreditsModal = dynamic(() => import('@/components/NotEnoughCreditsModal'), {
  loading: () => <div className="hidden" />
});

const AIFileAnalyzerRAG = dynamic(() => import('@/components/AIFileAnalyzerRAG'), {
  loading: () => <div className="bg-white rounded-lg p-6 animate-pulse h-96" />
});

// Types
import { FileFolder, FileItem } from '@/types/files';

// Constants
const STARTER_TIER_MAX_SUBFOLDER_LEVELS = 3;

export default function FilesPage() {
  const { user, loading } = useAuth();
  const { daysLeft, userName, profileLoading } = useUserProfileData();
  const { showSuccessToast, showErrorToast } = useCustomToast();
  const { showCompletionToast } = useGlobalCompletionToasts();
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
  
  // Credit modal state
  const [showNotEnoughCreditsModal, setShowNotEnoughCreditsModal] = useState(false);
  const [creditModalData, setCreditModalData] = useState({
    requiredCredits: 3,
    currentCredits: 0,
    feature: 'file analysis'
  });

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

  // Memoized values for performance
  const isLoading = useMemo(() => foldersLoading || filesLoading, [foldersLoading, filesLoading]);
  const userId = useMemo(() => user?.uid || '', [user?.uid]);

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
  }, [updateFile, folders, showSuccessToast, showErrorToast]);

  // Custom state management hook
  const {
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
    uploadFile: async (uploadData: any) => {
      const result = await uploadFile(uploadData);
      
      // Show completion toast for first file upload
      if (files.length === 0) {
        showCompletionToast('files');
      }
      
      return result;
    },
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

  // Enterprise-grade file memory: Restore last analyzed file on page load
  useEffect(() => {
    // Add comprehensive debugging
    console.log('🔍 File memory check:', {
      isLoading,
      filesCount: files.length,
      selectedFile: selectedFile?.name || null,
      showAIPanel,
      hasMemoryData: !!localStorage.getItem('paige_lastAnalyzedFile')
    });

    if (!isLoading && files.length > 0 && !selectedFile && !showAIPanel) {
      try {
        const memoryData = localStorage.getItem('paige_lastAnalyzedFile');
        console.log('📱 Memory data found:', memoryData);
        
        if (memoryData) {
          const { fileId, folderId, timestamp, fileName } = JSON.parse(memoryData);
          
          console.log('📋 Parsed memory:', { fileId, folderId, timestamp, fileName });
          
          // Validate memory data (enterprise-grade error handling)
          if (!fileId || !timestamp || !fileName) {
            console.warn('❌ Invalid file memory data, clearing corrupted entry');
            localStorage.removeItem('paige_lastAnalyzedFile');
            return;
          }
          
          // Check if memory is recent (24 hours)
          const isRecent = Date.now() - timestamp < 24 * 60 * 60 * 1000;
          if (!isRecent) {
            console.log('⏰ File memory expired, clearing old entry');
            localStorage.removeItem('paige_lastAnalyzedFile');
            return;
          }
          
          // Verify file still exists
          const fileExists = files.find(f => f.id === fileId);
          if (!fileExists) {
            console.log('🗑️ Remembered file no longer exists, clearing memory');
            localStorage.removeItem('paige_lastAnalyzedFile');
            return;
          }
          
          console.log('✅ File found, proceeding with restoration');
          
          // 🧠 SMART MEMORY: Only restore if user is already in the right folder
          const isInCorrectFolder = selectedFolder?.id === folderId || folderId === 'all';
          
          if (isInCorrectFolder) {
            console.log('🎯 User is in correct folder, restoring analysis session');
            
            // Auto-select the file and open analysis panel
            setSelectedFile(fileExists);
            setShowAIPanel(true);
            
            console.log(`🔄 Restored analysis session for "${fileName}"`);
          } else {
            console.log('🚫 User is in different folder, respecting navigation choice');
            console.log(`📁 Current folder: ${selectedFolder?.name || 'All Files'}`);
            console.log(`📁 Analyzed file folder: ${folderId === 'all' ? 'All Files' : folders.find(f => f.id === folderId)?.name || 'Unknown'}`);
            console.log('💡 Analysis will be restored when user returns to the correct folder');
          }
        } else {
          console.log('📭 No memory data found');
        }
      } catch (error) {
        console.warn('💥 Error restoring file memory, clearing corrupted data:', error);
        localStorage.removeItem('paige_lastAnalyzedFile');
      }
    } else {
      console.log('⏸️ Skipping memory restore due to conditions');
    }
  }, [isLoading, files, folders, selectedFile, showAIPanel, selectedFolder, setSelectedFolder, setSelectedFile, setShowAIPanel]);

  // 🧠 SMART MEMORY: Restore analysis when user navigates to the correct folder
  useEffect(() => {
    // Only run if we have memory data and no analysis panel is currently open
    if (!showAIPanel && !selectedFile) {
      try {
        const memoryData = localStorage.getItem('paige_lastAnalyzedFile');
        if (memoryData) {
          const { fileId, folderId, timestamp, fileName } = JSON.parse(memoryData);
          
          // Validate memory data
          if (!fileId || !timestamp || !fileName) return;
          
          // Check if memory is recent (24 hours)
          const isRecent = Date.now() - timestamp < 24 * 60 * 60 * 1000;
          if (!isRecent) return;
          
          // Check if user is now in the correct folder
          const isInCorrectFolder = selectedFolder?.id === folderId || folderId === 'all';
          
          if (isInCorrectFolder) {
            // Find the file
            const fileExists = files.find(f => f.id === fileId);
            if (fileExists) {
              console.log('🎯 User navigated to correct folder, restoring analysis session');
              setSelectedFile(fileExists);
              setShowAIPanel(true);
            }
          }
        }
      } catch (error) {
        console.warn('Error checking folder navigation for analysis restore:', error);
      }
    }
  }, [selectedFolder, files, showAIPanel, selectedFile, setSelectedFile, setShowAIPanel]);

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

  // Memoized handlers for better performance
  const handleUploadFile = useCallback(() => {
    setShowUploadModal(true);
  }, [setShowUploadModal]);

  const handleCreateFolder = useCallback(() => {
    setShowNewFolderInput(true);
  }, [setShowNewFolderInput]);

  // 🎯 FIXED: Single click should NOT change analysis panel
  const handleSelectFile = useCallback((file: any) => {
    // Only update selectedFile if no analysis panel is open
    // This prevents unwanted file switching when analysis is active
    if (!showAIPanel) {
      setSelectedFile(file);
    }
    // If analysis panel is open, keep the current file selected
    // User must explicitly choose to analyze a different file
  }, [showAIPanel, setSelectedFile]);

  const handleNavigateToFolderCallback = useCallback((folder: any) => {
    setSelectedFolder(folder);
  }, [setSelectedFolder]);

  const handleDeleteSubfolder = useCallback((subfolder: any) => {
    handleDeleteFolder(subfolder.id);
  }, [handleDeleteFolder]);

  const handleCloseEditFolderModal = useCallback(() => {
    setShowEditFolderModal(false);
  }, [setShowEditFolderModal]);

  const handleCloseAIAnalyzer = useCallback(() => {
    setSelectedFile(null);
    setShowAIPanel(false);
  }, [setSelectedFile, setShowAIPanel]);

  // 🎯 NEW: Smart double-click handler with intelligent analysis logic
  const handleDoubleClickFile = useCallback((file: any) => {


    // Set the file as selected
    setSelectedFile(file);
    
    // Open the analysis panel
    setShowAIPanel(true);
    
    // The AIFileAnalyzer component will handle the logic:
    // - If file.isProcessed && file.aiSummary → Show cached results instantly
    // - If !file.isProcessed || !file.aiSummary → Trigger new analysis
  }, [setSelectedFile, setShowAIPanel]);

  const handleUploadCompleteCallback = useCallback((fileId: string) => {
    const uploadedFile = files.find(f => f.id === fileId);
    if (uploadedFile) {
      // Only auto-select if no analysis panel is open
      // This prevents interrupting current analysis
      if (!showAIPanel) {
        setSelectedFile(uploadedFile);
      }
    }
  }, [files, showAIPanel, setSelectedFile]);

  const handleAnalyzeFile = useCallback(async (fileId: string, analysisType: string) => {
    try {
      // Find the file to analyze
      const fileToAnalyze = files.find(f => f.id === fileId);
      if (!fileToAnalyze) {
        showErrorToast('File not found');
        return;
      }

      // Extract file content from the uploaded file
      let fileContent = '';
      try {
        // Download the file from Firebase Storage
        const fileResponse = await fetch(fileToAnalyze.fileUrl);
        if (!fileResponse.ok) {
          throw new Error('Failed to download file');
        }
        
        const fileBlob = await fileResponse.blob();
        const file = new File([fileBlob], fileToAnalyze.name, { type: fileToAnalyze.fileType });
        
        // Extract text content using our utility
        const { extractFileContent } = await import('@/utils/fileContentExtractor');
        const extractedContent = await extractFileContent(file);
        
        console.log('File extraction result:', {
          success: extractedContent.success,
          textLength: extractedContent.text?.length || 0,
          error: extractedContent.error,
          fileName: file.name,
          fileType: file.type
        });
        
        if (extractedContent.success && extractedContent.text) {
          fileContent = extractedContent.text;
        } else {
          // Fallback for unsupported file types
          console.error('PDF extraction failed:', extractedContent.error);
          fileContent = `File: ${fileToAnalyze.name} (${fileToAnalyze.fileType})\nContent extraction not supported for this file type. Please provide key details manually.`;
        }
      } catch (extractError) {
        console.error('Error extracting file content:', extractError);
        fileContent = `File: ${fileToAnalyze.name} (${fileToAnalyze.fileType})\nContent extraction failed. Please provide key details manually.`;
      }

      // Call the RAG-enhanced AI analysis API
      const response = await fetch('/api/ai-file-analyzer-rag', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileId: fileToAnalyze.id,
          fileName: fileToAnalyze.name,
          fileContent: fileContent,
          fileType: fileToAnalyze.fileType,
          analysisType: analysisType,
          userId: userId,
          userEmail: user?.email || '',
        }),
      });

      if (!response.ok) {
        throw new Error(`AI analysis failed: ${response.status}`);
      }

      const result = await response.json();
      
      // Update the file with AI results (suppress the generic toast)
      await updateFile(fileId, {
        aiSummary: result.structuredData?.summary || result.analysis || 'Analysis completed',
        keyPoints: result.structuredData?.keyPoints || [],
        vendorAccountability: result.structuredData?.vendorAccountability || [],
        importantDates: result.structuredData?.importantDates || [],
        paymentTerms: result.structuredData?.paymentTerms || [],
        cancellationPolicy: result.structuredData?.cancellationPolicy || [],
        isProcessed: true,
        processingStatus: 'completed',
      }, true); // suppressToast = true

      // Show custom AI analysis success toast
      showSuccessToast('File analyzed by Paige successfully!');
      
      // Remember this file for session persistence (enterprise-grade file memory)
      console.log('💾 Attempting to save file memory...');
      try {
        const memoryData = {
          fileId: fileId,
          folderId: selectedFolder?.id || 'all',
          timestamp: Date.now(),
          fileName: fileToAnalyze.name
        };
        console.log('📝 Memory data to save:', memoryData);
        
        localStorage.setItem('paige_lastAnalyzedFile', JSON.stringify(memoryData));
        
        // Verify it was saved
        const savedData = localStorage.getItem('paige_lastAnalyzedFile');
        if (savedData) {
          console.log('✅ File memory saved successfully:', savedData);
        } else {
          console.warn('⚠️ Memory save failed - localStorage.getItem returned null');
        }
      } catch (memoryError) {
        console.error('💥 Error saving file memory:', memoryError);
        // Graceful fallback - feature still works without memory
      }
    } catch (error) {
      console.error('Error analyzing file:', error);
      showErrorToast('Paige couldn\'t analyze the file :(');
    }
  }, [files, updateFile, showSuccessToast, showErrorToast, selectedFolder]);

  const handleAnalyzeFileFromMenu = useCallback((file: FileItem) => {
    // Open AI analyzer for the selected file
    setSelectedFile(file);
    // Show the AI panel with smooth animation
    setShowAIPanel(true);
  }, [setSelectedFile, setShowAIPanel]);

  const handleAskQuestion = useCallback(async (fileId: string, question: string) => {
    try {
      // Find the file to analyze
      const fileToAnalyze = files.find(f => f.id === fileId);
      if (!fileToAnalyze) {
        throw new Error('File not found');
      }

      // Call the RAG-enhanced AI analysis API with the question
      const response = await fetch('/api/ai-file-analyzer-rag', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileId: fileToAnalyze.id,
          fileName: fileToAnalyze.name,
          fileContent: `[File: ${fileToAnalyze.name}] - Content extraction will be implemented in the next phase.`,
          fileType: fileToAnalyze.fileType,
          analysisType: 'comprehensive',
          userQuestion: question,
          chatHistory: [], // For now, we'll start fresh each time
          userId: userId,
          userEmail: user?.email || '',
        }),
      });

      if (!response.ok) {
        throw new Error(`AI analysis failed: ${response.status}`);
      }

      const result = await response.json();
      return result.analysis || 'Sorry, I couldn\'t process your question. Please try again.';
    } catch (error) {
      console.error('Error asking question:', error);
      return 'Sorry, I encountered an error processing your question. Please try again.';
    }
  }, [files]);

  const handleSetWeddingDate = useCallback(() => {
    // TODO: Implement wedding date setting
  }, []);

  // Handle credit errors from AI file analyzer
  const handleCreditError = useCallback((creditInfo: { requiredCredits: number; currentCredits: number; feature: string }) => {
    setCreditModalData({
      requiredCredits: creditInfo.requiredCredits,
      currentCredits: creditInfo.currentCredits,
      feature: creditInfo.feature
    });
    setShowNotEnoughCreditsModal(true);
  }, []);

  // If no content and not loading, show empty state
  if (!hasContent && !foldersLoading && !filesLoading) {
    return (
      <DragDropProvider>
        <div className="flex flex-col h-full bg-linen">
          <WeddingBanner />

          <div className="app-content-container flex-1 overflow-hidden flex flex-col">
            <div className="flex flex-1 gap-4 lg:flex-row flex-col overflow-hidden">
              {/* Empty State */}
              <FilesEmptyState
                onCreateFolder={handleCreateFolder}
                onUploadFiles={handleUploadFile}
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
            onUploadComplete={handleUploadCompleteCallback}
          />
      </div>
      </DragDropProvider>
    );
  }

  return (
    <DragDropProvider>
      <div className="flex flex-col h-full bg-linen">
        <WeddingBanner />

        <div className="app-content-container flex-1 overflow-hidden flex flex-col">
        <div className="flex flex-1 gap-4 lg:flex-row flex-col overflow-hidden">
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
                    userId={userId}
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

                editingFolderNameId={editingFolderNameId}
                editingFolderNameValue={editingFolderNameValue}
                hasReachedSubfolderLimit={hasReachedSubfolderLimit}
                showSubfolderLimitBanner={showSubfolderLimitBanner}
                currentSubfolders={currentSubfolders}
                filteredFiles={filteredFiles}
                selectedFile={selectedFile}
                STARTER_TIER_MAX_SUBFOLDER_LEVELS={STARTER_TIER_MAX_SUBFOLDER_LEVELS}
                isLoading={isLoading}
                searchQuery={searchQuery}
                onSearchQueryChange={setSearchQuery}

                onSearchToggle={handleSearchToggle}
                onEditFolder={handleEditFolder}
                onCloneFolder={handleCloneFolder}
                onDeleteFolder={handleDeleteFolder}
                onRenameFolder={handleRenameFolder}
                onEditingFolderNameChange={setEditingFolderNameValue}
                onCancelEdit={handleCancelEdit}
                onNavigateToParent={handleNavigateToParent}
                onNavigateToFolder={handleNavigateToFolderCallback}
                onSelectFile={handleSelectFile}
                onDoubleClickFile={handleDoubleClickFile}
                onDeleteFile={handleDeleteFile}
                onEditFile={(file) => console.log('Edit file:', file)}
                onAnalyzeFile={handleAnalyzeFileFromMenu}
                onSelectSubfolder={handleSelectSubfolder}
                onCreateSubfolder={handleCreateSubfolder}
                onUploadFile={handleUploadFile}
                onUploadComplete={handleUploadCompleteCallback}
                onShowUpgradeModal={handleShowUpgradeModal}
                onDismissSubfolderLimitBanner={handleDismissSubfolderLimitBanner}
                onMoveFile={handleMoveFile}
                onEditSubfolder={handleEditSubfolder}
                onDeleteSubfolder={handleDeleteSubfolder}
                folders={folders}
                folderFileCounts={folderFileCounts}
              />
          </main>

          {/* AI File Analyzer Panel - Only rendered when visible */}
          {showAIPanel && (
            <div className="md:w-[600px] w-full">
              <AIFileAnalyzerRAG
                selectedFile={selectedFile}
                onClose={() => setShowAIPanel(false)}
                onAnalyzeFile={handleAnalyzeFile}
                onAskQuestion={handleAskQuestion}
                onCreditError={handleCreditError}
                isVisible={showAIPanel}
              />
            </div>
          )}
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
          onUploadComplete={handleUploadCompleteCallback}
        />

        {/* Edit Folder Modal */}
        <EditFolderModal
          isOpen={showEditFolderModal}
          folder={folderToEdit}
          onClose={handleCloseEditFolderModal}
          onSave={handleUpdateFolder}
          isLoading={foldersLoading}
        />

        {/* Not Enough Credits Modal */}
        <NotEnoughCreditsModal
          isOpen={showNotEnoughCreditsModal}
          onClose={() => setShowNotEnoughCreditsModal(false)}
          requiredCredits={creditModalData.requiredCredits}
          currentCredits={creditModalData.currentCredits}
          feature={creditModalData.feature}
          accountInfo={{
            tier: 'Free',
            dailyCredits: 15,
            refreshTime: 'Daily at midnight'
          }}
        />
    </div>
    </DragDropProvider>
  );
} 