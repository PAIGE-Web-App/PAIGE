'use client'; 

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
  updateDoc,
  deleteDoc,
  writeBatch,
  getDocs,
} from 'firebase/firestore';
import { db, getUserCollectionRef } from '@/lib/firebase';
import { User } from 'firebase/auth';
import toast from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid';
import Link from 'next/link';
import {
  CheckCircle, Circle, MoreHorizontal, MessageSquare, Heart, ClipboardList, Check, Copy, Trash2, ListFilter, Plus, MoveRight,
  ChevronDown, ChevronUp, X, CircleCheck
} from 'lucide-react'; // Added X for banner dismiss
import CategoryPill from './CategoryPill';
import CategorySelectField from './CategorySelectField';
import { getAllCategories, saveCategoryIfNew } from '../lib/firebaseCategories';
import { AnimatePresence, motion } from 'framer-motion';
import MoveTaskModal from './MoveTaskModal';
import TodoItemComponent from './TodoItemComponent';
import ListMenuDropdown from './ListMenuDropdown';
import DeleteListConfirmationModal from './DeleteListConfirmationModal';
import UpgradePlanModal from './UpgradePlanModal';
import { useRouter } from 'next/navigation';
import type { TodoItem, TodoList } from '../types/todo';
import { Contact } from "../types/contact";
import ToDoPanel from './ToDoPanel';
import MainTodoItemComponent from './MainTodoItemComponent';
// import Banner from './Banner'; // Commented out as we're including it directly for demonstration

// Add parseLocalDateTime utility function at the top of the file, after imports
function parseLocalDateTime(input: string): Date {
  if (typeof input !== 'string') return new Date(NaN);
  const [datePart, timePart] = input.split('T');
  const [year, month, day] = datePart.split('-').map(Number);
  const [hour = 17, minute = 0] = (timePart ? timePart.split(':').map(Number) : [17, 0]);
  // Always create a local date
  return new Date(year, month - 1, day, hour, minute, 0, 0);
}

// Define necessary interfaces
interface RightDashboardPanelProps {
  currentUser: User;
  contacts: Contact[];
  isMobile: boolean;
  rightPanelSelection: 'todo' | 'messages' | 'favorites'; // Now a prop
  setRightPanelSelection: React.Dispatch<React.SetStateAction<'todo' | 'messages' | 'favorites'>>; // Add setter prop
  activeMobileTab: 'contacts' | 'messages' | 'todo'; // This prop is used for internal logic related to mobile layout
  onUpdateTodoDeadline: (todoId: string, deadline: string | null) => Promise<void>;
  onUpdateTodoNotes: (todoId: string, notes: string) => Promise<void>;
  onUpdateTodoCategory: (todoId: string, category: string) => Promise<void>;
}

// Helper function to reorder an array
const reorder = (list: TodoItem[], startIndex: number, endIndex: number): TodoItem[] => {
  const result = Array.from(list);
  const [removed] = result.splice(startIndex, 1);
  result.splice(endIndex, 0, removed);
  return result;
};

// Define the maximum number of lists for a "Starter" tier user
const STARTER_TIER_MAX_LISTS = 3;

// Basic Banner component (for demonstration, in a real app this would be in its own file)
interface BannerProps {
  message: React.ReactNode; // Changed to React.ReactNode to allow clickable elements
  type: 'info' | 'warning' | 'error';
  onDismiss?: () => void;
}

const Banner: React.FC<BannerProps> = ({ message, type, onDismiss }) => {
  const bgColor = type === 'info' ? 'bg-blue-100' : type === 'warning' ? 'bg-yellow-100' : 'bg-red-100';
  const textColor = type === 'info' ? 'text-blue-800' : type === 'warning' ? 'text-yellow-800' : 'text-red-800';

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className={`relative ${bgColor} ${textColor} p-2 text-sm rounded-[5px] flex items-center justify-between mx-4 my-2`}
    >
      <p className="flex-1">{message}</p>
      {onDismiss && (
        <button onClick={onDismiss} className="ml-4 p-1 rounded-full hover:bg-opacity-75">
          <X size={16} />
        </button>
      )}
    </motion.div>
  );
};

const calendarStyles = `
  .rbc-event {
    border: none !important;
  }
`;

