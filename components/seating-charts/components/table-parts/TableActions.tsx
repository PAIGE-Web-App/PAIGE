import React from 'react';
import { TablePosition } from '../../hooks/useTableDrag';

interface TableActionsProps {
  position: TablePosition;
  height: number;
  currentRotation: number;
  tableId: string;
  onCloneTable?: (tableId: string) => void;
  onRotationUpdate?: (tableId: string, rotation: number) => void;
  onRemoveTable?: (tableId: string) => void;
}

/**
 * TableActions - Action buttons for table manipulation
 * 
 * Features:
 * - Clone button (blue, left side)
 * - Rotation handle (purple, center)
 * - Delete button (red, right side)
 * - Shadows for depth
 * - Interactive rotation with mouse drag
 */
export const TableActions: React.FC<TableActionsProps> = ({
  position,
  height,
  currentRotation,
  tableId,
  onCloneTable,
  onRotationUpdate,
  onRemoveTable
}) => {
  const handleRotationMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    console.log('🔄 ROTATION HANDLE CLICKED:', { tableId, onRotationUpdate: !!onRotationUpdate });
    if (onRotationUpdate) {
      // Start rotation dragging
      const startX = e.clientX;
      const startY = e.clientY;
      const startRotation = currentRotation;
      
      console.log('🔄 STARTING ROTATION:', { startX, startY, startRotation });
      
      // Hide rotation handle during rotation
      const rotationHandle = e.currentTarget.parentElement;
      if (rotationHandle) {
        rotationHandle.style.opacity = '0';
      }
      
      const handleMouseMove = (moveEvent: MouseEvent) => {
        const deltaX = moveEvent.clientX - startX;
        const deltaY = moveEvent.clientY - startY;
        
        // Calculate rotation angle based on mouse movement
        const angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);
        const newRotation = (startRotation + angle) % 360;
        
        console.log('🔄 ROTATION UPDATE:', { deltaX, deltaY, angle, newRotation });
        
        // Update rotation in real-time
        onRotationUpdate(tableId, newRotation);
      };
      
      const handleMouseUp = () => {
        console.log('🔄 ROTATION ENDED');
        // Show rotation handle again after rotation
        if (rotationHandle) {
          rotationHandle.style.opacity = '1';
        }
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
      
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    } else {
      console.warn('🔄 NO ROTATION UPDATE FUNCTION PROVIDED');
    }
  };

  return (
    <g>
      {/* Clone Button - positioned to the left */}
      <g>
        {/* Shadow for clone button */}
        <circle
          cx={position.x - 32}
          cy={position.y - height / 2 - 48}
          r={12}
          fill="rgba(0,0,0,0.2)"
          style={{ pointerEvents: 'none' }}
        />
        
        {/* Clone button circle */}
        <circle
          cx={position.x - 30}
          cy={position.y - height / 2 - 50}
          r={12}
          fill="#3b82f6"
          stroke="white"
          strokeWidth={2}
          style={{ cursor: 'pointer' }}
          onMouseDown={(e) => {
            e.stopPropagation();
            e.preventDefault();
            if (onCloneTable) {
              onCloneTable(tableId);
            }
          }}
        />
        
        {/* Clone icon */}
        <text
          x={position.x - 30}
          y={position.y - height / 2 - 50}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={12}
          fill="white"
          fontWeight="bold"
          style={{ pointerEvents: 'none' }}
        >
          ⧉
        </text>
      </g>

      {/* Rotation Handle - positioned at center */}
      <g>
        {/* Shadow for rotation handle */}
        <circle
          cx={position.x + 2}
          cy={position.y - height / 2 - 48}
          r={12}
          fill="rgba(0,0,0,0.2)"
          style={{ pointerEvents: 'none' }}
        />
        
        {/* Rotation handle circle */}
        <circle
          cx={position.x}
          cy={position.y - height / 2 - 50}
          r={15}
          fill="#a855f7"
          stroke="white"
          strokeWidth={3}
          style={{ cursor: 'grab' }}
          onMouseDown={handleRotationMouseDown}
        />
        
        {/* Rotation icon */}
        <text
          x={position.x}
          y={position.y - height / 2 - 50}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={16}
          fill="white"
          fontWeight="bold"
          style={{ pointerEvents: 'none' }}
        >
          ↻
        </text>
      </g>

      {/* Delete Button - positioned to the right */}
      <g>
        {/* Shadow for delete button */}
        <circle
          cx={position.x + 32}
          cy={position.y - height / 2 - 48}
          r={12}
          fill="rgba(0,0,0,0.2)"
          style={{ pointerEvents: 'none' }}
        />
        
        {/* Delete button circle */}
        <circle
          cx={position.x + 30}
          cy={position.y - height / 2 - 50}
          r={12}
          fill="#ef4444"
          stroke="white"
          strokeWidth={2}
          style={{ cursor: 'pointer' }}
          onMouseDown={(e) => {
            e.stopPropagation();
            e.preventDefault();
            if (onRemoveTable) {
              onRemoveTable(tableId);
            }
          }}
        />
        
        {/* Delete icon */}
        <text
          x={position.x + 30}
          y={position.y - height / 2 - 50}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={14}
          fill="white"
          fontWeight="bold"
          style={{ pointerEvents: 'none' }}
        >
          ×
        </text>
      </g>
    </g>
  );
};
