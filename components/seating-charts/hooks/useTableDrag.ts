import { useState, useCallback, useEffect } from 'react';

export interface TablePosition {
  id: string;
  x: number;
  y: number;
  rotation: number;
}

export interface DragOffset {
  x: number;
  y: number;
}

export const useTableDrag = (
  tablePositions: TablePosition[], 
  setTablePositions: (positions: TablePosition[]) => void,
  onTableMoved?: (tableId: string, oldPosition: TablePosition, newPosition: TablePosition) => void
) => {
  const [draggedTable, setDraggedTable] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<DragOffset>({ x: 0, y: 0 });

  const handleTableMouseDown = useCallback((tableId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const currentPos = tablePositions.find(p => p.id === tableId);
    if (!currentPos) return;
    
    const offsetX = e.clientX - currentPos.x;
    const offsetY = e.clientY - currentPos.y;
    
    setDraggedTable(tableId);
    setDragOffset({ x: offsetX, y: offsetY });
  }, [tablePositions]);

  const handleTableMouseUp = useCallback(() => {
    setDraggedTable(null);
    setDragOffset({ x: 0, y: 0 });
  }, []);

  // Global mouse move handler for table dragging
  useEffect(() => {
    let animationFrameId: number;
    
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (draggedTable) {
        if (animationFrameId) {
          cancelAnimationFrame(animationFrameId);
        }
        
        animationFrameId = requestAnimationFrame(() => {
          const newPositions = tablePositions.map(pos => {
            if (pos.id === draggedTable) {
              const newX = e.clientX - dragOffset.x;
              const newY = e.clientY - dragOffset.y;
              
              const oldPosition = { ...pos };
              const newPosition = {
                ...pos,
                x: newX,
                y: newY
              };
              
              // Call the callback to update guest assignments
              if (onTableMoved) {
                onTableMoved(draggedTable, oldPosition, newPosition);
              }
              
              return newPosition;
            }
            return pos;
          });
          setTablePositions(newPositions);
        });
      }
    };

    const handleGlobalMouseUp = () => {
      if (draggedTable) {
        if (animationFrameId) {
          cancelAnimationFrame(animationFrameId);
        }
        handleTableMouseUp();
      }
    };

    if (draggedTable) {
      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);
    }

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [draggedTable, dragOffset, tablePositions, setTablePositions, handleTableMouseUp]);

  return {
    draggedTable,
    handleTableMouseDown,
    handleTableMouseUp
  };
};
