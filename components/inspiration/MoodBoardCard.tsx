import React from 'react';
import { useRouter } from 'next/navigation';
import { MoodBoard } from '../../types/inspiration';

interface MoodBoardCardProps {
  board: MoodBoard;
}

const MoodBoardCard: React.FC<MoodBoardCardProps> = ({ board }) => {
  const router = useRouter();

  return (
    <div
      onClick={() => router.push(`/moodboards/${board.id}`)}
      className="bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow cursor-pointer group flex flex-col h-56"
    >
      {/* Card Content */}
      <div className="p-4 flex-1 flex flex-col">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h6 className="group-hover:text-[#A85C36] transition-colors">
              {board.name}
            </h6>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">
              {board.images.length} images
            </span>
            <span className="text-xs text-gray-400">
              {board.vibes.length} vibes
            </span>
          </div>
        </div>
        
        {board.images.length === 0 ? (
          /* No Images State - Full Height */
          <div className="flex-1 bg-gray-50 rounded flex items-center justify-center">
            <span className="text-sm text-gray-400">No images yet!</span>
          </div>
        ) : (
          /* Content with Images */
          <div className="space-y-3 flex-1">
            {/* Preview Images */}
            <div className="flex gap-2">
              {board.images.slice(0, 3).map((image, index) => (
                <div key={index} className="w-12 h-12 bg-gray-100 rounded overflow-hidden">
                  <img
                    src={typeof image === 'string' ? image : image.url}
                    alt={`Preview ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
              {board.images.length > 3 && (
                <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center">
                  <span className="text-xs text-gray-500">+{board.images.length - 3}</span>
                </div>
              )}
            </div>
            
            {/* Preview Vibes */}
            <div className="flex flex-wrap gap-1">
              {board.vibes.slice(0, 3).map((vibe, index) => (
                <span
                  key={index}
                  className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full"
                >
                  {vibe}
                </span>
              ))}
              {board.vibes.length > 3 && (
                <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                  +{board.vibes.length - 3} more
                </span>
              )}
            </div>
          </div>
        )}
      </div>
      
      {/* Fixed Footer */}
      <div className="px-4 py-4 border-t border-gray-100 bg-gray-50 rounded-b-lg">
        <div className="flex items-center justify-center">
          <span className="text-[#A85C36] group-hover:text-[#805d93] transition-colors text-sm font-medium">
            View Board →
          </span>
        </div>
      </div>
    </div>
  );
};

export default MoodBoardCard;
