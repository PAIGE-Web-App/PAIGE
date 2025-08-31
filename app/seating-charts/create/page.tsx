"use client";
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, X } from 'lucide-react';
import WizardSidebar from '@/components/seating-charts/WizardSidebar';
import ChartDetailsForm from '@/components/seating-charts/ChartDetailsForm';
import GuestListTable from '@/components/seating-charts/GuestListTable';
import TableLayoutStep from '@/components/seating-charts/TableLayoutStep';
import AIOrganizationStep from '@/components/seating-charts/AIOrganizationStep';
import { useWizardState } from '@/components/seating-charts/hooks/useWizardState';
import { useModalState } from '@/components/seating-charts/hooks/useModalState';
import CSVUploadModal from '@/components/seating-charts/CSVUploadModal';
import AddColumnModal from '@/components/seating-charts/AddColumnModal';
import { OptionsEditModal } from '@/components/seating-charts/components/OptionsEditModal';

import { useCustomToast } from '@/hooks/useCustomToast';
import { SeatingChart } from '@/types/seatingChart';

export default function CreateSeatingChartPage() {
  const router = useRouter();
  const { showSuccessToast, showErrorToast } = useCustomToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  
  // Use our optimized hooks
  const {
    wizardState,
    guestColumns,
    areChartDetailsComplete,
    canProceedToNext,
    updateWizardState,
    updateTableLayout,
    addGuest,
    updateGuest,
    removeGuest,
    updateColumn,
    removeColumn,
    addColumn,
    getCellValue,
    clearStoredState
  } = useWizardState();

  const {
    modalState,
    modalData,
    openModal,
    closeModal,
    openMealOptionsModal,
    openRelationshipOptionsModal,
    openColumnOptionsModal,
    closeAllModals
  } = useModalState();

  // Navigation functions
  const goToStep = (step: number) => {
    setCurrentStep(step);
  };

  const goToNextStep = () => {
    if (canProceedToNext()) {
      setCurrentStep(currentStep + 1);
    }
  };

  const goToPreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    } else {
      clearStoredState();
      router.push('/seating-charts');
    }
  };

  // Handle CSV upload
  const handleGuestsUploaded = (uploadedGuests: any[]) => {
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
  };

  // Handle modal saves
  const handleMealOptionsSave = (options: string[]) => {
    updateColumn('mealPreference', { options });
    closeModal('mealOptions');
  };

  const handleRelationshipOptionsSave = (options: string[]) => {
    updateColumn('relationship', { options });
    closeModal('relationshipOptions');
  };

  const handleColumnOptionsSave = (options: string[]) => {
    updateColumn(modalData.columnId, { options });
    closeModal('columnOptions');
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
        description: wizardState.description || '',
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
      
      // TODO: Save chart to database
      console.log('Chart created:', chart);
      
      showSuccessToast('Seating chart created successfully!');
      
      // Clear stored wizard state
      clearStoredState();
      
      // Redirect back to seating charts list
      router.push('/seating-charts');
    } catch (error) {
      showErrorToast('Failed to create seating chart');
      console.error('Chart creation error:', error);
    } finally {
      setIsLoading(false);
    }
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
  };

  const handleDragEnd = (e: React.DragEvent) => {
    e.preventDefault();
  };

  // Step titles
  const steps = [
    { id: 1, name: 'Guest Information' },
    { id: 2, name: 'Table Layout' },
    { id: 3, name: 'AI Organization' }
  ];

  // Get current step title
  const getCurrentStepTitle = () => {
    return steps.find(step => step.id === currentStep)?.name || '';
  };



  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="bg-white rounded-[5px] border border-[#AB9C95] p-6 mb-6">
            {/* Chart Details Form */}
            <ChartDetailsForm
              wizardState={wizardState}
              onUpdate={updateWizardState}
              areChartDetailsComplete={areChartDetailsComplete}
            />

            {/* Guest List Table */}
            <div className="pt-6">
              <GuestListTable
                wizardState={wizardState}
                guestColumns={guestColumns}
                areChartDetailsComplete={areChartDetailsComplete}
                onAddGuest={() => addGuest({ fullName: '', mealPreference: '', relationship: '', customFields: {} })}
                onUpdateGuest={updateGuest}
                onRemoveGuest={removeGuest}
                onUpdateColumn={updateColumn}
                onRemoveColumn={removeColumn}
                onSetEditingState={updateWizardState}
                onShowCSVUploadModal={() => openModal('csvUpload')}
                onShowAddColumnModal={() => openModal('addColumn')}
                onShowMealOptionsModal={openMealOptionsModal}
                getCellValue={getCellValue}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onDragEnd={handleDragEnd}
              />
            </div>
          </div>
        );
      case 2:
        return (
          <div className="bg-white rounded-[5px] border border-[#AB9C95]">
            <TableLayoutStep
              tableLayout={wizardState.tableLayout}
              onUpdate={updateTableLayout}
              guestCount={wizardState.guests.length}
              guests={wizardState.guests}
            />
          </div>
        );
      case 3:
        return (
          <div className="bg-white rounded-[5px] border border-[#AB9C95] p-6">
            <AIOrganizationStep
              guests={wizardState.guests}
              tableLayout={wizardState.tableLayout}
              organizationChoice={wizardState.organizationChoice}
              onUpdate={(choice) => updateWizardState({ organizationChoice: choice })}
              onChartCreated={handleCreateChart}
              isLoading={isLoading}
            />
          </div>
        );
      default:
        return null;
    }
  };

  // Get navigation button text
  const getNextButtonText = () => {
    switch (currentStep) {
      case 1:
        return 'Next: Table Layout';
      case 2:
        return 'Next: AI Organization';
      case 3:
        return 'Create Chart';
      default:
        return 'Next';
    }
  };

  // Check if next button should be disabled
  const isNextButtonDisabled = () => {
    if (currentStep === 1) {
      return !canProceedToNext;
    }
    if (currentStep === 3) {
      return !canProceedToNext || isLoading;
    }
    return false;
  };

  return (
    <div className="fixed inset-0 bg-white z-50 flex">
      {/* Sidebar */}
      <WizardSidebar
        currentStep={currentStep === 1 ? 'guests' : currentStep === 2 ? 'tables' : 'organization'}
        onStepClick={(step) => {
          if (step === 'guests') setCurrentStep(1);
          else if (step === 'tables') setCurrentStep(2);
          else if (step === 'organization') setCurrentStep(3);
        }}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col bg-[#F3F2F0] relative">
        {/* Fixed Header */}
        <div className="fixed top-0 right-0 left-[300px] bg-[#F3F2F0] border-b border-[#AB9C95] z-50 flex items-center justify-between px-8" style={{paddingTop: '1rem', paddingBottom: '1rem'}}>
          <h2 className="text-xl font-playfair font-semibold text-[#332B42]">
            {getCurrentStepTitle()}
          </h2>
          <button
            onClick={goToPreviousStep}
            className="text-[#332B42] hover:text-[#A85C36] p-2 rounded-full"
            aria-label="Close wizard"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 flex flex-col h-full overflow-y-auto px-0 pt-24">
          <div className="flex-1 overflow-y-auto p-8 pt-4">
            <div className="w-full">
              {/* Step Content */}
              {renderStepContent()}
            </div>
          </div>
        </div>

        {/* Fixed Footer */}
        <div className="fixed bottom-0 right-0 left-[300px] bg-[#F3F2F0] border-t border-[#AB9C95] z-40 flex justify-end items-center px-8" style={{paddingTop: '1rem', paddingBottom: '1rem'}}>
          {/* Action buttons - grouped together on the right */}
          <div className="flex gap-4">
            {currentStep > 1 && (
              <button
                onClick={goToPreviousStep}
                className="btn-primaryinverse"
              >
                {currentStep === 2 ? 'Back to Guest Information' : 'Back to Table Layout'}
              </button>
            )}
            
            {currentStep < 3 ? (
              <button
                onClick={goToNextStep}
                disabled={isNextButtonDisabled()}
                className="btn-primary"
              >
                {getNextButtonText()}
              </button>
            ) : (
              <button
                onClick={handleCreateChart}
                disabled={isNextButtonDisabled()}
                className="btn-primary"
              >
                {isLoading ? 'Creating...' : 'Create Chart'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
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
        title="Edit Relationship Options"
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

      <CSVUploadModal
        isOpen={modalState.csvUpload}
        onClose={() => closeModal('csvUpload')}
        onGuestsUploaded={handleGuestsUploaded}
      />

      <AddColumnModal
        isOpen={modalState.addColumn}
        onClose={() => closeModal('addColumn')}
        onAddColumn={addColumn}
      />
    </div>
  );
}
