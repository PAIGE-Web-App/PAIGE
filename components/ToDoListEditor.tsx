import React, { useState } from 'react';
import UnifiedTodoItem from './UnifiedTodoItem';
import { groupTasks, getGroupDescription, getDateForGroup, getTaskGroup } from '../utils/taskGrouping';
import { TodoItem } from '../types/todo';
import { ChevronRight } from 'lucide-react';

interface ToDoListEditorProps {
  tasks: any[];
  setTasks: (tasks: any) => void;
  customCategoryValue: string;
  setCustomCategoryValue: (val: string) => void;
  allCategories: string[];
  contacts?: any[];
  currentUser?: any;
  onAssign?: (todoId: string, assigneeIds: string[], assigneeNames: string[], assigneeTypes: ('user' | 'contact')[]) => Promise<void>;
}

// Utility to generate a unique id
function getStableId() {
  return Math.random().toString(36).substr(2, 9) + Date.now();
}

const ToDoListEditor: React.FC<ToDoListEditorProps> = ({ tasks, setTasks, customCategoryValue, setCustomCategoryValue, allCategories, contacts = [], currentUser = null, onAssign }) => {
  const [draggedTodoId, setDraggedTodoId] = useState<string | null>(null);
  const [dragOverTodoId, setDragOverTodoId] = useState<string | null>(null);
  const [dropIndicatorPosition, setDropIndicatorPosition] = useState<{ id: string | null; position: 'top' | 'bottom' | null }>({ id: null, position: null });
  const [openGroups, setOpenGroups] = useState<{ [key: string]: boolean }>({});

  const handleAddToDo = () => {
    const newId = getStableId();
    const newTask = { 
      _id: newId, 
      id: newId, 
      name: 'New Task', 
      note: '', 
      category: '', 
      deadline: undefined, 
      endDate: undefined,
      justUpdated: true 
    };
    const updatedTasks = [...tasks, newTask];
    setTasks(updatedTasks);
    
    // Remove the justUpdated flag after 1 second to stop the green flash
    setTimeout(() => {
      setTasks((currentTasks: any[]) => 
        currentTasks.map((t: any) => 
          t.id === newId ? { ...t, justUpdated: false } : t
        )
      );
    }, 1000);
  };

  const handleDeleteTodo = (todoId: string) => {
    setTasks(tasks.filter(t => String(t.id) !== String(todoId) && String(t._id) !== String(todoId)));
  };

  const handleRemoveToDo = (idx: number) => {
    setTasks(tasks.filter((_, i) => i !== idx));
  };

  const handleAssignTodo = async (todoId: string, assigneeIds: string[], assigneeNames: string[], assigneeTypes: ('user' | 'contact')[]) => {
    if (onAssign) {
      await onAssign(todoId, assigneeIds, assigneeNames, assigneeTypes);
    }
  };

  const toggleGroup = (group: string) => {
    setOpenGroups(prev => ({ ...prev, [group]: !prev[group] }));
  };

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, todoId: string) => {
    setDraggedTodoId(todoId);
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>, todoId: string) => {
    setDragOverTodoId(todoId);
  };

  const handleDragLeave = () => {
    setDragOverTodoId(null);
    setDropIndicatorPosition({ id: null, position: null });
  };

  const handleItemDragOver = (e: React.DragEvent<HTMLDivElement>, todoId: string) => {
    e.preventDefault();
    if (!draggedTodoId || draggedTodoId === todoId) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const threshold = rect.height / 2;

    setDropIndicatorPosition({
      id: todoId,
      position: y < threshold ? 'top' : 'bottom'
    });
  };

  const handleDragEnd = () => {
    setDraggedTodoId(null);
    setDragOverTodoId(null);
    setDropIndicatorPosition({ id: null, position: null });
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, targetId: string, targetGroup: string) => {
    e.preventDefault();
    if (!draggedTodoId || !targetId) return;

    const draggedIndex = tasks.findIndex(t => `temp-${tasks.indexOf(t)}` === draggedTodoId);
    const targetIndex = tasks.findIndex(t => `temp-${tasks.indexOf(t)}` === targetId);
    if (draggedIndex === -1 || targetIndex === -1) return;

    // Determine the group of the dragged and target items
    const toDate = (val: any) => {
      if (!val) return undefined;
      if (val instanceof Date) return val;
      if (typeof val === 'string') {
        const d = new Date(val);
        return isNaN(d.getTime()) ? undefined : d;
      }
      return undefined;
    };
    const todoItems: TodoItem[] = tasks.map((task, idx) => ({
      id: (task._id ?? idx).toString(),
      name: task.name,
      note: task.note,
      category: task.category,
      deadline: toDate(task.deadline),
      endDate: toDate(task.endDate),
      isCompleted: false,
      completedAt: undefined,
      startDate: undefined,
      contactId: undefined,
      justUpdated: false,
      userId: 'temp-user',
      createdAt: new Date(),
      orderIndex: idx,
      listId: 'temp-list',
      _id: task._id ?? idx,
    }));
    const grouped = groupTasks(todoItems);
    let newDeadline: string | undefined = undefined;
    // If moving to a different group, update the deadline
    for (const [group, items] of Object.entries(grouped)) {
      if (items.some(i => i.id === targetId)) {
        if (group !== getTaskGroup(todoItems[draggedIndex].deadline)) {
          const date = getDateForGroup(group);
          newDeadline = date.toISOString().slice(0, 16); // yyyy-MM-ddTHH:mm
        }
        break;
      }
    }

    const newTasks = [...tasks];
    const [draggedTask] = newTasks.splice(draggedIndex, 1);
    const insertIndex = dropIndicatorPosition.position === 'top' ? targetIndex : targetIndex + 1;
    if (typeof newDeadline !== 'undefined') {
      draggedTask.deadline = newDeadline;
    }
    newTasks.splice(insertIndex, 0, draggedTask);
    setTasks(newTasks);
    handleDragEnd();
  };

  // Convert tasks to TodoItem format for grouping
  const toDate = (val: any) => {
    if (!val) return undefined;
    if (val instanceof Date) return val;
    if (typeof val === 'string') {
      const d = new Date(val);
      return isNaN(d.getTime()) ? undefined : d;
    }
    return undefined;
  };
  
  const todoItems: TodoItem[] = tasks.map((task, idx) => ({
    id: (task._id ?? idx).toString(),
    name: task.name,
    note: task.note,
    category: task.category,
    deadline: toDate(task.deadline),
    endDate: toDate(task.endDate),
    isCompleted: false,
    completedAt: undefined,
    startDate: undefined,
    contactId: undefined,
    justUpdated: false,
    userId: 'temp-user',
    createdAt: new Date(),
    orderIndex: idx,
    listId: 'temp-list',
    _id: task._id ?? idx,
  }));

  const groupedTasks = groupTasks(todoItems);

  return (
    <>
      <div className="space-y-4">
        {Object.entries(groupedTasks).map(([group, items]) => (
          <div key={group} className="mb-6">
            <button
              className="flex items-center w-full text-left text-lg font-playfair font-medium text-[#332B42] mb-1 gap-2"
              onClick={() => toggleGroup(group)}
              type="button"
            >
              <ChevronRight
                className={`w-5 h-5 transition-transform ${openGroups[group] !== false ? 'rotate-90' : ''}`}
                strokeWidth={2}
              />
              <span>{group}</span>
              <span className="text-xs text-[#7A7A7A] bg-[#EBE3DD] px-2.5 py-0.5 rounded-full font-work">
                {items.length}
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
            <div className={`${openGroups[group] !== false ? 'block' : 'hidden'}`}>
              {(items as any[]).map((item) => {
                const stableId = (item as any).id || (item as any)._id;
                // Find the original task object for editor mode
                const originalTask = tasks.find((t: any, i: number) => (t.id || t._id || i) === (item.id || item._id));
                return (
                  <div
                    key={stableId}
                    draggable
                    onDragStart={(e) => handleDragStart(e, item.id)}
                    onDragEnter={(e) => handleDragEnter(e, item.id)}
                    onDragLeave={handleDragLeave}
                    onDragOver={(e) => handleItemDragOver(e, item.id)}
                    onDrop={(e) => handleDrop(e, item.id, group)}
                    onDragEnd={handleDragEnd}
                    className={`relative ${draggedTodoId === item.id ? 'opacity-50' : ''} ${dragOverTodoId === item.id ? 'bg-[#F3F2F0]' : ''}`}
                  >
                    {dropIndicatorPosition.id === item.id && dropIndicatorPosition.position === 'top' && (
                      <div className="absolute top-0 left-0 right-0 h-0.5 bg-[#A85C36]" />
                    )}
                    <UnifiedTodoItem
                      todo={originalTask || item}
                      contacts={contacts}
                      allCategories={allCategories}
                      sortOption="myOrder"
                      draggedTodoId={draggedTodoId}
                      dragOverTodoId={dragOverTodoId}
                      dropIndicatorPosition={dropIndicatorPosition}
                      currentUser={currentUser}
                      handleToggleTodoComplete={() => {}}
                      handleUpdateTaskName={async (_, newName) => {
                        setTasks((tasks: any[]) => tasks.map((t: any) => (String(t.id) === String(stableId) ? { ...t, name: newName || '' } : t)));
                      }}
                      handleUpdateDeadline={(_, deadline, endDate) => {
                        console.log('[ToDoListEditor] handleUpdateDeadline called with:', _, deadline, endDate);
                        setTasks((tasks: any[]) => {
                          const updatedTasks = tasks.map((t: any) => {
                            if (String(t.id) !== String(stableId)) return t;
                            const updatedTask = {
                              ...t,
                              deadline: deadline ? deadline : undefined,
                              endDate: endDate ? endDate : undefined,
                              justUpdated: true,
                            };
                            console.log('[ToDoListEditor] Updated task:', updatedTask);
                            return updatedTask;
                          });
                          console.log('[ToDoListEditor] Updated tasks array:', updatedTasks);
                          return updatedTasks;
                        });
                        setTimeout(() => {
                          setTasks((tasks: any[]) => tasks.map((t: any) => (String(t.id) === String(stableId)) ? { ...t, justUpdated: false } : t));
                        }, 1000);
                      }}
                      handleUpdateNote={(_, newNote) => {
                        setTasks((tasks: any[]) => tasks.map((t: any) => (String(t.id) === String(stableId) ? { ...t, note: newNote || '' } : t)));
                      }}
                      handleUpdateCategory={(_, newCategory) => {
                        setTasks((tasks: any[]) => tasks.map((t: any) => (String(t.id) === String(stableId) ? { ...t, category: newCategory || '' } : t)));
                      }}
                      handleCloneTodo={() => {}}
                      handleDeleteTodo={handleDeleteTodo}
                      setTaskToMove={() => {}}
                      setShowMoveTaskModal={() => {}}
                      handleDragStart={handleDragStart}
                      handleDragEnter={handleDragEnter}
                      handleDragLeave={handleDragLeave}
                      handleItemDragOver={handleItemDragOver}
                      handleDragEnd={handleDragEnd}
                      handleDrop={() => {}}
                      mode="editor"
                      onRemove={() => handleDeleteTodo(stableId)}
                      onAssign={onAssign}
                    />
                    {dropIndicatorPosition.id === item.id && dropIndicatorPosition.position === 'bottom' && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#A85C36]" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={handleAddToDo}
        className="text-xs text-[#332B42] border border-[#AB9C95] rounded-[5px] px-2 py-1 hover:bg-[#F3F2F0] flex items-center h-7 mt-2"
      >
        + Add another To-Do item
      </button>
    </>
  );
};

export default ToDoListEditor; 