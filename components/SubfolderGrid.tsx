import React, { memo } from 'react';
import { FileFolder } from '@/types/files';
import { Folder } from 'lucide-react';
import { useDragDrop } from './DragDropContext';
import MicroMenu from './MicroMenu';

interface SubfolderGridProps {
  subfolders: FileFolder[];
  onSelectSubfolder: (subfolder: FileFolder) => void;
  folderFileCounts: Map<string, number>;
  folders: FileFolder[];
  onMoveFile?: (fileId: string, newFolderId: string) => Promise<void>;
  onEditSubfolder?: (subfolder: FileFolder) => void;
  onDeleteSubfolder?: (subfolder: FileFolder) => void;
}

const SubfolderGrid: React.FC<SubfolderGridProps> = memo(({
  subfolders,
  onSelectSubfolder,
  folderFileCounts,
  folders,
  onMoveFile,
  onEditSubfolder,
  onDeleteSubfolder
}) => {
  const { setDraggedItem, setIsDragging } = useDragDrop();
  if (subfolders.length === 0) {
    return null;
  }

  return (
    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
      {subfolders.map((subfolder) => (
        <div
          key={subfolder.id}
          className="flex items-center gap-3 p-3 bg-white border border-[#E0DBD7] rounded-[5px] hover:bg-[#F8F6F4] hover:border-[#AB9C95] transition-colors"
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
            e.currentTarget.classList.add('bg-[#F0EDE8]', 'border-[#A85C36]', 'border-2');
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            e.stopPropagation();
            e.currentTarget.classList.remove('bg-[#F0EDE8]', 'border-[#A85C36]', 'border-2');
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            e.currentTarget.classList.remove('bg-[#F0EDE8]', 'border-[#A85C36]', 'border-2');
            
            // Clear drag state
            setDraggedItem(null);
            setIsDragging(false);
            
            // Check if this is a file drop from within the app
            const fileId = e.dataTransfer.getData('text/plain');
            if (fileId && onMoveFile) {
              onMoveFile(fileId, subfolder.id);
            }
          }}
        >
          <div 
            className="flex items-center gap-3 flex-1 cursor-pointer"
            onClick={() => onSelectSubfolder(subfolder)}
          >
            <Folder 
              className="w-5 h-5 flex-shrink-0" 
              style={{ 
                color: subfolder.color || '#AB9C95', 
                strokeWidth: 1, 
                fill: subfolder.color || '#AB9C95' 
              }} 
            />
            <div className="flex-1 min-w-0">
              <h6 className="truncate" title={subfolder.name}>
                {subfolder.name}
              </h6>
              <p className="text-xs text-[#AB9C95]">
                {folderFileCounts.get(subfolder.id) || 0} files
              </p>
            </div>
          </div>
          
          {/* Micro Menu */}
          <MicroMenu
            items={[
              {
                label: 'Edit',
                onClick: () => onEditSubfolder?.(subfolder)
              },
              {
                label: 'Delete',
                onClick: () => onDeleteSubfolder?.(subfolder),
                className: 'text-red-600 hover:bg-red-50'
              }
            ]}
            className="flex-shrink-0"
            buttonClassName="p-1 hover:bg-[#F8F6F4] rounded-full"
            menuClassName="absolute mt-1 w-32 bg-white border border-[#E0DBD7] rounded-[5px] shadow-lg z-50"
          />
        </div>
      ))}
    </div>
  );
});

SubfolderGrid.displayName = 'SubfolderGrid';

export default SubfolderGrid; 