import React from 'react';
import { WizardState, GuestColumn } from '../types';
import ChartDetailsForm from '../ChartDetailsForm';
import GuestListTable from '../GuestListTable';
import TableLayoutStep from '../TableLayoutStep';
import AIOrganizationStep from '../AIOrganizationStep';

interface StepContentProps {
  currentStep: WizardState['currentStep'];
  wizardState: WizardState;
  guestColumns: GuestColumn[];
  areChartDetailsComplete: boolean;
  onUpdateWizardState: (updates: Partial<WizardState>) => void;
  onUpdateTableLayout: (updates: Partial<WizardState['tableLayout']>) => void;
  onAddGuest: () => void;
  onUpdateGuest: (guestId: string, field: keyof WizardState['guests'][0] | string, value: string) => void;
  onRemoveGuest: (guestId: string) => void;
  onUpdateColumn: (columnId: string, updates: Partial<GuestColumn>) => void;
  onRemoveColumn: (columnId: string) => void;
  onShowCSVUploadModal: () => void;
  onShowAddColumnModal: () => void;
  onShowMealOptionsModal: (options: string[], columnKey: string) => void;
  getCellValue: (guest: WizardState['guests'][0], columnKey: string) => string;
  onDragStart: (e: React.DragEvent, guestId: string) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onDragEnd: (e: React.DragEvent) => void;
  onCreateChart: () => void;
  isLoading: boolean;
}

export const StepContent: React.FC<StepContentProps> = ({
  currentStep,
  wizardState,
  guestColumns,
  areChartDetailsComplete,
  onUpdateWizardState,
  onUpdateTableLayout,
  onAddGuest,
  onUpdateGuest,
  onRemoveGuest,
  onUpdateColumn,
  onRemoveColumn,
  onShowCSVUploadModal,
  onShowAddColumnModal,
  onShowMealOptionsModal,
  getCellValue,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
  onCreateChart,
  isLoading
}) => {
  switch (currentStep) {
    case 'guests':
      return (
        <div className="bg-white rounded-[5px] border border-[#AB9C95] p-6 mb-6">
          {/* Chart Details Form */}
          <ChartDetailsForm
            wizardState={wizardState}
            onUpdate={onUpdateWizardState}
            areChartDetailsComplete={areChartDetailsComplete}
          />

          {/* Guest List Table */}
          <div className="pt-6">
            <GuestListTable
              wizardState={wizardState}
              guestColumns={guestColumns}
              areChartDetailsComplete={areChartDetailsComplete}
              onAddGuest={onAddGuest}
              onUpdateGuest={onUpdateGuest}
              onRemoveGuest={onRemoveGuest}
              onUpdateColumn={onUpdateColumn}
              onRemoveColumn={onRemoveColumn}
              onSetEditingState={onUpdateWizardState}
              onShowCSVUploadModal={onShowCSVUploadModal}
              onShowAddColumnModal={onShowAddColumnModal}
              onShowMealOptionsModal={onShowMealOptionsModal}
              getCellValue={getCellValue}
              onDragStart={onDragStart}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              onDragEnd={onDragEnd}
            />
          </div>
        </div>
      );

    case 'tables':
      return (
        <div className="bg-white rounded-[5px] border border-[#AB9C95]">
          <TableLayoutStep
            tableLayout={wizardState.tableLayout}
            onUpdate={onUpdateTableLayout}
            guestCount={wizardState.guests.length}
            guests={wizardState.guests}
          />
        </div>
      );

    case 'organization':
      return (
        <div className="bg-white rounded-[5px] border border-[#AB9C95] p-6">
          <AIOrganizationStep
            guests={wizardState.guests}
            tableLayout={wizardState.tableLayout}
            organizationChoice={wizardState.organizationChoice}
            onUpdate={(choice) => onUpdateWizardState({ organizationChoice: choice })}
            onChartCreated={onCreateChart}
            isLoading={isLoading}
          />
        </div>
      );

    default:
      return null;
  }
};
