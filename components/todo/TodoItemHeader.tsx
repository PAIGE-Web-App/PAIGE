import React, { useState, useRef, useCallback, useEffect } from 'react';
import { MoreHorizontal, Trash2 } from 'lucide-react';
import { TodoItem } from '@/types/todo';
import { highlightText } from '@/utils/searchHighlight';
import EditableField from '../common/EditableField';

interface TodoItemHeaderProps {
  todo: TodoItem;
  mode: 'page' | 'editor';
  searchQuery?: string;
  isEditing: boolean;
  onStartEdit: () => void;
  onSave: (value: string) => void;
  onCancel: () => void;
  onClone: () => void;
  onMove: () => void;
  onDelete: () => void;
  onRemove?: () => void;
  disabled?: boolean;
}

const TodoItemHeader: React.FC<TodoItemHeaderProps> = ({
  todo,
  mode,
  searchQuery,
  isEditing,
  onStartEdit,
  onSave,
  onCancel,
  onClone,
  onMove,
  onDelete,
  onRemove,
  disabled = false
}) => {
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  // Handle click outside for more menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
        setShowMoreMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleToggleMenu = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMoreMenu(prev => !prev);
  }, []);

  const handleNameDoubleClick = useCallback(() => {
    if (!disabled) {
      onStartEdit();
    }
  }, [disabled, onStartEdit]);

  return (
    <div className="flex items-center justify-between">
      <div className="flex-1 min-w-0">
        <EditableField
          value={todo.name || '+ Add To-Do Name'}
          isEditing={isEditing}
          onStartEdit={handleNameDoubleClick}
          onSave={onSave}
          onCancel={onCancel}
          placeholder="Enter task name..."
          className={`font-work text-xs font-medium text-[#332B42] ${
            todo.isCompleted ? 'line-through text-gray-500' : ''
          }`}
          disabled={disabled}
          showEditIcon={false}
        />
        {!isEditing && todo.name && searchQuery && (
          <div className="text-xs text-[#332B42]">
            {highlightText(todo.name, searchQuery)}
          </div>
        )}
      </div>

      {/* Three-dot menu button (only in page mode) */}
      {mode === 'page' && (
        <div className="relative" ref={moreMenuRef}>
          <button
            onClick={handleToggleMenu}
            className="p-1 hover:bg-gray-100 rounded-full"
            title="More options"
          >
            <MoreHorizontal size={16} className="text-gray-500" />
          </button>
          {/* Dropdown menu */}
          {showMoreMenu && (
            <div className="absolute right-0 mt-1 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-10">
              <button
                onClick={() => {
                  onClone();
                  setShowMoreMenu(false);
                }}
                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                Clone
              </button>
              <button
                onClick={() => {
                  onMove();
                  setShowMoreMenu(false);
                }}
                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                Move
              </button>
              <button
                onClick={() => {
                  onDelete();
                  setShowMoreMenu(false);
                }}
                className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
              >
                Delete
              </button>
            </div>
          )}
        </div>
      )}

      {/* Delete icon (only in editor mode) */}
      {mode === 'editor' && onRemove && (
        <button
          onClick={onRemove}
          className="p-1 hover:bg-gray-100 rounded-full"
          title="Delete"
        >
          <Trash2 size={16} className="text-red-500" />
        </button>
      )}
    </div>
  );
};

export default TodoItemHeader; 