import { X } from 'lucide-react';
import { motion } from 'framer-motion';
import React, { useState } from 'react';

interface VenueCardProps {
  venue: {
    name: string;
    formatted_address: string;
    photos?: Array<{ photo_reference: string }>;
    rating?: number;
    user_ratings_total?: number;
    url?: string;
  };
  onDelete?: () => void;
  showDeleteButton?: boolean;
}

export default function VenueCard({ venue, onDelete, showDeleteButton = true }: VenueCardProps) {
  const [imgError, setImgError] = useState(false);
  const hasPhoto = Array.isArray(venue.photos) && venue.photos.length > 0 && !imgError;

  return (
    <motion.div
      layout
      initial={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ 
        duration: 0.2,
        ease: [0.4, 0, 0.2, 1]
      }}
      className="mb-4 p-4 bg-white rounded-lg border border-[#AB9C95] overflow-hidden"
    >
      <motion.div layout="position">
        <div className="flex justify-between items-center mb-2">
          <h4 className="text-sm font-playfair text-[#332B42]">Selected Venue</h4>
          {showDeleteButton && onDelete && (
            <button
              type="button"
              onClick={onDelete}
              className="text-[#364257] hover:text-[#A85C36] transition-colors"
            >
              <X size={16} />
            </button>
          )}
        </div>
        <div className="flex gap-4 items-start">
          {/* Temporarily removed image/icon section
          {hasPhoto ? (
            <div className="w-[64px] h-[48px] flex items-center justify-center">
              <img
                src={`https://maps.googleapis.com/maps/api/place/photo?maxwidth=200&photoreference=${venue.photos?.[0]?.photo_reference}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`}
                alt={venue.name}
                className="rounded-lg object-cover w-[64px] h-[48px]"
                onError={() => setImgError(true)}
              />
            </div>
          ) : (
            <div className="w-[64px] h-[48px] flex items-center justify-center">
              <img src="/Venue.png" alt="Venue" className="w-8 h-8" />
            </div>
          )}
          */}
          <div className="flex-1">
            <h6 className="text-lg font-semibold text-[#332B42]">{venue.name}</h6>
            <p className="text-sm text-[#364257] mb-1">{venue.formatted_address}</p>
            {venue.rating && (
              <div className="flex items-center gap-1">
                <span className="text-yellow-500">★</span>
                <span className="font-medium">{venue.rating}</span>
                {venue.user_ratings_total && (
                  <span className="text-xs text-[#364257]">({venue.user_ratings_total} Google reviews)</span>
                )}
              </div>
            )}
            {venue.url && (
              <a
                href={venue.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs hover:opacity-80"
              >
                View on Google Maps
              </a>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
} 