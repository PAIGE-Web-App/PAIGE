"use client";

// IMPORTS FROM REACT AND NEXT.JS LIBS
import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";


// FIREBASE IMPORTS
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
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
  getDoc,
} from 'firebase/firestore';
import { getUserCollectionRef } from '@/lib/firebase';
import { getAllCategories, saveCategoryIfNew } from '@/lib/firebaseCategories';

// UI COMPONENT IMPORTS (from components/ folder)
import TopNav from '@/components/TopNav';
import Banner from '@/components/Banner';
import BottomNavBar from '@/components/BottomNavBar';


// TODO-SPECIFIC COMPONENT IMPORTS (from components/ folder)
import TodoItemComponent from '@/components/TodoItemComponent';
import ListMenuDropdown from '@/components/ListMenuDropdown'; // Ensure this is the unchanged version
import MoveTaskModal from '@/components/MoveTaskModal';
import DeleteListConfirmationModal from '@/components/DeleteListConfirmationModal';
import UpgradePlanModal from '@/components/UpgradePlanModal';
import CategoryPill from '@/components/CategoryPill';
import CategorySelectField from '@/components/CategorySelectField';
import WeddingBanner from '@/components/WeddingBanner';

// ICON IMPORTS
import { Plus, MoreHorizontal, Filter, ChevronRight, CircleCheck, ChevronDown, ChevronUp } from 'lucide-react';

// HOOKS IMPORTS (from hooks/ folder)
import { useCustomToast } from '@/hooks/useCustomToast';

// UTILS IMPORTS (from utils/ folder)
import { getCategoryStyle } from '@/utils/categoryStyle';

import type { TodoItem, TodoList } from '../../types/todo';

const STARTER_TIER_MAX_LISTS = 3; // Example tier limit

// Utility to remove undefined fields from an object
function removeUndefinedFields<T extends object>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([_, v]) => v !== undefined)
  );
}

// Utility to parse a yyyy-MM-ddTHH:mm string as a local Date
function parseLocalDateTime(input: string): Date {
  if (typeof input !== 'string') return new Date(NaN);
  const [datePart, timePart] = input.split('T');
  const [year, month, day] = datePart.split('-').map(Number);
  const [hour = 17, minute = 0] = (timePart ? timePart.split(':').map(Number) : [17, 0]);
  return new Date(year, month - 1, day, hour, minute, 0, 0);
}

// Utility to force a Date to local midnight
function forceLocalMidnight(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
}

