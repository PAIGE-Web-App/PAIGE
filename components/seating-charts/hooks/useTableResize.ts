import { useState, useCallback } from 'react';
import { TableType } from '../../../types/seatingChart';
import { TableShape } from '../utils/seatPositionCalculator';

export interface ResizeState {
  isResizing: boolean;
  resizeMode: 'corner' | 'side' | null;
  handleType: string | null;
  startDimensions: { width: number; height: number } | null;
  startMousePos: { x: number; y: number } | null;
}

export const useTableResize = () => {
  const [resizeState, setResizeState] = useState<ResizeState>({
    isResizing: false,
    resizeMode: null,
    handleType: null,
    startDimensions: null,
    startMousePos: null
  });

  const startResize = useCallback((
    handleType: string,
    startDimensions: { width: number; height: number },
    mouseX: number,
    mouseY: number
  ) => {
    const isCorner = handleType.includes('nw') || handleType.includes('ne') || 
                     handleType.includes('se') || handleType.includes('sw');
    
    setResizeState({
      isResizing: true,
      resizeMode: isCorner ? 'corner' : 'side',
      handleType,
      startDimensions,
      startMousePos: { x: mouseX, y: mouseY }
    });
  }, []);

  const updateResize = useCallback((
    mouseX: number,
    mouseY: number,
    tableShape: TableShape
  ): { width: number; height: number } => {
    if (!resizeState.isResizing || !resizeState.startDimensions || !resizeState.startMousePos) {
      return { width: tableShape.width, height: tableShape.height };
    }

    const deltaX = mouseX - resizeState.startMousePos.x;
    const deltaY = mouseY - resizeState.startMousePos.y;
    
    let newWidth = resizeState.startDimensions.width;
    let newHeight = resizeState.startDimensions.height;

    if (resizeState.resizeMode === 'corner') {
      // Proportional scaling from corner - handle each direction separately
      if (resizeState.handleType.includes('e')) { // right side
        newWidth = Math.max(20, newWidth + deltaX);
      } else if (resizeState.handleType.includes('w')) { // left side
        newWidth = Math.max(20, newWidth - deltaX);
      }
      
      if (resizeState.handleType.includes('s')) { // bottom side
        newHeight = Math.max(20, newHeight + deltaY);
      } else if (resizeState.handleType.includes('n')) { // top side
        newHeight = Math.max(20, newHeight - deltaY);
      }
    } else {
      // Independent width/height adjustment
      switch (resizeState.handleType) {
        case 'n':
          newHeight = Math.max(20, newHeight - deltaY);
          break;
        case 's':
          newHeight = Math.max(20, newHeight + deltaY);
          break;
        case 'e':
          newWidth = Math.max(20, newWidth + deltaX);
          break;
        case 'w':
          newWidth = Math.max(20, newWidth - deltaX);
          break;
      }
    }

    return { width: newWidth, height: newHeight };
  }, [resizeState]);

  const stopResize = useCallback(() => {
    setResizeState({
      isResizing: false,
      resizeMode: null,
      handleType: null,
      startDimensions: null,
      startMousePos: null
    });
  }, []);

  return {
    resizeState,
    startResize,
    updateResize,
    stopResize
  };
};
