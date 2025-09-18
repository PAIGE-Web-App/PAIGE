import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ListFilter, ChevronDown, ChevronUp, UserCheck, User } from 'lucide-react';
import { Guest, TableType } from '../../../types/seatingChart';
import BadgeCount from '../../BadgeCount';
import { getCategoryHexColor } from '../../../utils/categoryStyle';
import { GuestAssignment } from '../hooks/useGuestManagement';

interface GuestSidebarProps {
  guests: Guest[];
  guestAssignments: Record<string, GuestAssignment>;
  onGuestAssignment?: (guestId: string, tableId: string, seatIndex: number) => void;
  showingActions: string | null;
  onAvatarClick: (tableId: string, seatNumber: number) => void;
  onMoveGuest: (guestId: string, tableId: string, position: { x: number; y: number }) => void;
  onRemoveGuest: (guestId: string, tableId: string, position: { x: number; y: number }) => void;
  getGuestAvatarColor: (guestId: string) => string;
  tableLayout?: { tables: TableType[]; totalCapacity: number };
  onSeatedGuestClick?: (guestId: string, tableId: string, seatNumber: number) => void;
  guestGroups?: any[];
  onEditGroup?: (groupId: string) => void;
}

export default function GuestSidebar({
  guests,
  guestAssignments,
  onGuestAssignment,
  showingActions,
  onAvatarClick,
  onMoveGuest,
  onRemoveGuest,
  getGuestAvatarColor,
  tableLayout,
  onSeatedGuestClick,
  guestGroups = [],
  onEditGroup
}: GuestSidebarProps) {
  // Guest sidebar state
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [sortOption, setSortOption] = useState('group-name-asc');
  const [selectedRelationshipFilter, setSelectedRelationshipFilter] = useState<string[]>([]);
  const [selectedGroupFilter, setSelectedGroupFilter] = useState<string[]>([]);
  const [showSeatedGuests, setShowSeatedGuests] = useState(true);
  
  // Refs for click outside detection
  const filterButtonRef = useRef<HTMLButtonElement>(null);
  const filtersPopoverRef = useRef<HTMLDivElement>(null);

  // Get unassigned guests (guests not assigned to any existing table)
  const unassignedGuests = guests.filter(guest => {
    const assignment = guestAssignments[guest.id];
    if (!assignment) return true;
    
    // Check if the assigned table still exists
    const tableExists = tableLayout?.tables?.some(table => table.id === assignment.tableId);
    return !tableExists;
  });
  
  // Get seated guests (guests assigned to tables that still exist)
  const seatedGuests = guests.filter(guest => {
    const assignment = guestAssignments[guest.id];
    if (!assignment) return false;
    
    // Check if the assigned table still exists
    const tableExists = tableLayout?.tables?.some(table => table.id === assignment.tableId);
    return tableExists;
  });
  
  // Helper function to get table name by ID
  const getTableName = (tableId: string) => {
    if (!tableLayout?.tables) return `Table ${tableId}`;
    const table = tableLayout.tables.find(t => t.id === tableId);
    return table ? table.name : `Table ${tableId}`;
  };

  // Get unique relationships for filtering
  const allRelationships = useMemo(() => {
    const relationships = guests.map(guest => guest.relationship).filter(Boolean) as string[];
    return [...new Set(relationships)];
  }, [guests]);

  // Helper function to get guest's groups
  const getGuestGroups = (guest: Guest) => {
    const guestGroupIds = guest.groupIds || (guest.groupId ? [guest.groupId] : []);
    return guestGroups.filter(group => guestGroupIds.includes(group.id));
  };

  // Helper function to get group color (consistent with main table)
  const getGroupColor = (groupName: string): string => {
    return getCategoryHexColor(groupName);
  };

  // Filter and sort guests
  const displayGuests = useMemo(() => {
    let filtered = unassignedGuests;
    
    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(guest => 
        guest.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        guest.relationship?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Apply relationship filter
    if (selectedRelationshipFilter.length > 0) {
      filtered = filtered.filter(guest => 
        guest.relationship && selectedRelationshipFilter.includes(guest.relationship)
      );
    }
    
    // Apply group filter
    if (selectedGroupFilter.length > 0) {
      filtered = filtered.filter(guest => {
        const guestGroupsForThisGuest = getGuestGroups(guest);
        
        // Check for ungrouped
        if (selectedGroupFilter.includes('ungrouped') && guestGroupsForThisGuest.length === 0) {
          return true;
        }
        
        // Check for multiple groups
        if (selectedGroupFilter.includes('multiple') && guestGroupsForThisGuest.length > 1) {
          return true;
        }
        
        // Check for specific groups
        return selectedGroupFilter.some(filterGroup => 
          guestGroupsForThisGuest.some(group => group.id === filterGroup)
        );
      });
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      // Get groups for each guest
      const aGroups = getGuestGroups(a);
      const bGroups = getGuestGroups(b);
      
      // Primary group name (first group or empty string)
      const aPrimaryGroup = aGroups.length > 0 ? aGroups[0].name : '';
      const bPrimaryGroup = bGroups.length > 0 ? bGroups[0].name : '';
      
      // Sort by group first, then by name within group
      if (aPrimaryGroup !== bPrimaryGroup) {
        // If one has a group and the other doesn't, group comes first
        if (aPrimaryGroup && !bPrimaryGroup) return -1;
        if (!aPrimaryGroup && bPrimaryGroup) return 1;
        
        // Both have groups, sort by group name
        return aPrimaryGroup.localeCompare(bPrimaryGroup);
      }
      
      // Same group (or both ungrouped), sort by name
      const nameA = a.fullName.toLowerCase();
      const nameB = b.fullName.toLowerCase();
    
      switch (sortOption) {
        case 'name-desc':
          return nameB.localeCompare(nameA);
        case 'name-asc':
          return nameA.localeCompare(nameB);
        case 'group-name-desc':
          return nameB.localeCompare(nameA);
        case 'group-name-asc':
        default:
          return nameA.localeCompare(nameB);
      }
    });
    
    return filtered;
  }, [unassignedGuests, searchQuery, selectedRelationshipFilter, selectedGroupFilter, sortOption, guestGroups]);

  // Handle filter changes
  const handleRelationshipChange = (relationship: string) => {
    setSelectedRelationshipFilter(prev => 
      prev.includes(relationship) 
        ? prev.filter(r => r !== relationship)
        : [...prev, relationship]
    );
  };

  const handleGroupChange = (groupId: string) => {
    setSelectedGroupFilter(prev => 
      prev.includes(groupId) 
        ? prev.filter(g => g !== groupId)
        : [...prev, groupId]
    );
  };

  const handleClearRelationshipFilter = (relationship: string) => {
    setSelectedRelationshipFilter(prev => prev.filter(r => r !== relationship));
  };

  const handleClearSortOption = () => {
    setSortOption('group-name-asc');
  };

  // Close filters when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (showFilters && 
          filterButtonRef.current && !filterButtonRef.current.contains(target) &&
          filtersPopoverRef.current && !filtersPopoverRef.current.contains(target)) {
        setShowFilters(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showFilters]);

  return (
    <div className="w-[320px] bg-[#F3F2F0] flex-shrink-0 flex flex-col border-r border-[#E0DBD7]">
      {/* Unseated Guests Section */}
      <div className="px-4 pt-3 flex-shrink-0">
        <div className="flex items-center gap-2 text-sm font-medium text-[#332B42]">
          <User size={16} className="text-[#A85C36]" />
          <span>Unseated Guests</span>
          <BadgeCount count={unassignedGuests.length} />
        </div>
      </div>
      
      {/* Header with search and filters */}
      <div className="p-4 border-b border-[#AB9C95]">
        <div className="flex items-center gap-4 mb-3">
          <div className="relative">
            <button
              ref={filterButtonRef}
              onClick={() => setShowFilters(!showFilters)}
              className="filter-button flex items-center justify-center border border-[#AB9C95] rounded-[5px] text-[#332B42] hover:text-[#A85C36] px-3 py-1 text-xs"
              aria-label="Toggle Filters"
            >
              <ListFilter className="w-4 h-4" />
            </button>
            
            {/* Filters Popover - Positioned absolutely to overlay content */}
            <AnimatePresence>
              {showFilters && (
                <motion.div
                  ref={filtersPopoverRef}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="absolute top-full left-0 mt-2 p-4 bg-white border border-[#AB9C95] rounded-[5px] shadow-lg z-30 min-w-[250px] space-y-3"
                >
                  {/* Filter by Group */}
                  <div>
                    <span className="text-xs font-medium text-[#332B42] block mb-2">Filter by Group</span>
                    <div className="flex flex-wrap gap-2">
                      <label className="flex items-center text-xs text-[#332B42] cursor-pointer">
                        <input
                          type="checkbox"
                          value="ungrouped"
                          checked={selectedGroupFilter.includes('ungrouped')}
                          onChange={() => handleGroupChange('ungrouped')}
                          className="mr-1 rounded text-[#A85C36] focus:ring-[#A85C36]"
                        />
                        Ungrouped
                      </label>
                      <label className="flex items-center text-xs text-[#332B42] cursor-pointer">
                        <input
                          type="checkbox"
                          value="multiple"
                          checked={selectedGroupFilter.includes('multiple')}
                          onChange={() => handleGroupChange('multiple')}
                          className="mr-1 rounded text-[#A85C36] focus:ring-[#A85C36]"
                        />
                        Multiple Groups
                      </label>
                      {guestGroups.map((group) => (
                        <label key={group.id} className="flex items-center text-xs text-[#332B42] cursor-pointer">
                          <input
                            type="checkbox"
                            value={group.id}
                            checked={selectedGroupFilter.includes(group.id)}
                            onChange={() => handleGroupChange(group.id)}
                            className="mr-1 rounded text-[#A85C36] focus:ring-[#A85C36]"
                          />
                          {group.name}
                        </label>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <span className="text-xs font-medium text-[#332B42] block mb-2">Filter by Relationship</span>
                    <div className="flex flex-wrap gap-2">
                      {allRelationships.map((relationship) => (
                        <label key={relationship} className="flex items-center text-xs text-[#332B42] cursor-pointer">
                          <input
                            type="checkbox"
                            value={relationship}
                            checked={selectedRelationshipFilter.includes(relationship)}
                            onChange={() => handleRelationshipChange(relationship)}
                            className="mr-1 rounded text-[#A85C36] focus:ring-[#A85C36]"
                          />
                          {relationship}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <span className="text-xs font-medium text-[#332B42] block mb-2">Sort by</span>
                    <select
                      value={sortOption}
                      onChange={(e) => setSortOption(e.target.value)}
                      className="w-full text-xs border border-[#AB9C95] rounded-[5px] px-2 py-1 focus:border-[#A85C36] focus:ring-0"
                    >
                      <option value="group-name-asc">Group, then Name (A-Z)</option>
                      <option value="group-name-desc">Group, then Name (Z-A)</option>
                      <option value="name-asc">Name (A-Z)</option>
                      <option value="name-desc">Name (Z-A)</option>
                    </select>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <div className="relative flex-1">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-4 text-[#AB9C95]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 104.5 4.5a7.5 7.5 0 0012.15 12.15z"
              />
            </svg>
            <input
              type="text"
              placeholder="Search guests..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-6 text-xs text-[#332B42] border-0 border-b border-[#AB9C95] focus:border-[#A85C36] focus:ring-0 py-1 placeholder:text-[#AB9C95] focus:outline-none bg-transparent"
            />
          </div>
        </div>
        
        {/* Active Filters Display */}
        {(selectedRelationshipFilter.length > 0 || selectedGroupFilter.length > 0 || sortOption !== 'group-name-asc') && (
          <div className="flex flex-wrap gap-2 mt-3">
            {selectedGroupFilter.map((groupId) => {
              const group = guestGroups.find(g => g.id === groupId);
              const displayName = groupId === 'ungrouped' ? 'Ungrouped' : 
                                groupId === 'multiple' ? 'Multiple Groups' : 
                                group?.name || groupId;
              return (
                <span
                  key={groupId}
                  className="inline-flex items-center gap-1 bg-[#E0DBD7] text-[#332B42] text-xs px-2 py-1 rounded-[5px]"
                >
                  {displayName}
                  <button
                    onClick={() => handleGroupChange(groupId)}
                    className="text-[#AB9C95] hover:text-[#A85C36]"
                  >
                    ×
                  </button>
                </span>
              );
            })}
            {selectedRelationshipFilter.map((relationship) => (
              <span
                key={relationship}
                className="inline-flex items-center gap-1 bg-[#E0DBD7] text-[#332B42] text-xs px-2 py-1 rounded-[5px]"
              >
                {relationship}
                <button
                  onClick={() => handleClearRelationshipFilter(relationship)}
                  className="text-[#AB9C95] hover:text-[#A85C36]"
                >
                  ×
                </button>
              </span>
            ))}
            {sortOption !== 'group-name-asc' && (
              <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-[#805d93] text-white rounded-full">
                {sortOption === 'name-desc' ? 'Full Name : Z-A' : 
                 sortOption === 'name-asc' ? 'Full Name : A-Z' :
                 sortOption === 'group-name-desc' ? 'Group : Z-A' : 
                 'Group : A-Z'}
                <button
                  onClick={handleClearSortOption}
                  className="hover:bg-white hover:bg-opacity-20 rounded-full p-0.5"
                >
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </span>
            )}
          </div>
        )}
      </div>
      
      {/* Guest List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {displayGuests.length === 0 ? (
          <div className="text-center text-[#AB9C95] text-sm py-8">
            {searchQuery || selectedRelationshipFilter.length > 0 || selectedGroupFilter.length > 0 ? 'No guests match your filters' : 'No unassigned guests'}
          </div>
        ) : (
          displayGuests.map((guest) => (
            <div
              key={guest.id}
              className="flex items-center gap-3 p-3 bg-white rounded-[5px] border border-[#E0DBD7] hover:border-[#A85C36] transition-colors cursor-grab active:cursor-grabbing"
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('text/plain', guest.id);
                e.dataTransfer.effectAllowed = 'move';
                
                // Create a custom drag image using just the avatar
                const avatarElement = e.currentTarget.querySelector('.w-8.h-8') as HTMLElement;
                if (avatarElement) {
                  // Clone the avatar and style it for drag
                  const dragImage = avatarElement.cloneNode(true) as HTMLElement;
                  dragImage.style.width = '32px';
                  dragImage.style.height = '32px';
                  dragImage.style.borderRadius = '50%';
                  dragImage.style.opacity = '0.8';
                  dragImage.style.transform = 'scale(1.2)';
                  dragImage.style.position = 'absolute';
                  dragImage.style.top = '-1000px';
                  dragImage.style.left = '-1000px';
                  dragImage.style.zIndex = '9999';
                  
                  // Add to DOM temporarily
                  document.body.appendChild(dragImage);
                  
                  // Set as drag image
                  e.dataTransfer.setDragImage(dragImage, 16, 16);
                  
                  // Remove after drag starts
                  setTimeout(() => {
                    if (document.body.contains(dragImage)) {
                      document.body.removeChild(dragImage);
                    }
                  }, 0);
                }
              }}
            >
              {/* Guest Avatar */}
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium flex-shrink-0"
                style={{ backgroundColor: getGuestAvatarColor(guest.id) }}
              >
                {guest.fullName.split(' ').map(n => n.charAt(0)).join('').toUpperCase()}
              </div>
              
              {/* Guest Info */}
              <div className="flex-1 min-w-0">
                <div className="font-medium text-[#332B42] text-sm truncate">
                  {guest.fullName}
                </div>
                {guest.relationship && (
                  <div className="text-[#AB9C95] text-xs truncate">
                    {guest.relationship}
                  </div>
                )}
                {/* Group Pills */}
                {(() => {
                  const guestGroupsForThisGuest = getGuestGroups(guest);
                  return guestGroupsForThisGuest.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {guestGroupsForThisGuest.map((group, groupIndex) => (
                        <span
                          key={group.id}
                          className={`px-1.5 py-0.5 text-xs font-medium text-white rounded-full shadow-sm cursor-pointer hover:opacity-80 transition-opacity ${
                            guestGroupsForThisGuest.length > 1 ? 'ring-1 ring-white ring-opacity-30' : ''
                          }`}
                          style={{ 
                            backgroundColor: getGroupColor(group.name),
                            opacity: guestGroupsForThisGuest.length > 1 && groupIndex > 0 ? 0.9 : 1
                          }}
                          title={`${group.name} (${group.type})${guestGroupsForThisGuest.length > 1 ? ' - Part of multiple groups' : ''} - Click to edit`}
                          onClick={() => onEditGroup?.(group.id)}
                        >
                          {group.name}
                        </span>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </div>
          ))
        )}
      </div>
      
      {/* Seated Guests Section - Similar to completed todos pattern */}
      {seatedGuests.length > 0 && (
        <div className="bg-gray-200 mt-4 border-t border-[#AB9C95] pt-3 pb-4 flex-shrink-0">
          <button
            onClick={() => setShowSeatedGuests(!showSeatedGuests)}
            className="w-full flex items-center justify-between text-sm font-medium text-[#332B42] py-2 px-4 hover:bg-[#F3F2F0] rounded-[5px]"
          >
            <div className="flex items-center gap-2">
              <UserCheck size={16} className="text-[#A85C36]" />
              <span>Seated Guests</span>
              <BadgeCount count={seatedGuests.length} />
            </div>
            <div className="flex items-center">
              {showSeatedGuests ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </div>
          </button>
          <AnimatePresence>
            {showSeatedGuests && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="py-2 px-4 space-y-2">
                  {seatedGuests.map((guest) => {
                    const assignment = guestAssignments[guest.id];
                    return (
                      <div
                        key={guest.id}
                        className="flex items-center gap-3 p-3 bg-white rounded-[5px] border border-[#E0DBD7] hover:border-[#AB9C95] transition-colors cursor-pointer"
                        onClick={() => {
                          if (onSeatedGuestClick) {
                            // Convert position back to seat number for backward compatibility
                            onSeatedGuestClick(guest.id, assignment.tableId, 0);
                          }
                        }}
                      >
                        {/* Guest Avatar */}
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium flex-shrink-0"
                          style={{ backgroundColor: getGuestAvatarColor(guest.id) }}
                        >
                          {guest.fullName.split(' ').map(name => name.charAt(0)).join('').substring(0, 2).toUpperCase()}
                        </div>
                        
                        {/* Guest Info */}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-[#332B42] text-sm truncate">
                            {guest.fullName}
                          </div>
                          <div className="text-[#A85C36] text-xs truncate">
                            {getTableName(assignment.tableId)}
                          </div>
                          {guest.relationship && (
                            <div className="text-[#AB9C95] text-xs truncate">
                              {guest.relationship}
                            </div>
                          )}
                          {/* Group Pills */}
                          {(() => {
                            const guestGroupsForThisGuest = getGuestGroups(guest);
                            return guestGroupsForThisGuest.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {guestGroupsForThisGuest.map((group, groupIndex) => (
                                  <span
                                    key={group.id}
                                    className={`px-1.5 py-0.5 text-xs font-medium text-white rounded-full shadow-sm cursor-pointer hover:opacity-80 transition-opacity ${
                                      guestGroupsForThisGuest.length > 1 ? 'ring-1 ring-white ring-opacity-30' : ''
                                    }`}
                                    style={{ 
                                      backgroundColor: getGroupColor(group.name),
                                      opacity: guestGroupsForThisGuest.length > 1 && groupIndex > 0 ? 0.9 : 1
                                    }}
                                    title={`${group.name} (${group.type})${guestGroupsForThisGuest.length > 1 ? ' - Part of multiple groups' : ''} - Click to edit`}
                                    onClick={() => onEditGroup?.(group.id)}
                                  >
                                    {group.name}
                                  </span>
                                ))}
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
