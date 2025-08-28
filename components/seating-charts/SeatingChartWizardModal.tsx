"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { useCustomToast } from '../../hooks/useCustomToast';
import { SeatingChart } from '../../types/seatingChart';
import { 
  CSVUploadModal,
  WizardSidebar,
  ChartDetailsForm,
  GuestListTable,
  WizardFooter,
  AddColumnModal,
  MealOptionsModal,
  TableLayoutStep,
  AIOrganizationStep
} from './index';
import { WizardState, Guest, GuestColumn } from './types';

interface SeatingChartWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onChartCreated: (chart: SeatingChart) => void;
}

type WizardStep = 'guests' | 'tables' | 'organization';

const WIZARD_STEPS: { key: WizardStep; label: string; icon: React.ComponentType<any> }[] = [
  { key: 'guests', label: 'Guest Information', icon: () => null },
  { key: 'tables', label: 'Table Layout', icon: () => null },
  { key: 'organization', label: 'AI Organization', icon: () => null }
];

export default function SeatingChartWizardModal({ 
  isOpen, 
  onClose, 
  onChartCreated 
}: SeatingChartWizardModalProps) {
  const { showSuccessToast, showErrorToast } = useCustomToast();
  
  // Wizard state
  const [wizardState, setWizardState] = useState<WizardState>({
    currentStep: 'guests',
    guests: [],
    tableLayout: {
      tables: [],
      totalCapacity: 0
    },
    organizationChoice: null,
    chartName: '',
    eventType: '',
    description: ''
  });

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showCSVUploadModal, setShowCSVUploadModal] = useState(false);
  const [showAutoSave, setShowAutoSave] = useState(false);
  const [showAddColumnModal, setShowAddColumnModal] = useState(false);
  
  // Dynamic columns state (firstName and lastName are now fixed columns)
  const [guestColumns, setGuestColumns] = useState<GuestColumn[]>([
    { id: 'mealPreference', key: 'mealPreference', label: 'Meal Preference', type: 'select', options: ['Beef', 'Chicken', 'Fish', 'Vegetarian', 'Vegan', 'Gluten-Free'], isRequired: false, isEditable: true, isRemovable: true, order: 2 },
    { id: 'relationship', key: 'relationship', label: 'Relationship', type: 'select', options: ['Family', 'Friends', 'Bride\'s Side', 'Groom\'s Side', 'Work Colleagues', 'College Friends', 'Childhood Friends', 'Neighbors', 'Other'], isRequired: false, isEditable: true, isRemovable: true, order: 3 }
  ]);

  // State for editing meal preference options
  const [showMealOptionsModal, setShowMealOptionsModal] = useState(false);
  const [editingMealOptions, setEditingMealOptions] = useState<string[]>([]);

  // State for editing relationship options
  const [showRelationshipOptionsModal, setShowRelationshipOptionsModal] = useState(false);
  const [editingRelationshipOptions, setEditingRelationshipOptions] = useState<string[]>([]);

  // State for editing any column's options
  const [showColumnOptionsModal, setShowColumnOptionsModal] = useState(false);
  const [editingColumnOptions, setEditingColumnOptions] = useState<string[]>([]);
  const [editingColumnId, setEditingColumnId] = useState<string>('');

  // State for column validation
  const [columnNameError, setColumnNameError] = useState('');

  // Initialize wizard state
  useEffect(() => {
    if (isOpen) {
      // Reset to initial state when opening
      setWizardState({
        currentStep: 'guests',
        guests: [],
        tableLayout: {
          tables: [],
          totalCapacity: 0
        },
        organizationChoice: null,
        chartName: '',
        eventType: 'Wedding Event', // Default value
        description: ''
      });
    }
  }, [isOpen]);

  // Auto-save functionality
  const autoSave = useCallback(async () => {
    try {
      // Save current progress to localStorage
      localStorage.setItem('seatingChartWizardDraft', JSON.stringify(wizardState));
      
      // Show auto-save indicator
      setShowAutoSave(true);
      setTimeout(() => setShowAutoSave(false), 3000); // Hide after 3 seconds
      
      // TODO: Save to Firebase draft collection when we implement it
      // For now, just localStorage
    } catch (error) {
      console.warn('Auto-save failed:', error);
    }
  }, [wizardState]);

  // Auto-save when wizard state changes
  useEffect(() => {
    if (isOpen && wizardState.guests.length > 0) {
      const timeoutId = setTimeout(autoSave, 2000); // Debounced auto-save
      return () => clearTimeout(timeoutId);
    }
  }, [wizardState, isOpen, autoSave]);

  // Guest management functions
  const addGuest = () => {
    const newGuest: Guest = {
      id: `guest-${Date.now()}`,
      firstName: '',
      lastName: '',
      mealPreference: '',
      relationship: '',
      customFields: {}, // Initialize empty custom fields
      tableId: null,
      seatNumber: null
    };
    setWizardState(prev => ({
      ...prev,
      guests: [...prev.guests, newGuest]
    }));
    // Don't auto-save empty guest - wait for actual user input
  };

  // Helper function to get cell value (handles both standard and custom fields)
  const getCellValue = (guest: Guest, fieldKey: string): string => {
    if (fieldKey === 'firstName' || fieldKey === 'lastName' || fieldKey === 'mealPreference' || fieldKey === 'relationship') {
      return guest[fieldKey as keyof Guest] as string || '';
    } else {
      // Custom field - ensure customFields exists
      return (guest.customFields && guest.customFields[fieldKey]) || '';
    }
  };

  const updateGuest = (guestId: string, field: keyof Guest | string, value: string) => {
    setWizardState(prev => ({
      ...prev,
      guests: prev.guests.map(guest => {
        if (guest.id === guestId) {
          if (field === 'firstName' || field === 'lastName' || field === 'mealPreference' || field === 'relationship') {
            return { ...guest, [field]: value };
          } else {
            // Custom field - ensure customFields exists
            return { ...guest, customFields: { ...(guest.customFields || {}), [field]: value } };
          }
        }
        return guest;
      })
    }));
  };

  const removeGuest = (guestId: string) => {
    setWizardState(prev => ({
      ...prev,
      guests: prev.guests.filter(guest => guest.id !== guestId)
    }));
    // Don't auto-save when removing guests - wait for actual user input
  };

  // Function to update meal preference options
  const updateMealPreferenceOptions = (newOptions: string[]) => {
    setGuestColumns(prev => prev.map(col => 
      col.key === 'mealPreference' 
        ? { ...col, options: newOptions }
        : col
    ));
    // Don't auto-save column config changes - wait for actual user input
  };

  // Function to update relationship options
  const updateRelationshipOptions = (newOptions: string[]) => {
    setGuestColumns(prev => prev.map(col => 
      col.key === 'relationship' 
        ? { ...col, options: newOptions }
        : col
    ));
    // Don't auto-save column config changes - wait for actual user input
  };

  // Dynamic column management functions
  const addColumn = () => {
    setShowAddColumnModal(true);
  };

  const createColumn = (columnData: Omit<GuestColumn, 'id' | 'order'>) => {
    const newColumn: GuestColumn = {
      id: `column-${Date.now()}`,
      ...columnData,
      key: columnData.key || `custom-${Date.now()}`,
      order: guestColumns.length + 2 // Start after First Name (0) and Last Name (1)
    };
    setGuestColumns(prev => [...prev, newColumn]);
    setShowAddColumnModal(false);
    // Don't auto-save column creation - wait for actual user input
  };

  const updateColumn = (columnId: string, updates: Partial<GuestColumn>) => {
    setGuestColumns(prev => prev.map(col => 
      col.id === columnId ? { ...col, ...updates } : col
    ));
    // Don't auto-save column updates - wait for actual user input
  };

  const removeColumn = (columnId: string) => {
    setGuestColumns(prev => prev.filter(col => col.id !== columnId));
    // Don't auto-save column removal - wait for actual user input
  };

  // Drag and drop column reordering
  const handleDragStart = (e: React.DragEvent, columnId: string) => {
    e.dataTransfer.setData('text/plain', columnId);
    e.currentTarget.classList.add('opacity-50', 'scale-105', 'shadow-lg');
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.add('bg-[#F0F0F0]');
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.currentTarget.classList.remove('bg-[#F0F0F0]');
  };

  const handleDrop = (e: React.DragEvent, targetColumnId: string) => {
    e.preventDefault();
    e.currentTarget.classList.remove('bg-[#F0F0F0]');
    
    const draggedColumnId = e.dataTransfer.getData('text/plain');
    if (draggedColumnId === targetColumnId) return;

    // Find indices of dragged and target columns
    const draggedIndex = guestColumns.findIndex(col => col.id === draggedColumnId);
    const targetIndex = guestColumns.findIndex(col => col.id === targetColumnId);
    
    if (draggedIndex === -1 || targetIndex === -1) return;

    // Create new array with reordered columns
    const reorderedColumns = [...guestColumns];
    const [draggedColumn] = reorderedColumns.splice(draggedIndex, 1);
    reorderedColumns.splice(targetIndex, 0, draggedColumn);

    // Update order property for all columns
    const updatedColumns = reorderedColumns.map((col, index) => ({
      ...col,
      order: index + 2 // Start after First Name (0) and Last Name (1)
    }));

    setGuestColumns(updatedColumns);
    
    // Auto-save the new column order
    setTimeout(() => autoSave(), 100);
  };

  const handleDragEnd = (e: React.DragEvent) => {
    e.currentTarget.classList.remove('opacity-50', 'scale-105', 'shadow-lg');
  };

  const handleGuestsUploaded = (guests: Guest[]) => {
    setWizardState(prev => ({
      ...prev,
      guests: [...prev.guests, ...guests]
    }));
    setShowCSVUploadModal(false);
    showSuccessToast(`Successfully uploaded ${guests.length} guests!`);
  };

  // Manual save draft
  const handleSaveDraft = async () => {
    try {
      setIsLoading(true);
      await autoSave();
      showSuccessToast('Draft saved successfully!');
    } catch (error) {
      showErrorToast('Failed to save draft');
    } finally {
      setIsLoading(false);
    }
  };

  // Create final seating chart
  const handleCreateChart = async () => {
    try {
      setIsLoading(true);
      
      // Create the seating chart object
      const seatingChart: SeatingChart = {
        id: `chart-${Date.now()}`,
        name: wizardState.chartName,
        eventType: 'Wedding Event', // Default since we removed the field
        description: wizardState.description,
        guestCount: wizardState.guests.length,
        tableCount: wizardState.tableLayout.tables.length,
        tables: wizardState.tableLayout.tables.map(table => ({
          id: table.id,
          name: table.name,
          type: table.type,
          capacity: table.capacity,
          position: { x: 0, y: 0 }, // Default position
          guests: [], // No guests assigned yet
          isActive: true
        })),
        guests: wizardState.guests,
        seatingRules: [], // Will be populated based on organization choice
        createdAt: new Date(),
        updatedAt: new Date(),
        isActive: true,
        isTemplate: false
      };

      // Call the callback to handle the created chart
      onChartCreated(seatingChart);
      
      showSuccessToast('Seating chart created successfully!');
      onClose();
    } catch (error) {
      showErrorToast('Failed to create seating chart');
    } finally {
      setIsLoading(false);
    }
  };

  // Navigation functions
  const goToStep = (step: WizardStep) => {
    setWizardState(prev => ({ ...prev, currentStep: step }));
  };

  const goToNextStep = () => {
    const currentIndex = WIZARD_STEPS.findIndex(step => step.key === wizardState.currentStep);
    if (currentIndex < WIZARD_STEPS.length - 1) {
      const nextStep = WIZARD_STEPS[currentIndex + 1].key;
      goToStep(nextStep);
    }
  };

  const goToPreviousStep = () => {
    const currentIndex = WIZARD_STEPS.findIndex(step => step.key === wizardState.currentStep);
    if (currentIndex > 0) {
      const prevStep = WIZARD_STEPS[currentIndex - 1].key;
      goToStep(prevStep);
    }
  };

  // Check if chart details are complete
  const areChartDetailsComplete = (): boolean => {
    const hasChartName = wizardState.chartName.trim() !== '';
    return hasChartName;
  };

  // Step validation
  const canProceedToNext = (): boolean => {
    switch (wizardState.currentStep) {
      case 'guests':
        // Guests are optional - only require chart details
        const hasChartName = wizardState.chartName.trim() !== '';
        return hasChartName;
      case 'tables':
        return wizardState.tableLayout.tables.length > 0;
      case 'organization':
        return wizardState.organizationChoice !== null;
      default:
        return false;
    }
  };

  // Exit wizard with confirmation
  const handleExitWizard = () => {
    if (wizardState.guests.length > 0 || wizardState.chartName.trim() !== '') {
      setShowExitConfirm(true);
    } else {
      onClose();
    }
  };

  // Confirm exit and save draft
  const confirmExit = async () => {
    try {
      await autoSave();
      showSuccessToast('Progress saved as draft');
      onClose();
    } catch (error) {
      showErrorToast('Failed to save draft');
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-white z-50 flex"
      >
        {/* Sidebar */}
        <WizardSidebar
          currentStep={wizardState.currentStep}
          onStepClick={goToStep}
        />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col h-full bg-[#F3F2F0] relative">
          {/* Fixed Header */}
          <div className="fixed top-0 right-0 left-[300px] bg-[#F3F2F0] border-b border-[#AB9C95] z-50 flex items-center justify-between px-8" style={{paddingTop: '1rem', paddingBottom: '1rem'}}>
            <h2 className="text-xl font-playfair font-semibold text-[#332B42]">
              {WIZARD_STEPS.find(step => step.key === wizardState.currentStep)?.label}
            </h2>
            <button
              onClick={handleExitWizard}
              className="text-[#332B42] hover:text-[#A85C36] p-2 rounded-full"
              aria-label="Close"
            >
              <X size={20} />
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 flex flex-col h-full overflow-y-auto px-0 pb-32 pt-24">
            <div className="flex-1 overflow-y-auto p-8 pt-4">
              <div className="w-full">
                {/* Step 1: Guest Information */}
                {wizardState.currentStep === 'guests' && (
                  <div className="bg-white rounded-[5px] border border-[#AB9C95] p-6 mb-6">
                    {/* Chart Details Form */}
                    <ChartDetailsForm
                      wizardState={wizardState}
                      onUpdate={(updates) => setWizardState(prev => ({ ...prev, ...updates }))}
                      areChartDetailsComplete={areChartDetailsComplete()}
                    />

                    {/* Guest List Table */}
                    <div className="pt-6">
                      <GuestListTable
                        wizardState={wizardState}
                        guestColumns={guestColumns}
                        areChartDetailsComplete={areChartDetailsComplete()}
                        onAddGuest={addGuest}
                        onUpdateGuest={updateGuest}
                        onRemoveGuest={removeGuest}
                        onUpdateColumn={updateColumn}
                        onRemoveColumn={removeColumn}
                        onSetEditingState={(updates) => setWizardState(prev => ({ ...prev, ...updates }))}
                        onShowCSVUploadModal={() => setShowCSVUploadModal(true)}
                        onShowAddColumnModal={() => setShowAddColumnModal(true)}
                                              onShowMealOptionsModal={(options, columnKey) => {
                          if (columnKey === 'mealPreference') {
                            setEditingMealOptions(options);
                            setShowMealOptionsModal(true);
                          } else if (columnKey === 'relationship') {
                            setEditingRelationshipOptions(options);
                            setShowRelationshipOptionsModal(true);
                          } else {
                            // Handle any other dropdown column
                            const column = guestColumns.find(col => col.key === columnKey);
                            if (column) {
                              setEditingColumnOptions(options);
                              setEditingColumnId(column.id);
                              setShowColumnOptionsModal(true);
                            }
                          }
                        }}
                        getCellValue={getCellValue}
                        onDragStart={handleDragStart}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onDragEnd={handleDragEnd}
                      />
                    </div>
                  </div>
                )}

                {/* Step 2: Table Layout */}
                {wizardState.currentStep === 'tables' && (
                  <div className="bg-white rounded-[5px] border border-[#AB9C95] p-6">
                    <TableLayoutStep
                      tableLayout={wizardState.tableLayout}
                      onUpdate={(updates) => setWizardState(prev => ({ 
                        ...prev, 
                        tableLayout: updates 
                      }))}
                      guestCount={wizardState.guests.length}
                    />
                  </div>
                )}

                {/* Step 3: AI Organization */}
                {wizardState.currentStep === 'organization' && (
                  <div className="bg-white rounded-[5px] border border-[#AB9C95] p-6">
                    <AIOrganizationStep
                      guests={wizardState.guests}
                      tableLayout={wizardState.tableLayout}
                      organizationChoice={wizardState.organizationChoice}
                      onUpdate={(choice) => setWizardState(prev => ({ 
                        ...prev, 
                        organizationChoice: choice 
                      }))}
                      onChartCreated={handleCreateChart}
                      isLoading={isLoading}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Fixed Footer */}
        <div className="fixed bottom-0 right-0 left-[300px] bg-[#F3F2F0] border-t border-[#AB9C95] z-40 flex justify-between items-center px-8" style={{paddingTop: '1rem', paddingBottom: '1rem'}}>
          {/* Left side - Auto-save indicator */}
          <div className="flex items-center">
            <AnimatePresence>
              {showAutoSave && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex items-center gap-2 text-sm text-[#7A7A7A]"
                >
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span>Auto-saved</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Right side - Action buttons */}
          <div className="flex gap-4">
            <button
              onClick={handleSaveDraft}
              disabled={isLoading}
              className="btn-primaryinverse flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {isLoading ? 'Saving...' : 'Save Draft'}
            </button>
            
            {wizardState.currentStep !== 'guests' && (
              <button
                onClick={goToPreviousStep}
                className="btn-primaryinverse flex items-center gap-2"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </button>
            )}
            
            {wizardState.currentStep !== 'organization' && (
              <button
                onClick={goToNextStep}
                disabled={!canProceedToNext()}
                className="btn-primary flex items-center gap-2"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
            
            {wizardState.currentStep === 'organization' && (
              <button
                onClick={() => {/* TODO: Create chart */}}
                disabled={!canProceedToNext()}
                className="btn-primary flex items-center gap-2"
              >
                Create Chart
                <Sparkles className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Exit Confirmation Modal */}
        <AnimatePresence>
          {showExitConfirm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white rounded-[5px] p-6 max-w-md w-full mx-4"
              >
                <h3 className="h4 text-[#332B42] mb-4">Save Your Progress?</h3>
                <p className="text-sm text-[#AB9C95] mb-6">
                  You have unsaved changes. Would you like to save your progress as a draft before exiting?
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowExitConfirm(false)}
                    className="btn-primaryinverse flex-1"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmExit}
                    className="btn-primary flex-1"
                  >
                    Save & Exit
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Add Column Modal */}
        <AnimatePresence>
          {showAddColumnModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center p-4 z-50"
              onClick={() => setShowAddColumnModal(false)}
            >
              <motion.div
                initial={{ y: -50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -50, opacity: 0 }}
                className="bg-white rounded-[5px] shadow-xl max-w-md w-full p-6 relative"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header row with title and close button */}
                <div className="flex items-center justify-between mb-4">
                  <h5 className="h5 text-[#332B42]">Add New Column</h5>
                  <button
                    onClick={() => setShowAddColumnModal(false)}
                    className="text-[#7A7A7A] hover:text-[#332B42] p-1 rounded-full"
                    title="Close"
                  >
                    <X size={20} />
                  </button>
                </div>
                
                <div className="space-y-4">
                  {/* Column Name */}
                  <div>
                    <label className="block space-y-1">
                      <span className="text-xs font-medium text-[#332B42]">Column Name</span>
                      <input
                        type="text"
                        id="columnName"
                        placeholder="e.g., Phone Number, Address"
                        onChange={() => setColumnNameError('')}
                        className={`w-full border px-4 py-2 text-sm rounded-[5px] focus:outline-none focus:ring-2 focus:ring-[#A85C36] ${
                          columnNameError ? "border-red-500" : "border-[#AB9C95]"
                        }`}
                      />
                    </label>
                    {columnNameError && <div className="text-xs text-red-500 mt-1">{columnNameError}</div>}
                  </div>

                  {/* Field Type */}
                  <div>
                    <label className="block space-y-1">
                      <span className="text-xs font-medium text-[#332B42]">Field Type</span>
                      <div className="relative">
                        <select
                          id="fieldType"
                          onChange={(e) => {
                            const optionsDiv = document.getElementById('dropdownOptions');
                            if (optionsDiv) {
                              optionsDiv.classList.toggle('hidden', e.target.value !== 'select');
                            }
                          }}
                          className="w-full border pr-10 pl-4 py-2 text-sm rounded-[5px] bg-white text-[#332B42] appearance-none focus:outline-none focus:ring-2 focus:ring-[#A85C36] border-[#AB9C95]"
                        >
                          <option value="text">Text Entry</option>
                          <option value="select">Dropdown</option>
                          <option value="number">Number</option>
                        </select>
                        {/* Custom chevron icon */}
                        <svg
                          className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#332B42]"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </label>
                  </div>

                  {/* Dropdown Options (conditional) */}
                  <div id="dropdownOptions" className="hidden">
                    <label className="block space-y-1">
                      <span className="text-xs font-medium text-[#332B42]">Dropdown Options (one per line)</span>
                      <textarea
                        id="dropdownOptionsText"
                        placeholder="Option 1
Option 2
Option 3"
                        rows={4}
                        className="w-full border border-[#AB9C95] px-4 py-2 text-sm rounded-[5px] focus:outline-none focus:ring-2 focus:ring-[#A85C36] resize-none"
                      />
                    </label>
                  </div>

                  {/* Required Field */}
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="isRequired"
                      className="rounded border-[#AB9C95] text-[#A85C36] focus:ring-[#A85C36]"
                    />
                    <label htmlFor="isRequired" className="text-sm text-[#332B42]">
                      Required field
                    </label>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-3 mt-6">
                  <button
                    onClick={() => {
                      setShowAddColumnModal(false);
                      setColumnNameError('');
                    }}
                    className="btn-primaryinverse"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      const nameInput = document.getElementById('columnName') as HTMLInputElement;
                      const typeInput = document.getElementById('fieldType') as HTMLSelectElement;
                      const requiredInput = document.getElementById('isRequired') as HTMLInputElement;
                      const optionsInput = document.getElementById('dropdownOptionsText') as HTMLTextAreaElement;

                      if (!nameInput.value.trim()) {
                        setColumnNameError('Please enter a column name');
                        return;
                      }

                      const columnData = {
                        key: `custom-${Date.now()}`,
                        label: nameInput.value.trim(),
                        type: typeInput.value as 'text' | 'select' | 'number',
                        isRequired: requiredInput.checked,
                        isEditable: true,
                        isRemovable: true,
                        options: typeInput.value === 'select' ? optionsInput.value.split('\n').filter(opt => opt.trim()) : undefined
                      };

                      createColumn(columnData);
                    }}
                    className="btn-primary"
                  >
                    Add Column
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Meal Options Editing Modal */}
        <AnimatePresence>
          {showMealOptionsModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center p-4 z-50"
              onClick={() => setShowMealOptionsModal(false)}
            >
              <motion.div
                initial={{ y: -50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -50, opacity: 0 }}
                className="bg-white rounded-[5px] shadow-xl max-w-md w-full p-6 relative"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header row with title and close button */}
                <div className="flex items-center justify-between mb-4">
                  <h5 className="h5 text-[#332B42]">Edit Meal Options</h5>
                  <button
                    onClick={() => setShowMealOptionsModal(false)}
                    className="text-[#7A7A7A] hover:text-[#332B42] p-1 rounded-full"
                    title="Close"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="space-y-4">
                  <p className="text-sm text-[#AB9C95]">Enter meal options, one per line:</p>
                  
                  <textarea
                    value={editingMealOptions.join('\n')}
                    onChange={(e) => setEditingMealOptions(e.target.value.split('\n'))}
                    placeholder="Beef
Chicken
Fish
Vegetarian
Vegan
Gluten-Free"
                    rows={6}
                    className="w-full border border-[#AB9C95] px-4 py-2 text-sm rounded-[5px] focus:outline-none focus:ring-2 focus:ring-[#A85C36] resize-none"
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-3 mt-6">
                  <button
                    onClick={() => setShowMealOptionsModal(false)}
                    className="btn-primaryinverse"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      const filteredOptions = editingMealOptions.filter(opt => opt.trim());
                      if (filteredOptions.length > 0) {
                        updateMealPreferenceOptions(filteredOptions);
                        setShowMealOptionsModal(false);
                      } else {
                        alert('Please enter at least one meal option');
                      }
                    }}
                    className="btn-primary"
                  >
                    Save Options
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Relationship Options Editing Modal */}
        <AnimatePresence>
          {showRelationshipOptionsModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center p-4 z-50"
              onClick={() => setShowRelationshipOptionsModal(false)}
            >
              <motion.div
                initial={{ y: -50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -50, opacity: 0 }}
                className="bg-white rounded-[5px] shadow-xl max-w-md w-full p-6 relative"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header row with title and close button */}
                <div className="flex items-center justify-between mb-4">
                  <h5 className="h5 text-[#332B42]">Edit Relationship Options</h5>
                  <button
                    onClick={() => setShowRelationshipOptionsModal(false)}
                    className="text-[#7A7A7A] hover:text-[#332B42] p-1 rounded-full"
                    title="Close"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="space-y-4">
                  <p className="text-sm text-[#AB9C95]">Enter relationship options, one per line:</p>
                  
                  <textarea
                    value={editingRelationshipOptions.join('\n')}
                    onChange={(e) => setEditingRelationshipOptions(e.target.value.split('\n'))}
                    placeholder="Family
