import { useState, useCallback, useMemo } from 'react';
import { WizardState, Guest, GuestColumn } from '../types';

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
  const [wizardState, setWizardState] = useState<WizardState>(INITIAL_WIZARD_STATE);
  const [guestColumns, setGuestColumns] = useState<GuestColumn[]>(INITIAL_GUEST_COLUMNS);

  // Computed values
  const areChartDetailsComplete = useMemo(() => {
    return wizardState.chartName.trim() !== '' && 
           wizardState.eventType.trim() !== '' && 
           wizardState.description.trim() !== '';
  }, [wizardState.chartName, wizardState.eventType, wizardState.description]);

  const canProceedToNext = useCallback(() => {
    switch (wizardState.currentStep) {
      case 'guests':
        return areChartDetailsComplete && wizardState.guests.length > 0;
      case 'tables':
        return wizardState.tableLayout.tables.length > 0 && 
               wizardState.tableLayout.totalCapacity >= wizardState.guests.length;
      case 'organization':
        return wizardState.organizationChoice !== null;
      default:
        return false;
    }
  }, [wizardState.currentStep, wizardState.guests.length, wizardState.tableLayout, wizardState.organizationChoice, areChartDetailsComplete]);

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
    getCellValue
  };
};
