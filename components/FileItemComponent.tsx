import React from 'react';
import { FileItem } from '@/types/files';
import { FileText, MoreHorizontal, Download, Eye, Trash2, Edit } from 'lucide-react';
import { useDragDrop } from './DragDropContext';

interface FileItemComponentProps {
  file: FileItem;
  onDelete: (fileId: string) => void;
  onEdit: (file: FileItem) => void;
  onSelect: (file: FileItem) => void;
  isSelected?: boolean;
  viewMode?: 'list' | 'grid';
}

const FileItemComponent: React.FC<FileItemComponentProps> = ({ file, onDelete, onEdit, onSelect, isSelected, viewMode = 'grid' }) => {
  const { setDraggedItem, setIsDragging } = useDragDrop();
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
        }`}
        onClick={() => onSelect(file)}
        draggable
        onDragStart={(e) => {
          setDraggedItem({ type: 'file', item: file });
          setIsDragging(true);
          e.dataTransfer.effectAllowed = 'move';
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
              <span className="px-2 py-1 bg-[#F8F6F4] rounded-[3px]">
                {file.category}
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
      }`}
      onClick={() => onSelect(file)}
      draggable
      onDragStart={(e) => {
        setDraggedItem({ type: 'file', item: file });
        setIsDragging(true);
        e.dataTransfer.effectAllowed = 'move';
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
              <span className="inline-block px-2 py-1 bg-[#F8F6F4] text-xs text-[#332B42] rounded-[3px]">
                {file.category}
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