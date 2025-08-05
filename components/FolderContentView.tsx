import React, { useState, useEffect } from 'react';
import { FileFolder, FileItem } from '@/types/files';
import { ChevronDown, ChevronRight, Folder, FileText, Plus, Upload } from 'lucide-react';
import FileItemComponent from './FileItemComponent';
import FileItemSkeleton from './FileItemSkeleton';
import { useDragDrop } from './DragDropContext';
import BadgeCount from './BadgeCount';
import FilesTabs from './FilesTabs';
import LoadingBar from './LoadingBar';

interface FolderContentViewProps {
  selectedFolder: FileFolder | null;
  subfolders: FileFolder[];
  files: FileItem[];
  viewMode: 'list' | 'grid';
  onSelectFile: (file: FileItem) => void;
  selectedFile: FileItem | null;
  onDeleteFile: (fileId: string) => void;
  onEditFile: (file: FileItem) => void;
  onSelectSubfolder: (subfolder: FileFolder) => void;
  onUploadComplete: (fileId: string) => void;
  folders: FileFolder[];
  isLoading?: boolean;
}

const FolderContentView: React.FC<FolderContentViewProps> = ({
  selectedFolder,
  subfolders,
  files,
  viewMode,
  onSelectFile,
  selectedFile,
  onDeleteFile,
  onEditFile,
  onSelectSubfolder,
  onUploadComplete,
  folders,
  isLoading = false,
}) => {
  const [activeTab, setActiveTab] = useState('files');
  const { draggedItem, isDragging, dropTarget, setDropTarget } = useDragDrop();
  
  // Upload progress state
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentFileIndex, setCurrentFileIndex] = useState(0);
  const [totalFiles, setTotalFiles] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  
  // Local drag state for external file drags
  const [isExternalDragging, setIsExternalDragging] = useState(false);

  // Auto-select appropriate tab based on content
  useEffect(() => {
    if (subfolders.length === 0) {
      setActiveTab('files');
    } else if (subfolders.length > 0 && activeTab === 'files') {
      setActiveTab('subfolders');
    }
  }, [subfolders.length]);

  // Handle upload completion - switch to Files tab and focus on uploaded file
  useEffect(() => {
    if (onUploadComplete) {
      const handleUploadComplete = (fileId: string) => {
        // Switch to Files tab
        setActiveTab('files');
        // Focus on the uploaded file (this will be handled by the parent component)
        onUploadComplete(fileId);
      };
      
      // Store the handler for use in the upload completion callback
      (window as any).handleUploadComplete = handleUploadComplete;
    }
  }, [onUploadComplete]);

  // Handle upload progress tracking
  useEffect(() => {
    const handleUploadProgress = (event: CustomEvent) => {
      const { fileIndex, totalFiles: total, progress } = event.detail;
      setCurrentFileIndex(fileIndex + 1);
      setTotalFiles(total);
      setUploadProgress(progress);
      setIsUploading(true);
    };

    const handleUploadComplete = () => {
      setIsUploading(false);
      setUploadProgress(0);
      setCurrentFileIndex(0);
      setTotalFiles(0);
    };

    window.addEventListener('uploadProgress', handleUploadProgress as EventListener);
    window.addEventListener('uploadComplete', handleUploadComplete as EventListener);

    return () => {
      window.removeEventListener('uploadProgress', handleUploadProgress as EventListener);
      window.removeEventListener('uploadComplete', handleUploadComplete as EventListener);
    };
  }, []);

  // If no folder is selected, show empty state
  if (!selectedFolder) {
    return (
      <div className="flex-1 p-6 overflow-y-auto min-h-0">
        <div className="text-center py-12">
          <Folder className="w-16 h-16 text-[#AB9C95] mx-auto mb-4" />
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
    <div className="flex-1 overflow-y-auto min-h-0">
      {/* Upload Progress Bar */}
      <LoadingBar 
        isVisible={isUploading} 
        description={`Uploading file ${currentFileIndex} of ${totalFiles}...`}
      />
      
      {/* If no files and no subfolders, show full-height draggable area */}
      {files.length === 0 && subfolders.length === 0 ? (
        <div className="h-full w-full p-6">
          <div 
            className={`h-full w-full flex items-center justify-center transition-all duration-300 ${
              dropTarget === 'empty-files' && (isDragging || isExternalDragging)
                ? 'bg-[#F0EDE8] border-2 border-dashed border-[#A85C36] rounded-[5px] scale-[1.02] shadow-lg' 
                : 'bg-transparent border-2 border-dashed border-transparent'
            }`}
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
            
            // Check if this is a file drag from outside the app
            if (e.dataTransfer.types.includes('Files')) {
              setIsExternalDragging(true);
              setDropTarget('empty-files');
            }
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!e.currentTarget.contains(e.relatedTarget as Node)) {
              setDropTarget(null);
              setIsExternalDragging(false);
            }
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setDropTarget(null);
            setIsExternalDragging(false);
            
            // Handle external file drops
            const files = Array.from(e.dataTransfer.files);
            if (files.length > 0) {
              // Trigger file upload for each dropped file with progress tracking
              files.forEach((file, index) => {
                const uploadEvent = new CustomEvent('uploadFilesWithProgress', {
                  detail: {
                    files: [file],
                    folderId: selectedFolder?.id || 'all',
                    fileIndex: index,
                    totalFiles: files.length
                  }
                });
                window.dispatchEvent(uploadEvent);
              });
            }
          }}
        >
          <div className="text-center">
            <FileText className={`w-12 h-12 mx-auto mb-3 transition-colors duration-200 ${
              dropTarget === 'empty-files' && isDragging ? 'text-[#A85C36]' : 'text-[#AB9C95]'
            }`} />
            <p className={`text-sm mb-2 transition-colors duration-200 ${
              dropTarget === 'empty-files' && isDragging ? 'text-[#A85C36] font-medium' : 'text-[#AB9C95]'
            }`}>
              No files in this folder yet
            </p>
            <p className={`text-xs transition-colors duration-200 ${
              dropTarget === 'empty-files' && isDragging ? 'text-[#A85C36] font-medium' : 'text-[#AB9C95]'
            }`}>
              {dropTarget === 'empty-files' && isDragging ? 'Drop files here to upload' : 'Drag and drop files here to upload'}
            </p>
          </div>
        </div>
        </div>
      ) : (
        /* Content when there are files or subfolders */
        <div className="h-full w-full flex flex-col">
          {/* Only show tabs if there are subfolders */}
          {subfolders.length > 0 && (
            <div className="p-6 pb-0">
              <FilesTabs
                activeTab={activeTab}
                onTabChange={setActiveTab}
                subfoldersCount={subfolders.length}
                filesCount={files.length}
              />
            </div>
          )}

          {/* Tab Content - Full Height */}
          {activeTab === 'subfolders' && (
        <div 
          className={`flex-1 p-6 transition-all duration-300 ${
            dropTarget === 'subfolders' && (isDragging || isExternalDragging) 
              ? 'bg-[#F0EDE8] border-2 border-dashed border-[#A85C36] rounded-[5px] scale-[1.02] shadow-lg' 
              : 'bg-transparent border-2 border-dashed border-transparent'
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
            
            // Check if this is a file drag from outside the app
            if (e.dataTransfer.types.includes('Files')) {
              setIsExternalDragging(true);
              setDropTarget('subfolders');
            } else {
              setDropTarget('subfolders');
            }
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!e.currentTarget.contains(e.relatedTarget as Node)) {
              setDropTarget(null);
              setIsExternalDragging(false);
            }
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setDropTarget(null);
            setIsExternalDragging(false);
            
            // Handle external file drops
            const files = Array.from(e.dataTransfer.files);
            if (files.length > 0) {
              // Trigger file upload for each dropped file with progress tracking
              files.forEach((file, index) => {
                const uploadEvent = new CustomEvent('uploadFilesWithProgress', {
                  detail: {
                    files: [file],
                    folderId: selectedFolder?.id || 'all',
                    fileIndex: index,
                    totalFiles: files.length
                  }
                });
                window.dispatchEvent(uploadEvent);
              });
            } else if (draggedItem && draggedItem.type === 'file') {
              // Handle internal file moves
              // TODO: Move file to this folder
              console.log('Move file to subfolders section:', draggedItem.item);
            }
          }}
        >
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {subfolders.map((subfolder) => (
              <div
                key={subfolder.id}
                onClick={() => onSelectSubfolder(subfolder)}
                className="flex items-center gap-3 p-3 bg-white border border-[#E0DBD7] rounded-[5px] hover:bg-[#F8F6F4] hover:border-[#AB9C95] cursor-pointer transition-colors"
              >
                <Folder className="w-5 h-5 flex-shrink-0" style={{ color: subfolder.color || '#AB9C95', strokeWidth: 1, fill: subfolder.color || '#AB9C95' }} />
                <div className="flex-1 min-w-0">
                  <h6 className="truncate" title={subfolder.name}>
                    {subfolder.name}
                  </h6>
                  <p className="text-xs text-[#AB9C95]">
                    {subfolder.fileCount} files, {subfolder.subfolderCount} subfolders
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

          {activeTab === 'files' && (
        <div 
          className={`flex-1 p-6 transition-all duration-300 ${
            dropTarget === 'files' && (isDragging || isExternalDragging) 
              ? 'bg-[#F0EDE8] border-2 border-dashed border-[#A85C36] rounded-[5px] scale-[1.02] shadow-lg' 
              : 'bg-transparent border-2 border-dashed border-transparent'
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
            
            // Check if this is a file drag from outside the app
            if (e.dataTransfer.types.includes('Files')) {
              setIsExternalDragging(true);
              setDropTarget('files');
            } else {
              setDropTarget('files');
            }
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!e.currentTarget.contains(e.relatedTarget as Node)) {
              setDropTarget(null);
              setIsExternalDragging(false);
            }
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setDropTarget(null);
            setIsExternalDragging(false);
            
            // Handle external file drops
            const files = Array.from(e.dataTransfer.files);
            if (files.length > 0) {
              // Trigger file upload for each dropped file with progress tracking
              files.forEach((file, index) => {
                const uploadEvent = new CustomEvent('uploadFilesWithProgress', {
                  detail: {
                    files: [file],
                    folderId: selectedFolder?.id || 'all',
                    fileIndex: index,
                    totalFiles: files.length
                  }
                });
                window.dispatchEvent(uploadEvent);
              });
            } else if (draggedItem && draggedItem.type === 'file') {
              // Handle internal file moves
              // TODO: Move file to this folder
              console.log('Move file to files section:', draggedItem.item);
            }
          }}
        >
          {isLoading ? (
            <div className={viewMode === 'grid' ? 'grid gap-4 md:grid-cols-2 lg:grid-cols-3' : 'space-y-4'}>
              {[...Array(4)].map((_, i) => (
                <FileItemSkeleton key={i} />
              ))}
            </div>
          ) : files.length > 0 ? (
            <div className={viewMode === 'grid' ? 'grid gap-4 md:grid-cols-2 lg:grid-cols-3' : 'space-y-4'}>
              {files.map((file) => (
                <FileItemComponent
                  key={file.id}
                  file={file}
                  viewMode={viewMode}
                  isSelected={selectedFile?.id === file.id}
                  onSelect={() => onSelectFile(file)}
                  onDelete={() => onDeleteFile(file.id)}
                  onEdit={() => onEditFile(file)}
                  folders={folders}
                />
              ))}
            </div>
          ) : null}
        </div>
      )}
        </div>
      )}
    </div>
  );
};

export default FolderContentView; 