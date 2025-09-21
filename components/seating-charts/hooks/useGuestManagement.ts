import { useState, useCallback, useMemo, useEffect } from 'react';
import { Guest } from '../../../types/seatingChart';

export interface GuestAssignment {
  tableId: string;
  seatIndex: number;
  position?: { x: number; y: number }; // Optional for backward compatibility
}

export const useGuestManagement = (
  guests: Guest[],
  onGuestAssignment?: (guestId: string, tableId: string, seatIndex: number) => void
) => {
  // Guest assignment state with session persistence
  const [guestAssignments, setGuestAssignments] = useState<Record<string, GuestAssignment>>(() => {
    const savedAssignments = sessionStorage.getItem('seating-chart-guest-assignments');
    if (savedAssignments) {
      try {
        const parsed = JSON.parse(savedAssignments);
        if (parsed && typeof parsed === 'object') {
          return parsed;
        }
      } catch (error) {
        console.warn('Failed to parse saved guest assignments:', error);
      }
    }
    return {};
  });
  const [showingActions, setShowingActions] = useState<string | null>(null);

  // Save guest assignments to sessionStorage whenever they change
  useEffect(() => {
    sessionStorage.setItem('seating-chart-guest-assignments', JSON.stringify(guestAssignments));
  }, [guestAssignments]);

  // Listen for changes to session storage (when assignments are restored from Firestore)
  useEffect(() => {
    const handleAssignmentsRestored = (event: CustomEvent) => {
      console.log('🔄 GUEST MANAGEMENT - Event received! Updating assignments:', event.detail.assignments);
      setGuestAssignments(event.detail.assignments);
    };

    const handleStorageChange = () => {
      const savedAssignments = sessionStorage.getItem('seating-chart-guest-assignments');
      if (savedAssignments) {
        try {
          const parsed = JSON.parse(savedAssignments);
          if (parsed && typeof parsed === 'object') {
            setGuestAssignments(parsed);
          }
        } catch (error) {
          console.warn('Failed to parse saved guest assignments from storage change:', error);
        }
      }
    };

    // Listen for custom event when assignments are restored
    window.addEventListener('guestAssignmentsRestored', handleAssignmentsRestored as EventListener);
    
    // Listen for storage events (from other tabs/windows)
    window.addEventListener('storage', handleStorageChange);
    
    // Also check on mount in case assignments were restored in the same tab
    handleStorageChange();

    return () => {
      window.removeEventListener('guestAssignmentsRestored', handleAssignmentsRestored as EventListener);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Fallback: Check for assignments on every render (in case event doesn't fire)
  useEffect(() => {
    const savedAssignments = sessionStorage.getItem('seating-chart-guest-assignments');
    if (savedAssignments) {
      try {
        const parsed = JSON.parse(savedAssignments);
        if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) {
          // Only update if we have assignments and they're different from current state
          const currentKeys = Object.keys(guestAssignments).sort();
          const savedKeys = Object.keys(parsed).sort();
          if (JSON.stringify(currentKeys) !== JSON.stringify(savedKeys)) {
            setGuestAssignments(parsed);
          }
        }
      } catch (error) {
        // Silently ignore parsing errors in fallback
      }
    }
  });

  // Get unassigned guests (guests not yet assigned to tables)
  const unassignedGuests = useMemo(() => {
    return guests.filter(guest => !guestAssignments[guest.id]);
  }, [guests, guestAssignments]);

  // Get assigned guests count for each table
  const getTableAssignedCount = useCallback((tableId: string) => {
    return Object.values(guestAssignments).filter(assignment => assignment.tableId === tableId).length;
  }, [guestAssignments]);

  // Handle guest assignment when dropped on a seat
  const handleGuestDrop = useCallback((guestId: string, tableId: string, seatIndex: number) => {
    // Validation: Check if the guest exists
    const guest = guests.find(g => g.id === guestId);
    if (!guest) {
      console.warn('Guest not found:', guestId);
      return;
    }
    
    // Validation: Check if seatIndex is valid (allow -1 for removal)
    if (seatIndex === -1) {
      // Remove the guest's assignment
      const newAssignments = { ...guestAssignments };
      delete newAssignments[guestId];
      setGuestAssignments(newAssignments);
      return;
    }
    
    // Remove any existing assignment for this guest
    const newAssignments = { ...guestAssignments };
    
    // Check if there are already guests assigned to this seat
    const existingAtSeat = Object.values(newAssignments).filter(
      assignment => assignment.tableId === tableId && assignment.seatIndex === seatIndex
    );
    
    // If there are already guests at this seat, find the next available seat
    if (existingAtSeat.length > 0) {
      // Find the next available seat index
      const table = guests.find(g => g.id === guestId)?.tableId ? 
        Object.values(newAssignments).filter(a => a.tableId === tableId) : [];
      const usedSeats = table.map(a => a.seatIndex);
      let nextSeatIndex = seatIndex;
      while (usedSeats.includes(nextSeatIndex)) {
        nextSeatIndex++;
      }
      seatIndex = nextSeatIndex;
    }
    
    // Add new assignment with seat index
    newAssignments[guestId] = { tableId, seatIndex };
    
    setGuestAssignments(newAssignments);
    
    // Call parent callback if provided
    if (onGuestAssignment) {
      onGuestAssignment(guestId, tableId, seatIndex);
    }
  }, [guests, guestAssignments, onGuestAssignment]);

  // Handle action icon clicks
  const handleAvatarClick = useCallback((tableId: string, seatNumber: number) => {
    const actionKey = `${tableId}-${seatNumber}`;
    const newValue = showingActions === actionKey ? null : actionKey;
    setShowingActions(newValue);
  }, [showingActions]);

  const handleMoveGuest = useCallback((guestId: string, tableId: string, position: { x: number; y: number }) => {
    // Remove current assignment and set to "moving" state
    const newAssignments = { ...guestAssignments };
    delete newAssignments[guestId];
    setGuestAssignments(newAssignments);
    setShowingActions(null);
    
    // TODO: Implement move mode - for now just remove
    if (onGuestAssignment) {
      onGuestAssignment(guestId, tableId, -1);
    }
  }, [guestAssignments, onGuestAssignment]);

  const handleRemoveGuest = useCallback((guestId: string, tableId: string, position: { x: number; y: number }) => {
    handleGuestDrop(guestId, tableId, -1);
    setShowingActions(null);
  }, [handleGuestDrop]);

  // Handle guest swapping between seats
  const handleGuestSwap = useCallback((
    guestId1: string, 
    tableId1: string, 
    seatIndex1: number,
    tableId2: string, 
    seatIndex2: number
  ) => {
    // Get current assignments
    const newAssignments = { ...guestAssignments };
    
    // Find the guest currently in the destination seat (if any)
    const guestInDestinationSeat = Object.keys(newAssignments).find(key => {
      const assignment = newAssignments[key];
      return assignment.tableId === tableId2 && assignment.seatIndex === seatIndex2;
    });
    
    // Perform the swap
    if (guestInDestinationSeat) {
      // Move guest from destination seat to source seat
      newAssignments[guestInDestinationSeat] = { tableId: tableId1, seatIndex: seatIndex1 };
      
      // Move guest1 to destination seat
      newAssignments[guestId1] = { tableId: tableId2, seatIndex: seatIndex2 };
    } else {
      // Simple move (destination seat is empty)
      // Remove the original assignment first
      delete newAssignments[guestId1];
      
      // Add new assignment
      newAssignments[guestId1] = { tableId: tableId2, seatIndex: seatIndex2 };
    }
    
    setGuestAssignments(newAssignments);
    
    // Call parent callback for both guests if provided
    if (onGuestAssignment) {
      onGuestAssignment(guestId1, tableId2, seatIndex2);
      if (guestInDestinationSeat) {
        onGuestAssignment(guestInDestinationSeat, tableId1, seatIndex1);
      }
    }
  }, [guestAssignments, onGuestAssignment]);

  // Generate consistent avatar color for guest
  const getGuestAvatarColor = useCallback((guestId: string) => {
    const colors = [
      '#A85C36', '#364257', '#8B5A96', '#2E8B57', '#D2691E',
      '#4682B4', '#CD853F', '#708090', '#20B2AA', '#FF6347'
    ];
    const hash = guestId.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    return colors[Math.abs(hash) % colors.length];
  }, []);

  // Clean up assignments for tables that no longer exist
  const cleanupStaleAssignments = useCallback((existingTableIds: string[]) => {
    const newAssignments = { ...guestAssignments };
    let hasChanges = false;
    
    Object.keys(newAssignments).forEach(guestId => {
      const assignment = newAssignments[guestId];
      if (!existingTableIds.includes(assignment.tableId)) {
        delete newAssignments[guestId];
        hasChanges = true;
      }
    });
    
    if (hasChanges) {
      setGuestAssignments(newAssignments);
    }
  }, [guestAssignments, setGuestAssignments]);

  // Update guest positions when a table is moved
  const updateGuestPositionsForTable = useCallback((tableId: string, deltaX: number, deltaY: number) => {
    const newAssignments = { ...guestAssignments };
    let hasChanges = false;
    
    Object.keys(newAssignments).forEach(guestId => {
      const assignment = newAssignments[guestId];
      if (assignment.tableId === tableId && assignment.position) {
        newAssignments[guestId] = {
          ...assignment,
          position: {
            x: assignment.position.x + deltaX,
            y: assignment.position.y + deltaY
          }
        };
        hasChanges = true;
      }
    });
    
    if (hasChanges) {
      setGuestAssignments(newAssignments);
    }
  }, [guestAssignments, setGuestAssignments]);

  // Fix overlapping guest assignments by redistributing them
  const fixOverlappingAssignments = useCallback(() => {
    const newAssignments = { ...guestAssignments };
    let hasChanges = false;
    
    // Group assignments by table
    const assignmentsByTable: Record<string, Array<{guestId: string, assignment: GuestAssignment}>> = {};
    Object.keys(newAssignments).forEach(guestId => {
      const assignment = newAssignments[guestId];
      if (!assignmentsByTable[assignment.tableId]) {
        assignmentsByTable[assignment.tableId] = [];
      }
      assignmentsByTable[assignment.tableId].push({ guestId, assignment });
    });
    
    // Fix overlapping assignments for each table
    Object.keys(assignmentsByTable).forEach(tableId => {
      const tableAssignments = assignmentsByTable[tableId];
      
      // Group assignments by seat index
      const seatGroups: Record<number, Array<{guestId: string, assignment: GuestAssignment}>> = {};
      
      tableAssignments.forEach(({ guestId, assignment }) => {
        if (!seatGroups[assignment.seatIndex]) {
          seatGroups[assignment.seatIndex] = [];
        }
        seatGroups[assignment.seatIndex].push({ guestId, assignment });
      });
      
      // Redistribute overlapping groups (multiple guests at same seat index)
      Object.keys(seatGroups).forEach(seatIndexStr => {
        const seatIndex = parseInt(seatIndexStr);
        const group = seatGroups[seatIndex];
        
        if (group && group.length > 1) {
          // Multiple guests at the same seat - redistribute them to consecutive seats
          group.forEach(({ guestId }, guestIndex) => {
            if (guestIndex > 0) {
              // Move to next available seat index
              const newSeatIndex = seatIndex + guestIndex;
              
              newAssignments[guestId] = {
                ...newAssignments[guestId],
                seatIndex: newSeatIndex
              };
              hasChanges = true;
            }
          });
        }
      });
    });
    
    if (hasChanges) {
      setGuestAssignments(newAssignments);
    }
  }, [guestAssignments, setGuestAssignments]);

  return {
    guestAssignments,
    setGuestAssignments,
    unassignedGuests,
    showingActions,
    setShowingActions,
    getTableAssignedCount,
    handleGuestDrop,
    handleGuestSwap,
    handleAvatarClick,
    handleMoveGuest,
    handleRemoveGuest,
    getGuestAvatarColor,
    cleanupStaleAssignments,
    updateGuestPositionsForTable,
    fixOverlappingAssignments
  };
};
