import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Search, X as LucideX, Sparkles, FileText, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRAGFileIntegration } from '@/hooks/useRAGFileIntegration';
import { useAuth } from '@/contexts/AuthContext';

interface RAGEnhancedSearchBarProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  onRAGResults?: (results: Array<{
    fileId: string;
    fileName: string;
    relevanceScore: number;
    snippet: string;
    url: string;
  }>) => void;
}

const RAGEnhancedSearchBar: React.FC<RAGEnhancedSearchBarProps> = ({ 
  value, 
  onChange, 
  placeholder = '', 
  isOpen, 
  setIsOpen,
  onRAGResults 
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();
  const { searchFiles, searchResults, searchLoading, searchError } = useRAGFileIntegration();
  const [showRAGResults, setShowRAGResults] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    function handleClickOutside(event: MouseEvent) {
      if (
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        // Only close if there's no text in the search bar
        if (!value.trim()) {
          setIsOpen(false);
          setShowRAGResults(false);
        }
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, setIsOpen, value]);

  // Debounced RAG search
  const performRAGSearch = useCallback(async (query: string) => {
    if (!user?.uid || !query.trim()) {
      setShowRAGResults(false);
      return;
    }

    try {
      await searchFiles(user.uid, query);
      setShowRAGResults(true);
      if (onRAGResults) {
        onRAGResults(searchResults);
      }
    } catch (error) {
      console.error('RAG search failed:', error);
      setShowRAGResults(false);
    }
  }, [user?.uid, searchFiles, searchResults, onRAGResults]);

  // Handle search input changes
  const handleSearchChange = (newValue: string) => {
    onChange(newValue);
    
    // Clear existing timeout
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    // Set new timeout for RAG search
    if (newValue.trim().length > 2) {
      const timeout = setTimeout(() => {
        performRAGSearch(newValue);
      }, 500); // 500ms debounce
      setSearchTimeout(timeout);
    } else {
      setShowRAGResults(false);
    }
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
    };
  }, [searchTimeout]);

  return (
    <>
      {!isOpen && (
        <button
          className="p-2 rounded-full hover:bg-[#EBE3DD] transition-colors duration-200 flex-shrink-0 relative"
          style={{ height: '32px', width: '32px' }}
          onClick={() => setIsOpen(true)}
          aria-label="Open search with AI"
          type="button"
        >
          <Search className="w-4 h-4 text-[#364257]" />
          <Sparkles className="w-2 h-2 text-purple-600 absolute -top-1 -right-1" />
        </button>
      )}
      {isOpen && (
        <motion.div
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: '100%', opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.25, ease: 'easeInOut' }}
          className="relative flex items-center flex-grow min-w-0 h-8"
        >
          <Search className="w-4 h-4 text-[#364257] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            placeholder={placeholder || "Search files with AI..."}
            className="pl-12 pr-9 w-full h-8 border border-[#A85C36] rounded-[5px] bg-white text-base focus:outline-none focus:border-[#A85C36] transition-all duration-300"
            value={value}
            onChange={e => handleSearchChange(e.target.value)}
            onKeyDown={e => { 
              if (e.key === 'Escape') {
                setIsOpen(false);
                setShowRAGResults(false);
              }
            }}
            tabIndex={0}
            autoFocus
          />
          {value && (
            <button
              className="absolute right-3 text-[#364257] hover:text-[#A85C36] transition-opacity duration-200 opacity-100"
              onClick={() => {
                onChange('');
                setShowRAGResults(false);
              }}
              tabIndex={0}
              type="button"
              style={{ zIndex: 10 }}
            >
              <LucideX className="w-4 h-4" />
            </button>
          )}

          {/* RAG Search Results Dropdown */}
          <AnimatePresence>
            {showRAGResults && (searchResults.length > 0 || searchLoading || searchError) && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#E0DBD7] rounded-[5px] shadow-lg z-50 max-h-96 overflow-y-auto"
              >
                {searchLoading && (
                  <div className="p-4 text-center text-gray-500">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
                      <span>Searching with AI...</span>
                    </div>
                  </div>
                )}

                {searchError && (
                  <div className="p-4 text-center text-red-600">
                    <p>Search failed. Please try again.</p>
                  </div>
                )}

                {!searchLoading && !searchError && searchResults.length > 0 && (
                  <>
                    <div className="p-3 border-b border-[#E0DBD7] bg-purple-50">
                      <div className="flex items-center gap-2 text-sm text-purple-700">
                        <Sparkles className="w-4 h-4" />
                        <span>AI found {searchResults.length} relevant files</span>
                      </div>
                    </div>
                    {searchResults.map((result, index) => (
                      <div
                        key={index}
                        className="p-3 hover:bg-[#F8F6F4] transition-colors cursor-pointer border-b border-[#E0DBD7] last:border-b-0"
                        onClick={() => {
                          // Handle file selection - you can customize this
                          window.open(result.url, '_blank');
                        }}
                      >
                        <div className="flex items-start gap-3">
                          <FileText className="w-4 h-4 text-[#AB9C95] mt-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <h4 className="font-medium text-[#332B42] truncate">
                                {result.fileName}
                              </h4>
                              <span className="text-xs text-[#AB9C95] bg-purple-100 px-2 py-1 rounded">
                                {(result.relevanceScore * 100).toFixed(0)}% match
                              </span>
                            </div>
                            <p className="text-sm text-[#6B7280] line-clamp-2">
                              {result.snippet}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </>
                )}

                {!searchLoading && !searchError && searchResults.length === 0 && value.trim().length > 2 && (
                  <div className="p-4 text-center text-gray-500">
                    <FileText className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    <p>No relevant files found</p>
                    <p className="text-xs mt-1">Try different keywords or check your file content</p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </>
  );
};

export default RAGEnhancedSearchBar;

