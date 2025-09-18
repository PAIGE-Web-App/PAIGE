"use client";
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Users } from 'lucide-react';
import { Guest } from './types';
import { getCategoryHexColor } from '@/utils/categoryStyle';
import BadgeCount from '../BadgeCount';
import Banner from '../Banner';

interface FamilyGroupingModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedGuests: Guest[];
  allGuests: Guest[];
  onCreateFamilyGroup: (groupData: {
    name: string;
    type: string;
    memberIds: string[];
  }) => void;
  existingGroups?: Array<{
    id: string;
    name: string;
    type: string;
    guestIds: string[];
  }>;
  onAddToExistingGroup?: (groupId: string, guestIds: string[]) => void;
}

export default function FamilyGroupingModal({
  isOpen,
  onClose,
  selectedGuests,
  allGuests,
  onCreateFamilyGroup,
  existingGroups = [],
  onAddToExistingGroup,
}: FamilyGroupingModalProps) {
  const [groupName, setGroupName] = useState('');
  const [groupNameError, setGroupNameError] = useState('');
  const [mode, setMode] = useState<'create' | 'existing'>('create');
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showSearchBar, setShowSearchBar] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [filteredGuests, setFilteredGuests] = useState<Guest[]>([]);


  // Initialize form when modal opens
  useEffect(() => {
    if (isOpen && selectedGuests.length > 0) {
      // Initialize selected members with all selected guests
      setSelectedMemberIds(selectedGuests.map(g => g.id));
      // Auto-generate group name based on selected guests only if group name is empty
      if (!groupName) {
        const lastNames = [...new Set(selectedGuests.map(g => g.fullName.split(' ').pop() || ''))];
        if (lastNames.length === 1 && lastNames[0]) {
          setGroupName(`${lastNames[0]} Group`);
        }
      }
    }
  }, [isOpen, selectedGuests, groupName]);

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

  const removeGuest = (guestId: string) => {
    // Only allow removal if there are more than 2 guests
    if (selectedMemberIds.length > 2) {
      setSelectedMemberIds(prev => prev.filter(id => id !== guestId));
    }
  };

  const addGuestFromDropdown = (guest: Guest) => {
    setSelectedMemberIds(prev => [...prev, guest.id]);
    setSearchTerm('');
    setShowDropdown(false);
  };

  const handleSubmit = () => {
    if (!groupName.trim()) {
      setGroupNameError('Group name is required');
      return;
    }
    if (selectedMemberIds.length < 2) {
      setGroupNameError('At least 2 guests must be selected');
      return;
    }

    onCreateFamilyGroup({
      name: groupName.trim(),
      type: 'family', // Use 'family' as the default type
      memberIds: selectedMemberIds,
    });

    handleClose();
  };

  const handleClose = () => {
    setGroupName('');
    setGroupNameError('');
    setMode('create');
    setSelectedMemberIds([]);
    setSearchTerm('');
    setShowSearchBar(false);
    onClose();
  };


  if (!isOpen) return null;

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
              Link Guests
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
            {/* Mode Selection */}
            <div className="mb-6">
              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="mode"
                    value="create"
                    checked={mode === 'create'}
                    onChange={(e) => setMode(e.target.value as 'create' | 'existing')}
                    className="w-4 h-4 text-[#A85C36] border-[#AB9C95] focus:ring-[#A85C36]"
                  />
                  <div>
                    <div className="text-sm font-medium text-[#332B42]">Create New Group</div>
                    <div className="text-xs text-[#AB9C95]">Create a new group with these guests</div>
                  </div>
                </label>
                {existingGroups.length > 0 && (
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="mode"
                      value="existing"
                      checked={mode === 'existing'}
                      onChange={(e) => setMode(e.target.value as 'create' | 'existing')}
                      className="w-4 h-4 text-[#A85C36] border-[#AB9C95] focus:ring-[#A85C36]"
                    />
                    <div>
                      <div className="text-sm font-medium text-[#332B42]">Add to Existing Group</div>
                      <div className="text-xs text-[#AB9C95]">Add these guests to an existing group</div>
                    </div>
                  </label>
                )}
              </div>
            </div>

            {/* Create New Group Mode */}
            {mode === 'create' && (
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
            )}

            {/* Add to Existing Groups Mode */}
            {mode === 'existing' && existingGroups.length > 0 && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-[#332B42] mb-3">
                  Select Existing Group
                </label>
                <div className="border border-[#E0DBD7] rounded-[5px] overflow-hidden">
                  <div className="max-h-48 overflow-y-auto">
                    <table className="w-full">
                      <thead className="bg-[#F8F6F4] border-b border-[#E0DBD7] sticky top-0">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-[#332B42]">Group</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-[#332B42]">Members</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-[#332B42]">Status</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-[#332B42]">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {existingGroups.map(group => {
                          // Check which selected guests are already in this group
                          const alreadyInGroup = selectedMemberIds.filter(guestId => group.guestIds.includes(guestId));
                          const newToGroup = selectedMemberIds.filter(guestId => !group.guestIds.includes(guestId));
                          const allAlreadyInGroup = selectedMemberIds.length > 0 && alreadyInGroup.length === selectedMemberIds.length;
                          const someAlreadyInGroup = alreadyInGroup.length > 0 && alreadyInGroup.length < selectedMemberIds.length;
                          
                          return (
                            <tr key={group.id} className="hover:bg-[#F8F6F4] transition-colors">
                              <td className="px-3 py-2">
                                <div className="flex items-center gap-2">
                                  <div 
                                    className="w-3 h-3 rounded-full"
                                    style={{ backgroundColor: getGroupColor(group.name) }}
                                  />
                                  <span className="text-sm font-medium text-[#332B42]">{group.name}</span>
                                </div>
                              </td>
                              <td className="px-3 py-2 text-sm text-[#AB9C95]">
                                {group.guestIds.length} member{group.guestIds.length === 1 ? '' : 's'}
                              </td>
                              <td className="px-3 py-2 text-sm text-[#AB9C95]">
                                {allAlreadyInGroup ? (
                                  <span className="text-[#AB9C95]">All already in group</span>
                                ) : someAlreadyInGroup ? (
                                  <span className="text-[#AB9C95]">{alreadyInGroup.length} already, {newToGroup.length} new</span>
                                ) : (
                                  <span className="text-[#A85C36]">{newToGroup.length} new guest{newToGroup.length === 1 ? '' : 's'}</span>
                                )}
                              </td>
                              <td className="px-3 py-2">
                                <button
                                  onClick={() => {
                                    if (onAddToExistingGroup && newToGroup.length > 0) {
                                      onAddToExistingGroup(group.id, newToGroup);
                                      handleClose();
                                    }
                                  }}
                                  disabled={selectedMemberIds.length === 0 || allAlreadyInGroup}
                                  className={`px-2 py-1 text-xs rounded-[3px] transition-colors ${
                                    allAlreadyInGroup 
                                      ? 'bg-[#AB9C95] text-white cursor-not-allowed opacity-50'
                                      : newToGroup.length === 0
                                      ? 'bg-[#AB9C95] text-white cursor-not-allowed opacity-50'
                                      : 'bg-[#A85C36] text-white hover:bg-[#8B4513]'
                                  }`}
                                >
                                  {allAlreadyInGroup ? 'Already Added' : newToGroup.length === 0 ? 'No New' : `Add ${newToGroup.length}`}
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Guests to Link Table - Only show for Create New Group mode */}
            {mode === 'create' && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <label className="block text-sm font-medium text-[#332B42]">
                      Guests to Link
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

                {/* Guests Table */}
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
                            // Find groups this guest belongs to
                            const guestGroups = existingGroups.filter(group => 
                              group.guestIds.includes(guest.id)
                            );
                            
                            return (
                              <tr
                                key={guest.id}
                                className="hover:bg-[#F8F6F4] transition-colors"
                              >
                                <td className="px-3 py-2 text-sm font-medium text-[#332B42]">
                                  {guest.fullName}
                                </td>
                                <td className="px-3 py-2">
                                  <div className="flex flex-wrap gap-1">
                                    {guestGroups.length > 0 ? (
                                      guestGroups.map(group => (
                                        <span
                                          key={group.id}
                                          className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium text-white shadow-sm"
                                          style={{ backgroundColor: getGroupColor(group.name) }}
                                          title={`Part of ${group.name} group`}
                                        >
                                          {group.name}
                                        </span>
                                      ))
                                    ) : (
                                      <span className="text-xs text-[#AB9C95]">No groups</span>
                                    )}
                                  </div>
                                </td>
                                <td className="px-3 py-2">
                                  <button
                                    onClick={() => {
                                      // Only allow removal if there are more than 2 guests
                                      if (selectedMemberIds.length > 2) {
                                        setSelectedMemberIds(prev => prev.filter(id => id !== guest.id));
                                      }
                                    }}
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
            )}

          </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 pt-4 border-t border-[#E0DBD7] flex-shrink-0">
          <button
            onClick={handleClose}
            className="btn-primaryinverse text-sm"
          >
            Cancel
          </button>
          {mode === 'create' && (
            <button
              onClick={handleSubmit}
              disabled={!groupName.trim() || selectedMemberIds.length < 2}
              className="btn-primary text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Create Group
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