export default function TodoPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { showSuccessToast, showErrorToast, showInfoToast } = useCustomToast();
  const searchParams = useSearchParams();

  // Add state for wedding date
  const [daysLeft, setDaysLeft] = useState<number | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [minLoadTimeReached, setMinLoadTimeReached] = useState(false);
  const [isDataReady, setIsDataReady] = useState(false);

  // Add useEffect to fetch wedding date
  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) return;

      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();

        if (data.userName) {
          setUserName(data.userName);
        }

        if (data.weddingDate?.seconds) {
          const date = new Date(data.weddingDate.seconds * 1000);
          const today = new Date();
          const diffTime = date.getTime() - today.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          setDaysLeft(diffDays);
        } else {
          setDaysLeft(null);
        }
      }
    };

    if (!loading) {
      fetchUserData();
    }
  }, [user, loading]);

  // Add minimum loading time effect
  useEffect(() => {
    const timer = setTimeout(() => {
      setMinLoadTimeReached(true);
    }, 500); // 500ms minimum loading time

    return () => clearTimeout(timer);
  }, []);

  // Effect to set data ready state
  useEffect(() => {
    if (!loading && minLoadTimeReached) {
      setIsDataReady(true);
    }
  }, [loading, minLoadTimeReached]);

  // Only show content when both loading is complete AND minimum time has passed
  const isLoading = loading || !minLoadTimeReached;

  // State for adding new lists
  const [newListName, setNewListName] = useState('');
  const [todoLists, setTodoLists] = useState<TodoList[]>([]);
  const [selectedList, setSelectedList] = useState<TodoList | null>(null);

  // State for renaming lists
  const [editingListNameId, setEditingListNameId] = useState<string | null>(null);
  const [editingListNameValue, setEditingListNameValue] = useState<string | null>(null);

  // State for tasks within a list
  const [todoItems, setTodoItems] = useState<TodoItem[]>([]);
  const [newTaskName, setNewTaskName] = useState('');

  // Modals state
  const [showMoveTaskModal, setShowMoveTaskModal] = useState(false);
  const [taskToMove, setTaskToMove] = useState<TodoItem | null>(null);
  const [showDeleteListModal, setShowDeleteListModal] = useState(false);
  const [listToConfirmDelete, setListToConfirmDelete] = useState<TodoList | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showListLimitBanner, setShowListLimitBanner] = useState<boolean>(true);

  // Mobile navigation state
  const [activeMobileTab, setActiveMobileTab] = useState<'todo' | 'contacts' | 'messages'>('todo'); // Default active tab

  // --- NEW STATE & REFS FOR CENTRALIZED ListMenuDropdown ---
  const [openListMenuId, setOpenListMenuId] = useState<string | null>(null);
  const [selectedTodoListForMenu, setSelectedTodoListForMenu] = useState<TodoList | null>(null);
  const listMenuButtonRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  // --- END NEW STATE & REFS ---

  // Add state for categories
  const [allCategories, setAllCategories] = useState<string[]>([]);

  // Add useEffect to fetch categories
  useEffect(() => {
    if (user) {
      const fetchCategories = async () => {
        const categories = await getAllCategories(user.uid);
        setAllCategories(categories);
      };
      fetchCategories();
    }
  }, [user]);

  // Add state for task counts
  const [listTaskCounts, setListTaskCounts] = useState<Map<string, number>>(new Map());

  // Add a master allTodoItems state
  const [allTodoItems, setAllTodoItems] = useState<TodoItem[]>([]);

  // 2. Fetch all to-dos for the user ONCE (not per-list)
  useEffect(() => {
    if (!user) return;
    const q = query(
      getUserCollectionRef('todoItems', user.uid),
      orderBy('orderIndex', 'asc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: TodoItem[] = snapshot.docs.map(doc => {
        const data = doc.data() as any;
        let deadline = data.deadline;
        if (deadline && typeof deadline.toDate === 'function') {
          deadline = deadline.toDate();
        } else if (deadline instanceof Date) {
          // already a Date
        } else {
          deadline = undefined;
        }
        return {
          id: doc.id,
          listId: data.listId,
          name: data.name,
          isCompleted: data.isCompleted || false,
          category: data.category,
          createdAt: data.createdAt && typeof data.createdAt.toDate === 'function' ? data.createdAt.toDate() : (data.createdAt instanceof Date ? data.createdAt : new Date()),
          userId: data.userId,
          orderIndex: data.orderIndex || 0,
          deadline,
          note: data.note || undefined,
          contactId: data.contactId,
          completedAt: data.completedAt && typeof data.completedAt.toDate === 'function' ? data.completedAt.toDate() : (data.completedAt instanceof Date ? data.completedAt : undefined)
        };
      });
      setAllTodoItems(items);
    });
    return () => unsubscribe();
  }, [user]);

  // 3. Filter todoItems for display based on selectedList
  useEffect(() => {
    if (!selectedList) {
      setTodoItems(allTodoItems);
    } else {
      setTodoItems(allTodoItems.filter(item => item.listId === selectedList.id));
    }
  }, [allTodoItems, selectedList]);

  // 4. Calculate counts from allTodoItems
  useEffect(() => {
    if (!user) return;
    const counts = new Map<string, number>();
    allTodoItems.forEach(item => {
      const currentCount = counts.get(item.listId) || 0;
      counts.set(item.listId, currentCount + 1);
    });
    setListTaskCounts(counts);
  }, [allTodoItems, user]);

  const allTodoCount = allTodoItems.length;

  // Handle mobile tab change
  const handleMobileTabChange = useCallback((tab: string) => {
    setActiveMobileTab(tab as 'todo' | 'contacts' | 'messages');
    if (tab === 'dashboard') {
      router.push('/');
    }
    // No explicit push for 'todo' as it's the current page
  }, [router]);


  // Effect to manage selected list and fetch tasks
  useEffect(() => {
    if (!user) {
      if (!loading) {
        router.push('/login');
      }
      return;
    }

    console.log('User authenticated:', user.uid);
    const q = query(
      getUserCollectionRef('todoLists', user.uid),
      where('userId', '==', user.uid),
      orderBy('orderIndex', 'asc'),
      orderBy('createdAt', 'asc')
    );

    const unsubscribeLists = onSnapshot(q, (snapshot) => {
      const lists: TodoList[] = snapshot.docs.map(doc => {
        const data = doc.data() as {
          name: string;
          order: number;
          userId: string;
          createdAt: any;
          orderIndex: number;
        };
        return {
        id: doc.id,
          name: data.name,
          order: data.order || 0,
          userId: data.userId,
          createdAt: data.createdAt?.toDate() || new Date(),
          orderIndex: data.orderIndex || 0
        };
      });
      console.log('Fetched todo lists:', lists);
      setTodoLists(lists);

      if (todoLists.length > 0) {
        if (selectedList && todoLists.some(list => list.id === selectedList.id)) {
          // Keep current selection if it exists in the new list
          return;
        }
        if (!explicitAllSelected) {
          setSelectedList(todoLists[0]);
        }
        // If explicitAllSelected, do not auto-select
        } else {
          setSelectedList(null);
        }
    }, (error) => {
      console.error('Error fetching todo lists:', error);
    });

    return () => unsubscribeLists();
  }, [user, loading, router, selectedList]);


  // Handler for adding a new list
  const handleAddList = async () => {
    if (!user) {
      showErrorToast('You must be logged in to add a list.');
      return;
    }

    if (todoLists.length >= STARTER_TIER_MAX_LISTS) {
      setShowUpgradeModal(true);
      return;
    }

    try {
      const newListRef = await addDoc(getUserCollectionRef('todoLists', user.uid), {
        name: 'New List',
        order: todoLists.length,
        userId: user.uid,
        createdAt: new Date(),
        orderIndex: todoLists.length
      });
      showSuccessToast('New list added!');
      const newList = { 
        id: newListRef.id, 
        name: 'New List', 
        order: todoLists.length, 
        userId: user.uid,
        createdAt: new Date(),
        orderIndex: todoLists.length
      };
      setSelectedList(newList); // Select the new list
    } catch (error) {
      console.error('Error adding list:', error);
      showErrorToast('Failed to add list.');
    }
  };

  // Handler for renaming a list
  const handleUpdateListName = async (listId: string, newName: string) => {
    if (!user) return;
    if (newName.trim() === '') {
      showErrorToast('List name cannot be empty.');
      setEditingListNameValue(null); // Reset input if empty
      return;
    }
    try {
      const listRef = doc(db, `users/${user.uid}/todoLists`, listId);
      await updateDoc(listRef, { name: newName, userId: user.uid });
      showSuccessToast(`List renamed to "${newName}"!`);
      setEditingListNameId(null);
      setEditingListNameValue(null);
    } catch (error) {
      console.error('Error updating list name:', error);
      showErrorToast('Failed to rename list.');
    }
  };

  // Handler for deleting a list
  const executeDeleteList = async (listId: string) => {
    if (!user) return;
    try {
      const batch = writeBatch(db);
      // Delete all tasks in the list first
      const tasksQuery = query(collection(db, `users/${user.uid}/todoLists/${listId}/todoItems`));
      const tasksSnapshot = await getDocs(tasksQuery);
      tasksSnapshot.docs.forEach(taskDoc => {
        batch.delete(taskDoc.ref);
      });

      // Then delete the list itself
      const listRef = doc(db, `users/${user.uid}/todoLists`, listId);
      batch.delete(listRef);

      await batch.commit();
      showSuccessToast('List and its tasks deleted!');
      // Select the first list if available, otherwise null
      const updatedLists = todoLists.filter(list => list.id !== listId);
      if (updatedLists.length > 0) {
        setSelectedList(updatedLists[0]);
      } else {
        setSelectedList(null);
      }
    } catch (error) {
      console.error('Error deleting list:', error);
      showErrorToast('Failed to delete list.');
    }
  };

  // Handler for adding a new task
  const handleAddTask = async () => {
    if (!user || !selectedList) {
      showErrorToast('Please select a list.');
      return;
    }
    if (newTaskName.trim() === '') {
      showErrorToast('Task name cannot be empty.');
      return;
    }

    try {
      await addDoc(getUserCollectionRef('todoItems', user.uid), {
        name: newTaskName,
        isCompleted: false,
        order: todoItems.length,
        category: 'Personal', // Default category
        createdAt: new Date(),
        listId: selectedList.id,
        userId: user.uid,
        orderIndex: todoItems.length
      });
      showSuccessToast(`Task "${newTaskName}" added!`);
      setNewTaskName('');
    } catch (error) {
      console.error('Error adding task:', error);
      showErrorToast('Failed to add task.');
    }
  };

  // Handler for toggling task completion
  const handleToggleTodoCompletion = async (todo: TodoItem) => {
    if (!user) return;
    try {
      const updatedIsCompleted = !todo.isCompleted;
      // For Firestore, use null, but for our local state, use undefined
      const firestoreCompletedAt = updatedIsCompleted ? new Date() : null;
      const localCompletedAt = updatedIsCompleted ? new Date() : undefined;

      const todoRef = doc(getUserCollectionRef("todoItems", todo.userId), todo.id);
      await setDoc(todoRef, {
        isCompleted: updatedIsCompleted,
        completedAt: firestoreCompletedAt,
      }, { merge: true });

      // Optimistically update the local state without re-fetching all todos
      setAllTodoItems((prevTodoItems) =>
        prevTodoItems.map((item) =>
          item.id === todo.id
            ? { ...item, isCompleted: updatedIsCompleted, completedAt: localCompletedAt }
            : item
        )
      );
      setTodoItems((prevTodoItems) =>
        prevTodoItems.map((item) =>
          item.id === todo.id
            ? { ...item, isCompleted: updatedIsCompleted, completedAt: localCompletedAt }
            : item
        )
      );

      showSuccessToast(`Task "${todo.name}" ${updatedIsCompleted ? 'marked' : 'unmarked'} as complete!`);
    } catch (error) {
      console.error('Error toggling todo completion:', error);
      showErrorToast('Failed to update task.');
    }
  };

  // Handler for updating task name
  const handleUpdateTodoName = async (todoId: string, newName: string) => {
    if (!user) return;
    if (newName.trim() === '') {
      showErrorToast('Task name cannot be empty.');
      return;
    }
    try {
      const itemRef = doc(getUserCollectionRef("todoItems", user.uid), todoId);
      await updateDoc(itemRef, { name: newName, userId: user.uid });
      showSuccessToast(`Task renamed to "${newName}"!`);
    } catch (error) {
      console.error('Error updating todo name:', error);
      showErrorToast('Failed to rename task.');
    }
  };

  // Handler for updating task category
  const handleUpdateTodoCategory = async (todoId: string, newCategory: string) => {
    if (!user) return;
    try {
      const itemRef = doc(getUserCollectionRef("todoItems", user.uid), todoId);
      if (newCategory && !allCategories.includes(newCategory)) {
        await saveCategoryIfNew(newCategory, user.uid);
      }
      await updateDoc(itemRef, { category: newCategory, userId: user.uid });
      showSuccessToast(`Category updated to "${newCategory}"!`);
    } catch (error) {
      console.error('Error updating todo category:', error);
      showErrorToast('Failed to update category.');
    }
  };

  // Handler for deleting a task
  const handleDeleteTodoItem = async (todoId: string) => {
    if (!user) return;
    try {
      const itemRef = doc(getUserCollectionRef("todoItems", user.uid), todoId);
      await deleteDoc(itemRef);
      showSuccessToast('Task deleted!');
    } catch (error) {
      console.error('Error deleting todo item:', error);
      showErrorToast('Failed to delete task.');
    }
  };

  // Handler for cloning a todo item
  const handleCloneTodo = async (todo: TodoItem) => {
    if (!user) return;
    try {
      const { id, ...rest } = todo;
      const sanitized = removeUndefinedFields({
        ...rest,
        name: `${todo.name} (Clone)`,
        orderIndex: todoItems.length, // Add to the end
        createdAt: new Date(),
        userId: user.uid,
      });
      await addDoc(getUserCollectionRef("todoItems", user.uid), sanitized);
      showSuccessToast(`Task "${todo.name}" cloned!`);
    } catch (error) {
      console.error('Error cloning todo item:', error);
      showErrorToast('Failed to clone task.');
    }
  };

  // Handler for moving a todo item between lists
  const handleMoveTodoItem = async (taskId: string, currentListId: string, targetListId: string) => {
    if (!user) return;
    try {
      // 1. Get the task from its current location
      const taskRef = doc(getUserCollectionRef("todoItems", user.uid), taskId);
      const taskDoc = await getDoc(taskRef);

      if (!taskDoc.exists()) {
        showErrorToast('Task not found.');
        return;
      }

      const taskData = taskDoc.data() as TodoItem;

      const batch = writeBatch(db);

      // 2. Add a new document to the target list
      const newTaskRef = doc(getUserCollectionRef("todoItems", user.uid));
      batch.set(newTaskRef, {
        ...taskData,
        listId: targetListId, // Update listId to the new target
        order: todoItems.length, // Add to the end of the target list
        userId: user.uid,
      });

      // 3. Delete the original document
      batch.delete(taskRef);

      await batch.commit();
      showSuccessToast(`Task "${taskData.name}" moved!`);
      // Update selectedList if the current view list was changed due to move
      if (selectedList?.id === currentListId) {
        // This will trigger re-fetch of todoItems for current list
        setSelectedList(selectedList);
      } else if (selectedList?.id === targetListId) {
        setSelectedList(selectedList);
      }
      setShowMoveTaskModal(false); // Close the modal after move
    } catch (error) {
      console.error('Error moving todo item:', error);
      showErrorToast('Failed to move task.');
    }
  };

  // State for filter dropdown
  const [showFilters, setShowFilters] = useState(false);
  const filterButtonRef = useRef<HTMLButtonElement>(null);

  // Accordion state for each group
  const [openGroups, setOpenGroups] = useState<{ [key: string]: boolean }>({});

  // Helper to get the group for a given deadline
  function getTaskGroup(deadline?: Date): string {
    if (!deadline) return 'No date yet';
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const d = new Date(deadline.getFullYear(), deadline.getMonth(), deadline.getDate());
    const diffDays = Math.floor((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return 'Overdue';
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays <= 7) return 'This Week';
    if (diffDays <= 14) return 'Next Week';
    if (diffDays <= 30) return 'This Month';
    if (diffDays <= 60) return 'Next Month';
    return 'Later';
  }

  // Group tasks
  const groupedTasks = useMemo(() => {
    const groups: { [key: string]: TodoItem[] } = {};
    todoItems.forEach(item => {
      const group = getTaskGroup(item.deadline);
      if (!groups[group]) groups[group] = [];
      groups[group].push(item);
    });

    // Sort tasks within each group by deadline
    Object.keys(groups).forEach(group => {
      groups[group].sort((a, b) => {
        if (!a.deadline) return 1; // Move items without deadline to the end
        if (!b.deadline) return -1;
        return a.deadline.getTime() - b.deadline.getTime();
      });
    });

    // Define the order of groups
    const groupOrder = [
      'Overdue',
      'Today',
      'Tomorrow',
      'This Week',
      'Next Week',
      'This Month',
      'Next Month',
      'Later',
      'No date yet'
    ];

    // Create a new object with ordered groups
    const orderedGroups: { [key: string]: TodoItem[] } = {};
    groupOrder.forEach(group => {
      if (groups[group]) {
        orderedGroups[group] = groups[group];
      }
    });

    return orderedGroups;
  }, [todoItems]);

  // Toggle accordion
  const toggleGroup = (group: string) => {
    setOpenGroups(prev => ({ ...prev, [group]: !prev[group] }));
  };

  // Handler for updating task deadline
  const handleUpdateTodoDeadline = async (todoId: string, deadline: string | null) => {
    if (!user) return;
    try {
      console.log('handleUpdateTodoDeadline called with:', todoId, deadline);
      const itemRef = doc(getUserCollectionRef("todoItems", user.uid), todoId);
      let deadlineDate: Date | null = null;
      if (deadline && typeof deadline === 'string') {
        deadlineDate = parseLocalDateTime(deadline);
        if (isNaN(deadlineDate.getTime())) {
          throw new Error('Invalid date string');
        }
      }
      console.log('Saving deadline as Date:', deadlineDate);
      await updateDoc(itemRef, {
        deadline: deadlineDate,
        userId: user.uid
      });
      showSuccessToast('Deadline updated!');
      // Debug: fetch the updated doc
      const updatedDoc = await getDoc(itemRef);
      console.log('Updated Firestore doc deadline:', updatedDoc.data()?.deadline);
    } catch (error) {
      console.error('Error updating deadline:', error);
      showErrorToast('Failed to update deadline.');
    }
  };

  // Handler for updating task note
  const handleUpdateTodoNote = async (todoId: string, newNote: string | null) => {
    if (!user) return;
    try {
      const itemRef = doc(getUserCollectionRef("todoItems", user.uid), todoId);
      await updateDoc(itemRef, { 
        note: newNote,
        userId: user.uid 
      });
      showSuccessToast('Note updated!');
    } catch (error) {
      console.error('Error updating note:', error);
      showErrorToast('Failed to update note.');
    }
  };

  // --- Drag and Drop State ---
  const [draggedTodoId, setDraggedTodoId] = useState<string | null>(null);
  const [dragOverTodoId, setDragOverTodoId] = useState<string | null>(null);
  const [dropIndicatorPosition, setDropIndicatorPosition] = useState<{ id: string | null, position: 'top' | 'bottom' | null }>({ id: null, position: null });

  // Helper function to reorder an array
  const reorder = (list: TodoItem[], startIndex: number, endIndex: number): TodoItem[] => {
    const result = Array.from(list);
    const [removed] = result.splice(startIndex, 1);
    result.splice(endIndex, 0, removed);
    return result;
  };

  const handleDragStart = useCallback((e: React.DragEvent<HTMLDivElement>, id: string) => {
    console.log('Drag start:', id);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedTodoId(id);
    e.currentTarget.classList.add('opacity-50', 'border-dashed', 'border-2', 'border-[#A85C36]');
  }, []);

  const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>, id: string) => {
    e.preventDefault();
    console.log('Drag enter:', id);
    if (draggedTodoId !== id) {
      setDragOverTodoId(id);
    }
  }, [draggedTodoId]);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    console.log('Drag leave');
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

  const handleDragEnd = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    console.log('Drag end');
    e.preventDefault();
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

  const handleListDrop = useCallback(async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!draggedTodoId || !user) return;

    const draggedTask = todoItems.find(item => item.id === draggedTodoId);
    if (!draggedTask) return;

    const targetTask = dropIndicatorPosition.id ? todoItems.find(item => item.id === dropIndicatorPosition.id) : null;
    let newDeadline: Date | null = null;

    if (targetTask) {
      // If dropping above a task
      if (dropIndicatorPosition.position === 'top') {
        if (targetTask.deadline) {
          // Set deadline to one day before the target task
          newDeadline = new Date(targetTask.deadline);
          newDeadline.setDate(newDeadline.getDate() - 1);
        }
      } else {
        // If dropping below a task
        if (targetTask.deadline) {
          // Set deadline to one day after the target task
          newDeadline = new Date(targetTask.deadline);
          newDeadline.setDate(newDeadline.getDate() + 1);
        }
      }
    } else {
      // If dropping at the end of a group
      const group = getTaskGroup(draggedTask.deadline);
      const groupTasks = todoItems.filter(item => getTaskGroup(item.deadline) === group);
      if (groupTasks.length > 0) {
        const lastTask = groupTasks[groupTasks.length - 1];
        if (lastTask.deadline) {
          // Set deadline to one day after the last task in the group
          newDeadline = new Date(lastTask.deadline);
          newDeadline.setDate(newDeadline.getDate() + 1);
        }
      }
    }

    console.log('New deadline:', newDeadline);

    try {
      const itemRef = doc(getUserCollectionRef("todoItems", user.uid), draggedTodoId);
      await updateDoc(itemRef, { 
        deadline: newDeadline,
        userId: user.uid 
      });
      console.log('Update successful');
      showSuccessToast('Task reordered!');
      
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
    } catch (error) {
      console.error('Error reordering task:', error);
      showErrorToast('Failed to reorder task.');
    }

    // Reset drag state
    setDraggedTodoId(null);
    setDragOverTodoId(null);
    setDropIndicatorPosition({ id: null, position: null });
  }, [draggedTodoId, dropIndicatorPosition, todoItems, user, showSuccessToast, showErrorToast]);

  // Add wrapper for handleRenameList
  const handleRenameList = async (listId: string) => {
    // Use the current editingListNameValue as the new name
    if (editingListNameValue !== null) {
      await handleUpdateListName(listId, editingListNameValue);
    }
  };

  // Add wrapper for handleMoveTodoItem to match the expected signature
  const handleMoveTaskModal = async (taskId: string, targetListId: string) => {
    if (!user) return;
    try {
      const taskRef = doc(getUserCollectionRef("todoItems", user.uid), taskId);
      const taskDoc = await getDoc(taskRef);

      if (!taskDoc.exists()) {
        showErrorToast('Task not found.');
        return;
      }

      const taskData = taskDoc.data() as TodoItem;
      await updateDoc(taskRef, {
        listId: targetListId,
        userId: user.uid
      });
      showSuccessToast(`Task "${taskData.name}" moved!`);
      setShowMoveTaskModal(false);
    } catch (error) {
      console.error('Error moving todo item:', error);
      showErrorToast('Failed to move task.');
    }
  };

  // Check if the user has reached the list limit
  const willReachListLimit = todoLists.length >= STARTER_TIER_MAX_LISTS;

  // Add a logout handler for TopNav
  const handleLogout = async () => {
    try {
      const { getAuth, signOut } = await import('firebase/auth');
      const auth = getAuth();
      await signOut(auth);
      // Call the server-side logout to clear the HttpOnly cookie
      await fetch('/api/sessionLogout', { method: 'POST' });
      console.log('Redirecting to /login...');
      window.location.replace('/login');
    } catch (error) {
      console.error('todo/page.tsx: Error signing out:', error);
      showErrorToast(`Failed to log out: ${(error as Error).message}`);
    }
  };

  // Add this with other useState imports
  const [explicitAllSelected, setExplicitAllSelected] = useState(false);

  useEffect(() => {
    if (searchParams && searchParams.get('all') === '1') {
      setSelectedList(null);
      setExplicitAllSelected(true);
    }
  }, [searchParams]);

  // Add new state for showNewListInput
  const [showNewListInput, setShowNewListInput] = useState(false);

  // Add state for completed tasks toggle
  const [showCompletedTasks, setShowCompletedTasks] = useState(false);

  if (loading) {
  return (
      <div className="flex flex-col min-h-screen bg-linen">
        <TopNav 
          userName={user?.displayName || user?.email || 'Guest'} 
          userId={user?.uid || null} 
          onLogout={handleLogout}
          isLoading={true}
        />
        <WeddingBanner
          daysLeft={null}
          userName={null}
          isLoading={true}
          onSetWeddingDate={() => {}}
        />
        <div className="flex-1 flex items-center justify-center">
          <div className="w-12 h-12 border-4 border-[#A85C36] border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  // If not loading and no user, just return null (middleware will redirect)
  if (!user) {
    return null;
  }

  return (
    <div className="flex flex-col min-h-screen bg-linen">
      <TopNav 
        userName={user?.displayName || user?.email || 'Guest'} 
        userId={user?.uid || null} 
        onLogout={handleLogout}
        isLoading={isLoading}
      />
      <div className="bg-[#332B42] text-white text-center py-2 font-playfair text-sm tracking-wide px-4">
        {isLoading ? (
          <div className="animate-pulse">
            <div className="h-4 bg-[#4A3F5C] rounded w-48 mx-auto"></div>
          </div>
        ) : daysLeft !== null ? (
          `${daysLeft} day${daysLeft !== 1 ? "s" : ""} until the big day!`
        ) : userName ? (
          <>
            Welcome back, {userName}. Have y'all decided your wedding date?
            <button
              onClick={() => {
                // Placeholder for setting wedding date
              }}
              className="ml-2 underline text-[#F3F2F0] hover:text-[#E0DBD7] text-sm"
            >
              Set it now
            </button>
          </>
        ) : (
          "Welcome back! Have y'all decided your wedding date?"
        )}
      </div>
      <div className="flex justify-center items-start w-full bg-linen p-4 h-screen box-border">
         <div className="w-full flex flex-row h-full max-h-screen overflow-hidden border border-[#AB9C95] border-[0.5px] rounded-[5px] bg-white">
          {/* Sidebar */}
          <aside className="w-[320px] bg-[#F3F2F0] border-r border-[#E0DBD7] flex flex-col justify-between min-h-full p-0">
            <div className="flex-1 flex flex-col">
              <div className="p-6 pb-2 border-b border-[#E0DBD7] flex items-center justify-between">
                <h4 className="text-lg font-playfair font-medium text-[#332B42] mb-4">To-do Lists</h4>
                {showNewListInput ? (
                  <div className="flex items-center gap-2 ml-2">
                    <input
                      type="text"
                      value={newListName}
                      onChange={e => setNewListName(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleAddList();
                        if (e.key === 'Escape') { setShowNewListInput(false); setNewListName(''); }
                      }}
                      placeholder="List name"
                      className="text-xs border border-[#AB9C95] rounded-[5px] px-2 py-1 w-28 focus:outline-none focus:ring-1 focus:ring-[#A85C36]"
                      autoFocus
                    />
                    <button onClick={handleAddList} className="btn-primary text-xs px-3 py-1">Add</button>
                    <button onClick={() => { setShowNewListInput(false); setNewListName(''); }} className="btn-primary-inverse text-xs px-3 py-1">Cancel</button>
              </div>
            ) : (
                  <button
                    onClick={handleAddList}
                    className="btn-primary-inverse px-2 py-1 text-xs font-medium rounded-full whitespace-nowrap transition-colors ml-2"
                    title="Create a new list"
                  >
                    + New List
                  </button>
                )}
              </div>
              {/* Add padding wrapper for All To-Do Items and lists */}
              <div className="p-6 pt-0">
                <div className="space-y-1">
                  {/* All To-Do Items filter at the top */}
                  <div
                    className={`flex items-center px-3 py-2 rounded-[5px] text-[#332B42] text-sm font-medium cursor-pointer ${!selectedList ? 'bg-[#EBE3DD] border border-[#A85C36]' : 'hover:bg-[#F8F6F4] border border-transparent hover:border-[#AB9C95]'} mt-4 mb-6`}
                    onClick={() => { setSelectedList(null); setExplicitAllSelected(true); }}
                  >
                    <span className="mr-2" title="All To-Do Items">
                      <CircleCheck size={16} className="inline-block align-middle text-[#A85C36]" />
                    </span>
                    <span>All To-Do Items</span>
                    <span className="ml-auto text-xs text-[#7A7A7A] bg-[#EBE3DD] px-1.5 py-0.5 rounded-full font-work">{allTodoCount}</span>
                  </div>
                  {/* More vertical space before divider/label for lists */}
                  <div className="my-8 flex items-center gap-2">
                    <span className="text-xs text-[#AB9C95] uppercase tracking-wider font-semibold">Your Lists</span>
                    <div className="flex-1 h-px bg-[#E0DBD7]"></div>
                  </div>
                  {/* User's lists */}
                {todoLists.map((list) => (
                  <div
                    key={list.id}
                    onClick={() => setSelectedList(list)}
                      className={`px-3 py-2 rounded-[5px] text-[#332B42] text-sm font-medium cursor-pointer ${selectedList?.id === list.id ? 'bg-[#EBE3DD] border border-[#A85C36]' : 'hover:bg-[#F8F6F4] border border-transparent hover:border-[#AB9C95]'}`}
                  >
                    <div className="flex items-center justify-between">
                        <span>{list.name}</span>
                        {listTaskCounts.has(list.id) && (
                          <span className="ml-2 text-xs text-[#7A7A7A] bg-[#EBE3DD] px-1.5 py-0.5 rounded-full">{listTaskCounts.get(list.id)}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </aside>

          {/* Sticky Top Bar - moved outside main */}
          <div className="flex-1 flex flex-col min-h-full">
            <div className="sticky top-0 z-20 bg-[#F3F2F0] border-b-[0.5px] border-b-[var(--border-color)] w-full">
              <div className="flex items-center gap-4 px-4 py-4">
                {selectedList ? (
                  <div className="flex items-center min-w-[200px]">
                    {editingListNameId === selectedList.id ? (
                        <input
                          type="text"
                        value={editingListNameValue || selectedList.name}
                          onChange={(e) => setEditingListNameValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                            handleUpdateListName(selectedList.id, editingListNameValue || selectedList.name);
                          }
                          if (e.key === 'Escape') {
                                setEditingListNameId(null);
                                setEditingListNameValue(null);
                            }
                          }}
                        onBlur={() => {
                          handleUpdateListName(selectedList.id, editingListNameValue || selectedList.name);
                        }}
                        className="text-base font-playfair font-medium text-[#332B42] bg-transparent border-b border-[var(--border-color)] focus:outline-none focus:border-[#A85C36] px-1 py-0.5"
                          autoFocus
                        />
                      ) : (
                      <h5 
                        onClick={() => {
                          setEditingListNameId(selectedList.id);
                          setEditingListNameValue(selectedList.name);
                        }}
                        className="font-playfair font-medium text-[#332B42] cursor-pointer hover:text-[#A85C36] transition-colors"
                      >
                        {selectedList.name}
                      </h5>
                    )}
                    </div>
                ) : (
                  <div className="min-w-[200px]">
                    <h5 className="font-playfair font-medium text-[#332B42]">All To-do Items</h5>
              </div>
            )}
            <input
              type="text"
                  placeholder="Search for a To-do Item"
                  className="flex-1 px-4 py-2 border border-[#D6D3D1] rounded-[5px] bg-white text-sm focus:outline-none focus:border-[#A85C36]"
                />
                <button className="btn-secondary">
                  List View
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><path d="M7 10l5 5 5-5" stroke="#F3F2F0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </button>
                <button className="btn-primary">
                  + New To-do Item
                </button>
              </div>
            </div>
            <main className="flex-1 flex flex-col min-h-full bg-white p-4 pb-0">
              {/* Grouped To-do Items by Relative Date */}
              <div className="flex-1 min-h-0 overflow-y-auto">
                {Object.entries(groupedTasks).length === 0 && (
                  <div className="text-sm text-gray-500 text-center py-4">No tasks yet. Add one!</div>
                )}
                {Object.entries(groupedTasks).map(([group, items]) => {
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
                        {incompleteItems.map((item, index) => {
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
                                handleToggleTodoComplete={handleToggleTodoCompletion}
                                handleUpdateTaskName={handleUpdateTodoName}
                                handleUpdateDeadline={handleUpdateTodoDeadline}
                                handleUpdateNote={handleUpdateTodoNote}
                                handleUpdateCategory={handleUpdateTodoCategory}
                                handleCloneTodo={handleCloneTodo}
                                handleDeleteTodo={handleDeleteTodoItem}
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
                })}
              </div>
              {/* COMPLETED TASKS SECTION - Sticky at the bottom */}
              {todoItems.some(item => item.isCompleted) && (
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
                                handleToggleTodoComplete={handleToggleTodoCompletion}
                                handleUpdateTaskName={handleUpdateTodoName}
                                handleUpdateDeadline={handleUpdateTodoDeadline}
                                handleUpdateNote={handleUpdateTodoNote}
                                handleUpdateCategory={handleUpdateTodoCategory}
                                handleCloneTodo={handleCloneTodo}
                                handleDeleteTodo={handleDeleteTodoItem}
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
          </div>
        </div>
      </div>

      {showMoveTaskModal && taskToMove && (
        <MoveTaskModal
          task={taskToMove}
          todoLists={todoLists}
          currentListId={taskToMove.listId}
          onMove={handleMoveTaskModal}
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

      {/* --- CENTRALIZED ListMenuDropdown RENDERING --- */}
      {openListMenuId && selectedTodoListForMenu && (
        <ListMenuDropdown
          list={selectedTodoListForMenu}
          handleRenameList={handleRenameList}
          handleDeleteList={executeDeleteList}
          setEditingListNameId={setEditingListNameId}
          setEditingListNameValue={setEditingListNameValue}
          setOpenListMenuId={setOpenListMenuId}
          buttonRef={{ current: listMenuButtonRefs.current.get(openListMenuId) || null }}
        />
      )}
      {/* --- END CENTRALIZED RENDERING --- */}

      {/* Assuming isMobile and handleMobileTabChange are defined or passed via context */}
      {/* Example for isMobile and handleMobileTabChange, define these in your component as needed */}
      {/* const isMobile = window.innerWidth < 768; // Or use a hook */}
      {/* const [activeMobileTab, setActiveMobileTab] = useState('todo'); */}

      {/* Render BottomNavBar only on mobile and if user is logged in */}
      {user && ( // Check if user is logged in
        <BottomNavBar activeTab={activeMobileTab} onTabChange={handleMobileTabChange} />
      )}

    </div>
  );
}