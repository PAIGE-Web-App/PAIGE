import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronRight, CircleCheck, ChevronUp, ChevronDown } from 'lucide-react';
import TodoItemComponent from './TodoItemComponent';

interface TodoListViewProps {
  todoItems: any[];
  filteredTodoItems: any[];
  groupedTasks: Record<string, any[]>;
  openGroups: Record<string, boolean>;
  toggleGroup: (group: string) => void;
  showCompletedItems: boolean;
  setShowCompletedItems: (val: boolean) => void;
  todoSearchQuery: string;
  selectedList: any;
  todoLists: any[];
  allCategories: string[];
  draggedTodoId: string | null;
  dragOverTodoId: string | null;
  dropIndicatorPosition: any;
  user: any;
  handleToggleTodoComplete: (todo: any) => void;
  handleUpdateTaskName: (id: string, name: string) => void;
  handleUpdateDeadline: (id: string, deadline: string | null | undefined) => void;
  handleUpdateNote: (id: string, note: string | null) => void;
  handleUpdateCategory: (id: string, category: string) => void;
  handleCloneTodo: (todo: any) => void;
  handleDeleteTodo: (id: string) => void;
  setTaskToMove: (todo: any) => void;
  setShowMoveTaskModal: (val: boolean) => void;
  handleDragStart: (e: any, id: string) => void;
  handleDragEnter: (e: any, id: string) => void;
  handleDragLeave: (e: any) => void;
  handleItemDragOver: (e: any, id: string) => void;
  handleDragEnd: (e: any) => void;
  handleListDrop: (e: any) => void;
  showCompletedTasks: boolean;
  setShowCompletedTasks: (val: boolean) => void;
}

