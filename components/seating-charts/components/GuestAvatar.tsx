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
      return `${nameParts[0].charAt(0)}${nameParts[nameParts.length - 1].charAt(0)}`;
    } else if (nameParts.length === 1) {
      return nameParts[0].charAt(0);
    }
    return '';
  };

  return (
    <g>
      {/* Large invisible click target that covers the entire avatar area */}
      <circle
        cx={position.x}
        cy={position.y}
        r={20}
        fill="transparent"
        style={{ cursor: 'pointer' }}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onAvatarClick(tableId, seatNumber);
        }}
      />
      
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
      
      {/* Guest Initials using foreignObject for better compatibility */}
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
