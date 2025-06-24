import React from 'react';
import { Calendar as CalendarIcon, List as ListIcon, Search, X as LucideX, Copy, Trash2, ListFilter, RefreshCw } from 'lucide-react';
import DropdownMenu from './DropdownMenu';
import { AnimatePresence, motion } from 'framer-motion';

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
  selectedCategoryFilters: string[];
  setSelectedCategoryFilters: (filters: string[]) => void;
  onSyncCategories: () => void;
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
  selectedCategoryFilters,
  setSelectedCategoryFilters,
  onSyncCategories,
}) => {
  const [showDropdown, setShowDropdown] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const [searchOpen, setSearchOpen] = React.useState(false);
  const searchInputRef = React.useRef<HTMLInputElement>(null);
  const [showFilters, setShowFilters] = React.useState(false);
  const filterPopoverRef = React.useRef<HTMLDivElement>(null);

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

  // Close filter dropdown on click-away
  React.useEffect(() => {
    if (!showFilters) return;
    function handleClickOutside(event: MouseEvent) {
      if (filterPopoverRef.current && !filterPopoverRef.current.contains(event.target as Node)) {
        setShowFilters(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showFilters]);

  return (
    <div className="sticky top-0 z-20 bg-[#F3F2F0] border-b-[0.5px] border-b-[var(--border-color)] w-full">
      <div className="flex items-center w-full gap-4 px-4 py-3">
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
              className={`transition-opacity duration-300 ${
                editingListNameId ? 'opacity-0' : 'opacity-100'
              }`}
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
          {/* Filter Button */}
          <button
            onClick={() => setShowFilters((v) => !v)}
            className="flex items-center justify-center border border-[#AB9C95] rounded-[5px] text-[#332B42] hover:text-[#A85C36] px-3 py-1 z-20"
            aria-label="Toggle Filters"
            type="button"
          >
            <ListFilter className="w-4 h-4" />
          </button>
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="absolute mt-2 left-0 p-4 bg-white border border-[#AB9C95] rounded-[5px] shadow-lg z-30 space-y-3"
                style={{ top: '100%', minWidth: 400, maxWidth: '90vw', width: 400 }}
                ref={filterPopoverRef}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-[#332B42]">Filter by Category</span>
                  <button
                    className="flex items-center gap-1 text-xs text-[#A85C36] underline hover:text-[#784528] transition-colors"
                    onClick={onSyncCategories}
                    type="button"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Sync Categories
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {allCategories.length === 0 ? (
                    <span className="text-xs text-[#AB9C95]">(No categories found)</span>
                  ) : (
                    Array.from(new Set(allCategories)).map((category, i) => (
                      <label key={`${category}-${i}`} className="flex items-center text-xs text-[#332B42] cursor-pointer">
                        <input
                          type="checkbox"
                          value={category}
                          checked={selectedCategoryFilters.includes(category)}
                          onChange={() => {
                            if (selectedCategoryFilters.includes(category)) {
                              setSelectedCategoryFilters(selectedCategoryFilters.filter((c) => c !== category));
                            } else {
                              setSelectedCategoryFilters([...selectedCategoryFilters, category]);
                            }
                          }}
                          className="mr-1 rounded text-[#A85C36] focus:ring-[#A85C36]"
                        />
                        {category}
                      </label>
                    ))
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          {/* Search Button (standalone when closed) */}
          {!searchOpen && (
            <button
              className="p-2 rounded-full hover:bg-[#EBE3DD] transition-colors duration-200"
              style={{ height: '32px', width: '32px' }}
              onClick={() => setSearchOpen(true)}
              aria-label="Open search"
              type="button"
            >
              <Search className="w-4 h-4 text-[#364257]" />
            </button>
          )}
          {/* Search Bar (only when open) */}
          {searchOpen && (
            <div
              className={`relative flex items-center overflow-hidden transition-all duration-300 bg-transparent w-full`}
              style={{ height: '32px' }}
            >
              <button
                className="p-2 rounded-full hover:bg-[#EBE3DD] transition-colors duration-200 absolute left-0 z-10"
                style={{ height: '32px', width: '32px' }}
                onClick={() => setSearchOpen(false)}
                aria-label="Close search"
                type="button"
                tabIndex={-1}
              >
                <Search className="w-4 h-4 text-[#364257]" />
              </button>
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search for a To-do Item"
                className={`absolute left-0 w-full h-8 pl-9 pr-9 border border-[#D6D3D1] rounded-[5px] bg-white text-sm focus:outline-none focus:border-[#A85C36] transition-all duration-300 opacity-100 pointer-events-auto`}
                value={todoSearchQuery}
                onChange={(e) => setTodoSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') setSearchOpen(false);
                }}
                style={{ height: '32px', zIndex: 5 }}
                tabIndex={0}
              />
              {todoSearchQuery && (
                <button
                  className={`absolute right-3 text-[#364257] hover:text-[#A85C36] transition-opacity duration-200 opacity-100`}
                  onClick={() => setTodoSearchQuery('')}
                  tabIndex={0}
                  type="button"
                  style={{ zIndex: 10 }}
                >
                  <LucideX className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
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
      {/* Removable filter chips in a new row below the top bar */}
      {selectedCategoryFilters.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2 mb-2 px-4">
          {selectedCategoryFilters.map((category) => (
            <span key={category} className="flex items-center gap-1 bg-[#EBE3DD] border border-[#A85C36] rounded-full px-2 py-0.5 text-xs text-[#332B42]">
              Category: {category}
              <button
                onClick={() => setSelectedCategoryFilters(selectedCategoryFilters.filter((c) => c !== category))}
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