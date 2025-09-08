"use client";
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Users, Trash2 } from 'lucide-react';
import { getCategoryHexColor } from '@/utils/categoryStyle';
import BadgeCount from '../BadgeCount';
import Banner from '../Banner';

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
  const [showSearchBar, setShowSearchBar] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [filteredGuests, setFilteredGuests] = useState<Array<{id: string; fullName: string}>>([]);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Initialize form when group changes
  useEffect(() => {
    if (group) {
      setGroupName(group.name);
      setSelectedMemberIds(group.guestIds);
      setGroupNameError('');
    }
  }, [group]);

  // Filter guests based on search term
  useEffect(() => {
    if (searchTerm.trim()) {
      // Filter all guests that match the search term and are not already selected
      const filtered = allGuests.filter(guest => 
        guest.fullName.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !selectedMemberIds.includes(guest.id)
      );
      setFilteredGuests(filtered);
      setShowDropdown(true);
    } else {
      setFilteredGuests([]);
      setShowDropdown(false);
    }
  }, [searchTerm, allGuests, selectedMemberIds]);

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
    setShowSearchBar(false);
    setShowDropdown(false);
    setConfirmDelete(false);
    onClose();
  };

  const removeGuest = (guestId: string) => {
    // Only allow removal if there are more than 2 guests
    if (selectedMemberIds.length > 2) {
      setSelectedMemberIds(prev => prev.filter(id => id !== guestId));
    }
  };

  const addGuestFromDropdown = (guest: {id: string; fullName: string}) => {
    setSelectedMemberIds(prev => [...prev, guest.id]);
    setSearchTerm('');
    setShowDropdown(false);
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
          {confirmDelete && (
            <Banner
              message="Are you sure? This will permanently delete the group and unlink all guests."
              type="error"
              className="mb-4"
            />
          )}

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
              <div className="flex items-center gap-2">
                <label className="block text-sm font-medium text-[#332B42]">
                  Select Guests to Include in Group *
                </label>
                <BadgeCount count={selectedMemberIds.length} />
              </div>
              {!showSearchBar && (
                <button
                  onClick={() => setShowSearchBar(true)}
                  className="text-sm text-[#A85C36] hover:text-[#8B4513] transition-colors"
                >
                  +Add more guests to group
                </button>
              )}
            </div>
            
            {/* Search Input - Only show when showSearchBar is true */}
            {showSearchBar && (
              <div className="relative mb-3">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-4 w-4 text-[#AB9C95]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Add other guests from your list"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 text-sm text-[#332B42] border border-[#AB9C95] rounded-[5px] focus:border-[#A85C36] focus:ring-1 focus:ring-[#A85C36] focus:outline-none bg-white"
                />
                
                {/* Dropdown for adding guests */}
                {showDropdown && filteredGuests.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#AB9C95] rounded-[5px] shadow-lg z-50 max-h-48 overflow-y-auto">
                    {filteredGuests.map(guest => (
                      <button
                        key={guest.id}
                        onClick={() => addGuestFromDropdown(guest)}
                        className="w-full px-3 py-2 text-left text-sm text-[#332B42] hover:bg-[#F8F6F4] transition-colors flex items-center justify-between"
                      >
                        <span>{guest.fullName}</span>
                        <span className="text-xs text-[#AB9C95]">Add</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Info Banner - Show when only 2 guests */}
            {selectedMemberIds.length === 2 && (
              <Banner
                message="A group must have at least 2 users - that's why guests can't be removed"
                type="info"
                className="mb-3"
              />
            )}

            {/* Guest Table */}
            <div className="border border-[#E0DBD7] rounded-[5px] overflow-hidden">
              <div className="max-h-48 overflow-y-auto">
                <table className="w-full">
                  <thead className="bg-[#F8F6F4] border-b border-[#E0DBD7] sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-[#332B42]">Name</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-[#332B42]">Groups</th>
                      <th className="w-20 px-3 py-2 text-left text-xs font-medium text-[#332B42]">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allGuests
                      .filter(guest => selectedMemberIds.includes(guest.id))
                      .map(guest => {
                        // For now, we'll show "No groups" since we don't have group info in this context
                        // In a real implementation, you'd want to pass existing groups to show which groups the guest belongs to
                        return (
                          <tr
                            key={guest.id}
                            className="hover:bg-[#F8F6F4] transition-colors"
                          >
                            <td className="px-3 py-2 text-sm font-medium text-[#332B42]">
                              {guest.fullName}
                            </td>
                            <td className="px-3 py-2">
                              <span className="text-xs text-[#AB9C95]">No groups</span>
                            </td>
                            <td className="px-3 py-2">
                              <button
                                onClick={() => removeGuest(guest.id)}
                                disabled={selectedMemberIds.length <= 2}
                                className={`text-xs px-2 py-1 rounded-[3px] transition-colors ${
                                  selectedMemberIds.length <= 2
                                    ? 'text-[#AB9C95] cursor-not-allowed opacity-50'
                                    : 'text-red-600 hover:text-red-700 hover:bg-red-50'
                                }`}
                              >
                                Remove
                              </button>
                            </td>
                          </tr>
                        );
                      })}
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
            onClick={() => {
              if (!confirmDelete) {
                setConfirmDelete(true);
              } else {
                handleDelete();
              }
            }}
            className={`btn-delete ${confirmDelete ? 'confirm' : ''}`}
          >
            {confirmDelete ? "Confirm Deletion" : "Delete Group"}
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
