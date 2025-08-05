import React from 'react';
import { FileText } from 'lucide-react';
import DraggableArea from './DraggableArea';
import { FileFolder } from '@/types/files';

interface EmptyFolderStateProps {
  selectedFolder: FileFolder | null;
}

const EmptyFolderState: React.FC<EmptyFolderStateProps> = ({ selectedFolder }) => {
  return (
    <div className="h-full w-full p-6">
      <DraggableArea
        targetId="empty-files"
        selectedFolder={selectedFolder}
        className="h-full w-full flex items-center justify-center"
      >
        <div className="text-center">
          <FileText className="w-12 h-12 mx-auto mb-3 text-[#AB9C95]" />
          <p className="text-sm mb-2 text-[#AB9C95]">
            No files in this folder yet
          </p>
          <p className="text-xs text-[#AB9C95]">
            Drag and drop files here to upload
          </p>
        </div>
      </DraggableArea>
    </div>
  );
};

export default EmptyFolderState; 