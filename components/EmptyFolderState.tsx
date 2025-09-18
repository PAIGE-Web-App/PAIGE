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
          <img src="/Files.png" alt="Empty Folder" className="w-16 h-16 mx-auto mb-4 opacity-70" />
          <h3 className="text-lg font-medium text-[#332B42] mb-2">No files in this folder yet</h3>
          <p className="text-sm text-[#AB9C95] mb-3">
            Upload wedding documents, contracts, and photos to get started
          </p>
          <p className="text-xs text-[#AB9C95]">
            Drag and drop files here to upload or add a new folder
          </p>
        </div>
      </DraggableArea>
    </div>
  );
};

export default EmptyFolderState; 