import React from 'react';
import { MoodBoard, UserPlan } from '../../types/inspiration';
import MicroMenu from '../MicroMenu';

interface MoodBoardTabsProps {
  moodBoards: MoodBoard[];
  activeMoodBoard: string;
  onTabChange: (boardId: string) => void;
  onNewBoard?: () => void;
  onEditBoard?: (board: MoodBoard) => void;
  onDeleteBoard?: (boardId: string) => void;
  inlineEditingBoardId?: string | null;
  inlineEditingName?: string;
  onInlineEditChange?: (name: string) => void;
  onSaveInlineEdit?: () => void;
  onCancelInlineEdit?: () => void;
  userPlan: UserPlan;
  isLoading?: boolean;
}

export default function MoodBoardTabs({
  moodBoards,
  activeMoodBoard,
  onTabChange,
  onNewBoard,
  onEditBoard,
  onDeleteBoard,
  inlineEditingBoardId,
  inlineEditingName = '',
  onInlineEditChange,
  onSaveInlineEdit,
  onCancelInlineEdit,
  userPlan,
  isLoading = false
}: MoodBoardTabsProps) {
  if (isLoading) {
    return (
      <div className="flex gap-2 mb-4">
        <div className="px-4 py-2 rounded font-work-sans text-sm font-medium bg-[#F3F2F0] border border-[#E0D6D0] text-[#332B42] animate-pulse">
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      {moodBoards.map((board) => (
        <div key={board.id} className="relative group">
          {inlineEditingBoardId === board.id ? (
            // Inline editing mode
            <div className="flex items-center gap-2 px-4 py-2 rounded font-work-sans text-sm font-medium border border-[#A85C36] bg-white">
              <input
                type="text"
                value={inlineEditingName}
                onChange={(e) => onInlineEditChange?.(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    onSaveInlineEdit?.();
                  } else if (e.key === 'Escape') {
                    onCancelInlineEdit?.();
                  }
                }}
                className="flex-1 min-w-0 bg-transparent border-none outline-none text-[#A85C36] font-medium"
                autoFocus
              />
              <button
                onClick={() => onSaveInlineEdit?.()}
                className="text-[#A85C36] hover:text-[#8B4513] p-1"
                title="Save"
              >
                ✓
              </button>
              <button
                onClick={() => onCancelInlineEdit?.()}
                className="text-[#AB9C95] hover:text-[#332B42] p-1"
                title="Cancel"
              >
                ✕
              </button>
            </div>
          ) : (
            // Normal display mode with integrated three dots menu
            <div className="relative inline-flex items-center">
              <button
                onClick={() => onTabChange(board.id)}
                className={`px-4 py-2 rounded font-work-sans text-sm font-medium border transition-colors duration-150 focus:outline-none ${
                  activeMoodBoard === board.id 
                    ? "bg-white border-[#A85C36] text-[#A85C36]" 
                    : "bg-[#F3F2F0] border-[#E0D6D0] text-[#332B42] hover:bg-[#E0D6D0]"
                }`}
              >
                {board.name}
              </button>
              

            </div>
          )}
        </div>
      ))}
      
      {/* + New Board Tab */}
      {onNewBoard && (
        <button
          onClick={onNewBoard}
          className="px-4 py-2 rounded font-work-sans text-sm font-medium border border-[#E0D6D0] bg-[#F3F2F0] text-[#332B42] hover:bg-[#E0D6D0] hover:text-[#332B42] transition-colors duration-150 focus:outline-none"
        >
          + New Board
        </button>
      )}
    </div>
  );
}
