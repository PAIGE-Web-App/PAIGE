import React, { useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, Pin, Search, X, Plus, MoreHorizontal, CheckCircle, ChevronUp, ArrowUpDown } from 'lucide-react';
import UnifiedTodoItem from './UnifiedTodoItem';
import Banner from './Banner';
import BadgeCount from './BadgeCount';
import SearchBar from './SearchBar';
import ListMenuDropdown from './ListMenuDropdown';
import { useRouter } from 'next/navigation';
import DropdownMenu from './DropdownMenu';
import TodoTopBar from './TodoTopBar';
import NewListOnboardingModal from './NewListOnboardingModal';
import { addDoc, getDocs, writeBatch, doc, query, where } from 'firebase/firestore';
import { db, getUserCollectionRef } from '../lib/firebase';
import { useCustomToast } from '@/hooks/useCustomToast';

interface ToDoPanelProps {
  todoLists: any[];
  selectedListId: string | null;
  setSelectedListId: (id: string | null) => void;
  editingListNameId: string | null;
  setEditingListNameId: (id: string | null) => void;
  editingListNameValue: string | null;
  setEditingListNameValue: (val: string | null) => void;
  openListMenuId: string | null;
  setOpenListMenuId: (id: string | null) => void;
  listButtonRefs: any;
  listTaskCounts: Map<string, number>;
  showNewListInput: boolean;
  setShowNewListInput: (val: boolean) => void;
  newListName: string;
  setNewListName: (val: string) => void;
  newListInputRef: React.RefObject<HTMLInputElement>;
  handleCreateNewList: () => void;
  willReachListLimit: boolean;
  STARTER_TIER_MAX_LISTS: number;
  showListLimitBanner: boolean;
  setShowListLimitBanner: (val: boolean) => void;
  handleRenameList: (id: string) => void;
  handleDeleteList: (id: string) => void;
  handleCloneList: (id: string) => void;
  sortOption: 'myOrder' | 'date' | 'title' | 'date-desc' | 'title-desc';
  setShowSortMenu: (val: boolean) => void;
  showSortMenu: boolean;
  sortMenuRef: React.RefObject<HTMLDivElement>;
  handleSortOptionSelect: (option: string) => void;
  showAddTaskDropdown: boolean;
  setShowAddTaskDropdown: (val: boolean) => void;
  addTaskDropdownRef: React.RefObject<HTMLDivElement>;
  handleAddNewTodo: () => void;
  filteredTodoItems: any;
  handleListDragOver: (e: any) => void;
  handleListDrop: (e: any) => void;
  contacts: any[];
  allCategories: any[];
  draggedTodoId: string | null;
  dragOverTodoId: string | null;
  dropIndicatorPosition: any;
  currentUser: any;
  handleToggleTodoComplete: (todo: any) => void;
  handleUpdateTaskName: (id: string, name: string | null) => Promise<void>;
  handleUpdateDeadline: (id: string, deadline: string | null, endDate?: string | null) => void;
  handleUpdateNote: (id: string, note: string | null) => void;
  handleUpdateCategory: (id: string, category: string | null) => void;
  handleCloneTodo: (todo: any) => void;
  handleDeleteTodo: (id: string) => void;
  setTaskToMove: (todo: any) => void;
  setShowMoveTaskModal: (val: boolean) => void;
  handleDragStart: (e: any, id: string) => void;
  handleDragEnter: (e: any, id: string) => void;
  handleDragLeave: (e: any) => void;
  handleItemDragOver: (e: any, id: string) => void;
  handleDragEnd: (e: any) => void;
  showCompletedTasks: boolean;
  setShowCompletedTasks: (val: boolean) => void;
  router: any;
  setShowUpgradeModal: (val: boolean) => void;
  allTodoCount: number;
  handleDrop: (e: any) => void;
  newlyAddedTodoItems?: Set<string>;
  // Props for highlighting and scrolling to newly created to-dos
  itemRefs?: React.MutableRefObject<{ [key: string]: HTMLDivElement | null }>;
  highlightedItemId?: string | null;
  justMovedItemId?: string | null;
  
