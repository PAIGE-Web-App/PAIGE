import React from 'react';
import { TableType } from '../../../types/seatingChart';
import { TablePosition } from '../hooks/useTableDrag';
import { getTableShape } from '../utils/seatPositionCalculator';

interface TableRendererProps {
  table: TableType;
  position: TablePosition;
  isSelected: boolean;
  isHovered: boolean;
  onMouseDown: (tableId: string, e: React.MouseEvent) => void;
  onMouseMove: (e: React.MouseEvent) => void;
  onMouseUp: () => void;
  onMouseEnter: (e: React.MouseEvent) => void;
  onMouseLeave: (e: React.MouseEvent) => void;
  onDoubleClick: () => void;
  profileImageUrl?: string;
  userName?: string;
  partnerName?: string;
}

export const TableRenderer: React.FC<TableRendererProps> = ({
  table,
  position,
  isSelected,
  isHovered,
  onMouseDown,
  onMouseMove,
  onMouseUp,
  onMouseEnter,
  onMouseLeave,
  onDoubleClick,
  profileImageUrl,
  userName,
  partnerName
}) => {
  const shape = getTableShape(table.type);
  const seatPositions = shape.seatPositions(table.capacity);

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
          r={shape.width / 2}
          fill={table.isDefault ? '#fce7f3' : '#f3f4f6'}
          stroke={isSelected ? '#a855f7' : isHovered ? '#a3a3a3' : '#d1d5db'}
          strokeWidth={isSelected ? 3 : isHovered ? 2 : 1}
          filter="drop-shadow(2px 2px 5px rgba(0,0,0,0.1))"
          {...tableProps}
        />
      ) : (
        <rect
          x={position.x - shape.width / 2}
          y={position.y - shape.height / 2}
          width={shape.width}
          height={shape.height}
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

      {/* Seat Positions */}
      {!table.isDefault && seatPositions.map((seat, index) => (
        <circle
          key={`${table.id}-seat-${index}`}
          cx={position.x + seat.x}
          cy={position.y + seat.y}
          r={8}
          fill="#8b4513"
          stroke="#654321"
          strokeWidth={1}
        />
      ))}

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
            >
              {userName ? userName.charAt(0).toUpperCase() : 'Y'}
            </text>
          )}
          
          <circle
            cx={position.x + 50}
            cy={position.y + 50}
            r={16}
            fill="#364257"
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
          >
            {partnerName ? partnerName.charAt(0).toUpperCase() : 'M'}
          </text>
          
          <text
            x={position.x - 50}
            y={position.y + 80}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={12}
            fontFamily="var(--font-work-sans)"
            fill="#374151"
            fontWeight="500"
            style={{ 
              userSelect: 'none',
              pointerEvents: 'none'
            }}
          >
            {userName || 'You'}
          </text>
          <text
            x={position.x + 50}
            y={position.y + 80}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={12}
            fontFamily="var(--font-work-sans)"
            fill="#374151"
            fontWeight="500"
            style={{ 
              userSelect: 'none',
              pointerEvents: 'none'
            }}
          >
            {partnerName || 'Partner'}
          </text>
        </>
      )}

      {/* Rotation Handle - Hidden for now */}
      {/* <circle
        cx={position.x}
        cy={position.y - shape.height / 2 - 20}
        r={8}
        fill="#6366f1"
        stroke="#4f46e5"
        strokeWidth={2}
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
      />
      <text
        x={position.x}
        y={position.y - shape.height / 2 - 20}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={12}
        fill="white"
      >
        ⟲
      </text> */}
    </>
  );
};
