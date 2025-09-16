import React from 'react';
import { motion } from 'framer-motion';
import { X, Sparkles, Camera, MoreHorizontal } from 'lucide-react';
import { MoodBoard, UserPlan } from '../../types/inspiration';
import { canAddMoreImages } from '../../utils/moodBoardUtils';
import MicroMenu from '../MicroMenu';

interface ImageGridProps {
  board: MoodBoard;
  userPlan: UserPlan;
  onRemoveImage: (imageIndex: number) => void;
  onGenerateVibes: (imageUrl: string) => void;
  generatingVibes: boolean;
  onChooseVibe?: () => void;
  onEditImage?: (imageIndex: number) => void;
  onDownloadImage?: (imageUrl: string, imageName: string) => void;
  onImageUpload?: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

export default function ImageGrid({
  board,
  userPlan,
  onRemoveImage,
  onGenerateVibes,
  generatingVibes,
  onChooseVibe,
  onEditImage,
  onDownloadImage,
  onImageUpload
}: ImageGridProps) {
  const hasImages = board.images.length > 0;
  const canAddMore = canAddMoreImages(board, userPlan);

  if (!hasImages) {
    return (
      <div className="text-center py-8">
        <img
          src="/Wedding%20Illustration.png"
          alt="Wedding Illustration"
          className="w-32 h-32 mx-auto mb-4 opacity-60"
        />
        <h5 className="text-lg font-medium text-[#332B42] mb-2">No {board.name.toLowerCase()} images yet</h5>
        <p className="text-[#364257] mb-4">Start building your {board.name.toLowerCase()} mood board by uploading some wedding inspiration images</p>
        <p className="text-sm text-[#A85C36] mb-4">💡 Tip: Upload images that capture your dream {board.name.toLowerCase()} aesthetic</p>
        {onImageUpload && (
          <div className="flex justify-center">
            <input
              type="file"
              id="empty-state-upload"
              accept="image/*"
              multiple
              onChange={onImageUpload}
              className="hidden"
            />
            <label
              htmlFor="empty-state-upload"
              className="btn-primaryinverse cursor-pointer"
            >
              Upload Images
            </label>
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      {/* Responsive Grid Layout */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-2 sm:gap-3 mb-6 w-full max-w-full overflow-hidden">
        {board.images.slice().reverse().map((image, displayIndex) => {
          // Calculate the actual index in the original array
          const actualIndex = board.images.length - 1 - displayIndex;
          
          // Handle both old string format and new object format
          const imageUrl = typeof image === 'string' ? image : image.url;
          const imageName = typeof image === 'string' ? `Image ${displayIndex + 1}` : image.fileName;
          const imageDescription = typeof image === 'string' ? '' : image.description;
          
          return (
            <motion.div
              key={actualIndex}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: displayIndex * 0.1 }}
              className="group"
            >
              <div className="bg-white border border-[#AB9C95] rounded-[5px] hover:shadow-lg transition-shadow relative w-full max-w-full">
                {/* Micro Menu - Top Right (Only on Hover) */}
                <div className="absolute top-2 right-2 z-50 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <MicroMenu
                    items={[
                      {
                        label: 'Edit',
                        onClick: () => onEditImage?.(actualIndex)
                      },
                      {
                        label: 'Download',
                        onClick: () => onDownloadImage?.(imageUrl, imageName)
                      },
                      {
                        label: 'Delete',
                        onClick: () => onRemoveImage(actualIndex),
                        className: 'text-red-600 hover:bg-red-50'
                      }
                    ]}
                    buttonClassName="p-1.5 hover:bg-white/80 rounded-full transition-colors bg-white/60 backdrop-blur-sm"
                    menuClassName="absolute right-0 top-full mt-1 w-32 bg-white border border-[#E0DBD7] rounded-[5px] shadow-lg z-[100]"
                  />
                </div>

              {/* Image */}
              <div className="relative overflow-hidden rounded-t-[5px]">
                <img
                  src={imageUrl}
                  alt={imageName}
                  className="w-full h-auto object-cover max-w-full"
                  loading="lazy"
                />
                
                {/* Overlay with actions */}
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <button
                      onClick={() => onGenerateVibes(imageUrl)}
                      disabled={generatingVibes}
                      className="flex items-center gap-1 px-2 py-1 bg-white text-[#332B42] text-xs font-medium rounded shadow-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {generatingVibes ? (
                        <div className="w-3 h-3 border-2 border-[#332B42] border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <Sparkles className="w-3 h-3" />
                      )}
                      Generate Vibes (2 Credits)
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Content below image */}
              <div className="p-2">
                <div className="flex items-start justify-between mb-1 gap-1">
                  <h3 className="font-semibold text-[#332B42] text-xs truncate flex-1 min-w-0 text-left">
                    {imageName}
                  </h3>
                  <div className="flex items-center gap-1 text-xs text-[#AB9C95] flex-shrink-0">
                    <Camera size={10} />
                    <span className="text-xs">Uploaded</span>
                  </div>
                </div>
                
                {/* Description */}
                {imageDescription && (
                  <p className="text-xs text-[#364257] mb-1 line-clamp-1 break-words">
                    {imageDescription}
                  </p>
                )}
                
                {/* Category Tag */}
                <span className="inline-block px-1.5 py-0.5 bg-[#F3F2F0] text-[#332B42] text-xs font-medium rounded">
                  {board.name} Inspiration
                </span>
              </div>
            </div>
          </motion.div>
        );
        })}
      </div>

      {/* Image Limit Warning */}
      {!canAddMore && (
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 rounded-lg mb-4 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <h6 className="font-semibold text-sm mb-1">Image Limit Reached</h6>
              <p className="text-sm opacity-90">You've reached the limit of {userPlan.maxImagesPerBoard} images for this board on your {userPlan.tier} plan.</p>
            </div>
            <button className="text-sm underline hover:no-underline hover:opacity-80 transition-opacity">
              Upgrade Plan
            </button>
          </div>
        </div>
      )}
    </>
  );
}
