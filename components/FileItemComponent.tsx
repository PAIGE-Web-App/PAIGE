import React from 'react';
import { FileItem, FileFolder } from '@/types/files';
import { FileText, MoreHorizontal, Download, Eye, Trash2, Edit } from 'lucide-react';
import { useDragDrop } from './DragDropContext';

interface FileItemComponentProps {
  file: FileItem;
  onDelete: (fileId: string) => void;
  onEdit: (file: FileItem) => void;
  onSelect: (file: FileItem) => void;
  isSelected?: boolean;
  viewMode?: 'list' | 'grid';
  folders?: FileFolder[];
}

const FileItemComponent: React.FC<FileItemComponentProps> = ({ file, onDelete, onEdit, onSelect, isSelected, viewMode = 'grid', folders = [] }) => {
  const { setDraggedItem, setIsDragging, draggedItem, isDragging } = useDragDrop();
  
  // Check if this file is currently being dragged
  const isThisFileDragging = isDragging && draggedItem?.type === 'file' && draggedItem.item.id === file.id;
  
  // Get folder name for display
  const getFolderName = (folderId: string) => {
    if (folderId === 'all') return 'All Files';
    const folder = folders.find(f => f.id === folderId);
    return folder ? folder.name : 'Unknown Folder';
  };
  
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (fileType: string) => {
    switch (fileType.toLowerCase()) {
      case 'pdf':
        return <FileText className="w-6 h-6 text-red-600" />;
      case 'doc':
      case 'docx':
        return <FileText className="w-6 h-6 text-blue-600" />;
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
        return <FileText className="w-6 h-6 text-green-600" />;
      default:
        return <FileText className="w-6 h-6 text-gray-600" />;
    }
  };

  // List view layout
  if (viewMode === 'list') {
    return (
      <div 
        className={`bg-white border rounded-[5px] p-4 hover:shadow-sm transition-all cursor-pointer ${
          isSelected 
            ? 'border-[#A85C36] bg-[#F8F6F4] shadow-md' 
            : 'border-[#E0DBD7] hover:border-[#AB9C95]'
        } ${isThisFileDragging ? 'opacity-40' : ''}`}
        onClick={() => onSelect(file)}
        draggable
        onDragStart={(e) => {
          setDraggedItem({ type: 'file', item: file });
          setIsDragging(true);
          e.dataTransfer.effectAllowed = 'move';
          
          // Create a better sized drag preview
          const dragPreview = document.createElement('div');
          dragPreview.style.cssText = `
            width: 160px;
            height: 56px;
            background: white;
            border: 1px solid #A85C36;
            border-radius: 5px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            display: flex;
            align-items: center;
            padding: 12px;
            overflow: hidden;
            min-height: 56px;
            max-height: 56px;
          `;
          dragPreview.innerHTML = `
            <div style="width: 20px; height: 20px; background-color: #F8F6F4; border-radius: 3px; display: flex; align-items: center; justify-content: center; margin-right: 8px; flex-shrink: 0;">
              <svg style="width: 16px; height: 16px; color: #6B7280;"><!-- File icon --></svg>
            </div>
            <span style="font-size: 14px; color: #332B42; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 120px; line-height: 1;">${file.name.split('.')[0]}</span>
          `;
          document.body.appendChild(dragPreview);
          e.dataTransfer.setDragImage(dragPreview, 80, 28);
          
          // Remove the preview after drag starts
          setTimeout(() => {
            if (document.body.contains(dragPreview)) {
              document.body.removeChild(dragPreview);
            }
          }, 0);
        }}
        onDragEnd={() => {
          setDraggedItem(null);
          setIsDragging(false);
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 flex-1">
            {/* File Icon */}
            <div className="w-10 h-10 bg-[#F8F6F4] rounded-[5px] flex items-center justify-center flex-shrink-0">
              {getFileIcon(file.fileType)}
            </div>
            
            {/* File Details */}
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-[#332B42] text-sm truncate">
                {file.name}
              </h3>
              <p className="text-xs text-[#AB9C95] mt-1 truncate">
                {file.description}
              </p>
            </div>
            
            {/* File Metadata */}
            <div className="flex items-center gap-4 text-xs text-[#AB9C95]">
              <span className="px-2 py-1 bg-[#F8F6F4] rounded-[3px]" title={`Folder: ${getFolderName(file.folderId)}`}>
                {getFolderName(file.folderId)}
              </span>
              <span>{formatFileSize(file.fileSize)}</span>
              <span>{file.uploadedAt.toLocaleDateString()}</span>
            </div>
          </div>
          
          {/* Actions */}
          <div className="flex items-center gap-1">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onEdit(file);
              }}
              className="p-2 hover:bg-[#F8F6F4] rounded-[5px] transition-colors"
              title="Edit file"
            >
              <Edit className="w-4 h-4 text-[#AB9C95]" />
            </button>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                window.open(file.fileUrl, '_blank');
              }}
              className="p-2 hover:bg-[#F8F6F4] rounded-[5px] transition-colors"
              title="View file"
            >
              <Eye className="w-4 h-4 text-[#AB9C95]" />
            </button>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onDelete(file.id);
              }}
              className="p-2 hover:bg-red-50 rounded-[5px] transition-colors"
              title="Delete file"
            >
              <Trash2 className="w-4 h-4 text-red-500" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Grid view layout (default)
  return (
    <div 
      className={`bg-white border rounded-[5px] p-4 hover:shadow-sm transition-all cursor-pointer ${
        isSelected 
          ? 'border-[#A85C36] bg-[#F8F6F4] shadow-md' 
          : 'border-[#E0DBD7] hover:border-[#AB9C95]'
      } ${isThisFileDragging ? 'opacity-40' : ''}`}
      onClick={() => onSelect(file)}
      draggable
      onDragStart={(e) => {
        setDraggedItem({ type: 'file', item: file });
        setIsDragging(true);
        e.dataTransfer.effectAllowed = 'move';
        
                // Create a better sized drag preview
        const dragPreview = document.createElement('div');
        dragPreview.style.cssText = `
          width: 160px;
          height: 56px;
          background: white;
          border: 1px solid #A85C36;
          border-radius: 5px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          display: flex;
          align-items: center;
          padding: 12px;
          overflow: hidden;
          min-height: 56px;
          max-height: 56px;
        `;
        dragPreview.innerHTML = `
          <div style="width: 20px; height: 20px; background-color: #F8F6F4; border-radius: 3px; display: flex; align-items: center; justify-content: center; margin-right: 8px; flex-shrink: 0;">
            <svg style="width: 16px; height: 16px; color: #6B7280;"><!-- File icon --></svg>
          </div>
          <span style="font-size: 14px; color: #332B42; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 120px; line-height: 1;">${file.name.split('.')[0]}</span>
        `;
        document.body.appendChild(dragPreview);
        e.dataTransfer.setDragImage(dragPreview, 80, 28);
        
        // Remove the preview after drag starts
        setTimeout(() => {
          if (document.body.contains(dragPreview)) {
            document.body.removeChild(dragPreview);
          }
        }, 0);
      }}
      onDragEnd={() => {
        setDraggedItem(null);
        setIsDragging(false);
      }}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4 flex-1">
          {/* File Icon */}
          <div className="w-12 h-12 bg-[#F8F6F4] rounded-[5px] flex items-center justify-center flex-shrink-0">
            {getFileIcon(file.fileType)}
          </div>
          
          {/* File Details */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-[#332B42] mb-1 truncate">
              {file.name}
            </h3>
            <p className="text-sm text-[#AB9C95] mb-2 line-clamp-2">
              {file.description}
            </p>
            
            {/* File Metadata */}
            <div className="flex items-center gap-2 mb-3">
              <span className="inline-block px-2 py-1 bg-[#F8F6F4] text-xs text-[#332B42] rounded-[3px]" title={`Folder: ${getFolderName(file.folderId)}`}>
                {getFolderName(file.folderId)}
              </span>
              <span className="text-xs text-[#AB9C95]">
                {formatFileSize(file.fileSize)}
              </span>
              <span className="text-xs text-[#AB9C95]">
                {file.uploadedAt.toLocaleDateString()}
              </span>
            </div>

            {/* AI Analysis Status */}
            {file.isProcessed && (
              <div className="space-y-2">
                {file.aiSummary && (
                  <div className="bg-green-50 border border-green-200 rounded-[5px] p-3">
                    <h4 className="text-sm font-medium text-green-800 mb-1">AI Summary</h4>
                    <p className="text-xs text-green-700 line-clamp-2">
                      {file.aiSummary}
                    </p>
                  </div>
                )}
                
                {file.keyPoints && file.keyPoints.length > 0 && (
                  <div className="bg-blue-50 border border-blue-200 rounded-[5px] p-3">
                    <h4 className="text-sm font-medium text-blue-800 mb-1">Key Points</h4>
                    <ul className="text-xs text-blue-700 space-y-1">
                      {file.keyPoints.slice(0, 2).map((point, index) => (
                        <li key={index} className="line-clamp-1">• {point}</li>
                      ))}
                      {file.keyPoints.length > 2 && (
                        <li className="text-blue-600">+{file.keyPoints.length - 2} more</li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {!file.isProcessed && file.processingStatus === 'pending' && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-[5px] p-3">
                <p className="text-xs text-yellow-700">AI analysis in progress...</p>
              </div>
            )}
          </div>
        </div>
        
        {/* Actions */}
        <div className="flex items-center gap-1">
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onEdit(file);
            }}
            className="p-2 hover:bg-[#F8F6F4] rounded-[5px] transition-colors"
            title="Edit file"
          >
            <Edit className="w-4 h-4 text-[#AB9C95]" />
          </button>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              window.open(file.fileUrl, '_blank');
            }}
            className="p-2 hover:bg-[#F8F6F4] rounded-[5px] transition-colors"
            title="View file"
          >
            <Eye className="w-4 h-4 text-[#AB9C95]" />
          </button>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              window.open(file.fileUrl, '_blank');
            }}
            className="p-2 hover:bg-[#F8F6F4] rounded-[5px] transition-colors"
            title="Download file"
          >
            <Download className="w-4 h-4 text-[#AB9C95]" />
          </button>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onDelete(file.id);
            }}
            className="p-2 hover:bg-red-50 rounded-[5px] transition-colors"
            title="Delete file"
          >
            <Trash2 className="w-4 h-4 text-red-500" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default FileItemComponent; 