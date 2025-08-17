import React, { useCallback } from 'react';
import { FileItem, FileFolder } from '@/types/files';
import { Eye, Download, MoreHorizontal, Sparkles, Edit, Trash2 } from 'lucide-react';
import MicroMenu from './MicroMenu';
import { useDragDrop } from './DragDropContext';
import FilePreview from './FilePreview';

interface FileCardProps {
  file: FileItem;
  onDelete: (fileId: string) => void;
  onEdit: (file: FileItem) => void;
  onSelect: (file: FileItem) => void;
  onAnalyze: (file: FileItem) => void;
  isSelected?: boolean;
  folders?: FileFolder[];
}

const FileCard = React.memo(({ file, onDelete, onEdit, onSelect, onAnalyze, isSelected, folders = [] }: FileCardProps) => {
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

  const handleCardClick = useCallback((e: React.MouseEvent) => {
    // Don't trigger if clicking on interactive elements
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('input') || target.closest('a')) {
      return;
    }
    
    onSelect(file);
  }, [onSelect, file]);

  const handleCardDoubleClick = useCallback((e: React.MouseEvent) => {
    // Don't trigger if clicking on interactive elements
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('input') || target.closest('a')) {
      return;
    }
    
    onAnalyze(file);
  }, [onAnalyze, file]);

  const handleViewClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(file.fileUrl, '_blank');
  }, [file.fileUrl]);

  const handleDownloadClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const link = document.createElement('a');
    link.href = file.fileUrl;
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [file.fileUrl, file.name]);

  const handleDragStart = useCallback((e: React.DragEvent) => {
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
  }, [file, setDraggedItem, setIsDragging]);

  const handleDragEnd = useCallback(() => {
    setDraggedItem(null);
    setIsDragging(false);
  }, [setDraggedItem, setIsDragging]);

  return (
    <div 
      className={`group bg-white border rounded-[5px] p-4 flex flex-col items-start relative h-full min-h-[320px] cursor-pointer hover:shadow-lg hover:shadow-gray-300/50 transition-all duration-200 hover:-translate-y-1 ${
        isSelected ? 'border-[#A85C36] border-2' : 'border-[#E0DBD7]'
      } ${isThisFileDragging ? 'opacity-40' : ''}`}
      onClick={handleCardClick}
      onDoubleClick={handleCardDoubleClick}
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      {/* File Preview */}
      <div className="w-full min-h-[128px] h-32 bg-[#F3F2F0] rounded mb-2 flex items-center justify-center overflow-hidden">
        <FilePreview 
          fileType={file.fileType}
          fileUrl={file.fileUrl}
          fileName={file.name}
          className="w-full h-full"
        />
      </div>
      
      <div className="flex-1 w-full flex flex-col justify-between">
        <div>
          {/* File Name */}
          <h5 className="mb-1" style={{ fontFamily: 'Playfair Display, serif', fontWeight: 500, fontSize: '1.125rem', lineHeight: 1.5, color: '#332B42' }}>
            {file.name}
          </h5>
          
          {/* File Description */}
          {file.description && (
            <p className="text-xs text-[#332B42] mb-2 line-clamp-2">
              {file.description}
            </p>
          )}
          
          {/* File Metadata */}
          <div className="flex items-center gap-1 text-xs mb-1">
            <span className="text-[#A85C36] font-medium">{formatFileSize(file.fileSize)}</span>
            <span className="text-[#332B42]">•</span>
            <span className="text-[#332B42]">{file.uploadedAt.toLocaleDateString()}</span>
          </div>
          
          {/* Folder Badge */}
          <div className="flex items-center gap-1 text-xs text-[#AB9C95] mb-2">
            <span>📁 {getFolderName(file.folderId)}</span>
          </div>
          
          {/* AI Analysis Status */}
          {file.isProcessed && (
            <div className="space-y-2 mb-2">
              {file.aiSummary && (
                <div className="bg-green-50 border border-green-200 rounded-[5px] p-2">
                  <h4 className="text-xs font-medium text-green-800 mb-1">AI Summary</h4>
                  <p className="text-xs text-green-700 line-clamp-2">
                    {file.aiSummary}
                  </p>
                </div>
              )}
              
              {file.keyPoints && file.keyPoints.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-[5px] p-2">
                  <h4 className="text-xs font-medium text-blue-800 mb-1">Key Points</h4>
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
            <div className="bg-yellow-50 border border-yellow-200 rounded-[5px] p-2 mb-2">
              <p className="text-xs text-yellow-700">AI analysis in progress...</p>
            </div>
          )}
        </div>
      </div>
      
      {/* Action Buttons - Hidden by default, shown on hover */}
      <div className="flex gap-2 w-full mt-auto md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-200">
        <button 
          className="btn-primaryinverse flex-1" 
          onClick={handleViewClick}
        >
          <Eye className="w-4 h-4 mr-1" />
          View
        </button>
        <button 
          className="btn-primary flex-1" 
          onClick={handleDownloadClick}
        >
          <Download className="w-4 h-4 mr-1" />
          Download
        </button>
      </div>
      
      {/* Micro Menu - Top Right */}
      <div className="absolute top-2 right-2 z-10">
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
});

FileCard.displayName = 'FileCard';

export default FileCard; 