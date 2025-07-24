import React from 'react';
import { User } from 'lucide-react';

interface UserAvatarProps {
  userId?: string | null;
  userName?: string | null;
  profileImageUrl?: string | null;
  avatarColor?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showTooltip?: boolean;
}

const UserAvatar: React.FC<UserAvatarProps> = ({
  userId,
  userName,
  profileImageUrl,
  avatarColor = '#7D7B7B',
  size = 'md',
  className = '',
  showTooltip = false,
}) => {
  const sizeClasses = {
    sm: 'w-6 h-6 text-xs',
    md: 'w-8 h-8 text-sm',
    lg: 'w-10 h-10 text-base',
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const displayName = userName || 'User';
  const initials = getInitials(displayName);

  return (
    <div
      className={`relative rounded-full flex items-center justify-center overflow-hidden ${sizeClasses[size]} ${className}`}
      style={{ backgroundColor: avatarColor }}
      title={showTooltip ? displayName : undefined}
    >
      {profileImageUrl ? (
        <img
          src={profileImageUrl}
          alt={displayName}
          className="w-full h-full object-cover"
          onError={(e) => {
            // Fallback to initials if image fails to load
            const target = e.currentTarget;
            target.style.display = 'none';
            const parent = target.parentElement;
            if (parent) {
              const fallback = parent.querySelector('.avatar-fallback') as HTMLElement;
              if (fallback) {
                fallback.style.display = 'flex';
              }
            }
          }}
        />
      ) : null}
      
      {/* Fallback initials - always present but hidden when image is shown */}
      <div 
        className={`avatar-fallback flex items-center justify-center text-white font-medium ${profileImageUrl ? 'hidden' : 'flex'}`}
        style={{ backgroundColor: avatarColor }}
      >
        {initials}
      </div>
      
      {/* Default user icon if no name or image */}
      {!profileImageUrl && !userName && (
        <User className="w-1/2 h-1/2 text-white" />
      )}
    </div>
  );
};

export default UserAvatar; 