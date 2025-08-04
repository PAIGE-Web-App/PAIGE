import React, { useState, useEffect } from 'react';
import { FileFolder, FileItem } from '@/types/files';
import { ChevronDown, ChevronRight, Folder, FileText, Plus, Upload } from 'lucide-react';
import FileItemComponent from './FileItemComponent';
import FileItemSkeleton from './FileItemSkeleton';
import { useDragDrop } from './DragDropContext';
import BadgeCount from './BadgeCount';
import FilesTabs from './FilesTabs';

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
  isLoading = false,
}) => {
  const [activeTab, setActiveTab] = useState('files');
  const { draggedItem, isDragging, dropTarget, setDropTarget } = useDragDrop();

  // Auto-select appropriate tab based on content
  useEffect(() => {
    if (subfolders.length === 0) {
      setActiveTab('files');
    } else if (subfolders.length > 0 && activeTab === 'files') {
      setActiveTab('subfolders');
    }
  }, [subfolders.length]);

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
    <div className="flex-1 p-6 overflow-y-auto min-h-0">
      {/* Only show tabs if there are subfolders */}
      {subfolders.length > 0 && (
        <div className="mb-6">
          <FilesTabs
            activeTab={activeTab}
            onTabChange={setActiveTab}
            subfoldersCount={subfolders.length}
            filesCount={files.length}
          />
        </div>
      )}

      {/* Tab Content */}
      {activeTab === 'subfolders' && (
        <div 
          className={`transition-all ${
            dropTarget === 'subfolders' && isDragging ? 'bg-[#F8F6F4]' : ''
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            setDropTarget('subfolders');
          }}
          onDragLeave={() => setDropTarget(null)}
          onDrop={(e) => {
            e.preventDefault();
            setDropTarget(null);
            if (draggedItem && draggedItem.type === 'file') {
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
          className={`transition-all ${
            dropTarget === 'files' && isDragging ? 'bg-[#F8F6F4]' : ''
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            setDropTarget('files');
          }}
          onDragLeave={() => setDropTarget(null)}
          onDrop={(e) => {
            e.preventDefault();
            setDropTarget(null);
            if (draggedItem && draggedItem.type === 'file') {
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
          ) : files.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 text-[#AB9C95] mx-auto mb-3" />
              <p className="text-[#AB9C95] text-sm">
                No files in this folder yet
              </p>
            </div>
          ) : (
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
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FolderContentView; 