const RightDashboardPanel: React.FC<RightDashboardPanelProps> = ({ currentUser, contacts, isMobile, activeMobileTab, onUpdateTodoDeadline, onUpdateTodoNotes, onUpdateTodoCategory }) => {
  // State declarations
  const [rightPanelSelection, setRightPanelSelection] = useState<'todo' | 'messages' | 'favorites'>('todo');
  const [todoItems, setTodoItems] = useState<TodoItem[]>([]);
  const [todoLists, setTodoLists] = useState<TodoList[]>([]);
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [listTaskCounts, setListTaskCounts] = useState<Map<string, number>>(new Map()); // NEW: State for task counts per list

  const [allCategories, setAllCategories] = useState<string[]>([]);
  const [showAddTaskDropdown, setShowAddTaskDropdown] = useState(false);
  const addTaskDropdownRef = useRef<HTMLDivElement>(null);
  const [sortOption, setSortOption] = useState<'myOrder' | 'date' | 'title'>('myOrder');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const sortMenuRef = useRef<HTMLDivElement>(null);
  const [draggedTodoId, setDraggedTodoId] = useState<string | null>(null);
  const [dragOverTodoId, setDragOverTodoId] = useState<string | null>(null);
  const [dropIndicatorPosition, setDropIndicatorPosition] = useState<{ id: string | null, position: 'top' | 'bottom' | null }>({ id: null, position: null });
  const [showNewListInput, setShowNewListInput] = useState(false);
  const [newListName, setNewListName] = useState('');
  const newListInputRef = useRef<HTMLInputElement>(null);
  const [showMoveTaskModal, setShowMoveTaskModal] = useState<boolean>(false);
  const [taskToMove, setTaskToMove] = useState<TodoItem | null>(null);
  const [showCompletedTasks, setShowCompletedTasks] = useState<boolean>(false); // New state for completed tasks section

  // State for list renaming
  const [editingListNameId, setEditingListNameId] = useState<string | null>(null);
  const [editingListNameValue, setEditingListNameValue] = useState<string | null>(null);
  const [openListMenuId, setOpenListMenuId] = useState<string | null>(null); // State for list's three-dot menu

  // New states for delete confirmation modal
  const [showDeleteListModal, setShowDeleteListModal] = useState<boolean>(false);
  const [listToConfirmDelete, setListToConfirmDelete] = useState<TodoList | null>(null);

  // New state for upgrade modal
  const [showUpgradeModal, setShowUpgradeModal] = useState<boolean>(false); // Controls visibility of the upgrade modal
  const [showListLimitBanner, setShowListLimitBanner] = useState<boolean>(true); // Controls visibility of the banner


  // Ref for each list's more button
  const listButtonRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});

  // Check if the user has reached the list limit
  // This now checks if adding *one more* list would exceed the limit
  const willReachListLimit = todoLists.length >= STARTER_TIER_MAX_LISTS;

  const router = useRouter();

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

  // Effect to manage default "My To-do" list and fetch all lists
  useEffect(() => {
    let unsubscribeTodoLists: () => void;

    const userId = currentUser?.uid;

    if (userId) {
      const todoListsCollectionRef = getUserCollectionRef<TodoList>("todoLists", userId);
      const q = query(
        todoListsCollectionRef,
        where('userId', '==', userId),
        orderBy('orderIndex', 'asc'),
        orderBy('createdAt', 'asc')
      );

      unsubscribeTodoLists = onSnapshot(q, async (snapshot) => {
        const fetchedLists: TodoList[] = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            name: data.name,
            userId: data.userId,
            createdAt: data.createdAt && typeof data.createdAt === 'object' && typeof (data.createdAt as any).toDate === 'function' ? (data.createdAt as any).toDate() : data.createdAt instanceof Date ? data.createdAt : new Date(),
            orderIndex: data.orderIndex || 0,
          };
        });
        setTodoLists(fetchedLists);

        const currentSelectedListExists = fetchedLists.some(list => list.id === selectedListId);

        if (!selectedListId || !currentSelectedListExists) {
          let myTodoList = fetchedLists.find(list => list.name === 'My To-do');

          if (!myTodoList) {
            const newMyTodoList: Omit<TodoList, 'id'> = {
              name: 'My To-do',
              userId: userId,
              createdAt: new Date(),
              orderIndex: 0,
            };
            try {
              const docRef = await addDoc(getUserCollectionRef("todoLists", userId), newMyTodoList);
              myTodoList = { ...newMyTodoList, id: docRef.id };
              toast.success('Created "My To-do" list!');
            } catch (error) {
              console.error('Error creating "My To-do" list:', error);
              toast.error('Failed to create "My To-do" list.');
            }
          }
          if (myTodoList && myTodoList.id !== selectedListId) {
            setSelectedListId(myTodoList.id);
          } else if (fetchedLists.length > 0 && !myTodoList && fetchedLists[0].id !== selectedListId) {
            setSelectedListId(fetchedLists[0].id);
          }
        }
      }, (error) => {
        console.error('Error fetching To-do lists:', error);
        toast.error('Failed to load To-do lists.');
      });
    }

    return () => {
      if (unsubscribeTodoLists) {
        unsubscribeTodoLists();
      }
    };
  }, [currentUser?.uid, selectedListId]);

  // NEW: Effect to fetch all To-Do items for task counts
  useEffect(() => {
    let unsubscribeAllTodoItems: () => void;
    if (currentUser?.uid) {
      const userId = currentUser.uid;
      const allTodoItemsCollectionRef = getUserCollectionRef<TodoItem>("todoItems", userId);
      const qAll = query(allTodoItemsCollectionRef, where('userId', '==', userId));

      unsubscribeAllTodoItems = onSnapshot(qAll, (snapshot) => {
        const counts = new Map<string, number>();
        snapshot.docs.forEach(docSnap => {
          const data = docSnap.data();
          const listId = data.listId;
          if (listId) {
            counts.set(listId, (counts.get(listId) || 0) + 1);
          }
        });
        setListTaskCounts(counts);
      }, (error) => {
        console.error('Error fetching all To-Do items for counts:', error);
      });
    } else {
      setListTaskCounts(new Map());
    }
    return () => {
      if (unsubscribeAllTodoItems) {
        unsubscribeAllTodoItems();
      }
    };
  }, [currentUser?.uid]);


  // Effect to fetch To-Do items based on selectedListId
  useEffect(() => {
    let unsubscribeTodoItems: () => void;
    if (currentUser && rightPanelSelection === 'todo' && selectedListId) {
      const todoItemsCollectionRef = getUserCollectionRef<TodoItem>("todoItems", currentUser.uid);
      const q = query(
        todoItemsCollectionRef,
        where('userId', '==', currentUser.uid),
        where('listId', '==', selectedListId),
        orderBy('orderIndex', 'asc'),
        orderBy('createdAt', 'asc')
      );

      unsubscribeTodoItems = onSnapshot(q, async (snapshot) => {
        const items: TodoItem[] = snapshot.docs.map(doc => {
          const data = doc.data() as TodoItem;
          const deadline = data.deadline && typeof data.deadline === 'object' && typeof (data.deadline as any).toDate === 'function'
            ? (data.deadline as any).toDate()
            : data.deadline instanceof Date
              ? data.deadline
              : (data.deadline === null ? undefined : data.deadline);
          const endDate = data.endDate && typeof data.endDate === 'object' && typeof (data.endDate as any).toDate === 'function'
            ? (data.endDate as any).toDate()
            : data.endDate instanceof Date
              ? data.endDate
              : (data.endDate === null ? undefined : data.endDate);
          const note = data.note === null ? undefined : data.note;
          const category = data.category === null ? undefined : data.category;
          const assignedTo = data.contactId === null ? undefined : data.contactId;
          const createdAt = data.createdAt && typeof data.createdAt === 'object' && typeof (data.createdAt as any).toDate === 'function'
            ? (data.createdAt as any).toDate()
            : data.createdAt instanceof Date
              ? data.createdAt
              : new Date();
          const completedAt = data.completedAt && typeof data.completedAt === 'object' && typeof (data.completedAt as any).toDate === 'function'
            ? (data.completedAt as any).toDate()
            : data.completedAt instanceof Date
              ? data.completedAt
              : undefined;
          const deadlineSafe = deadline === null ? undefined : deadline;
          const endDateSafe = endDate === null ? undefined : endDate;
          const noteSafe = note === null ? undefined : note;
          const categorySafe = category === null ? undefined : category;
          const assignedToSafe = assignedTo === null ? undefined : assignedTo;
          return {
            id: doc.id,
            name: data.name,
            deadline: deadlineSafe,
            endDate: endDateSafe,
            note: noteSafe,
            category: categorySafe,
            assignedTo: assignedToSafe,
            isCompleted: data.isCompleted,
            userId: data.userId,
            createdAt: createdAt,
            orderIndex: data.orderIndex || 0,
            listId: data.listId || '',
            completedAt: completedAt,
          };
        });

        // --- Migration Logic for old tasks without listId ---
        const batch = writeBatch(db);
        let needsBatchCommit = false;
        const myTodoList = todoLists.find(list => list.name === 'My To-do');

        if (myTodoList) {
          const tasksWithoutListIdQuery = query(
            getUserCollectionRef("todoItems", currentUser.uid),
            where('listId', '==', null)
          );
          const tasksWithoutListIdSnapshot = await getDocs(tasksWithoutListIdQuery);

          tasksWithoutListIdSnapshot.forEach(docSnap => {
            const taskData = docSnap.data() as TodoItem;
            if (!taskData.listId) {
              const taskRef = doc(getUserCollectionRef("todoItems", currentUser.uid), docSnap.id);
              batch.update(taskRef, { listId: myTodoList.id });
              needsBatchCommit = true;
            }
          });

          const tasksWithEmptyListIdQuery = query(
            getUserCollectionRef("todoItems", currentUser.uid),
            where('userId', '==', currentUser.uid),
            where('listId', '==', '')
          );
          const tasksWithEmptyListIdSnapshot = await getDocs(tasksWithEmptyListIdQuery);

          tasksWithEmptyListIdSnapshot.forEach(docSnap => {
            const taskData = docSnap.data() as TodoItem;
            if (taskData.listId === '') {
              const taskRef = doc(getUserCollectionRef("todoItems", currentUser.uid), docSnap.id);
              batch.update(taskRef, { listId: myTodoList.id });
              needsBatchCommit = true;
            }
          });
        }

        if (needsBatchCommit) {
          try {
            await batch.commit();
            console.log('Migrated old tasks to "My To-do" list.');
          } catch (error) {
            if (error instanceof Error) {
              console.error('Error migrating old tasks:', error.message);
            } else {
            console.error('Error migrating old tasks:', error);
            }
          }
        }
        // --- End Migration Logic ---

        setTodoItems(items);
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
  }, [currentUser, rightPanelSelection, selectedListId, todoLists]);

  // Effect to close dropdowns and input when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Close "New Task" dropdown
      if (addTaskDropdownRef.current && !addTaskDropdownRef.current.contains(event.target as Node)) {
        setShowAddTaskDropdown(false);
      }

      // Close sort menu if open and click is outside
      if (sortMenuRef.current && !sortMenuRef.current.contains(event.target as Node)) {
        setShowSortMenu(false);
      }

      // Close new list input if open and click is outside
      // Only hide and clear if the click was outside AND not on the "Add" button itself
      if (showNewListInput && newListInputRef.current && !newListInputRef.current.contains(event.target as Node)) {
        const targetElement = event.target as HTMLElement;
        const addButton = targetElement.closest('.btn-primary'); // Check if the clicked element or its parent is the "Add" button
        if (!addButton || addButton.textContent !== 'Add') { // Ensure it's the specific Add button for new list
            setShowNewListInput(false);
            setNewListName(''); // Clear input on close
        }
      }

      // Close list menu if open and click is outside
      const clickedElement = event.target as HTMLElement;
      // Check if the click was outside any open list menu and its corresponding button
      if (openListMenuId !== null) {
        const menuElement = document.getElementById(`list-menu-${openListMenuId}`);
        const buttonElement = listButtonRefs.current[openListMenuId];

        if (menuElement && !menuElement.contains(clickedElement) &&
            buttonElement && !buttonElement.contains(clickedElement)) {
          setOpenListMenuId(null);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showAddTaskDropdown, showSortMenu, showNewListInput, openListMenuId]);

  // Function to handle adding a new To-Do item
  const handleAddNewTodo = async () => {
    if (!currentUser) {
      toast.error('You must be logged in to add a To-Do item.');
      return;
    }
    if (!selectedListId) {
      toast.error('Please select a list before adding a task.');
      return;
    }

    // Calculate the next orderIndex for the current list
    const maxOrderIndex = todoItems.length > 0 ? Math.max(...todoItems.map(item => item.orderIndex)) : -1;

    const newTodo: TodoItem = {
      id: uuidv4(),
      name: 'New To-do Item (Click to Edit)',
      isCompleted: false,
      userId: currentUser.uid,
      createdAt: new Date(),
      orderIndex: maxOrderIndex + 1,
      listId: selectedListId, // Assign to the currently selected list
    };

    try {
      await addDoc(getUserCollectionRef("todoItems", currentUser.uid), {
        ...newTodo,
        createdAt: newTodo.createdAt,
      });
      toast.success('New To-do item added!');
    } catch (error: any) {
      console.error('Error adding To-do item:', error);
      toast.error(`Failed to add To-do item: ${error.message}`);
    } finally {
      setShowAddTaskDropdown(false);
    }
  };

  // Function to handle creating a new list
  const handleCreateNewList = async () => {
    console.log('handleCreateNewList called'); // Debug log
    if (!currentUser) {
      toast.error('You must be logged in to create a new list.');
      // Do NOT clear input or hide input field here.
      return;
    }
    // Check if adding this new list would exceed the limit
    if (todoLists.length + 1 > STARTER_TIER_MAX_LISTS) { // This condition checks if the *next* list would exceed the limit
      setShowUpgradeModal(true);
      setNewListName(''); // Clear input if modal is shown
      setShowNewListInput(false); // Hide input if modal is shown
      return;
    }

    const trimmedListName = newListName.trim();
    if (!trimmedListName) {
      toast.error('List name cannot be empty.');
      // Do NOT clear input or hide input field here.
      return;
    }

    // Check if a list with this name already exists for the user
    const existingList = todoLists.find(list => list.name.toLowerCase() === trimmedListName.toLowerCase());
    if (existingList) {
      toast.error('A list with this name already exists.');
      // Do NOT clear input or hide input field here.
      return;
    }

    // Calculate the next orderIndex for lists
    const maxListOrderIndex = todoLists.length > 0 ? Math.max(...todoLists.map(list => list.orderIndex)) : -1;

    const newList: Omit<TodoList, 'id'> = {
      name: trimmedListName,
      userId: currentUser.uid,
      createdAt: new Date(),
      orderIndex: maxListOrderIndex + 1,
    };

    try {
      // Capture the docRef here
      const docRef = await addDoc(getUserCollectionRef("todoLists", currentUser.uid), newList);
      toast.success(`List "${trimmedListName}" created!`);
      setSelectedListId(docRef.id); // Automatically select the new list
      setNewListName(''); // Clear input ONLY on success
      setShowNewListInput(false); // Hide input ONLY on success
    } catch (error: any) {
      console.error('Error creating new list:', error);
      toast.error(`Failed to create new list: ${error.message}`);
      // If an error occurs during addDoc, the input and field should remain.
    }
  };

  // Function to handle renaming a list
  const handleRenameList = useCallback(async (listId: string) => {
    if (!currentUser) {
      toast.error('You must be logged in to rename a list.');
      return;
    }
    const trimmedName = editingListNameValue?.trim();
    if (!trimmedName) {
      toast.error('List name cannot be empty.');
      // Revert to original name if empty
      const originalList = todoLists.find(list => list.id === listId);
      if (originalList) {
        setEditingListNameValue(originalList.name);
      }
      setEditingListNameId(null);
      return;
    }

    // Check for duplicate name
    const existingList = todoLists.find(list => list.name.toLowerCase() === trimmedName.toLowerCase() && list.id !== listId);
    if (existingList) {
      toast.error('A list with this name already exists.');
      const originalList = todoLists.find(list => list.id === listId);
      if (originalList) {
        setEditingListNameValue(originalList.name);
      }
      setEditingListNameId(null);
      return;
    }

    try {
      const listRef = doc(getUserCollectionRef("todoLists", currentUser.uid), listId);
      await updateDoc(listRef, { name: trimmedName });
      toast.success('List renamed successfully!');
    } catch (error: any) {
      console.error('Error renaming list:', error);
      toast.error(`Failed to rename list: ${error.message}`);
    } finally {
      setEditingListNameId(null);
      setEditingListNameValue(null);
    }
  }, [currentUser, editingListNameValue, todoLists]);

  // Helper function to execute the actual deletion of a list and its tasks
  const executeDeleteList = useCallback(async (listId: string) => {
    if (!currentUser) {
      toast.error('You must be logged in to delete a list.');
      return;
    }

    try {
      const batch = writeBatch(db);

      // 1. Delete all tasks associated with this list
      const tasksToDeleteQuery = query(
        getUserCollectionRef("todoItems", currentUser.uid),
        where('listId', '==', listId)
      );
      const tasksSnapshot = await getDocs(tasksToDeleteQuery);
      tasksSnapshot.forEach(taskDoc => {
        batch.delete(doc(getUserCollectionRef("todoItems", currentUser.uid), taskDoc.id));
      });

      // 2. Delete the list itself
      const listRef = doc(getUserCollectionRef("todoLists", currentUser.uid), listId);
      batch.delete(listRef);

      await batch.commit();
      toast.success('List and its tasks deleted successfully!');

      // If the deleted list was the currently selected one, select another list
      if (selectedListId === listId) {
        const remainingLists = todoLists.filter(list => list.id !== listId);
        if (remainingLists.length > 0) {
          setSelectedListId(remainingLists[0].id);
        } else {
          setSelectedListId(null); // No lists left
        }
      }
    } catch (error: any) {
      console.error('Error deleting list:', error);
      toast.error(`Failed to delete list: ${error.message}`);
    } finally {
      setOpenListMenuId(null);
    }
  }, [currentUser, selectedListId, todoLists]);


  // Function to handle deleting a list (initial click handler)
  const handleDeleteList = useCallback(async (listId: string) => {
    if (!currentUser) {
      toast.error('You must be logged in to delete a list.');
      return;
    }

    const listToDelete = todoLists.find(list => list.id === listId);
    if (!listToDelete) return;

    // Check if there are any tasks associated with this list
    const tasksQuery = query(
      getUserCollectionRef("todoItems", currentUser.uid),
      where('listId', '==', listId)
    );
    const tasksSnapshot = await getDocs(tasksQuery);

    if (tasksSnapshot.size > 0) {
      // If tasks exist, show the confirmation modal
      setListToConfirmDelete(listToDelete);
      setShowDeleteListModal(true);
      setOpenListMenuId(null); // Close the dropdown menu
    } else {
      // If no tasks, proceed with direct deletion
      executeDeleteList(listId);
    }
  }, [currentUser, todoLists, executeDeleteList]);


  const handleToggleTodoComplete = useCallback(async (todo: TodoItem) => {
    try {
      const updatedIsCompleted = !todo.isCompleted;
      const firestoreCompletedAt = updatedIsCompleted ? new Date() : null;
      const localCompletedAt = updatedIsCompleted ? new Date() : undefined;
      const todoRef = doc(getUserCollectionRef("todoItems", todo.userId), todo.id);
      // Only include completedAt if completed or explicitly set to null
      const updateObj: any = { isCompleted: updatedIsCompleted };
      if (updatedIsCompleted) {
        updateObj.completedAt = firestoreCompletedAt;
      } else {
        updateObj.completedAt = null;
      }
      await setDoc(todoRef, updateObj, { merge: true });
      setTodoItems((prevTodoItems) =>
        prevTodoItems.map((item) =>
          item.id === todo.id ? { ...item, isCompleted: updatedIsCompleted, completedAt: updatedIsCompleted ? new Date() : undefined } : item
        )
      );
      toast.success(`To-do item marked as ${updatedIsCompleted ? 'complete' : 'incomplete'}!`);
    } catch (error: any) {
      console.error('Error toggling To-Do item completion:', error);
      toast.error(`Failed to update To-do item: ${error.message}`);
    }
  }, [setTodoItems]);

  // Function to handle updating the deadline (now called from TodoItemComponent)
  const handleUpdateDeadline = useCallback(async (todoId: string, deadline?: string | null, endDate?: string | null) => {
    if (!currentUser) {
      toast.error('User not authenticated.');
      return;
    }
    try {
      const updateObj: any = {};
      if (typeof deadline !== 'undefined') {
        updateObj.deadline = deadline && deadline !== '' ? parseLocalDateTime(deadline) : null;
      }
      if (typeof endDate !== 'undefined') {
        updateObj.endDate = endDate && endDate !== '' ? parseLocalDateTime(endDate) : null;
      }
      if (Object.keys(updateObj).length === 0) return;
      updateObj.userId = currentUser.uid;
      const todoRef = doc(getUserCollectionRef('todoItems', currentUser.uid), todoId);
      await setDoc(todoRef, updateObj, { merge: true });
      setTodoItems((prevTodoItems) =>
        prevTodoItems.map((item) =>
          item.id === todoId
            ? {
                ...item,
                ...(typeof deadline !== 'undefined' ? { deadline: deadline && deadline !== '' ? parseLocalDateTime(deadline) : undefined } : {}),
                ...(typeof endDate !== 'undefined' ? { endDate: endDate && endDate !== '' ? parseLocalDateTime(endDate) : undefined } : {}),
              }
            : item
        )
      );
      triggerJustUpdated(todoId);
      toast.success('Deadline updated!');
    } catch (error: any) {
      console.error('Error updating deadline:', error);
      toast.error(`Failed to update deadline: ${error.message}`);
    }
  }, [currentUser]);

  // Functions for note editing (now called from TodoItemComponent)
  const handleUpdateNote = useCallback(async (todoId: string, newNote: string | null) => {
    if (!currentUser) {
      toast.error('User not authenticated.');
      return;
    }
    try {
      const todoRef = doc(getUserCollectionRef("todoItems", currentUser.uid), todoId);
      await setDoc(todoRef, { note: newNote }, { merge: true });
      setTodoItems((prevTodoItems) =>
        prevTodoItems.map((item) =>
          item.id === todoId ? { ...item, note: newNote || undefined } : item
        )
      );
      triggerJustUpdated(todoId);
      toast.success(`Note ${newNote ? 'updated' : 'removed'}!`);
    } catch (error: any) {
      console.error('Error updating note:', error);
      toast.error(`Failed to update note: ${error.message}`);
    }
  }, [currentUser]);

  // Functions for category editing (now called from TodoItemComponent)
  const handleUpdateCategory = useCallback(async (todoId: string, newCategory: string | null) => {
    if (!currentUser) {
      toast.error('User not authenticated.');
    }

    // Save new custom category if it's not null and not already in allCategories
    if (newCategory && !allCategories.includes(newCategory)) {
      await saveCategoryIfNew(newCategory, currentUser.uid);
    }

    try {
      const todoRef = doc(getUserCollectionRef("todoItems", currentUser.uid), todoId);
      await setDoc(todoRef, { category: newCategory }, { merge: true });
      setTodoItems((prevTodoItems) =>
        prevTodoItems.map((item) =>
          item.id === todoId ? { ...item, category: newCategory || undefined } : item
        )
      );
      triggerJustUpdated(todoId);
      toast.success(`Category ${newCategory ? 'updated' : 'removed'}!`);
    } catch (error: any) {
      console.error('Error updating category:', error);
      toast.error(`Failed to update category: ${error.message}`);
    }
  }, [currentUser, allCategories]);

  // Function to handle updating the task name (now called from TodoItemComponent)
  const handleUpdateTaskName = useCallback(async (todoId: string, newName: string) => {
    if (!currentUser) {
      toast.error('User not authenticated.');
      return;
    }
    const trimmedName = newName.trim();
    if (!trimmedName) {
      toast.error('Task name cannot be empty.');
      return;
    }
    try {
      const todoRef = doc(getUserCollectionRef("todoItems", currentUser.uid), todoId);
      await setDoc(todoRef, { name: trimmedName }, { merge: true });
      toast.success('Task name updated!');
    } catch (error: any) {
      console.error('Error updating task name:', error);
      toast.error(`Failed to update task name: ${error.message}`);
    }
  }, [currentUser]);

  // Function to clone a To-Do item
  const handleCloneTodo = useCallback(async (todo: TodoItem) => {
    if (!currentUser) {
      toast.error('You must be logged in to clone a To-Do item.');
      return;
    }
    if (!selectedListId) {
      toast.error('Cannot clone task: no list selected.');
      return;
    }

    // Adjust createdAt to ensure unique order or slight delay for Firestore order
    const newCreatedAt = new Date(todo.createdAt.getTime() + 1);
    const maxOrderIndex = todoItems.length > 0 ? Math.max(...todoItems.map(item => item.orderIndex)) : -1;

    const clonedTodo: Omit<TodoItem, 'id'> = {
      name: `Clone of ${todo.name}`,
      deadline: todo.deadline || null,
      note: todo.note || null,
      category: todo.category || null,
      contactId: todo.contactId || null,
      isCompleted: false,
      userId: currentUser.uid,
      createdAt: newCreatedAt,
      orderIndex: maxOrderIndex + 1,
      listId: selectedListId, // Cloned item goes to the currently selected list
    };

    try {
      await addDoc(getUserCollectionRef("todoItems", currentUser.uid), {
        ...clonedTodo,
        createdAt: clonedTodo.createdAt, // Ensure Firestore Timestamp conversion
      });
      toast.success('To-do item cloned successfully!');
    } catch (error: any) {
      console.error('Error cloning To-do item:', error);
      toast.error(`Failed to clone To-do item: ${error.message}`);
    }
  }, [currentUser, selectedListId, todoItems]);

  // Function to delete a To-Do item
  const handleDeleteTodo = useCallback(async (todoId: string) => {
    if (!currentUser) {
      toast.error('You must be logged in to delete a To-Do item.');
      return;
    }
    try {
      await deleteDoc(doc(getUserCollectionRef("todoItems", currentUser.uid), todoId));
      toast.success('To-do item deleted successfully!');
    } catch (error: any) {
      console.error('Error deleting To-Do item:', error);
      toast.error(`Failed to delete To-Do item: ${error.message}`);
    }
  }, [currentUser]);

  // Function to handle moving a To-Do item to another list
  const handleMoveTodoItem = useCallback(async (taskId: string, targetListId: string) => {
    if (!currentUser?.uid) return;

    try {
      const todoRef = doc(getUserCollectionRef("todoItems", currentUser.uid), taskId);

      // Get the current max orderIndex in the target list
      const targetListItemsQuery = query(
        getUserCollectionRef("todoItems", currentUser.uid),
        where('listId', '==', targetListId),
        orderBy('orderIndex', 'desc')
      );
      const targetListItemsSnapshot = await getDocs(targetListItemsQuery);
      const maxOrderIndexInTarget = targetListItemsSnapshot.docs.length > 0
        ? targetListItemsSnapshot.docs[0].data().orderIndex
        : -1;

      await updateDoc(todoRef, {
        listId: targetListId,
        orderIndex: maxOrderIndexInTarget + 1, // Place at the end of the new list
      });
      toast.success('To-do item moved successfully!');
    } catch (error) {
      console.error("Error moving todo item:", error);
      toast.error("Failed to move to-do item.");
    } finally {
      setShowMoveTaskModal(false);
      setTaskToMove(null);
    }
  }, [currentUser?.uid]);


  // Function to handle sort option selection
  const handleSortOptionSelect = useCallback((option: 'myOrder' | 'date' | 'title') => {
    setSortOption(option);
    setShowSortMenu(false);
  }, []);


  // Filtered To-Do items based on selectedListId and sortOption
  const filteredTodoItems = useMemo(() => {
    let items = [...todoItems];

    const incompleteTasks = items.filter(item => !item.isCompleted);
    const completedTasks = items.filter(item => item.isCompleted);

    if (sortOption === 'date') {
      incompleteTasks.sort((a, b) => {
        if (!a.deadline && !b.deadline) return 0;
        if (!a.deadline) return 1;
        if (!b.deadline) return -1;
        return a.deadline.getTime() - b.deadline.getTime();
      });
      completedTasks.sort((a, b) => {
        if (!a.deadline && !b.deadline) return 0;
        if (!a.deadline) return 1;
        if (!b.deadline) return -1;
        return a.deadline.getTime() - b.deadline.getTime();
      });
    } else if (sortOption === 'title') {
      incompleteTasks.sort((a, b) => a.name.localeCompare(b.name));
      completedTasks.sort((a, b) => a.name.localeCompare(b.name));
    }
    // For 'myOrder', they are already sorted by orderIndex from the Firestore query
    // so no additional sort is needed here, just the separation.

    return { incompleteTasks, completedTasks };
  }, [todoItems, sortOption]);


  // Drag and Drop Handlers (these remain in parent as they manage global drag state)
  const handleDragStart = useCallback((e: React.DragEvent<HTMLDivElement>, id: string) => {
    setDraggedTodoId(id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
    e.currentTarget.classList.add('opacity-50', 'border-dashed', 'border-2', 'border-[#A85C36]');
  }, []);

  const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>, id: string) => {
    e.preventDefault();
    if (draggedTodoId !== id) {
      setDragOverTodoId(id);
    }
  }, [draggedTodoId]);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.classList.remove('bg-[#EBE3DD]');
    setDragOverTodoId(null);
    setDropIndicatorPosition({ id: null, position: null });
  }, []);

  const handleItemDragOver = useCallback((e: React.DragEvent<HTMLDivElement>, id: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    if (draggedTodoId === id) {
      setDropIndicatorPosition({ id: null, position: null });
      setDragOverTodoId(null);
      return;
    }

    setDragOverTodoId(id);

    const rect = e.currentTarget.getBoundingClientRect();
    const mouseY = e.clientY - rect.top;
    const halfHeight = rect.height / 2;

    if (mouseY < halfHeight) {
      setDropIndicatorPosition({ id: id, position: 'top' });
    } else {
      setDropIndicatorPosition({ id: id, position: 'bottom' });
    }
  }, [draggedTodoId]);

  const handleListDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    if (!draggedTodoId) {
      setDropIndicatorPosition({ id: null, position: null });
      return;
    }

    if (dragOverTodoId === null) {
      if (filteredTodoItems.incompleteTasks.length > 0) { // Check incomplete tasks for drop target
        const lastItem = filteredTodoItems.incompleteTasks[filteredTodoItems.incompleteTasks.length - 1];
        if (draggedTodoId !== lastItem.id) {
          setDropIndicatorPosition({ id: lastItem.id, position: 'bottom' });
        } else {
          setDropIndicatorPosition({ id: null, position: null });
        }
      } else if (filteredTodoItems.completedTasks.length > 0) { // If no incomplete, check completed
        const lastItem = filteredTodoItems.completedTasks[filteredTodoItems.completedTasks.length - 1];
        if (draggedTodoId !== lastItem.id) {
          setDropIndicatorPosition({ id: lastItem.id, position: 'bottom' });
        } else {
          setDropIndicatorPosition({ id: null, position: null });
        }
      } else {
        setDropIndicatorPosition({ id: null, position: 'top' });
      }
    }
  }, [draggedTodoId, dragOverTodoId, filteredTodoItems.incompleteTasks, filteredTodoItems.completedTasks]);

  const handleListDrop = useCallback(async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();

    if (dragOverTodoId) {
      const prevDragOverElement = document.getElementById(`todo-item-${dragOverTodoId}`);
      if (prevDragOverElement) {
        prevDragOverElement.classList.remove('bg-[#EBE3DD]');
      }
    }
    setDropIndicatorPosition({ id: null, position: null });
    setDraggedTodoId(null);
    setDragOverTodoId(null);

    if (!draggedTodoId) {
      return;
    }

    if (sortOption !== 'myOrder') {
      setSortOption('myOrder');
    }

    // Combine all tasks for reordering, then filter
    const orderedItems = [...todoItems].sort((a, b) => a.orderIndex - b.orderIndex);
    const draggedIndex = orderedItems.findIndex(item => item.id === draggedTodoId);

    if (draggedIndex === -1) {
      return;
    }

    let finalDropIndex: number;

    if (dropIndicatorPosition.id === null) {
      // Dropping into an empty list or at the very end
      if (filteredTodoItems.incompleteTasks.length === 0 && filteredTodoItems.completedTasks.length === 0) {
        finalDropIndex = 0;
      } else {
        finalDropIndex = orderedItems.length;
      }
    } else {
      const dropTargetIndex = orderedItems.findIndex(item => item.id === dropIndicatorPosition.id);

      if (dropTargetIndex === -1) {
        finalDropIndex = orderedItems.length;
      } else {
        if (dropIndicatorPosition.position === 'top') {
          finalDropIndex = dropTargetIndex;
        } else {
          finalDropIndex = dropTargetIndex + 1;
        }
      }
    }

    // Adjust finalDropIndex if dragged item is being moved to a position after its original
    if (draggedIndex < finalDropIndex) {
      finalDropIndex--;
    }

    if (draggedIndex === finalDropIndex) {
      return; // No change in position
    }

    const newOrderedItems = reorder(orderedItems, draggedIndex, finalDropIndex);

    const batch = writeBatch(db);
    newOrderedItems.forEach((item, index) => {
      // Only update if orderIndex has truly changed
      if (item.orderIndex !== index) {
        const todoRef = doc(getUserCollectionRef("todoItems", currentUser.uid), item.id);
        batch.update(todoRef, { orderIndex: index });
      }
    });

    try {
      await batch.commit();
      toast.success('To-do item reordered!');
      // Set justUpdated state for the reordered task
      setTodoItems(prevItems => 
        prevItems.map(item => 
          item.id === draggedTodoId 
            ? { ...item, justUpdated: true }
            : item
        )
      );
      // Reset justUpdated after animation
      setTimeout(() => {
        setTodoItems(prevItems => 
          prevItems.map(item => 
            item.id === draggedTodoId 
              ? { ...item, justUpdated: false }
              : item
          )
        );
      }, 1000);
    } catch (error: any) {
      console.error('Error reordering To-do item:', error);
      toast.error(`Failed to reorder To-do item: ${error.message}`);
    }
  }, [draggedTodoId, dropIndicatorPosition, sortOption, todoItems, filteredTodoItems.incompleteTasks, filteredTodoItems.completedTasks, currentUser]);

  const handleDragEnd = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.currentTarget.classList.remove('opacity-50', 'border-dashed', 'border-2', 'border-[#A85C36]');
    if (dragOverTodoId) {
      const prevDragOverElement = document.getElementById(`todo-item-${dragOverTodoId}`);
      if (prevDragOverElement) {
        prevDragOverElement.classList.remove('bg-[#EBE3DD]');
      }
    }
    setDraggedTodoId(null);
    setDragOverTodoId(null);
    setDropIndicatorPosition({ id: null, position: null });
  }, [dragOverTodoId]);

  // Always show 'My To-do' first in the list
  const sortedTodoLists = useMemo(() => {
    const myTodo = todoLists.find(list => list.name === 'My To-do');
    const others = todoLists.filter(list => list.name !== 'My To-do');
    return myTodo ? [myTodo, ...others] : others;
  }, [todoLists]);

  // Utility to trigger green animation for a todo item
  function triggerJustUpdated(todoId: string) {
    setTodoItems((prevTodoItems) =>
      prevTodoItems.map((item) =>
        item.id === todoId ? { ...item, justUpdated: true } : item
      )
    );
    setTimeout(() => {
      setTodoItems((prevTodoItems) =>
        prevTodoItems.map((item) =>
          item.id === todoId ? { ...item, justUpdated: false } : item
        )
      );
    }, 1000);
  }

  // Function to handle cloning a list and its tasks
  const handleCloneList = useCallback(async (listId: string) => {
    if (!currentUser) {
      toast.error('You must be logged in to clone a list.');
      return;
    }
    // Check if cloning would exceed the list limit
    if (todoLists.length >= STARTER_TIER_MAX_LISTS) {
      setShowUpgradeModal(true);
      return;
    }
    const listToClone = todoLists.find(list => list.id === listId);
    if (!listToClone) {
      toast.error('List not found.');
      return;
    }
    // Generate a unique name for the cloned list
    const baseName = listToClone.name.replace(/ \(Copy( \d+)?\)$/i, '');
    let copyNumber = 1;
    let newName = `${baseName} (Copy)`;
    while (todoLists.some(list => list.name === newName)) {
      copyNumber++;
      newName = `${baseName} (Copy ${copyNumber})`;
    }
    // Calculate the next orderIndex for lists
    const maxListOrderIndex = todoLists.length > 0 ? Math.max(...todoLists.map(list => list.orderIndex)) : -1;
    const newList: Omit<TodoList, 'id'> = {
      name: newName,
      userId: currentUser.uid,
      createdAt: new Date(),
      orderIndex: maxListOrderIndex + 1,
    };
    try {
      // 1. Create the new list
      const docRef = await addDoc(getUserCollectionRef("todoLists", currentUser.uid), newList);
      // 2. Fetch all tasks from the original list
      const tasksQuery = query(
        getUserCollectionRef("todoItems", currentUser.uid),
        where('listId', '==', listId)
      );
      const tasksSnapshot = await getDocs(tasksQuery);
      // 3. Clone each task to the new list
      const batch = writeBatch(db);
      let maxOrderIndex = -1;
      tasksSnapshot.forEach(taskDoc => {
        const data = taskDoc.data();
        maxOrderIndex = Math.max(maxOrderIndex, data.orderIndex || 0);
      });
      let orderIndex = maxOrderIndex + 1;
      tasksSnapshot.forEach(taskDoc => {
        const data = taskDoc.data();
        const newTaskRef = doc(getUserCollectionRef("todoItems", currentUser.uid));
        batch.set(newTaskRef, {
          ...data,
          listId: docRef.id,
          createdAt: new Date(),
          orderIndex: orderIndex++,
        });
      });
      await batch.commit();
      toast.success(`List "${newName}" and its tasks cloned!`);
      setSelectedListId(docRef.id); // Navigate to the new list
    } catch (error: any) {
      console.error('Error cloning list:', error);
      toast.error(`Failed to clone list: ${error.message}`);
    }
  }, [currentUser, todoLists]);

  return (
    <div className="flex w-full h-full rounded-[5px] border border-[#AB9C95] overflow-hidden"
      style={{ maxHeight: '100%' }}
    >
      {/* Vertical Navigation (Icons) - Main Panel Switcher - Left Column of Right Panel */}
      <div className="hidden md:flex flex-col bg-[#F3F2F0] p-2 border-r border-[#AB9C95] space-y-2 flex-shrink-0 w-[60px]"> {/* Added fixed width */}
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
      {
  (!isMobile || activeMobileTab === 'todo') && (
      <aside
        className="flex-1 bg-[#DEDBDB] p-3 overflow-y-auto w-full"
        style={{ maxHeight: '100%' }}
      >
        {/* Conditional Content based on rightPanelSelection */}
        {rightPanelSelection === 'todo' && (
          <ToDoPanel
            todoLists={sortedTodoLists}
            selectedListId={selectedListId}
            setSelectedListId={setSelectedListId}
            editingListNameId={editingListNameId}
                          setEditingListNameId={setEditingListNameId}
            editingListNameValue={editingListNameValue}
                          setEditingListNameValue={setEditingListNameValue}
            openListMenuId={openListMenuId}
                          setOpenListMenuId={setOpenListMenuId}
            listButtonRefs={listButtonRefs}
            listTaskCounts={listTaskCounts}
            showNewListInput={showNewListInput}
            setShowNewListInput={setShowNewListInput}
            newListName={newListName}
            setNewListName={setNewListName}
            newListInputRef={newListInputRef}
            handleCreateNewList={handleCreateNewList}
            willReachListLimit={willReachListLimit}
            STARTER_TIER_MAX_LISTS={STARTER_TIER_MAX_LISTS}
            showListLimitBanner={showListLimitBanner}
            setShowListLimitBanner={setShowListLimitBanner}
            handleRenameList={handleRenameList}
            handleDeleteList={handleDeleteList}
            handleCloneList={handleCloneList}
                          sortOption={sortOption}
            setShowSortMenu={setShowSortMenu}
            showSortMenu={showSortMenu}
            sortMenuRef={sortMenuRef}
            handleSortOptionSelect={handleSortOptionSelect}
            showAddTaskDropdown={showAddTaskDropdown}
            setShowAddTaskDropdown={setShowAddTaskDropdown}
            addTaskDropdownRef={addTaskDropdownRef}
            handleAddNewTodo={handleAddNewTodo}
            filteredTodoItems={filteredTodoItems}
            handleListDragOver={handleListDragOver}
            handleListDrop={handleListDrop}
                            contacts={contacts}
                            allCategories={allCategories}
                            draggedTodoId={draggedTodoId}
                            dragOverTodoId={dragOverTodoId}
                            dropIndicatorPosition={dropIndicatorPosition}
                            currentUser={currentUser}
                            handleToggleTodoComplete={handleToggleTodoComplete}
                            handleUpdateTaskName={handleUpdateTaskName}
                            handleUpdateDeadline={handleUpdateDeadline}
            handleUpdateNote={onUpdateTodoNotes}
            handleUpdateCategory={onUpdateTodoCategory}
                            handleCloneTodo={handleCloneTodo}
                            handleDeleteTodo={handleDeleteTodo}
                            setTaskToMove={setTaskToMove}
                            setShowMoveTaskModal={setShowMoveTaskModal}
                            handleDragStart={handleDragStart}
                            handleDragEnter={handleDragEnter}
                            handleDragLeave={handleDragLeave}
                            handleItemDragOver={handleItemDragOver}
                            handleDragEnd={handleDragEnd}
            showCompletedTasks={showCompletedTasks}
            setShowCompletedTasks={setShowCompletedTasks}
            router={router}
            setShowUpgradeModal={setShowUpgradeModal}
          />
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
      )
}

      {showMoveTaskModal && taskToMove && (
        <MoveTaskModal
          task={taskToMove}
          todoLists={todoLists}
          currentListId={taskToMove.listId}
          onMove={handleMoveTodoItem}
          onClose={() => {
            setShowMoveTaskModal(false);
            setTaskToMove(null);
          }}
        />
      )}

      {showDeleteListModal && listToConfirmDelete && (
        <DeleteListConfirmationModal
          list={listToConfirmDelete}
          onConfirm={async () => {
            await executeDeleteList(listToConfirmDelete.id);
            setShowDeleteListModal(false);
            setListToConfirmDelete(null);
          }}
          onClose={() => {
            setShowDeleteListModal(false);
            setListToConfirmDelete(null);
          }}
        />
      )}

      {showUpgradeModal && (
        <UpgradePlanModal
          maxLists={STARTER_TIER_MAX_LISTS}
          onClose={() => setShowUpgradeModal(false)}
        />
      )}
    </div>
  );
};

export default RightDashboardPanel;
