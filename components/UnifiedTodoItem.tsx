import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  CheckCircle, Circle, MoreHorizontal, Check, Copy, Trash2, MoveRight, Calendar, Clipboard, User as UserIcon, NotepadText, UserPlus,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import CategoryPill from './CategoryPill';
import CategorySelectField from './CategorySelectField';
import toast from 'react-hot-toast';
import { User } from 'firebase/auth';
import type { TodoItem } from '../types/todo';
import { Contact } from "../types/contact";
import { highlightText } from '@/utils/searchHighlight';
import UserAvatar from './UserAvatar';
import TodoAssignmentModal from './TodoAssignmentModal';
import { useUserProfileData } from '@/hooks/useUserProfileData';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface UnifiedTodoItemProps {
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
  handleDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  className?: string;
  listName?: string;
  mode: 'page' | 'editor';
  onRemove?: () => void;
  isJustMoved?: boolean;
  searchQuery?: string;
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

function formatDateStringForDisplay(dateString?: string): string {
  if (!dateString || typeof dateString !== 'string') return '';
  const date = parseLocalDateTime(dateString);
  return isNaN(date.getTime()) ? '' : date.toLocaleString();
}

const UnifiedTodoItem: React.FC<UnifiedTodoItemProps> = ({
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
  handleDrop,
  className,
  listName,
  mode,
  onRemove,
  isJustMoved,
  searchQuery,
}) => {
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
  
  // Check if the todo object has a justUpdated property (from parent state)
  const isJustUpdatedFromParent = (todo as any).justUpdated === true;
  const [isEditingEndDate, setIsEditingEndDate] = useState(false);
  const [editingEndDateValue, setEditingEndDateValue] = useState(() => {
    if (todo.endDate instanceof Date && !isNaN(todo.endDate.getTime())) {
      return formatDateForInputWithTime(todo.endDate);
    }
    return '';
  });

  // Assignment state
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);

  const moreMenuRef = useRef<HTMLDivElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const deadlineInputRef = useRef<HTMLInputElement>(null);

  // Debugging log: Check todo item properties when component renders
  useEffect(() => {
    if (todo.isCompleted) {
      console.log(`UnifiedTodoItem: Todo ID: ${todo.id}, isCompleted: ${todo.isCompleted}, completedAt: ${todo.completedAt}`);
      if (todo.completedAt && !(todo.completedAt instanceof Date)) {
        console.error(`UnifiedTodoItem: completedAt for ID ${todo.id} is not a Date object:`, todo.completedAt);
      }
    }
  }, [todo]);

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
        toast.error('Task name cannot be empty.');
        setEditingNameValue(todo.name); // Revert to original name
      } else {
        console.log('Updating name:', todo.id, editingNameValue);
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
      await handleUpdateDeadline(todo.id, editingDeadlineValue, editingEndDateValue);
      setIsEditingDeadline(false);
    } else if (e.key === 'Escape') {
      setEditingDeadlineValue('');
      setIsEditingDeadline(false);
      e.currentTarget.blur();
    }
  }, [todo.id, editingDeadlineValue, editingEndDateValue, handleUpdateDeadline]);

  const handleDeadlineCancel = useCallback(() => {
    setEditingDeadlineValue('');
    setIsEditingDeadline(false);
  }, []);

  const handleAddNoteClick = useCallback(() => {
    if (todo.isCompleted) return;
    setIsEditingNote(true);
    setEditingNoteValue(todo.note || '');
  }, [todo.note, todo.isCompleted]);

  const handleUpdateNoteClick = useCallback(async () => {
    await handleUpdateNote(todo.id, editingNoteValue);
    setIsEditingNote(false);
  }, [todo.id, editingNoteValue, handleUpdateNote]);

  const handleNoteKeyDown = useCallback(async (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      await handleUpdateNote(todo.id, editingNoteValue);
      setIsEditingNote(false);
    } else if (e.key === 'Escape') {
      setEditingNoteValue(todo.note || '');
      setIsEditingNote(false);
      e.currentTarget.blur();
    }
  }, [todo.id, todo.note, editingNoteValue, handleUpdateNote]);

  const handleNoteCancel = useCallback(() => {
    setEditingNoteValue(todo.note || '');
    setIsEditingNote(false);
  }, [todo.note]);

  const handleEditCategoryClick = useCallback(() => {
    if (todo.isCompleted) return;
    setIsEditingCategory(true);
    const defaultCategories = ["Photographer", "Caterer", "Florist", "DJ", "Venue", "Wedding Planner", "Officiant", "Baker", "Dress Shop", "Suit/Tux Rental", "Hair Stylist", "Makeup Artist", "Musician", "Stationery", "Transportation", "Rentals", "Favors", "Jeweler", "Videographer"];
    if (todo.category && !defaultCategories.includes(todo.category) && allCategories.includes(todo.category)) {
      setEditingCategoryDropdownValue("Other");
      setEditingCustomCategoryValue(todo.category);
    } else {
      setEditingCategoryDropdownValue(todo.category || '');
      setEditingCustomCategoryValue('');
    }
  }, [todo.category, todo.isCompleted, allCategories]);

  const handleCategoryDropdownChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setEditingCategoryDropdownValue(e.target.value);
  }, []);

  const handleCustomCategoryInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setEditingCustomCategoryValue(e.target.value);
  }, []);

  const handleUpdateCategoryClick = useCallback(async () => {
    const categoryToSave = editingCategoryDropdownValue === "Other" ? editingCustomCategoryValue : editingCategoryDropdownValue;
    await handleUpdateCategory(todo.id, categoryToSave);
    setIsEditingCategory(false);
  }, [todo.id, editingCategoryDropdownValue, editingCustomCategoryValue, handleUpdateCategory]);

  const handleCategoryKeyDown = useCallback(async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const categoryToSave = editingCategoryDropdownValue === "Other" ? editingCustomCategoryValue : editingCategoryDropdownValue;
      await handleUpdateCategory(todo.id, categoryToSave);
      setIsEditingCategory(false);
    } else if (e.key === 'Escape') {
      setEditingCategoryDropdownValue(todo.category || '');
      setIsEditingCategory(false);
      e.currentTarget.blur();
    }
  }, [todo.id, todo.category, editingCategoryDropdownValue, editingCustomCategoryValue, handleUpdateCategory]);

  const handleCategoryBlur = useCallback(async () => {
    const categoryToSave = editingCategoryDropdownValue === "Other" ? editingCustomCategoryValue : editingCategoryDropdownValue;
    if (categoryToSave !== todo.category) {
      await handleUpdateCategory(todo.id, categoryToSave);
      setJustUpdated(true);
      setTimeout(() => setJustUpdated(false), 1000);
    }
    setIsEditingCategory(false);
  }, [editingCategoryDropdownValue, editingCustomCategoryValue, todo.id, todo.category, handleUpdateCategory]);

  const handleMoveClick = useCallback(() => {
    setTaskToMove(todo);
    setShowMoveTaskModal(true);
    setShowMoreMenu(false); // Close the more menu
  }, [todo, setTaskToMove, setShowMoveTaskModal]);

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

  console.log('Rendering todo.deadline:', todo.deadline, typeof todo.deadline);

  // Add a debug log to confirm prop type
  console.log('UnifiedTodoItem handleUpdateDeadline prop type:', typeof handleUpdateDeadline);

  const handleDeadlineChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setEditingDeadlineValue(e.target.value);
  }, []);

  const handleNoteChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditingNoteValue(e.target.value);
  }, []);

  const handleDeadlineBlur = useCallback(async () => {
    console.log('[UnifiedTodoItem] handleDeadlineBlur', { id: todo.id, editingDeadlineValue, endDate: todo.endDate });
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
    await handleUpdateDeadline(todoId, null, '');
  };

  const handleStartEditEndDate = () => {
    setIsEditingEndDate(true);
    if (todo.endDate instanceof Date && !isNaN(todo.endDate.getTime())) {
      setEditingEndDateValue(formatDateForInputWithTime(todo.endDate));
    } else if (todo.endDate) {
      setEditingEndDateValue(formatDateForInputWithTime(new Date(todo.endDate)));
    } else if (todo.deadline) {
      // Set to 1 day after the deadline
      let deadlineDate = todo.deadline instanceof Date ? new Date(todo.deadline) : new Date(todo.deadline);
      deadlineDate.setDate(deadlineDate.getDate() + 1);
      setEditingEndDateValue(formatDateForInputWithTime(deadlineDate));
    } else {
      setEditingEndDateValue('');
    }
  };

  // Assignment handlers
  const handleAssignTodo = async (assigneeId: string, assigneeName: string, assigneeType: 'user' | 'contact') => {
    try {
      // Update the todo item with assignment info
      const todoRef = doc(db, `users/${currentUser?.uid}/todoItems`, todo.id);
      const updateData: any = {
        assignedTo: assigneeId || null,
        assignedBy: currentUser?.uid || null,
        assignedAt: assigneeId ? new Date() : null,
        notificationRead: false,
      };
      
      await updateDoc(todoRef, updateData);
      
      toast.success(assigneeId ? `Assigned to ${assigneeName}` : 'Assignment removed');
      setShowAssignmentModal(false);
    } catch (error) {
      console.error('Error assigning todo:', error);
      toast.error('Failed to assign todo');
    }
  };

  // Get assignee info for display
  const getAssigneeInfo = () => {
    if (!todo.assignedTo) return null;
    
    // Check if it's the current user
    if (todo.assignedTo === currentUser?.uid) {
      return {
        id: currentUser.uid,
        name: userName || 'You',
        type: 'user' as const,
        profileImageUrl: currentUser.photoURL || undefined,
      };
    }
    
    // Check if it's partner or planner
    if (todo.assignedTo === 'partner' && partnerName) {
      return {
        id: 'partner',
        name: partnerName,
        type: 'user' as const,
      };
    }
    
    if (todo.assignedTo === 'planner' && plannerName) {
      return {
        id: 'planner',
        name: plannerName,
        type: 'user' as const,
      };
    }
    
    return null;
  };

  // Get user profile data for assignment
  const { userName, partnerName, plannerName } = useUserProfileData();

  const assigneeInfo = getAssigneeInfo();

  return (
    <>
      <div
        draggable={!isEditingName && sortOption === 'myOrder'}
        onDragStart={(e) => handleDragStart(e, todo.id)}
        onDragEnd={handleDragEnd}
        onDragEnter={(e) => handleDragEnter(e, todo.id)}
        onDragLeave={handleDragLeave}
        onDragOver={(e) => handleItemDragOver(e, todo.id)}
        onDrop={handleDrop}
      >
    <div
        className={`
          relative flex items-start gap-1 py-3 border-b-[0.5px] border-[#AB9C95]
          transition-all duration-300 ease-in-out
          ${sortOption === 'myOrder' ? 'cursor-grab' : ''}
          ${draggedTodoId === todo.id ? 'opacity-50 border-dashed border-2 border-[#A85C36]' : ''}
          ${dragOverTodoId === todo.id ? 'bg-[#EBE3DD]' : ''}
          ${(justUpdated || isJustMoved || isJustUpdatedFromParent) ? 'bg-green-100' : ''}
          ${className || ''}
        `}
    >
      {/* Visual Drop Indicator */}
        {dropIndicatorPosition.id === todo.id && (
          <div
            className={`absolute left-0 right-0 h-1 bg-[#A85C36] z-10 ${dropIndicatorPosition.position === 'top' ? 'top-0' : 'bottom-0'}`}
          />
        )}
        {/* Main content */}
        <div className="flex-1 flex items-start gap-2">
      {/* Checkbox (only in page mode) */}
      {mode === 'page' && (
            <button onClick={(e) => { 
              e.stopPropagation(); 
              handleToggleTodoComplete(todo); 
            }} className="flex-shrink-0 p-1 flex items-center justify-center">
          {todo.isCompleted ? (
            <div className="w-3.5 h-3.5 rounded-full border-[1px] border-[#AEAEAE] bg-white flex items-center justify-center">
                  <Check className="w-2.5 h-2.5 text-[#AEAEAE]" />
            </div>
          ) : (
            <div className="w-3.5 h-3.5 rounded-full border-[1px] border-[#AEAEAE] bg-white"></div>
          )}
        </button>
      )}

      {/* Task Content */}
      <div className="flex-1">
        {/* Conditional rendering for Task Name */}
        {isEditingName ? (
          todo.isCompleted ? (
            <span title="Mark as incomplete to edit this task." style={{ display: 'block' }}>
              <input
                ref={nameInputRef}
                type="text"
                value={editingNameValue}
                onChange={(e) => setEditingNameValue(e.target.value)}
                onBlur={handleNameBlur}
                onKeyDown={handleNameKeyDown}
                className="font-work text-xs font-medium text-[#332B42] border border-[#AB9C95] rounded-[3px] px-1 py-0.5 w-full"
                disabled
              />
            </span>
          ) : (
            <input
              ref={nameInputRef}
              type="text"
              value={editingNameValue}
              onChange={(e) => setEditingNameValue(e.target.value)}
              onBlur={handleNameBlur}
              onKeyDown={handleNameKeyDown}
              className="font-work text-xs font-medium text-[#332B42] border border-[#AB9C95] rounded-[3px] px-1 py-0.5 w-full"
            />
          )
        ) : (
          <div className="flex items-center justify-between">
            <p
              className={`font-work text-xs font-medium text-[#332B42] ${todo.isCompleted ? 'line-through text-gray-500' : ''} ${isEditingName ? 'hidden' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                if (!todo.isCompleted) {
                  handleNameDoubleClick();
                }
              }}
              title={todo.isCompleted ? 'Mark as incomplete to edit this task.' : ''}
            >
              {todo.name ? highlightText(todo.name, searchQuery || '') : '+ Add To-Do Name'}
            </p>
            {/* Three-dot menu button (only in page mode) */}
            {mode === 'page' && (
              <div className="relative" ref={moreMenuRef}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleMenu(e);
                  }}
                  className="p-1 hover:bg-gray-100 rounded-full"
                  title="More options"
                >
                  <MoreHorizontal size={16} className="text-gray-500" />
                </button>
                {/* Dropdown menu */}
                {showMoreMenu && (
                  <div className="absolute right-0 mt-1 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-10">
                    <button
                      onClick={() => {
                        handleCloneTodo(todo);
                        setShowMoreMenu(false);
                      }}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Clone
                    </button>
                    <button
                      onClick={() => {
                        handleMoveClick();
                        setShowMoreMenu(false);
                      }}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Move
                    </button>
                    <button
                      onClick={() => {
                        handleDeleteTodo(todo.id);
                        setShowMoreMenu(false);
                      }}
                      className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            )}
            {/* Delete icon (only in editor mode) */}
            {mode === 'editor' && onRemove && (
              <button
                onClick={onRemove}
                className="p-1 hover:bg-gray-100 rounded-full"
                title="Delete"
              >
                <Trash2 size={16} className="text-red-500" />
              </button>
            )}
          </div>
        )}

        {/* Show list name if provided (for All To-Do Items view) */}
        {listName && (
          <p className="text-xs text-[#AB9C95] italic mt-0.5">From: <span className="font-medium">{listName}</span></p>
        )}

        {/* Conditional rendering for Deadline */}
        {isEditingDeadline ? (
          todo.isCompleted ? (
            <span title="Mark as incomplete to edit this task." style={{ display: 'block' }}>
              <input
                ref={deadlineInputRef}
                type="datetime-local"
                value={editingDeadlineValue}
                onChange={handleDeadlineChange}
                onBlur={handleDeadlineBlur}
                onKeyDown={handleDeadlineKeyDown}
                className="text-xs font-normal text-[#364257] border border-[#AB9C95] rounded-[3px] px-1 py-0.5 block"
                disabled
              />
            </span>
          ) : (
            <div className="flex items-center gap-2">
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
          )
        ) : (
          <div className="flex items-center gap-1 text-xs text-[#364257] mt-1">
            <Calendar className="w-3 h-3" />
            {todo.deadline ? (
              <>
                <button
                  type="button"
                  className={`underline bg-transparent border-none p-0 text-xs text-[#364257] ${todo.isCompleted ? 'text-gray-400 cursor-not-allowed' : 'cursor-pointer hover:text-[#A85C36]'}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!todo.isCompleted) {
                      handleAddDeadlineClick();
                    }
                  }}
                  disabled={todo.isCompleted}
                  style={{ outline: 'none' }}
                >
                  {todo.deadline instanceof Date
                    ? todo.deadline.toLocaleString()
                    : new Date(todo.deadline).toLocaleString()}
                </button>
                {/* End Date logic: always show if deadline is set */}
                {isEditingEndDate ? (
                  <div className="flex items-center gap-2 ml-2">
                    <input
                      type="datetime-local"
                      value={editingEndDateValue}
                      onChange={e => setEditingEndDateValue(e.target.value)}
                      onBlur={async () => { await handleUpdateEndDate(todo.id, editingEndDateValue); setIsEditingEndDate(false); }}
                      className="text-xs font-normal text-[#364257] border border-[#AB9C95] rounded-[3px] px-1 py-0.5 block"
                      autoFocus
                      min={todo.deadline ? (todo.deadline instanceof Date ? formatDateForInputWithTime(todo.deadline) : formatDateForInputWithTime(new Date(todo.deadline))) : undefined}
                    />
                    <button onClick={() => { setIsEditingEndDate(false); setEditingEndDateValue(todo.endDate ? formatDateForInputWithTime(todo.endDate) : ''); }} className="btn-primaryinverse text-xs px-2 py-1">Cancel</button>
                    {(todo.deadline || todo.endDate) && (
                      <button
                        onClick={async () => {
                          await handleUpdateDeadline(todo.id, null, '');
                          setIsEditingEndDate(false);
                          setIsEditingDeadline(false);
                        }}
                        className="btn-primaryinverse text-xs px-2 py-1"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ) : todo.endDate ? (
                  <>
                    <span className="mx-1">→</span>
                    <button
                      type="button"
                      className={`underline bg-transparent border-none p-0 text-xs text-[#364257] ${todo.isCompleted ? 'text-gray-400 cursor-not-allowed' : 'cursor-pointer hover:text-[#A85C36]'}`}
                      onClick={handleStartEditEndDate}
                      disabled={todo.isCompleted}
                      style={{ outline: 'none' }}
                    >
                      {todo.endDate instanceof Date ? todo.endDate.toLocaleString() : new Date(todo.endDate).toLocaleString()}
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    className="ml-2 text-xs text-[#A85C36] hover:underline"
                    onClick={handleStartEditEndDate}
                  >
                    + Add End Date
                  </button>
                )}
              </>
            ) : (
              <button
                type="button"
                className="text-xs text-[#A85C36] hover:underline"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsEditingDeadline(true);
                }}
              >
                + Add Deadline
              </button>
            )}
          </div>
        )}

        {/* Conditional rendering for Note */}
        {isEditingNote ? (
          todo.isCompleted ? (
            <span title="Mark as incomplete to edit this task." style={{ display: 'block' }}>
              <textarea
                value={editingNoteValue}
                onChange={handleNoteChange}
                placeholder="Add a note..."
                rows={2}
                onBlur={handleNoteBlur}
                className="w-full text-xs font-normal text-[#364257] border border-[#AB9C95] rounded-[3px] px-1 py-0.5"
                disabled
              />
            </span>
          ) : (
            <div className="w-full">
              <textarea
                value={editingNoteValue}
                onChange={handleNoteChange}
                placeholder="Add a note..."
                rows={3}
                className="w-full text-xs font-normal text-[#364257] border border-[#AB9C95] rounded-[3px] px-1 py-0.5"
                autoFocus
                onKeyDown={e => {
                  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                    handleUpdateNoteClick();
                  }
                }}
              />
              <div className="flex gap-2 mt-1">
                <button onClick={handleUpdateNoteClick} className="btn-primary text-xs px-2 py-1">Update</button>
                <button onClick={handleNoteCancel} className="btn-primaryinverse text-xs px-2 py-1">Cancel</button>
              </div>
            </div>
          )
        ) : (
          <div 
            className="flex items-start gap-1 mt-1 cursor-pointer hover:bg-gray-50 rounded"
            onClick={handleAddNoteClick}
          >
            <NotepadText size={14} className="text-[#364257] mt-0.5" />
            <span className="text-xs text-[#364257]">{todo.note || '+ Add Note'}</span>
          </div>
        )}

        <div className="flex items-center gap-1 mt-2">
          {/* Conditional rendering for Category */}
          {isEditingCategory ? (
            todo.isCompleted ? (
              <span title="Mark as incomplete to edit this task." style={{ display: 'block' }}>
                <div className="text-xs font-normal text-[#364257] border border-[#AB9C95] rounded-[3px] px-2 py-1 bg-gray-100 opacity-70 cursor-not-allowed select-none">
                  {editingCategoryDropdownValue || 'Select Category'}
                </div>
                {editingCategoryDropdownValue === "Other" && (
                  <input
                    type="text"
                    value={editingCustomCategoryValue}
                    onChange={handleCustomCategoryInputChange}
                    placeholder="Enter custom category"
                    className="text-xs font-normal text-[#364257] border border-[#AB9C95] rounded-[3px] px-1 py-0.5 block mt-1"
                    disabled
                  />
                )}
                <div className="flex gap-2 mt-1">
                  <button className="btn-primary text-xs px-2 py-1" disabled> Update </button>
                  <button className="btn-primaryinverse text-xs px-2 py-1" disabled> Cancel </button>
                </div>
              </span>
            ) : (
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
                    className="text-xs font-normal text-[#364257] border border-[#AB9C95] rounded-[3px] px-1 py-0.5 block mt-1"
                  />
                )}
                <div className="flex gap-2 mt-1">
                  <button onClick={handleUpdateCategoryClick} className="btn-primary text-xs px-2 py-1"> Update </button>
                  <button onClick={handleCategoryBlur} className="btn-primaryinverse text-xs px-2 py-1"> Cancel </button>
                </div>
              </div>
            )
          ) : todo.category ? (
            todo.isCompleted ? (
              <span title="Mark as incomplete to edit this task." style={{ display: 'block' }}>
                <button className={`text-xs font-normal text-[#364257] text-left p-0 bg-transparent border-none opacity-70 cursor-not-allowed`} disabled>
                  <CategoryPill category={todo.category} />
                </button>
              </span>
            ) : (
              <button onClick={handleEditCategoryClick} className={`text-xs font-normal text-[#364257] text-left p-0 bg-transparent border-none`}>
                <CategoryPill category={todo.category} />
              </button>
            )
          ) : (
            todo.isCompleted ? (
              <span title="Mark as incomplete to edit this task." style={{ display: 'block' }}>
                <button className={`text-xs font-normal text-[#364257] underline text-left p-0 bg-transparent border-none text-gray-500`} disabled> Add Category </button>
              </span>
            ) : (
              <button onClick={handleEditCategoryClick} className={`text-xs font-normal text-[#364257] underline text-left p-0 bg-transparent border-none`}> Add Category </button>
            )
          )}

          {/* Contact information */}
          {todo.contactId && (
            <span className={`text-xs text-[#364257] ${todo.isCompleted ? 'text-gray-500' : ''}`}>
              {contacts.find(c => c.id === todo.contactId)?.name || 'N/A'}
            </span>
          )}

          {/* Assignment information */}
          <div className="flex items-center gap-1">
            {assigneeInfo ? (
              <div className="flex items-center gap-1">
                <UserAvatar
                  userId={assigneeInfo.id}
                  userName={assigneeInfo.name}
                  profileImageUrl={assigneeInfo.profileImageUrl}
                  size="sm"
                  showTooltip={true}
                />
                <span className={`text-xs text-[#364257] ${todo.isCompleted ? 'text-gray-500' : ''}`}>
                  {assigneeInfo.name}
                </span>
              </div>
            ) : (
              <button
                onClick={() => setShowAssignmentModal(true)}
                disabled={todo.isCompleted}
                className={`flex items-center gap-1 text-xs text-[#364257] underline hover:text-[#A85C36] transition-colors ${
                  todo.isCompleted ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                title={todo.isCompleted ? 'Mark as incomplete to assign' : 'Assign to someone'}
              >
                <UserPlus size={12} />
                Assign
              </button>
            )}
          </div>
        </div>
        {/* Completed On field should be after the category/contact info block, as its own line */}
        {todo.isCompleted && todo.completedAt && (
          <p className="block text-xs text-[#364257] mt-2 italic">Completed On: {todo.completedAt.toLocaleDateString()} {todo.completedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
        )}
          </div>
      </div>
      </div>
    </div>

    {/* Assignment Modal */}
    <TodoAssignmentModal
      isOpen={showAssignmentModal}
      onClose={() => setShowAssignmentModal(false)}
      onAssign={handleAssignTodo}
      currentAssignee={assigneeInfo}
      contacts={contacts}
    />
    </>
  );
};

export default React.memo(UnifiedTodoItem); 