Friends
Bride's Side
Groom's Side
Work Colleagues
College Friends
Childhood Friends
Neighbors
Other"
                    rows={8}
                    className="w-full border border-[#AB9C95] px-4 py-4 text-sm rounded-[5px] focus:outline-none focus:ring-2 focus:ring-[#A85C36] resize-none"
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-3 mt-6">
                  <button
                    onClick={() => setShowRelationshipOptionsModal(false)}
                    className="btn-primaryinverse"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      const filteredOptions = editingRelationshipOptions.filter(opt => opt.trim());
                      if (filteredOptions.length > 0) {
                        updateRelationshipOptions(filteredOptions);
                        setShowRelationshipOptionsModal(false);
                      } else {
                        alert('Please enter at least one relationship option');
                      }
                    }}
                    className="btn-primary"
                  >
                    Save Options
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Generic Column Options Editing Modal */}
        <AnimatePresence>
          {showColumnOptionsModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center p-4 z-50"
              onClick={() => setShowColumnOptionsModal(false)}
            >
              <motion.div
                initial={{ y: -50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -50, opacity: 0 }}
                className="bg-white rounded-[5px] shadow-xl max-w-md w-full p-6 relative"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header row with title and close button */}
                <div className="flex items-center justify-between mb-4">
                  <h5 className="h5 text-[#332B42]">Edit Column Options</h5>
                  <button
                    onClick={() => setShowColumnOptionsModal(false)}
                    className="text-[#7A7A7A] hover:text-[#332B42] p-1 rounded-full"
                    title="Close"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="space-y-4">
                  <p className="text-sm text-[#AB9C95]">Enter options, one per line:</p>
                  
                  <textarea
                    value={editingColumnOptions.join('\n')}
                    onChange={(e) => setEditingColumnOptions(e.target.value.split('\n'))}
                    placeholder="Option 1
Option 2
Option 3
Option 4"
                    rows={6}
                    className="w-full border border-[#AB9C95] px-4 py-2 text-sm rounded-[5px] focus:outline-none focus:ring-2 focus:ring-[#A85C36] resize-none"
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-3 mt-6">
                  <button
                    onClick={() => setShowColumnOptionsModal(false)}
                    className="btn-primaryinverse"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      const filteredOptions = editingColumnOptions.filter(opt => opt.trim());
                      if (filteredOptions.length > 0) {
                        updateColumn(editingColumnId, { options: filteredOptions });
                        setShowColumnOptionsModal(false);
                      } else {
                        alert('Please enter at least one option');
                      }
                    }}
                    className="btn-primary"
                  >
                    Save Options
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* CSV Upload Modal */}
        <CSVUploadModal
          isOpen={showCSVUploadModal}
          onClose={() => setShowCSVUploadModal(false)}
          onGuestsUploaded={handleGuestsUploaded}
        />
      </motion.div>
    </AnimatePresence>
  );
}
