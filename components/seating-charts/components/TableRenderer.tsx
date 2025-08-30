import React from 'react';
import { TableType, Guest } from '../../../types/seatingChart';
import { TablePosition } from '../hooks/useTableDrag';
import { getTableShape } from '../utils/seatPositionCalculator';

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
  onRemoveGuest
}) => {
  const shape = getTableShape(table.type);
  const customDimensions = tableDimensions?.[table.id];
  const width = customDimensions?.width || shape.width;
  const height = customDimensions?.height || shape.height;
  const seatPositions = shape.seatPositions(table.capacity, width, height);

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
          rx={8}
          ry={8}
          filter="drop-shadow(2px 2px 5px rgba(0,0,0,0.1))"
          {...tableProps}
        />
      )}

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
              // Guest Avatar
              <g>
                {/* Visible avatar circle */}
                <circle
                  cx={position.x + seat.x}
                  cy={position.y + seat.y}
                  r={16}
                  fill="#A85C36"
                  stroke="#A85C36"
                  strokeWidth={2}
                  style={{ cursor: 'pointer' }}
                  onMouseDown={() => {
                    console.log('🎯 Avatar circle mouse down:', table.id, index);
                    if (onAvatarClick) {
                      console.log('✅ Calling onAvatarClick from circle...');
                      onAvatarClick(table.id, index);
                    } else {
                      console.log('❌ onAvatarClick is undefined!');
                    }
                  }}
                  onMouseUp={() => {
                    console.log('🎯 Avatar circle mouse up:', table.id, index);
                  }}
                  onMouseEnter={() => {
                    console.log('🎯 Avatar circle mouse enter:', table.id, index);
                  }}
                  onMouseLeave={() => {
                    console.log('🎯 Avatar circle mouse leave:', table.id, index);
                  }}
                  onClick={() => {
                    console.log('🎯 Avatar circle clicked:', table.id, index);
                    if (onAvatarClick) {
                      console.log('✅ Calling onAvatarClick from circle click...');
                      onAvatarClick(table.id, index);
                    } else {
                      console.log('❌ onAvatarClick is undefined!');
                    }
                  }}
                />
                {/* Guest Initials */}
                <text
                  x={position.x + seat.x}
                  y={position.y + seat.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={12}
                  fontFamily="'Work Sans', sans-serif"
                  fill="white"
                  fontWeight="500"
                  style={{ userSelect: 'none', pointerEvents: 'none' }}
                >
                  {(() => {
                    const assignedGuestId = Object.keys(guestAssignments || {}).find(
                      guestId => guestAssignments![guestId].tableId === table.id && 
                                 guestAssignments![guestId].seatNumber === index
                    );
                    const assignedGuest = guests?.find(g => g.id === assignedGuestId);
                    return assignedGuest ? `${assignedGuest.firstName.charAt(0)}${assignedGuest.lastName.charAt(0)}` : '';
                  })()}
                </text>
                
                {/* Test circle - small red dot to verify SVG events work */}
                <circle
                  cx={position.x + seat.x + 20}
                  cy={position.y + seat.y}
                  r={4}
                  fill="red"
                  stroke="none"
                  style={{ cursor: 'pointer' }}
                  onClick={() => {
                    console.log('🔴 Test circle clicked:', table.id, index);
                  }}
                  onMouseDown={() => {
                    console.log('🔴 Test circle mouse down:', table.id, index);
                  }}
                />

                {/* Action Icons - Move and Remove */}
                {(() => {
                  const actionKey = `${table.id}-${index}`;
                  const shouldShow = showingActions === actionKey;
                  
                  // Only log when there's a potential match or when debugging
                  if (shouldShow || actionKey.includes('sweetheart') || actionKey.includes('table-1756587568260')) {
                    console.log('Checking action icons for:', actionKey, 'shouldShow:', shouldShow, 'showingActions:', showingActions);
                  }
                  
                  if (!shouldShow) return null;
                  
                  const assignedGuestId = Object.keys(guestAssignments || {}).find(
                    guestId => guestAssignments![guestId].tableId === table.id && 
                               guestAssignments![guestId].seatNumber === index
                  );
                  
                  if (!assignedGuestId) {
                    console.log('No guest assigned to this seat:', actionKey);
                    return null;
                  }
                  
                  console.log('Rendering action icons for:', actionKey, 'guest:', assignedGuestId);
                  
                  return (
                    <g>
                      {/* Move Icon - Arrow pointing up (left side) */}
                      <circle
                        cx={position.x + seat.x - 20}
                        cy={position.y + seat.y - 35}
                        r={12}
                        fill="white"
                        stroke="none"
                        style={{ cursor: 'pointer', filter: 'drop-shadow(0px 2px 4px rgba(0,0,0,0.1))' }}
                        onClick={() => onMoveGuest?.(assignedGuestId, table.id, index)}
                      />
                      {/* Simple up arrow */}
                      <line
                        x1={position.x + seat.x - 20}
                        y1={position.y + seat.y - 35 + 4}
                        x2={position.x + seat.x - 20}
                        y2={position.y + seat.y - 35 - 4}
                        stroke="#6b7280"
                        strokeWidth={1.5}
                        style={{ pointerEvents: 'none' }}
                      />
                      <line
                        x1={position.x + seat.x - 23}
                        y1={position.y + seat.y - 35 + 1}
                        x2={position.x + seat.x - 20}
                        y2={position.y + seat.y - 35 - 4}
                        stroke="#6b7280"
                        strokeWidth={1.5}
                        style={{ pointerEvents: 'none' }}
                      />
                      <line
                        x1={position.x + seat.x - 17}
                        y1={position.y + seat.y - 35 + 1}
                        x2={position.x + seat.x - 20}
                        y2={position.y + seat.y - 35 - 4}
                        stroke="#6b7280"
                        strokeWidth={1.5}
                        style={{ pointerEvents: 'none' }}
                      />
                      
                      {/* Remove Icon - X mark (right side) */}
                      <circle
                        cx={position.x + seat.x + 20}
                        cy={position.y + seat.y - 35}
                        r={12}
                        fill="white"
                        stroke="none"
                        style={{ cursor: 'pointer', filter: 'drop-shadow(0px 2px 4px rgba(0,0,0,0.1))' }}
                        onClick={() => onRemoveGuest?.(assignedGuestId, table.id, index)}
                      />
                      {/* Simple X mark */}
                      <line
                        x1={position.x + seat.x + 16}
                        y1={position.y + seat.y - 35 - 4}
                        x2={position.x + seat.x + 24}
                        y2={position.y + seat.y - 35 + 4}
                        stroke="#6b7280"
                        strokeWidth={1.5}
                        style={{ pointerEvents: 'none' }}
                      />
                      <line
                        x1={position.x + seat.x + 24}
                        y1={position.y + seat.y - 35 - 4}
                        x2={position.x + seat.x + 16}
                        y2={position.y + seat.y - 35 + 4}
                        stroke="#6b7280"
                        strokeWidth={1.5}
                        style={{ pointerEvents: 'none' }}
                      />
                    </g>
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

      {/* Resize Handles - Only show when selected */}
      {isSelected && !table.isDefault && (
        <>
          {/* Corner handles for proportional scaling - simple dots with larger hit area */}
          <circle
            cx={position.x - width / 2 - 12}
            cy={position.y - height / 2 - 12}
            r={8}
            fill="none"
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
            cx={position.x + width / 2 + 12}
            cy={position.y - height / 2 - 12}
            r={8}
            fill="none"
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
            cx={position.x + width / 2 + 12}
            cy={position.y + height / 2 + 12}
            r={8}
            fill="none"
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
            cx={position.x - width / 2 - 12}
            cy={position.y + height / 2 + 12}
            r={8}
            fill="none"
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
    </>
  );
};
