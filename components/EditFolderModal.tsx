import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { FileFolder } from '@/types/files';

interface EditFolderModalProps {
  isOpen: boolean;
  folder: FileFolder | null;
  onClose: () => void;
  onSave: (folderId: string, name: string, description?: string, color?: string) => Promise<void>;
  isLoading?: boolean;
}

const EditFolderModal: React.FC<EditFolderModalProps> = ({
  isOpen,
  folder,
  onClose,
  onSave,
  isLoading = false
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#AB9C95');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Pre-populate form when folder changes
  useEffect(() => {
    if (folder) {
      setName(folder.name);
      setDescription(folder.description || '');
      setColor(folder.color || '#AB9C95');
    }
  }, [folder]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!folder || !name.trim()) return;

    setIsSubmitting(true);
    try {
      // Only pass description if it's not empty, otherwise pass undefined to not include it
      const descriptionToSave = description.trim() || undefined;
      await onSave(folder.id, name.trim(), descriptionToSave, color);
      onClose();
    } catch (error) {
      console.error('Error updating folder:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
    }
  };

  if (!isOpen || !folder) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-[10px] p-6 w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-[#332B42]">Edit Folder</h2>
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="p-2 hover:bg-[#F8F6F4] rounded-full transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5 text-[#AB9C95]" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Folder Name */}
          <div>
            <label htmlFor="folder-name" className="block text-sm font-medium text-[#332B42] mb-2">
              Folder Name *
            </label>
            <input
              type="text"
              id="folder-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-[#E0DBD7] rounded-[5px] focus:outline-none focus:border-[#A85C36] transition-colors"
              placeholder="Enter folder name"
              required
              disabled={isSubmitting}
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="folder-description" className="block text-sm font-medium text-[#332B42] mb-2">
              Description (Optional)
            </label>
            <textarea
              id="folder-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-[#E0DBD7] rounded-[5px] focus:outline-none focus:border-[#A85C36] transition-colors resize-none"
              placeholder="Enter folder description"
              rows={3}
              disabled={isSubmitting}
            />
          </div>

          {/* Color Picker */}
          <div>
            <label className="block text-sm font-medium text-[#332B42] mb-2">
              Folder Color
            </label>
            <div className="flex gap-2">
              {[
                '#a34d54', '#894a6b', '#654d74', '#424d6b', '#2f4858',
                '#966b1f', '#7a7917', '#52862b', '#008f4f', '#00957d',
                '#4c8076', '#55433b', '#c4515c', '#a84baa'
              ].map((colorOption) => (
                <button
                  key={colorOption}
                  type="button"
                  onClick={() => setColor(colorOption)}
                  className={`w-5 h-5 aspect-square transition-colors ${
                    color === colorOption ? 'border border-[#332B42]' : 'border border-[#E0DBD7]'
                  }`}
                  style={{ backgroundColor: colorOption, borderRadius: '50%' }}
                  disabled={isSubmitting}
                />
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-4">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="btn-primaryinverse px-4 py-2 text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="btn-primary px-4 py-2 text-sm"
            >
              {isSubmitting ? 'Updating...' : 'Update Folder'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditFolderModal; 