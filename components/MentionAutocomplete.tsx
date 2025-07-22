"use client";

import React, { useState, useEffect, useRef } from 'react';
import { User, Heart, Crown } from 'lucide-react';
import { MentionableUser, filterMentionableUsers } from '@/utils/mentionUtils';
import { useAuth } from '@/contexts/AuthContext';

interface MentionAutocompleteProps {
  searchTerm: string;
  mentionableUsers: MentionableUser[];
  onSelectUser: (user: MentionableUser) => void;
  onClose: () => void;
}

export default function MentionAutocomplete({
  searchTerm,
  mentionableUsers,
  onSelectUser,
  onClose
}: MentionAutocompleteProps) {
  const { profileImageUrl } = useAuth();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const filteredUsers = filterMentionableUsers(mentionableUsers, searchTerm);

  useEffect(() => {
    setSelectedIndex(0);
  }, [searchTerm]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!filteredUsers.length) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) => 
            prev < filteredUsers.length - 1 ? prev + 1 : 0
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) => 
            prev > 0 ? prev - 1 : filteredUsers.length - 1
          );
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredUsers[selectedIndex]) {
            onSelectUser(filteredUsers[selectedIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [filteredUsers, selectedIndex, onSelectUser, onClose]);

  // Auto-scroll to selected item
  useEffect(() => {
    if (containerRef.current && selectedIndex >= 0) {
      const selectedElement = containerRef.current.children[selectedIndex] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({
          block: 'nearest',
          behavior: 'smooth'
        });
      }
    }
  }, [selectedIndex]);

  if (!mentionableUsers.length) {
    return (
      <div className="absolute bottom-full left-0 mb-2 bg-white border border-gray-200 rounded-lg shadow-lg p-4 min-w-64 z-50">
        <div className="flex items-center gap-3 text-gray-600">
          <Crown className="w-4 h-4 text-purple-500" />
          <div>
            <p className="text-sm font-medium">No contacts available</p>
            <p className="text-xs text-gray-500">Add your partner and wedding planner in Account Settings to enable @mentions</p>
          </div>
        </div>
      </div>
    );
  }

  if (!filteredUsers.length) {
    return (
      <div className="absolute bottom-full left-0 mb-2 bg-white border border-gray-200 rounded-lg shadow-lg p-3 min-w-64 z-50">
        <p className="text-sm text-gray-500">No matches found</p>
      </div>
    );
  }

  const getUserIcon = (type: string) => {
    switch (type) {
      case 'partner':
        return <Heart className="w-3 h-3 text-pink-500" />;
      case 'planner':
        return <Crown className="w-3 h-3 text-purple-500" />;
      default:
        return <User className="w-3 h-3 text-gray-500" />;
    }
  };

  const getUserTypeLabel = (type: string) => {
    switch (type) {
      case 'partner':
        return 'Partner';
      case 'planner':
        return 'Wedding Planner';
      default:
        return 'You';
    }
  };

  return (
    <div 
      ref={containerRef}
      className="absolute bottom-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto"
    >
      {filteredUsers.map((user, index) => (
        <button
          key={user.id}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onSelectUser(user);
          }}
          className={`w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-gray-50 transition-colors ${
            index === selectedIndex ? 'bg-gray-100' : ''
          }`}
        >
          {/* Avatar */}
          <div className="flex-shrink-0">
            {user.avatar || (user.type === 'user' && profileImageUrl) ? (
              <img
                src={user.avatar || profileImageUrl || ''}
                alt={user.name}
                className="w-6 h-6 rounded-full object-cover"
              />
            ) : (
              <div className="w-6 h-6 rounded-full bg-[#A85C36] text-white text-xs font-medium flex items-center justify-center">
                {user.name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2)}
              </div>
            )}
          </div>

          {/* User Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-[#332B42] truncate">
                {user.name}
              </span>
              {getUserIcon(user.type)}
            </div>
            <span className="text-xs text-gray-500">
              {getUserTypeLabel(user.type)}
            </span>
          </div>
        </button>
      ))}
    </div>
  );
} 