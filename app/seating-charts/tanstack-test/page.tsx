"use client";
import React, { useState } from 'react';
import { useWizardState } from '@/components/seating-charts/hooks/useWizardState';
import TanStackTablePOC from '@/components/seating-charts/TanStackTablePOC';
import TableComparison from '@/components/seating-charts/TableComparison';
import { useCustomToast } from '@/hooks/useCustomToast';

export default function TanStackTestPage() {
  const { showSuccessToast, showErrorToast } = useCustomToast();
  const {
    wizardState,
    guestColumns,
    updateGuest,
    removeGuest,
    handleColumnResize,
  } = useWizardState();

  const handleGenerateAllNotes = async () => {
    showSuccessToast('TanStack Table POC - Generate Notes clicked!');
  };

  return (
    <div className="min-h-screen bg-[#F3F2F0] p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-playfair font-semibold text-[#332B42] mb-2">
            TanStack Table Proof of Concept
          </h1>
          <p className="text-[#AB9C95]">
            This demonstrates TanStack Table with your existing styling and functionality.
          </p>
        </div>

        <div className="bg-white rounded-[5px] border border-[#AB9C95] p-6 mb-6">
          <h2 className="text-lg font-playfair font-semibold text-[#332B42] mb-4">
            Advanced Features Demonstrated
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-medium text-[#332B42] mb-2">Core Features</h3>
              <ul className="space-y-1 text-sm text-[#332B42]">
                <li>✅ <strong>Column Resizing:</strong> Drag column borders to resize</li>
                <li>✅ <strong>Sorting:</strong> Click column headers to sort</li>
                <li>✅ <strong>Inline Editing:</strong> Click cells to edit</li>
                <li>✅ <strong>Custom Styling:</strong> Matches your design system</li>
                <li>✅ <strong>Responsive:</strong> Horizontal scroll when needed</li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium text-[#332B42] mb-2">Advanced Features</h3>
              <ul className="space-y-1 text-sm text-[#332B42]">
                <li>🎯 <strong>Row Selection:</strong> Checkboxes for multi-select</li>
                <li>🎯 <strong>Column Pinning:</strong> Full Name (left) + Actions (right)</li>
                <li>🎯 <strong>Filtering:</strong> Real-time name filtering</li>
                <li>🎯 <strong>Visual Feedback:</strong> Selected rows highlighted</li>
                <li>🎯 <strong>TypeScript:</strong> Full type safety</li>
              </ul>
            </div>
          </div>
        </div>

        <TanStackTablePOC
          wizardState={wizardState}
          guestColumns={guestColumns}
          onUpdateGuest={updateGuest}
          onRemoveGuest={removeGuest}
          onColumnResize={handleColumnResize}
          onGenerateAllNotes={handleGenerateAllNotes}
        />

        <TableComparison />
      </div>
    </div>
  );
}
