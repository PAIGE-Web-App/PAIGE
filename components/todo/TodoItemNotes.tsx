import React, { useState, useCallback } from 'react';
import { NotepadText } from 'lucide-react';
import { TodoItem } from '@/types/todo';
import EditableField from '../common/EditableField';

interface TodoItemNotesProps {
  todo: TodoItem;
  isEditing: boolean;
  onStartEdit: () => void;
  onSave: (value: string) => void;
  onCancel: () => void;
  disabled?: boolean;
}

const TodoItemNotes: React.FC<TodoItemNotesProps> = ({
  todo,
  isEditing,
  onStartEdit,
  onSave,
  onCancel,
  disabled = false
}) => {
  const handleNotesClick = useCallback(() => {
    if (!disabled) {
      onStartEdit();
    }
  }, [disabled, onStartEdit]);

  if (!todo.note && !isEditing) {
    return null;
  }

  return (
    <div className="flex items-start gap-1 mt-1">
      <NotepadText size={12} className="text-[#AB9C95] mt-0.5 flex-shrink-0" />
      <EditableField
        value={todo.note || ''}
        isEditing={isEditing}
        onStartEdit={handleNotesClick}
        onSave={onSave}
        onCancel={onCancel}
        type="textarea"
        placeholder="+ Add Note"
        className="text-xs text-[#AB9C95] flex-1"
        disabled={disabled}
        showEditIcon={false}
      />
    </div>
  );
};

export default TodoItemNotes; 