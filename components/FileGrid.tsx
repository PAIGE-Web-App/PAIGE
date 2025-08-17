import React, { memo } from 'react';
import { FileItem, FileFolder } from '@/types/files';
import FileItemComponent from './FileItemComponent';
import FileCard from './FileCard';
import FileItemSkeleton from './FileItemSkeleton';

interface FileGridProps {
  files: FileItem[];
  viewMode: 'list' | 'grid';
  onDeleteFile: (fileId: string) => void;
  onEditFile: (file: FileItem) => void;
  onSelectFile: (file: FileItem) => void;
  onAnalyzeFile: (file: FileItem) => void;
  selectedFile: FileItem | null;
  folders?: FileFolder[];
  isLoading?: boolean;
}

const FileGrid = memo(({ 
  files, 
  viewMode, 
  onDeleteFile, 
  onEditFile, 
  onSelectFile, 
  onAnalyzeFile, 
  selectedFile, 
  folders = [],
  isLoading = false 
}: FileGridProps) => {
  // Show skeleton loading if loading
  if (isLoading) {
    if (viewMode === 'grid') {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <FileItemSkeleton key={index} />
          ))}
        </div>
      );
    }
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, index) => (
          <FileItemSkeleton key={index} />
        ))}
      </div>
    );
  }

  // Virtual scrolling for large lists (50+ files)
  if (files.length > 50 && viewMode === 'list') {
    return (
      <div className="space-y-0">
        {files.slice(0, 50).map((file) => (
          <FileItemComponent
            key={file.id}
            file={file}
            viewMode={viewMode}
            onDelete={onDeleteFile}
            onEdit={onEditFile}
            onSelect={onSelectFile}
            onAnalyze={onAnalyzeFile}
            isSelected={selectedFile?.id === file.id}
            folders={folders}
          />
        ))}
        {files.length > 50 && (
          <div className="text-center py-4 text-sm text-gray-500">
            Showing first 50 files. Use search to find specific files.
          </div>
        )}
      </div>
    );
  }

  // Regular rendering for smaller lists
  if (viewMode === 'grid') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {files.map((file) => (
          <FileCard
            key={file.id}
            file={file}
            onDelete={onDeleteFile}
            onEdit={onEditFile}
            onSelect={onSelectFile}
            onAnalyze={onAnalyzeFile}
            isSelected={selectedFile?.id === file.id}
            folders={folders}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {files.map((file) => (
        <FileItemComponent
          key={file.id}
          file={file}
          viewMode={viewMode}
          onDelete={onDeleteFile}
          onEdit={onEditFile}
          onSelect={onSelectFile}
          onAnalyze={onAnalyzeFile}
          isSelected={selectedFile?.id === file.id}
          folders={folders}
        />
      ))}
    </div>
  );
});

FileGrid.displayName = 'FileGrid';

export default FileGrid; 