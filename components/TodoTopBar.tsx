import React from 'react';
import { Calendar as CalendarIcon, List as ListIcon, Search, X as LucideX, Copy, Trash2 } from 'lucide-react';
import DropdownMenu from './DropdownMenu';

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
}) => {
  const [showDropdown, setShowDropdown] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const [searchOpen, setSearchOpen] = React.useState(false);
  const searchInputRef = React.useRef<HTMLInputElement>(null);

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
      <div className="flex items-center w-full gap-4 px-4 py-3">
        {/* List Name (left) */}
        <div className="flex-shrink-0 flex items-center gap-2">
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
                </>
              )}
            </>
          )}
        </div>
        {/* Action Buttons (right) */}
        <div className="flex-1 flex justify-end items-center gap-4">
          {/* Animated Search Bar */}
          <div
            className={`relative flex items-center mr-2 overflow-hidden transition-all duration-300 bg-transparent`}
            style={{ width: searchOpen ? '240px' : '32px', minWidth: '32px', height: '32px' }}
          >
            <button
              className="p-2 rounded-full hover:bg-[#EBE3DD] transition-colors duration-200 absolute left-0 z-10"
              style={{ height: '32px', width: '32px' }}
              onClick={() => setSearchOpen((open) => !open)}
              aria-label={searchOpen ? 'Close search' : 'Open search'}
              type="button"
              tabIndex={searchOpen ? -1 : 0}
            >
              <Search className="w-4 h-4 text-[#364257]" />
            </button>
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search for a To-do Item"
              className={`absolute left-0 w-full h-8 pl-9 pr-9 border border-[#D6D3D1] rounded-[5px] bg-white text-sm focus:outline-none focus:border-[#A85C36] transition-all duration-300 ${searchOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
              value={todoSearchQuery}
              onChange={(e) => setTodoSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') setSearchOpen(false);
              }}
              style={{ height: '32px', zIndex: 5 }}
              tabIndex={searchOpen ? 0 : -1}
            />
            {todoSearchQuery && (
              <button
                className={`absolute right-3 text-[#364257] hover:text-[#A85C36] transition-opacity duration-200 ${searchOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={() => setTodoSearchQuery('')}
                tabIndex={searchOpen ? 0 : -1}
                type="button"
                style={{ zIndex: 10 }}
              >
                <LucideX className="w-4 h-4" />
              </button>
            )}
          </div>
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
    </div>
  );
};

export default TodoTopBar;