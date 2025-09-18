import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { WizardState, Guest, GuestColumn } from '../types';
import { useRouter, useSearchParams } from 'next/navigation';
import { getCategoryHexColor } from '@/utils/categoryStyle';

const INITIAL_WIZARD_STATE: WizardState = {
  currentStep: 'guests',
  guests: [
    {
      id: 'guest-default-1',
      fullName: '',
      mealPreference: '',
      relationship: '',
      notes: '',
      customFields: {},
      tableId: null,
      seatNumber: null,
      isRemovable: false // First guest is not removable
    }
  ],
  guestGroups: [],
  tableLayout: {
    tables: [],
    totalCapacity: 0
  },
  organizationChoice: null,
  chartName: '',
  eventType: 'Wedding Event',
  description: '',
  fullNameColumnWidth: 150
};

const INITIAL_GUEST_COLUMNS: GuestColumn[] = [
  { 
    id: 'relationship', 
    key: 'relationship', 
    label: 'Relationship to You', 
    type: 'select', 
    options: ['Bride\'s Family', 'Groom\'s Family', 'Bride\'s Friends', 'Groom\'s Friends', 'Work Colleagues', 'College Friends', 'Childhood Friends', 'Neighbors', 'Other'], 
    isRequired: false, 
    isEditable: true, 
    isRemovable: false, 
    order: 2,
    width: 100
  },
  { 
    id: 'mealPreference', 
    key: 'mealPreference', 
    label: 'Meal Preference', 
    type: 'select', 
    options: ['Beef', 'Chicken', 'Fish', 'Vegetarian', 'Vegan', 'Gluten-Free'], 
    isRequired: false, 
    isEditable: true, 
    isRemovable: false, 
    order: 3,
    width: 100
  },
  { 
    id: 'notes', 
    key: 'notes', 
    label: 'Notes/Seating Arrangement', 
    type: 'text', 
    isRequired: false, 
    isEditable: true, 
    isRemovable: false, 
    order: 4,
    width: 250
  }
];

