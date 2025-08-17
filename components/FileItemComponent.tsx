import React from 'react';
import { FileItem, FileFolder } from '@/types/files';
import { FileText, MoreHorizontal, Download, Eye, Trash2, Edit, Sparkles } from 'lucide-react';
import MicroMenu from './MicroMenu';
import { useDragDrop } from './DragDropContext';
import FilePreview from './FilePreview';
import UserAvatar from './UserAvatar';
import { useAuth } from '@/contexts/AuthContext';
import { getAssigneeAvatarColor, getRoleBasedAvatarColor } from '@/utils/assigneeAvatarColors';

interface FileItemComponentProps {
  file: FileItem;
  onDelete: (fileId: string) => void;
  onEdit: (file: FileItem) => void;
  onSelect: (file: FileItem) => void;
  onAnalyze: (file: FileItem) => void;
  isSelected?: boolean;
  viewMode?: 'list' | 'grid';
  folders?: FileFolder[];
}

const FileItemComponent: React.FC<FileItemComponentProps> = ({ file, onDelete, onEdit, onSelect, onAnalyze, isSelected, viewMode, folders = [] }) => {
  const { setDraggedItem, setIsDragging, draggedItem, isDragging } = useDragDrop();
  const { profileImageUrl } = useAuth();
  
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

  // List view layout - Proper table row structure
  if (viewMode === 'list') {
    return (
      <div 
        className={`grid grid-cols-12 gap-0.5 p-2 border-b border-[#E0DBD7] last:border-b-0 hover:bg-[#F8F6F4] transition-colors group cursor-pointer ${
          isSelected 
            ? 'bg-[#F8F6F4] border-[#A85C36]' 
            : 'bg-white'
        } ${isThisFileDragging ? 'opacity-40' : ''}`}

        onClick={() => onSelect(file)}
        onDoubleClick={() => onAnalyze(file)}
        draggable
        onDragStart={(e) => {
          setDraggedItem({ type: 'file', item: file });
          setIsDragging(true);
          e.dataTransfer.effectAllowed = 'move';
          e.dataTransfer.setData('text/plain', file.id);
          
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
        {/* File Name */}
        <div className="col-span-3 flex items-center">
          <div className="text-sm font-medium text-[#332B42] truncate max-w-full">{file.name}</div>
        </div>

        {/* Preview/File Type */}
        <div className="col-span-1 flex items-center">
          {file.fileType.toLowerCase().includes('image') ? (
            <div className="w-10 h-10 bg-[#F8F6F4] rounded-[3px] flex items-center justify-center flex-shrink-0">
              <img 
                src={file.fileUrl} 
                alt={file.name}
                className="w-10 h-10 object-cover rounded-[3px]"
                onError={(e) => {
                  // Fallback to file icon if image fails to load
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.nextElementSibling?.classList.remove('hidden');
                }}
              />
              <div className="w-10 h-10 bg-[#F8F6F4] rounded-[3px] flex items-center justify-center flex-shrink-0 hidden">
                {getFileIcon(file.fileType)}
              </div>
            </div>
          ) : (
            <span className="text-sm text-[#AB9C95] uppercase">{file.fileType.split('/')[1] || file.fileType}</span>
          )}
        </div>

        {/* File Size */}
        <div className="col-span-2 flex items-center">
          <span className="text-sm text-[#A85C36] font-medium">{formatFileSize(file.fileSize)}</span>
        </div>

        {/* Folder */}
        <div className="col-span-2 flex items-center">
          <span className="text-sm text-[#AB9C95] truncate">{getFolderName(file.folderId)}</span>
        </div>

        {/* Upload Date */}
        <div className="col-span-2 flex items-center">
          <span className="text-sm text-[#AB9C95]">{file.uploadedAt.toLocaleDateString()}</span>
        </div>

        {/* Uploaded By - User Avatar */}
        <div className="col-span-1 flex items-center justify-center">
          <UserAvatar
            userId={file.userId}
            userName={file.userId ? 'You' : 'Unknown User'}
            profileImageUrl={profileImageUrl}
            size="sm"
            showTooltip={true}
            avatarColor={file.userId ? getRoleBasedAvatarColor('user') : getAssigneeAvatarColor('unknown')}
          />
        </div>

        {/* Actions */}
        <div className="col-span-1 flex items-center justify-center">
          <MicroMenu
            items={[
              {
                label: 'Analyze with Paige',
                icon: <Sparkles className="w-4 h-4" />,
                onClick: () => onAnalyze(file)
              },
              {
                label: 'Edit',
                icon: <Edit className="w-4 h-4" />,
                onClick: () => onEdit(file)
              },
              {
                label: 'Delete',
                icon: <Trash2 className="w-4 h-4" />,
                onClick: () => onDelete(file.id),
                className: 'text-red-600 hover:bg-red-50'
              }
            ]}
            buttonClassName="p-1.5 hover:bg-[#F8F6F4] rounded-full transition-colors"
            menuClassName="absolute right-0 mt-1 w-48 bg-white border border-[#E0DBD7] rounded-[5px] shadow-lg z-10"
          />
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
      onDoubleClick={() => onAnalyze(file)}
      draggable
      onDragStart={(e) => {
        setDraggedItem({ type: 'file', item: file });
        setIsDragging(true);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', file.id);
        
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
      <div className="space-y-3">
        {/* File Preview */}
        <FilePreview 
          fileType={file.fileType}
          fileUrl={file.fileUrl}
          fileName={file.name}
          className="w-full h-32"
        />

        {/* File Details */}
        <div className="space-y-2">
          <h5 className="font-medium text-[#332B42] truncate">{file.name}</h5>
          
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
              window.open(file.fileUrl, '_blank');
            }}
            className="p-2 hover:bg-[#F8F6F4] rounded-[5px] transition-colors"
            title="View file"
          >
            <Eye className="w-4 h-4 text-[#AB9C95]" />
          </button>
          
          <MicroMenu
            items={[
              {
                label: 'Analyze with Paige',
                icon: <Sparkles className="w-4 h-4" />,
                onClick: () => onAnalyze(file)
              },
              {
                label: 'Edit',
                icon: <Edit className="w-4 h-4" />,
                onClick: () => onEdit(file)
              },
              {
                label: 'Delete',
                icon: <Trash2 className="w-4 h-4" />,
                onClick: () => onDelete(file.id),
                className: 'text-red-600 hover:bg-red-50'
              }
            ]}
            buttonClassName="p-2 hover:bg-[#F8F6F4] rounded-[5px]"
            menuClassName="absolute right-0 mt-1 w-48 bg-white border border-[#E0DBD7] rounded-[5px] shadow-lg z-10"
          />
        </div>
      </div>
    </div>
  );
};

export default FileItemComponent; 