  // Props for moving to-do items between lists
  onMoveTodoItem?: (taskId: string, targetListId: string) => Promise<void>;
}

const ToDoPanel = ({
  todoLists,
  selectedListId,
  setSelectedListId,
  editingListNameId,
  setEditingListNameId,
  editingListNameValue,
  setEditingListNameValue,
  openListMenuId,
  setOpenListMenuId,
  listButtonRefs,
  listTaskCounts,
  showNewListInput,
  setShowNewListInput,
  newListName,
  setNewListName,
  newListInputRef,
  handleCreateNewList,
  willReachListLimit,
  STARTER_TIER_MAX_LISTS,
  showListLimitBanner,
  setShowListLimitBanner,
  handleRenameList,
  handleDeleteList,
  handleCloneList,
  sortOption,
  setShowSortMenu,
  showSortMenu,
  sortMenuRef,
  handleSortOptionSelect,
  showAddTaskDropdown,
  setShowAddTaskDropdown,
  addTaskDropdownRef,
  handleAddNewTodo,
  filteredTodoItems,
  handleListDragOver,
  handleListDrop,
  contacts,
  allCategories,
  draggedTodoId,
  dragOverTodoId,
  dropIndicatorPosition,
  currentUser,
  handleToggleTodoComplete,
  handleUpdateTaskName,
  handleUpdateDeadline,
  handleUpdateNote,
  handleUpdateCategory,
  handleCloneTodo,
  handleDeleteTodo,
  setTaskToMove,
  setShowMoveTaskModal,
  handleDragStart,
  handleDragEnter,
  handleDragLeave,
  handleItemDragOver,
  handleDragEnd,
  showCompletedTasks,
  setShowCompletedTasks,
  router,
  setShowUpgradeModal,
  allTodoCount,
  handleDrop,
  newlyAddedTodoItems = new Set(),
  itemRefs,
  highlightedItemId,
  justMovedItemId,
  onMoveTodoItem,
}: ToDoPanelProps) => {
  const { showSuccessToast, showErrorToast } = useCustomToast();
  
  // Debug move functionality
  
  // Debug highlight state
  useEffect(() => {
    if (highlightedItemId) {
      console.log('🎯 ToDoPanel received highlightedItemId:', highlightedItemId);
    }
  }, [highlightedItemId]);
  
  // Dropdown state
  const [showListDropdown, setShowListDropdown] = useState(false);
  const [pinnedListIds, setPinnedListIdsState] = useState<string[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [showNewListModal, setShowNewListModal] = useState(false);
  
  // State for tracking which list is being hovered over during drag
  const [hoveredListForMove, setHoveredListForMove] = useState<any>(null);

  // Fetch pinned lists from Firestore on mount
  useEffect(() => {
    async function fetchPinned() {
      if (currentUser?.uid) {
        const { getPinnedListIds } = await import('../lib/firebase');
        const ids = await getPinnedListIds(currentUser.uid);
        setPinnedListIdsState(ids);
      }
    }
    fetchPinned();
  }, [currentUser?.uid]);

  // Click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowListDropdown(false);
      }
    }
    if (showListDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showListDropdown]);

  // Focus input when opening
  useEffect(() => {
    if (searchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [searchOpen]);

  // Close search on outside click or Esc
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (searchInputRef.current && !searchInputRef.current.parentElement?.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    }
    function handleEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') setSearchOpen(false);
    }
    if (searchOpen) {
      document.addEventListener('mousedown', handleClick);
      document.addEventListener('keydown', handleEsc);
    }
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [searchOpen]);

  // Filter todos by search query
  const filterBySearch = (items: any[]) =>
    searchQuery.trim() === ''
      ? items
      : items.filter((item) => item.name.toLowerCase().includes(searchQuery.toLowerCase()));

  // Handle pin/unpin
  const handleTogglePin = async (listId: string) => {
    let newPinned: string[];
    if (pinnedListIds.includes(listId)) {
      newPinned = pinnedListIds.filter(id => id !== listId);
    } else {
      newPinned = [...pinnedListIds, listId];
    }
    setPinnedListIdsState(newPinned);
    if (currentUser?.uid) {
      const { setPinnedListIds } = await import('../lib/firebase');
      await setPinnedListIds(currentUser.uid, newPinned);
    }
  };

  // Always show 'All To-Do Items' as the first pinned list
  const allTodoList = { id: 'all', name: 'All To-Do Items' };
  const pinnedLists = [allTodoList, ...todoLists.filter(l => pinnedListIds.includes(l.id))];

  // If no pinned lists, default to 'All To-Do Items'
  const visibleLists = pinnedLists.length > 1 ? pinnedLists : [allTodoList];

  // Helper to pin a list by ID
  const pinList = async (listId: string) => {
    const newPinned = [...new Set([listId, ...pinnedListIds])];
    setPinnedListIdsState(newPinned);
    if (currentUser?.uid) {
      const { setPinnedListIds } = await import('../lib/firebase');
      await setPinnedListIds(currentUser.uid, newPinned);
    }
  };

  // Handler for creating a new list (and its tasks) from the onboarding modal
  const handleAddListFromModal = async (data: { name: string; tasks?: any[] }) => {
    if (!currentUser) {
      showErrorToast('You must be logged in to create a new list.');
      return;
    }
    if (todoLists.length + 1 > STARTER_TIER_MAX_LISTS) {
      setShowUpgradeModal(true);
      return;
    }
    const trimmedListName = data.name.trim();
    if (!trimmedListName) {
      showErrorToast('List name cannot be empty.');
      return;
    }
    const existingList = todoLists.find(list => list.name.toLowerCase() === trimmedListName.toLowerCase());
    if (existingList) {
      showErrorToast('A list with this name already exists.');
      return;
    }
    const maxListOrderIndex = todoLists.length > 0 ? Math.max(...todoLists.map(list => list.orderIndex)) : -1;
    const newList = {
      name: trimmedListName,
      userId: currentUser.uid,
      createdAt: new Date(),
      orderIndex: maxListOrderIndex + 1,
    };
    try {
      const docRef = await addDoc(getUserCollectionRef('todoLists', currentUser.uid), newList);
      showSuccessToast(`List "${trimmedListName}" created!`);
      setSelectedListId(docRef.id);
      await pinList(docRef.id); // Automatically pin the new list
      // Add initial tasks if provided
      if (data.tasks && data.tasks.length > 0) {
        const batch = writeBatch(db);
        data.tasks.forEach((task, idx) => {
          const newTaskRef = doc(getUserCollectionRef('todoItems', currentUser.uid));
          batch.set(newTaskRef, {
            name: task.name,
            note: task.note || null,
            category: task.category || null,
            deadline: task.deadline ? new Date(task.deadline) : null,
            endDate: task.endDate ? new Date(task.endDate) : null,
            isCompleted: false,
            userId: currentUser.uid,
            createdAt: new Date(),
            orderIndex: idx,
            listId: docRef.id,
          });
        });
        await batch.commit();
      }
      setShowNewListModal(false);
    } catch (error: any) {
      console.error('Error creating new list:', error);
      showErrorToast(`Failed to create new list: ${error.message}`);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-x-hidden">
      {/* Wrapper div for the header and tabs with the desired background color */}
      <div className="bg-[#F3F2F0] rounded-t-[5px] border-b border-[#AB9C95] p-3 md:p-4">
        <div className="flex justify-between items-center px-1 pt-1 mb-2 md:px-0 md:pt-0">
          <h3 className="font-playfair text-base font-medium text-[#332B42] flex-1">To-do Lists</h3>
          <div className="flex items-center gap-2 ml-auto">
            <DropdownMenu
              trigger={
                <button
                  className="text-xs text-[#332B42] border border-[#AB9C95] rounded-[5px] px-2 py-1 hover:bg-[#F3F2F0] flex items-center gap-1"
                >
                  + New
                  <ChevronDown className="w-3 h-3" />
                </button>
              }
              items={[
                {
                  label: 'New List',
                  icon: <Plus size={16} />, 
                  onClick: () => {
                    if (todoLists.length >= STARTER_TIER_MAX_LISTS) {
                      setShowUpgradeModal(true);
                    } else {
                      setShowNewListModal(true);
                    }
                  }
                },
                {
                  label: 'New To-do Item',
                  icon: <Plus size={16} />, 
                  onClick: handleAddNewTodo
                }
              ]}
              width={180}
            />
          </div>
        </div>
        <div className="flex items-center gap-2 mt-2 relative justify-start">
          {/* Sort Button */}
          <div className="relative" ref={sortMenuRef}>
            <button
              onClick={() => setShowSortMenu(!showSortMenu)}
              className="flex items-center justify-center border border-[#AB9C95] rounded-[5px] text-[#332B42] hover:text-[#A85C36] px-3 py-1"
              title="Sort tasks"
            >
              <ArrowUpDown className="w-4 h-4" />
            </button>
            <AnimatePresence>
              {showSortMenu && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="absolute top-full left-0 mt-2 p-2 bg-white border border-[#AB9C95] rounded-[5px] shadow-lg z-10 flex flex-col min-w-[200px]"
                >
                  <button
                    onClick={() => handleSortOptionSelect('myOrder')}
                    className={`w-full text-left px-3 py-2 text-sm rounded-[3px] ${sortOption === 'myOrder' ? 'bg-[#EBE3DD] text-[#A85C36]' : 'text-[#332B42] hover:bg-[#F3F2F0]'}`}
                  >
                    My Order
                  </button>
                  <button
                    onClick={() => handleSortOptionSelect('date')}
                    className={`w-full text-left px-3 py-1.5 text-sm ${sortOption === 'date' ? 'bg-[#F3F2F0] text-[#332B42]' : 'text-[#364257] hover:bg-[#F3F2F0]'}`}
                  >
                    Deadline (Soonest)
                  </button>
                  <button
                    onClick={() => handleSortOptionSelect('date-desc')}
                    className={`w-full text-left px-3 py-1.5 text-sm ${sortOption === 'date-desc' ? 'bg-[#F3F2F0] text-[#332B42]' : 'text-[#364257] hover:bg-[#F3F2F0]'}`}
                  >
                    Deadline (Latest)
                  </button>
                  <button
                    onClick={() => handleSortOptionSelect('title')}
                    className={`w-full text-left px-3 py-2 text-sm rounded-[3px] ${sortOption === 'title' ? 'bg-[#EBE3DD] text-[#A85C36]' : 'text-[#332B42] hover:bg-[#F3F2F0]'}`}
                  >
                    Name (A-Z)
                  </button>
                  <button
                    onClick={() => handleSortOptionSelect('title-desc')}
                    className={`w-full text-left px-3 py-2 text-sm rounded-[3px] ${sortOption === 'title-desc' ? 'bg-[#EBE3DD] text-[#A85C36]' : 'text-[#332B42] hover:bg-[#F3F2F0]'}`}
                  >
                    Name (Z-A)
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <button
            className="flex items-center gap-2 px-3 py-1 border border-[#AB9C95] rounded-[5px] text-sm text-[#332B42] hover:bg-[#F3F2F0]"
            onClick={() => setShowListDropdown(v => !v)}
            type="button"
          >
            <Pin className="w-4 h-4" />
            <ChevronDown className="w-4 h-4" />
          </button>
          {/* Search button/input (now immediately right of pin list dropdown) */}
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search to-dos..."
            isOpen={searchOpen}
            setIsOpen={setSearchOpen}
          />
        </div>

        {/* List Dropdown Multi-Select */}
        <div className="relative mb-2">
          {showListDropdown && (
            <div ref={dropdownRef} className="absolute z-20 mt-2 w-64 bg-white border border-[#AB9C95] rounded-[5px] shadow-lg p-2">
              <div className="font-semibold text-xs text-[#332B42] mb-2">Pin Lists to Show</div>
              <div className="flex flex-col gap-1 max-h-60 overflow-y-auto">
                {todoLists.map(list => (
                  <label key={list.id} className="flex items-center gap-2 px-2 py-1 rounded hover:bg-[#F3F2F0] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={pinnedListIds.includes(list.id)}
                      onChange={() => handleTogglePin(list.id)}
                      className="accent-[#A85C36]"
                    />
                    <span className="text-sm text-[#332B42]">{list.name}</span>
                  </label>
                ))}
              </div>
              <div className="mt-2 text-xs text-[#7A7A7A]">'All To-Do Items' is always shown first.</div>
            </div>
          )}
        </div>

        {/* Applied sort filter pill above list names */}
        {sortOption && sortOption !== 'myOrder' && (
          <div className="flex flex-wrap gap-2 mb-2">
            <span className="flex items-center gap-1 bg-[#EBE3DD] border border-[#A85C36] rounded-full px-2 py-0.5 text-xs text-[#332B42]">
              Sort: {
                sortOption === 'date' ? 'Deadline (Soonest)' :
                sortOption === 'date-desc' ? 'Deadline (Latest)' :
                sortOption === 'title' ? 'Name (A-Z)' :
                sortOption === 'title-desc' ? 'Name (Z-A)' :
                sortOption === 'myOrder' ? 'My Order' : ''
              }
              <button onClick={() => handleSortOptionSelect('myOrder')} className="ml-1 text-[#A85C36] hover:text-[#784528]">
                <X className="w-3 h-3" />
              </button>
            </span>
          </div>
        )}

        {/* Pinned Lists Tabs */}
        <div className="flex gap-2 pt-3 flex-nowrap overflow-x-auto scrollbar-thin scrollbar-thumb-[#AB9C95] scrollbar-track-[#F3F2F0]" style={{ WebkitOverflowScrolling: 'touch' }}>
            {visibleLists.map(list => {
              const isAll = list.id === 'all';
              return (
              <div
                key={list.id}
                onClick={() => setSelectedListId(isAll ? null : list.id)}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  // Don't allow dropping into the currently selected list
                  if (draggedTodoId && !isAll && onMoveTodoItem && selectedListId !== list.id) {
                    e.currentTarget.classList.add('bg-[#F0EDE8]', 'border-2', 'border-[#A85C36]', 'shadow-md');
                    // Show the move indicator
                    setHoveredListForMove(list);
                  }
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                    e.currentTarget.classList.remove('bg-[#F0EDE8]', 'border-2', 'border-[#A85C36]', 'shadow-md');
                    // Clear the move indicator
                    setHoveredListForMove(null);
                  }
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  e.currentTarget.classList.remove('bg-[#F0EDE8]', 'border-2', 'border-[#A85C36]', 'shadow-md');
                  
                  
                  // Clear the move indicator
                  setHoveredListForMove(null);
                  
                  // Don't allow dropping into the currently selected list
                  if (draggedTodoId && !isAll && onMoveTodoItem && selectedListId !== list.id) {
                    // Get the current list ID from the dragged todo item
                    const draggedTodo = [...filteredTodoItems.incompleteTasks, ...filteredTodoItems.completedTasks]
                      .find(todo => todo.id === draggedTodoId);
                    
                    console.log('🎯 Found dragged todo:', draggedTodo);
                    
                    if (draggedTodo && draggedTodo.listId !== list.id) {
                      console.log('🎯 Moving todo from', draggedTodo.listId, 'to', list.id);
                      // Call the move function with just taskId and targetListId
                      onMoveTodoItem(draggedTodoId, list.id);
                    } else {
                      console.log('🎯 No move needed - same list or todo not found');
                    }
                  } else {
                  }
                }}
                className={`flex items-center px-4 py-1 text-sm font-medium whitespace-nowrap transition-all duration-200 ease-in-out group relative cursor-pointer
                  ${selectedListId === list.id || (isAll && !selectedListId)
                    ? 'bg-white text-[#332B42] rounded-t-[5px]'
                    : 'bg-[#F3F2F0] text-[#364257] hover:bg-[#E0DBD7] border-b-2 border-transparent hover:border-[#AB9C95] rounded-t-[5px]'
                  }
                  ${draggedTodoId && !isAll ? 'cursor-copy' : ''}
                `}
              >
                <span title={draggedTodoId && !isAll ? `Drop to-do item here to move it to "${list.name}"` : list.name}>
                  {list.name}
                </span>
                {isAll ? (
                  <BadgeCount count={allTodoCount} />
                ) : (
                  listTaskCounts.has(list.id) && (
                    <BadgeCount count={listTaskCounts.get(list.id) || 0} />
                  )
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Banner for list limit */}
      <AnimatePresence>
        {willReachListLimit && showListLimitBanner && (
          <Banner
            message={
              <>
                Your plan allows for a maximum of {STARTER_TIER_MAX_LISTS} lists.{' '}
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    setShowUpgradeModal(true);
                  }}
                  className="underline text-blue-700 hover:text-blue-900"
                >
                  Upgrade to create more!
                </a>
              </>
            }
            type="info"
            onDismiss={() => setShowListLimitBanner(false)}
          />
        )}
      </AnimatePresence>

      {/* Main To-Do Items Display Area - This will now ONLY contain incomplete tasks and be the scrollable part */}
      <div
        className="flex-1 bg-white p-3 overflow-y-auto w-full"
        onDragOver={handleListDragOver}
        onDrop={handleListDrop}
      >
        {filterBySearch(filteredTodoItems.incompleteTasks).length === 0 && filterBySearch(filteredTodoItems.completedTasks).length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center text-gray-500 text-sm py-8">
            <img src="/todo.png" alt="Empty To-do List" className="w-24 h-24 mb-4 opacity-70" />
            <p>Add a To-do item to this list</p>
          </div>
        ) : (
          <div className="space-y-0 transition-all duration-300 ease-in-out">
            {/* Incomplete Tasks */}
            {filterBySearch(filteredTodoItems.incompleteTasks).length > 0 && (
              <AnimatePresence initial={false}>
                {filterBySearch(filteredTodoItems.incompleteTasks).map((todo) => (
                  <div
                    key={todo.id}
                    ref={(el) => { 
                      if (itemRefs) {
                        itemRefs.current[todo.id] = el;
                        if (justMovedItemId === todo.id) {
                          console.log('🎯 Ref set for green flash item:', todo.id, 'Element:', !!el);
                        }
                      }
                    }}
                  >
                                            <UnifiedTodoItem
                          key={todo.id}
                          todo={todo}
                          contacts={contacts}
                          allCategories={allCategories}
                          sortOption={sortOption}
                          draggedTodoId={draggedTodoId}
                          dragOverTodoId={dragOverTodoId}
                          dropIndicatorPosition={dropIndicatorPosition}
                          currentUser={currentUser}
                          handleToggleTodoComplete={handleToggleTodoComplete}
                          handleUpdateTaskName={handleUpdateTaskName}
                          handleUpdateDeadline={handleUpdateDeadline}
                          handleUpdateNote={handleUpdateNote}
                          handleUpdateCategory={handleUpdateCategory}
                          handleCloneTodo={handleCloneTodo}
                          handleDeleteTodo={handleDeleteTodo}
                          setTaskToMove={setTaskToMove}
                          setShowMoveTaskModal={setShowMoveTaskModal}
                          handleDragStart={handleDragStart}
                          handleDragEnter={handleDragEnter}
                          handleDragLeave={handleDragLeave}
                          handleItemDragOver={handleItemDragOver}
                          handleDragEnd={handleDragEnd}
                          handleDrop={handleDrop}
                          mode="page"
                          {...(!selectedListId && { listName: (todoLists.find(l => l.id === todo.listId)?.name) || 'Unknown List' })}
                          searchQuery={searchQuery}
                          isNewlyAdded={newlyAddedTodoItems.has(todo.id)}
                          isJustMoved={todo.id === justMovedItemId}
                        />
                  </div>
                ))}
              </AnimatePresence>
            )}
            {/* Removed the Completed Tasks Section from here */}
          </div>
        )}
      </div>

      {/* COMPLETED TASKS SECTION - Moved OUTSIDE the main scrollable area for incomplete tasks */}
      {filterBySearch(filteredTodoItems.completedTasks).length > 0 && (
        <div className="sticky bottom-0 z-10 bg-[#DEDBDB] mt-4 border-t border-[#AB9C95] pt-3 -mx-3 p-3">
          <button
            onClick={() => setShowCompletedTasks(!showCompletedTasks)}
            className="w-full flex items-center justify-between text-sm font-medium text-[#332B42] py-2 px-3 md:px-4 hover:bg-[#F3F2F0] rounded-[5px]"
          >
            <div className="flex items-center gap-2">
              <CheckCircle size={16} />
              <span>Completed ({filterBySearch(filteredTodoItems.completedTasks).length})</span>
            </div>
            {showCompletedTasks ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          <AnimatePresence>
            {showCompletedTasks && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className="overflow-hidden max-h-[40vh] overflow-y-auto"
              >
                <div className="space-y-0 transition-all duration-300 ease-in-out">
                  {filterBySearch(filteredTodoItems.completedTasks).map((todo) => (
                    <div
                      key={todo.id}
                      ref={(el) => { 
                        if (itemRefs) {
                          itemRefs.current[todo.id] = el;
                          if (justMovedItemId === todo.id) {
                            console.log('🎯 Ref set for green flash item (completed):', todo.id, 'Element:', !!el);
                          }
                        }
                      }}
                    >
                      <UnifiedTodoItem
                      key={todo.id}
                      todo={todo}
                      contacts={contacts}
                      allCategories={allCategories}
                      sortOption={sortOption}
                      draggedTodoId={draggedTodoId}
                      dragOverTodoId={dragOverTodoId}
                      dropIndicatorPosition={dropIndicatorPosition}
                      currentUser={currentUser}
                      handleToggleTodoComplete={handleToggleTodoComplete}
                      handleUpdateTaskName={handleUpdateTaskName}
                      handleUpdateDeadline={handleUpdateDeadline}
                      handleUpdateNote={handleUpdateNote}
                      handleUpdateCategory={handleUpdateCategory}
                      handleCloneTodo={handleCloneTodo}
                      handleDeleteTodo={handleDeleteTodo}
                      setTaskToMove={setTaskToMove}
                      setShowMoveTaskModal={setShowMoveTaskModal}
                      handleDragStart={handleDragStart}
                      handleDragEnter={handleDragEnter}
                      handleDragLeave={handleDragLeave}
                      handleItemDragOver={handleItemDragOver}
                      handleDragEnd={handleDragEnd}
                      handleDrop={handleDrop}
                      mode="page"
                      className="px-3 md:px-4"
                      {...(!selectedListId && { listName: (todoLists.find(l => l.id === todo.listId)?.name) || 'Unknown List' })}
                                                searchQuery={searchQuery}
                          isJustMoved={todo.id === justMovedItemId}
                        />
                      </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Floating indicator for todo move operations */}
      {draggedTodoId && onMoveTodoItem && hoveredListForMove && selectedListId !== hoveredListForMove.id && (
        <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center p-4">
          <div className="bg-[#332B42] text-white px-4 py-3 md:px-6 md:py-4 rounded-full shadow-2xl animate-pulse max-w-[90vw]">
            <div className="flex items-center gap-2 md:gap-3">
              <svg className="w-5 h-5 md:w-6 md:h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M7 17l5-5 5 5"></path>
                <path d="M7 7l5 5 5-5"></path>
              </svg>
              <span className="font-playfair font-medium text-base md:text-lg leading-5 md:leading-6 text-white">
                Move to-do item to "{hoveredListForMove.name}"
              </span>
            </div>
          </div>
        </div>
      )}

      {/* New List Modal (Full Page Bottom-Up) */}
      <NewListOnboardingModal
        isOpen={showNewListModal}
        onClose={() => setShowNewListModal(false)}
        onSubmit={handleAddListFromModal}
      />
    </div>
  );
};

export default ToDoPanel; 