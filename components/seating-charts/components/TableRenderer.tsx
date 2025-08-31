import React from 'react';
import { TableType, Guest } from '../../../types/seatingChart';
import { TablePosition } from '../hooks/useTableDrag';
import { getTableShape } from '../utils/seatPositionCalculator';
import { GuestAvatar } from './GuestAvatar';
import { ActionIcons } from './ActionIcons';

interface TableRendererProps {
  table: TableType;
  position: TablePosition;
  isSelected: boolean;
  isHovered: boolean;
  tableDimensions?: Record<string, { width: number; height: number }>;
  onMouseDown: (tableId: string, e: React.MouseEvent) => void;
  onMouseMove: (e: React.MouseEvent) => void;
  onMouseUp: () => void;
  onMouseEnter: (e: React.MouseEvent) => void;
  onMouseLeave: (e: React.MouseEvent) => void;
  onDoubleClick: () => void;
  onResizeStart?: (tableId: string, handleType: string, dimensions: { width: number; height: number }, e: React.MouseEvent) => void;
  onResizeUpdate?: (tableId: string, mouseX: number, mouseY: number) => void;
  onResizeEnd?: () => void;
  profileImageUrl?: string;
  userName?: string;
  partnerName?: string;
  // Guest assignment props
  guestAssignments?: Record<string, { tableId: string; seatNumber: number }>;
  onGuestDrop?: (guestId: string, tableId: string, seatNumber: number) => void;
  guests?: Guest[];
  showingActions?: string | null;
  onAvatarClick?: (tableId: string, seatNumber: number) => void;
  onMoveGuest?: (guestId: string, tableId: string, seatNumber: number) => void;
  onRemoveGuest?: (guestId: string, tableId: string, seatNumber: number) => void;
  getGuestAvatarColor?: (guestId: string) => string;
  onRotationUpdate?: (tableId: string, rotation: number) => void;
}

