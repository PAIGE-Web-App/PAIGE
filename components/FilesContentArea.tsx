import React, { memo } from 'react';
import { FileFolder, FileItem } from '@/types/files';
import FilesTopBar from './FilesTopBar';
import FilesTopBarSkeleton from './FilesTopBarSkeleton';
import FolderBreadcrumb from './FolderBreadcrumb';
import FolderContentView from './FolderContentView';
import FolderContentViewSkeleton from './FolderContentViewSkeleton';
import Banner from './Banner';
import { AnimatePresence } from 'framer-motion';

interface FilesContentAreaProps {
  currentFolder: FileFolder | null;
  parentFolder: FileFolder | null;
  viewMode: 'list' | 'grid';
  editingFolderNameId: string | null;
  editingFolderNameValue: string | null;
  hasReachedSubfolderLimit: boolean;
  showSubfolderLimitBanner: boolean;
  currentSubfolders: FileFolder[];
  filteredFiles: FileItem[];
  selectedFile: FileItem | null;
  STARTER_TIER_MAX_SUBFOLDER_LEVELS: number;
  isLoading?: boolean;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  onViewModeChange: (mode: 'list' | 'grid') => void;
  onSearchToggle: () => void;
  onEditFolder: (folderId: string, name: string) => void;
  onCloneFolder: (folderId: string) => void;
  onDeleteFolder: (folderId: string) => void;
  onRenameFolder: (folderId: string) => void;
  onEditingFolderNameChange: (value: string) => void;
  onCancelEdit: () => void;
  onNavigateToParent: () => void;
  onNavigateToFolder: (folder: FileFolder) => void;
  onSelectFile: (file: FileItem) => void;
  onDeleteFile: (fileId: string) => void;
  onEditFile: (file: FileItem) => void;
  onSelectSubfolder: (subfolder: FileFolder) => void;
  onCreateSubfolder: () => void;
  onUploadFile: () => void;
  onUploadComplete: (fileId: string) => void;
  onMoveFile?: (fileId: string, newFolderId: string) => Promise<void>;
  onEditSubfolder?: (subfolder: FileFolder) => void;
  onDeleteSubfolder?: (subfolder: FileFolder) => void;
  onShowUpgradeModal: () => void;
  onDismissSubfolderLimitBanner: () => void;
  folders: FileFolder[];
  folderFileCounts: Map<string, number>;
}

const FilesContentArea: React.FC<FilesContentAreaProps> = memo(({
  currentFolder,
  parentFolder,
  viewMode,
  editingFolderNameId,
  editingFolderNameValue,
  hasReachedSubfolderLimit,
  showSubfolderLimitBanner,
  currentSubfolders,
  filteredFiles,
  selectedFile,
  STARTER_TIER_MAX_SUBFOLDER_LEVELS,
  isLoading = false,
  searchQuery,
  onSearchQueryChange,
  onViewModeChange,
  onSearchToggle,
  onEditFolder,
  onCloneFolder,
  onDeleteFolder,
  onRenameFolder,
  onEditingFolderNameChange,
  onCancelEdit,
  onNavigateToParent,
  onNavigateToFolder,
  onSelectFile,
  onDeleteFile,
  onEditFile,
  onSelectSubfolder,
  onCreateSubfolder,
  onUploadFile,
  onUploadComplete,
  onMoveFile,
  onEditSubfolder,
  onDeleteSubfolder,
  onShowUpgradeModal,
  onDismissSubfolderLimitBanner,
  folders,
  folderFileCounts,
}) => {
  // Show skeleton if loading
  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col min-h-0">
        <FilesTopBarSkeleton />
        <FolderContentViewSkeleton />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Top Bar */}
      <FilesTopBar
        currentFolder={currentFolder}
        viewMode={viewMode}
        editingFolderNameId={editingFolderNameId}
        editingFolderNameValue={editingFolderNameValue}
        searchQuery={searchQuery}
        onSearchQueryChange={onSearchQueryChange}
        onViewModeChange={onViewModeChange}
        onSearchToggle={onSearchToggle}
        onEditFolder={onEditFolder}
        onCloneFolder={onCloneFolder}
        onDeleteFolder={onDeleteFolder}
        onRenameFolder={onRenameFolder}
        onEditingFolderNameChange={onEditingFolderNameChange}
        onCancelEdit={onCancelEdit}
      />

      {/* Breadcrumb Navigation */}
      <FolderBreadcrumb
        currentFolder={currentFolder}
        parentFolder={parentFolder}
        onNavigateToParent={onNavigateToParent}
        onNavigateToFolder={onNavigateToFolder}
        onCreateSubfolder={onCreateSubfolder}
        onUploadFile={onUploadFile}
        folders={folders}
      />

      {/* Subfolder Level Limit Banner */}
      <AnimatePresence>
        {hasReachedSubfolderLimit && showSubfolderLimitBanner && (
          <div className="px-4 pt-2">
            <Banner
              message={
                <>
                  You've reached the maximum subfolder level ({STARTER_TIER_MAX_SUBFOLDER_LEVELS}) for the Starter tier.
                  <button onClick={onShowUpgradeModal} className="ml-2 font-semibold underline">Upgrade Plan</button> to create deeper folder structures.
                </>
              }
              type="info"
              onDismiss={onDismissSubfolderLimitBanner}
            />
          </div>
        )}
      </AnimatePresence>

      {/* Folder Content View */}
      <FolderContentView
        selectedFolder={currentFolder}
        subfolders={currentSubfolders}
        files={filteredFiles}
        viewMode={viewMode}
        onSelectFile={onSelectFile}
        selectedFile={selectedFile}
        onDeleteFile={onDeleteFile}
        onEditFile={onEditFile}
        onSelectSubfolder={onSelectSubfolder}
        onUploadComplete={onUploadComplete}
        onMoveFile={onMoveFile}
        onEditSubfolder={onEditSubfolder}
        onDeleteSubfolder={onDeleteSubfolder}
        folders={folders}
        folderFileCounts={folderFileCounts}
        isLoading={isLoading}
      />
    </div>
  );
});

FilesContentArea.displayName = 'FilesContentArea';

export default FilesContentArea; 