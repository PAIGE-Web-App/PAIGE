import React from 'react';
import { Guest } from '@/types/seatingChart';

interface GuestAvatarProps {
  guest: Guest;
  position: { x: number; y: number };
  tableId: string;
  seatNumber: number;
  onAvatarClick: (tableId: string, seatNumber: number) => void;
  getGuestAvatarColor: (guestId: string) => string;
}

export const GuestAvatar: React.FC<GuestAvatarProps> = ({
  guest,
  position,
  tableId,
  seatNumber,
  onAvatarClick,
  getGuestAvatarColor
}) => {
  const avatarColor = getGuestAvatarColor(guest.id);
  
  // Parse full name to get initials
  const getInitials = (fullName: string) => {
    const nameParts = fullName.trim().split(' ');
    if (nameParts.length >= 2) {
      return `${nameParts[0].charAt(0)}${nameParts[nameParts.length - 1].charAt(0)}`.toUpperCase();
    } else if (nameParts.length === 1) {
      return nameParts[0].charAt(0).toUpperCase();
    }
    return '';
  };

  return (
    <g>
      {/* Wrapper foreignObject for both click and drag functionality */}
      <foreignObject
        x={position.x - 20}
        y={position.y - 20}
        width={40}
        height={40}
        style={{ cursor: 'grab', pointerEvents: 'auto' }}
      >
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative'
          }}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onAvatarClick(tableId, seatNumber);
          }}
          draggable={true}
          onDragStart={(e) => {
            // Set drag data with guest info and source location
            e.dataTransfer.setData('text/plain', JSON.stringify({
              guestId: guest.id,
              sourceTableId: tableId,
              sourceSeatNumber: seatNumber,
              guestName: guest.fullName,
              isFromSeat: true // Flag to indicate this is from a seat, not sidebar
            }));
            e.dataTransfer.effectAllowed = 'move';
            
            // Visual feedback during drag
            e.currentTarget.style.cursor = 'grabbing';
            
            // Create custom drag image using the avatar
            const dragImage = document.createElement('div');
            dragImage.style.width = '32px';
            dragImage.style.height = '32px';
            dragImage.style.borderRadius = '50%';
            dragImage.style.backgroundColor = avatarColor;
            dragImage.style.display = 'flex';
            dragImage.style.alignItems = 'center';
            dragImage.style.justifyContent = 'center';
            dragImage.style.color = 'white';
            dragImage.style.fontSize = '12px';
            dragImage.style.fontWeight = '500';
            dragImage.style.fontFamily = "'Work Sans', sans-serif";
            dragImage.style.opacity = '0.8';
            dragImage.style.transform = 'scale(1.2)';
            dragImage.style.position = 'absolute';
            dragImage.style.top = '-1000px';
            dragImage.style.left = '-1000px';
            dragImage.style.zIndex = '9999';
            dragImage.textContent = getInitials(guest.fullName);
            
            // Add to DOM temporarily
            document.body.appendChild(dragImage);
            
            // Set as drag image
            e.dataTransfer.setDragImage(dragImage, 16, 16);
            
            // Remove after drag starts
            setTimeout(() => {
              if (document.body.contains(dragImage)) {
                document.body.removeChild(dragImage);
              }
            }, 0);
          }}
          onDragEnd={(e) => {
            // Reset cursor
            e.currentTarget.style.cursor = 'grab';
          }}
        >
          {/* Invisible click target that covers the entire area */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              zIndex: 10
            }}
          />
        </div>
      </foreignObject>
      
      {/* Visible avatar circle */}
      <circle
        cx={position.x}
        cy={position.y}
        r={16}
        fill={avatarColor}
        stroke={avatarColor}
        strokeWidth={2}
        style={{ pointerEvents: 'none' }}
      />
      
                {/* Guest Initials using foreignObject for better compatibility (non-interactive) */}
          <foreignObject
            x={position.x - 12}
            y={position.y - 12}
            width={24}
            height={24}
            style={{ pointerEvents: 'none' }}
          >
            <div
              style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px',
                fontFamily: "'Work Sans', sans-serif",
                color: 'white',
                fontWeight: '500',
                userSelect: 'none',
                pointerEvents: 'none'
              }}
            >
              {getInitials(guest.fullName)}
            </div>
          </foreignObject>
    </g>
  );
};
