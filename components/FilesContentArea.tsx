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
  onDoubleClickFile: (file: FileItem) => void;
  onDeleteFile: (fileId: string) => void;
  onEditFile: (file: FileItem) => void;
  onAnalyzeFile: (file: FileItem) => void;
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
  onDoubleClickFile,
  onDeleteFile,
  onEditFile,
  onAnalyzeFile,
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
        editingFolderNameId={editingFolderNameId}
        editingFolderNameValue={editingFolderNameValue}
        searchQuery={searchQuery}
        onSearchQueryChange={onSearchQueryChange}
        onSearchToggle={onSearchToggle}
        onEditFolder={onEditFolder}
        onCloneFolder={onCloneFolder}
        onDeleteFolder={onDeleteFolder}
        onRenameFolder={onRenameFolder}
        onEditingFolderNameChange={onEditingFolderNameChange}
        onCancelEdit={onCancelEdit}
        onCreateSubfolder={onCreateSubfolder}
        onUploadFile={onUploadFile}
      />

      {/* Breadcrumb Navigation */}
      <FolderBreadcrumb
        currentFolder={currentFolder}
        parentFolder={parentFolder}
        onNavigateToParent={onNavigateToParent}
        onNavigateToFolder={onNavigateToFolder}
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
        viewMode="list"
        onSelectFile={onSelectFile}
        onDoubleClickFile={onDoubleClickFile}
        selectedFile={selectedFile}
        onDeleteFile={onDeleteFile}
        onEditFile={onEditFile}
        onAnalyzeFile={onAnalyzeFile}
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