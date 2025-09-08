"use client";
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Users, Trash2 } from 'lucide-react';
import { getCategoryHexColor } from '@/utils/categoryStyle';

interface EditGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  group: {
    id: string;
    name: string;
    type: string;
    guestIds: string[];
  } | null;
  allGuests: Array<{
    id: string;
    fullName: string;
  }>;
  onUpdateGroup: (groupId: string, updates: {
    name: string;
    type: string;
    guestIds: string[];
  }) => void;
  onDeleteGroup: (groupId: string) => void;
}

export default function EditGroupModal({
  isOpen,
  onClose,
  group,
  allGuests,
  onUpdateGroup,
  onDeleteGroup,
}: EditGroupModalProps) {
  const [groupName, setGroupName] = useState('');
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [groupNameError, setGroupNameError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Initialize form when group changes
  useEffect(() => {
    if (group) {
      setGroupName(group.name);
      setSelectedMemberIds(group.guestIds);
      setGroupNameError('');
    }
  }, [group]);

  // Helper function to get group color using category color system
  const getGroupColor = (groupName: string): string => {
    return getCategoryHexColor(groupName);
  };

  const handleSubmit = () => {
    if (!group) return;
    
    if (!groupName.trim()) {
      setGroupNameError('Group name is required');
      return;
    }
    if (selectedMemberIds.length < 2) {
      setGroupNameError('At least 2 guests must be selected');
      return;
    }

    onUpdateGroup(group.id, {
      name: groupName.trim(),
      type: 'group', // Default type since we're removing the dropdown
      guestIds: selectedMemberIds,
    });

    handleClose();
  };

  const handleDelete = () => {
    if (!group) return;
    
    if (window.confirm(`Are you sure you want to delete the group "${group.name}"? This will remove all group associations for the guests.`)) {
      onDeleteGroup(group.id);
      handleClose();
    }
  };

  const handleClose = () => {
    setGroupName('');
    setSelectedMemberIds([]);
    setGroupNameError('');
    setSearchTerm('');
    onClose();
  };

  // Filter guests based on search term
  const filteredGuests = allGuests.filter(guest =>
    guest.fullName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleGuestSelection = (guestId: string) => {
    setSelectedMemberIds(prev => {
      if (prev.includes(guestId)) {
        return prev.filter(id => id !== guestId);
      } else {
        return [...prev, guestId];
      }
    });
  };

  if (!isOpen || !group) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={handleClose}
    >
      <motion.div
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -50, opacity: 0 }}
        className="bg-white rounded-[5px] border border-[#AB9C95] max-w-2xl w-full max-h-[80vh] flex flex-col mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 pb-4 border-b border-[#E0DBD7] flex-shrink-0">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-playfair font-semibold text-[#332B42]">
              Edit Group
            </h3>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-[#F8F6F4] rounded-[3px] transition-colors"
            >
              <X className="w-5 h-5 text-[#AB9C95]" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 pt-4">
          {/* Group Name */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-[#332B42] mb-2">
              Group Name *
            </label>
            <input
              type="text"
              value={groupName}
              onChange={(e) => {
                setGroupName(e.target.value);
                if (groupNameError) setGroupNameError('');
              }}
              placeholder="e.g., Smith Family, Johnson Couple, Work Friends"
              className={`w-full border px-4 py-2 text-sm rounded-[5px] bg-white text-[#332B42] focus:outline-none focus:ring-2 focus:ring-[#A85C36] ${
                groupNameError ? 'border-red-500' : 'border-[#AB9C95]'
              }`}
            />
            {groupNameError && (
              <p className="text-red-500 text-xs mt-1">{groupNameError}</p>
            )}
          </div>


          {/* Guest Selection */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-[#332B42]">
                Select Guests to Include in Group *
              </label>
              <div className="text-xs text-[#AB9C95]">
                {selectedMemberIds.length} of {allGuests.length} selected
              </div>
            </div>
            
            {/* Search Input */}
            <div className="relative mb-3">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-4 w-4 text-[#AB9C95]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Search guests by name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2 text-sm text-[#332B42] border border-[#AB9C95] rounded-[5px] focus:border-[#A85C36] focus:ring-1 focus:ring-[#A85C36] focus:outline-none bg-white"
              />
            </div>

            {/* Guest Table */}
            <div className="border border-[#E0DBD7] rounded-[5px] overflow-hidden">
              <div className="max-h-64 overflow-y-auto">
                <table className="w-full">
                  <thead className="bg-[#F8F6F4] border-b border-[#E0DBD7] sticky top-0">
                    <tr>
                      <th className="w-12 px-3 py-2 text-left">
                        <input
                          type="checkbox"
                          checked={filteredGuests.length > 0 && filteredGuests.every(guest => selectedMemberIds.includes(guest.id))}
                          onChange={(e) => {
                            if (e.target.checked) {
                              // Select all filtered guests
                              const newSelections = [...new Set([...selectedMemberIds, ...filteredGuests.map(g => g.id)])];
                              setSelectedMemberIds(newSelections);
                            } else {
                              // Deselect all filtered guests
                              setSelectedMemberIds(selectedMemberIds.filter(id => !filteredGuests.some(g => g.id === id)));
                            }
                          }}
                          className="rounded border-[#AB9C95] text-[#A85C36] focus:ring-[#A85C36] w-4 h-4"
                        />
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-[#332B42]">Name</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredGuests.length === 0 ? (
                      <tr>
                        <td colSpan={2} className="px-3 py-8 text-center text-sm text-[#AB9C95]">
                          {searchTerm ? 'No guests match your search' : 'No guests available'}
                        </td>
                      </tr>
                    ) : (
                      filteredGuests.map(guest => (
                        <tr
                          key={guest.id}
                          className="hover:bg-[#F8F6F4] transition-colors cursor-pointer"
                          onClick={() => toggleGuestSelection(guest.id)}
                        >
                          <td className="px-3 py-2">
                            <input
                              type="checkbox"
                              checked={selectedMemberIds.includes(guest.id)}
                              onChange={() => toggleGuestSelection(guest.id)}
                              className="rounded border-[#AB9C95] text-[#A85C36] focus:ring-[#A85C36] w-4 h-4"
                              onClick={(e) => e.stopPropagation()}
                            />
                          </td>
                          <td className="px-3 py-2 text-sm font-medium text-[#332B42]">
                            {guest.fullName}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            
            {selectedMemberIds.length < 2 && (
              <p className="text-red-500 text-xs mt-2">
                At least 2 guests must be selected to create a group
              </p>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="flex justify-between items-center p-6 pt-4 border-t border-[#E0DBD7] flex-shrink-0">
          <button
            onClick={handleDelete}
            className="px-4 py-2 text-sm bg-red-500 text-white rounded-[5px] hover:bg-red-600 transition-colors flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Delete Group
          </button>
          <div className="flex gap-3">
            <button
              onClick={handleClose}
              className="btn-primaryinverse text-sm"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!groupName.trim() || selectedMemberIds.length < 2}
              className="btn-primary text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Update Group
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
