"use client";
import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { useCustomToast } from '../../hooks/useCustomToast';
import { SeatingChart } from '../../types/seatingChart';
import { 
  CSVUploadModal,
  WizardSidebar,
  AddColumnModal,
  OptionsEditModal,
  StepContent,
  useModalState,
  useWizardState
} from './index';
import FamilyGroupingModal from './FamilyGroupingModal';

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
  
  // Use optimized hooks
  const {
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
    handleColumnResize,
    createGuestGroup,
    removeGuestGroup,
    getGroupColor
  } = useWizardState();

  const {
    modalState,
    modalData,
    openModal,
    closeModal,
    openMealOptionsModal,
    openRelationshipOptionsModal,
    openColumnOptionsModal,
    openFamilyGroupingModal,
    closeAllModals
  } = useModalState();

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [showAutoSave, setShowAutoSave] = useState(false);

  // Initialize wizard state when modal opens
  React.useEffect(() => {
    if (isOpen) {
      resetWizard();
    }
  }, [isOpen, resetWizard]);

  // Auto-save functionality
  const autoSave = useCallback(async () => {
    try {
      // TODO: Implement auto-save to Firestore
      setShowAutoSave(true);
      setTimeout(() => setShowAutoSave(false), 2000);
    } catch (error) {
      console.error('Auto-save failed:', error);
    }
  }, []);

  // Auto-save when guests change
  React.useEffect(() => {
    if (isOpen && wizardState.guests.length > 0) {
      const timeoutId = setTimeout(autoSave, 2000); // Debounced auto-save
      return () => clearTimeout(timeoutId);
    }
  }, [wizardState.guests, isOpen, autoSave]);

  // Exit wizard with confirmation
  const handleExitWizard = () => {
    if (wizardState.guests.length > 0 || wizardState.chartName.trim() !== '') {
      openModal('exitConfirm');
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

  // Handle CSV upload
  const handleGuestsUploaded = (uploadedGuests: any[]) => {
    // Convert uploaded guests to our format
    const convertedGuests = uploadedGuests.map(guest => ({
      id: `guest-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      fullName: guest.fullName || `${guest.firstName || ''} ${guest.lastName || ''}`.trim(),
      mealPreference: guest.mealPreference || '',
      relationship: guest.relationship || '',
      customFields: guest.customFields || {},
      tableId: null,
      seatNumber: null
    }));

    updateWizardState({ guests: convertedGuests });
    closeModal('csvUpload');
    showSuccessToast(`${convertedGuests.length} guests imported successfully`);
  };

  // Handle meal options modal
  const handleMealOptionsSave = (options: string[]) => {
    updateColumn('mealPreference', { options });
    closeModal('mealOptions');
  };

  // Handle relationship options modal
  const handleRelationshipOptionsSave = (options: string[]) => {
    updateColumn('relationship', { options });
    closeModal('relationshipOptions');
  };

  // Handle column options modal
  const handleColumnOptionsSave = (options: string[]) => {
    updateColumn(modalData.columnId, { options });
    closeModal('columnOptions');
  };

  // Handle guest group creation
  const handleCreateGuestGroup = (groupData: {
    name: string;
    type: 'couple' | 'family' | 'extended' | 'friends' | 'other';
    memberIds: string[];
  }) => {
    createGuestGroup(groupData);
    showSuccessToast(`Group "${groupData.name}" created successfully!`);
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, guestId: string) => {
    e.dataTransfer.setData('text/plain', guestId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    // Handle drop logic here if needed
  };

  const handleDragEnd = (e: React.DragEvent) => {
    e.preventDefault();
  };

  // Create chart
  const handleCreateChart = async () => {
    setIsLoading(true);
    try {
      // TODO: Implement chart creation logic
             const chart: SeatingChart = {
         id: `chart-${Date.now()}`,
         name: wizardState.chartName,
         eventType: wizardState.eventType,
         description: wizardState.description,
         venueName: '',
         venueImage: '',
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
         seatingRules: [],
         createdAt: new Date(),
         updatedAt: new Date(),
         isActive: true,
         isTemplate: false
       };
      
      onChartCreated(chart);
      showSuccessToast('Seating chart created successfully!');
    } catch (error) {
      showErrorToast('Failed to create seating chart');
      console.error('Chart creation error:', error);
    } finally {
      setIsLoading(false);
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
          <div className="flex-1 flex flex-col h-full overflow-y-auto px-0 pt-24">
            <div className="flex-1 overflow-y-auto p-8 pt-4">
              <div className="w-full">
                <StepContent
                  currentStep={wizardState.currentStep}
                  wizardState={wizardState}
                  guestColumns={guestColumns}
                  areChartDetailsComplete={areChartDetailsComplete}
                  onUpdateWizardState={updateWizardState}
                  onUpdateTableLayout={updateTableLayout}
                  onAddGuest={() => addGuest({ fullName: '', mealPreference: '', relationship: '', customFields: {} })}
                  onUpdateGuest={updateGuest}
                  onRemoveGuest={removeGuest}
                  onUpdateColumn={updateColumn}
                  onRemoveColumn={removeColumn}
                  onShowCSVUploadModal={() => openModal('csvUpload')}
                  onShowAddColumnModal={() => openModal('addColumn')}
                  onShowMealOptionsModal={openMealOptionsModal}
                  onShowFamilyGroupingModal={openFamilyGroupingModal}
                  getCellValue={getCellValue}
                  onDragStart={handleDragStart}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onDragEnd={handleDragEnd}
                  onColumnResize={handleColumnResize}
                  onCreateChart={handleCreateChart}
                  isLoading={isLoading}
                />
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
              onClick={autoSave}
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
                disabled={!canProceedToNext}
                className="btn-primary flex items-center gap-2"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
            
            {wizardState.currentStep === 'organization' && (
              <button
                onClick={handleCreateChart}
                disabled={!canProceedToNext}
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
          {modalState.exitConfirm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center p-4 z-50"
              onClick={() => closeModal('exitConfirm')}
            >
              <motion.div
                initial={{ y: -50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -50, opacity: 0 }}
                className="bg-white rounded-[5px] shadow-xl max-w-md w-full p-6 relative"
                onClick={(e) => e.stopPropagation()}
              >
                <h5 className="h5 text-[#332B42] mb-4">Exit Wizard?</h5>
                <p className="text-sm text-[#AB9C95] mb-6">
                  You have unsaved changes. Would you like to save your progress as a draft before exiting?
                </p>
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => closeModal('exitConfirm')}
                    className="btn-primaryinverse"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmExit}
                    className="btn-primary"
                  >
                    Save & Exit
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Options Edit Modals */}
        <OptionsEditModal
          isOpen={modalState.mealOptions}
          onClose={() => closeModal('mealOptions')}
          title="Edit Meal Options"
          placeholder="Beef\nChicken\nFish\nVegetarian\nVegan\nGluten-Free"
          initialOptions={modalData.mealOptions}
          onSave={handleMealOptionsSave}
          rows={6}
        />

        <OptionsEditModal
          isOpen={modalState.relationshipOptions}
          onClose={() => closeModal('relationshipOptions')}
                          title="Edit Relationship to You Options"
          placeholder="Family\nFriends\nBride's Side\nGroom's Side\nWork Colleagues\nCollege Friends\nChildhood Friends\nNeighbors\nOther"
          initialOptions={modalData.relationshipOptions}
          onSave={handleRelationshipOptionsSave}
          rows={8}
        />

        <OptionsEditModal
          isOpen={modalState.columnOptions}
          onClose={() => closeModal('columnOptions')}
          title="Edit Column Options"
          placeholder="Option 1\nOption 2\nOption 3\nOption 4"
          initialOptions={modalData.columnOptions}
          onSave={handleColumnOptionsSave}
          rows={6}
        />

        {/* CSV Upload Modal */}
        <CSVUploadModal
          isOpen={modalState.csvUpload}
          onClose={() => closeModal('csvUpload')}
          onGuestsUploaded={handleGuestsUploaded}
        />

        {/* Add Column Modal */}
        <AddColumnModal
          isOpen={modalState.addColumn}
          onClose={() => closeModal('addColumn')}
          onAddColumn={addColumn}
          guestColumns={guestColumns}
          onToggleColumnVisibility={(columnId: string) => {
            const column = guestColumns.find(col => col.id === columnId);
            if (column) {
              // For now, just remove the column to hide it
              // In the future, we could add an isVisible property
              removeColumn(columnId);
            }
          }}
        />

        {/* Family Grouping Modal */}
        <FamilyGroupingModal
          isOpen={modalState.familyGrouping}
          onClose={() => closeModal('familyGrouping')}
          selectedGuests={modalData.selectedGuests || []}
          allGuests={wizardState.guests}
          onCreateFamilyGroup={handleCreateGuestGroup}
        />
      </motion.div>
    </AnimatePresence>
  );
}
