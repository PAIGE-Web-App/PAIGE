import React from 'react';

interface TableEditModalProps {
  isOpen: boolean;
  tableName: string;
  tableDescription: string;
  onNameChange: (name: string) => void;
  onDescriptionChange: (description: string) => void;
  onSave: () => void;
  onCancel: () => void;
}

export const TableEditModal: React.FC<TableEditModalProps> = ({
  isOpen,
  tableName,
  tableDescription,
  onNameChange,
  onDescriptionChange,
  onSave,
  onCancel
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-96">
        <h3 className="text-lg font-semibold mb-4">Edit Table</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Table Name</label>
            <input
              type="text"
              value={tableName}
              onChange={(e) => onNameChange(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Description (Optional)</label>
            <input
              type="text"
              value={tableDescription}
              onChange={(e) => onDescriptionChange(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2"
            />
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onSave} className="btn-primary flex-1">
            Save Changes
          </button>
          <button onClick={onCancel} className="btn-primaryinverse flex-1">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
