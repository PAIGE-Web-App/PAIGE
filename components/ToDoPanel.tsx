import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Link from 'next/link';
import { ListFilter, Plus, MoreHorizontal, CircleCheck, ChevronUp, ChevronDown } from 'lucide-react';
import TodoItemComponent from './TodoItemComponent';
import ListMenuDropdown from './ListMenuDropdown';
import Banner from './Banner';
import { useRouter } from 'next/navigation';
import DropdownMenu from './DropdownMenu';

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
  setShowUpgradeModal
}) => (
  <div className="flex flex-col h-full">
    {/* Wrapper div for the header and tabs with the desired background color */}
    <div className="bg-[#F3F2F0] rounded-t-[5px] -mx-4 -mt-4 border-b border-[#AB9C95] p-3 md:p-4">
      <div className="flex justify-between items-center px-1 pt-1 mb-2 md:px-0 md:pt-0">
        <div className="flex items-center gap-2">
          <h3 className="font-playfair text-base font-medium text-[#332B42]">To-do Items</h3>
          <Link href="#" onClick={e => { e.preventDefault(); router.push('/todo?all=1'); }} className="text-xs text-[#364257] hover:text-[#A85C36] font-medium no-underline">
            View all
          </Link>
        </div>
        {/* Sort and New Task buttons */}
        <div className="flex items-center gap-2">
          {/* Sort Icon with Dropdown */}
          <div className="relative" ref={sortMenuRef}>
            <button
              onClick={() => setShowSortMenu(!showSortMenu)}
              className="p-1 rounded-[5px] text-[#7A7A7A] hover:text-[#332B42] border border-[#AB9C95] hover:bg-[#F3F2F0]"
              title="Sort tasks"
            >
              <ListFilter className="w-4 h-4" />
            </button>
            <AnimatePresence>
              {showSortMenu && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="absolute top-full right-0 mt-2 p-2 bg-white border border-[#AB9C95] rounded-[5px] shadow-lg z-10 flex flex-col min-w-[120px]"
                >
                  <button
                    onClick={() => handleSortOptionSelect('myOrder')}
                    className={`w-full text-left px-3 py-2 text-sm rounded-[3px] ${sortOption === 'myOrder' ? 'bg-[#EBE3DD] text-[#A85C36]' : 'text-[#332B42] hover:bg-[#F3F2F0]'}`}
                  >
                    My Order
                  </button>
                  <button
                    onClick={() => handleSortOptionSelect('date')}
                    className={`w-full text-left px-3 py-2 text-sm rounded-[3px] ${sortOption === 'date' ? 'bg-[#EBE3DD] text-[#A85C36]' : 'text-[#332B42] hover:bg-[#F3F2F0]'}`}
                  >
                    Date
                  </button>
                  <button
                    onClick={() => handleSortOptionSelect('title')}
                    className={`w-full text-left px-3 py-2 text-sm rounded-[3px] ${sortOption === 'title' ? 'bg-[#EBE3DD] text-[#A85C36]' : 'text-[#332B42] hover:bg-[#F3F2F0]'}`}
                  >
                    Title
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          {/* New Task Button with Dropdown */}
          <DropdownMenu
            trigger={
              <button
                className="text-xs text-[#332B42] border border-[#AB9C95] rounded-[5px] px-2 py-1 hover:bg-[#F3F2F0]"
              >
                + New Task
              </button>
            }
            items={[
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

      {/* To-do Lists Tabs */}
      <div className="flex px-1 overflow-x-auto pb-3 custom-scrollbar"> {/* Changed pb-0 to pb-3 */}
        {todoLists.map((list) => (
          <div key={list.id} className="relative list-tab-wrapper">
            {editingListNameId === list.id ? (
              <input
                key={list.id} // Added key for proper re-rendering
                type="text"
                value={editingListNameValue || ''}
                onChange={(e) => setEditingListNameValue(e.target.value)}
                onBlur={() => handleRenameList(list.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.currentTarget.blur(); // This will trigger onBlur
                  } else if (e.key === 'Escape') {
                    setEditingListNameId(null);
                    setEditingListNameValue(null);
                  }
                }}
                className="text-sm border border-[#AB9C95] rounded-[5px] px-2 py-1 w-32 focus:outline-none focus:ring-1 focus:ring-[#A85C36] mr-2"
                autoFocus
              />
            ) : (
              <div
                onClick={() => setSelectedListId(list.id)}
                className={`
                  flex items-center justify-between px-4 py-1 text-sm font-medium whitespace-nowrap transition-all duration-200 ease-in-out group relative cursor-pointer
                  ${selectedListId === list.id
                    ? 'bg-[#DEDBDB] text-[#332B42] rounded-t-[5px]'
                    : 'bg-[#F3F2F0] text-[#364257] hover:bg-[#E0DBD7] border-b-2 border-transparent hover:border-[#AB9C95] rounded-t-[5px]'
                  }
                  mr-2
                `}
              >
                <span>{list.name}</span>
                {/* Display task count */}
                {listTaskCounts.has(list.id) && (
                  <span className="ml-2 text-xs text-[#7A7A7A] bg-[#EBE3DD] px-1.5 py-0.5 rounded-full">
                    {listTaskCounts.get(list.id)}
                  </span>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenListMenuId(openListMenuId === list.id ? null : list.id);
                  }}
                  className="flex-shrink-0 p-1 rounded-full text-gray-500 hover:bg-gray-300 ml-2 opacity-0 group-hover:opacity-100 transition-opacity"
                  ref={el => { if (el) listButtonRefs.current[list.id] = el; }}
                >
                  <MoreHorizontal size={14} />
                </button>
              </div>
            )}
            <AnimatePresence>
              {openListMenuId === list.id && (
                <ListMenuDropdown
                  list={list}
                  handleRenameList={handleRenameList}
                  handleDeleteList={handleDeleteList}
                  setEditingListNameId={setEditingListNameId}
                  setEditingListNameValue={setEditingListNameValue}
                  setOpenListMenuId={setOpenListMenuId}
                  buttonRef={{ current: listButtonRefs.current[list.id] }}
                />
              )}
            </AnimatePresence>
          </div>
        ))}
        {/* New List Button / Input */}
        {!showNewListInput ? (
          <button
            onClick={() => {
              // Always show the input field when the "New List" button is clicked
              setShowNewListInput(true);
            }}
            className="btn-primary-inverse px-2 py-1 text-xs font-medium rounded-full whitespace-nowrap mr-2 transition-colors"
            title={willReachListLimit ? `You have reached the limit of ${STARTER_TIER_MAX_LISTS} lists.` : 'Create a new list'}
          >
            + New List
          </button>
        ) : (
          <motion.div
            key="new-list-input-container" // Added key for proper re-rendering
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: 'auto' }}
            exit={{ opacity: 0, width: 0 }}
            transition={{ duration: 0.2 }}
            className="flex items-center gap-2 pr-2"
          >
            <input
              ref={newListInputRef}
              type="text"
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleCreateNewList();
                } else if (e.key === 'Escape') {
                  setShowNewListInput(false);
                  setNewListName('');
                }
              }}
              placeholder="List name"
              className="text-sm border border-[#AB9C95] rounded-[5px] px-2 py-1 w-32 focus:outline-none focus:ring-1 focus:ring-[#A85C36]"
              autoFocus
            />
            <button
              onClick={handleCreateNewList}
              className="btn-primary text-xs px-3 py-1"
            >
              Add
            </button>
            <button
              onClick={() => { setShowNewListInput(false); setNewListName(''); }}
              className="btn-primary-inverse text-xs px-3 py-1"
            >
              Cancel
            </button>
          </motion.div>
        )}
      </div>
    </div>

    {/* Banner for list limit */}
    <AnimatePresence>
      {willReachListLimit && showListLimitBanner && (
        <div className="px-2">
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
        </div>
      )}
    </AnimatePresence>

    {/* Main To-Do Items Display Area - This will now ONLY contain incomplete tasks and be the scrollable part */}
    <div
      className="flex-1 overflow-y-auto pt-2 px-1 md:px-0" // Removed pb-16 as sticky footer is outside
      onDragOver={handleListDragOver}
      onDrop={handleListDrop}
    >
      {filteredTodoItems.incompleteTasks.length === 0 && filteredTodoItems.completedTasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center text-gray-500 text-sm py-8">
          <img src="/wine.png" alt="Empty To-do List" className="w-24 h-24 mb-4 opacity-70" />
          <p>Add a To-do item to this list</p>
        </div>
      ) : (
        <div className="space-y-0">
          {/* Incomplete Tasks */}
          {filteredTodoItems.incompleteTasks.length > 0 && (
            <AnimatePresence initial={false}>
              {filteredTodoItems.incompleteTasks.map((todo) => (
                <TodoItemComponent
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
                />
              ))}
            </AnimatePresence>
          )}
          {/* Removed the Completed Tasks Section from here */}
        </div>
      )}
    </div>

    {/* COMPLETED TASKS SECTION - Moved OUTSIDE the main scrollable area for incomplete tasks */}
    {filteredTodoItems.completedTasks.length > 0 && (
      <div className="sticky bottom-0 z-10 bg-[#DEDBDB] mt-4 border-t border-[#AB9C95] pt-3 -mx-3">
        <button
          onClick={() => setShowCompletedTasks(!showCompletedTasks)}
          className="w-full flex items-center justify-between text-sm font-medium text-[#332B42] py-2 px-3 md:px-4 hover:bg-[#F3F2F0] rounded-[5px]" // Changed px-1 to px-3 md:px-4
        >
          <div className="flex items-center gap-2"> {/* Add this div for the icon and text */}
            <CircleCheck size={16} /> {/* Add the CircleCheck icon */}
            <span>Completed ({filteredTodoItems.completedTasks.length})</span>
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
              <div className="space-y-0">
                {filteredTodoItems.completedTasks.map((todo) => (
                  <TodoItemComponent
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
                    className="px-3 md:px-4" // ADD THIS PROP TO THE TodoItemComponent

                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )}
  </div>
);

export default ToDoPanel; 