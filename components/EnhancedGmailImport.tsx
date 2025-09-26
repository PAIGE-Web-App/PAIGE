/**
 * Enhanced Gmail Import Component
 * 
 * Integrates with the enhanced Gmail import API that includes todo scanning
 */

import React, { useState } from 'react';
import { useCustomToast } from '@/hooks/useCustomToast';

interface EnhancedGmailImportProps {
  userId: string;
  contacts: any[];
  onImportComplete?: (results: any) => void;
  enableTodoScanning?: boolean;
}

export default function EnhancedGmailImport({
  userId,
  contacts,
  onImportComplete,
  enableTodoScanning = true
}: EnhancedGmailImportProps) {
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<{
    current: number;
    total: number;
    currentContact: string;
  } | null>(null);
  const { showSuccessToast, showErrorToast, showInfoToast } = useCustomToast();

  const handleEnhancedImport = async () => {
    if (!userId || !contacts.length) {
      showErrorToast('User ID and contacts are required');
      return;
    }

    setIsImporting(true);
    setImportProgress({
      current: 0,
      total: contacts.length,
      currentContact: 'Starting import...'
    });

    try {
      const response = await fetch('/api/start-gmail-import-enhanced', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          contacts,
          enableTodoScanning,
          config: {
            maxMessages: 50,
            includeAttachments: false,
            filterSpam: true
          }
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Enhanced Gmail import failed');
      }

      const results = await response.json();
      
      if (results.success) {
        const summary = results.summary;
        showSuccessToast(
          `Enhanced Gmail import completed! ` +
          `Processed ${summary.totalMessagesProcessed} messages, ` +
          `suggested ${summary.totalTodosSuggested} todos, ` +
          `updated ${summary.totalTodosUpdated} todos.`
        );

        if (onImportComplete) {
          onImportComplete(results);
        }
      } else {
        throw new Error(results.message || 'Import failed');
      }

    } catch (error) {
      console.error('Enhanced Gmail import error:', error);
      showErrorToast(`Enhanced Gmail import failed: ${error.message}`);
    } finally {
      setIsImporting(false);
      setImportProgress(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-blue-900 mb-2">
          Enhanced Gmail Import with Todo Scanning
        </h3>
        <p className="text-blue-700 text-sm mb-4">
          Import Gmail messages and automatically scan them for todo suggestions and updates.
          {enableTodoScanning && (
            <span className="block mt-1 font-medium">
              ✓ Todo scanning enabled - will suggest new todos and update existing ones
            </span>
          )}
        </p>
        
        <button
          onClick={handleEnhancedImport}
          disabled={isImporting}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
        >
          {isImporting ? 'Importing...' : 'Start Enhanced Import'}
        </button>
      </div>

      {importProgress && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              Importing Gmail messages...
            </span>
            <span className="text-sm text-gray-500">
              {importProgress.current} of {importProgress.total}
            </span>
          </div>
          
          <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{
                width: `${(importProgress.current / importProgress.total) * 100}%`
              }}
            />
          </div>
          
          <p className="text-xs text-gray-600">
            Processing: {importProgress.currentContact}
          </p>
        </div>
      )}
    </div>
  );
}
