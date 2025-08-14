import React from 'react';
import VibePill from '../VibePill';
import { MoodBoard } from '../../types/inspiration';

interface VibeSectionProps {
  board: MoodBoard;
  weddingLocation?: string;
  isEditing?: boolean;
  onEdit?: () => void;
}

export default function VibeSection({ board, weddingLocation, isEditing = false, onEdit }: VibeSectionProps) {

  // Show empty state when no vibes exist
  if (!board.vibes || board.vibes.length === 0) {
    return (
      <div className="mb-6">
        <div className="flex flex-col gap-3">
          <button 
            onClick={onEdit}
            className="btn-primaryinverse px-4 py-2 text-sm font-medium rounded-lg border-2 border-[#A85C36] text-[#A85C36] hover:bg-[#A85C36] hover:text-white transition-colors w-fit"
          >
            + Add your first vibe
          </button>
          <p className="text-sm text-gray-600">
            Or add an image to generate vibes from
          </p>
        </div>
      </div>
    );
  }

  const vibeCount = board.vibes.length;
  const isSingular = vibeCount === 1;
  const vibeText = isSingular ? 'vibe' : 'vibes';

  // Truncate very long location names to prevent layout issues
  const truncateLocation = (location: string) => {
    if (location.length > 30) {
      return location.substring(0, 27) + '...';
    }
    return location;
  };

  const getVibeTitle = () => {
    const hasLocation = weddingLocation && weddingLocation.trim() !== '';
    if (hasLocation) {
      return `The ${vibeText} for your dream day in ${truncateLocation(weddingLocation)}`;
    } else {
      return `The ${vibeText} for your dream day`;
    }
  };



  return (
    <div className="mb-6">
      <div className="flex flex-wrap items-center gap-3">
        {board.vibes.map((vibeItem, index) => (
          <VibePill
            key={index}
            vibe={vibeItem}
            index={index}
          />
        ))}
        {onEdit && (
          <button
            onClick={onEdit}
            className="p-1 hover:bg-[#EBE3DD] rounded-[5px]"
            title="Edit Vibes"
          >
            <span className="inline-block align-middle text-[#AB9C95] -scale-x-100">
              ✏️
            </span>
          </button>
        )}
      </div>
    </div>
  );
}
