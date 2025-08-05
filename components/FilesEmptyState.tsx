import React from 'react';
import { Folder, Upload } from 'lucide-react';

interface FilesEmptyStateProps {
  onCreateFolder: () => void;
  onUploadFiles: () => void;
}

const FilesEmptyState: React.FC<FilesEmptyStateProps> = ({
  onCreateFolder,
  onUploadFiles
}) => {
  const handleExternalDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Handle external file drops to main empty state
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      // Trigger file upload for each dropped file to "All Files"
      files.forEach(file => {
        const uploadEvent = new CustomEvent('uploadFiles', {
          detail: {
            files: [file],
            folderId: 'all'
          }
        });
        window.dispatchEvent(uploadEvent);
      });
    }
  };

  return (
    <div 
      className="flex-1 flex items-center justify-center p-6 bg-[#F3F2F0]"
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onDrop={handleExternalDrop}
    >
      <div className="text-center max-w-md">
        <div className="w-24 h-24 bg-[#F8F6F4] border-2 border-[#E0DBD7] rounded-full flex items-center justify-center mx-auto mb-6">
          <Folder className="w-12 h-12" style={{ strokeWidth: 1, fill: '#AB9C95', color: '#AB9C95' }} />
        </div>
        
        <h2 className="text-2xl font-playfair font-semibold text-[#332B42] mb-3">
          Create a folder or upload files
        </h2>
        
        <p className="text-[#AB9C95] mb-8 leading-relaxed">
          Organize your wedding documents, contracts, and photos by creating folders or uploading files directly.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={onCreateFolder}
            className="btn-primary flex items-center justify-center gap-2 px-6 py-3"
          >
            <Folder className="w-5 h-5" style={{ strokeWidth: 1, fill: '#A85C36' }} />
            Create Folder
          </button>
          
          <button
            onClick={onUploadFiles}
            className="btn-primaryinverse flex items-center justify-center gap-2 px-6 py-3 border-2 border-[#A85C36] text-[#A85C36] hover:bg-[#A85C36] hover:text-white transition-colors"
          >
            <Upload className="w-5 h-5" />
            Upload Files
          </button>
        </div>
      </div>
    </div>
  );
};

export default FilesEmptyState; 