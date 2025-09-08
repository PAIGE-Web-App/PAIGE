import React, { useEffect, useState } from 'react';
import { Plus, Upload } from 'lucide-react';
import { Guest, GuestColumn, WizardState } from './types';
import GuestTableHeader from './GuestTableHeader';
import GuestTableRow from './GuestTableRow';
import { useCustomToast } from '@/hooks/useCustomToast';

interface GuestListTableProps {
  wizardState: WizardState;
  guestColumns: GuestColumn[];
  areChartDetailsComplete: boolean;
  onAddGuest: () => void;
  onUpdateGuest: (guestId: string, field: keyof Guest | string, value: string) => void;
  onRemoveGuest: (guestId: string) => void;
  onUpdateColumn: (columnId: string, updates: Partial<GuestColumn>) => void;
  onRemoveColumn: (columnId: string) => void;
  onSetEditingState: (updates: Partial<WizardState>) => void;
  onShowCSVUploadModal: () => void;
  onShowAddColumnModal: () => void;
  onShowMealOptionsModal: (options: string[], columnKey: string) => void;
  getCellValue: (guest: Guest, fieldKey: string) => string;
  // Guest Drag & Drop handlers
  onDragStart: (e: React.DragEvent, columnId: string) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, targetColumnId: string) => void;
  onDragEnd: (e: React.DragEvent) => void;
  // Column resize handler
  onColumnResize?: (columnId: string, newWidth: number) => void;
  // Column Drag & Drop handlers
  onColumnDragStart?: (e: React.DragEvent, columnId: string) => void;
  onColumnDragOver?: (e: React.DragEvent, targetColumnId: string) => void;
  onColumnDragLeave?: (e: React.DragEvent) => void;
  onColumnDrop?: (e: React.DragEvent, targetColumnId: string) => void;
  onColumnDragEnd?: (e: React.DragEvent) => void;
}

export default function GuestListTable({
  wizardState,
  guestColumns,
  areChartDetailsComplete,
  onAddGuest,
  onUpdateGuest,
  onRemoveGuest,
  onUpdateColumn,
  onRemoveColumn,
  onSetEditingState,
  onShowCSVUploadModal,
  onShowAddColumnModal,
  onShowMealOptionsModal,
  getCellValue,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
  onColumnResize,
  onColumnDragStart,
  onColumnDragOver,
  onColumnDragLeave,
  onColumnDrop,
  onColumnDragEnd
}: GuestListTableProps) {
  const { showSuccessToast, showErrorToast } = useCustomToast();
  const [isGeneratingNotes, setIsGeneratingNotes] = useState(false);

  // Automatically create a default guest when the component loads
  useEffect(() => {
    if (wizardState.guests.length === 0) {
      onAddGuest();
    }
  }, [wizardState.guests.length, onAddGuest]);

  const handleGenerateAllNotes = async () => {
    const guestsWithNames = wizardState.guests.filter(guest => guest.fullName.trim());
    
    if (guestsWithNames.length === 0) {
      showErrorToast('Please add guests with names first');
      return;
    }

    setIsGeneratingNotes(true);
    let successCount = 0;
    let errorCount = 0;

    try {
      // Generate notes for each guest sequentially to avoid overwhelming the API
      for (const guest of guestsWithNames) {
        try {
          const response = await fetch('/api/generate-guest-notes', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              guest: {
                fullName: guest.fullName,
                relationship: guest.relationship,
                mealPreference: guest.mealPreference
              },
              eventType: wizardState.eventType,
              chartName: wizardState.chartName
            }),
          });

          if (response.ok) {
            const data = await response.json();
            if (data.success && data.note) {
              onUpdateGuest(guest.id, 'notes', data.note);
              successCount++;
            } else {
              errorCount++;
            }
          } else {
            errorCount++;
          }
        } catch (error) {
          console.error(`Error generating notes for ${guest.fullName}:`, error);
          errorCount++;
        }
      }

      if (successCount > 0) {
        showSuccessToast(`Generated notes for ${successCount} guest${successCount > 1 ? 's' : ''}!`);
      }
      if (errorCount > 0) {
        showErrorToast(`Failed to generate notes for ${errorCount} guest${errorCount > 1 ? 's' : ''}`);
      }
    } catch (error: any) {
      console.error('Error in bulk notes generation:', error);
      showErrorToast('Failed to generate notes');
    } finally {
      setIsGeneratingNotes(false);
    }
  };

  return (
    <div className="relative">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-base font-playfair font-semibold text-[#332B42]">Guest List</h4>
        <div className="flex items-center gap-3">
          <button
            onClick={onShowCSVUploadModal}
            className="text-[#A85C36] hover:text-[#8B4513] text-sm font-medium flex items-center gap-2 transition-colors"
          >
            <Upload className="w-4 h-4" />
            Upload CSV
          </button>
          <div className="flex items-center gap-3 ml-6">
            <button
              onClick={onShowAddColumnModal}
              className="btn-primaryinverse flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Column
            </button>
            <button
              onClick={onAddGuest}
              className="btn-primary flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Guest
            </button>
          </div>
        </div>
      </div>

      {wizardState.guests.length === 0 ? (
        <div className="text-center py-8">
          <img
            src="/SeatingArrangement.png"
            alt="Seating Arrangement"
            className="w-20 mx-auto mb-4"
          />
          <div className="mb-6">
            <h4 className="text-lg font-medium text-[#332B42] mb-2">No Guests Added Yet</h4>
            <p className="text-sm text-[#AB9C95] mb-4">
              Guests are optional for now. You can add them later or proceed to plan your table layout.
            </p>
            <div className="flex justify-center">
              <button
                onClick={onAddGuest}
                className="btn-primary flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add First Guest
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-[#E0DBD7] rounded-[5px] overflow-hidden">
          {/* Responsive Table with Horizontal Scroll */}
          <div className="overflow-x-auto">
            <table className="w-full" style={{ 
              tableLayout: 'fixed',
              minWidth: `${(wizardState.fullNameColumnWidth || 150) + guestColumns.reduce((sum, col) => sum + (col.width || 150), 0) + 60}px`
            }}>
              <GuestTableHeader
                guestColumns={guestColumns}
                onUpdateColumn={onUpdateColumn}
                onRemoveColumn={onRemoveColumn}
                onDragStart={onDragStart}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
                onDragEnd={onDragEnd}
                onGenerateNotes={handleGenerateAllNotes}
                onColumnResize={onColumnResize}
                fullNameColumnWidth={wizardState.fullNameColumnWidth}
                onColumnDragStart={onColumnDragStart}
                onColumnDragOver={onColumnDragOver}
                onColumnDragLeave={onColumnDragLeave}
                onColumnDrop={onColumnDrop}
                onColumnDragEnd={onColumnDragEnd}
              />

              {/* Table Body */}
              <tbody>
                {wizardState.guests.map((guest, index) => (
                  <GuestTableRow
                    key={guest.id}
                    guest={guest}
                    index={index}
                    guestColumns={guestColumns}
                    wizardState={wizardState}
                    onUpdateGuest={onUpdateGuest}
                    onRemoveGuest={onRemoveGuest}
                    onSetEditingState={onSetEditingState}
                    onShowMealOptionsModal={onShowMealOptionsModal}
                    getCellValue={getCellValue}
                    fullNameColumnWidth={wizardState.fullNameColumnWidth}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
