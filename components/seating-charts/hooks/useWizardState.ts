import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { WizardState, Guest, GuestColumn } from '../types';
import { useRouter, useSearchParams } from 'next/navigation';

const INITIAL_WIZARD_STATE: WizardState = {
  currentStep: 'guests',
  guests: [],
  tableLayout: {
    tables: [],
    totalCapacity: 0
  },
  organizationChoice: null,
  chartName: '',
  eventType: 'Wedding Event',
  description: ''
};

const INITIAL_GUEST_COLUMNS: GuestColumn[] = [
  { 
    id: 'relationship', 
    key: 'relationship', 
    label: 'Relationship', 
    type: 'select', 
    options: ['Family', 'Friends', 'Bride\'s Side', 'Groom\'s Side', 'Work Colleagues', 'College Friends', 'Childhood Friends', 'Neighbors', 'Other'], 
    isRequired: false, 
    isEditable: true, 
    isRemovable: true, 
    order: 2 
  },
  { 
    id: 'mealPreference', 
    key: 'mealPreference', 
    label: 'Meal Preference', 
    type: 'select', 
    options: ['Beef', 'Chicken', 'Fish', 'Vegetarian', 'Vegan', 'Gluten-Free'], 
    isRequired: false, 
    isEditable: true, 
    isRemovable: true, 
    order: 3 
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
        return JSON.parse(storedState);
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
      customFields: guest.customFields || {},
      tableId: null,
      seatNumber: null
    };
    setWizardState(prev => ({ ...prev, guests: [...prev.guests, newGuest] }));
  }, []);

  const updateGuest = useCallback((guestId: string, field: keyof Guest | string, value: string) => {
    setWizardState(prev => ({
      ...prev,
      guests: prev.guests.map(guest => {
        if (guest.id === guestId) {
          if (field === 'fullName' || field === 'mealPreference' || field === 'relationship') {
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
    setWizardState(prev => ({
      ...prev,
      guests: prev.guests.filter(guest => guest.id !== guestId)
    }));
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

  const addColumn = useCallback((column: Omit<GuestColumn, 'id'>) => {
    const newColumn: GuestColumn = {
      ...column,
      id: `column-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };
    setGuestColumns(prev => [...prev, newColumn]);
  }, []);

  // Helper functions
  const getCellValue = useCallback((guest: Guest, columnKey: string): string => {
    const value = guest[columnKey as keyof Guest];
    if (typeof value === 'string') return value;
    if (typeof value === 'number') return value.toString();
    if (value && typeof value === 'object') return JSON.stringify(value);
    return '';
  }, []);

  return {
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
    getCellValue,
    sessionId,
    clearStoredState
  };
};
