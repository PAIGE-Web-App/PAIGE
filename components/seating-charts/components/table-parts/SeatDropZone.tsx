import React from 'react';
import { GuestAssignment } from '../../hooks/useGuestManagement';

interface SeatDropZoneProps {
  seatPosition: { x: number; y: number };
  isSeatOccupied: boolean;
  tableId: string;
  seatIndex: number;
  onGuestDrop?: (guestId: string, tableId: string, seatIndex: number) => void;
  onGuestSwap?: (guestId: string, sourceTableId: string, sourceSeatIndex: number, targetTableId: string, targetSeatIndex: number) => void;
}

/**
 * SeatDropZone - Dynamic drop zone for guest assignment and swapping
 * 
 * Features:
 * - Dynamic sizing: 4px at rest (no click interference), 20px during drag (easy targeting)
 * - Visual feedback: Blue for swap, Green for assignment
 * - Handles both sidebar-to-seat drops and seat-to-seat swaps
 */
export const SeatDropZone: React.FC<SeatDropZoneProps> = ({
  seatPosition,
  isSeatOccupied,
  tableId,
  seatIndex,
  onGuestDrop,
  onGuestSwap
}) => {
  return (
    <>
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
                onGuestSwap(parsedData.guestId, parsedData.sourceTableId, parsedData.sourceSeatIndex || 0, tableId, seatIndex);
              }
            } else {
              // Fallback to regular guest drop
              if (onGuestDrop) {
                onGuestDrop(parsedData.guestId, tableId, seatIndex);
              }
            }
          } catch (error) {
            // Fallback: treat as plain guest ID (from sidebar)
            if (onGuestDrop) {
              onGuestDrop(dragData, tableId, seatIndex);
            }
          }
        }}
      />
    </>
  );
};
