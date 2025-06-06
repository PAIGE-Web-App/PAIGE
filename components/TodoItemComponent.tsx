// components/TodoItemComponent.tsx
import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  CheckCircle, Circle, MoreHorizontal, Check, Copy, Trash2, MoveRight, Calendar, Clipboard, User as UserIcon, // Renamed User to UserIcon
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import CategoryPill from './CategoryPill';
import CategorySelectField from './CategorySelectField'; // Ensure this path is correct
import toast from 'react-hot-toast';
import { User } from 'firebase/auth'; // Import User type (this remains as is)

// Define necessary interfaces - these should match your TodoItem and Contact interfaces
// from RightDashboardPanel.tsx
interface TodoItem {
  id: string;
  name: string;
  deadline?: Date;
  note?: string;
  category?: string;
  contactId?: string;
  isCompleted: boolean;
  userId: string;
  createdAt: Date;
  orderIndex: number;
  listId: string;
  completedAt?: Date;
}

interface Contact {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  category: string;
  website?: string;
  avatarColor?: string;
  userId: string;
  orderIndex?: number;
}

interface TodoItemComponentProps {
  todo: TodoItem;
  contacts: Contact[];
  allCategories: string[];
  sortOption: 'myOrder' | 'date' | 'title';
  draggedTodoId: string | null;
  dragOverTodoId: string | null;
  dropIndicatorPosition: { id: string | null; position: 'top' | 'bottom' | null };
  currentUser: User; // Added currentUser prop
  handleToggleTodoComplete: (todo: TodoItem) => Promise<void>;
  handleUpdateTaskName: (todoId: string, newName: string) => Promise<void>;
  handleUpdateDeadline: (todoId: string, newDeadline: Date | null) => Promise<void>;
  handleUpdateNote: (todoId: string, newNote: string | null) => Promise<void>;
  handleUpdateCategory: (todoId: string, newCategory: string | null) => Promise<void>;
  handleCloneTodo: (todo: TodoItem) => Promise<void>;
  handleDeleteTodo: (todoId: string) => Promise<void>;
  setTaskToMove: (task: TodoItem) => void;
  setShowMoveTaskModal: (show: boolean) => void;
  handleDragStart: (e: React.DragEvent<HTMLDivElement>, id: string) => void;
  handleDragEnter: (e: React.DragEvent<HTMLDivElement>, id: string) => void;
  handleDragLeave: (e: React.DragEvent<HTMLDivElement>) => void;
  handleItemDragOver: (e: React.DragEvent<HTMLDivElement>, id: string) => void;
  handleDragEnd: (e: React.DragEvent<HTMLDivElement>) => void;
  className?: string; // ADD THIS LINE

}

