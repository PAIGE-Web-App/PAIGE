import React, { useState, useCallback, useMemo } from 'react';
import { Calendar, Clock } from 'lucide-react';
import { TodoItem } from '@/types/todo';

interface TodoItemDeadlineProps {
  todo: TodoItem;
  isEditing: boolean;
  onStartEdit: () => void;
  onSave: (value: string) => void;
  onCancel: () => void;
  onUpdateEndDate: (endDate: string) => void;
  onRemoveEndDate: () => void;
  disabled?: boolean;
}

const TodoItemDeadline: React.FC<TodoItemDeadlineProps> = ({
  todo,
  isEditing,
  onStartEdit,
  onSave,
  onCancel,
  onUpdateEndDate,
  onRemoveEndDate,
  disabled = false
}) => {
  const [isEditingEndDate, setIsEditingEndDate] = useState(false);
  const [endDateValue, setEndDateValue] = useState('');

  // Simple deadline display
  const deadlineDisplay = useMemo(() => {
    if (!todo.deadline) return null;
    
    try {
      const deadline = new Date(todo.deadline);
      const now = new Date();
      const diffInMs = deadline.getTime() - now.getTime();
      const diffInDays = Math.ceil(diffInMs / (1000 * 60 * 60 * 24));
      
      if (diffInMs < 0) {
        return { text: `${Math.abs(diffInDays)} day${Math.abs(diffInDays) !== 1 ? 's' : ''} overdue`, color: 'text-red-500' };
      } else if (diffInDays === 0) {
        return { text: 'Due today', color: 'text-orange-500' };
      } else if (diffInDays === 1) {
        return { text: 'Due tomorrow', color: '' };
      } else if (diffInDays <= 7) {
        return { text: `Due in ${diffInDays} days`, color: '' };
      } else {
        return { text: deadline.toLocaleDateString(), color: '' };
      }
    } catch {
      return { text: 'Invalid date', color: 'text-red-500' };
    }
  }, [todo.deadline]);

  const handleStartEditEndDate = useCallback(() => {
    if (!disabled) {
      setIsEditingEndDate(true);
      setEndDateValue(todo.endDate ? todo.endDate.toString() : '');
    }
  }, [todo.endDate, disabled]);

  const handleSaveEndDate = useCallback(() => {
    if (endDateValue.trim()) {
      onUpdateEndDate(endDateValue);
    }
    setIsEditingEndDate(false);
  }, [endDateValue, onUpdateEndDate]);

  const handleCancelEndDate = useCallback(() => {
    setIsEditingEndDate(false);
    setEndDateValue('');
  }, []);

  const handleRemoveEndDate = useCallback(() => {
    onRemoveEndDate();
  }, [onRemoveEndDate]);

  if (!todo.deadline && !todo.endDate && !isEditing) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 text-xs text-[#AB9C95]">
      <Calendar size={12} />
      
      {/* Deadline Display */}
      {todo.deadline && deadlineDisplay && (
        <div className="flex items-center gap-1">
          <span className={deadlineDisplay.color}>
            {deadlineDisplay.text}
          </span>
          {isEditing && (
            <button
              onClick={onStartEdit}
              className="text-xs text-[#A85C36] hover:underline"
              disabled={disabled}
            >
              Edit
            </button>
          )}
        </div>
      )}

      {/* End Date Display/Editing */}
      {todo.endDate && (
        <div className="flex items-center gap-1">
          <Clock size={12} />
          {isEditingEndDate ? (
            <div className="flex items-center gap-1">
              <input
                type="datetime-local"
                value={endDateValue}
                onChange={(e) => setEndDateValue(e.target.value)}
                className="text-xs border border-[#AB9C95] rounded px-1 py-0.5"
                autoFocus
              />
              <button
                onClick={handleSaveEndDate}
                className="text-xs text-[#A85C36] hover:underline"
              >
                Save
              </button>
              <button
                onClick={handleCancelEndDate}
                className="text-xs text-gray-500 hover:underline"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <span>{new Date(todo.endDate).toLocaleString()}</span>
              {isEditing && (
                <>
                  <button
                    onClick={handleStartEditEndDate}
                    className="text-xs text-[#A85C36] hover:underline"
                  >
                    Edit
                  </button>
                  <button
                    onClick={handleRemoveEndDate}
                    className="text-xs text-red-500 hover:underline"
                  >
                    Remove
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* Add End Date (when editing and no end date exists) */}
      {isEditing && !todo.endDate && (
        <button
          onClick={handleStartEditEndDate}
          className="text-xs text-[#A85C36] hover:underline flex items-center gap-1"
        >
          <Clock size={12} />
          Add End Date
        </button>
      )}
    </div>
  );
};

export default TodoItemDeadline; 