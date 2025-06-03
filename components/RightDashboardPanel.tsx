// components/RightDashboardPanel.tsx
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  doc,
  setDoc,
  deleteDoc, // Import deleteDoc
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { User } from 'firebase/auth';
import toast from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid';
import Link from 'next/link';
import { CheckCircle, Circle, MoreHorizontal, MessageSquare, Heart, ClipboardList, Check, Copy, Trash2 } from 'lucide-react'; // Import Copy and Trash2
import CategoryPill from './CategoryPill';
import CategorySelectField from './CategorySelectField';
import { getAllCategories, saveCategoryIfNew } from '../lib/firebaseCategories';
import { AnimatePresence, motion } from 'framer-motion';

// Define necessary interfaces (can be moved to a types file if preferred)
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

interface RightDashboardPanelProps {
  currentUser: User;
  contacts: Contact[]; // Pass contacts down for linking todo items
}

const RightDashboardPanel: React.FC<RightDashboardPanelProps> = ({ currentUser, contacts }) => {
  const todoItemsCollection = collection(db, 'todoItems');

  const [rightPanelSelection, setRightPanelSelection] = useState<'todo' | 'messages' | 'favorites'>('todo');
  const [todoItems, setTodoItems] = useState<TodoItem[]>([]);
  const [selectedTodoSubCategory, setSelectedTodoSubCategory] = useState<'all' | 'shared' | 'my'>('all');
  const [editingDeadlineId, setEditingDeadlineId] = useState<string | null>(null);
  const [editingDeadlineValue, setEditingDeadlineValue] = useState<string | null>(null);

  // New states for note editing
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteValue, setEditingNoteValue] = useState<string | null>(null);

  // New states for category editing
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCategoryValue, setEditingCategoryValue] = useState<string | null>(null);
  const [editingCustomCategoryValue, setEditingCustomCategoryValue] = useState<string | null>(null);
  const [allCategories, setAllCategories] = useState<string[]>([]);

  // State for the "New Task" dropdown
  const [showAddTaskDropdown, setShowAddTaskDropdown] = useState(false);
  const addTaskDropdownRef = useRef<HTMLDivElement>(null);

  // States for editing task name
  const [editingTaskNameId, setEditingTaskNameId] = useState<string | null>(null);
  const [editingTaskNameValue, setEditingTaskNameValue] = useState<string | null>(null);

  // State for the open three-dot menu
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);


  // Fetch all categories for the dropdown
  useEffect(() => {
    if (currentUser) {
      const fetchCategories = async () => {
        const categories = await getAllCategories(currentUser.uid);
        setAllCategories(categories);
      };
      fetchCategories();
    }
  }, [currentUser]);

  // Effect to fetch To-Do items
  useEffect(() => {
    let unsubscribeTodoItems: () => void;
    if (currentUser && rightPanelSelection === 'todo') {
      const q = query(
        todoItemsCollection,
        where('userId', '==', currentUser.uid),
        orderBy('createdAt', 'asc')
      );

      unsubscribeTodoItems = onSnapshot(q, (snapshot) => {
        const fetchedTodoItems: TodoItem[] = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            name: data.name,
            deadline: data.deadline?.toDate(), // Convert Firestore Timestamp to Date
            note: data.note,
            category: data.category,
            contactId: data.contactId,
            isCompleted: data.isCompleted,
            userId: data.userId,
            createdAt: data.createdAt.toDate(),
          };
        });
        setTodoItems(fetchedTodoItems);
      }, (error) => {
        console.error('Error fetching To-Do items:', error);
        toast.error('Failed to load To-Do items.');
      });
    } else {
      setTodoItems([]);
    }
    return () => {
      if (unsubscribeTodoItems) {
        unsubscribeTodoItems();
      }
    };
  }, [currentUser, rightPanelSelection]);

  // Effect to close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Close "New Task" dropdown
      if (addTaskDropdownRef.current && !addTaskDropdownRef.current.contains(event.target as Node)) {
        setShowAddTaskDropdown(false);
      }

      // Close "MoreHorizontal" menu if open and click is outside
      const clickedElement = event.target as HTMLElement;
      if (
        openMenuId !== null &&
        !clickedElement.closest('.todo-item-menu-container') && // Check if click is inside the menu container
        !clickedElement.closest('.more-horizontal-button') // Check if click is on the MoreHorizontal button itself
      ) {
        setOpenMenuId(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showAddTaskDropdown, openMenuId]);

  // Function to handle adding a new To-Do item
  const handleAddNewTodo = async () => {
    if (!currentUser) {
      toast.error('You must be logged in to add a To-Do item.');
      return;
    }
    const newTodo: TodoItem = {
      id: uuidv4(),
      name: 'New To-do Item (Click to Edit)',
      isCompleted: false,
      userId: currentUser.uid,
      createdAt: new Date(),
    };

    try {
      await addDoc(todoItemsCollection, {
        ...newTodo,
        createdAt: newTodo.createdAt, // Store as Firestore Timestamp
      });
      toast.success('New To-do item added!');
    } catch (error: any) {
      console.error('Error adding To-do item:', error);
      toast.error(`Failed to add To-do item: ${error.message}`);
    } finally {
      setShowAddTaskDropdown(false); // Close dropdown after adding
    }
  };

  // Function to toggle To-Do item completion
  const handleToggleTodoComplete = async (todo: TodoItem) => {
    try {
      const todoRef = doc(db, 'todoItems', todo.id);
      await setDoc(todoRef, { isCompleted: !todo.isCompleted }, { merge: true });
      toast.success(`To-do item marked as ${todo.isCompleted ? 'incomplete' : 'complete'}!`);
    } catch (error: any) {
      console.error('Error toggling To-Do item completion:', error);
      toast.error(`Failed to update To-Do item: ${error.message}`);
    }
  };

  // Function to handle showing the deadline input
  const handleAddDeadline = (todo: TodoItem) => {
    if (todo.isCompleted) return; // Prevent editing if completed
    setEditingDeadlineId(todo.id);
    setEditingDeadlineValue(todo.deadline ? todo.deadline.toISOString().slice(0, 16) : '');
  };

  // Function to handle updating the deadline
  const handleUpdateDeadline = async (todoId: string) => {
    let newDeadline: Date | null = null;

    if (editingDeadlineValue) {
      const date = new Date(editingDeadlineValue);
      if (!isNaN(date.getTime())) {
        newDeadline = date;
      } else {
        toast.error('Invalid date or time format.');
        return;
      }
    }

    try {
      const todoRef = doc(db, 'todoItems', todoId);
      await setDoc(todoRef, { deadline: newDeadline }, { merge: true });
      toast.success('Deadline updated!');
    } catch (error: any) {
      console.error('Error updating deadline:', error);
      toast.error(`Failed to update deadline: ${error.message}`);
    } finally {
      setEditingDeadlineId(null);
      setEditingDeadlineValue(null);
    }
  };

  // Function to handle canceling deadline edit
  const handleCancelDeadline = () => {
    setEditingDeadlineId(null);
    setEditingDeadlineValue(null);
  };

  // Functions for note editing
  const handleAddNote = (todo: TodoItem) => {
    if (todo.isCompleted) return; // Prevent editing if completed
    setEditingNoteId(todo.id);
    setEditingNoteValue(todo.note || '');
  };

  const handleUpdateNote = async (todoId: string) => {
    if (!currentUser) {
      toast.error('User not authenticated.');
      return;
    }

    try {
      const todoRef = doc(db, 'todoItems', todoId);
      await setDoc(todoRef, { note: editingNoteValue?.trim() || null }, { merge: true });
      toast.success(`Note ${editingNoteValue?.trim() ? 'updated' : 'removed'}!`);
    } catch (error: any) {
      console.error('Error updating note:', error);
      toast.error(`Failed to update note: ${error.message}`);
    } finally {
      setEditingNoteId(null);
      setEditingNoteValue(null);
    }
  };

  const handleCancelNote = () => {
    setEditingNoteId(null);
    setEditingNoteValue(null);
  };

  // New functions for category editing
  const handleEditCategory = (todo: TodoItem) => {
    if (todo.isCompleted) return; // Prevent editing if completed
    setEditingCategoryId(todo.id);
    setEditingCategoryValue(todo.category || '');
    // If the category is not a default one, assume it's a custom one
    const defaultCategories = ["Photographer", "Caterer", "Florist", "DJ", "Venue", "Wedding Planner", "Officiant", "Baker", "Dress Shop", "Suit/Tux Rental", "Hair Stylist", "Makeup Artist", "Musician", "Stationery", "Transportation", "Rentals", "Favors", "Jeweler", "Videographer"];
    if (todo.category && !defaultCategories.includes(todo.category) && allCategories.includes(todo.category)) {
      setEditingCategoryValue("Other"); // Set dropdown to "Other"
      setEditingCustomCategoryValue(todo.category); // Set custom input value
    } else {
      setEditingCustomCategoryValue("");
    }
  };

  const handleCategoryDropdownChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setEditingCategoryValue(e.target.value);
    if (e.target.value !== "Other") {
      setEditingCustomCategoryValue(""); // Clear custom category if not "Other"
    }
  }, []);

  const handleCustomCategoryInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setEditingCustomCategoryValue(e.target.value);
  }, []);

  const handleUpdateCategory = async (todoId: string) => {
    if (!currentUser) {
      toast.error('User not authenticated.');
      return;
    }

    let finalCategory: string | null = editingCategoryValue;

    if (editingCategoryValue === "--remove--") {
      finalCategory = null; // Set to null to remove the category
    } else if (editingCategoryValue === "Other") {
      finalCategory = editingCustomCategoryValue?.trim() || "";
      if (!finalCategory) {
        toast.error("Custom category name is required.");
        return;
      }
      await saveCategoryIfNew(finalCategory, currentUser.uid); // Save new custom category
    }

    try {
      const todoRef = doc(db, 'todoItems', todoId);
      await setDoc(todoRef, { category: finalCategory }, { merge: true }); // Use finalCategory directly
      toast.success(`Category ${finalCategory ? 'updated' : 'removed'}!`);
    } catch (error: any) {
      console.error('Error updating category:', error);
      toast.error(`Failed to update category: ${error.message}`);
    } finally {
      setEditingCategoryId(null);
      setEditingCategoryValue(null);
      setEditingCustomCategoryValue(null);
    }
  };

  const handleCancelCategory = () => {
    setEditingCategoryId(null);
    setEditingCategoryValue(null);
    setEditingCustomCategoryValue(null);
  };

  // Function to handle updating the task name
  const handleUpdateTaskName = async (todoId: string) => {
    if (!currentUser) {
      toast.error('User not authenticated.');
      return;
    }
    const trimmedName = editingTaskNameValue?.trim();
    if (!trimmedName) {
      toast.error('Task name cannot be empty.');
      // Revert to original name if empty
      const originalTodo = todoItems.find(item => item.id === todoId);
      if (originalTodo) {
        setEditingTaskNameValue(originalTodo.name);
      }
      setEditingTaskNameId(null);
      return;
    }
    try {
      const todoRef = doc(db, 'todoItems', todoId);
      await setDoc(todoRef, { name: trimmedName }, { merge: true });
      toast.success('Task name updated!');
    } catch (error: any) {
      console.error('Error updating task name:', error);
      toast.error(`Failed to update task name: ${error.message}`);
    } finally {
      setEditingTaskNameId(null);
      setEditingTaskNameValue(null);
    }
  };

  // Function to clone a To-Do item
  const handleCloneTodo = async (todo: TodoItem) => {
    if (!currentUser) {
      toast.error('You must be logged in to clone a To-Do item.');
      return;
    }

    // Calculate a new createdAt date that is slightly after the original todo's createdAt
    // This ensures the cloned item appears directly below the original when sorted by createdAt
    const newCreatedAt = new Date(todo.createdAt.getTime() + 1); // Add 1 millisecond

    const clonedTodo: Omit<TodoItem, 'id'> = { // Omit 'id' as it will be generated by addDoc
      name: `Clone of ${todo.name}`,
      deadline: todo.deadline || null, // Convert undefined to null
      note: todo.note || null,         // Convert undefined to null
      category: todo.category || null, // Convert undefined to null
      contactId: todo.contactId || null, // Convert undefined to null
      isCompleted: false, // Cloned items are not completed
      userId: currentUser.uid,
      createdAt: newCreatedAt, // Use the new calculated creation date
    };

    try {
      await addDoc(todoItemsCollection, {
        ...clonedTodo,
        createdAt: clonedTodo.createdAt,
      });
      toast.success('To-do item cloned successfully!');
    } catch (error: any) {
      console.error('Error cloning To-do item:', error);
      toast.error(`Failed to clone To-do item: ${error.message}`);
    } finally {
      setOpenMenuId(null); // Close menu after action
    }
  };

  // Function to delete a To-Do item
  const handleDeleteTodo = async (todoId: string) => {
    if (!currentUser) {
      toast.error('You must be logged in to delete a To-Do item.');
      return;
    }
    try {
      await deleteDoc(doc(db, 'todoItems', todoId));
      toast.success('To-do item deleted successfully!');
    } catch (error: any) {
      console.error('Error deleting To-do item:', error);
      toast.error(`Failed to delete To-do item: ${error.message}`);
    } finally {
      setOpenMenuId(null); // Close menu after action
    }
  };


  // Filtered To-Do items based on selectedTodoSubCategory
  const filteredTodoItems = useMemo(() => {
    if (selectedTodoSubCategory === 'all') {
      return todoItems;
    }
    // Placeholder for 'shared' and 'my' logic - currently returns empty for simplicity
    // You would implement actual filtering based on 'shared' or 'my' properties on TodoItem
    return [];
  }, [todoItems, selectedTodoSubCategory]);

  return (
    <div
      className="hidden md:flex flex-row w-1/4 rounded-[5px] border border-[#AB9C95] overflow-hidden"
      style={{ maxHeight: '100%' }}
    >
      {/* Vertical Navigation (Icons) - Main Panel Switcher - Left Column of Right Panel */}
      <div className="flex flex-col bg-[#F3F2F0] p-2 border-r border-[#AB9C95] space-y-2">
        <button
          onClick={() => setRightPanelSelection('todo')}
          className={`p-2 rounded-[5px] transition-colors flex items-center justify-center
            ${rightPanelSelection === 'todo' ? 'bg-[#EBE3DD] text-[#A85C36]' : 'text-[#332B42] hover:bg-[#E0DBD7'}
          `}
          title="To-do Items"
        >
          <ClipboardList className="w-5 h-5" />
        </button>
        <button
          onClick={() => setRightPanelSelection('messages')}
          className={`p-2 rounded-[5px] transition-colors flex items-center justify-center
            ${rightPanelSelection === 'messages' ? 'bg-[#EBE3DD] text-[#A85C36]' : 'text-[#332B42] hover:bg-[#E0DBD7'}
          `}
          title="Messages (Wedding Planner)"
        >
          <MessageSquare className="w-5 h-5" />
        </button>
        <button
          onClick={() => setRightPanelSelection('favorites')}
          className={`p-2 rounded-[5px] transition-colors flex items-center justify-center
            ${rightPanelSelection === 'favorites' ? 'bg-[#EBE3DD] text-[#A85C36]' : 'text-[#332B42] hover:bg-[#E0DBD7'}
          `}
          title="Favorites (Vendors)"
        >
          <Heart className="w-5 h-5" />
        </button>
      </div>

      {/* Content Area for Right Panel - Right Column of Right Panel */}
      <aside
        className="flex-1 bg-[#DEDBDB] p-3 overflow-y-auto"
        style={{ maxHeight: '100%' }}
      >
        {/* Conditional Content based on rightPanelSelection */}
        {rightPanelSelection === 'todo' && (
          <div className="flex flex-col h-full">
            {/* Wrapper div for the header and tabs with the desired background color */}
            <div className="bg-[#F3F2F0] rounded-t-[5px] -mx-4 -mt-4 border-b border-[#AB9C95]">
              <div className="flex justify-between items-center px-4 pt-4 mb-2">
                <div className="flex items-center gap-2">
                  <h3 className="font-playfair text-base font-medium text-[#332B42]">To-do Items</h3>
                  <Link href="/todo" className="text-xs text-[#364257] hover:text-[#A85C36] font-medium no-underline">
                    View all
                  </Link>
                </div>
                {/* New Task Button with Dropdown */}
                <div className="relative" ref={addTaskDropdownRef}>
                  <button
                    onClick={() => setShowAddTaskDropdown(!showAddTaskDropdown)}
                    className="text-xs text-[#332B42] border border-[#AB9C95] rounded-[5px] px-2 py-1 hover:bg-[#F3F2F0]"
                  >
                    + New Task
                  </button>
                  <AnimatePresence>
                    {showAddTaskDropdown && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        className="absolute top-full right-0 mt-2 p-2 bg-white border border-[#AB9C95] rounded-[5px] shadow-lg z-10 flex flex-col min-w-[180px]"
                      >
                        <button
                          onClick={handleAddNewTodo}
                          className="w-full text-left px-3 py-2 text-sm text-[#332B42] hover:bg-[#F3F2F0] rounded-[3px]"
                        >
                          Add Individual Task
                        </button>
                        <button
                          onClick={() => {
                            toast.info("CSV upload functionality coming soon!");
                            setShowAddTaskDropdown(false);
                          }}
                          className="w-full text-left px-3 py-2 text-sm text-[#332B42] hover:bg-[#F3F2F0] rounded-[3px]"
                        >
                          Upload Tasks (CSV)
                        </button>
                        <button
                          onClick={() => {
                            toast.info("AI template generation coming soon!");
                            setShowAddTaskDropdown(false);
                          }}
                          className="w-full text-left px-3 py-2 text-sm text-[#332B42] hover:bg-[#F3F2F0] rounded-[3px]"
                        >
                          Generate from Template (AI)
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
              {/* Tabs container - removed border-b from here as it's now on active button */}
              <div className="flex border-b border-[#AB9C95] px-4">
                <button
                  onClick={() => setSelectedTodoSubCategory('all')}
                  className={`flex-1 text-center py-2 transition-colors
                    ${selectedTodoSubCategory === 'all'
                      ? 'text-[#A85C36] border-b-[3px] border-[#A85C36] font-medium text-xs'
                      : 'text-[#332B42] hover:bg-[#E0DBD7] text-xs font-normal'
                    }`}
                >
                  All To-do
                </button>
                <button
                  onClick={() => setSelectedTodoSubCategory('shared')}
                  className={`flex-1 text-center py-2 transition-colors
                    ${selectedTodoSubCategory === 'shared'
                      ? 'text-[#A85C36] border-b-[3px] border-[#A85C36] font-medium text-xs'
                      : 'text-[#332B42] hover:bg-[#E0DBD7] text-xs font-normal'
                    }`}
                >
                  Shared To-do
                </button>
                <button
                  onClick={() => setSelectedTodoSubCategory('my')}
                  className={`flex-1 text-center py-2 transition-colors
                    ${selectedTodoSubCategory === 'my'
                      ? 'text-[#A85C36] border-b-[3px] border-[#A85C36] font-medium text-xs'
                      : 'text-[#332B42] hover:bg-[#E0DBD7] text-xs font-normal'
                    }`}
                >
                  My To-do
                </button>
              </div>
            </div>

            {/* Removed p-3 from this container. Individual tasks will have their own padding and border. */}
            <div className="flex-1 overflow-y-auto">
              {filteredTodoItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center text-gray-500 text-sm py-8">
                  <img src="/To_Do_Items.png" alt="Empty To-do List" className="w-24 h-24 mb-4 opacity-70" />
                  <p>Add a To-do item</p>
                </div>
              ) : (
                <div className="space-y-0">
                  <AnimatePresence initial={false}> {/* initial={false} prevents exit animations on initial render */}
                    {filteredTodoItems.map((todo) => (
                      <motion.div
                        key={todo.id}
                        layout // Enables smooth layout transitions (position changes)
                        initial={{ opacity: 0, y: 50 }} // Start from below and faded out
                        animate={{ opacity: 1, y: 0 }} // Animate to normal position and full opacity
                        exit={{ opacity: 0, y: 50 }} // Animate out by sliding down and fading out
                        transition={{ duration: 0.3, ease: "easeOut" }} // Smooth transition
                        className="flex items-start gap-1 py-3 border-b-[0.5px] border-[#AB9C95]" // Changed items-center to items-start for top alignment
                      >
                        <button
                          onClick={() => handleToggleTodoComplete(todo)}
                          className="flex-shrink-0 p-1 flex items-center justify-center"
                        >
                          {todo.isCompleted ? (
                            <div className="w-3.5 h-3.5 rounded-full border-[1px] border-[#AEAEAE] bg-[#F3F2F0] flex items-center justify-center">
                              <Check size={10} className="text-[#A85C36]" />
                            </div>
                          ) : (
                            <div className="w-3.5 h-3.5 rounded-full border-[1px] border-[#AEAEAE] bg-[#F3F2F0]"></div>
                          )}
                        </button>
                        <div className="flex-1">
                          {/* Conditional rendering for Task Name */}
                          {editingTaskNameId === todo.id ? (
                            <input
                              type="text"
                              value={editingTaskNameValue || ''}
                              onChange={(e) => setEditingTaskNameValue(e.target.value)}
                              onBlur={() => handleUpdateTaskName(todo.id)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleUpdateTaskName(todo.id);
                                  e.currentTarget.blur(); // Remove focus from the input
                                }
                              }}
                              className="font-work text-xs font-medium text-[#332B42] border border-[#AB9C95] rounded-[3px] px-1 py-0.5 w-full"
                              autoFocus
                              disabled={todo.isCompleted} // Disable if completed
                            />
                          ) : (
                            <p
                              className={`font-work text-xs font-medium text-[#332B42] ${todo.isCompleted ? 'line-through text-gray-500' : ''} ${todo.isCompleted ? '' : 'cursor-pointer'}`}
                              onClick={todo.isCompleted ? undefined : () => { // Prevent editing if completed
                                setEditingTaskNameId(todo.id);
                                setEditingTaskNameValue(todo.name);
                              }}
                            >
                              {todo.name}
                            </p>
                          )}

                          {/* Conditional rendering for Deadline */}
                          {editingDeadlineId === todo.id ? (
                            <div className="flex items-center gap-2 mt-1">
                              <input
                                type="datetime-local"
                                value={editingDeadlineValue || ''}
                                onChange={(e) => setEditingDeadlineValue(e.target.value)}
                                className="text-xs font-normal text-[#364257] border border-[#AB9C95] rounded-[3px] px-1 py-0.5 block"
                                autoFocus
                                disabled={todo.isCompleted} // Disable if completed
                              />
                              <button
                                onClick={() => handleUpdateDeadline(todo.id)}
                                className="btn-primary text-xs px-2 py-1"
                                disabled={todo.isCompleted} // Disable if completed
                              >
                                Update
                              </button>
                              <button
                                onClick={handleCancelDeadline}
                                className="btn-primary-inverse text-xs px-2 py-1"
                                disabled={todo.isCompleted} // Disable if completed
                              >
                                Cancel
                              </button>
                            </div>
                          ) : todo.deadline ? (
                            <p className={`text-xs font-normal text-[#364257] block mt-1 ${todo.isCompleted ? 'text-gray-500' : 'cursor-pointer hover:underline'}`} onClick={() => handleAddDeadline(todo)}>
                              Deadline: {todo.deadline.toLocaleDateString()} {todo.deadline.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          ) : (
                            <button
                              onClick={() => handleAddDeadline(todo)}
                              className={`text-xs font-normal text-[#364257] underline text-left p-0 bg-transparent border-none block mt-1 ${todo.isCompleted ? 'text-gray-500' : ''}`}
                              disabled={todo.isCompleted} // Disable if completed
                            >
                              Add Deadline
                            </button>
                          )}
                          {/* Conditional rendering for Note */}
                          {editingNoteId === todo.id ? (
                            <div className="flex flex-col gap-1 mt-1">
                              <textarea
                                value={editingNoteValue || ''}
                                onChange={(e) => setEditingNoteValue(e.target.value)}
                                placeholder="Add a note..."
                                rows={2}
                                className="text-xs font-normal text-[#364257] border border-[#AB9C95] rounded-[3px] px-1 py-0.5 block w-full resize-y"
                                autoFocus
                                disabled={todo.isCompleted} // Disable if completed
                              />
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleUpdateNote(todo.id)}
                                  className="btn-primary text-xs px-2 py-1"
                                  disabled={todo.isCompleted} // Disable if completed
                                >
                                  Update
                                </button>
                                <button
                                  onClick={handleCancelNote}
                                  className="btn-primary-inverse text-xs px-2 py-1"
                                  disabled={todo.isCompleted} // Disable if completed
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : todo.note ? (
                            <p
                              className={`text-xs font-normal text-[#364257] italic block mt-1 w-full ${todo.isCompleted ? 'text-gray-500' : 'cursor-pointer hover:underline'}`}
                              style={{
                                overflow: 'hidden',
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                whiteSpace: 'pre-wrap' // Ensure wrapping for long text
                              }}
                              onClick={() => handleAddNote(todo)}
                            >
                              Note: {todo.note}
                            </p>
                          ) : (
                            <button
                              onClick={() => handleAddNote(todo)}
                              className={`text-xs font-normal text-[#364257] underline italic text-left p-0 bg-transparent border-none block mt-1 ${todo.isCompleted ? 'text-gray-500' : ''}`}
                              disabled={todo.isCompleted} // Disable if completed
                            >
                              Click to add note
                            </button>
                          )}
                          <div className="flex items-center gap-1 mt-2">
                            {/* Conditional rendering for Category */}
                            {editingCategoryId === todo.id && currentUser ? (
                              <div className="flex flex-col gap-1 w-full">
                                <CategorySelectField
                                  userId={currentUser.uid}
                                  value={editingCategoryValue || ''}
                                  customCategoryValue={editingCustomCategoryValue || ''}
                                  onChange={handleCategoryDropdownChange}
                                  onCustomCategoryChange={handleCustomCategoryInputChange}
                                  label="" // Label is not needed here as it's inline
                                  placeholder="Select Category"
                                  allowRemoval={true} // Allow removing category
                                  disabled={todo.isCompleted} // Disable if completed
                                />
                                {editingCategoryValue === "Other" && (
                                  <input
                                    type="text"
                                    value={editingCustomCategoryValue || ''}
                                    onChange={handleCustomCategoryInputChange}
                                    placeholder="Enter custom category"
                                    className="text-xs font-normal text-[#364257] border border-[#AB9C95] rounded-[3px] px-1 py-0.5 block mt-1"
                                    disabled={todo.isCompleted} // Disable if completed
                                  />
                                )}
                                <div className="flex gap-2 mt-1">
                                  <button
                                    onClick={() => handleUpdateCategory(todo.id)}
                                    className="btn-primary text-xs px-2 py-1"
                                    disabled={todo.isCompleted} // Disable if completed
                                  >
                                    Update
                                  </button>
                                  <button
                                    onClick={handleCancelCategory}
                                    className="btn-primary-inverse text-xs px-2 py-1"
                                    disabled={todo.isCompleted} // Disable if completed
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : todo.category ? (
                              <button
                                onClick={() => handleEditCategory(todo)} // Make the pill clickable
                                className={`text-xs font-normal text-[#364257] text-left p-0 bg-transparent border-none ${todo.isCompleted ? 'opacity-70 cursor-not-allowed' : ''}`}
                                disabled={todo.isCompleted} // Disable if completed
                              >
                                <CategoryPill category={todo.category} />
                              </button>
                            ) : (
                              <button
                                onClick={() => handleEditCategory(todo)}
                                className={`text-xs font-normal text-[#364257] underline text-left p-0 bg-transparent border-none ${todo.isCompleted ? 'opacity-70 cursor-not-allowed' : ''}`}
                                disabled={todo.isCompleted} // Disable if completed
                              >
                                Add Category
                              </button>
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
                        <div className="relative flex-shrink-0 todo-item-menu-container">
                          <button
                            onClick={(e) => {
                              e.stopPropagation(); // Prevent event bubbling that might close the menu immediately
                              setOpenMenuId(openMenuId === todo.id ? null : todo.id);
                            }}
                            className={`flex-shrink-0 p-1 text-[#7A7A7A] more-horizontal-button ${todo.isCompleted ? 'opacity-70 cursor-not-allowed' : 'hover:text-[#332B42]'}`}
                            disabled={todo.isCompleted}
                          >
                            <MoreHorizontal size={18} />
                          </button>
                          <AnimatePresence>
                            {openMenuId === todo.id && (
                              <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.2 }}
                                className="absolute right-0 mt-2 w-40 bg-white border border-[#AB9C95] rounded-[5px] shadow-lg z-20 flex flex-col"
                              >
                                <button
                                  onClick={() => handleCloneTodo(todo)}
                                  className="flex items-center gap-2 px-3 py-2 text-sm text-[#332B42] hover:bg-[#F3F2F0] rounded-t-[3px]"
                                >
                                  <Copy size={16} /> Clone
                                </button>
                                <button
                                  onClick={() => handleDeleteTodo(todo.id)}
                                  className="flex items-center gap-2 px-3 py-2 text-sm text-[#D63030] hover:bg-[#F3F2F0] rounded-b-[3px]"
                                >
                                  <Trash2 size={16} /> Delete
                                </button>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </div>
        )}

        {rightPanelSelection === 'messages' && (
          <div className="text-sm text-gray-500 text-center py-8">
            Messages with Wedding Planner (Coming Soon!)
          </div>
        )}

        {rightPanelSelection === 'favorites' && (
          <div className="text-sm text-gray-500 text-center py-8">
            Favorited Vendors (Coming Soon!)
          </div>
        )}
      </aside>
    </div>
  );
};

export default RightDashboardPanel;
