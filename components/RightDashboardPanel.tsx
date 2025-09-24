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
  limit,
} from 'firebase/firestore';
import { db, getUserCollectionRef } from '@/lib/firebase';
import { User } from 'firebase/auth';
import { useCustomToast } from '@/hooks/useCustomToast';
import { useTodoLists } from '@/hooks/useTodoLists';
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

import { parseLocalDateTime, nullToUndefined } from '@/utils/dateUtils';

// Define necessary interfaces
interface RightDashboardPanelProps {
  currentUser: User;
  contacts: Contact[];
  rightPanelSelection: 'todo' | 'messages' | 'favorites'; // Now a prop
  setRightPanelSelection: React.Dispatch<React.SetStateAction<'todo' | 'messages' | 'favorites'>>; // Add setter prop
  onUpdateTodoDeadline: (todoId: string, deadline: string | null) => Promise<void>;
  onUpdateTodoNotes: (todoId: string, notes: string) => Promise<void>;
  onUpdateTodoCategory: (todoId: string, category: string) => Promise<void>;
}

import { reorder } from '@/utils/arrayUtils';

// Define the maximum number of lists for a "Starter" tier user
const STARTER_TIER_MAX_LISTS = 3;

import Banner from './Banner';

const calendarStyles = `
  .rbc-event {
    border: none !important;
  }
`;

