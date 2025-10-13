import React from 'react';
import { TablePosition } from '../../hooks/useTableDrag';

interface TableHandlesProps {
  position: TablePosition;
  width: number;
  height: number;
  currentRotation: number;
  tableId: string;
  onResizeStart?: (tableId: string, handleType: string, dimensions: { width: number; height: number }, e: React.MouseEvent) => void;
}

/**
 * TableHandles - Resize handles for table scaling
 * 
 * Features:
 * - 4 corner handles (NW, NE, SE, SW)
 * - Positioned on table corners
 * - Rotate with table
 * - Visual feedback on hover
 */
export const TableHandles: React.FC<TableHandlesProps> = ({
  position,
  width,
  height,
  currentRotation,
  tableId,
  onResizeStart
}) => {
  const handleMouseDown = (handleType: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onResizeStart) {
      onResizeStart(tableId, handleType, { width, height }, e);
    }
  };

  return (
    <g transform={`rotate(${currentRotation}, ${position.x}, ${position.y})`}>
      {/* Northwest handle */}
      <circle
        cx={position.x - width / 2}
        cy={position.y - height / 2}
        r={8}
        fill="white"
        stroke="#a855f7"
        strokeWidth={2}
        className="cursor-nw-resize"
        onMouseDown={(e) => handleMouseDown('nw', e)}
      />
      
      {/* Northeast handle */}
      <circle
        cx={position.x + width / 2}
        cy={position.y - height / 2}
        r={8}
        fill="white"
        stroke="#a855f7"
        strokeWidth={2}
        className="cursor-ne-resize"
        onMouseDown={(e) => handleMouseDown('ne', e)}
      />
      
      {/* Southeast handle */}
      <circle
        cx={position.x + width / 2}
        cy={position.y + height / 2}
        r={8}
        fill="white"
        stroke="#a855f7"
        strokeWidth={2}
        className="cursor-se-resize"
        onMouseDown={(e) => handleMouseDown('se', e)}
      />
      
      {/* Southwest handle */}
      <circle
        cx={position.x - width / 2}
        cy={position.y + height / 2}
        r={8}
        fill="white"
        stroke="#a855f7"
        strokeWidth={2}
        className="cursor-sw-resize"
        onMouseDown={(e) => handleMouseDown('sw', e)}
      />
    </g>
  );
};
