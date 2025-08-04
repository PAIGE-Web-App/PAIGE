import React, { useState } from 'react';
import { FileFolder, FileItem } from '@/types/files';
import { ChevronDown, ChevronRight, Folder, FolderOpen, FileText, Plus, Upload } from 'lucide-react';
import FileItemComponent from './FileItemComponent';
import FileItemSkeleton from './FileItemSkeleton';
import { useDragDrop } from './DragDropContext';
import BadgeCount from './BadgeCount';

interface FolderContentViewProps {
  selectedFolder: FileFolder | null;
  subfolders: FileFolder[];
  files: FileItem[];
  viewMode: 'list' | 'grid';
  onSelectFile: (file: FileItem) => void;
  selectedFile: FileItem | null;
  onDeleteFile: (fileId: string) => void;
  onEditFile: (file: FileItem) => void;
  onCreateSubfolder: () => void;
  onUploadFile: () => void;
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
  onCreateSubfolder,
  onUploadFile,
  onSelectSubfolder,
  isLoading = false,
}) => {
  const [subfoldersExpanded, setSubfoldersExpanded] = useState(true);
  const [filesExpanded, setFilesExpanded] = useState(true);
  const { draggedItem, isDragging, dropTarget, setDropTarget } = useDragDrop();

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
    <div className="flex-1 p-6 overflow-y-auto min-h-0 space-y-6">
      {/* Subfolders Section - Only show for non-All Files folders */}
      {selectedFolder.id !== 'all' && (
        <div 
          className={`bg-white border border-[#E0DBD7] rounded-[5px] overflow-hidden transition-all ${
            dropTarget === 'subfolders' && isDragging ? 'border-[#A85C36] bg-[#F8F6F4]' : ''
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
        <div className="flex items-center justify-between p-4 border-b border-[#E0DBD7] bg-[#F8F6F4]">
          <button
            onClick={() => setSubfoldersExpanded(!subfoldersExpanded)}
            className="flex items-center gap-2 text-[#332B42] font-medium hover:text-[#A85C36] transition-colors"
          >
            {subfoldersExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
            <Folder className="w-4 h-4" />
            <span>Subfolders</span>
            <BadgeCount count={subfolders.length} />
          </button>
          <button
            onClick={onCreateSubfolder}
            className="text-xs text-[#332B42] border border-[#AB9C95] rounded-[5px] px-2 py-1 hover:bg-[#F3F2F0] flex items-center h-7"
            title="Create a new subfolder"
          >
            <Plus className="w-3 h-3 mr-1" />
            New Subfolder
          </button>
        </div>
        
        {subfoldersExpanded && (
          <div className="p-4">
            {subfolders.length === 0 ? (
              <div className="text-center py-8">
                <Folder className="w-12 h-12 text-[#AB9C95] mx-auto mb-3" />
                <p className="text-[#AB9C95] text-sm">
                  No subfolders yet
                </p>
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {subfolders.map((subfolder) => (
                  <div
                    key={subfolder.id}
                    onClick={() => onSelectSubfolder(subfolder)}
                    className="flex items-center gap-3 p-3 border border-[#E0DBD7] rounded-[5px] hover:bg-[#F8F6F4] hover:border-[#AB9C95] cursor-pointer transition-colors"
                  >
                    <FolderOpen className="w-5 h-5 text-[#A85C36] flex-shrink-0" />
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
            )}
          </div>
        )}
      </div>
      )}

      {/* Files Section */}
      <div 
        className={`bg-white border border-[#E0DBD7] rounded-[5px] overflow-hidden transition-all ${
          dropTarget === 'files' && isDragging ? 'border-[#A85C36] bg-[#F8F6F4]' : ''
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
        <div className="flex items-center justify-between p-4 border-b border-[#E0DBD7] bg-[#F8F6F4]">
          <button
            onClick={() => setFilesExpanded(!filesExpanded)}
            className="flex items-center gap-2 text-[#332B42] font-medium hover:text-[#A85C36] transition-colors"
          >
            {filesExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
            <FileText className="w-4 h-4" />
            <span>Files</span>
            <BadgeCount count={files.length} />
          </button>
          <button
            onClick={onUploadFile}
            className="text-xs text-[#332B42] border border-[#AB9C95] rounded-[5px] px-2 py-1 hover:bg-[#F3F2F0] flex items-center h-7"
            title="Upload a new file"
          >
            <Upload className="w-3 h-3 mr-1" />
            Upload File
          </button>
        </div>
        
        {filesExpanded && (
          <div className="p-4">
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
                    onDelete={onDeleteFile}
                    onEdit={onEditFile}
                    onSelect={onSelectFile}
                    isSelected={selectedFile?.id === file.id}
                    viewMode={viewMode}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default FolderContentView; 