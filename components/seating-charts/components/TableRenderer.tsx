import React from 'react';
import { TableType, Guest } from '../../../types/seatingChart';
import { TablePosition } from '../hooks/useTableDrag';
import { getTableShape } from '../utils/seatPositionCalculator';
import { GuestAvatar } from './GuestAvatar';
import { ActionIcons } from './ActionIcons';
import { CirclePlus } from 'lucide-react';
import { GuestAssignment } from '../hooks/useGuestManagement';

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
  guestAssignments?: Record<string, GuestAssignment>;
  onGuestDrop?: (guestId: string, tableId: string, seatIndex: number) => void;
  guests?: Guest[];
  showingActions?: string | null;
  onAvatarClick?: (tableId: string, seatNumber: number) => void;
  onMoveGuest?: (guestId: string, tableId: string, position: { x: number; y: number }) => void;
  onRemoveGuest?: (guestId: string, tableId: string, position: { x: number; y: number }) => void;
  getGuestAvatarColor?: (guestId: string) => string;
  onRotationUpdate?: (tableId: string, rotation: number) => void;
  onGuestSwap?: (guestId: string, sourceTableId: string, sourceSeatIndex: number, targetTableId: string, targetSeatIndex: number) => void;
  onRemoveTable?: (tableId: string) => void;
  onCloneTable?: (tableId: string) => void;
  highlightedGuest?: string | null;
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
  onRotationUpdate,
  onGuestSwap,
  onRemoveTable,
  onCloneTable,
  highlightedGuest
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
      <defs>
        <clipPath id="avatarClip">
          <circle cx="0" cy="0" r="16"/>
        </clipPath>
      </defs>
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
        const seatPosition = { x: position.x + seat.x, y: position.y + seat.y };
        
        
        const isSeatOccupied = Object.values(guestAssignments || {}).some(
          assignment => assignment.tableId === table.id && assignment.seatIndex === index
        );
        
        
        return (
          <g key={`${table.id}-seat-${index}`}>
            {/* Seat Circle or Guest Avatar */}
            {isSeatOccupied ? (
              // Guest Avatar with Actions
              <g>
                {(() => {
                  const assignedGuestId = Object.keys(guestAssignments || {}).find(
                    guestId => {
                      const assignment = guestAssignments![guestId];
                      return assignment.tableId === table.id && assignment.seatIndex === index;
                    }
                  );
                  
                  if (!assignedGuestId) return null;
                  
                  const assignedGuest = guests?.find(g => g.id === assignedGuestId);
                  if (!assignedGuest) return null;
                  
                  return (
                    <>
                      <GuestAvatar
                        guest={assignedGuest}
                        position={seatPosition}
                        tableId={table.id}
                        seatNumber={index + 1}
                        onAvatarClick={onAvatarClick || (() => {})}
                        getGuestAvatarColor={getGuestAvatarColor || (() => '#A85C36')}
                        isHighlighted={highlightedGuest === assignedGuestId}
                      />
                      
                      {/* Action Icons - Move and Remove */}
                      {(() => {
                        const actionKey = `${table.id}-${index + 1}`;
                        const shouldShow = showingActions === actionKey;
                        
                        if (!shouldShow) return null;
                        
                        return (
                          <ActionIcons
                            position={seatPosition}
                            guestId={assignedGuestId}
                            tableId={table.id}
                            seatNumber={index + 1}
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
                // Empty Seat with CirclePlus icon
                <g>
                  <foreignObject
                    x={position.x + seat.x - 10}
                    y={position.y + seat.y - 10}
                    width={20}
                    height={20}
                    style={{ cursor: 'default' }}
                  >
                    <CirclePlus
                      size={20}
                      className="empty-seat"
                      stroke="#6b7280"
                      strokeWidth={1.5}
                      fill="none"
                    />
                  </foreignObject>
                </g>
              )}
            {/* SVG Title for tooltip */}
            <title>{isSeatOccupied ? "Click to remove guest" : "Drop guest here"}</title>
            
            {/* Drop Zones - Dynamic: 4px at rest (no click interference), expands to 20px during drag (easy targeting) */}
            <circle
              cx={seatPosition.x}
              cy={seatPosition.y}
              r={isSeatOccupied ? 4 : 12}
              fill="transparent"
              stroke="transparent"
              style={{ 
                cursor: isSeatOccupied ? 'default' : 'pointer',
                pointerEvents: 'auto'
              }}
              onDragOver={(e) => {
                // Expand drop zone during drag for easier targeting (5x larger for occupied seats)
                e.currentTarget.setAttribute('r', isSeatOccupied ? '20' : '12');
                e.preventDefault();
                e.stopPropagation();
                
                // Different visual feedback based on seat status
                if (isSeatOccupied) {
                  // Blue highlight for guest swap
                  e.currentTarget.style.fill = 'rgba(59, 130, 246, 0.15)';
                  e.currentTarget.style.stroke = '#3b82f6';
                  e.currentTarget.style.strokeWidth = '2';
                } else {
                  // Green highlight for empty seat assignment
                  e.currentTarget.style.fill = 'rgba(34, 197, 94, 0.15)';
                  e.currentTarget.style.stroke = '#22c55e';
                  e.currentTarget.style.strokeWidth = '2';
                    
                    // Also highlight the empty seat CirclePlus icon
                    const seatGroup = e.currentTarget.parentElement;
                    if (seatGroup) {
                      // Look for the CirclePlus icon in the same seat group
                      const emptySeatIcon = seatGroup.querySelector('.empty-seat') as HTMLElement;
                      if (emptySeatIcon) {
                        emptySeatIcon.style.stroke = '#22c55e';
                        emptySeatIcon.style.strokeWidth = '2.5';
                        emptySeatIcon.style.fill = 'rgba(34, 197, 94, 0.1)';
                      } else {
                        // Fallback: try to find any CirclePlus icon in the seat area
                        const allIcons = seatGroup.querySelectorAll('svg, .empty-seat');
                        allIcons.forEach(icon => {
                          if (icon instanceof HTMLElement) {
                            icon.style.stroke = '#22c55e';
                            icon.style.strokeWidth = '2.5';
                            icon.style.fill = 'rgba(34, 197, 94, 0.1)';
                          }
                        });
                      }
                    }
                  }
                }}
              onDragLeave={(e) => {
                // Shrink drop zone back to original size
                e.currentTarget.setAttribute('r', isSeatOccupied ? '4' : '12');
                // Remove visual feedback when drag leaves
                e.currentTarget.style.fill = 'transparent';
                e.currentTarget.style.stroke = 'transparent';
                e.currentTarget.style.strokeWidth = '0';
                
                // Also reset the empty seat CirclePlus icon styling
                const seatGroup = e.currentTarget.parentElement;
                if (seatGroup) {
                  // Look for the CirclePlus icon in the same seat group
                  const emptySeatIcon = seatGroup.querySelector('.empty-seat') as HTMLElement;
                  if (emptySeatIcon) {
                    emptySeatIcon.style.fill = 'none';
                    emptySeatIcon.style.stroke = '#6b7280';
                    emptySeatIcon.style.strokeWidth = '1.5';
                  } else {
                    // Fallback: reset any CirclePlus icon in the seat area
                    const allIcons = seatGroup.querySelectorAll('svg, .empty-seat');
                    allIcons.forEach(icon => {
                      if (icon instanceof HTMLElement) {
                        icon.style.fill = 'none';
                        icon.style.stroke = '#6b7280';
                        icon.style.strokeWidth = '1.5';
                      }
                    });
                  }
                }
              }}
              onDrop={(e) => {
                // Shrink drop zone back to original size
                e.currentTarget.setAttribute('r', isSeatOccupied ? '4' : '12');
                e.preventDefault();
                e.stopPropagation();
                // Remove visual feedback
                e.currentTarget.style.fill = 'transparent';
                e.currentTarget.style.stroke = 'transparent';
                e.currentTarget.style.strokeWidth = '0';
                
                // Also reset the empty seat CirclePlus icon styling
                const seatGroup = e.currentTarget.parentElement;
                if (seatGroup) {
                  // Look for the CirclePlus icon in the same seat group
                  const emptySeatIcon = seatGroup.querySelector('.empty-seat') as HTMLElement;
                  if (emptySeatIcon) {
                    emptySeatIcon.style.fill = 'none';
                    emptySeatIcon.style.stroke = '#6b7280';
                    emptySeatIcon.style.strokeWidth = '1.5';
                  } else {
                    // Fallback: reset any CirclePlus icon in the seat area
                    const allIcons = seatGroup.querySelectorAll('svg, .empty-seat');
                    allIcons.forEach(icon => {
                      if (icon instanceof HTMLElement) {
                        icon.style.fill = 'none';
                        icon.style.stroke = '#6b7280';
                        icon.style.strokeWidth = '1.5';
                      }
                    });
                  }
                }
                
                const dragData = e.dataTransfer.getData('text/plain');
                if (!dragData) return;
                
                try {
                  // Try to parse as JSON (from seated avatar)
                  const parsedData = JSON.parse(dragData);
                  if (parsedData.isFromSeat) {
                    // Guest is being moved from another seat
                    if (onGuestSwap) {
                      onGuestSwap(parsedData.guestId, parsedData.sourceTableId, parsedData.sourceSeatIndex || 0, table.id, index);
                    }
                  } else {
                    // Fallback to regular guest drop
                    if (onGuestDrop) {
                      onGuestDrop(parsedData.guestId, table.id, index);
                    }
                  }
                } catch (error) {
                  // Fallback: treat as plain guest ID (from sidebar)
                  if (onGuestDrop) {
                    onGuestDrop(dragData, table.id, index);
                  }
                }
              }}
            />
          </g>
        );
      })}

      {/* Sweetheart Table Avatars */}
      {table.isDefault && (
        <>
          {/* First seat (left side) */}
          <circle
            cx={position.x - 50}
            cy={position.y + 50}
            r={16}
            fill="#A85C36"
            filter="drop-shadow(1px 1px 3px rgba(0,0,0,0.2))"
          />
          {(() => {
            // For sweetheart table, show profile image or initials
        if (profileImageUrl) {
              return (
                <g>
                  <defs>
                    <clipPath id={`avatarClip-${table.id}`}>
                      <circle cx={position.x - 50} cy={position.y + 50} r={16}/>
                    </clipPath>
                  </defs>
                  <image
                    x={position.x - 50 - 16}
                    y={position.y + 50 - 16}
                    width={32}
                    height={32}
                    href={profileImageUrl}
                    clipPath={`url(#avatarClip-${table.id})`}
                    style={{ userSelect: 'none', pointerEvents: 'none' }}
                onLoad={() => {}}
                onError={(e) => {}}
                  />
                  {/* Fallback: show initials if image fails to load */}
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
                    opacity={0.3}
                  >
                    {userName ? userName.charAt(0).toUpperCase() : 'Y'}
                  </text>
                </g>
              );
        } else {
              return (
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
              );
            }
          })()}
          
          {/* Second seat (right side) */}
          <circle
            cx={position.x + 50}
            cy={position.y + 50}
            r={16}
            fill="#A85C36"
            filter="drop-shadow(1px 1px 3px rgba(0,0,0,0.2))"
          />
          {(() => {
            // For sweetheart table, show partner initials
            return (
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
            );
          })()}
        </>
      )}



      {/* Clone, Rotation, and Delete Buttons - Only show when selected */}
      {isSelected && (
        <g>
          {/* Clone Button - positioned to the left (only for non-default tables) */}
          {!table.isDefault && (
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
                // Trigger table cloning
                if (onCloneTable) {
                  onCloneTable(table.id);
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
          )}

          {/* Rotation and Delete buttons (only for non-default tables) */}
          {!table.isDefault && (
          <>
            {/* Shadow for rotation handle */}
            <circle
              cx={position.x + 2}
              cy={position.y - height / 2 - 48}
              r={12}
              fill="rgba(0,0,0,0.2)"
              style={{ pointerEvents: 'none' }}
            />
            
            {/* Rotation handle - bigger circle above the table */}
          <circle
            cx={position.x}
            cy={position.y - height / 2 - 50}
            r={15}
            fill="#a855f7"
            stroke="white"
            strokeWidth={3}
            style={{ cursor: 'grab' }}
            opacity={isSelected ? 1 : 0.8}
                         onMouseDown={(e) => {
               e.stopPropagation();
               console.log('🔄 ROTATION HANDLE CLICKED:', { tableId: table.id, onRotationUpdate: !!onRotationUpdate });
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
                   onRotationUpdate(table.id, newRotation);
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
             }}
          />
          
          {/* Rotation icon - bigger and centered */}
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
          
          {/* Delete Button - positioned to the right of rotation handle */}
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
                // Trigger table deletion
                if (onRemoveTable) {
                  onRemoveTable(table.id);
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
          </>
          )}
        </g>
      )}
    </>
  );
};
