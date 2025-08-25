import React, { useState } from 'react';
import { MoodBoard, UserPlan } from '../../types/inspiration';
import { Edit, Trash2, Sparkles } from 'lucide-react';
import VibeSection from './VibeSection';
import ImageGrid from './ImageGrid';
import DragDropZone from './DragDropZone';

interface MoodBoardContentProps {
  board: MoodBoard;
  userPlan: UserPlan;
  weddingLocation?: string;
  isEditing: boolean;
  generatingVibes: boolean;
  isDragOver: boolean;
  onRemoveImage: (imageIndex: number) => void;
  onGenerateVibes: (imageUrl: string) => void;
  onExtractVibesFromAll?: (board: MoodBoard) => void;
  onChooseVibe?: () => void;
  onEditVibes?: () => void;
  onEditBoardName?: (board: MoodBoard) => void;
  onDeleteBoard?: (boardId: string) => void;
  onEditImage?: (imageIndex: number) => void;
  onDownloadImage?: (imageUrl: string, imageName: string) => void;
  onImageUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  isLoading?: boolean;
  uploadingImage?: boolean;
}

export default function MoodBoardContent({
  board,
  userPlan,
  weddingLocation,
  isEditing,
  generatingVibes,
  isDragOver,
  onRemoveImage,
  onGenerateVibes,
  onExtractVibesFromAll,
  onChooseVibe,
  onEditVibes,
  onEditBoardName,
  onDeleteBoard,
  onEditImage,
  onDownloadImage,
  onImageUpload,
  onDragOver,
  onDragLeave,
  onDrop,
  isLoading = false,
  uploadingImage = false
}: MoodBoardContentProps) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [editingNameValue, setEditingNameValue] = useState(board.name);
  return (
    <div className="space-y-6">
      {/* Board Name Section - Show for all boards including Wedding Day */}
                        <div className="mb-4">
        <div className="flex items-center gap-2 mb-4">
          {board.type !== 'wedding-day' && onEditBoardName && isEditingName ? (
            // Inline editing mode for custom boards
            <input
              type="text"
              value={editingNameValue}
              onChange={(e) => setEditingNameValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  onEditBoardName({ ...board, name: editingNameValue.trim() });
                  setIsEditingName(false);
                } else if (e.key === 'Escape') {
                  setEditingNameValue(board.name);
                  setIsEditingName(false);
                }
              }}
              onBlur={() => {
                onEditBoardName({ ...board, name: editingNameValue.trim() });
                setIsEditingName(false);
              }}
              className="text-base font-playfair font-semibold text-[#332B42] bg-transparent border-b-2 border-[#A85C36] outline-none px-1"
              autoFocus
            />
          ) : (
            // Display mode - matching vibe header style
            <h6 className="text-base font-playfair font-semibold text-[#332B42]">
              {board.name}
            </h6>
          )}
          
          {/* Extract Vibe from All Button - Right side */}
          {board.images && board.images.length > 1 && (
            <div className="ml-auto">
              <button
                onClick={() => onExtractVibesFromAll?.(board)}
                className="btn-gradient-purple flex items-center gap-2 text-sm px-3 py-2"
                disabled={generatingVibes}
              >
                <Sparkles className="w-4 h-4" />
                Extract Vibe from All (5 Credits)
              </button>
            </div>
          )}
          
          {board.type !== 'wedding-day' && onEditBoardName && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setIsEditingName(true);
                  setEditingNameValue(board.name);
                }}
                className="p-1 hover:bg-[#EBE3DD] rounded-[5px]"
                title="Edit board name"
              >
                <Edit size={16} className="text-[#AB9C95]" />
              </button>
              <button
                onClick={() => onDeleteBoard?.(board.id)}
                className="p-1 hover:bg-[#EBE3DD] rounded-[5px]"
                title="Delete board"
              >
                <Trash2 size={16} className="text-[#AB9C95]" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Vibes Section - Show for all boards */}
      <VibeSection 
        board={board}
        weddingLocation={weddingLocation}
        isEditing={isEditing}
        onEdit={onEditVibes}
      />

      {/* Drag & Drop Zone for Images */}
      <DragDropZone
        isDragOver={isDragOver}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        isLoading={isLoading}
        uploadingImage={uploadingImage}
      >
        {/* Image Grid */}
        <ImageGrid
          board={board}
          userPlan={userPlan}
          onRemoveImage={onRemoveImage}
          onGenerateVibes={onGenerateVibes}
          generatingVibes={generatingVibes}
          onChooseVibe={onChooseVibe}
          onEditImage={onEditImage}
          onDownloadImage={onDownloadImage}
        />

        {/* Upload Button */}
        <div className="mt-6 flex gap-3 justify-center">
          <div>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={onImageUpload}
              className="hidden"
              id="mood-board-upload"
              disabled={uploadingImage}
            />
            <label
              htmlFor={uploadingImage ? undefined : "mood-board-upload"}
              className={`px-6 py-2 rounded-lg font-medium inline-block transition-colors ${
                uploadingImage 
                  ? 'bg-gray-400 text-white cursor-not-allowed' 
                  : 'btn-primary hover:bg-[#A85C36]/90 cursor-pointer'
              }`}
            >
              {uploadingImage ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Uploading...
                </div>
                                        ) : (
                            'Upload and Train Paige'
                          )}
            </label>
          </div>
        </div>
      </DragDropZone>
    </div>
  );
}
