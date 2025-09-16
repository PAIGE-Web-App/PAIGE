import React, { useState } from 'react';
import { Heart, Plus, Trash2, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { MoodBoard } from '@/types/inspiration';
import StorageProgressBar from '../StorageProgressBar';
import BadgeCount from '../BadgeCount';
import Banner from '../Banner';

interface MoodBoardSidebarProps {
  moodBoards: MoodBoard[];
  selectedMoodBoard: string;
  onSelectMoodBoard: (boardId: string) => void;
  onNewBoard: () => void;
  onEditBoard: (board: MoodBoard) => void;
  onDeleteBoard: (boardId: string) => void;
  inlineEditingBoardId: string | null;
  inlineEditingName: string;
  onInlineEditChange: (name: string) => void;
  onSaveInlineEdit: () => void;
  onCancelInlineEdit: () => void;
  userPlan: any;
  isLoading: boolean;
  mobileViewMode?: 'boards' | 'content' | 'desktop';
  onMobileBoardSelect?: (boardId: string) => void;
  // Storage props
  usedStorage: number;
  totalStorage: number;
  plan: string;
  onUpgrade: () => void;
  // Upgrade banner props
  showUpgradeBanner?: boolean;
  onDismissUpgradeBanner?: () => void;
}

const MoodBoardSidebar: React.FC<MoodBoardSidebarProps> = ({
  moodBoards,
  selectedMoodBoard,
  onSelectMoodBoard,
  onNewBoard,
  onEditBoard,
  onDeleteBoard,
  inlineEditingBoardId,
  inlineEditingName,
  onInlineEditChange,
  onSaveInlineEdit,
  onCancelInlineEdit,
  userPlan,
  isLoading,
  mobileViewMode = 'desktop',
  onMobileBoardSelect,
  usedStorage,
  totalStorage,
  plan,
  onUpgrade,
  showUpgradeBanner = false,
  onDismissUpgradeBanner,
}) => {
  const router = useRouter();
  const [hoveredBoardId, setHoveredBoardId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  const canCreateNewBoard = () => {
    return moodBoards.length < userPlan.maxBoards;
  };

  const handleBoardSelect = (boardId: string) => {
    onSelectMoodBoard(boardId);
    
    // Handle mobile view mode - navigate to individual board page
    if (onMobileBoardSelect) {
      onMobileBoardSelect(boardId);
    } else {
      // For desktop or when not in mobile mode, navigate to individual board page
      router.push(`/moodboards/${boardId}`);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent, boardId: string) => {
    e.stopPropagation();
    setShowDeleteConfirm(boardId);
  };

  const handleDeleteConfirm = (boardId: string) => {
    onDeleteBoard(boardId);
    setShowDeleteConfirm(null);
  };

  const handleInlineEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onSaveInlineEdit();
    } else if (e.key === 'Escape') {
      onCancelInlineEdit();
    }
  };

  if (isLoading) {
    return (
      <aside className={`unified-sidebar mobile-${mobileViewMode}-view`}>
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Fixed Header - matches real sidebar exactly */}
          <div className="flex items-center justify-between p-6 pb-2 border-b border-[#E0DBD7] flex-shrink-0">
            <h4 className="text-lg font-playfair font-medium text-[#332B42] flex items-center">Mood Boards</h4>
            <button
              className="text-xs text-[#332B42] border border-[#AB9C95] rounded-[5px] px-2 py-1 hover:bg-[#F3F2F0] ml-2 flex items-center h-7"
              style={{ alignSelf: 'center' }}
              disabled
            >
              + New Board
            </button>
          </div>
          
          {/* Scrollable Content Area - matches real sidebar exactly */}
          <div className="p-6 pt-0 flex-1 overflow-y-auto">
            <div className="space-y-1 mt-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="px-0 lg:px-3 py-2 rounded-[5px] animate-pulse">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    </div>
                    <div className="w-6 h-6 bg-gray-200 rounded-full"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Fixed Footer - Storage Usage Display - matches real sidebar exactly */}
          <div className="p-4 border-t border-[#E0DBD7] bg-[#F8F6F4] flex-shrink-0">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs text-[#AB9C95]">Storage Usage</div>
              <span className="text-xs text-[#AB9C95]">25MB</span>
            </div>
            <div className="w-full bg-[#E0DBD7] rounded-full h-1 mb-1">
              <div className="bg-[#A85C36] h-1 rounded-full w-1/3"></div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#AB9C95]">32% used</span>
              <button className="text-xs text-[#A85C36] hover:underline font-medium">
                Upgrade
              </button>
            </div>
          </div>
        </div>
      </aside>
    );
  }

  return (
    <aside className={`unified-sidebar mobile-${mobileViewMode}-view`}>
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Fixed Header */}
        <div className="flex items-center justify-between p-6 pb-2 border-b border-[#E0DBD7] flex-shrink-0">
          <h4 className="text-lg font-playfair font-medium text-[#332B42] flex items-center">Mood Boards</h4>
          <button
            onClick={onNewBoard}
            className="text-xs text-[#332B42] border border-[#AB9C95] rounded-[5px] px-2 py-1 hover:bg-[#F3F2F0] ml-2 flex items-center h-7"
            title="Create a new mood board"
            style={{ alignSelf: 'center' }}
          >
            + New Board
          </button>
        </div>
        
        {/* Mobile Upgrade Banner - Only show on mobile */}
        {(() => {
          const shouldShow = mobileViewMode === 'boards' && showUpgradeBanner;
          console.log('Sidebar upgrade banner debug:', { 
            mobileViewMode, 
            showUpgradeBanner, 
            shouldShow 
          });
          return shouldShow;
        })() && (
          <div className="px-4 pt-2 flex-shrink-0">
            <Banner
              message={
                <>
                  You've reached the limit of {userPlan.maxBoards} mood boards for your {userPlan.tier} plan.
                  <button onClick={onUpgrade} className="ml-2 font-semibold underline">Upgrade to create more!</button>
                </>
              }
              type="info"
              onDismiss={onDismissUpgradeBanner}
            />
          </div>
        )}
        
        {/* Scrollable Content Area */}
        <div className="p-6 pt-0 flex-1 overflow-y-auto">
          <div className="space-y-1 mt-4">
            {moodBoards.map((board) => {
              // Force desktop detection - if screen width >= 1024, treat as desktop
              const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 1024;
              const isActive = selectedMoodBoard === board.id && (mobileViewMode === 'desktop' || isDesktop);
              console.log('Desktop active state debug:', { 
                boardName: board.name, 
                boardId: board.id, 
                selectedMoodBoard, 
                mobileViewMode,
                isDesktop,
                isActive,
                className: isActive ? 'bg-[#EBE3DD] border border-[#A85C36]' : 'hover:bg-[#F8F6F4] border border-transparent hover:border-[#AB9C95]'
              });
              return (
              <div
                key={board.id}
                onClick={() => handleBoardSelect(board.id)}
                data-active={isActive}
                className={`px-0 lg:px-3 py-2 rounded-[5px] text-[#332B42] text-sm font-medium cursor-pointer ${
                  isActive 
                    ? 'bg-[#EBE3DD] border border-[#A85C36]' 
                    : 'hover:bg-[#F8F6F4] border border-transparent hover:border-[#AB9C95]'
                }`}
                style={isActive ? { backgroundColor: '#EBE3DD', borderColor: '#A85C36', borderWidth: '1px', borderStyle: 'solid' } : {}}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    {inlineEditingBoardId === board.id ? (
                      <input
                        type="text"
                        value={inlineEditingName}
                        onChange={(e) => onInlineEditChange(e.target.value)}
                        onKeyDown={handleInlineEditKeyDown}
                        onBlur={onSaveInlineEdit}
                        className="w-full bg-transparent border-none outline-none text-sm font-medium text-[#332B42]"
                        autoFocus
                      />
                    ) : (
                      <span className="truncate flex-1 min-w-0" title={board.name}>
                        {board.name}
                      </span>
                    )}
                  </div>
                  <span className="ml-auto">
                    <BadgeCount count={board.images?.length || 0} />
                  </span>
                </div>
                
                {/* Delete confirmation */}
                {showDeleteConfirm === board.id && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-red-200 rounded-[5px] shadow-lg z-10 p-3">
                    <div className="text-xs text-red-600 mb-2">
                      Delete "{board.name}"?
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteConfirm(board.id);
                        }}
                        className="text-xs bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700"
                      >
                        Delete
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowDeleteConfirm(null);
                        }}
                        className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded hover:bg-gray-300"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
              );
            })}
            
            {/* Empty state */}
            {moodBoards.length === 0 && (
              <div className="text-center py-8 text-[#7A7A7A] text-sm">
                <Heart className="w-8 h-8 mx-auto mb-2 text-[#AB9C95]" />
                <div>No mood boards yet</div>
                <div className="text-xs mt-1">Create your first mood board to get started</div>
              </div>
            )}
          </div>
        </div>

        {/* Fixed Footer - Storage Usage Display - styled exactly like files page */}
        <div className="p-4 border-t border-[#E0DBD7] bg-[#F8F6F4] flex-shrink-0">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs text-[#AB9C95]">Storage Usage</div>
            <span className="text-xs text-[#AB9C95]">
              {Math.round(totalStorage / (1024 * 1024))}MB
            </span>
          </div>
          <div className="w-full bg-[#E0DBD7] rounded-full h-1 mb-1">
            <div
              className={`h-1 rounded-full transition-all ${
                (usedStorage / totalStorage) > 0.9 ? 'bg-red-500' : (usedStorage / totalStorage) > 0.7 ? 'bg-yellow-500' : 'bg-[#A85C36]'
              }`}
              style={{ width: `${Math.min((usedStorage / totalStorage) * 100, 100)}%` }}
            />
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-[#AB9C95]">
              {Math.round((usedStorage / totalStorage) * 100)}% used
            </span>
            <button 
              onClick={onUpgrade}
              className="text-xs text-[#A85C36] hover:underline font-medium"
            >
              Upgrade
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default MoodBoardSidebar;
