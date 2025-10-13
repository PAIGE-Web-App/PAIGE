import React from 'react';
import { TableType } from '../../../../types/seatingChart';
import { TablePosition } from '../../hooks/useTableDrag';

interface TableShapeProps {
  table: TableType;
  position: TablePosition;
  width: number;
  height: number;
  currentRotation: number;
  isSelected: boolean;
  isHovered: boolean;
  onMouseDown: (e: React.MouseEvent) => void;
  onMouseMove: (e: React.MouseEvent) => void;
  onMouseUp: () => void;
  onMouseEnter: (e: React.MouseEvent) => void;
  onMouseLeave: (e: React.MouseEvent) => void;
  onDoubleClick: () => void;
}

/**
 * TableShape - Renders the table shape (circle or rectangle) with rotation
 * 
 * Features:
 * - Supports round and rectangular tables
 * - Visual states: selected (purple), hovered (gray), default
 * - Rotatable via transform
 * - Drop shadow for depth
 */
export const TableShape: React.FC<TableShapeProps> = ({
  table,
  position,
  width,
  height,
  currentRotation,
  isSelected,
  isHovered,
  onMouseDown,
  onMouseMove,
  onMouseUp,
  onMouseEnter,
  onMouseLeave,
  onDoubleClick
}) => {
  const tableProps = {
    onMouseDown,
    onMouseMove,
    onMouseUp,
    onMouseEnter,
    onMouseLeave,
    onDoubleClick
  };

  return (
    <g transform={`rotate(${currentRotation}, ${position.x}, ${position.y})`}>
      {table.type === 'round' ? (
        <circle
          cx={position.x}
          cy={position.y}
          r={width / 2}
          fill={table.isDefault ? '#fce7f3' : '#f3f4f6'}
          stroke={isSelected ? '#a855f7' : isHovered ? '#a3a3a3' : '#d1d5db'}
          strokeWidth={isSelected ? 3 : isHovered ? 2 : 1}
          filter="drop-shadow(2px 2px 5px rgba(0,0,0,0.1))"
          {...tableProps}
        />
      ) : (
        <rect
          x={position.x - width / 2}
          y={position.y - height / 2}
          width={width}
          height={height}
          fill={table.isDefault ? '#fce7f3' : '#f3f4f6'}
          stroke={isSelected ? '#a855f7' : isHovered ? '#a3a3a3' : '#d1d5db'}
          strokeWidth={isSelected ? 3 : isHovered ? 2 : 1}
          filter="drop-shadow(2px 2px 5px rgba(0,0,0,0.1))"
          {...tableProps}
        />
      )}
    </g>
  );
};
