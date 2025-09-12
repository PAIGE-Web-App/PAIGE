import React, { useRef, useEffect } from 'react';
import { Edit2 } from 'lucide-react';

interface EditableFieldProps {
  value: string;
  isEditing: boolean;
  onStartEdit: () => void;
  onSave: (value: string) => void;
  onCancel?: () => void;
  placeholder?: string;
  type?: 'text' | 'number' | 'textarea';
  className?: string;
  disabled?: boolean;
  showEditIcon?: boolean;
  autoFocus?: boolean;
}

const EditableField: React.FC<EditableFieldProps> = ({
  value,
  isEditing,
  onStartEdit,
  onSave,
  onCancel,
  placeholder = 'Click to edit...',
  type = 'text',
  className = '',
  disabled = false,
  showEditIcon = true,
  autoFocus = true
}) => {
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const [editValue, setEditValue] = React.useState(value);

  // Reset edit value when value prop changes
  useEffect(() => {
    setEditValue(value);
  }, [value]);

  // Auto-focus when editing starts
  useEffect(() => {
    if (isEditing && autoFocus && inputRef.current) {
      inputRef.current.focus();
      if (type === 'text' || type === 'number') {
        (inputRef.current as HTMLInputElement).select();
      }
    }
  }, [isEditing, autoFocus, type]);

  const handleStartEdit = () => {
    if (!disabled) {
      onStartEdit();
    }
  };

  const handleSave = () => {
    if (editValue.trim() !== value) {
      onSave(editValue.trim());
    }
  };

  const handleCancel = () => {
    setEditValue(value);
    onCancel?.();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (type === 'textarea' && e.shiftKey) {
        return; // Allow new line with Shift+Enter
      }
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  };

  const handleBlur = () => {
    handleSave();
  };

  if (isEditing) {
    const inputProps = {
      ref: inputRef as any,
      value: editValue,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setEditValue(e.target.value),
      onKeyDown: handleKeyDown,
      onBlur: handleBlur,
      placeholder,
      className: `w-full px-2 py-1 border border-[#AB9C95] rounded-[3px] text-sm focus:outline-none focus:border-[#A85C36] ${className}`,
      disabled
    };

    if (type === 'textarea') {
      return (
        <textarea
          {...inputProps}
          rows={2}
          className={`${inputProps.className} resize-none`}
        />
      );
    }

    return (
      <input
        {...inputProps}
        type={type}
      />
    );
  }

  return (
    <div
      onClick={handleStartEdit}
      className={`flex items-center gap-2 w-full cursor-pointer hover:bg-[#F3F2F0] rounded px-1 py-0.5 transition-colors ${
        disabled ? 'cursor-not-allowed opacity-50' : ''
      } ${className}`}
      title={disabled ? 'Cannot edit' : 'Click to edit'}
    >
      <span className="flex-1 break-words">{value || placeholder}</span>
      {showEditIcon && !disabled && (
        <Edit2 className="w-3 h-3 text-[#AB9C95] opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
      )}
    </div>
  );
};

export default EditableField; 