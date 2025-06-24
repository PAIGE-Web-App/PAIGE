import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trash2, CheckCircle } from 'lucide-react';
import FormField from './FormField';
import CategorySelectField from './CategorySelectField';
import ToDoBuilderForm from './ToDoBuilderForm';
import { toast } from 'react-hot-toast';

interface TaskFieldsProps {
  name: string;
  setName: (value: string) => void;
  note: string;
  setNote: (value: string) => void;
  deadline: string;
  setDeadline: (value: string) => void;
  startDate?: string;
  setStartDate?: (value: string) => void;
  endDate?: string;
  setEndDate?: (value: string) => void;
  category: string;
  setCategory: (value: string) => void;
  isMultiDay?: boolean;
  setIsMultiDay?: (value: boolean) => void;
  allCategories: string[];
}

function formatDateForInputWithTime(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function parseLocalDateTime(input: string): Date {
  if (typeof input !== 'string') return new Date(NaN);
  const [datePart, timePart] = input.split('T');
  const [year, month, day] = datePart.split('-').map(Number);
  const [hour = 17, minute = 0] = (timePart ? timePart.split(':').map(Number) : [17, 0]);
  return new Date(year, month - 1, day, hour, minute, 0, 0);
}

const getDefaultDeadline = () => {
  const now = new Date();
  now.setHours(17, 0, 0, 0);
  return formatDateForInputWithTime(now);
};

interface AddSideCardProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'todo' | 'list' | 'calendar';
  onSubmit: (data: {
    name: string;
    deadline?: Date;
    startDate?: Date;
    endDate?: Date;
    note?: string;
    category?: string;
    tasks?: { name: string; deadline?: Date; startDate?: Date; endDate?: Date; note?: string; category?: string; }[];
  }) => void;
  initialData?: {
    name?: string;
    deadline?: Date;
    startDate?: Date;
    endDate?: Date;
    note?: string;
    category?: string;
  };
  allCategories: string[];
}

