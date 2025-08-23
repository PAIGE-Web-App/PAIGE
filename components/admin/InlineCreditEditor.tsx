import React, { useState } from 'react';
import { Edit2, Check, X, Loader2 } from 'lucide-react';
import { useCustomToast } from '@/hooks/useCustomToast';

interface InlineCreditEditorProps {
  userId: string;
  currentCredits: number;
  onSave: (userId: string, newCredits: number) => Promise<void>;
  isLoading?: boolean;
}

export default function InlineCreditEditor({ 
  userId, 
  currentCredits, 
  onSave, 
  isLoading = false 
}: InlineCreditEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(currentCredits.toString());
  const [saving, setSaving] = useState(false);
  const { showSuccessToast, showErrorToast } = useCustomToast();

  const handleEdit = () => {
    setIsEditing(true);
    setEditValue(currentCredits.toString());
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditValue(currentCredits.toString());
  };

  const handleSave = async () => {
    const newCredits = parseInt(editValue);
    if (isNaN(newCredits) || newCredits < 0) {
      return;
    }

    try {
      setSaving(true);
      await onSave(userId, newCredits);
      setIsEditing(false);
      showSuccessToast(`Credits updated to ${newCredits}`);
    } catch (error) {
      console.error('Failed to save credits:', error);
      // Show error to user
      showErrorToast(`Failed to update credits: ${error.message}`);
      // Reset to original value on error
      setEditValue(currentCredits.toString());
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-2">
        <input
          type="number"
          min="0"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          disabled={saving}
        />
        <div className="flex items-center gap-1">
          <button
            onClick={handleSave}
            disabled={saving}
            className="p-1 text-green-600 hover:text-green-800 hover:bg-green-50 rounded transition-colors disabled:opacity-50"
            title="Save"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Check className="w-4 h-4" />
            )}
          </button>
          <button
            onClick={handleCancel}
            disabled={saving}
            className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
            title="Cancel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium text-gray-900">
        {currentCredits}
      </span>
      <button
        onClick={handleEdit}
        disabled={isLoading}
        className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded transition-colors disabled:opacity-50"
        title="Edit credits"
      >
        <Edit2 className="w-3 h-3" />
      </button>
    </div>
  );
}
