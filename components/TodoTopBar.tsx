import React, { useState } from 'react';
import { Calendar as CalendarIcon, List as ListIcon, Search, X as LucideX, Copy, Trash2, ListFilter, RefreshCw, ArrowLeft, MoreHorizontal, X } from 'lucide-react';
import DropdownMenu from './DropdownMenu';
import { AnimatePresence, motion } from 'framer-motion';
import SearchBar from '@/components/SearchBar';
import FilterButtonPopover from '@/components/FilterButtonPopover';

interface TodoTopBarProps {
  selectedList: any;
  editingListNameId: string | null;
  editingListNameValue: string | null;
  setEditingListNameId: (id: string | null) => void;
  setEditingListNameValue: (val: string | null) => void;
  handleRenameList: (id: string) => void;
  todoSearchQuery: string;
  setTodoSearchQuery: (val: string) => void;
  showCompletedItems: boolean;
  handleOpenAddTodo: () => void;
  viewMode: 'list' | 'calendar';
  setViewMode: (mode: 'list' | 'calendar') => void;
  calendarViewMode: 'month' | 'week' | 'day' | 'year';
  setCalendarViewMode: (mode: 'month' | 'week' | 'day' | 'year') => void;
  handleCloneList: (id: string) => void;
  handleDeleteList?: (id: string) => void;
  allCategories: string[];
  selectedCategories: string[];
  setSelectedCategories: (cats: string[]) => void;
  onSyncCategories: () => void;
  mobileViewMode?: 'lists' | 'items';
  onMobileBackToLists?: () => void;
}

