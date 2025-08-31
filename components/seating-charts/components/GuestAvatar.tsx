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
      {/* Visible avatar circle */}
      <circle
        cx={position.x}
        cy={position.y}
        r={16}
        fill={avatarColor}
        stroke={avatarColor}
        strokeWidth={2}
        style={{ cursor: 'pointer' }}
        onClick={() => onAvatarClick(tableId, seatNumber)}
      />
      
      {/* Guest Initials */}
      <text
        x={position.x}
        y={position.y}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={12}
        fontFamily="'Work Sans', sans-serif"
        fill="white"
        fontWeight="500"
        style={{ userSelect: 'none', pointerEvents: 'none' }}
      >
        {getInitials(guest.fullName)}
      </text>
    </g>
  );
};
