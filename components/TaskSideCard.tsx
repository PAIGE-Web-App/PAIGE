import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trash2 } from 'lucide-react';
import FormField from './FormField';
import CategorySelectField from './CategorySelectField';
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
  mode: 'todo' | 'list';
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
}

const TaskSideCard: React.FC<AddSideCardProps & { userId: string, todoLists: any[], selectedListId: string | null, setSelectedListId: (id: string) => void }> = ({
  isOpen,
  onClose,
  mode,
  onSubmit,
  initialData,
  userId,
  todoLists,
  selectedListId,
  setSelectedListId,
}) => {
  const [tasks, setTasks] = useState<{ name: string; deadline?: string; endDate?: string; note?: string; category?: string; }[]>([]);
  const [newTaskName, setNewTaskName] = useState('');
  const [customCategoryValue, setCustomCategoryValue] = useState('');

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
              <h2 className="text-h5 font-medium font-playfair text-[#332B42]">
                {mode === 'todo' ? 'New Task' : 'New List'}
              </h2>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 flex-1 flex flex-col">
              {/* To-Do List Picker Dropdown */}
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
              <form onSubmit={handleSubmit} className="flex flex-col flex-1 space-y-4 overflow-y-auto pb-24">
                {/* Main To-Do Items Section */}
                <div className="space-y-4">
                  {tasks.map((task, index) => (
                    <div key={index} className="border border-[#AB9C95] rounded-[5px] p-4 pb-4 mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-sm text-[#332B42]">Task {index + 1}</span>
                        {tasks.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeTask(index)}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-full"
                            title="Remove this task"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      <div className="flex-1 space-y-2">
                        <FormField
                          label="Task Name"
                          name={`task-name-${index}`}
                          value={task.name}
                          onChange={e => updateTask(index, 'name', e.target.value)}
                          placeholder="Enter task name"
                        />
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
                      </div>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => setTasks([...tasks, { name: '', deadline: '', note: '', category: '' }])}
                    className="text-xs text-[#332B42] border border-[#AB9C95] rounded-[5px] px-2 py-1 hover:bg-[#F3F2F0] flex items-center h-7 mt-2"
                  >
                    + Add another to-do item
                  </button>
                </div>
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
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default TaskSideCard; 