const TodoTopBar: React.FC<TodoTopBarProps> = ({
  selectedList,
  editingListNameId,
  editingListNameValue,
  setEditingListNameId,
  setEditingListNameValue,
  handleRenameList,
  todoSearchQuery,
  setTodoSearchQuery,
  showCompletedItems,
  handleOpenAddTodo,
  viewMode,
  setViewMode,
  calendarViewMode,
  setCalendarViewMode,
  handleCloneList,
  handleDeleteList,
  allCategories,
  selectedCategories,
  setSelectedCategories,
  onSyncCategories,
  mobileViewMode,
  onMobileBackToLists,
}) => {
  const [showDropdown, setShowDropdown] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const [searchOpen, setSearchOpen] = React.useState(false);
  const searchInputRef = React.useRef<HTMLInputElement>(null);
  const [showFilters, setShowFilters] = React.useState(false);

  React.useEffect(() => {
    if (searchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [searchOpen]);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        searchOpen &&
        searchInputRef.current &&
        !(searchInputRef.current.parentElement?.contains(event.target as Node))
      ) {
        setSearchOpen(false);
      }
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [searchOpen]);


  return (
    <div className="sticky top-0 z-20 bg-[#F3F2F0] border-b-[0.5px] border-b-[var(--border-color)] w-full">
      {/* Mobile: Header with back button and list name */}
      {mobileViewMode === 'items' && onMobileBackToLists && (
        <div className="flex items-center p-4 pb-2 border-b border-[#E0DBD7] lg:hidden">
          <button
            onClick={onMobileBackToLists}
            className="lg:hidden p-1 rounded-full hover:bg-[#E0DBD7] text-[#332B42]"
            aria-label="Back to lists"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex-1 min-w-0 relative">
            <h2 className={`text-sm lg:text-base font-playfair font-medium text-[#332B42] truncate transition-opacity duration-300 ${
              editingListNameId ? 'opacity-0' : 'opacity-100'
            }`}>
              {showCompletedItems && !selectedList
                ? 'Completed To-Do Items'
                : selectedList?.name || 'All To-Do Items'}
            </h2>
            <input
              type="text"
              value={editingListNameValue || ''}
              onChange={(e) => setEditingListNameValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleRenameList(selectedList.id);
                } else if (e.key === 'Escape') {
                  setEditingListNameId(null);
                  setEditingListNameValue(null);
                }
              }}
              onBlur={() => {
                if (editingListNameValue) {
                  handleRenameList(selectedList.id);
                } else {
                  setEditingListNameId(null);
                  setEditingListNameValue(null);
                }
              }}
              className={`absolute left-0 top-0 w-full h-full px-2 border border-[#D6D3D1] rounded-[5px] bg-white text-base font-playfair font-medium text-[#332B42] focus:outline-none focus:border-[#A85C36] transition-all duration-300 ${
                editingListNameId
                  ? 'opacity-100 pointer-events-auto'
                  : 'opacity-0 pointer-events-none'
              }`}
              autoFocus
            />
          </div>
          {/* Mobile: Three-dot menu for actions */}
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
                  transition={{ duration: 0.15, ease: "easeOut" }}
                  className="absolute right-0 mt-1 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-10"
                >
                  <div className="py-1">
                    {selectedList && selectedList.name !== 'My To-do' && (
                      <button
                        onClick={() => {
                          setEditingListNameId(selectedList.id);
                          setEditingListNameValue(selectedList.name);
                          setShowDropdown(false);
                        }}
                        className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 whitespace-nowrap"
                      >
                        <span className="mr-2 text-[#AB9C95]">✏️</span>
                        Rename List
                      </button>
                    )}
                    {selectedList && (
                      <button
                        onClick={() => {
                          handleCloneList(selectedList.id);
                          setShowDropdown(false);
                        }}
                        className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 whitespace-nowrap"
                      >
                        <Copy className="w-4 h-4 mr-2 text-[#364257]" />
                        Clone List
                      </button>
                    )}
                    {selectedList && selectedList.name !== 'My To-do' && (
                      <button
                        onClick={() => {
                          handleDeleteList?.(selectedList.id);
                          setShowDropdown(false);
                        }}
                        className="flex items-center w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 whitespace-nowrap"
                      >
                        <Trash2 className="w-4 h-4 mr-2 text-[#D63030]" />
                        Delete List
                      </button>
                    )}
                    {!showCompletedItems && (
                      <button
                        onClick={() => {
                          handleOpenAddTodo();
                          setShowDropdown(false);
                        }}
                        className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 whitespace-nowrap"
                      >
                        <span className="mr-2 text-[#A85C36]">+</span>
                        New To-do Item
                      </button>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Desktop: Original header layout */}
      <div className="hidden lg:flex items-center w-full gap-4 px-4 py-3">
        {/* Left: List Name and Buttons */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <div
            className="relative flex items-center transition-all duration-300"
            style={{
              width: editingListNameId ? '240px' : 'auto',
              minWidth: editingListNameId ? '240px' : 'auto',
            }}
          >
            <h6
              className={`transition-opacity duration-300 truncate max-w-[300px] ${
                editingListNameId ? 'opacity-0' : 'opacity-100'
              }`}
              title={showCompletedItems && !selectedList
                ? 'Completed To-Do Items'
                : selectedList?.name || 'All To-Do Items'}
            >
              {showCompletedItems && !selectedList
                ? 'Completed To-Do Items'
                : selectedList?.name || 'All To-Do Items'}
            </h6>
              <input
                type="text"
                value={editingListNameValue || ''}
                onChange={(e) => setEditingListNameValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleRenameList(selectedList.id);
                  } else if (e.key === 'Escape') {
                    setEditingListNameId(null);
                    setEditingListNameValue(null);
                  }
                }}
                onBlur={() => {
                  if (editingListNameValue) {
                    handleRenameList(selectedList.id);
                  } else {
                    setEditingListNameId(null);
                    setEditingListNameValue(null);
                  }
                }}
              className={`absolute left-0 w-full h-8 px-2 border border-[#D6D3D1] rounded-[5px] bg-white text-sm focus:outline-none focus:border-[#A85C36] transition-all duration-300 ${
                editingListNameId
                  ? 'opacity-100 pointer-events-auto'
                  : 'opacity-0 pointer-events-none'
              }`}
                autoFocus
              />
          </div>
          {selectedList && (
              <>
                {selectedList.name !== 'My To-do' && (
                  <button
                    onClick={() => {
                      setEditingListNameId(selectedList.id);
                      setEditingListNameValue(selectedList.name);
                    }}
                    className="p-1 hover:bg-[#EBE3DD] rounded-[5px]"
                    title="Rename List"
                  >
                  <span className="inline-block align-middle text-[#AB9C95] -scale-x-100">
                    ✏️
                  </span>
                  </button>
                )}
                <button
                  onClick={() => handleCloneList(selectedList.id)}
                  className="p-1 hover:bg-[#EBE3DD] rounded-[5px]"
                  title="Clone List"
                  aria-label="Clone List"
                >
                  <Copy className="w-4 h-4 text-[#364257]" />
                </button>
                {selectedList.name !== 'My To-do' && (
                  <>
                    <button
                      onClick={() => handleDeleteList?.(selectedList.id)}
                      className="p-1 hover:bg-[#FDEAEA] rounded-[5px]"
                      title="Delete List"
                      aria-label="Delete List"
                    >
                      <Trash2 className="w-4 h-4 text-[#D63030]" />
                    </button>
                    {/* Vertical divider */}
                    <div className="h-6 border-l border-[#D6D3D1] mx-2" />
                  </>
                )}
              </>
            )}
          </div>
        {/* Middle: Filter Button + Search Bar */}
        <div className={`flex items-center transition-all duration-300 gap-3 ${searchOpen ? 'flex-grow min-w-0' : 'w-[32px] min-w-[32px]'}`} style={{ height: '32px' }}>
          <FilterButtonPopover
            categories={allCategories}
            selectedCategories={selectedCategories}
            onSelectCategories={setSelectedCategories}
            showFilters={showFilters}
            setShowFilters={setShowFilters}
          />
          <SearchBar
            value={todoSearchQuery}
            onChange={setTodoSearchQuery}
            placeholder="Search for a To-do Item"
            isOpen={searchOpen}
            setIsOpen={setSearchOpen}
          />
        </div>
        {/* Right: Action Buttons (toggle, new) */}
        <div className="flex-shrink-0 flex justify-end items-center gap-4 ml-auto">
          {/* Calendar View Mode Dropdown */}
          {viewMode === 'calendar' && (
            <DropdownMenu
              trigger={
                <button className="flex items-center border border-gray-400 rounded-full px-3 py-1 bg-white text-[#332B42] font-medium text-sm min-w-[90px]">
                  {calendarViewMode.charAt(0).toUpperCase() + calendarViewMode.slice(1)}
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" className="ml-1"><path d="M7 10l5 5 5-5" stroke="#332B42" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </button>
              }
              items={[
                { label: 'Day', onClick: () => setCalendarViewMode('day') },
                { label: 'Week', onClick: () => setCalendarViewMode('week') },
                { label: 'Month', onClick: () => setCalendarViewMode('month') },
                { label: 'Year', onClick: () => setCalendarViewMode('year') },
              ]}
              width={180}
              align="left"
            />
          )}
          <div className="flex rounded-full border border-gray-400 overflow-hidden" style={{ height: 32 }}>
            <button
              className={`flex items-center justify-center px-2 transition-colors duration-150 ${viewMode === 'list' ? 'bg-[#EBE3DD]' : 'bg-white'} border-r border-gray-300`}
              style={{ outline: 'none' }}
              onClick={() => setViewMode('list')}
              type="button"
            >
              <ListIcon size={18} stroke={viewMode === 'list' ? '#A85C36' : '#364257'} />
            </button>
            <button
              className={`flex items-center justify-center px-2 transition-colors duration-150 ${viewMode === 'calendar' ? 'bg-[#EBE3DD]' : 'bg-white'}`}
              style={{ outline: 'none' }}
              onClick={() => setViewMode('calendar')}
              type="button"
            >
              <CalendarIcon size={18} stroke={viewMode === 'calendar' ? '#A85C36' : '#364257'} />
            </button>
          </div>
          {/* Only show the New To-do button if not viewing Completed To-Do Items */}
          {!showCompletedItems && (
            <button className="btn-primary ml-2" onClick={handleOpenAddTodo}>
              + New To-do Item
            </button>
          )}
        </div>
      </div>

      {/* Mobile: Filter/Search and View toggle row */}
      {mobileViewMode === 'items' && (
        <div className="flex items-center gap-3 px-4 py-2 lg:hidden">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <FilterButtonPopover
              categories={allCategories}
              selectedCategories={selectedCategories}
              onSelectCategories={setSelectedCategories}
              showFilters={showFilters}
              setShowFilters={setShowFilters}
            />
            <SearchBar
              value={todoSearchQuery}
              onChange={setTodoSearchQuery}
              placeholder="Search for a To-do Item"
              isOpen={searchOpen}
              setIsOpen={setSearchOpen}
            />
          </div>
          <div className="flex rounded-full border border-gray-400 overflow-hidden flex-shrink-0" style={{ height: 28 }}>
            <button
              className={`flex items-center justify-center px-2 transition-colors duration-150 ${viewMode === 'list' ? 'bg-[#EBE3DD]' : 'bg-white'} border-r border-gray-300`}
              style={{ outline: 'none' }}
              onClick={() => setViewMode('list')}
              type="button"
            >
              <ListIcon size={14} stroke={viewMode === 'list' ? '#A85C36' : '#364257'} />
            </button>
            <button
              className={`flex items-center justify-center px-2 transition-colors duration-150 ${viewMode === 'calendar' ? 'bg-[#EBE3DD]' : 'bg-white'}`}
              style={{ outline: 'none' }}
              onClick={() => setViewMode('calendar')}
              type="button"
            >
              <CalendarIcon size={14} stroke={viewMode === 'calendar' ? '#A85C36' : '#364257'} />
            </button>
          </div>
        </div>
      )}

      {/* Removable filter chips in a new row below the top bar */}
      {selectedCategories.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2 mb-2 px-4">
          {selectedCategories.map((category) => (
            <span key={category} className="flex items-center gap-1 bg-[#EBE3DD] border border-[#A85C36] rounded-full px-2 py-0.5 text-xs text-[#332B42]">
              Category: {category}
              <button
                onClick={() => setSelectedCategories(selectedCategories.filter((c) => c !== category))}
                className="ml-1 text-[#A85C36] hover:text-[#784528]"
                type="button"
                aria-label={`Remove filter ${category}`}
              >
                <LucideX className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

export default TodoTopBar;