export const useWizardState = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const hasUpdatedUrl = useRef(false);
  
  // Store session ID in state to ensure it's stable
  const [sessionId, setSessionId] = useState<string>(() => {
    // Try to get from URL first
    const urlSessionId = searchParams?.get('session');
    if (urlSessionId) {
      return urlSessionId;
    }
    
    // Generate new session ID
    return `wizard-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  });
  
  // Generate or retrieve session ID
  const getSessionId = useCallback((): string => {
    return sessionId;
  }, [sessionId]);

  // Initialize state from local storage using session ID
  const getInitialState = (): WizardState => {
    const storageKey = `seatingChartWizard_${sessionId}`;
    
    const storedState = localStorage.getItem(storageKey);
    if (storedState) {
      try {
        const parsedState = JSON.parse(storedState);
        // Ensure guestGroups is always an array for backward compatibility
        return {
          ...parsedState,
          guestGroups: parsedState.guestGroups || []
        };
      } catch (e) {
        console.warn('Failed to parse stored state:', e);
      }
    }
    
    return INITIAL_WIZARD_STATE;
  };

  const [wizardState, setWizardState] = useState<WizardState>(getInitialState);
  const [guestColumns, setGuestColumns] = useState<GuestColumn[]>(() => {
    const storageKey = `seatingChartGuestColumns_${sessionId}`;
    
    const stored = localStorage.getItem(storageKey);
    return stored ? JSON.parse(stored) : INITIAL_GUEST_COLUMNS;
  });

  // Update URL with session ID if needed (moved to useEffect)
  useEffect(() => {
    const urlSessionId = searchParams?.get('session');
    if (!urlSessionId && !hasUpdatedUrl.current) {
      const newParams = new URLSearchParams(searchParams?.toString() || '');
      newParams.set('session', sessionId);
      const newUrl = `${window.location.pathname}?${newParams.toString()}`;
      window.history.replaceState({}, '', newUrl);
      hasUpdatedUrl.current = true;
    }
  }, [searchParams, sessionId]);

  // Persist state to local storage whenever it changes
  useEffect(() => {
    const storageKey = `seatingChartWizard_${sessionId}`;
    localStorage.setItem(storageKey, JSON.stringify(wizardState));
  }, [wizardState, sessionId]);

  // Persist guest columns to local storage
  useEffect(() => {
    const storageKey = `seatingChartGuestColumns_${sessionId}`;
    localStorage.setItem(storageKey, JSON.stringify(guestColumns));
  }, [guestColumns, sessionId]);

  // Cleanup function to clear stored state
  const clearStoredState = useCallback(() => {
    const wizardKey = `seatingChartWizard_${sessionId}`;
    const columnsKey = `seatingChartGuestColumns_${sessionId}`;
    
    localStorage.removeItem(wizardKey);
    localStorage.removeItem(columnsKey);
    
    // Clear session storage for table layout persistence
    sessionStorage.removeItem('seating-chart-table-positions');
    sessionStorage.removeItem('seating-chart-canvas-transform');
    sessionStorage.removeItem('seating-chart-table-dimensions');
    sessionStorage.removeItem('seating-chart-guest-assignments');
    
    // Clear session from URL
    const newParams = new URLSearchParams(searchParams?.toString() || '');
    newParams.delete('session');
    const newUrl = `${window.location.pathname}${newParams.toString() ? '?' + newParams.toString() : ''}`;
    window.history.replaceState({}, '', newUrl);
  }, [searchParams, sessionId]);

  // Computed values
  const areChartDetailsComplete = useMemo(() => {
    // Chart name and event type are required, description is optional
    return wizardState.chartName.trim() !== '' && 
           wizardState.eventType.trim() !== '';
  }, [wizardState.chartName, wizardState.eventType]);

  const canProceedToNext = useCallback(() => {
    // For step 1 (guests), check if chart details are complete and at least one guest exists
    // For step 2 (tables), check if tables exist and capacity is sufficient
    // For step 3 (organization), check if organization choice is made
    
    // Since we're now using numeric steps in the single page, we'll make this more flexible
    // For now, just check if chart details are complete and at least one guest exists
    return areChartDetailsComplete && wizardState.guests.length > 0;
  }, [wizardState.guests.length, areChartDetailsComplete]);

  // State update functions
  const updateWizardState = useCallback((updates: Partial<WizardState>) => {
    setWizardState(prev => ({ ...prev, ...updates }));
  }, []);

  const updateTableLayout = useCallback((updates: Partial<WizardState['tableLayout']>) => {
    setWizardState(prev => ({ 
      ...prev, 
      tableLayout: { ...prev.tableLayout, ...updates } 
    }));
  }, []);

  const goToStep = useCallback((step: WizardState['currentStep']) => {
    setWizardState(prev => ({ ...prev, currentStep: step }));
  }, []);

  const goToNextStep = useCallback(() => {
    if (wizardState.currentStep === 'guests') {
      setWizardState(prev => ({ ...prev, currentStep: 'tables' }));
    } else if (wizardState.currentStep === 'tables') {
      setWizardState(prev => ({ ...prev, currentStep: 'organization' }));
    }
  }, [wizardState.currentStep]);

  const goToPreviousStep = useCallback(() => {
    if (wizardState.currentStep === 'tables') {
      setWizardState(prev => ({ ...prev, currentStep: 'guests' }));
    } else if (wizardState.currentStep === 'organization') {
      setWizardState(prev => ({ ...prev, currentStep: 'tables' }));
    }
  }, [wizardState.currentStep]);

  const resetWizard = useCallback(() => {
    setWizardState(INITIAL_WIZARD_STATE);
    setGuestColumns(INITIAL_GUEST_COLUMNS);
  }, []);

  // Guest management functions
  const addGuest = useCallback((guest: Omit<Guest, 'id'>) => {
    const newGuest: Guest = {
      id: `guest-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      fullName: guest.fullName || '',
      mealPreference: guest.mealPreference || '',
      relationship: guest.relationship || '',
      notes: guest.notes || '',
      customFields: guest.customFields || {},
      tableId: null,
      seatNumber: null,
      isRemovable: true // New guests are removable by default
    };
    
    setWizardState(prev => {
      const newGuests = [newGuest, ...prev.guests];
      
      // If this is the second guest being added, make the first guest removable
      if (newGuests.length === 2) {
        newGuests[1] = { ...newGuests[1], isRemovable: true };
      }
      
      return { ...prev, guests: newGuests };
    });
  }, []);

  const updateGuest = useCallback((guestId: string, field: keyof Guest | string, value: string) => {
    setWizardState(prev => ({
      ...prev,
      guests: prev.guests.map(guest => {
        if (guest.id === guestId) {
          if (field === 'fullName' || field === 'mealPreference' || field === 'relationship' || field === 'notes') {
            return { ...guest, [field]: value };
          } else {
            // Custom field - ensure customFields exists
            return { ...guest, customFields: { ...(guest.customFields || {}), [field]: value } };
          }
        }
        return guest;
      })
    }));
  }, []);

  const removeGuest = useCallback((guestId: string) => {
    setWizardState(prev => {
      // Don't allow removal if this would leave zero guests
      if (prev.guests.length <= 1) {
        return prev; // Don't change state
      }
      
      return {
        ...prev,
        guests: prev.guests.filter(guest => {
          // Don't remove guests that are marked as non-removable
          if (guest.id === guestId && guest.isRemovable === false) {
            return true; // Keep the guest
          }
          return guest.id !== guestId;
        })
      };
    });
  }, []);

  // Column management functions
  const updateColumn = useCallback((columnId: string, updates: Partial<GuestColumn>) => {
    setGuestColumns(prev => 
      prev.map(col => col.id === columnId ? { ...col, ...updates } : col)
    );
  }, []);

  const removeColumn = useCallback((columnId: string) => {
    setGuestColumns(prev => prev.filter(col => col.id !== columnId));
  }, []);

  const toggleColumnVisibility = useCallback((columnId: string) => {
    // Don't allow toggling Full Name column
    if (columnId === 'fullName') return;
    
    setGuestColumns(prev => {
      const existingColumn = prev.find(col => col.id === columnId);
      
      if (existingColumn) {
        // Column exists, remove it (hide it)
        return prev.filter(col => col.id !== columnId);
      } else {
        // Column doesn't exist, add it back (show it)
        // Find the default column configuration
        const defaultColumn = INITIAL_GUEST_COLUMNS.find(col => col.id === columnId);
        if (defaultColumn) {
          return [...prev, { ...defaultColumn }];
        }
        return prev;
      }
    });
  }, []);

  const handleColumnResize = useCallback((columnId: string, newWidth: number) => {
    // Constrain width to reasonable limits
    const constrainedWidth = Math.max(80, Math.min(300, newWidth));
    
    if (columnId === 'fullName') {
      // Handle Full Name column resize
      setWizardState(prev => ({ ...prev, fullNameColumnWidth: constrainedWidth }));
      return;
    }
    
    // Check if the new width would make the table too wide
    setGuestColumns(prev => {
      const newColumns = prev.map(col => 
        col.id === columnId ? { ...col, width: constrainedWidth } : col
      );
      
      // Calculate total table width with the new column width
      const totalWidth = (wizardState.fullNameColumnWidth || 150) + 
                        newColumns.reduce((sum, col) => sum + (col.width || 120), 0) + 60;
      
      // If table would be too wide (more than 1200px), don't apply the resize
      if (totalWidth > 1200) {
        return prev; // Return original columns without changes
      }
      
      return newColumns;
    });
  }, [wizardState.fullNameColumnWidth]);



  const addColumn = useCallback((column: Omit<GuestColumn, 'id'>) => {
    const newColumn: GuestColumn = {
      ...column,
      id: `column-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      width: 120 // Set a reasonable default width
    };
    
    setGuestColumns(prev => {
      // Check if adding this column would make the table too wide
      const currentTotalWidth = (wizardState.fullNameColumnWidth || 150) + 
                               prev.reduce((sum, col) => sum + (col.width || 120), 0) + 60;
      const newTotalWidth = currentTotalWidth + 120; // 120 is the new column width
      
      // If adding the column would make the table too wide, don't add it
      if (newTotalWidth > 1200) {
        return prev; // Return original columns without adding the new one
      }
      
      return [...prev, newColumn];
    });
  }, [wizardState.fullNameColumnWidth]);

  const reorderColumns = useCallback((draggedColumnId: string, targetColumnId: string) => {
    if (draggedColumnId === targetColumnId) return;
    
    setGuestColumns(prev => {
      const newColumns = [...prev];
      const draggedIndex = newColumns.findIndex(col => col.id === draggedColumnId);
      const targetIndex = newColumns.findIndex(col => col.id === targetColumnId);
      
      if (draggedIndex === -1 || targetIndex === -1) return prev;
      
      // Remove dragged column from its current position
      const [draggedColumn] = newColumns.splice(draggedIndex, 1);
      
      // Insert at target position
      newColumns.splice(targetIndex, 0, draggedColumn);
      
      // Update order numbers
      newColumns.forEach((col, index) => {
        col.order = index + 1;
      });
      
      return newColumns;
    });
  }, []);

  // Guest group management functions
  const createGuestGroup = useCallback((groupData: {
    name: string;
    type: 'couple' | 'family' | 'extended' | 'friends' | 'other';
    memberIds: string[];
  }) => {
    const newGroup = {
      id: `group-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: groupData.name,
      type: groupData.type,
      guestIds: groupData.memberIds,
      color: getGroupColor(groupData.name),
      createdAt: new Date()
    };

    setWizardState(prev => ({
      ...prev,
      guestGroups: [...(prev.guestGroups || []), newGroup],
      guests: prev.guests.map(guest => 
        groupData.memberIds.includes(guest.id) 
          ? { 
              ...guest, 
              groupIds: [...(guest.groupIds || []), newGroup.id],
              // Keep legacy groupId for backward compatibility
              groupId: newGroup.id
            }
          : guest
      )
    }));
  }, []);

  const removeGuestGroup = useCallback((groupId: string) => {
    setWizardState(prev => ({
      ...prev,
      guestGroups: (prev.guestGroups || []).filter(group => group.id !== groupId),
      guests: prev.guests.map(guest => {
        const updatedGroupIds = (guest.groupIds || []).filter(id => id !== groupId);
        return {
          ...guest,
          groupIds: updatedGroupIds,
          // Update legacy groupId to the first remaining group or undefined
          groupId: updatedGroupIds.length > 0 ? updatedGroupIds[0] : undefined
        };
      })
    }));
  }, []);

  const getGroupColor = (groupName: string): string => {
    return getCategoryHexColor(groupName);
  };

  // Helper function to get all groups for a guest
  const getGuestGroups = useCallback((guestId: string) => {
    const guest = wizardState.guests.find(g => g.id === guestId);
    if (!guest) return [];
    
    const groupIds = guest.groupIds || (guest.groupId ? [guest.groupId] : []);
    return (wizardState.guestGroups || []).filter(group => groupIds.includes(group.id));
  }, [wizardState.guests, wizardState.guestGroups]);

  // Function to add guests to an existing group
  const addGuestsToGroup = useCallback((groupId: string, guestIds: string[]) => {
    setWizardState(prev => ({
      ...prev,
      guestGroups: (prev.guestGroups || []).map(group => 
        group.id === groupId 
          ? { ...group, guestIds: [...new Set([...group.guestIds, ...guestIds])] }
          : group
      ),
      guests: prev.guests.map(guest => 
        guestIds.includes(guest.id) 
          ? { 
              ...guest, 
              groupIds: [...new Set([...(guest.groupIds || []), groupId])],
              // Keep legacy groupId for backward compatibility
              groupId: groupId
            }
          : guest
      )
    }));
  }, []);

  // Function to update an existing group
  const updateGuestGroup = useCallback((groupId: string, updates: {
    name: string;
    type: 'couple' | 'family' | 'extended' | 'friends' | 'other';
    guestIds: string[];
  }) => {
    setWizardState(prev => {
      // First, remove all guests from this group
      const guestsWithoutGroup = prev.guests.map(guest => ({
        ...guest,
        groupIds: (guest.groupIds || []).filter(id => id !== groupId),
        // Update legacy groupId if it was this group
        groupId: guest.groupId === groupId ? undefined : guest.groupId
      }));

      // Then, add the updated guests to the group
      const updatedGuests = guestsWithoutGroup.map(guest => 
        updates.guestIds.includes(guest.id) 
          ? { 
              ...guest, 
              groupIds: [...(guest.groupIds || []), groupId],
              // Update legacy groupId
              groupId: groupId
            }
          : guest
      );

      return {
        ...prev,
        guestGroups: (prev.guestGroups || []).map(group => 
          group.id === groupId 
            ? { ...group, name: updates.name, type: updates.type, guestIds: updates.guestIds }
            : group
        ),
        guests: updatedGuests
      };
    });
  }, []);

  // Helper functions
  const getCellValue = useCallback((guest: Guest, columnKey: string): string => {
    const value = guest[columnKey as keyof Guest];
    if (typeof value === 'string') return value;
    if (typeof value === 'number') return value.toString();
    if (value && typeof value === 'object') return JSON.stringify(value);
    return '';
  }, []);

  const returnValue = {
    wizardState,
    guestColumns,
    areChartDetailsComplete,
    canProceedToNext,
    updateWizardState,
    updateTableLayout,
    goToStep,
    goToNextStep,
    goToPreviousStep,
    resetWizard,
    addGuest,
    updateGuest,
    removeGuest,
    updateColumn,
    removeColumn,
    addColumn,
    reorderColumns,
    getCellValue,
    sessionId,
    clearStoredState,
    handleColumnResize,
    toggleColumnVisibility,
    createGuestGroup,
    removeGuestGroup,
    getGroupColor,
    getGuestGroups,
    addGuestsToGroup,
    updateGuestGroup
  };

  return returnValue;
};
