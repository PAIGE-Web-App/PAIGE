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
    console.log('Avatar click detected:', tableId, seatNumber, 'Action key:', actionKey);
    console.log('Current showingActions:', showingActions);
    
    const newValue = showingActions === actionKey ? null : actionKey;
    console.log('Setting showingActions to:', newValue);
    setShowingActions(newValue);
  }, []);

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
    handleAvatarClick,
    handleMoveGuest,
    handleRemoveGuest,
    getGuestAvatarColor,
  };
};
