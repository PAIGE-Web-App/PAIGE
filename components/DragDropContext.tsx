import React, { createContext, useContext, useState, ReactNode } from 'react';
import { FileItem, FileFolder } from '@/types/files';

interface DragItem {
  type: 'file' | 'folder';
  item: FileItem | FileFolder;
}

interface DragDropContextType {
  draggedItem: DragItem | null;
  setDraggedItem: (item: DragItem | null) => void;
  isDragging: boolean;
  setIsDragging: (dragging: boolean) => void;
  dropTarget: string | null;
  setDropTarget: (target: string | null) => void;
}

const DragDropContext = createContext<DragDropContextType | undefined>(undefined);

export const useDragDrop = () => {
  const context = useContext(DragDropContext);
  if (!context) {
    throw new Error('useDragDrop must be used within a DragDropProvider');
  }
  return context;
};

interface DragDropProviderProps {
  children: ReactNode;
}

export const DragDropProvider: React.FC<DragDropProviderProps> = ({ children }) => {
  const [draggedItem, setDraggedItem] = useState<DragItem | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dropTarget, setDropTarget] = useState<string | null>(null);

  return (
    <DragDropContext.Provider
      value={{
        draggedItem,
        setDraggedItem,
        isDragging,
        setIsDragging,
        dropTarget,
        setDropTarget,
      }}
    >
      {children}
    </DragDropContext.Provider>
  );
}; 