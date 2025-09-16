import React, { useState } from 'react';
import { MoodBoard, UserPlan } from '../../types/inspiration';
import { Edit, Trash2, Sparkles } from 'lucide-react';
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

      </DragDropZone>
    </div>
  );
}
