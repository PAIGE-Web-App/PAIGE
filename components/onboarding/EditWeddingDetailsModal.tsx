'use client';

import React, { useState, useEffect } from 'react';
import { X, Calendar, Users, DollarSign, MapPin } from 'lucide-react';
import LocationAutocomplete from './LocationAutocomplete';
import ContextSuggestions from './ContextSuggestions';

interface EditWeddingDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (values: any) => void;
  initialValues: {
    weddingDate: string | null;
    weddingDateUndecided: boolean;
    guestCount: number;
    budgetAmount: number;
    location: string;
    additionalContext: string;
  };
}

const EditWeddingDetailsModal: React.FC<EditWeddingDetailsModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialValues
}) => {
  const [editedValues, setEditedValues] = useState<any>({});
  const [hasChanges, setHasChanges] = useState(false);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setEditedValues({});
      setHasChanges(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Helper functions
  const getCurrentValue = (field: string) => {
    return editedValues[field] !== undefined ? editedValues[field] : initialValues[field as keyof typeof initialValues];
  };

  const handleFieldChange = (field: string, value: any) => {
    const newEditedValues = { ...editedValues, [field]: value };
    setEditedValues(newEditedValues);
    
    // Check if any values have changed
    const hasAnyChanges = Object.keys(newEditedValues).some(key => 
      newEditedValues[key] !== initialValues[key as keyof typeof initialValues]
    );
    setHasChanges(hasAnyChanges);
  };

  const handleCancel = () => {
    setEditedValues({});
    setHasChanges(false);
    onClose();
  };

  const handleSave = () => {
    if (!hasChanges) return;
    onSave(editedValues);
    setEditedValues({});
    setHasChanges(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[10000]">
      <div className="bg-white rounded-[5px] shadow-xl max-w-md w-full max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
          <h3 className="font-playfair text-lg text-[#332B42]">Edit Wedding Details</h3>
          <button onClick={handleCancel} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Wedding Date */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-[#332B42]">
              <Calendar className="w-4 h-4 text-[#A85C36]" />
              Wedding Date:
            </label>
            {getCurrentValue('weddingDateUndecided') ? (
              <input
                type="text"
                value="TBD"
                disabled
                className="w-full px-3 py-2 border rounded-[5px] border-[#AB9C95] bg-white text-sm opacity-50 cursor-not-allowed"
              />
            ) : (
              <input
                type="date"
                value={(() => {
                  const weddingDate = getCurrentValue('weddingDate');
                  if (!weddingDate || weddingDate === 'TBD') {
                    return '';
                  }
                  try {
                    // If it's already in YYYY-MM-DD format, use it directly
                    if (typeof weddingDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(weddingDate)) {
                      return weddingDate;
                    }
                    // Otherwise, parse as ISO string and convert to local date
                    const date = new Date(weddingDate);
                    const year = date.getFullYear();
                    const month = String(date.getMonth() + 1).padStart(2, '0');
                    const day = String(date.getDate()).padStart(2, '0');
                    return `${year}-${month}-${day}`;
                  } catch {
                    return '';
                  }
                })()}
                onChange={(e) => {
                  if (e.target.value) {
                    // Create date in local timezone to avoid timezone conversion issues
                    const [year, month, day] = e.target.value.split('-').map(Number);
                    const localDate = new Date(year, month - 1, day);
                    handleFieldChange('weddingDate', localDate.toISOString());
                  } else {
                    handleFieldChange('weddingDate', null);
                  }
                }}
                disabled={getCurrentValue('weddingDateUndecided')}
                min={new Date().toISOString().split("T")[0]}
                className={`w-full px-3 py-2 border rounded-[5px] border-[#AB9C95] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#A85C36] ${getCurrentValue('weddingDateUndecided') ? "text-[#AB9C95] cursor-not-allowed opacity-50" : ""}`}
              />
            )}
            <label className="flex items-center gap-2 text-xs text-[#7A7A7A]">
              <input
                type="checkbox"
                checked={getCurrentValue('weddingDateUndecided') || false}
                onChange={() => {
                  const currentUndecided = getCurrentValue('weddingDateUndecided') || false;
                  if (!currentUndecided) {
                    // If checking "we haven't decided yet", clear the wedding date
                    handleFieldChange('weddingDate', '');
                  }
                  handleFieldChange('weddingDateUndecided', !currentUndecided);
                }}
                className="w-3 h-3 text-[#A85C36] border-gray-300 rounded focus:ring-[#A85C36]"
              />
              We haven't decided yet
            </label>
          </div>

          {/* Guest Count */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-[#332B42]">
              <Users className="w-4 h-4 text-[#A85C36]" />
              Guest Count:
            </label>
            <input
              type="number"
              value={getCurrentValue('guestCount') || ''}
              onChange={(e) => handleFieldChange('guestCount', parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 border rounded-[5px] border-[#AB9C95] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#A85C36]"
              placeholder="Enter guest count"
            />
          </div>

          {/* Budget */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-[#332B42]">
              <DollarSign className="w-4 h-4 text-[#A85C36]" />
              Budget:
            </label>
            <input
              type="number"
              value={getCurrentValue('budgetAmount') || ''}
              onChange={(e) => handleFieldChange('budgetAmount', parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 border rounded-[5px] border-[#AB9C95] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#A85C36]"
              placeholder="Enter budget amount"
            />
          </div>

          {/* Location */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-[#332B42]">
              <MapPin className="w-4 h-4 text-[#A85C36]" />
              Location:
            </label>
            <LocationAutocomplete
              value={getCurrentValue('location') || ''}
              onChange={(value) => handleFieldChange('location', value)}
            />
          </div>

          {/* Additional Context */}
          <ContextSuggestions
            value={getCurrentValue('additionalContext') || ''}
            onChange={(value) => handleFieldChange('additionalContext', value)}
          />
        </div>

        {/* Fixed Footer */}
        <div className="flex gap-3 p-6 border-t border-gray-200 flex-shrink-0">
          <button
            onClick={handleCancel}
            className="btn-primaryinverse flex-1"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!hasChanges}
            className={`btn-primary flex-1 ${!hasChanges ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            Regenerate Plan
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditWeddingDetailsModal;
