import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MapPin } from 'lucide-react';
import { TableType } from '../../types/seatingChart';

interface AddVenueItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddVenueItem: (venueItem: Omit<TableType, 'id'>) => void;
}

const VENUE_ITEM_TYPES = [
  { id: 'round', name: 'Round Area', icon: '●', description: 'Circular space (DJ booth, cake display)' },
  { id: 'long', name: 'Rectangular Area', icon: '▭', description: 'Rectangular space (dance floor, bar area)' }
];

const VENUE_ITEM_PRESETS = [
  { name: 'DJ Booth', description: 'Area for DJ equipment and setup', type: 'round' },
  { name: 'Dance Floor', description: 'Open area for dancing', type: 'long' },
  { name: 'Cake Table', description: 'Display area for wedding cake', type: 'round' },
  { name: 'Bar Area', description: 'Space for bar service', type: 'long' },
  { name: 'Photo Booth', description: 'Area for photo booth setup', type: 'round' },
  { name: 'Gift Table', description: 'Table for gifts and cards', type: 'long' },
  { name: 'Guest Book', description: 'Area for guest book signing', type: 'round' },
  { name: 'Ceremony Space', description: 'Area for ceremony setup', type: 'long' }
];

export default function AddVenueItemModal({ isOpen, onClose, onAddVenueItem }: AddVenueItemModalProps) {
  const [venueItemData, setVenueItemData] = useState({
    name: '',
    type: 'round' as 'round' | 'long',
    description: ''
  });
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (venueItemData.name.trim()) {
      onAddVenueItem({
        name: venueItemData.name.trim(),
        type: venueItemData.type,
        capacity: 0, // Venue items don't have seating capacity
        description: venueItemData.description.trim() || '',
        isDefault: false,
        isVenueItem: true
      });
      handleClose();
    }
  };

  const handleClose = () => {
    setVenueItemData({
      name: '',
      type: 'round',
      description: ''
    });
    setSelectedPreset(null);
    onClose();
  };

  const handlePresetSelect = (preset: typeof VENUE_ITEM_PRESETS[0]) => {
    setVenueItemData({
      name: preset.name,
      type: preset.type as 'round' | 'long',
      description: preset.description
    });
    setSelectedPreset(preset.name);
  };

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
              <div className="bg-purple-600 bg-opacity-10 rounded-full p-2">
                <MapPin className="w-6 h-6 text-purple-600" />
              </div>
              <h5 className="h5 text-left text-lg md:text-xl">Add Venue Item</h5>
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
                Add venue items like DJ booths, dance floors, cake areas, and other non-seating elements to your layout.
              </p>
            </div>

            {/* Quick Presets */}
            <div className="mb-6">
              <h6 className="font-medium text-[#332B42] mb-3">Quick Presets:</h6>
              <div className="grid grid-cols-2 gap-2">
                {VENUE_ITEM_PRESETS.map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => handlePresetSelect(preset)}
                    className={`p-2 text-xs border rounded-[5px] transition-all text-left ${
                      selectedPreset === preset.name
                        ? 'border-[#A85C36] bg-[#A85C36]/10 text-[#A85C36]'
                        : 'border-[#AB9C95] hover:border-[#A85C36] hover:bg-[#A85C36]/5 text-[#332B42]'
                    }`}
                  >
                    <div className="font-medium">{preset.name}</div>
                    <div className={`truncate ${
                      selectedPreset === preset.name ? 'text-[#A85C36]/70' : 'text-gray-500'
                    }`}>{preset.description}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Shape Type Selection */}
            <div className="mb-6">
              <h6 className="font-medium text-[#332B42] mb-3">Shape Type:</h6>
              <div className="grid grid-cols-2 gap-3">
                {VENUE_ITEM_TYPES.map((type) => (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => setVenueItemData(prev => ({ ...prev, type: type.id as 'round' | 'long' }))}
                    className={`p-3 rounded-[5px] border-2 transition-all ${
                      venueItemData.type === type.id
                        ? 'border-[#A85C36] bg-[#A85C36]/10 text-[#A85C36]'
                        : 'border-[#AB9C95] hover:border-[#A85C36] text-[#332B42]'
                    }`}
                  >
                    <div className="text-2xl mb-1">{type.icon}</div>
                    <div className="text-sm font-medium">{type.name}</div>
                    <div className="text-xs text-gray-500 mt-1">{type.description}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Venue Item Name */}
            <div className="mb-6">
              <h6 className="font-medium text-[#332B42] mb-3">Item Name:</h6>
              <input
                type="text"
                value={venueItemData.name}
                onChange={(e) => setVenueItemData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., DJ Booth, Dance Floor, Cake Area"
                className="w-full border border-[#AB9C95] px-3 py-2 rounded-[5px] text-sm bg-white text-[#332B42] focus:outline-none focus:ring-2 focus:ring-[#A85C36]"
                required
              />
            </div>

            {/* Description */}
            <div className="mb-6">
              <h6 className="font-medium text-[#332B42] mb-3">Description (Optional):</h6>
              <input
                type="text"
                value={venueItemData.description}
                onChange={(e) => setVenueItemData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="e.g., Near the entrance, Corner area, Center of room"
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
                disabled={!venueItemData.name.trim()}
                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <MapPin className="w-4 h-4" />
                Add Venue Item
              </button>
            </div>
          </div>
        </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
