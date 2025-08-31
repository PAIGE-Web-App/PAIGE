import { useState, useCallback, useMemo } from 'react';
import { Guest } from '../../../types/seatingChart';

export interface GuestAssignment {
  tableId: string;
  seatNumber: number;
}

export const useGuestManagement = (
  guests: Guest[],
  onGuestAssignment?: (guestId: string, tableId: string, seatNumber: number) => void
) => {
  // Guest assignment state
  const [guestAssignments, setGuestAssignments] = useState<Record<string, GuestAssignment>>({});
  const [showingActions, setShowingActions] = useState<string | null>(null);

  // Get unassigned guests (guests not yet assigned to tables)
  const unassignedGuests = useMemo(() => {
    return guests.filter(guest => !guestAssignments[guest.id]);
  }, [guests, guestAssignments]);

  // Get assigned guests count for each table
  const getTableAssignedCount = useCallback((tableId: string) => {
    return Object.values(guestAssignments).filter(assignment => assignment.tableId === tableId).length;
  }, [guestAssignments]);

  // Handle guest assignment when dropped on a seat
  const handleGuestDrop = useCallback((guestId: string, tableId: string, seatNumber: number) => {
    // Validation: Check if the guest exists
    const guest = guests.find(g => g.id === guestId);
    if (!guest) {
      console.warn('Guest not found:', guestId);
      return;
    }
    
    // Validation: Check if the table exists
    // Note: tableLayout is not available in this hook, so we'll skip this validation
    // and let the parent component handle it if needed
    
    // Validation: Check if seat number is valid (allow -1 for removal)
    if (seatNumber !== -1 && seatNumber < 0) {
      console.warn('Invalid seat number:', seatNumber);
      return;
    }
    
    // Remove any existing assignment for this guest
    const newAssignments = { ...guestAssignments };
    
    // Remove old assignment if guest was already assigned
    Object.keys(newAssignments).forEach(key => {
      if (newAssignments[key].tableId === tableId && newAssignments[key].seatNumber === seatNumber) {
        delete newAssignments[key];
      }
    });
    
    // Handle seat removal (seatNumber === -1)
    if (seatNumber === -1) {
      // Remove the guest's assignment
      delete newAssignments[guestId];
    } else {
      // Add new assignment
      newAssignments[guestId] = { tableId, seatNumber };
    }
    
    setGuestAssignments(newAssignments);
    
    // Call parent callback if provided
    if (onGuestAssignment) {
      onGuestAssignment(guestId, tableId, seatNumber);
    }
  }, [guests, guestAssignments, onGuestAssignment]);

  // Handle action icon clicks
  const handleAvatarClick = useCallback((tableId: string, seatNumber: number) => {
    const actionKey = `${tableId}-${seatNumber}`;
    const newValue = showingActions === actionKey ? null : actionKey;
    setShowingActions(newValue);
  }, [showingActions]);

  const handleMoveGuest = useCallback((guestId: string, tableId: string, seatNumber: number) => {
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

  const handleRemoveGuest = useCallback((guestId: string, tableId: string, seatNumber: number) => {
    handleGuestDrop(guestId, tableId, -1);
    setShowingActions(null);
  }, [handleGuestDrop]);

  // Handle guest swapping between seats
  const handleGuestSwap = useCallback((
    guestId1: string, 
    tableId1: string, 
    seatNumber1: number,
    tableId2: string, 
    seatNumber2: number
  ) => {
    // Get current assignments
    const newAssignments = { ...guestAssignments };
    
    // Find the guest currently in the destination seat (if any)
    const guestInDestinationSeat = Object.keys(newAssignments).find(key => {
      const assignment = newAssignments[key];
      return assignment.tableId === tableId2 && assignment.seatNumber === seatNumber2;
    });
    
    // Perform the swap
    if (guestInDestinationSeat) {
      // Move guest from destination seat to source seat
      newAssignments[guestInDestinationSeat] = { tableId: tableId1, seatNumber: seatNumber1 };
      
      // Move guest1 to destination seat
      newAssignments[guestId1] = { tableId: tableId2, seatNumber: seatNumber2 };
    } else {
      // Simple move (destination seat is empty)
      // Remove the original assignment first
      delete newAssignments[guestId1];
      
      // Add new assignment
      newAssignments[guestId1] = { tableId: tableId2, seatNumber: seatNumber2 };
    }
    
    setGuestAssignments(newAssignments);
    
    // Call parent callback for both guests if provided
    if (onGuestAssignment) {
      onGuestAssignment(guestId1, tableId2, seatNumber2);
      if (guestInDestinationSeat) {
        onGuestAssignment(guestInDestinationSeat, tableId1, seatNumber1);
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
  };
};
