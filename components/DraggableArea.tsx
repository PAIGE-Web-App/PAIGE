import React from 'react';
import { useDragDrop } from './DragDropContext';
import { useExternalFileDrag } from '@/hooks/useExternalFileDrag';
import { FileFolder } from '@/types/files';

interface DraggableAreaProps {
  children: React.ReactNode;
  targetId: string;
  selectedFolder: FileFolder | null;
  className?: string;
  onInternalDrop?: (draggedItem: any) => void;
}

const DraggableArea: React.FC<DraggableAreaProps> = ({
  children,
  targetId,
  selectedFolder,
  className = '',
  onInternalDrop
}) => {
  const { draggedItem, isDragging, dropTarget, setDropTarget, setDraggedItem, setIsDragging } = useDragDrop();
  const { isExternalDragging, handleDragOver, handleDragLeave, handleDrop } = useExternalFileDrag({
    selectedFolder
  });

  const isActive = dropTarget === targetId && (isDragging || isExternalDragging);

  const handleDropWithInternal = (e: React.DragEvent) => {
    handleDrop(e, setDropTarget);
    
    // Clear internal drag state
    setDraggedItem(null);
    setIsDragging(false);
    
    // Handle internal file moves if callback provided
    if (onInternalDrop && draggedItem && draggedItem.type === 'file') {
      onInternalDrop(draggedItem);
    }
  };

  return (
    <div 
      className={`transition-all duration-300 ${
        isActive
          ? 'bg-[#F0EDE8] border-2 border-dashed border-[#A85C36] rounded-[5px] shadow-lg' 
          : 'bg-transparent border-2 border-dashed border-transparent'
      } ${className}`}
      onDragOver={(e) => handleDragOver(e, setDropTarget, targetId)}
      onDragLeave={(e) => handleDragLeave(e, setDropTarget)}
      onDrop={handleDropWithInternal}
    >
      {children}
    </div>
  );
};

export default DraggableArea; 