const TodoItemComponent: React.FC<TodoItemComponentProps> = ({
  todo,
  contacts,
  allCategories,
  sortOption,
  draggedTodoId,
  dragOverTodoId,
  dropIndicatorPosition,
  currentUser, // Destructure currentUser
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
}) => {

  const [isEditingName, setIsEditingName] = useState(false);
  const [editingNameValue, setEditingNameValue] = useState(todo.name);
  const [isEditingDeadline, setIsEditingDeadline] = useState(false);
  const [editingDeadlineValue, setEditingDeadlineValue] = useState(todo.deadline ? todo.deadline.toISOString().slice(0, 16) : '');
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [editingNoteValue, setEditingNoteValue] = useState(todo.note || '');
  const [isEditingCategory, setIsEditingCategory] = useState(false);
  const [editingCategoryDropdownValue, setEditingCategoryDropdownValue] = useState(todo.category || '');
  const [editingCustomCategoryValue, setEditingCustomCategoryValue] = useState('');
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  const moreMenuRef = useRef<HTMLDivElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Debugging log: Check todo item properties when component renders
  useEffect(() => {
    if (todo.isCompleted) {
      console.log(`TodoItemComponent: Todo ID: ${todo.id}, isCompleted: ${todo.isCompleted}, completedAt: ${todo.completedAt}`);
      if (todo.completedAt && !(todo.completedAt instanceof Date)) {
        console.error(`TodoItemComponent: completedAt for ID ${todo.id} is not a Date object:`, todo.completedAt);
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
        await handleUpdateTaskName(todo.id, editingNameValue.trim());
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
    // Format the current deadline for the input if it exists
    if (todo.deadline) {
      const date = new Date(todo.deadline);
      const formattedDate = date.toISOString().slice(0, 16);
      setEditingDeadlineValue(formattedDate);
    } else {
      setEditingDeadlineValue('');
    }
  }, [todo.deadline, todo.isCompleted]);

  const handleDeadlineBlur = useCallback(async () => {
    let newDeadline: Date | null = null;
    if (editingDeadlineValue) {
      try {
        // Create a new Date object from the input value
        // The datetime-local input provides the value in ISO format (YYYY-MM-DDTHH:mm)
        const date = new Date(editingDeadlineValue);
        if (!isNaN(date.getTime())) {
          newDeadline = date;
          console.log('Saving deadline with time:', date.toLocaleTimeString());
        }
      } catch (error) {
        console.error('Date parsing error:', error);
        toast.error('Invalid date format');
        return;
      }
    }

    try {
      await handleUpdateDeadline(todo.id, newDeadline);
      setIsEditingDeadline(false);
      setEditingDeadlineValue('');
    } catch (error) {
      console.error('Error updating deadline:', error);
      toast.error('Failed to update deadline');
    }
  }, [editingDeadlineValue, todo.id, handleUpdateDeadline]);

  const handleCancelDeadline = useCallback(() => {
    setIsEditingDeadline(false);
    setEditingDeadlineValue('');
  }, []);

  const handleAddNoteClick = useCallback(() => {
    if (todo.isCompleted) return;
    setIsEditingNote(true);
    setEditingNoteValue(todo.note || '');
  }, [todo.note, todo.isCompleted]);

  const handleUpdateNoteClick = useCallback(async () => {
    await handleUpdateNote(todo.id, editingNoteValue.trim() || null);
    setIsEditingNote(false);
    setEditingNoteValue('');
  }, [editingNoteValue, todo.id, handleUpdateNote]);

  const handleCancelNote = useCallback(() => {
    setIsEditingNote(false);
    setEditingNoteValue('');
  }, []);

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
    if (e.target.value !== "Other") {
      setEditingCustomCategoryValue("");
    }
  }, []);

  const handleCustomCategoryInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setEditingCustomCategoryValue(e.target.value);
  }, []);

  const handleUpdateCategoryClick = useCallback(async () => {
    let finalCategory: string | null = editingCategoryDropdownValue;
    if (editingCategoryDropdownValue === "--remove--") {
      finalCategory = null;
    } else if (editingCategoryDropdownValue === "Other") {
      finalCategory = editingCustomCategoryValue.trim() || "";
      if (!finalCategory) {
        toast.error("Custom category name is required.");
        return;
      }
    }
    await handleUpdateCategory(todo.id, finalCategory);
    setIsEditingCategory(false);
    setEditingCategoryDropdownValue('');
    setEditingCustomCategoryValue('');
  }, [editingCategoryDropdownValue, editingCustomCategoryValue, todo.id, handleUpdateCategory]);

  const handleCancelCategory = useCallback(() => {
    setIsEditingCategory(false);
    setEditingCategoryDropdownValue('');
    setEditingCustomCategoryValue('');
  }, []);

  const handleMoveClick = useCallback(() => {
    setTaskToMove(todo);
    setShowMoveTaskModal(true);
    setShowMoreMenu(false); // Close the more menu
  }, [todo, setTaskToMove, setShowMoveTaskModal]);


  const getRelativeDeadline = (deadline: Date) => {
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

  return (
    <motion.div
      key={todo.id}
      id={`todo-item-${todo.id}`}
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      // APPLY THE CLASSNAME HERE:
      className={`relative flex items-start gap-1 py-3 border-b-[0.5px] border-[#AB9C95] ${sortOption === 'myOrder' ? 'cursor-grab' : ''} ${draggedTodoId === todo.id ? 'opacity-50 border-dashed border-2 border-[#A85C36]' : ''} ${dragOverTodoId === todo.id ? 'bg-[#EBE3DD]' : ''} ${className || ''}`}
      draggable={sortOption === 'myOrder'}
      // Only use native drag events, not framer-motion pointer events, to avoid type errors
      onDragStart={(e) => handleDragStart(e, todo.id)}
      onDragEnter={(e) => handleDragEnter(e, todo.id)}
      onDragLeave={handleDragLeave}
      onDragOver={(e) => handleItemDragOver(e, todo.id)}
      onDragEnd={handleDragEnd}
    >
      {/* Visual Drop Indicator */}
      {dropIndicatorPosition.id === todo.id && dropIndicatorPosition.position === 'top' && (
        <div className="absolute left-0 right-0 -top-0.5 h-0.5 bg-[#A85C36] z-10 rounded-full"></div>
      )}
      {dropIndicatorPosition.id === todo.id && dropIndicatorPosition.position === 'bottom' && (
        <div className="absolute left-0 right-0 -bottom-0.5 h-0.5 bg-[#A85C36] z-10 rounded-full"></div>
      )}

      {/* Checkbox */}
      <button onClick={() => handleToggleTodoComplete(todo)} className="flex-shrink-0 p-1 flex items-center justify-center" >
        {todo.isCompleted ? (
          <div className="w-3.5 h-3.5 rounded-full border-[1px] border-[#AEAEAE] bg-[#F3F2F0] flex items-center justify-center">
            <Check size={10} className="text-[#A85C36]" />
          </div>
        ) : (
          <div className="w-3.5 h-3.5 rounded-full border-[1px] border-[#AEAEAE] bg-[#F3F2F0]"></div>
        )}
      </button>

      {/* Task Content */}
      <div className="flex-1">
        {/* Conditional rendering for Task Name */}
        {isEditingName ? (
          <input
            ref={nameInputRef}
            type="text"
            value={editingNameValue}
            onChange={(e) => setEditingNameValue(e.target.value)}
            onBlur={handleNameBlur}
            onKeyDown={handleNameKeyDown}
            className="font-work text-xs font-medium text-[#332B42] border border-[#AB9C95] rounded-[3px] px-1 py-0.5 w-full"
            disabled={todo.isCompleted}
          />
        ) : (
          <p
            className={`font-work text-xs font-medium text-[#332B42] ${todo.isCompleted ? 'line-through text-gray-500' : ''} ${todo.isCompleted ? '' : 'cursor-pointer'}`}
            onDoubleClick={handleNameDoubleClick}
          >
            {todo.name}
          </p>
        )}

        {/* Conditional rendering for Deadline */}
        {isEditingDeadline ? (
          <div className="flex items-center gap-2 mt-1">
            <input
              type="datetime-local"
              value={editingDeadlineValue}
              onChange={(e) => setEditingDeadlineValue(e.target.value)}
              onBlur={handleDeadlineBlur}
              className="text-xs font-normal text-[#364257] border border-[#AB9C95] rounded-[3px] px-1 py-0.5 block"
              autoFocus
              disabled={todo.isCompleted}
            />
            <button onClick={handleCancelDeadline} className="btn-primary-inverse text-xs px-2 py-1" disabled={todo.isCompleted}>Cancel</button>
          </div>
        ) : todo.deadline ? (
          <p className={`text-xs font-normal text-[#364257] block mt-1 ${todo.isCompleted ? 'text-gray-500' : 'cursor-pointer hover:underline'}`} onClick={handleAddDeadlineClick}>
            Deadline: {todo.deadline.toLocaleDateString()} {todo.deadline.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        ) : (
          <button onClick={handleAddDeadlineClick} className={`text-xs font-normal text-[#364257] underline text-left p-0 bg-transparent border-none block mt-1 ${todo.isCompleted ? 'text-gray-500' : ''}`} disabled={todo.isCompleted}>Add Deadline</button>
        )}

        {/* Conditional rendering for Note */}
        {isEditingNote ? (
          <div className="flex flex-col gap-1 mt-1">
            <textarea
              value={editingNoteValue}
              onChange={(e) => setEditingNoteValue(e.target.value)}
              placeholder="Add a note..."
              rows={2}
              className="text-xs font-normal text-[#364257] border border-[#AB9C95] rounded-[3px] px-1 py-0.5 block w-full resize-y"
              autoFocus
              disabled={todo.isCompleted}
            />
            <div className="flex gap-2">
              <button onClick={handleUpdateNoteClick} className="btn-primary text-xs px-2 py-1" disabled={todo.isCompleted} > Update </button>
              <button onClick={handleCancelNote} className="btn-primary-inverse text-xs px-2 py-1" disabled={todo.isCompleted} > Cancel </button>
            </div>
          </div>
        ) : todo.note ? (
          <p
            className={`text-xs font-normal text-[#364257] italic block mt-1 w-full ${todo.isCompleted ? 'text-gray-500' : 'cursor-pointer hover:underline'}`}
            style={{ overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', whiteSpace: 'pre-wrap' }}
            onClick={handleAddNoteClick}
          >
            Note: {todo.note}
          </p>
        ) : (
          <button onClick={handleAddNoteClick} className={`text-xs font-normal text-[#364257] underline italic text-left p-0 bg-transparent border-none block mt-1 ${todo.isCompleted ? 'text-gray-500' : ''}`} disabled={todo.isCompleted} > Click to add note </button>
        )}

        <div className="flex items-center gap-1 mt-2">
          {/* Conditional rendering for Category */}
          {isEditingCategory ? (
            <div className="flex flex-col gap-1">
              <CategorySelectField
                userId={currentUser.uid} // Pass currentUser.uid
                value={editingCategoryDropdownValue} // Use 'value' prop
                customCategoryValue={editingCustomCategoryValue} // Pass custom value
                onChange={handleCategoryDropdownChange} // Use 'onChange' prop
                onCustomCategoryChange={handleCustomCategoryInputChange} // Pass custom change handler
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
                  disabled={todo.isCompleted}
                />
              )}
              <div className="flex gap-2 mt-1">
                <button onClick={handleUpdateCategoryClick} className="btn-primary text-xs px-2 py-1" disabled={todo.isCompleted} > Update </button>
                <button onClick={handleCancelCategory} className="btn-primary-inverse text-xs px-2 py-1" disabled={todo.isCompleted} > Cancel </button>
              </div>
            </div>
          ) : todo.category ? (
            <button onClick={handleEditCategoryClick} className={`text-xs font-normal text-[#364257] text-left p-0 bg-transparent border-none ${todo.isCompleted ? 'opacity-70 cursor-not-allowed' : ''}`} disabled={todo.isCompleted} >
              <CategoryPill category={todo.category} />
            </button>
          ) : (
            <button onClick={handleEditCategoryClick} className={`text-xs font-normal text-[#364257] underline text-left p-0 bg-transparent border-none ${todo.isCompleted ? 'text-gray-500' : ''}`} disabled={todo.isCompleted} > Add Category </button>
          )}

          {/* Contact information */}
          {todo.contactId && (
            <span className={`text-xs text-[#364257] ${todo.isCompleted ? 'text-gray-500' : ''}`}>
              {contacts.find(c => c.id === todo.contactId)?.name || 'N/A'}
            </span>
          )}
        </div>
      </div>

      {/* Three-dot menu */}
      <div className="relative flex-shrink-0" ref={moreMenuRef}>
        <button
          onClick={handleToggleMenu}
          className={`flex-shrink-0 p-1 text-[#7A7A7A] more-horizontal-button ${todo.isCompleted ? 'opacity-70 cursor-not-allowed' : 'hover:text-[#332B42]'}`}
          disabled={todo.isCompleted}
        >
          <MoreHorizontal size={18} />
        </button>
        <AnimatePresence>
          {showMoreMenu && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="absolute right-0 mt-2 w-40 bg-white border border-[#AB9C95] rounded-[5px] shadow-lg z-20 flex flex-col"
            >
              <button onClick={() => { handleCloneTodo(todo); setShowMoreMenu(false); }} className="flex items-center gap-2 px-3 py-2 text-sm text-[#332B42] hover:bg-[#F3F2F0] rounded-t-[5px]" disabled={todo.isCompleted} >
                <Copy size={16} /> Clone
              </button>
              <button onClick={handleMoveClick} className="flex items-center gap-2 px-3 py-2 text-sm text-[#332B42] hover:bg-[#F3F2F0]" disabled={todo.isCompleted} >
                <MoveRight size={16} /> Move
              </button>
              <button onClick={() => { handleDeleteTodo(todo.id); setShowMoreMenu(false); }} className="flex items-center gap-2 px-3 py-2 text-sm text-[#E5484D] hover:bg-[#FBE9E9] rounded-b-[5px]" disabled={todo.isCompleted} >
                <Trash2 size={16} /> Delete
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default TodoItemComponent;
