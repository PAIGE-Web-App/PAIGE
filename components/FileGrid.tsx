import React, { memo } from 'react';
import { FileItem, FileFolder } from '@/types/files';
import FileItemComponent from './FileItemComponent';
import FileItemSkeleton from './FileItemSkeleton';

interface FileGridProps {
  files: FileItem[];
  viewMode: 'list' | 'grid';
  selectedFile: FileItem | null;
  folders: FileFolder[];
  isLoading?: boolean;
  onSelectFile: (file: FileItem) => void;
  onDeleteFile: (fileId: string) => void;
  onEditFile: (file: FileItem) => void;
}

const FileGrid: React.FC<FileGridProps> = memo(({
  files,
  viewMode,
  selectedFile,
  folders,
  isLoading = false,
  onSelectFile,
  onDeleteFile,
  onEditFile
}) => {
  if (isLoading) {
    return (
      <div className={viewMode === 'grid' ? 'grid gap-4 md:grid-cols-2 lg:grid-cols-3' : 'space-y-4'}>
        {[...Array(4)].map((_, i) => (
          <FileItemSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (files.length === 0) {
    return null;
  }

  return (
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
  );
});

FileGrid.displayName = 'FileGrid';

export default FileGrid; 