const RightDashboardPanel: React.FC<RightDashboardPanelProps> = ({ currentUser, contacts, rightPanelSelection, setRightPanelSelection, onUpdateTodoDeadline, onUpdateTodoNotes, onUpdateTodoCategory }) => {
  const { showSuccessToast, showErrorToast } = useCustomToast();
  
  // Use the shared todo lists hook
  const todoListsHook = useTodoLists();
  const { todoLists, selectedList, setSelectedList, handleAddList } = todoListsHook;
  
  // State declarations
  const [todoItems, setTodoItems] = useState<TodoItem[]>([]);
  const [selectedListId, setSelectedListId] = useState<string | null>(null); // null = "All To-Do" view
  const [listTaskCounts, setListTaskCounts] = useState<Map<string, number>>(new Map()); // NEW: State for task counts per list

  const [allCategories, setAllCategories] = useState<string[]>([]);
  const [showAddTaskDropdown, setShowAddTaskDropdown] = useState(false);
  const addTaskDropdownRef = useRef<HTMLDivElement>(null);
  const [sortOption, setSortOption] = useState<'myOrder' | 'date' | 'title' | 'date-desc' | 'title-desc'>('myOrder');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const sortMenuRef = useRef<HTMLDivElement>(null);
  const [draggedTodoId, setDraggedTodoId] = useState<string | null>(null);
  
  // Debug draggedTodoId changes
  useEffect(() => {
    // Track draggedTodoId changes
  }, [draggedTodoId]);
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
  
  // Ref system for highlighting and scrolling to newly created to-dos
  const itemRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const highlightedItemIdRef = useRef<string | null>(null);
  const [highlightedItemId, setHighlightedItemId] = useState<string | null>(null);
  
  // State for the existing green flash animation system
  const [justMovedItemId, setJustMovedItemId] = useState<string | null>(null);

  // New states for delete confirmation modal
  const [showDeleteListModal, setShowDeleteListModal] = useState<boolean>(false);
  const [listToConfirmDelete, setListToConfirmDelete] = useState<TodoList | null>(null);

  // New state for upgrade modal
  const [showUpgradeModal, setShowUpgradeModal] = useState<boolean>(false); // Controls visibility of the upgrade modal
  const [showListLimitBanner, setShowListLimitBanner] = useState<boolean>(true); // Controls visibility of the banner
  const [newlyAddedTodoItems, setNewlyAddedTodoItems] = useState<Set<string>>(new Set());

  // Clear newly added items after animation
  useEffect(() => {
    if (newlyAddedTodoItems.size > 0) {
      const timer = setTimeout(() => {
        setNewlyAddedTodoItems(new Set());
      }, 1000); // Clear after 1 second (same as animation duration)
      return () => clearTimeout(timer);
    }
  }, [newlyAddedTodoItems]);

  // Clear justMovedItemId after green flash animation
  useEffect(() => {
    if (justMovedItemId) {
      const timer = setTimeout(() => {
        setJustMovedItemId(null);
      }, 1200); // Flash for 1.2s (same as existing system)
      return () => clearTimeout(timer);
    }
  }, [justMovedItemId]);

  // Listen for highlight events from newly created to-dos
  useEffect(() => {
    const handleHighlight = (event: CustomEvent) => {
      console.log('🎯 Highlight event received:', event.detail);
      const { todoId, todoName, listId } = event.detail;
      
      // Use the existing green flash animation system
      setJustMovedItemId(todoId);
      console.log('🎯 Green flash animation triggered for:', todoId);
      console.log('🎯 Current selected list:', selectedListId);
      console.log('🎯 Target list from event:', listId);
      
      // If the to-do is in a different list, switch to that list
      if (listId && selectedListId !== listId) {
        console.log('🎯 Switching to list:', listId);
        setSelectedListId(listId);
        
        // Wait a bit for the list to switch before trying to scroll
        setTimeout(() => {
          console.log('🎯 List switched, now scrolling to item');
          scrollToItem(todoId);
        }, 300);
        return; // Exit early, let the delayed function handle the scroll
      }
      
      // If we're already on the right list, scroll immediately
      scrollToItem(todoId);
    };
    
    // Helper function to scroll to an item
    const scrollToItem = (todoId: string) => {
      // Scroll to the item after a delay to ensure it's rendered
      setTimeout(() => {
        const itemElement = itemRefs.current[todoId];
        console.log('🎯 Looking for item element:', todoId, 'Found:', !!itemElement);
        if (itemElement && itemElement.isConnected) {
          itemElement.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
          });
          console.log('🎯 Scrolled to item');
        } else {
          console.log('🎯 Item element not found or not connected, available refs:', Object.keys(itemRefs.current));
          // Try again after a longer delay in case items are still loading
          setTimeout(() => {
            const retryElement = itemRefs.current[todoId];
            console.log('🎯 Retry looking for item element:', todoId, 'Found:', !!retryElement, 'Connected:', retryElement?.isConnected);
            if (retryElement && retryElement.isConnected) {
              retryElement.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'center' 
              });
              console.log('🎯 Scrolled to item on retry');
            }
          }, 1000);
        }
      }, 500);
    };

    window.addEventListener('highlight-todo-item', handleHighlight as EventListener);
    
    return () => {
      window.removeEventListener('highlight-todo-item', handleHighlight as EventListener);
    };
  }, []);


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

  // Sync selectedListId with the selectedList from useTodoLists hook
  useEffect(() => {
    if (selectedList) {
      setSelectedListId(selectedList.id);
    } else {
      setSelectedListId(null);
    }
  }, [selectedList]);

  // Effect to listen for custom events to select a specific list
  useEffect(() => {
    const handleSelectTodoList = (event: CustomEvent) => {
      const { listId } = event.detail;
      if (listId) {
        // Find the list in todoLists and set it as selected
        const listToSelect = todoLists.find(list => list.id === listId);
        if (listToSelect) {
          setSelectedList(listToSelect);
        }
      }
    };

    window.addEventListener('selectTodoList', handleSelectTodoList as EventListener);

    return () => {
      window.removeEventListener('selectTodoList', handleSelectTodoList as EventListener);
    };
  }, [todoLists, setSelectedList]);

  // NEW: Effect to fetch all To-Do items for task counts
  useEffect(() => {
    let unsubscribeAllTodoItems: () => void;
    if (currentUser?.uid) {
      const userId = currentUser.uid;
      const allTodoItemsCollectionRef = getUserCollectionRef<TodoItem>("todoItems", userId);
      const qAll = query(
        allTodoItemsCollectionRef, 
        where('userId', '==', userId),
        limit(200) // Limit to 200 items for better performance
      );

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
    if (currentUser && rightPanelSelection === 'todo') {
      const todoItemsCollectionRef = getUserCollectionRef<TodoItem>("todoItems", currentUser.uid);
      let q;
      if (selectedListId) {
        q = query(
          todoItemsCollectionRef,
          where('userId', '==', currentUser.uid),
          where('listId', '==', selectedListId),
          orderBy('orderIndex', 'asc'),
          orderBy('createdAt', 'asc'),
          limit(100) // Limit to 100 items for better performance
        );
      } else {
        // All To-Do: fetch all tasks for the user
        q = query(
          todoItemsCollectionRef,
          where('userId', '==', currentUser.uid),
          orderBy('orderIndex', 'asc'),
          orderBy('createdAt', 'asc'),
          limit(200) // Limit to 200 items for better performance
        );
      }

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
          const assignedTo = data.assignedTo === null ? undefined : data.assignedTo;
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
          const deadlineSafe: Date | undefined = nullToUndefined(deadline as Date | null | undefined);
          const endDateSafe: Date | undefined = nullToUndefined(endDate as Date | null | undefined);
          const noteSafe: string | undefined = nullToUndefined(note as string | null | undefined);
          const categorySafe: string | undefined = nullToUndefined(category as string | null | undefined);
          const assignedToSafe: string | undefined = nullToUndefined(Array.isArray(assignedTo) ? assignedTo[0] : assignedTo as string | null | undefined);
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
            if (typeof error === 'object' && error !== null && 'message' in error) {
              console.error('Error migrating old tasks:', (error as { message: string }).message);
            } else {
              console.error('Error migrating old tasks:', error);
            }
          }
        }
        // --- End Migration Logic ---

        setTodoItems(items);
      }, (error) => {
        console.error('Error fetching To-Do items:', error);
        showErrorToast('Failed to load To-Do items.');
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
      showErrorToast('You must be logged in to add a To-Do item.');
      return;
    }
    if (!selectedListId) {
      showErrorToast('Please select a list before adding a task.');
      return;
    }

    // Calculate the next orderIndex for the current list
    const maxOrderIndex = todoItems.length > 0 ? Math.max(...todoItems.map(item => item.orderIndex)) : -1;

    const newTodo: TodoItem = {
      id: uuidv4(),
      name: 'New To-do Item (Click to Edit)',
      deadline: null,
      startDate: null,
      endDate: null,
      note: null,
      category: null,
      contactId: null,
      isCompleted: false,
      userId: currentUser.uid,
      createdAt: new Date(),
      orderIndex: maxOrderIndex + 1,
      listId: selectedListId, // Assign to the currently selected list
      completedAt: null,
      justUpdated: false,
      assignedTo: null,
      assignedBy: null,
      assignedAt: null,
      notificationRead: false
    };

    try {
      const docRef = await addDoc(getUserCollectionRef("todoItems", currentUser.uid), {
        ...newTodo,
        createdAt: newTodo.createdAt,
      });
      
      // Track newly added item for green flash animation
      setNewlyAddedTodoItems(prev => new Set(prev).add(docRef.id));
      
      showSuccessToast('New To-do item added!');
    } catch (error: any) {
      console.error('Error adding To-do item:', error);
      showErrorToast(`Failed to add To-do item: ${error.message}`);
    } finally {
      setShowAddTaskDropdown(false);
    }
  };

  // Function to handle creating a new list
  const handleCreateNewList = async () => {
    if (!currentUser) {
      showErrorToast('You must be logged in to create a new list.');
      return;
    }
    
    const trimmedListName = newListName.trim();
    if (!trimmedListName) {
      showErrorToast('List name cannot be empty.');
      return;
    }

    // Use the handleAddList from the useTodoLists hook
    await handleAddList(trimmedListName);
    
    // Clear input and hide input field on success
    setNewListName('');
    setShowNewListInput(false);
  };

  // Function to handle renaming a list
  const handleRenameList = useCallback(async (listId: string) => {
    if (!currentUser) {
      showErrorToast('You must be logged in to rename a list.');
      return;
    }
    const trimmedName = editingListNameValue?.trim();
    if (!trimmedName) {
      showErrorToast('List name cannot be empty.');
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
      showErrorToast('A list with this name already exists.');
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
      showSuccessToast('List renamed successfully!');
    } catch (error: any) {
      console.error('Error renaming list:', error);
      showErrorToast(`Failed to rename list: ${error.message}`);
    } finally {
      setEditingListNameId(null);
      setEditingListNameValue(null);
    }
  }, [currentUser, editingListNameValue, todoLists]);

  // Helper function to execute the actual deletion of a list and its tasks
  const executeDeleteList = useCallback(async (listId: string) => {
    if (!currentUser) {
      showErrorToast('You must be logged in to delete a list.');
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
      showSuccessToast('List and its tasks deleted successfully!');

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
      showErrorToast(`Failed to delete list: ${error.message}`);
    } finally {
      setOpenListMenuId(null);
    }
  }, [currentUser, selectedListId, todoLists]);


  // Function to handle deleting a list (initial click handler)
  const handleDeleteList = useCallback(async (listId: string) => {
    if (!currentUser) {
      showErrorToast('You must be logged in to delete a list.');
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
      
      // Trigger green flash animation for incomplete items (moving from completed back to main list)
      if (!updatedIsCompleted) {
        triggerJustUpdated(todo.id);
      }
      
      showSuccessToast(`To-do item marked as ${updatedIsCompleted ? 'complete' : 'incomplete'}!`);
    } catch (error: any) {
      console.error('Error toggling To-Do item completion:', error);
      showErrorToast(`Failed to update To-do item: ${error.message}`);
    }
  }, [setTodoItems]);

  // Function to handle updating the deadline (now called from TodoItemComponent)
  const handleUpdateDeadline = useCallback(async (todoId: string, deadline?: string | null, endDate?: string | null) => {
    if (!currentUser) {
      showErrorToast('User not authenticated.');
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
      showSuccessToast('Deadline updated!');
    } catch (error: any) {
      console.error('Error updating deadline:', error);
      showErrorToast(`Failed to update deadline: ${error.message}`);
    }
  }, [currentUser]);

  // Functions for note editing (now called from TodoItemComponent)
  const handleUpdateNote = useCallback(async (todoId: string, newNote: string | null) => {
    if (!currentUser) {
      showErrorToast('User not authenticated.');
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
      showSuccessToast(`Note ${newNote ? 'updated' : 'removed'}!`);
    } catch (error: any) {
      console.error('Error updating note:', error);
      showErrorToast(`Failed to update note: ${error.message}`);
    }
  }, [currentUser]);

  // Functions for category editing (now called from TodoItemComponent)
  const handleUpdateCategory = useCallback(async (todoId: string, newCategory: string | null) => {
    if (!currentUser) {
      showErrorToast('User not authenticated.');
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
      showSuccessToast(`Category ${newCategory ? 'updated' : 'removed'}!`);
    } catch (error: any) {
      console.error('Error updating category:', error);
      showErrorToast(`Failed to update category: ${error.message}`);
    }
  }, [currentUser, allCategories]);

  // Function to handle updating the task name (now called from TodoItemComponent)
  const handleUpdateTaskName = useCallback(async (todoId: string, newName: string) => {
    if (!currentUser) {
      showErrorToast('User not authenticated.');
      return;
    }
    const trimmedName = newName.trim();
    if (!trimmedName) {
      showErrorToast('Task name cannot be empty.');
      return;
    }
    try {
      const todoRef = doc(getUserCollectionRef("todoItems", currentUser.uid), todoId);
      await setDoc(todoRef, { name: trimmedName }, { merge: true });
      showSuccessToast('Task name updated!');
    } catch (error: any) {
      console.error('Error updating task name:', error);
      showErrorToast(`Failed to update task name: ${error.message}`);
    }
  }, [currentUser]);

  // Function to clone a To-Do item
  const handleCloneTodo = useCallback(async (todo: TodoItem) => {
    if (!currentUser) {
      showErrorToast('You must be logged in to clone a To-Do item.');
      return;
    }
    if (!selectedListId) {
      showErrorToast('Cannot clone task: no list selected.');
      return;
    }

    // Adjust createdAt to ensure unique order or slight delay for Firestore order
    const newCreatedAt = new Date(todo.createdAt.getTime() + 1);
    const maxOrderIndex = todoItems.length > 0 ? Math.max(...todoItems.map(item => item.orderIndex)) : -1;

    const clonedTodo: Omit<TodoItem, 'id'> = {
      name: `Clone of ${todo.name}`,
      deadline: todo.deadline || null,
      startDate: todo.startDate || null,
      endDate: todo.endDate || null,
      note: todo.note || null,
      category: todo.category || null,
      contactId: todo.contactId || null,
      isCompleted: false,
      userId: currentUser.uid,
      createdAt: newCreatedAt,
      orderIndex: maxOrderIndex + 1,
      listId: selectedListId, // Cloned item goes to the currently selected list
      completedAt: null,
      justUpdated: false,
      assignedTo: todo.assignedTo || null,
      assignedBy: todo.assignedBy || null,
      assignedAt: todo.assignedAt || null,
      notificationRead: false
    };

    try {
      const docRef = await addDoc(getUserCollectionRef("todoItems", currentUser.uid), {
        ...clonedTodo,
        createdAt: clonedTodo.createdAt, // Ensure Firestore Timestamp conversion
      });
      showSuccessToast('To-do item cloned successfully!');
      
      // Trigger green flash animation for the cloned item
      if (docRef.id) {
        setTodoItems(prevItems =>
          prevItems.map(item =>
            item.id === docRef.id ? { ...item, justUpdated: true } : item
          )
        );
        setTimeout(() => {
          setTodoItems(prevItems =>
            prevItems.map(item =>
              item.id === docRef.id ? { ...item, justUpdated: false } : item
            )
          );
        }, 1000);
      }
    } catch (error: any) {
      console.error('Error cloning To-do item:', error);
      showErrorToast(`Failed to clone To-do item: ${error.message}`);
    }
  }, [currentUser, selectedListId, todoItems]);

  // Function to delete a To-Do item
  const handleDeleteTodo = useCallback(async (todoId: string) => {
    if (!currentUser) {
      showErrorToast('You must be logged in to delete a To-Do item.');
      return;
    }
    try {
      await deleteDoc(doc(getUserCollectionRef("todoItems", currentUser.uid), todoId));
      showSuccessToast('To-do item deleted successfully!');
    } catch (error: any) {
      console.error('Error deleting To-Do item:', error);
      showErrorToast(`Failed to delete To-Do item: ${error.message}`);
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
        ? (targetListItemsSnapshot.docs[0].data() as any).orderIndex
        : -1;

      await updateDoc(todoRef, {
        listId: targetListId,
        orderIndex: maxOrderIndexInTarget + 1, // Place at the end of the new list
      });
      showSuccessToast('To-do item moved successfully!');
    } catch (error) {
      if (error instanceof Error) {
        console.error("Error moving todo item:", error.message);
        showErrorToast("Failed to move to-do item: " + error.message);
      } else {
        console.error("Error moving todo item:", error as unknown);
        showErrorToast("Failed to move to-do item.");
      }
    } finally {
      setShowMoveTaskModal(false);
      setTaskToMove(null);
    }
  }, [currentUser?.uid]);


  // Function to handle sort option selection
  const handleSortOptionSelect = useCallback((option: 'myOrder' | 'date' | 'title' | 'date-desc' | 'title-desc') => {
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
    console.log('🎯 Drag start for todo:', id);
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
    e.stopPropagation(); // Prevent event bubbling

    if (dragOverTodoId) {
      const prevDragOverElement = document.getElementById(`todo-item-${dragOverTodoId}`);
      if (prevDragOverElement) {
        prevDragOverElement.classList.remove('bg-[#EBE3DD]');
      }
    }

    if (!draggedTodoId) {
    setDropIndicatorPosition({ id: null, position: null });
    setDraggedTodoId(null);
    setDragOverTodoId(null);
      return;
    }

    setDropIndicatorPosition({ id: null, position: null });
    setDraggedTodoId(null);
    setDragOverTodoId(null);

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
      showSuccessToast('To-do item reordered!');
      // Trigger green flash animation for the reordered task
      triggerJustUpdated(draggedTodoId);
    } catch (error: any) {
      console.error('Error reordering To-do item:', error);
      showErrorToast(`Failed to reorder To-do item: ${error.message}`);
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
      showErrorToast('You must be logged in to clone a list.');
      return;
    }
    // Check if cloning would exceed the list limit
    if (todoLists.length >= STARTER_TIER_MAX_LISTS) {
      setShowUpgradeModal(true);
      return;
    }
    const listToClone = todoLists.find(list => list.id === listId);
    if (!listToClone) {
      showErrorToast('List not found.');
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
        const data = taskDoc.data() as any;
        maxOrderIndex = Math.max(maxOrderIndex, data.orderIndex || 0);
      });
      let orderIndex = maxOrderIndex + 1;
      tasksSnapshot.forEach(taskDoc => {
        const data = taskDoc.data() as any;
        const dataObj = typeof data === 'object' && data !== null ? data : {};
        const newTaskRef = doc(getUserCollectionRef("todoItems", currentUser.uid));
        batch.set(newTaskRef, {
          ...dataObj,
          listId: docRef.id,
          createdAt: new Date(),
          orderIndex: orderIndex++,
        });
      });
      await batch.commit();
      showSuccessToast(`List "${newName}" and its tasks cloned!`);
      setSelectedListId(docRef.id); // Navigate to the new list
    } catch (error: any) {
      console.error('Error cloning list:', error);
      showErrorToast(`Failed to clone list: ${error.message}`);
    }
  }, [currentUser, todoLists]);

  // Compute the true all-incomplete-tasks count for All To-Do
  const allTodoCount = React.useMemo(() => {
    return todoItems.filter(item => !item.isCompleted).length;
  }, [todoItems]);

  return (
    <div className="flex w-full h-full rounded-[5px] border border-[#AB9C95] overflow-hidden"
      style={{ maxHeight: '100%' }}
    >
      {/*
      Vertical Navigation (Icons) - Main Panel Switcher - Left Column of Right Panel
      <div className="hidden md:flex flex-col bg-[#F3F2F0] p-2 border-r border-[#AB9C95] space-y-2 flex-shrink-0 w-[60px]"> 
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
      */}

      {/* Content Area for Right Panel - Right Column of Right Panel */}
      {
      <aside
        className="flex-1 bg-white overflow-y-auto w-full"
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
            newListInputRef={newListInputRef as React.RefObject<HTMLInputElement>}
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
            sortMenuRef={sortMenuRef as React.RefObject<HTMLDivElement>}
            handleSortOptionSelect={handleSortOptionSelect}
            showAddTaskDropdown={showAddTaskDropdown}
            setShowAddTaskDropdown={setShowAddTaskDropdown}
            addTaskDropdownRef={addTaskDropdownRef as React.RefObject<HTMLDivElement>}
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
            handleDrop={handleListDrop}
            newlyAddedTodoItems={newlyAddedTodoItems}
            showCompletedTasks={showCompletedTasks}
            setShowCompletedTasks={setShowCompletedTasks}
            router={router}
            setShowUpgradeModal={setShowUpgradeModal}
            allTodoCount={allTodoCount}
            itemRefs={itemRefs}
            highlightedItemId={highlightedItemId}
            justMovedItemId={justMovedItemId}
            onMoveTodoItem={handleMoveTodoItem}
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
