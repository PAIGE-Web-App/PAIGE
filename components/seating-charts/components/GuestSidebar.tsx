import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ListFilter } from 'lucide-react';
import { Guest } from '../../../types/seatingChart';

interface GuestSidebarProps {
  guests: Guest[];
  guestAssignments: Record<string, { tableId: string; seatNumber: number }>;
  onGuestAssignment?: (guestId: string, tableId: string, seatNumber: number) => void;
  showingActions: string | null;
  onAvatarClick: (tableId: string, seatNumber: number) => void;
  onMoveGuest: (guestId: string, tableId: string, seatNumber: number) => void;
  onRemoveGuest: (guestId: string, tableId: string, seatNumber: number) => void;
  getGuestAvatarColor: (guestId: string) => string;
}

export default function GuestSidebar({
  guests,
  guestAssignments,
  onGuestAssignment,
  showingActions,
  onAvatarClick,
  onMoveGuest,
  onRemoveGuest,
  getGuestAvatarColor
}: GuestSidebarProps) {
  // Guest sidebar state
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [sortOption, setSortOption] = useState('name-asc');
  const [selectedRelationshipFilter, setSelectedRelationshipFilter] = useState<string[]>([]);
  
  // Refs for click outside detection
  const filterButtonRef = useRef<HTMLButtonElement>(null);
  const filtersPopoverRef = useRef<HTMLDivElement>(null);

  // Get unassigned guests (guests not yet assigned to tables)
  const unassignedGuests = guests.filter(guest => !guestAssignments[guest.id]);

  // Get unique relationships for filtering
  const allRelationships = useMemo(() => {
    const relationships = guests.map(guest => guest.relationship).filter(Boolean) as string[];
    return [...new Set(relationships)];
  }, [guests]);

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
    
    // Apply sorting
    filtered.sort((a, b) => {
      const nameA = a.fullName.toLowerCase();
      const nameB = b.fullName.toLowerCase();
    
      switch (sortOption) {
        case 'name-desc':
          return nameB.localeCompare(nameA);
        case 'name-asc':
        default:
          return nameA.localeCompare(nameB);
      }
    });
    
    return filtered;
  }, [unassignedGuests, searchQuery, selectedRelationshipFilter, sortOption]);

  // Handle filter changes
  const handleRelationshipChange = (relationship: string) => {
    setSelectedRelationshipFilter(prev => 
      prev.includes(relationship) 
        ? prev.filter(r => r !== relationship)
        : [...prev, relationship]
    );
  };

  const handleClearRelationshipFilter = (relationship: string) => {
    setSelectedRelationshipFilter(prev => prev.filter(r => r !== relationship));
  };

  const handleClearSortOption = () => {
    setSortOption('name-asc');
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
        {(selectedRelationshipFilter.length > 0 || sortOption !== 'name-asc') && (
          <div className="flex flex-wrap gap-2 mt-3">
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
            {sortOption !== 'name-asc' && (
              <span className="inline-flex items-center gap-1 bg-[#E0DBD7] text-[#332B42] text-xs px-2 py-1 rounded-[5px]">
                Sort: {sortOption === 'name-desc' ? 'Z-A' : 'A-Z'}
                <button
                  onClick={handleClearSortOption}
                  className="text-[#AB9C95] hover:text-[#A85C36]"
                >
                  ×
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
            {searchQuery || selectedRelationshipFilter.length > 0 ? 'No guests match your filters' : 'No unassigned guests'}
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
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