const TaskSideCard: React.FC<AddSideCardProps & { userId: string, todoLists: any[], selectedListId: string | null, setSelectedListId: (id: string) => void, todo?: any, handleToggleTodoComplete?: (todo: any) => void, handleDeleteTodo?: (todoId: string) => void }> = ({
  isOpen,
  onClose,
  mode,
  onSubmit,
  initialData,
  userId,
  todoLists,
  selectedListId,
  setSelectedListId,
  allCategories,
  todo,
  handleToggleTodoComplete,
  handleDeleteTodo,
}) => {
  const [tasks, setTasks] = useState<{ name: string; deadline?: string; endDate?: string; note?: string; category?: string; }[]>([]);
  const [newTaskName, setNewTaskName] = useState('');
  const [customCategoryValue, setCustomCategoryValue] = useState('');
  const [localTodo, setLocalTodo] = useState(todo);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        // If we have initialData, we're in edit mode
        setTasks([{
          name: initialData.name || '',
          deadline: initialData.deadline ? formatDateForInputWithTime(initialData.deadline) : '',
          endDate: initialData.endDate ? formatDateForInputWithTime(initialData.endDate) : '',
          note: initialData.note || '',
          category: initialData.category || ''
        }]);
      } else if (tasks.length === 0) {
        // If no initialData, we're in create mode
        setTasks([{ name: '', deadline: '', note: '', category: '' }]);
      }
    }
    if (!isOpen) {
      setTasks([]);
    }
  }, [isOpen, initialData]);

  useEffect(() => {
    if (!todo) return;
    if (!localTodo || todo.id !== localTodo.id) {
      setLocalTodo(todo);
    }
  }, [todo?.id]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedListId) {
      toast.error('Please select a to-do list.');
      return;
    }
    const validTasks = tasks.filter(task => task.name && task.name.trim());
    if (validTasks.length === 0) {
      toast.error('Please enter at least one task name.');
      return;
    }
    const [first, ...rest] = validTasks;
    const submitData = {
      name: first.name.trim(),
      ...(first.note?.trim() ? { note: first.note.trim() } : {}),
      ...(first.category ? { category: first.category } : {}),
      ...(first.deadline ? { deadline: parseLocalDateTime(first.deadline) } : {}),
      ...(first.endDate ? { endDate: parseLocalDateTime(first.endDate) } : {}),
      ...(rest.length > 0 ? { tasks: rest.map(task => ({
        name: task.name.trim(),
        ...(task.note?.trim() ? { note: task.note.trim() } : {}),
        ...(task.category ? { category: task.category } : {}),
        ...(task.deadline ? { deadline: parseLocalDateTime(task.deadline) } : {}),
        ...(task.endDate ? { endDate: parseLocalDateTime(task.endDate) } : {}),
      })) } : {})
    };
    onSubmit(submitData);
    onClose();
  };

  const handleListSubmit = (data: any) => {
    // Handle list creation from ToDoBuilderForm
    onSubmit(data);
    onClose();
  };

  const removeTask = (index: number) => {
    setTasks(tasks.filter((_, i) => i !== index));
  };

  const updateTask = (index: number, field: string, value: string) => {
    setTasks(tasks.map((task, i) =>
      i === index ? { ...task, [field]: value } : task
    ));
  };

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    onClose();
  };

  const handleCardClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay for click-away close */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black bg-opacity-30 z-40"
            onClick={handleOverlayClick}
          />
          {/* Side card */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 20 }}
            className="fixed top-0 right-0 h-full w-96 bg-white shadow-lg z-50 overflow-y-auto flex flex-col"
            onClick={handleCardClick}
          >
            <div className="sticky top-0 z-50 bg-white border-b border-[#E0DBD7] flex justify-between items-center mb-0 w-full p-4">
              <h5 className="text-h5 font-playfair text-[#332B42]">
                {mode === 'todo' ? 'New To-Do Item' : mode === 'calendar' ? (tasks[0]?.name || 'To-Do Item Details') : 'New List'}
              </h5>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 flex-1 flex flex-col">
              {mode === 'list' ? (
                // Use ToDoBuilderForm for list creation
                <ToDoBuilderForm
                  mode="list"
                  onSubmit={handleListSubmit}
                />
              ) : (
                // Use existing form for todo creation
                <>
                  {/* To-Do List Picker Dropdown */}
                  {mode !== 'calendar' && (
                    <div className="mb-4">
                      <label className="block text-xs font-medium text-[#332B42] mb-1">To-Do List</label>
                      <select
                        className="w-full border border-[#AB9C95] px-3 py-2 rounded-[5px] text-sm"
                        value={selectedListId || ''}
                        onChange={e => setSelectedListId(e.target.value)}
                        required
                      >
                        <option value="" disabled>Select a list</option>
                        {todoLists.map(list => (
                          <option key={list.id} value={list.id}>{list.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  <form onSubmit={handleSubmit} className="flex flex-col flex-1 space-y-4 overflow-y-auto pb-24">
                    {/* Main To-Do Items Section */}
                    <div className="space-y-4">
                      {tasks.map((task, index) => (
                        <div key={index} className="border border-[#AB9C95] rounded-[5px] p-4 pb-4 mb-4">
                          {mode !== 'calendar' && (
                            <div className="flex justify-between items-center mb-2">
                              <h3 className="text-sm font-medium text-[#332B42]">To-Do Item {index + 1}</h3>
                              {index > 0 && (
                                <button
                                  type="button"
                                  onClick={() => removeTask(index)}
                                  className="text-red-500 hover:text-red-700"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          )}
                          <div className="flex-1 space-y-2">
                            <FormField
                              label="Task Name"
                              name={`task-name-${index}`}
                              value={task.name}
                              onChange={e => updateTask(index, 'name', e.target.value)}
                              placeholder="Enter task name"
                            />
                            <FormField
                              label="Note"
                              name={`task-note-${index}`}
                              value={task.note || ''}
                              onChange={e => updateTask(index, 'note', e.target.value)}
                              placeholder="Add a note..."
                            />
                            <CategorySelectField
                              userId={userId}
                              value={task.category || ''}
                              customCategoryValue={customCategoryValue}
                              onChange={e => updateTask(index, 'category', e.target.value)}
                              onCustomCategoryChange={e => setCustomCategoryValue(e.target.value)}
                              label="Category"
                              placeholder="Select a category"
                            />
                            {mode === 'calendar' && (
                              <div className="mb-4">
                                <label className="block text-xs font-medium text-[#332B42] mb-1">To-Do List</label>
                                <select
                                  className="w-full border border-[#AB9C95] px-3 py-2 rounded-[5px] text-sm"
                                  value={selectedListId || ''}
                                  onChange={e => setSelectedListId(e.target.value)}
                                  required
                                >
                                  <option value="" disabled>Select a list</option>
                                  {todoLists.map(list => (
                                    <option key={list.id} value={list.id}>{list.name}</option>
                                  ))}
                                </select>
                              </div>
                            )}
                            <FormField
                              label="Deadline"
                              name={`task-deadline-${index}`}
                              type="datetime-local"
                              value={task.deadline || ''}
                              onChange={e => updateTask(index, 'deadline', e.target.value)}
                              placeholder="Select deadline"
                            />
                            <FormField
                              label="End Date"
                              name={`task-enddate-${index}`}
                              type="datetime-local"
                              value={task.endDate || ''}
                              onChange={e => updateTask(index, 'endDate', e.target.value)}
                              placeholder="Select end date"
                            />
                          </div>
                        </div>
                      ))}
                      {mode !== 'calendar' && (
                        <button
                          type="button"
                          onClick={() => setTasks([...tasks, { name: '', deadline: '', note: '', category: '' }])}
                          className="text-xs text-[#332B42] border border-[#AB9C95] rounded-[5px] px-2 py-1 hover:bg-[#F3F2F0] flex items-center h-7 mt-2"
                        >
                          + Add another to-do item
                        </button>
                      )}
                    </div>
                    {/* Calendar mode: Mark Complete/Incomplete, Delete, Completed On */}
                    {mode === 'calendar' && todo && (
                      <div className="flex flex-col gap-2 mt-4">
                        <div className="flex flex-row gap-2">
                          <button
                            type="button"
                            className="flex-1 text-xs text-[#332B42] border border-[#AB9C95] rounded-[5px] px-2 py-1 hover:bg-[#F3F2F0] flex items-center justify-center h-7 font-medium"
                            onClick={async () => {
                              if (!handleToggleTodoComplete || !localTodo) return;
                              await handleToggleTodoComplete(localTodo);
                              setLocalTodo(prev => prev ? {
                                ...prev,
                                isCompleted: !prev.isCompleted,
                                completedAt: !prev.isCompleted ? new Date() : undefined
                              } : prev);
                            }}
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            {localTodo?.isCompleted ? 'Mark Incomplete' : 'Mark Complete'}
                          </button>
                          <button
                            type="button"
                            className="flex-1 text-xs text-[#332B42] border border-[#AB9C95] rounded-[5px] px-2 py-1 hover:bg-[#F3F2F0] flex items-center justify-center h-7 font-medium"
                            onClick={() => setShowDeleteConfirm(true)}
                          >
                            <Trash2 className="w-4 h-4 mr-1" />
                            Delete Item
                          </button>
                        </div>
                        {showDeleteConfirm && (
                          <div className="mt-3 p-3 bg-[#F8F6F4] border border-[#AB9C95] rounded text-center">
                            <div className="text-sm text-[#A85C36] mb-2 font-medium">Are you sure?</div>
                            <div className="text-xs text-[#332B42] mb-3">This To-Do Item will permanently disappear.</div>
                            <div className="flex gap-2 justify-center">
                              <button
                                type="button"
                                className="px-3 py-1 rounded border border-[#AB9C95] text-xs text-[#332B42] bg-white hover:bg-[#F3F2F0]"
                                onClick={() => setShowDeleteConfirm(false)}
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                className="px-3 py-1 rounded border border-[#A85C36] text-xs text-white bg-[#A85C36] hover:bg-[#A85C36]/90"
                                onClick={() => { handleDeleteTodo && handleDeleteTodo(localTodo?.id); onClose(); }}
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        )}
                        {localTodo?.isCompleted && localTodo?.completedAt && (
                          <div className="text-xs text-[#364257] mt-2 text-center">
                            Completed On: {localTodo.completedAt instanceof Date ? localTodo.completedAt.toLocaleString() : new Date(localTodo.completedAt).toLocaleString()}
                          </div>
                        )}
                      </div>
                    )}
                    {/* Fixed action buttons at the bottom */}
                    <div className="fixed bottom-0 right-0 w-96 bg-white p-4 border-t border-[#E0DBD7] flex justify-end gap-2 z-50">
                      <button
                        type="button"
                        onClick={onClose}
                        className="btn-primaryinverse"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="btn-primary"
                      >
                        Submit
                      </button>
                    </div>
                  </form>
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default TaskSideCard; 