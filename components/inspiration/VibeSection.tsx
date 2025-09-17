import React, { useState, useEffect } from 'react';
import VibePill from '../VibePill';
import { MoodBoard } from '../../types/inspiration';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface VibeSectionProps {
  board: MoodBoard;
  weddingLocation?: string;
  isEditing?: boolean;
  onEdit?: () => void;
  newlyAddedVibes?: Set<string>; // Track newly added vibes for green flash
}

export default function VibeSection({ board, weddingLocation, isEditing = false, onEdit, newlyAddedVibes = new Set() }: VibeSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Show empty state when no vibes exist
  if (!board.vibes || board.vibes.length === 0) {
    return (
      <div className="mb-6">
        <div className="flex flex-col gap-3 items-center text-center">
          <button 
            onClick={onEdit}
            className="btn-primary w-fit"
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
  const maxVisible = 20;
  const hasMore = vibeCount > maxVisible;
  
  // Keep vibes in their natural order, just apply truncation
  const visibleVibes = isExpanded ? board.vibes : board.vibes.slice(0, maxVisible);
  const remainingCount = vibeCount - maxVisible;

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
        {visibleVibes.map((vibeItem, index) => (
          <VibePill
            key={index}
            vibe={vibeItem}
            index={index}
            isNewlyAdded={newlyAddedVibes.has(vibeItem)}
          />
        ))}
        
        {hasMore && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1 px-3 py-1.5 text-xs text-[#805d93] bg-[#F3F2F0] border border-[#AB9C95] rounded-full hover:bg-[#E0DBD7] transition-colors"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="w-3 h-3" />
                Show less
              </>
            ) : (
              <>
                +{remainingCount} more
                <ChevronDown className="w-3 h-3" />
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