export const TableRenderer: React.FC<TableRendererProps> = ({
  table,
  position,
  isSelected,
  isHovered,
  tableDimensions,
  onMouseDown,
  onMouseMove,
  onMouseUp,
  onMouseEnter,
  onMouseLeave,
  onDoubleClick,
  onResizeStart,
  onResizeUpdate,
  onResizeEnd,
  profileImageUrl,
  userName,
  partnerName,
  guestAssignments,
  onGuestDrop,
  guests,
  showingActions,
  onAvatarClick,
  onMoveGuest,
  onRemoveGuest,
  getGuestAvatarColor,
  onRotationUpdate
}) => {
  const shape = getTableShape(table.type);
  const customDimensions = tableDimensions?.[table.id];
  const width = customDimensions?.width || shape.width;
  const height = customDimensions?.height || shape.height;
  const currentRotation = table.rotation || 0;
  const seatPositions = shape.seatPositions(table.capacity, width, height, currentRotation);

  const tableProps = {
    onMouseDown: (e: React.MouseEvent) => onMouseDown(table.id, e),
    onMouseMove,
    onMouseUp,
    onMouseEnter,
    onMouseLeave,
    onDoubleClick
  };

  return (
    <>
      {/* Table Shape and Handles Group - Apply rotation to entire group */}
      <g transform={`rotate(${currentRotation}, ${position.x}, ${position.y})`}>
        {/* Table Shape */}
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

        {/* Scaling Handles - Positioned in local coordinates, will rotate with table */}
        {isSelected && !table.isDefault && (
          <>
            {/* Corner handles for proportional scaling - positioned directly on table corners */}
            <circle
              cx={position.x - width / 2}
              cy={position.y - height / 2}
              r={8}
              fill="white"
              stroke="#a855f7"
              strokeWidth={2}
              className="cursor-nw-resize"
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (onResizeStart) {
                  onResizeStart(table.id, 'nw', { width, height }, e);
                }
              }}
            />
            
            <circle
              cx={position.x + width / 2}
              cy={position.y - height / 2}
              r={8}
              fill="white"
              stroke="#a855f7"
              strokeWidth={2}
              className="cursor-ne-resize"
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (onResizeStart) {
                  onResizeStart(table.id, 'ne', { width, height }, e);
                }
              }}
            />
            
            <circle
              cx={position.x + width / 2}
              cy={position.y + height / 2}
              r={8}
              fill="white"
              stroke="#a855f7"
              strokeWidth={2}
              className="cursor-se-resize"
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (onResizeStart) {
                  onResizeStart(table.id, 'se', { width, height }, e);
                }
              }}
            />
            
            <circle
              cx={position.x - width / 2}
              cy={position.y + height / 2}
              r={8}
              fill="white"
              stroke="#a855f7"
              strokeWidth={2}
              className="cursor-sw-resize"
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (onResizeStart) {
                  onResizeStart(table.id, 'sw', { width, height }, e);
                }
              }}
            />
          </>
        )}
      </g>

      {/* Table Name */}
      <text
        x={position.x}
        y={position.y}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={16}
        fontFamily="'Playfair Display', serif"
        fill="#332B42"
        fontWeight="500"
        style={{ 
          userSelect: 'none',
          pointerEvents: 'none'
        }}
      >
        {table.name}
      </text>
      
      {/* Seat Metadata for non-sweetheart tables */}
      {!table.isDefault && (
        <text
          x={position.x}
          y={position.y + 25}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={12}
          fontFamily="'Work Sans', sans-serif"
          fill="#6b7280"
          fontWeight="400"
          style={{ 
            userSelect: 'none',
            pointerEvents: 'none'
          }}
        >
          Seats: [{Object.values(guestAssignments || {}).filter(assignment => assignment.tableId === table.id).length} of {table.capacity} filled]
        </text>
      )}

      {/* Seat Positions */}
      {!table.isDefault && seatPositions.map((seat, index) => {
        const isSeatOccupied = Object.values(guestAssignments || {}).some(
          assignment => assignment.tableId === table.id && assignment.seatNumber === index
        );
        
        return (
          <g key={`${table.id}-seat-${index}`}>
            {/* Seat Circle or Guest Avatar */}
            {isSeatOccupied ? (
              // Guest Avatar with Actions
              <g>
                {(() => {
                  const assignedGuestId = Object.keys(guestAssignments || {}).find(
                    guestId => guestAssignments![guestId].tableId === table.id && 
                               guestAssignments![guestId].seatNumber === index
                  );
                  
                  if (!assignedGuestId) return null;
                  
                  const assignedGuest = guests?.find(g => g.id === assignedGuestId);
                  if (!assignedGuest) return null;
                  
                  return (
                    <>
                      <GuestAvatar
                        guest={assignedGuest}
                        position={{ x: position.x + seat.x, y: position.y + seat.y }}
                        tableId={table.id}
                        seatNumber={index}
                        onAvatarClick={onAvatarClick || (() => {})}
                        getGuestAvatarColor={getGuestAvatarColor || (() => '#A85C36')}
                      />
                      
                      {/* Action Icons - Move and Remove */}
                      {(() => {
                        const actionKey = `${table.id}-${index}`;
                        const shouldShow = showingActions === actionKey;
                        
                        if (!shouldShow) return null;
                        
                        return (
                          <ActionIcons
                            position={{ x: position.x + seat.x, y: position.y + seat.y }}
                            guestId={assignedGuestId}
                            tableId={table.id}
                            seatNumber={index}
                            onMoveGuest={onMoveGuest || (() => {})}
                            onRemoveGuest={onRemoveGuest || (() => {})}
                          />
                        );
                      })()}
                    </>
                  );
                })()}
              </g>
            ) : (
              // Empty Seat Circle
              <circle
                cx={position.x + seat.x}
                cy={position.y + seat.y}
                r={8}
                fill="none"
                stroke="#6b7280"
                strokeWidth={2}
                style={{ cursor: 'default' }}
              />
            )}
            {/* SVG Title for tooltip */}
            <title>{isSeatOccupied ? "Click to remove guest" : "Drop guest here"}</title>
            

            
            {/* Drop Zone - Invisible but droppable */}
            <circle
              cx={position.x + seat.x}
              cy={position.y + seat.y}
              r={12}
              fill="transparent"
              stroke="transparent"
              style={{ cursor: 'pointer' }}
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
                // Add visual feedback for drag over
                e.currentTarget.style.fill = 'rgba(168, 92, 54, 0.1)';
                e.currentTarget.style.stroke = '#A85C36';
                e.currentTarget.style.strokeWidth = '2';
              }}
              onDragLeave={(e) => {
                // Remove visual feedback when drag leaves
                e.currentTarget.style.fill = 'transparent';
                e.currentTarget.style.stroke = 'transparent';
                e.currentTarget.style.strokeWidth = '0';
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                // Remove visual feedback
                e.currentTarget.style.fill = 'transparent';
                e.currentTarget.style.stroke = 'transparent';
                e.currentTarget.style.strokeWidth = '0';
                
                const guestId = e.dataTransfer.getData('text/plain');
                if (guestId && onGuestDrop) {
                  onGuestDrop(guestId, table.id, index);
                }
              }}
            />
          </g>
        );
      })}

      {/* Sweetheart Table Avatars */}
      {table.isDefault && (
        <>
          <circle
            cx={position.x - 50}
            cy={position.y + 50}
            r={16}
            fill="#A85C36"
            filter="drop-shadow(1px 1px 3px rgba(0,0,0,0.2))"
          />
          {profileImageUrl ? (
            <image
              x={position.x - 66}
              y={position.y + 34}
              width={32}
              height={32}
              href={profileImageUrl}
              clipPath="circle(16px at center)"
            />
          ) : (
            <text
              x={position.x - 50}
              y={position.y + 50}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={14}
              fontFamily="var(--font-work-sans)"
              fill="white"
              fontWeight="normal"
              style={{ userSelect: 'none', pointerEvents: 'none' }}
            >
              {userName ? userName.charAt(0).toUpperCase() : 'Y'}
            </text>
          )}
          
          <circle
            cx={position.x + 50}
            cy={position.y + 50}
            r={16}
            fill="#A85C36"
            filter="drop-shadow(1px 1px 3px rgba(0,0,0,0.2))"
          />
          <text
            x={position.x + 50}
            y={position.y + 50}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={14}
            fontFamily="var(--font-work-sans)"
            fill="white"
            fontWeight="normal"
            style={{ userSelect: 'none', pointerEvents: 'none' }}
          >
            {partnerName ? partnerName.charAt(0).toUpperCase() : 'O'}
          </text>
        </>
      )}



      {/* Rotation Handle - Only show when selected */}
      {isSelected && !table.isDefault && (
        <g>
          {/* Shadow for rotation handle */}
          <circle
            cx={position.x + 2}
            cy={position.y - height / 2 - 38}
            r={12}
            fill="rgba(0,0,0,0.2)"
            style={{ pointerEvents: 'none' }}
          />
          
          {/* Rotation handle - bigger circle above the table */}
          <circle
            cx={position.x}
            cy={position.y - height / 2 - 40}
            r={12}
            fill="#a855f7"
            stroke="white"
            strokeWidth={2}
            style={{ cursor: 'grab' }}
                         onMouseDown={(e) => {
               e.stopPropagation();
               if (onRotationUpdate) {
                 // Start rotation dragging
                 const startX = e.clientX;
                 const startY = e.clientY;
                 const startRotation = currentRotation;
                 
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
                   
                   // Update rotation in real-time
                   onRotationUpdate(table.id, newRotation);
                 };
                 
                 const handleMouseUp = () => {
                   // Show rotation handle again after rotation
                   if (rotationHandle) {
                     rotationHandle.style.opacity = '1';
                   }
                   document.removeEventListener('mousemove', handleMouseMove);
                   document.removeEventListener('mouseup', handleMouseUp);
                 };
                 
                 document.addEventListener('mousemove', handleMouseMove);
                 document.addEventListener('mouseup', handleMouseUp);
               }
             }}
          />
          
          {/* Rotation icon - bigger and centered */}
          <text
            x={position.x}
            y={position.y - height / 2 - 40}
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
      )}
    </>
  );
};
