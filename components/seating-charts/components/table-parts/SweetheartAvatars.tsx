import React from 'react';
import { TablePosition } from '../../hooks/useTableDrag';

interface SweetheartAvatarsProps {
  position: TablePosition;
  tableId: string;
  profileImageUrl?: string;
  userName?: string;
  partnerName?: string;
}

/**
 * SweetheartAvatars - Renders avatars for the sweetheart table (default table)
 * 
 * Features:
 * - Two avatars side by side (user and partner)
 * - Profile image support with fallback to initials
 * - Accent color styling
 * - Drop shadows for depth
 */
export const SweetheartAvatars: React.FC<SweetheartAvatarsProps> = ({
  position,
  tableId,
  profileImageUrl,
  userName,
  partnerName
}) => {
  return (
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
                <clipPath id={`avatarClip-${tableId}`}>
                  <circle cx={position.x - 50} cy={position.y + 50} r={16}/>
                </clipPath>
              </defs>
              <image
                x={position.x - 50 - 16}
                y={position.y + 50 - 16}
                width={32}
                height={32}
                href={profileImageUrl}
                clipPath={`url(#avatarClip-${tableId})`}
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
  );
};
