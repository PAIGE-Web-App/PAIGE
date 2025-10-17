'use client';

import React, { useState, useRef } from 'react';
import { MoreHorizontal, Copy, Trash2, Pencil, Plus, Search } from 'lucide-react';
import SearchBar from '@/components/SearchBar';
import { WeddingTimeline } from '@/types/timeline';
import { AnimatePresence, motion } from 'framer-motion';

interface TimelineTopBarProps {
  timeline: WeddingTimeline | null;
  onAddItem: () => void;
  isGenerating: boolean;
  onUpdateTimelineName?: (timelineId: string, newName: string) => void;
  onCloneTimeline?: (timeline: WeddingTimeline) => void;
  onDeleteTimeline?: (timeline: WeddingTimeline) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export default function TimelineTopBar({
  timeline,
  onAddItem,
  isGenerating,
  onUpdateTimelineName,
  onCloneTimeline,
  onDeleteTimeline,
  searchQuery,
  setSearchQuery
}: TimelineTopBarProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editingValue, setEditingValue] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleStartEdit = () => {
    if (timeline) {
      console.log('Starting edit for timeline:', timeline.name);
      setIsEditing(true);
      setEditingValue(timeline.name || 'Wedding Day Timeline');
    }
  };

  const handleSaveEdit = () => {
    console.log('handleSaveEdit called with:', editingValue);
    if (timeline && onUpdateTimelineName && editingValue.trim()) {
      console.log('Calling onUpdateTimelineName');
      onUpdateTimelineName(timeline.id, editingValue.trim());
      setIsEditing(false);
    } else if (editingValue.trim() === '') {
      // If empty, revert to original name
      console.log('Empty value, reverting');
      setIsEditing(false);
      setEditingValue(timeline?.name || 'Wedding Day Timeline');
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditingValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Focus input when editing starts
  React.useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select(); // Select all text for easy editing
    }
  }, [isEditing]);
  return (
    <div className="bg-white border-b border-[#E0DBD7] px-4 py-3">
      {timeline && (
        <div className="flex items-center w-full gap-4">
          {/* Left: Timeline Name and Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="relative">
              <div className="flex items-center gap-2">
                <h2 
                  className={`text-sm lg:text-base text-[#332B42] truncate transition-opacity duration-300 ${
                    isEditing ? 'opacity-0' : 'opacity-100'
                  }`}
                  style={{ fontFamily: 'Work Sans, sans-serif' }}
                >
                  {timeline.name || 'Wedding Day Timeline'}
                </h2>
                {!isEditing && (
                  <button
                    onClick={handleStartEdit}
                    className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                    title="Edit timeline name"
                  >
                    <Pencil size={14} className="text-gray-500" />
                  </button>
                )}
              </div>
              <input
                ref={inputRef}
                type="text"
                value={editingValue}
                onChange={(e) => setEditingValue(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={handleSaveEdit}
                className={`absolute left-0 top-1/2 transform -translate-y-1/2 w-80 px-3 py-1 border border-[#D6D3D1] rounded-[5px] bg-white text-base text-[#332B42] focus:outline-none focus:border-[#A85C36] transition-all duration-300 z-10 ${
                  isEditing
                    ? 'opacity-100 pointer-events-auto'
                    : 'opacity-0 pointer-events-none'
                }`}
                style={{ fontFamily: 'Work Sans, sans-serif' }}
              />
            </div>
            {/* Three-dot menu for actions */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="p-1 hover:bg-gray-100 rounded-full"
                title="More options"
              >
                <MoreHorizontal size={16} className="text-gray-500" />
              </button>
              <AnimatePresence>
                {showDropdown && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                    className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-50"
                  >
                    <div className="py-1">
                      {onCloneTimeline && (
                        <button
                          onClick={() => {
                            onCloneTimeline(timeline);
                            setShowDropdown(false);
                          }}
                          className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 whitespace-nowrap"
                        >
                          <Copy className="w-4 h-4 mr-2 text-[#364257]" />
                          Clone Timeline
                        </button>
                      )}
                      {onDeleteTimeline && (
                        <button
                          onClick={() => {
                            onDeleteTimeline(timeline);
                            setShowDropdown(false);
                          }}
                          className="flex items-center w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 whitespace-nowrap"
                        >
                          <Trash2 className="w-4 h-4 mr-2 text-[#D63030]" />
                          Delete Timeline
                        </button>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
            {/* Vertical divider */}
            <div className="h-6 border-l border-[#D6D3D1] mx-2" />
            
            {/* Search Bar */}
            <div className={`flex items-center transition-all duration-300 gap-3 ${searchOpen ? 'flex-grow min-w-0' : 'w-[32px] min-w-[32px]'}`} style={{ height: '32px' }}>
              <SearchBar
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Search timeline events"
                isOpen={searchOpen}
                setIsOpen={setSearchOpen}
              />
            </div>
          </div>
          
          {/* Right: Action Buttons (add item) */}
          <div className="flex-shrink-0 flex justify-end items-center gap-4 ml-auto">
            <button
              onClick={onAddItem}
              className="btn-primary flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Item
            </button>
          </div>
        </div>
      )}
      
      {!timeline && (
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-[#332B42]">
            Create Timeline
          </h1>
        </div>
      )}
    </div>
  );
}
