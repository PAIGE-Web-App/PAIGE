import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  CheckCircle, Circle, MoreHorizontal, Check, Copy, Trash2, MoveRight, Calendar, Clipboard, User as UserIcon,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import CategoryPill from './CategoryPill';
import CategorySelectField from './CategorySelectField';
import { useCustomToast } from '@/hooks/useCustomToast';
import { User } from 'firebase/auth';
import type { TodoItem } from '../types/todo';
import { Contact } from "../types/contact";

interface MainTodoItemComponentProps {
  todo: TodoItem;
  contacts: Contact[];
  allCategories: string[];
  sortOption: 'myOrder' | 'date' | 'title' | 'date-desc' | 'title-desc';
  draggedTodoId: string | null;
  dragOverTodoId: string | null;
  dropIndicatorPosition: { id: string | null; position: 'top' | 'bottom' | null };
  currentUser: User | null;
  handleToggleTodoComplete: (todo: TodoItem) => void;
  handleUpdateTaskName: (todoId: string, newName: string | null) => Promise<void>;
  handleUpdateDeadline: (todoId: string, deadline: string | null, endDate?: string | null) => void;
  handleUpdateNote: (todoId: string, newNote: string | null) => void;
  handleUpdateCategory: (todoId: string, newCategory: string | null) => void;
  handleCloneTodo: (todo: TodoItem) => void;
  handleDeleteTodo: (todoId: string) => void;
  setTaskToMove: (todo: TodoItem) => void;
  setShowMoveTaskModal: (show: boolean) => void;
  handleDragStart: (e: React.DragEvent<HTMLDivElement>, todoId: string) => void;
  handleDragEnter: (e: React.DragEvent<HTMLDivElement>, todoId: string) => void;
  handleDragLeave: (e: React.DragEvent<HTMLDivElement>) => void;
  handleItemDragOver: (e: React.DragEvent<HTMLDivElement>, todoId: string) => void;
  handleDragEnd: (e: React.DragEvent<HTMLDivElement>) => void;
  className?: string;
  listName?: string;
}

// Utility to format a Date as yyyy-MM-ddTHH:mm for input type="datetime-local"
function formatDateForInputWithTime(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

// Utility to parse a yyyy-MM-ddTHH:mm string as a local Date
function parseLocalDateTime(input: string): Date {
  if (typeof input !== 'string') return new Date(NaN);
  const [datePart, timePart] = input.split('T');
  const [year, month, day] = datePart.split('-').map(Number);
  const [hour = 17, minute = 0] = (timePart ? timePart.split(':').map(Number) : [17, 0]);
  // Always create a local date
  return new Date(year, month - 1, day, hour, minute, 0, 0);
}

// Add this utility function before the component definition
const getRelativeDeadline = (deadline: Date, startDate?: Date, endDate?: Date) => {
  if (startDate && endDate) {
    const now = new Date();
    const startDiff = startDate.getTime() - now.getTime();
    const endDiff = endDate.getTime() - now.getTime();
    const startDiffDays = Math.ceil(startDiff / (1000 * 60 * 60 * 24));
    const endDiffDays = Math.ceil(endDiff / (1000 * 60 * 60 * 24));

    if (startDiffDays <= 0 && endDiffDays >= 0) return "In Progress";
    if (startDiffDays > 0) return `Starts in ${startDiffDays} day${startDiffDays !== 1 ? 's' : ''}`;
    if (endDiffDays < 0) return `Ended ${Math.abs(endDiffDays)} day${Math.abs(endDiffDays) !== 1 ? 's' : ''} ago`;
    return `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`;
  }

  const now = new Date();
  const diffTime = deadline.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays === -1) return "Yesterday";
  if (diffDays > 1 && diffDays <= 7) return `in ${diffDays} days`;
  if (diffDays < -1 && diffDays >= -7) return `${Math.abs(diffDays)} days ago`;
  return deadline.toLocaleDateString();
};