const TodoListView: React.FC<TodoListViewProps> = ({
  todoItems,
  filteredTodoItems,
  groupedTasks,
  openGroups,
  toggleGroup,
  showCompletedItems,
  setShowCompletedItems,
  todoSearchQuery,
  selectedList,
  todoLists,
  allCategories,
  draggedTodoId,
  dragOverTodoId,
  dropIndicatorPosition,
  user,
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
  handleListDrop,
  showCompletedTasks,
  setShowCompletedTasks,
}) => {
  const hasIncomplete = todoItems.some(item => !item.isCompleted);
  const hasCompleted = todoItems.some(item => item.isCompleted);

  return (
    <main className="flex-1 flex flex-col min-h-full bg-white p-4 pb-0">
      <div className="flex-1 min-h-0 overflow-y-auto">
        {todoSearchQuery.trim() ? (
          filteredTodoItems.length === 0 ? (
            <div className="text-sm text-gray-500 text-center py-4">No matching tasks found.</div>
          ) : (
            filteredTodoItems.map((item) => (
              <div key={item.id} className="mb-2">
                <TodoItemComponent
                  todo={item}
                  contacts={[]}
                  allCategories={allCategories}
                  sortOption="myOrder"
                  draggedTodoId={draggedTodoId}
                  dragOverTodoId={dragOverTodoId}
                  dropIndicatorPosition={dropIndicatorPosition}
                  currentUser={user}
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
                  {...(!selectedList && { listName: (todoLists.find(l => l.id === item.listId)?.name) || 'Unknown List' })}
                />
              </div>
            ))
          )
        ) : showCompletedItems ? (
          todoItems.length === 0 ? (
            <div className="text-sm text-gray-500 text-center py-4">No completed tasks yet.</div>
          ) : (
            <div className="space-y-2">
              {todoItems.map((item) => (
                <TodoItemComponent
                  key={item.id}
                  todo={item}
                  contacts={[]}
                  allCategories={allCategories}
                  sortOption="myOrder"
                  draggedTodoId={draggedTodoId}
                  dragOverTodoId={dragOverTodoId}
                  dropIndicatorPosition={dropIndicatorPosition}
                  currentUser={user}
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
                  {...(!selectedList && { listName: (todoLists.find(l => l.id === item.listId)?.name) || 'Unknown List' })}
                />
              ))}
            </div>
          )
        ) : (
          !hasIncomplete && hasCompleted ? (
            <div className="flex flex-col items-center justify-center h-full py-12">
              <div className="flex items-center gap-2 text-lg text-[#332B42]">
                <CircleCheck className="text-green-600" size={28} />
                <h5>All items have been completed</h5>
              </div>
            </div>
          ) :
          Object.entries(groupedTasks).length === 0 ? (
            <div className="text-sm text-gray-500 text-center py-4">No tasks yet. Add one!</div>
          ) : (
            Object.entries(groupedTasks).map(([group, items]) => {
              const incompleteItems = items.filter(item => !item.isCompleted);
              if (incompleteItems.length === 0) return null;
              return (
                <div key={group} className="mb-6">
                  <button
                    className="flex items-center w-full text-left text-lg font-playfair font-medium text-[#332B42] mb-1 gap-2"
                    onClick={() => toggleGroup(group)}
                  >
                    <ChevronRight
                      className={`w-5 h-5 transition-transform ${openGroups[group] !== false ? 'rotate-90' : ''}`}
                      strokeWidth={2}
                    />
                    <span>{group}</span>
                    <span className="text-xs text-[#7A7A7A] bg-[#EBE3DD] px-1.5 py-0.5 rounded-full font-work">
                      {incompleteItems.length}
                    </span>
                  </button>
                  <div className="text-xs text-[#AB9C95] mb-2">
                    {group === 'No date yet' && 'for tasks without a deadline'}
                    {group === 'Overdue' && 'for tasks past their deadline'}
                    {group === 'Today' && 'for tasks due today'}
                    {group === 'Tomorrow' && 'for tasks due tomorrow'}
                    {group === 'This Week' && 'for tasks due within the next 7 days'}
                    {group === 'Next Week' && 'for tasks due within 8-14 days'}
                    {group === 'This Month' && 'for tasks due within 15-30 days'}
                    {group === 'Next Month' && 'for tasks due within 31-60 days'}
                    {group === 'Later' && 'for tasks due beyond 60 days'}
                  </div>
                  <div
                    className={`${openGroups[group] !== false ? 'block' : 'hidden'}`}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleListDrop}
                  >
                    {(incompleteItems as any[]).map((item, index) => {
                      const list = todoLists.find(l => l.id === item.listId);
                      return (
                        <div
                          key={item.id}
                          id={`todo-item-${item.id}`}
                          draggable
                          onDragStart={(e) => handleDragStart(e, item.id)}
                          onDragEnter={(e) => handleDragEnter(e, item.id)}
                          onDragLeave={handleDragLeave}
                          onDragOver={(e) => handleItemDragOver(e, item.id)}
                          onDragEnd={handleDragEnd}
                          className={`relative ${dragOverTodoId === item.id ? 'bg-[#EBE3DD]' : ''}`}
                        >
                          {dropIndicatorPosition.id === item.id && dropIndicatorPosition.position === 'top' && (
                            <div className="absolute top-0 left-0 right-0 h-0.5 bg-[#A85C36] -mt-0.5" />
                          )}
                          <TodoItemComponent
                            todo={item}
                            contacts={[]}
                            allCategories={allCategories}
                            sortOption="myOrder"
                            draggedTodoId={draggedTodoId}
                            dragOverTodoId={dragOverTodoId}
                            dropIndicatorPosition={dropIndicatorPosition}
                            currentUser={user}
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
                            {...(!selectedList && { listName: list ? list.name : 'Unknown List' })}
                          />
                          {dropIndicatorPosition.id === item.id && dropIndicatorPosition.position === 'bottom' && (
                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#A85C36] -mb-0.5" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )
        )}
      </div>
      {/* COMPLETED TASKS SECTION - Sticky at the bottom */}
      {todoItems.some(item => item.isCompleted) && !showCompletedItems && (
        <div className="sticky bottom-0 z-10 bg-[#DEDBDB] mt-4 border-t border-[#AB9C95] pt-3 -mx-4">
          <div className="pb-3">
            <button
              onClick={() => setShowCompletedTasks(!showCompletedTasks)}
              className="w-full flex items-center justify-between text-sm font-medium text-[#332B42] py-2 px-3 md:px-4 hover:bg-[#F3F2F0] rounded-[5px]"
            >
              <div className="flex items-center gap-2">
                <CircleCheck size={16} />
                <span>Completed ({todoItems.filter(item => item.isCompleted).length})</span>
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
                  className="overflow-hidden max-h-[40vh] overflow-y-auto p-4 pb-3"
                >
                  <div className="space-y-0">
                    {todoItems.filter(item => item.isCompleted).map((item) => (
                      <TodoItemComponent
                        key={item.id}
                        todo={item}
                        contacts={[]}
                        allCategories={allCategories}
                        sortOption="myOrder"
                        draggedTodoId={draggedTodoId}
                        dragOverTodoId={dragOverTodoId}
                        dropIndicatorPosition={dropIndicatorPosition}
                        currentUser={user}
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
                        {...(!selectedList && { listName: (todoLists.find(l => l.id === item.listId)?.name) || 'Unknown List' })}
                      />
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}
    </main>
  );
};

export default TodoListView; 