import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, FileUp, Filter, Calendar, Hash } from 'lucide-react';
import LoadingSpinner from '@/components/LoadingSpinner';
import SelectField from './SelectField';

interface GmailImportConfigModalProps {
  onClose: () => void;
  onImport: (config: ImportConfig) => void;
  isImporting: boolean;
}

export interface ImportConfig {
  maxEmails: number;
  maxResults?: number;
  filterWords: string[];
  dateRange: 'all' | 'last_week' | 'last_month' | 'last_3_months' | 'last_year' | 'custom';
  customStartDate?: string;
  customEndDate?: string;
  enableTodoScanning?: boolean;
}

const GmailImportConfigModal: React.FC<GmailImportConfigModalProps> = ({ 
  onClose, 
  onImport, 
  isImporting 
}) => {
  const [config, setConfig] = useState<ImportConfig>({
    maxEmails: 50,
    filterWords: [],
    dateRange: 'last_week'
  });
  const [filterInput, setFilterInput] = useState('');

  const handleAddFilter = () => {
    if (filterInput.trim() && !config.filterWords.includes(filterInput.trim().toLowerCase())) {
      setConfig(prev => ({
        ...prev,
        filterWords: [...prev.filterWords, filterInput.trim().toLowerCase()]
      }));
      setFilterInput('');
    }
  };

  const handleRemoveFilter = (word: string) => {
    setConfig(prev => ({
      ...prev,
      filterWords: prev.filterWords.filter(w => w !== word)
    }));
  };

  const handleImport = () => {
    onImport(config);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center p-4 z-50"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -50, opacity: 0 }}
          className="bg-white rounded-[5px] shadow-xl max-w-lg w-full p-6 relative"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={onClose}
            className="absolute top-3 right-3 text-[#7A7A7A] hover:text-[#332B42] p-1 rounded-full"
            title="Close"
          >
            <X size={20} />
          </button>

          <div className="flex items-center gap-2 mb-4">
            <svg className="w-5 h-5" viewBox="52 42 88 66" xmlns="http://www.w3.org/2000/svg">
              <path fill="#4285f4" d="M58 108h14V74L52 59v43c0 3.32 2.69 6 6 6"/>
              <path fill="#34a853" d="M120 108h14c3.32 0 6-2.69 6-6V59l-20 15"/>
              <path fill="#fbbc04" d="M120 48v26l20-15v-8c0-7.42-8.47-11.65-14.4-7.2"/>
              <path fill="#ea4335" d="M72 74V48l24 18 24-18v26L96 92"/>
              <path fill="#c5221f" d="M52 51v8l20 15V48l-5.6-4.2c-5.94-4.45-14.4-.22-14.4 7.2"/>
            </svg>
            <h5 className="h5">
              Import Email Configuration
            </h5>
          </div>

          <p className="text-sm text-gray-600 mb-6">
            Configure how many emails to import and set filters to customize your import.
          </p>

          {/* Number of Emails */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2">
              <Hash className="w-4 h-4" />
              <span className="text-xs font-medium text-[#332B42]">Number of Emails to Import</span>
            </div>
            <SelectField
              label=""
              name="maxEmails"
              value={config.maxEmails.toString()}
              onChange={(e) => setConfig(prev => ({ ...prev, maxEmails: parseInt(e.target.value) }))}
              options={[
                { value: "25", label: "25 emails" },
                { value: "50", label: "50 emails" },
                { value: "100", label: "100 emails" },
                { value: "200", label: "200 emails" },
                { value: "500", label: "500 emails" }
              ]}
            />
          </div>

          {/* Date Range */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-4 h-4" />
              <span className="text-xs font-medium text-[#332B42]">Time Period</span>
            </div>
            <SelectField
              label=""
              name="dateRange"
              value={config.dateRange}
              onChange={(e) => setConfig(prev => ({ ...prev, dateRange: e.target.value as any }))}
              options={[
                { value: "last_week", label: "Last week" },
                { value: "last_month", label: "Last month" },
                { value: "last_3_months", label: "Last 3 months" },
                { value: "last_year", label: "Last year" },
                { value: "all", label: "All time" },
                { value: "custom", label: "Custom range" }
              ]}
            />
          </div>

          {/* Custom Date Range */}
          {config.dateRange === 'custom' && (
            <div className="mb-6 grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-[#332B42] mb-2">Start Date</label>
                <input
                  type="date"
                  value={config.customStartDate || ''}
                  onChange={(e) => setConfig(prev => ({ ...prev, customStartDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-[#AB9C95] rounded-[5px] text-sm focus:outline-none focus:border-[#A85C36]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#332B42] mb-2">End Date</label>
                <input
                  type="date"
                  value={config.customEndDate || ''}
                  onChange={(e) => setConfig(prev => ({ ...prev, customEndDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-[#AB9C95] rounded-[5px] text-sm focus:outline-none focus:border-[#A85C36]"
                />
              </div>
            </div>
          )}

          {/* Filter Words */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-[#332B42] mb-2 flex items-center gap-2">
              <Filter className="w-4 h-4" />
              Filter Out Words (Optional)
            </label>
            <p className="text-xs text-gray-500 mb-2">
              Emails containing these words in the subject or body will be excluded
            </p>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={filterInput}
                onChange={(e) => setFilterInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddFilter()}
                placeholder="Enter word to filter out..."
                className="flex-1 px-3 py-2 border border-[#AB9C95] rounded-[5px] text-sm focus:outline-none focus:border-[#A85C36]"
              />
              <button
                onClick={handleAddFilter}
                className="text-xs text-[#332B42] border border-[#AB9C95] rounded-[5px] px-3 py-1 hover:bg-[#F3F2F0] transition-colors"
              >
                Add
              </button>
            </div>
            {config.filterWords.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {config.filterWords.map((word, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-[#F3F2F0] text-[#332B42] rounded-[3px] text-xs"
                  >
                    {word}
                    <button
                      onClick={() => handleRemoveFilter(word)}
                      className="text-[#7A7A7A] hover:text-[#332B42]"
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 justify-end">
            <button
              onClick={onClose}
              className="btn-primaryinverse px-4 py-2 text-sm"
              disabled={isImporting}
            >
              Cancel
            </button>
            <button
              onClick={handleImport}
              disabled={isImporting}
              className="btn-primary px-4 py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isImporting ? (
                <>
                  <LoadingSpinner size="sm" />
                  Importing...
                </>
              ) : (
                <>
                  <FileUp className="w-4 h-4" />
                  Import Emails
                </>
              )}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default GmailImportConfigModal; 