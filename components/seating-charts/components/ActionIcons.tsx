import React from 'react';

interface ActionIconsProps {
  position: { x: number; y: number };
  guestId: string;
  tableId: string;
  seatNumber: number;
  onMoveGuest: (guestId: string, tableId: string, seatNumber: number) => void;
  onRemoveGuest: (guestId: string, tableId: string, seatNumber: number) => void;
}

export const ActionIcons: React.FC<ActionIconsProps> = ({
  position,
  guestId,
  tableId,
  seatNumber,
  onMoveGuest,
  onRemoveGuest
}) => {
  return (
    <g>
      {/* Move Icon - Arrow pointing up (left side) */}
      <circle
        cx={position.x - 20}
        cy={position.y - 35}
        r={12}
        fill="white"
        stroke="none"
        style={{ cursor: 'pointer', filter: 'drop-shadow(0px 2px 4px rgba(0,0,0,0.1))' }}
        onClick={() => onMoveGuest(guestId, tableId, seatNumber)}
      />
      {/* Simple up arrow */}
      <line
        x1={position.x - 20}
        y1={position.y - 35 + 4}
        x2={position.x - 20}
        y2={position.y - 35 - 4}
        stroke="#6b7280"
        strokeWidth={1.5}
        style={{ pointerEvents: 'none' }}
      />
      <line
        x1={position.x - 23}
        y1={position.y - 35 + 1}
        x2={position.x - 20}
        y2={position.y - 35 - 4}
        stroke="#6b7280"
        strokeWidth={1.5}
        style={{ pointerEvents: 'none' }}
      />
      <line
        x1={position.x - 17}
        y1={position.y - 35 + 1}
        x2={position.x - 20}
        y2={position.y - 35 - 4}
        stroke="#6b7280"
        strokeWidth={1.5}
        style={{ pointerEvents: 'none' }}
      />
      
      {/* Remove Icon - X mark (right side) */}
      <circle
        cx={position.x + 20}
        cy={position.y - 35}
        r={12}
        fill="white"
        stroke="none"
        style={{ cursor: 'pointer', filter: 'drop-shadow(0px 2px 4px rgba(0,0,0,0.1))' }}
        onClick={() => onRemoveGuest(guestId, tableId, seatNumber)}
      />
      {/* Simple X mark */}
      <line
        x1={position.x + 16}
        y1={position.y - 35 - 4}
        x2={position.x + 24}
        y2={position.y - 35 + 4}
        stroke="#6b7280"
        strokeWidth={1.5}
        style={{ pointerEvents: 'none' }}
      />
      <line
        x1={position.x + 24}
        y1={position.y - 35 - 4}
        x2={position.x + 16}
        y2={position.y - 35 + 4}
        stroke="#6b7280"
        strokeWidth={1.5}
        style={{ pointerEvents: 'none' }}
      />
    </g>
  );
};