const MainTodoItemComponent: React.FC<MainTodoItemComponentProps> = ({
  todo,
  contacts,
  allCategories,
  sortOption,
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
  className,
  listName,
}) => {
  const { showErrorToast } = useCustomToast();
  const [isEditingName, setIsEditingName] = useState(false);
  const [editingNameValue, setEditingNameValue] = useState(todo.name);
  const [isEditingDeadline, setIsEditingDeadline] = useState(false);
  const [editingDeadlineValue, setEditingDeadlineValue] = useState(() => {
    if (todo.deadline instanceof Date && !isNaN(todo.deadline.getTime())) {
      return formatDateForInputWithTime(todo.deadline);
    }
    // Default to today at 17:00
    const now = new Date();
    now.setHours(17, 0, 0, 0);
    return formatDateForInputWithTime(now);
  });
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [editingNoteValue, setEditingNoteValue] = useState(todo.note || '');
  const [isEditingCategory, setIsEditingCategory] = useState(false);
  const [editingCategoryDropdownValue, setEditingCategoryDropdownValue] = useState(todo.category || '');
  const [editingCustomCategoryValue, setEditingCustomCategoryValue] = useState('');
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [justUpdated, setJustUpdated] = useState(false);
  const [isEditingEndDate, setIsEditingEndDate] = useState(false);
  const [editingEndDateValue, setEditingEndDateValue] = useState(() => {
    if (todo.endDate instanceof Date && !isNaN(todo.endDate.getTime())) {
      return formatDateForInputWithTime(todo.endDate);
    }
    return '';
  });

  const moreMenuRef = useRef<HTMLDivElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const deadlineInputRef = useRef<HTMLInputElement>(null);

  // Effect to manage click outside for "More" menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
        setShowMoreMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Autofocus name input when editing starts
  useEffect(() => {
    if (isEditingName && nameInputRef.current) {
      nameInputRef.current.focus();
    }
  }, [isEditingName]);

  const handleToggleMenu = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMoreMenu((prev) => !prev);
  }, []);

  const handleNameDoubleClick = useCallback(() => {
    if (todo.isCompleted) return;
    setIsEditingName(true);
    setEditingNameValue(todo.name);
  }, [todo.name, todo.isCompleted]);

  const handleNameBlur = useCallback(async () => {
    if (editingNameValue.trim() !== todo.name) {
      if (!editingNameValue.trim()) {
        showErrorToast('Task name cannot be empty.');
        setEditingNameValue(todo.name); // Revert to original name
      } else {
        await handleUpdateTaskName(todo.id, editingNameValue.trim());
        setJustUpdated(true);
        setTimeout(() => setJustUpdated(false), 1000);
      }
    }
    setIsEditingName(false);
  }, [editingNameValue, todo.id, todo.name, handleUpdateTaskName]);

  const handleNameKeyDown = useCallback(async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    } else if (e.key === 'Escape') {
      setEditingNameValue(todo.name);
      setIsEditingName(false);
      e.currentTarget.blur();
    }
  }, [todo.name]);

  const handleAddDeadlineClick = useCallback(() => {
    if (todo.isCompleted) return;
    setIsEditingDeadline(true);
    if (todo.deadline instanceof Date && !isNaN(todo.deadline.getTime())) {
      setEditingDeadlineValue(formatDateForInputWithTime(todo.deadline));
    } else {
      // Default to today at 17:00
      const now = new Date();
      now.setHours(17, 0, 0, 0);
      setEditingDeadlineValue(formatDateForInputWithTime(now));
    }
    if (todo.endDate instanceof Date && !isNaN(todo.endDate.getTime())) {
      setEditingEndDateValue(formatDateForInputWithTime(todo.endDate));
    } else if (todo.endDate) {
      setEditingEndDateValue(formatDateForInputWithTime(new Date(todo.endDate)));
    } else {
      setEditingEndDateValue('');
    }
    setTimeout(() => {
      deadlineInputRef.current?.focus();
    }, 0);
  }, [todo.deadline, todo.endDate, todo.isCompleted]);

  const handleDeadlineKeyDown = useCallback(async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      await handleUpdateDeadline(todo.id, editingDeadlineValue);
      setIsEditingDeadline(false);
    } else if (e.key === 'Escape') {
      setEditingDeadlineValue('');
      setIsEditingDeadline(false);
      e.currentTarget.blur();
    }
  }, [todo.id, editingDeadlineValue, handleUpdateDeadline]);

  const handleNoteKeyDown = useCallback(async (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      await handleUpdateNote(todo.id, editingNoteValue);
      setJustUpdated(true);
      setTimeout(() => setJustUpdated(false), 1000);
      setIsEditingNote(false);
    } else if (e.key === 'Escape') {
      setEditingNoteValue(todo.note || '');
      setIsEditingNote(false);
      e.currentTarget.blur();
    }
  }, [todo.id, todo.note, editingNoteValue, handleUpdateNote]);

  const handleCategoryKeyDown = useCallback(async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      await handleUpdateCategory(todo.id, editingCategoryDropdownValue);
      setJustUpdated(true);
      setTimeout(() => setJustUpdated(false), 1000);
      setIsEditingCategory(false);
    } else if (e.key === 'Escape') {
      setEditingCategoryDropdownValue(todo.category || '');
      setIsEditingCategory(false);
      e.currentTarget.blur();
    }
  }, [todo.id, todo.category, editingCategoryDropdownValue, handleUpdateCategory]);

  const handleDeadlineChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setEditingDeadlineValue(e.target.value);
  }, []);

  const handleNoteChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditingNoteValue(e.target.value);
  }, []);

  const handleCategoryDropdownChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setEditingCategoryDropdownValue(e.target.value);
  }, []);

  const handleCustomCategoryInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setEditingCustomCategoryValue(e.target.value);
  }, []);

  const handleDeadlineBlur = useCallback(async () => {
    let endDateStr = '';
    if (todo.endDate) {
      if (todo.endDate instanceof Date) {
        endDateStr = formatDateForInputWithTime(todo.endDate);
      } else if (typeof todo.endDate === 'string') {
        const parsed = Date.parse(todo.endDate);
        if (!isNaN(parsed)) {
          endDateStr = formatDateForInputWithTime(new Date(parsed));
        }
      }
    }
    await handleUpdateDeadline(
      todo.id,
      editingDeadlineValue,
      endDateStr
    );
    setIsEditingDeadline(false);
  }, [todo.id, editingDeadlineValue, todo.endDate, handleUpdateDeadline]);

  const handleNoteBlur = useCallback(async () => {
    if (editingNoteValue !== todo.note) {
      await handleUpdateNote(todo.id, editingNoteValue);
      setJustUpdated(true);
      setTimeout(() => setJustUpdated(false), 1000);
    }
    setIsEditingNote(false);
  }, [editingNoteValue, todo.id, todo.note, handleUpdateNote]);

  const handleCategoryBlur = useCallback(async () => {
    if (editingCategoryDropdownValue !== todo.category) {
      await handleUpdateCategory(todo.id, editingCategoryDropdownValue);
      setJustUpdated(true);
      setTimeout(() => setJustUpdated(false), 1000);
    }
    setIsEditingCategory(false);
  }, [editingCategoryDropdownValue, todo.id, todo.category, handleUpdateCategory]);

  const handleDeadlineCancel = useCallback(() => {
    setEditingDeadlineValue('');
    setIsEditingDeadline(false);
  }, []);

  const handleNoteCancel = useCallback(() => {
    setEditingNoteValue(todo.note || '');
    setIsEditingNote(false);
  }, [todo.note]);

  const handleCategoryCancel = useCallback(() => {
    setEditingCategoryDropdownValue(todo.category || '');
    setIsEditingCategory(false);
  }, [todo.category]);

  const handleUpdateDeadlineClick = useCallback(async () => {
    await handleUpdateDeadline(todo.id, editingDeadlineValue);
    setIsEditingDeadline(false);
  }, [todo.id, editingDeadlineValue, handleUpdateDeadline]);

  const handleUpdateNoteClick = useCallback(async () => {
    await handleUpdateNote(todo.id, editingNoteValue);
    setJustUpdated(true);
    setTimeout(() => setJustUpdated(false), 1000);
    setIsEditingNote(false);
  }, [todo.id, editingNoteValue, handleUpdateNote]);

  const handleUpdateCategoryClick = useCallback(async () => {
    await handleUpdateCategory(todo.id, editingCategoryDropdownValue);
    setJustUpdated(true);
    setTimeout(() => setJustUpdated(false), 1000);
    setIsEditingCategory(false);
  }, [todo.id, editingCategoryDropdownValue, handleUpdateCategory]);

  const handleUpdateEndDate = async (todoId: string, endDate: string) => {
    let deadlineStr = '';
    if (todo.deadline) {
      if (todo.deadline instanceof Date) {
        deadlineStr = formatDateForInputWithTime(todo.deadline);
      } else if (typeof todo.deadline === 'string') {
        const parsed = Date.parse(todo.deadline);
        if (!isNaN(parsed)) {
          deadlineStr = formatDateForInputWithTime(new Date(parsed));
        }
      }
    }
    await handleUpdateDeadline(
      todoId,
      deadlineStr,
      endDate
    );
  };

  const handleRemoveEndDate = async (todoId: string) => {
    await handleUpdateEndDate(todoId, '');
    setIsEditingEndDate(false);
    setEditingEndDateValue('');
  };

  const handleStartEditEndDate = () => {
    setIsEditingEndDate(true);
    if (todo.endDate instanceof Date && !isNaN(todo.endDate.getTime())) {
      setEditingEndDateValue(formatDateForInputWithTime(todo.endDate));
    } else if (todo.endDate) {
      setEditingEndDateValue(formatDateForInputWithTime(new Date(todo.endDate)));
    } else {
      setEditingEndDateValue('');
    }
    if (todo.deadline instanceof Date && !isNaN(todo.deadline.getTime())) {
      setEditingDeadlineValue(formatDateForInputWithTime(todo.deadline));
    } else if (typeof todo.deadline === 'string' && todo.deadline) {
      setEditingDeadlineValue(formatDateForInputWithTime(new Date(todo.deadline)));
    } else {
      setEditingDeadlineValue('');
    }
  };

  return (
    <div
      className={`relative group ${className || ''}`}
      draggable
      onDragStart={(e) => handleDragStart(e, todo.id)}
      onDragEnter={(e) => handleDragEnter(e, todo.id)}
      onDragLeave={handleDragLeave}
      onDragOver={(e) => handleItemDragOver(e, todo.id)}
      onDragEnd={handleDragEnd}
    >
      {/* Drop indicator */}
      {dropIndicatorPosition.id === todo.id && dropIndicatorPosition.position && (
        <div
          className={`absolute left-0 right-0 h-0.5 bg-blue-500 ${
            dropIndicatorPosition.position === 'top' ? '-top-0.5' : '-bottom-0.5'
          }`}
        />
      )}

      <div
        className={`p-3 mb-2 rounded-[5px] border border-[#AB9C95] ${
          todo.isCompleted ? 'bg-gray-50' : 'bg-white'
        } ${draggedTodoId === todo.id ? 'opacity-50' : ''} ${
          dragOverTodoId === todo.id ? 'border-blue-500' : ''
        } ${(justUpdated || todo.justUpdated) ? 'bg-green-100' : ''}`}
      >
        <div className="flex items-start gap-3">
          <button
            onClick={() => handleToggleTodoComplete(todo)}
            className={`mt-1 ${todo.isCompleted ? 'text-green-500' : 'text-gray-400'}`}
          >
            {todo.isCompleted ? <CheckCircle size={20} /> : <Circle size={20} />}
          </button>

          <div className="flex-1 min-w-0">
            {isEditingName ? (
              <input
                ref={nameInputRef}
                type="text"
                value={editingNameValue}
                onChange={(e) => setEditingNameValue(e.target.value)}
                onBlur={handleNameBlur}
                onKeyDown={handleNameKeyDown}
                className="w-full text-sm font-medium text-[#364257] border border-[#AB9C95] rounded-[3px] px-1 py-0.5"
                autoFocus
              />
            ) : (
              <div
                onDoubleClick={handleNameDoubleClick}
                className={`text-sm font-medium text-[#364257] ${
                  todo.isCompleted ? 'line-through text-gray-500' : ''
                }`}
              >
                {todo.name}
              </div>
            )}

            {/* Deadline and End Date Inline Editing */}
            {isEditingDeadline ? (
              <div className="flex items-center gap-2 mt-1">
                <input
                  ref={deadlineInputRef}
                  type="datetime-local"
                  value={editingDeadlineValue}
                  onChange={handleDeadlineChange}
                  onBlur={handleDeadlineBlur}
                  onKeyDown={handleDeadlineKeyDown}
                  className="text-xs font-normal text-[#364257] border border-[#AB9C95] rounded-[3px] px-1 py-0.5 block"
                  autoFocus
                />
                <button onClick={handleDeadlineCancel} className="btn-primaryinverse text-xs px-2 py-1">Cancel</button>
              </div>
            ) : (
              <div className="flex items-center gap-1 text-xs text-[#7A7A7A] mt-1">
                <Calendar className="w-3 h-3" />
                <button
                  type="button"
                  className={`underline bg-transparent border-none p-0 text-xs text-[#364257] ${todo.isCompleted ? 'text-gray-400 cursor-not-allowed' : 'cursor-pointer hover:text-[#A85C36]'}`}
                  onClick={todo.isCompleted ? undefined : handleAddDeadlineClick}
                  disabled={todo.isCompleted}
                  style={{ outline: 'none' }}
                >
                  {todo.deadline ? (
                    <>
                      <button
                        type="button"
                        className={`underline bg-transparent border-none p-0 text-xs text-[#364257] ${todo.isCompleted ? 'text-gray-400 cursor-not-allowed' : 'cursor-pointer hover:text-[#A85C36]'}`}
                        onClick={todo.isCompleted ? undefined : handleAddDeadlineClick}
                        disabled={todo.isCompleted}
                        style={{ outline: 'none' }}
                      >
                        {todo.deadline instanceof Date && !isNaN(todo.deadline.getTime())
                          ? todo.deadline.toLocaleString()
                          : ''}
                      </button>
                    </>
                  ) : (
                    'Add Deadline'
                  )}
                </button>
                {/* End Date logic */}
                {(isEditingEndDate || (todo.deadline && todo.endDate && !isEditingDeadline)) && (
                  <>
                    {isEditingEndDate ? (
                      <div className="flex items-center gap-2 mt-1">
                        <input
                          type="datetime-local"
                          value={editingEndDateValue}
                          onChange={e => setEditingEndDateValue(e.target.value)}
                          onBlur={async () => { await handleUpdateEndDate(todo.id, editingEndDateValue); setIsEditingEndDate(false); }}
                          className="text-xs font-normal text-[#364257] border border-[#AB9C95] rounded-[3px] px-1 py-0.5 block"
                          autoFocus
                        />
                        <button onClick={() => { setIsEditingEndDate(false); setEditingEndDateValue(todo.endDate ? formatDateForInputWithTime(todo.endDate) : ''); }} className="btn-primaryinverse text-xs px-2 py-1">Cancel</button>
                        {todo.endDate && <button onClick={async () => { await handleRemoveEndDate(todo.id); setIsEditingEndDate(false); }} className="btn-primaryinverse text-xs px-2 py-1">Remove</button>}
                      </div>
                    ) : (
                      <>
                        <span className="mx-1">→</span>
                        <button
                          type="button"
                          className={`underline bg-transparent border-none p-0 text-xs text-[#364257] ${todo.isCompleted ? 'text-gray-400 cursor-not-allowed' : 'cursor-pointer hover:text-[#A85C36]'}`}
                          onClick={handleStartEditEndDate}
                          disabled={todo.isCompleted}
                          style={{ outline: 'none' }}
                        >
                          {todo.endDate instanceof Date && !isNaN(todo.endDate.getTime())
                            ? todo.endDate.toLocaleString()
                            : (typeof todo.endDate === 'string' && todo.endDate ? new Date(todo.endDate).toLocaleString() : '')}
                        </button>
                      </>
                    )}
                  </>
                )}
                {/* Add End Date button if only deadline is present */}
                {todo.deadline && !todo.endDate && !isEditingDeadline && !isEditingEndDate && !todo.isCompleted && (
                  <button
                    type="button"
                    className="ml-2 text-xs text-[#A85C36] hover:underline"
                    onClick={handleStartEditEndDate}
                  >
                    + Add End Date
                  </button>
                )}
              </div>
            )}

            {/* Note */}
            {todo.note && !isEditingNote && (
              <div className="flex items-start gap-1 mt-1">
                <Clipboard size={14} className="text-gray-400 mt-0.5" />
                <span className="text-xs text-gray-500">{todo.note}</span>
              </div>
            )}

            {/* Category */}
            {todo.category && !isEditingCategory && (
              <div className="mt-1">
                <CategoryPill category={todo.category} />
              </div>
            )}

            {/* Editing UI */}
            {isEditingNote && (
              <div className="mt-2">
                <textarea
                  value={editingNoteValue}
                  onChange={handleNoteChange}
                  placeholder="Add a note..."
                  rows={2}
                  onBlur={handleNoteBlur}
                  onKeyDown={handleNoteKeyDown}
                  className="w-full text-xs font-normal text-[#364257] border border-[#AB9C95] rounded-[3px] px-1 py-0.5"
                  autoFocus
                />
                <div className="flex gap-2 mt-1">
                  <button onClick={handleUpdateNoteClick} className="btn-primary text-xs px-2 py-1">Update</button>
                  <button onClick={handleNoteCancel} className="btn-primaryinverse text-xs px-2 py-1">Cancel</button>
                </div>
              </div>
            )}

            {isEditingCategory && (
              <div className="mt-2">
                <div className="flex flex-col gap-1">
                  <CategorySelectField
                    userId={currentUser?.uid || ''}
                    value={editingCategoryDropdownValue}
                    customCategoryValue={editingCustomCategoryValue}
                    onChange={handleCategoryDropdownChange}
                    onCustomCategoryChange={handleCustomCategoryInputChange}
                    label=""
                    placeholder="Select Category"
                  />
                  {editingCategoryDropdownValue === "Other" && (
                    <input
                      type="text"
                      value={editingCustomCategoryValue}
                      onChange={handleCustomCategoryInputChange}
                      placeholder="Enter custom category"
                      className="text-xs font-normal text-[#364257] border border-[#AB9C95] rounded-[3px] px-1 py-0.5"
                    />
                  )}
                  <div className="flex gap-2 mt-1">
                    <button onClick={handleUpdateCategoryClick} className="btn-primary text-xs px-2 py-1">Update</button>
                    <button onClick={handleCategoryCancel} className="btn-primaryinverse text-xs px-2 py-1">Cancel</button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="relative">
            <button
              onClick={handleToggleMenu}
              className="p-1 hover:bg-gray-100 rounded-full"
            >
              <MoreHorizontal size={16} className="text-gray-400" />
            </button>

            <AnimatePresence>
              {showMoreMenu && (
                <motion.div
                  ref={moreMenuRef}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute right-0 mt-1 w-48 bg-white rounded-[5px] shadow-lg border border-[#AB9C95] z-10"
                >
                  <div className="py-1">
                    <button
                      onClick={() => {
                        handleCloneTodo(todo);
                        setShowMoreMenu(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                    >
                      <Copy size={16} />
                      Clone
                    </button>
                    <button
                      onClick={() => {
                        setTaskToMove(todo);
                        setShowMoveTaskModal(true);
                        setShowMoreMenu(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                    >
                      <MoveRight size={16} />
                      Move to List
                    </button>
                    <button
                      onClick={() => {
                        handleDeleteTodo(todo.id);
                        setShowMoreMenu(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-gray-100 flex items-center gap-2"
                    >
                      <Trash2 size={16} />
                      Delete
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MainTodoItemComponent; 