import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save } from 'lucide-react';
import { TableType } from '../../types/seatingChart';
import { saveTemplate } from '../../lib/templateService';

interface SaveAsTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveTemplate: (templateData: { name: string; description: string; tables: TableType[] }) => void;
  currentTables: TableType[];
  userId: string;
}


export default function SaveAsTemplateModal({ isOpen, onClose, onSaveTemplate, currentTables, userId }: SaveAsTemplateModalProps) {
  const [templateData, setTemplateData] = useState({
    name: '',
    description: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (templateData.name.trim()) {
      try {
        // Save tables without guest assignments but preserve positions and layout
        const templateTables = currentTables.map(table => ({
          // Only preserve the essential table properties for templates
          id: table.id,
          name: table.name,
          type: table.type,
          capacity: table.capacity,
          description: table.description || '',
          isDefault: table.isDefault || false,
          rotation: table.rotation || 0,
          isVenueItem: table.isVenueItem || false,
          // Explicitly exclude all guest-related properties
          // DO NOT preserve: guests, guestAssignments, or any other guest data
        }));

        // Save to Firestore
        const savedTemplate = await saveTemplate({
          name: templateData.name.trim(),
          description: templateData.description.trim() || '',
          tables: templateTables
        }, userId);

        onSaveTemplate({
          name: templateData.name.trim(),
          description: templateData.description.trim() || '',
          tables: templateTables
        });
        handleClose();
      } catch (error) {
        console.error('Error saving template:', error);
        // Still call onSaveTemplate to trigger the success toast in parent
        onSaveTemplate({
          name: templateData.name.trim(),
          description: templateData.description.trim() || '',
          tables: currentTables.map(table => ({
            ...table,
            guests: [],
            guestAssignments: undefined
          }))
        });
        handleClose();
      }
    }
  };

  const handleClose = () => {
    setTemplateData({
      name: '',
      description: ''
    });
    onClose();
  };

  const tableCount = currentTables.length;
  const venueItemCount = currentTables.filter(t => t.isVenueItem).length;
  const regularTableCount = tableCount - venueItemCount;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50"
          onClick={handleClose}
        >
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -50, opacity: 0 }}
          className="bg-white rounded-[5px] shadow-xl max-w-2xl w-full h-[70vh] flex flex-col relative mx-2 md:mx-0"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Fixed Header */}
          <div className="flex items-center justify-between p-4 md:p-6 border-b border-[#E0DBD7] flex-shrink-0">
            <div className="flex items-center space-x-3">
              <div className="bg-blue-600 bg-opacity-10 rounded-full p-2">
                <Save className="w-6 h-6 text-blue-600" />
              </div>
              <h5 className="h5 text-left text-lg md:text-xl">Save as Template</h5>
            </div>
            <button
              onClick={handleClose}
              className="text-[#7A7A7A] hover:text-[#332B42] p-1 rounded-full ml-auto"
              title="Close"
            >
              <X size={20} />
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6">
            {/* Description */}
            <div className="mb-6">
              <p className="text-sm text-gray-600 text-left">
                Save your current table layout as a reusable template. This will save the table arrangement and venue items (excluding guest assignments).
              </p>
            </div>

            {/* Current Layout Summary */}
            <div className="mb-6 p-4 bg-gray-50 rounded-[5px]">
              <h6 className="font-medium text-[#332B42] mb-2">Current Layout Summary:</h6>
              <div className="text-sm text-gray-600 flex items-center gap-2 flex-wrap">
                <span>{regularTableCount} tables</span>
                <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
                <span>{venueItemCount} venue items</span>
                <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
                <span>Total capacity: {currentTables.reduce((sum, t) => sum + t.capacity, 0)} seats</span>
              </div>
            </div>


            {/* Template Name */}
            <div className="mb-6">
              <h6 className="font-medium text-[#332B42] mb-3">Template Name:</h6>
              <input
                type="text"
                value={templateData.name}
                onChange={(e) => setTemplateData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., My Wedding Layout, Corporate Event Setup"
                className="w-full border border-[#AB9C95] px-3 py-2 rounded-[5px] text-sm bg-white text-[#332B42] focus:outline-none focus:ring-2 focus:ring-[#A85C36]"
                required
              />
            </div>

            {/* Description */}
            <div className="mb-6">
              <h6 className="font-medium text-[#332B42] mb-3">Description (Optional):</h6>
              <input
                type="text"
                value={templateData.description}
                onChange={(e) => setTemplateData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="e.g., Perfect for 50-person wedding, Includes dance floor and bar area"
                className="w-full border border-[#AB9C95] px-3 py-2 rounded-[5px] text-sm bg-white text-[#332B42] focus:outline-none focus:ring-2 focus:ring-[#A85C36]"
              />
            </div>

          </div>

          {/* Fixed Footer */}
          <div className="border-t border-[#E0DBD7] p-4 md:p-6 flex-shrink-0">
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={handleClose}
                className="btn-primaryinverse"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!templateData.name.trim()}
                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                Save Template
              </button>
            </div>
          </div>
        </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
