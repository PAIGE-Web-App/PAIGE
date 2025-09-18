import React from 'react';
import { TableType, Guest } from '../../../types/seatingChart';
import { TablePosition } from '../hooks/useTableDrag';
import { CanvasTransform } from '../hooks/useCanvasPanZoom';
import { TableRenderer } from './TableRenderer';
import { GuestAssignment } from '../hooks/useGuestManagement';

interface SVGCanvasProps {
  tables: TableType[];
  tablePositions: TablePosition[];
  canvasTransform: CanvasTransform;
  isDraggingCanvas: boolean;
  selectedTable: string | null;
  hoveredTable: string | null;
  tableDimensions?: Record<string, { width: number; height: number }>;
  highlightedGuest?: string | null;
  onMouseDown: (e: React.MouseEvent) => void;
  onMouseMove: (e: React.MouseEvent) => void;
  onMouseUp: (e: React.MouseEvent) => void;
  onWheel: (e: React.WheelEvent) => void;
  onTableMouseDown: (tableId: string, e: React.MouseEvent) => void;
  onTableMouseMove: (e: React.MouseEvent) => void;
  onTableMouseUp: () => void;
  onTableMouseEnter: (e: React.MouseEvent) => void;
  onTableMouseLeave: (e: React.MouseEvent) => void;
  onTableDoubleClick: () => void;
  onResizeStart?: (tableId: string, handleType: string, dimensions: { width: number; height: number }, e: React.MouseEvent) => void;
  onResizeUpdate?: (tableId: string, mouseX: number, mouseY: number) => void;
  onResizeEnd?: () => void;
  onRotationUpdate?: (tableId: string, rotation: number) => void;
  profileImageUrl?: string;
  userName?: string;
  partnerName?: string;
  // Guest assignment props
  guestAssignments?: Record<string, GuestAssignment>;
  onGuestDrop?: (guestId: string, tableId: string, seatIndex: number) => void;
  onGuestSwap?: (guestId1: string, tableId1: string, seatIndex1: number, tableId2: string, seatIndex2: number) => void;
  guests?: Guest[];
  showingActions?: string | null;
  onAvatarClick?: (tableId: string, seatNumber: number) => void;
  onMoveGuest?: (guestId: string, tableId: string, position: { x: number; y: number }) => void;
  onRemoveGuest?: (guestId: string, tableId: string, position: { x: number; y: number }) => void;
  getGuestAvatarColor?: (guestId: string) => string;
  onRemoveTable?: (tableId: string) => void;
  onCloneTable?: (tableId: string) => void;
}

export const SVGCanvas: React.FC<SVGCanvasProps> = ({
  tables,
  tablePositions,
  canvasTransform,
  isDraggingCanvas,
  selectedTable,
  hoveredTable,
  tableDimensions,
  highlightedGuest,
  onMouseDown,
  onMouseMove,
  onMouseUp,
  onWheel,
  onTableMouseDown,
  onTableMouseMove,
  onTableMouseUp,
  onTableMouseEnter,
  onTableMouseLeave,
  onTableDoubleClick,
  onResizeStart,
  onResizeUpdate,
  onResizeEnd,
  onRotationUpdate,
  profileImageUrl,
  userName,
  partnerName,
  guestAssignments,
  onGuestDrop,
  onGuestSwap,
  guests,
  showingActions,
  onAvatarClick,
  onMoveGuest,
  onRemoveGuest,
  getGuestAvatarColor,
  onRemoveTable,
  onCloneTable
}) => {
  

  // Calculate dynamic viewBox based on table positions - more centered and zoomed in
  const allPositions = tablePositions.map(p => ({ x: p.x, y: p.y }));
  const minX = Math.min(200, ...allPositions.map(p => p.x - 150));
  const minY = Math.min(100, ...allPositions.map(p => p.y - 150));
  const maxX = Math.max(600, ...allPositions.map(p => p.x + 150));
  const maxY = Math.max(500, ...allPositions.map(p => p.y + 150));
  const viewBox = `${minX} ${minY} ${maxX - minX} ${maxY - minY}`;

  return (
    <svg
      width="100%"
      height="100%"
      viewBox={viewBox}
      style={{
        background: 'white',
        cursor: isDraggingCanvas ? 'grabbing' : 'grab',
        border: 'none',
        outline: 'none',
        margin: 0,
        padding: 0,
        display: 'block'
      }}
      className="w-full h-full border-0 outline-none m-0 p-0 block"
      onMouseDown={onMouseDown}
      onMouseMove={(e) => {
        onMouseMove(e);
        // Handle resize updates
        if (onResizeUpdate && selectedTable) {
          onResizeUpdate(selectedTable, e.clientX, e.clientY);
        }
      }}
      onMouseUp={(e) => {
        onMouseUp(e);
        // Handle resize end
        if (onResizeEnd) {
          onResizeEnd();
        }
      }}
      onWheel={onWheel}
    >
      <g transform={`translate(${canvasTransform.x}, ${canvasTransform.y}) scale(${canvasTransform.scale})`}>
        {/* Background Grid - Cover entire viewport */}
        <defs>
          <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#D1C7C0" strokeWidth="1" opacity="0.5"/>
          </pattern>
        </defs>
        <rect 
          width="40000" 
          height="40000" 
          x="-20000"
          y="-20000"
          fill="url(#grid)" 
          className="canvas-background"
          style={{ cursor: isDraggingCanvas ? 'grabbing' : 'grab' }}
        />
        
        {/* Empty State */}
        {tables.length === 0 ? (
          <g transform="translate(400, 300)">
            <text x={0} y={0} textAnchor="middle" dominantBaseline="middle" fontSize={48}>🪑</text>
            <text x={0} y={50} textAnchor="middle" dominantBaseline="middle" fontSize={16} fill="#AB9C95">No tables configured yet</text>
            <text x={0} y={70} textAnchor="middle" dominantBaseline="middle" fontSize={14} fill="#AB9C95">Add tables to see them appear here</text>
          </g>
        ) : (
          /* Tables */
          tables.map(table => {
            const position = tablePositions.find(p => p.id === table.id);
        if (!position) {
          return null;
        }

            return (
              <g key={table.id || `table-${Date.now()}`} data-table-id={table.id}>
                <TableRenderer
                  table={table}
                  position={position}
                  isSelected={selectedTable === table.id}
                  isHovered={hoveredTable === table.id}
                  tableDimensions={tableDimensions}
                  onMouseDown={onTableMouseDown}
                  onMouseMove={onTableMouseMove}
                  onMouseUp={onTableMouseUp}
                  onMouseEnter={onTableMouseEnter}
                  onMouseLeave={onTableMouseLeave}
                  onDoubleClick={onTableDoubleClick}
                                    onResizeStart={onResizeStart}
                  onResizeUpdate={onResizeUpdate}
                  onResizeEnd={onResizeEnd}
                  onRotationUpdate={onRotationUpdate}
                  profileImageUrl={profileImageUrl}
                  userName={userName}
                  partnerName={partnerName}
                  guestAssignments={guestAssignments}
                  onGuestDrop={onGuestDrop}
                  onGuestSwap={onGuestSwap}
                  guests={guests}
                  showingActions={showingActions}
                  onAvatarClick={onAvatarClick}
                  onMoveGuest={onMoveGuest}
                  onRemoveGuest={onRemoveGuest}
                  getGuestAvatarColor={getGuestAvatarColor}
                  onRemoveTable={onRemoveTable}
                  onCloneTable={onCloneTable}
                  highlightedGuest={highlightedGuest}
                />
              </g>
            );
          })
        )}
      </g>
    </svg>
  );
};
