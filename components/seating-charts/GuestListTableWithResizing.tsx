import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Guest, GuestColumn, WizardState } from './types';
import { Sparkles, Settings, Trash2, ListFilter, ArrowUpDown } from 'lucide-react';
import { getCategoryHexColor } from '@/utils/categoryStyle';
import SelectField from '../SelectField';
import { AnimatePresence, motion } from 'framer-motion';

interface GuestListTableWithResizingProps {
  wizardState: WizardState;
  guestColumns: GuestColumn[];
  onUpdateGuest: (guestId: string, field: keyof Guest | string, value: string) => void;
  onRemoveGuest: (guestId: string) => void;
  onColumnResize?: (columnId: string, newWidth: number) => void;
  onShowMealOptionsModal?: (options: string[]) => void;
  onShowRelationshipOptionsModal?: (options: string[]) => void;
  onRemoveColumn?: (columnId: string) => void;
  onShowColumnOptionsModal?: (options: string[], columnId: string) => void;
  onShowLinkUsersModal?: (selectedGuestIds: string[]) => void;
  onEditGroup?: (groupId: string) => void;
}

export default function GuestListTableWithResizing({
  wizardState,
  guestColumns,
  onUpdateGuest,
  onRemoveGuest,
  onColumnResize,
  onShowMealOptionsModal,
  onShowRelationshipOptionsModal,
  onRemoveColumn,
  onShowColumnOptionsModal,
  onShowLinkUsersModal,
  onEditGroup,
}: GuestListTableWithResizingProps) {
  // Helper function to get group color using category color system
  const getGroupColor = (groupName: string): string => {
    return getCategoryHexColor(groupName);
  };

  // Helper function to get guest's groups
  const getGuestGroups = (guest: any) => {
    const guestGroupIds = guest.groupIds || (guest.groupId ? [guest.groupId] : []);
    return (wizardState.guestGroups || []).filter(group => guestGroupIds.includes(group.id));
  };

  // Get unique values for multi-select filters
  const getUniqueValues = (field: string) => {
    const values = new Set<string>();
    wizardState.guests.forEach(guest => {
      const value = guest[field as keyof Guest] || guest.customFields?.[field];
      if (value && value.trim()) {
        values.add(value.trim());
      }
    });
    return Array.from(values).sort();
  };

  const uniqueRelationships = getUniqueValues('relationship');
  const uniqueMealPreferences = getUniqueValues('mealPreference');

  // Helper functions for multi-select filtering
  const handleRelationshipFilterChange = (value: string) => {
    setSelectedRelationshipFilter(prev => 
      prev.includes(value) 
        ? prev.filter(v => v !== value)
        : [...prev, value]
    );
  };

  const handleMealPreferenceFilterChange = (value: string) => {
    setSelectedMealPreferenceFilter(prev => 
      prev.includes(value) 
        ? prev.filter(v => v !== value)
        : [...prev, value]
    );
  };

  const handleGroupFilterChange = (value: string) => {
    setSelectedGroupFilter(prev => 
      prev.includes(value) 
        ? prev.filter(v => v !== value)
        : [...prev, value]
    );
  };

  // Helper function to check if guest matches group filter
  const matchesGroupFilter = (guest: any) => {
    const guestGroups = getGuestGroups(guest);
    
    if (selectedGroupFilter.length === 0) {
      return true;
    }
    
    // Check if guest matches any of the selected group filters
    return selectedGroupFilter.some(filter => {
      if (filter === 'ungrouped') {
        return guestGroups.length === 0;
      } else if (filter === 'multiple') {
        return guestGroups.length > 1;
      } else {
        return guestGroups.some(group => group.id === filter);
      }
    });
  };
  const [resizingColumn, setResizingColumn] = useState<string | null>(null);
  const [startX, setStartX] = useState(0);
  const [startWidth, setStartWidth] = useState(0);
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: 'asc' | 'desc';
  } | null>(null);
  
  // Filtering state
  const [globalFilter, setGlobalFilter] = useState('');
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
  const [selectedGroupFilter, setSelectedGroupFilter] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [popoverPosition, setPopoverPosition] = useState({ top: 0, left: 0 });
  const [selectedRelationshipFilter, setSelectedRelationshipFilter] = useState<string[]>([]);
  const [selectedMealPreferenceFilter, setSelectedMealPreferenceFilter] = useState<string[]>([]);
  const filterPopoverRef = useRef<HTMLDivElement>(null);
  const filterButtonRef = useRef<HTMLButtonElement>(null);
  
  // Row selection state
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  
  // Confirmation modal state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [guestsToDelete, setGuestsToDelete] = useState<string[]>([]);

  // Column widths state
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({
    fullName: wizardState.fullNameColumnWidth || 200,
    ...guestColumns.reduce((acc, col) => {
      acc[col.id] = col.width || 120; // Default to 120px instead of 200px
      return acc;
    }, {} as Record<string, number>),
    actions: 80,
  });
  
  // Add selection column width
  const selectionColumnWidth = 50;
  
  // Sorting function
  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    
    setSortConfig({ key, direction });
  };

  // Sort and filter guests
  const sortedAndFilteredGuests = useMemo(() => {
    let filteredGuests = [...wizardState.guests];
    
    // Apply global filter
    if (globalFilter.trim()) {
      filteredGuests = filteredGuests.filter(guest => {
        const searchTerm = globalFilter.toLowerCase();
        
        // Search in full name
        if (guest.fullName?.toLowerCase().includes(searchTerm)) return true;
        
        // Search in relationship
        if (guest.relationship?.toLowerCase().includes(searchTerm)) return true;
        
        // Search in meal preference
        if (guest.mealPreference?.toLowerCase().includes(searchTerm)) return true;
        
        // Search in notes
        if (guest.notes?.toLowerCase().includes(searchTerm)) return true;
        
        // Search in custom fields
        if (guest.customFields) {
          for (const [key, value] of Object.entries(guest.customFields)) {
            if (String(value).toLowerCase().includes(searchTerm)) return true;
          }
        }
        
        return false;
      });
    }
    
    // Apply column-specific filters
    Object.entries(columnFilters).forEach(([columnKey, filterValue]) => {
      if (filterValue.trim()) {
        filteredGuests = filteredGuests.filter(guest => {
          let cellValue = '';
          
          if (columnKey === 'fullName' || columnKey === 'mealPreference' || 
              columnKey === 'relationship' || columnKey === 'notes') {
            cellValue = guest[columnKey as keyof Guest] as string || '';
          } else {
            // Custom field
            cellValue = guest.customFields?.[columnKey] || '';
          }
          
          return cellValue.toLowerCase().includes(filterValue.toLowerCase());
        });
      }
    });
    
    // Apply group filter
    if (selectedGroupFilter.length > 0) {
      filteredGuests = filteredGuests.filter(matchesGroupFilter);
    }

    // Apply relationship filter
    if (selectedRelationshipFilter.length > 0) {
      filteredGuests = filteredGuests.filter(guest => 
        selectedRelationshipFilter.includes(guest.relationship || '')
      );
    }

    // Apply meal preference filter
    if (selectedMealPreferenceFilter.length > 0) {
      filteredGuests = filteredGuests.filter(guest => 
        selectedMealPreferenceFilter.includes(guest.mealPreference || '')
      );
    }
    
    // Apply sorting
    if (sortConfig) {
      filteredGuests.sort((a, b) => {
        let aValue: any = '';
        let bValue: any = '';
        
        // Handle group-based sorting
        if (sortConfig.key === 'primaryGroup') {
          const aGroups = getGuestGroups(a);
          const bGroups = getGuestGroups(b);
          aValue = aGroups.length > 0 ? aGroups[0].name : '';
          bValue = bGroups.length > 0 ? bGroups[0].name : '';
        } else if (sortConfig.key === 'groupCount') {
          aValue = getGuestGroups(a).length;
          bValue = getGuestGroups(b).length;
        } else if (sortConfig.key === 'groupType') {
          const aGroups = getGuestGroups(a);
          const bGroups = getGuestGroups(b);
          aValue = aGroups.length > 0 ? aGroups[0].type : '';
          bValue = bGroups.length > 0 ? bGroups[0].type : '';
        } else {
          // Handle regular fields
          aValue = a[sortConfig.key as keyof Guest] || '';
          bValue = b[sortConfig.key as keyof Guest] || '';
          
          // Handle custom fields (any field that's not a standard Guest property)
          if (!['fullName', 'mealPreference', 'relationship', 'notes', 'id', 'groupId', 'groupIds', 'isRemovable'].includes(sortConfig.key)) {
            aValue = a.customFields?.[sortConfig.key] || '';
            bValue = b.customFields?.[sortConfig.key] || '';
          }
        }
        
        // Convert to string for comparison (except for groupCount which is numeric)
        if (sortConfig.key !== 'groupCount') {
          aValue = String(aValue).toLowerCase();
          bValue = String(bValue).toLowerCase();
        }
        
        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    
    return filteredGuests;
  }, [wizardState.guests, sortConfig, globalFilter, columnFilters, selectedGroupFilter, wizardState.guestGroups, selectedRelationshipFilter, selectedMealPreferenceFilter]);

  // Update column widths when guestColumns change (for newly added columns)
  useEffect(() => {
    setColumnWidths(prev => ({
      ...prev,
      ...guestColumns.reduce((acc, col) => {
        if (!prev[col.id]) {
          acc[col.id] = col.width || 120; // Default to 120px for new columns
        }
        return acc;
      }, {} as Record<string, number>)
    }));
  }, [guestColumns]);

  // Handle click outside filter dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterPopoverRef.current && !filterPopoverRef.current.contains(event.target as Node)) {
        setShowFilters(false);
      }
    };

    if (showFilters) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showFilters]);

  // Clear all filters function
  const clearAllFilters = () => {
    setGlobalFilter('');
    setColumnFilters({});
    setSelectedGroupFilter([]);
    setSelectedRelationshipFilter([]);
    setSelectedMealPreferenceFilter([]);
    setSortConfig(null);
  };

  // Row selection functions
  const toggleRowSelection = (guestId: string) => {
    setSelectedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(guestId)) {
        newSet.delete(guestId);
      } else {
        newSet.add(guestId);
      }
      return newSet;
    });
  };

  const toggleAllRows = () => {
    if (selectedRows.size === sortedAndFilteredGuests.length) {
      // If all are selected, deselect all
      setSelectedRows(new Set());
    } else {
      // Select all visible rows
      setSelectedRows(new Set(sortedAndFilteredGuests.map(guest => guest.id)));
    }
  };

  const isAllSelected = selectedRows.size === sortedAndFilteredGuests.length && sortedAndFilteredGuests.length > 0;
  const isIndeterminate = selectedRows.size > 0 && selectedRows.size < sortedAndFilteredGuests.length;

  // Delete confirmation functions
  const handleDeleteConfirm = () => {
    guestsToDelete.forEach(guestId => {
      onRemoveGuest(guestId);
    });
    setSelectedRows(new Set());
    setShowDeleteConfirm(false);
    setGuestsToDelete([]);
  };

  const handleDeleteCancel = () => {
    setShowDeleteConfirm(false);
    setGuestsToDelete([]);
  };

  const handleResizeStart = useCallback((e: React.MouseEvent, columnId: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    const startX = e.clientX;
    const startWidth = columnWidths[columnId] || 200;
    
    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - startX;
      const newWidth = Math.max(80, Math.min(400, startWidth + deltaX));
      setColumnWidths(prev => ({
        ...prev,
        [columnId]: newWidth
      }));
    };

    const handleMouseUp = () => {
      setResizingColumn(null);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [columnWidths]);

  return (
    <div className="bg-white border border-[#E0DBD7] rounded-[5px] overflow-hidden w-full">
      {/* Filter Bar */}
      <div className="p-4 border-b border-[#E0DBD7] bg-[#F8F6F4]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Filter Button */}
            <div className="relative" ref={filterPopoverRef}>
              <button
                ref={filterButtonRef}
                onClick={() => {
                  if (!showFilters && filterButtonRef.current) {
                    const rect = filterButtonRef.current.getBoundingClientRect();
                    setPopoverPosition({
                      top: rect.bottom + window.scrollY + 8,
                      left: rect.left + window.scrollX
                    });
                  }
                  setShowFilters(!showFilters);
                }}
                className={`flex items-center justify-center border rounded-[5px] px-3 py-1 z-20 transition-colors ${
                  showFilters || selectedGroupFilter.length > 0 || 
                  selectedRelationshipFilter.length > 0 || selectedMealPreferenceFilter.length > 0 ||
                  globalFilter || Object.keys(columnFilters).length > 0
                    ? 'border-[#A85C36] bg-[#A85C36] text-white'
                    : 'border-[#AB9C95] text-[#332B42] hover:text-[#A85C36]'
                }`}
                aria-label="Toggle Filters"
              >
                <ListFilter className="w-4 h-4" />
              </button>
              
              {/* Filter Dropdown */}
              <AnimatePresence>
                {showFilters && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="fixed p-4 bg-white border border-[#AB9C95] rounded-[5px] shadow-lg z-50 min-w-[250px] space-y-3"
                    style={{
                      top: popoverPosition.top,
                      left: popoverPosition.left
                    }}
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
                            onChange={() => handleGroupFilterChange('ungrouped')}
                            className="mr-1 rounded text-[#A85C36] focus:ring-[#A85C36]"
                          />
                          Ungrouped
                        </label>
                        <label className="flex items-center text-xs text-[#332B42] cursor-pointer">
                          <input
                            type="checkbox"
                            value="multiple"
                            checked={selectedGroupFilter.includes('multiple')}
                            onChange={() => handleGroupFilterChange('multiple')}
                            className="mr-1 rounded text-[#A85C36] focus:ring-[#A85C36]"
                          />
                          Multiple Groups
                        </label>
                        {(wizardState.guestGroups || []).map((group) => (
                          <label key={group.id} className="flex items-center text-xs text-[#332B42] cursor-pointer">
                            <input
                              type="checkbox"
                              value={group.id}
                              checked={selectedGroupFilter.includes(group.id)}
                              onChange={() => handleGroupFilterChange(group.id)}
                              className="mr-1 rounded text-[#A85C36] focus:ring-[#A85C36]"
                            />
                            {group.name} ({group.type})
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Filter by Relationship */}
                    {uniqueRelationships.length > 0 && (
                      <div>
                        <span className="text-xs font-medium text-[#332B42] block mb-2">Filter by Relationship</span>
                        <div className="flex flex-wrap gap-2">
                          {uniqueRelationships.map((relationship) => (
                            <label key={relationship} className="flex items-center text-xs text-[#332B42] cursor-pointer">
                              <input
                                type="checkbox"
                                value={relationship}
                                checked={selectedRelationshipFilter.includes(relationship)}
                                onChange={() => handleRelationshipFilterChange(relationship)}
                                className="mr-1 rounded text-[#A85C36] focus:ring-[#A85C36]"
                              />
                              {relationship}
                            </label>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Filter by Meal Preference */}
                    {uniqueMealPreferences.length > 0 && (
                      <div>
                        <span className="text-xs font-medium text-[#332B42] block mb-2">Filter by Meal Preference</span>
                        <div className="flex flex-wrap gap-2">
                          {uniqueMealPreferences.map((preference) => (
                            <label key={preference} className="flex items-center text-xs text-[#332B42] cursor-pointer">
                              <input
                                type="checkbox"
                                value={preference}
                                checked={selectedMealPreferenceFilter.includes(preference)}
                                onChange={() => handleMealPreferenceFilterChange(preference)}
                                className="mr-1 rounded text-[#A85C36] focus:ring-[#A85C36]"
                              />
                              {preference}
                            </label>
                          ))}
                        </div>
                      </div>
                    )}

                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Search Bar */}
            <div className="relative w-60 min-w-48 max-w-80">
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
                placeholder="Search all columns..."
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
                className="w-full pl-6 text-xs text-[#332B42] border-0 border-b border-[#AB9C95] focus:border-[#A85C36] focus:ring-0 py-1 placeholder:text-[#AB9C95] focus:outline-none bg-transparent"
              />
            </div>
            
            <div className="flex items-center gap-2 text-sm text-[#AB9C95]">
              <span>Showing {sortedAndFilteredGuests.length} of {wizardState.guests.length} guests</span>
              {selectedRows.size > 0 && (
                <span className="text-[#A85C36] font-medium">
                  • {selectedRows.size} selected
                </span>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Bulk Actions */}
            {selectedRows.size > 0 && (
              <>
                <button
                  onClick={() => setSelectedRows(new Set())}
                  className="text-xs text-[#A85C36] hover:text-[#8B4513] transition-colors"
                >
                  Clear selection
                </button>
                {/* Only show delete button if there are removable guests selected */}
                {Array.from(selectedRows).some(guestId => {
                  const guest = wizardState.guests.find(g => g.id === guestId);
                  return guest && guest.isRemovable !== false;
                }) && (
                  <button
                    onClick={() => {
                      // Only include removable guests in the delete list
                      const removableGuestIds = Array.from(selectedRows).filter(guestId => {
                        const guest = wizardState.guests.find(g => g.id === guestId);
                        return guest && guest.isRemovable !== false;
                      });
                      setGuestsToDelete(removableGuestIds);
                      setShowDeleteConfirm(true);
                    }}
                    className="px-3 py-1.5 text-xs bg-red-500 text-white rounded-[3px] hover:bg-red-600 transition-colors"
                  >
                    Delete Selected ({Array.from(selectedRows).filter(guestId => {
                      const guest = wizardState.guests.find(g => g.id === guestId);
                      return guest && guest.isRemovable !== false;
                    }).length})
                  </button>
                )}
                {selectedRows.size >= 2 && (
                  <button
                    onClick={() => {
                      // This will be handled by the parent component
                      if (onShowLinkUsersModal) {
                        onShowLinkUsersModal(Array.from(selectedRows));
                      }
                    }}
                    className="px-3 py-1.5 text-xs bg-[#A85C36] text-white rounded-[3px] hover:bg-[#8B4513] transition-colors"
                  >
                    Link Guests ({selectedRows.size})
                  </button>
                )}
              </>
            )}
            {/* Clear Filters Button */}
            {(globalFilter.trim() || Object.values(columnFilters).some(filter => filter.trim()) || selectedGroupFilter.length > 0 || selectedRelationshipFilter.length > 0 || selectedMealPreferenceFilter.length > 0 || sortConfig) && (
              <button
                onClick={clearAllFilters}
                className="text-xs text-[#A85C36] hover:text-[#8B4513] transition-colors"
              >
                Clear all filters
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Selected Filter Pills */}
      {(selectedGroupFilter.length > 0 || selectedRelationshipFilter.length > 0 || selectedMealPreferenceFilter.length > 0 || sortConfig) && (
        <div className="px-4 py-2 bg-[#F8F6F4] border-b border-[#E0DBD7]">
          <div className="flex flex-wrap gap-2">
            {/* Sort Pill */}
            {sortConfig && (
              <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-[#805d93] text-white rounded-full">
                {sortConfig.key === 'fullName' ? 'Name' : 
                 sortConfig.key === 'relationship' ? 'Relationship' :
                 sortConfig.key === 'mealPreference' ? 'Meal Preference' :
                 sortConfig.key === 'notes' ? 'Notes' :
                 sortConfig.key === 'primaryGroup' ? 'Primary Group' :
                 sortConfig.key === 'groupCount' ? 'Group Count' :
                 sortConfig.key === 'groupType' ? 'Group Type' :
                 guestColumns.find(col => col.key === sortConfig.key)?.label || sortConfig.key}
                : {sortConfig.direction === 'asc' ? 'A-Z' : 'Z-A'}
                <button
                  onClick={() => setSortConfig(null)}
                  className="hover:bg-white hover:bg-opacity-20 rounded-full p-0.5"
                >
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </span>
            )}
            {selectedGroupFilter.map((groupFilter) => (
              <span
                key={`group-${groupFilter}`}
                className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-[#A85C36] text-white rounded-full"
              >
                {groupFilter === 'ungrouped' ? 'Ungrouped' :
                 groupFilter === 'multiple' ? 'Multiple Groups' :
                 (wizardState.guestGroups || []).find(g => g.id === groupFilter)?.name || groupFilter}
                <button
                  onClick={() => handleGroupFilterChange(groupFilter)}
                  className="hover:bg-white hover:bg-opacity-20 rounded-full p-0.5"
                >
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </span>
            ))}
            {selectedRelationshipFilter.map((relationship) => (
              <span
                key={`relationship-${relationship}`}
                className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-[#A85C36] text-white rounded-full"
              >
                {relationship}
                <button
                  onClick={() => handleRelationshipFilterChange(relationship)}
                  className="hover:bg-white hover:bg-opacity-20 rounded-full p-0.5"
                >
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </span>
            ))}
            {selectedMealPreferenceFilter.map((preference) => (
              <span
                key={`meal-${preference}`}
                className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-[#A85C36] text-white rounded-full"
              >
                {preference}
                <button
                  onClick={() => handleMealPreferenceFilterChange(preference)}
                  className="hover:bg-white hover:bg-opacity-20 rounded-full p-0.5"
                >
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </span>
            ))}
          </div>
        </div>
      )}
      
      <div className="overflow-x-auto w-full">
        <table className="w-full border-collapse">
          {/* Header */}
          <thead>
            <tr className="bg-[#F8F6F4]">
              {/* Selection Column */}
              <th 
                className="p-3 text-center text-sm font-medium text-[#AB9C95] border-r border-[#E0DBD7] whitespace-nowrap"
                style={{ width: '50px' }}
              >
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  ref={(input) => {
                    if (input) input.indeterminate = isIndeterminate;
                  }}
                  onChange={toggleAllRows}
                  className="rounded border-[#AB9C95] text-[#A85C36] focus:ring-[#A85C36] w-4 h-4"
                />
              </th>
              
              <th
                className="p-3 text-left text-sm font-medium text-[#AB9C95] border-r border-[#E0DBD7] whitespace-nowrap relative group cursor-pointer hover:bg-[#F3F2F0] transition-colors"
                style={{ width: columnWidths.fullName }}
                onClick={() => handleSort('fullName')}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span>Full Name*</span>
                    <span className="text-[#AB9C95] opacity-0 group-hover:opacity-100 transition-opacity">
                      {sortConfig?.key === 'fullName' ? (
                        <span className="text-[#A85C36]">
                          {sortConfig.direction === 'asc' ? '↑' : '↓'}
                        </span>
                      ) : (
                        <ArrowUpDown className="w-3.5 h-3.5" />
                      )}
                    </span>
                  </div>
                  <div className="w-1 h-full bg-transparent" />
                </div>
                <div
                  className={`absolute top-0 right-0 w-1 h-full cursor-col-resize transition-opacity ${
                    resizingColumn === 'fullName' 
                      ? 'opacity-100 bg-[#A85C36]' 
                      : 'opacity-0 group-hover:opacity-100 hover:bg-[#A85C36]'
                  }`}
                  onMouseDown={(e) => handleResizeStart(e, 'fullName')}
                />
              </th>
              {guestColumns.map((column) => (
                <th 
                  key={column.id} 
                  className="p-3 text-left text-sm font-medium text-[#AB9C95] border-r border-[#E0DBD7] whitespace-nowrap relative group cursor-pointer hover:bg-[#F3F2F0] transition-colors"
                  style={{ width: columnWidths[column.id] }}
                  onClick={() => handleSort(column.key)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span>{column.label}</span>
                      <span className="text-[#AB9C95] opacity-0 group-hover:opacity-100 transition-opacity">
                        {sortConfig?.key === column.key ? (
                          <span className="text-[#A85C36]">
                            {sortConfig.direction === 'asc' ? '↑' : '↓'}
                          </span>
                        ) : (
                          <ArrowUpDown className="w-3.5 h-3.5" />
                        )}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">

                      {column.id === 'mealPreference' && onShowMealOptionsModal && (
                        <button
                          onClick={() => onShowMealOptionsModal(column.options || [])}
                          className="text-xs text-[#AB9C95] hover:text-[#332B42] transition-colors"
                          title="Edit meal options"
                        >
                          <Settings className="w-4 h-4" />
                        </button>
                      )}
                      {column.id === 'relationship' && onShowRelationshipOptionsModal && (
                        <button
                          onClick={() => onShowRelationshipOptionsModal(column.options || [])}
                          className="text-xs text-[#AB9C95] hover:text-[#332B42] transition-colors"
                          title="Edit relationship options"
                        >
                          <Settings className="w-4 h-4" />
                        </button>
                      )}
                      {/* Custom dropdown columns - show edit options button */}
                      {column.type === 'select' && column.id !== 'mealPreference' && column.id !== 'relationship' && onShowColumnOptionsModal && (
                        <button
                          onClick={() => onShowColumnOptionsModal(column.options || [], column.id)}
                          className="text-xs text-[#AB9C95] hover:text-[#332B42] transition-colors"
                          title="Edit dropdown options"
                        >
                          <Settings className="w-4 h-4" />
                        </button>
                      )}
                      {column.isRemovable && onRemoveColumn && (
                        <button
                          onClick={() => onRemoveColumn(column.id)}
                          className="text-xs text-red-500 hover:text-red-700 transition-colors opacity-0 group-hover:opacity-100"
                          title="Remove column"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  </div>
                  <div
                    className={`absolute top-0 right-0 w-1 h-full cursor-col-resize transition-opacity ${
                      resizingColumn === column.id 
                        ? 'opacity-100 bg-[#A85C36]' 
                        : 'opacity-0 group-hover:opacity-100 hover:bg-[#A85C36]'
                    }`}
                    onMouseDown={(e) => handleResizeStart(e, column.id)}
                  />
                </th>
              ))}
              <th 
                className="p-3 text-center text-sm font-medium text-[#AB9C95] whitespace-nowrap relative group"
                style={{ width: columnWidths.actions }}
              >
                Actions
                <div
                  className={`absolute top-0 right-0 w-1 h-full cursor-col-resize transition-opacity ${
                    resizingColumn === 'actions' 
                      ? 'opacity-100 bg-[#A85C36]' 
                      : 'opacity-0 group-hover:opacity-100 hover:bg-[#A85C36]'
                  }`}
                  onMouseDown={(e) => handleResizeStart(e, 'actions')}
                />
              </th>
            </tr>
          </thead>

          {/* Body */}
          <tbody>
            {sortedAndFilteredGuests.map((guest, index) => {
              // Find all groups for this guest (with safety check for guestGroups)
              const allGuestGroups = wizardState.guestGroups || [];
              const guestGroupIds = guest.groupIds || (guest.groupId ? [guest.groupId] : []);
              const guestGroups = allGuestGroups.filter(group => 
                guestGroupIds.includes(group.id)
              );
              
              return (
                <tr
                  key={guest.id}
                  className={`border-b border-[#E0DBD7] last:border-b-0 hover:bg-[#F8F6F4] ${
                    index % 2 === 0 ? 'bg-white' : 'bg-[#FAF9F8]'
                  } ${selectedRows.has(guest.id) ? 'bg-[#F0F4FF] ring-1 ring-[#A85C36]' : ''}`}
                >
                {/* Selection Column */}
                <td 
                  className="p-3 border-r border-[#E0DBD7] whitespace-nowrap text-center"
                  style={{ width: '50px' }}
                >
                  <input
                    type="checkbox"
                    checked={selectedRows.has(guest.id)}
                    onChange={() => toggleRowSelection(guest.id)}
                    className="rounded border-[#AB9C95] text-[#A85C36] focus:ring-[#A85C36] w-4 h-4"
                  />
                </td>
                
                <td 
                  className="p-3 border-r border-[#E0DBD7] whitespace-nowrap"
                  style={{ width: columnWidths.fullName }}
                >
                  <div className="flex items-center gap-2 flex-1">
                    <input
                      type="text"
                      value={guest.fullName || ''}
                      onChange={(e) => onUpdateGuest(guest.id, 'fullName', e.target.value)}
                      className="flex-1 border-none bg-transparent text-sm text-[#332B42] focus:outline-none"
                      placeholder="Full Name"
                    />
                    {guestGroups.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {guestGroups.map((group, groupIndex) => (
                          <span
                            key={group.id}
                            className={`px-1.5 py-0.5 text-xs font-medium text-white rounded-full shadow-sm cursor-pointer hover:opacity-80 transition-opacity ${
                              guestGroups.length > 1 ? 'ring-1 ring-white ring-opacity-30' : ''
                            }`}
                            style={{ 
                              backgroundColor: getGroupColor(group.name),
                              opacity: guestGroups.length > 1 && groupIndex > 0 ? 0.9 : 1
                            }}
                            title={`${group.name} (${group.type})${guestGroups.length > 1 ? ' - Part of multiple groups' : ''} - Click to edit`}
                            onClick={() => onEditGroup?.(group.id)}
                          >
                            {group.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </td>
                {guestColumns.map((column) => {
                  // Get cell value - handle both direct properties and custom fields
                  let cellValue = '';
                  if (column.key === 'relationship' || column.key === 'mealPreference' || column.key === 'notes') {
                    cellValue = guest[column.key as keyof Guest] as string || '';
                  } else {
                    // Custom column - get value from customFields
                    cellValue = guest.customFields?.[column.key] || '';
                  }
                  
                  return (
                    <td 
                      key={column.id} 
                      className="p-3 border-r border-[#E0DBD7] whitespace-nowrap"
                      style={{ width: columnWidths[column.id] }}
                    >
                      {column.type === 'select' && column.options ? (
                        <div className="relative">
                          <select
                            value={cellValue}
                            onChange={(e) => onUpdateGuest(guest.id, column.key, e.target.value)}
                            className="w-full border border-[#AB9C95] px-2 py-1 text-sm rounded bg-white text-[#332B42] appearance-none focus:outline-none focus:ring-2 focus:ring-[#A85C36] pr-6"
                          >
                            <option value="">Select</option>
                            {column.options.map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                          <svg
                            className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-[#AB9C95]"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      ) : (
                        <input
                          type={column.type === 'number' ? 'number' : 'text'}
                          value={cellValue}
                          onChange={(e) => onUpdateGuest(guest.id, column.key, e.target.value)}
                          className={`w-full px-2 py-1 text-sm text-[#332B42] focus:outline-none ${
                            column.id === 'notes' 
                              ? 'border-none bg-transparent' 
                              : 'border border-[#AB9C95] rounded bg-white focus:ring-2 focus:ring-[#A85C36]'
                          }`}
                          placeholder={column.label}
                        />
                      )}
                    </td>
                  );
                })}
                <td 
                  className="p-3 whitespace-nowrap text-center"
                  style={{ width: columnWidths.actions }}
                >
                  <button
                    onClick={() => onRemoveGuest(guest.id)}
                    disabled={wizardState.guests.length === 1}
                    className={`transition-colors ${
                      wizardState.guests.length === 1 
                        ? 'text-gray-400 cursor-not-allowed' 
                        : 'text-red-500 hover:text-red-700'
                    }`}
                    title={wizardState.guests.length === 1 ? "Cannot remove the only guest" : "Remove guest"}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      
      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-[5px] border border-[#AB9C95] max-w-md w-full mx-4">
            {/* Header */}
            <div className="p-6 pb-4 border-b border-[#E0DBD7]">
              <h3 className="text-lg font-playfair font-semibold text-[#332B42]">
                Confirm Deletion
              </h3>
            </div>
            
            {/* Content */}
            <div className="p-6 pt-4">
              <p className="text-sm text-[#332B42] mb-2">
                Are you sure you want to delete {guestsToDelete.length} guest{guestsToDelete.length === 1 ? '' : 's'}?
              </p>
              <p className="text-xs text-[#AB9C95]">
                This action cannot be undone.
              </p>
            </div>
            
            {/* Footer */}
            <div className="flex justify-end gap-3 p-6 pt-4 border-t border-[#E0DBD7]">
              <button
                onClick={handleDeleteCancel}
                className="btn-primaryinverse text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-4 py-2 text-sm bg-red-500 text-white rounded-[3px] hover:bg-red-600 transition-colors"
              >
                Delete {guestsToDelete.length} Guest{guestsToDelete.length === 1 ? '' : 's'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
