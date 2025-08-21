import React, { useState, useEffect } from 'react';
import { FileFolder, FileItem } from '@/types/files';
import { useDragDrop } from './DragDropContext';
import LoadingBar from './LoadingBar';
import { useUploadProgress } from '@/hooks/useUploadProgress';
import DraggableArea from './DraggableArea';
import EmptyFolderState from './EmptyFolderState';
import CombinedContentView from './CombinedContentView';

interface FolderContentViewProps {
  selectedFolder: FileFolder | null;
  subfolders: FileFolder[];
  files: FileItem[];
  viewMode: 'list' | 'grid';
  onSelectFile: (file: FileItem) => void;
  onDoubleClickFile: (file: FileItem) => void;
  selectedFile: FileItem | null;
  onDeleteFile: (fileId: string) => void;
  onEditFile: (file: FileItem) => void;
  onAnalyzeFile: (file: FileItem) => void;
  onSelectSubfolder: (subfolder: FileFolder) => void;
  onUploadComplete: (fileId: string) => void;
  onMoveFile?: (fileId: string, newFolderId: string) => Promise<void>;
  onEditSubfolder?: (subfolder: FileFolder) => void;
  onDeleteSubfolder?: (subfolder: FileFolder) => void;
  folders: FileFolder[];
  folderFileCounts: Map<string, number>;
  isLoading?: boolean;
}

const FolderContentView: React.FC<FolderContentViewProps> = ({
  selectedFolder,
  subfolders,
  files,
  viewMode,
  onSelectFile,
  onDoubleClickFile,
  selectedFile,
  onDeleteFile,
  onEditFile,
  onAnalyzeFile,
  onSelectSubfolder,
  onUploadComplete,
  onMoveFile,
  onEditSubfolder,
  onDeleteSubfolder,
  folders,
  folderFileCounts,
  isLoading = false,
}) => {
  const { draggedItem, isDragging, dropTarget, setDropTarget } = useDragDrop();
  
  // Upload progress state
  const { uploadProgress, currentFileIndex, totalFiles, isUploading } = useUploadProgress();

  // Handle upload completion - focus on uploaded file
  useEffect(() => {
    if (onUploadComplete) {
      const handleUploadComplete = (fileId: string) => {
        // Focus on the uploaded file (this will be handled by the parent component)
        onUploadComplete(fileId);
      };
      
      // Store the handler for use in the upload completion callback
      (window as any).handleUploadComplete = handleUploadComplete;
    }
  }, [onUploadComplete]);

  // If no folder is selected, show empty state
  if (!selectedFolder) {
    return (
      <div className="flex-1 p-6 overflow-y-auto min-h-0">
        <div className="text-center py-12">
          <div className="w-16 h-16 text-[#AB9C95] mx-auto mb-4 flex items-center justify-center">
            <svg className="w-16 h-16" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2z"/>
            </svg>
          </div>
          <h3 className="text-lg font-medium text-[#332B42] mb-2">
            Select a folder to view its contents
          </h3>
          <p className="text-[#AB9C95]">
            Choose a folder from the sidebar to see its subfolders and files
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto min-h-0 h-full">
      {/* Upload Progress Bar */}
      <LoadingBar 
        isVisible={isUploading} 
        description={`Uploading file ${currentFileIndex} of ${totalFiles}...`}
      />
      
      {/* If no files and no subfolders, show empty state */}
      {files.length === 0 && subfolders.length === 0 ? (
        <EmptyFolderState selectedFolder={selectedFolder} />
      ) : (
        /* Content when there are files or subfolders */
        <DraggableArea
          targetId="content"
          selectedFolder={selectedFolder}
          className="flex-1 h-full min-h-0"
          onInternalDrop={(draggedItem) => {
            // TODO: Move file to this folder
    
          }}
        >
          <div className="p-6 h-full">
            <CombinedContentView
              files={files}
              subfolders={subfolders}
              viewMode={viewMode}
              selectedFile={selectedFile}
              folders={folders}
              folderFileCounts={folderFileCounts}
              isLoading={isLoading}
              onSelectFile={onSelectFile}
              onDoubleClickFile={onDoubleClickFile}
              onDeleteFile={onDeleteFile}
              onEditFile={onEditFile}
              onAnalyzeFile={onAnalyzeFile}
              onSelectSubfolder={onSelectSubfolder}
              onMoveFile={onMoveFile}
              onEditSubfolder={onEditSubfolder}
              onDeleteSubfolder={onDeleteSubfolder}
            />
          </div>
        </DraggableArea>
      )}
    </div>
  );
};

export default FolderContentView; 