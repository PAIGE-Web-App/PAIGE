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
    tableShape: TableShape,
    tableRotation: number = 0
  ): { width: number; height: number } => {
    if (!resizeState.isResizing || !resizeState.startDimensions || !resizeState.startMousePos) {
      return { width: tableShape.width, height: tableShape.height };
    }

    // Transform mouse deltas to table's local coordinate system based on rotation
    const deltaX = mouseX - resizeState.startMousePos.x;
    const deltaY = mouseY - resizeState.startMousePos.y;
    
    // Convert rotation to radians
    const rotationRad = (tableRotation * Math.PI) / 180;
    const cos = Math.cos(rotationRad);
    const sin = Math.sin(rotationRad);
    
    // Transform deltas to table's local coordinate system
    const localDeltaX = deltaX * cos + deltaY * sin;
    const localDeltaY = -deltaX * sin + deltaY * cos;
    
    let newWidth = resizeState.startDimensions.width;
    let newHeight = resizeState.startDimensions.height;

    if (resizeState.resizeMode === 'corner') {
      // Proportional scaling from corner - handle each direction separately
      if (resizeState.handleType.includes('e')) { // right side
        newWidth = Math.max(60, newWidth + localDeltaX);
      } else if (resizeState.handleType.includes('w')) { // left side
        newWidth = Math.max(60, newWidth - localDeltaX);
      }
      
      if (resizeState.handleType.includes('s')) { // bottom side
        newHeight = Math.max(40, newHeight + localDeltaY);
      } else if (resizeState.handleType.includes('n')) { // top side
        newHeight = Math.max(40, newHeight - localDeltaY);
      }
    } else {
      // Independent width/height adjustment
      switch (resizeState.handleType) {
        case 'n':
          newHeight = Math.max(40, newHeight - localDeltaY);
          break;
        case 's':
          newHeight = Math.max(40, newHeight + localDeltaY);
          break;
        case 'e':
          newWidth = Math.max(60, newWidth + localDeltaX);
          break;
        case 'w':
          newWidth = Math.max(60, newWidth - localDeltaX);
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
