"use client";

// IMPORTS FROM REACT AND NEXT.JS LIBS
import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import Fuse from 'fuse.js';


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
import TaskSideCard from '../../components/TaskSideCard';
import TodoSidebar from '../../components/TodoSidebar';
import TodoTopBar from '../../components/TodoTopBar';
import TodoListView from '../../components/TodoListView';
import CalendarView from '../../components/CalendarView';

// ICON IMPORTS
import { Plus, MoreHorizontal, Filter, ChevronRight, CircleCheck, ChevronDown, ChevronUp, Pencil, ListChecks } from 'lucide-react';

// HOOKS IMPORTS (from hooks/ folder)
import { useCustomToast } from '@/hooks/useCustomToast';

// UTILS IMPORTS (from utils/ folder)
import { getCategoryStyle } from '@/utils/categoryStyle';
import { handleLogout } from '../../utils/logout';

import type { TodoItem, TodoList } from '../../types/todo';
import { useUserProfileData } from "../../hooks/useUserProfileData";
import { useWeddingBanner } from "../../hooks/useWeddingBanner";

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
  // Always create a local date
  return new Date(year, month - 1, day, hour, minute, 0, 0);
}

// Utility to force a Date to local midnight
function forceLocalMidnight(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
}

// Helper to validate date input string (YYYY-MM-DD or YYYY-MM-DDTHH:MM)
const isValidDateInput = (str: any) => {
  return typeof str === 'string' && /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?$/.test(str.trim());
};

export default function TodoPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { showSuccessToast, showErrorToast, showInfoToast } = useCustomToast();
  const searchParams = useSearchParams();

  // Use shared user profile data hook
  const { userName, daysLeft, profileLoading } = useUserProfileData();

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
        let endDate = data.endDate;
        if (endDate && typeof endDate.toDate === 'function') {
          endDate = endDate.toDate();
        } else if (endDate instanceof Date) {
          // already a Date
        } else {
          endDate = undefined;
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
          endDate,
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


  // Helper to count only real lists (exclude 'All To-Do Items')
  const realListCount = todoLists.length;
  const willReachListLimit = realListCount >= STARTER_TIER_MAX_LISTS;

  // Handler for adding a new list (now supports tasks)
  const handleAddList = async (nameOrEvent: string | React.MouseEvent, tasks?: any[]) => {
    if (!user) return;
    // Support old signature (no arguments)
    let name = typeof nameOrEvent === 'string' ? nameOrEvent : 'New List';
    if (!tasks && typeof nameOrEvent !== 'string') tasks = [];
    // Prevent adding a new 'My To-do' if one already exists
    if (todoLists.some(list => list.name === 'My To-do') && name === 'My To-do') {
      showErrorToast('You already have a My To-do.');
      return;
    }
    if (todoLists.length >= STARTER_TIER_MAX_LISTS) {
      showErrorToast(`You can only have up to ${STARTER_TIER_MAX_LISTS} lists.`);
      return;
    }
    try {
      const newListRef = await addDoc(getUserCollectionRef('todoLists', user.uid), {
        name,
        order: todoLists.length,
        userId: user.uid,
        createdAt: new Date(),
        orderIndex: todoLists.length
      });
      // Add tasks if provided
      if (tasks && tasks.length > 0) {
        const batch = writeBatch(db);
        tasks.forEach((task, idx) => {
          if (!task.name.trim()) return;
          const taskRef = doc(getUserCollectionRef('todoItems', user.uid));
          batch.set(taskRef, {
            name: task.name,
            note: task.note || '',
            deadline: task.deadline ? new Date(task.deadline) : null,
            category: task.category || '',
            isCompleted: false,
            order: idx,
            createdAt: new Date(),
            listId: newListRef.id,
            userId: user.uid,
            orderIndex: idx
          });
        });
        await batch.commit();
      }
      showSuccessToast('New list added!');
      const newList = { 
        id: newListRef.id, 
        name, 
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
    // Prevent renaming 'My To-do'
    const currentList = todoLists.find(list => list.id === listId);
    if (currentList && currentList.name === 'My To-do') {
      showErrorToast('You cannot rename My To-do.');
      setEditingListNameId(null);
      setEditingListNameValue(null);
      return;
    }
    // Prevent renaming any list to 'My To-do' if one already exists
    if (newName === 'My To-do' && todoLists.some(list => list.name === 'My To-do')) {
      showErrorToast('You already have a My To-do.');
      setEditingListNameId(null);
      setEditingListNameValue(null);
      return;
    }
    try {
      const listRef = doc(getUserCollectionRef('todoLists', user.uid), listId);
      await updateDoc(listRef, { name: newName, userId: user.uid });
      showSuccessToast(`List renamed to "${newName}"!`);
      setEditingListNameId(null);
      setEditingListNameValue(null);
      // Update selectedList if it's the one being renamed
      if (selectedList && selectedList.id === listId) {
        setSelectedList({ ...selectedList, name: newName });
      }
    } catch (error) {
      console.error('Error updating list name:', error);
      showErrorToast('Failed to rename list.');
    }
  };

  // Handler for deleting a list and its tasks (used by handleDeleteList and modal confirm)
  const executeDeleteList = async (listId: string) => {
    if (!user) return;
    try {
      const batch = writeBatch(db);
      // Delete all tasks in the list first
      const tasksQuery = query(
        getUserCollectionRef('todoItems', user.uid),
        where('listId', '==', listId)
      );
      const tasksSnapshot = await getDocs(tasksQuery);
      tasksSnapshot.docs.forEach(taskDoc => {
        batch.delete(taskDoc.ref);
      });
      // Then delete the list itself
      const listRef = doc(getUserCollectionRef('todoLists', user.uid), listId);
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

  // Handler for deleting a list (shows modal if tasks exist, deletes immediately if not)
  const [deletingListId, setDeletingListId] = useState<string | null>(null);
  const [pendingDeleteListId, setPendingDeleteListId] = useState<string | null>(null);

  // Decoupled effect to trigger handleDeleteList only once per user action
  useEffect(() => {
    if (pendingDeleteListId) {
      console.log('[useEffect] pendingDeleteListId changed:', pendingDeleteListId);
      handleDeleteList(pendingDeleteListId);
      setPendingDeleteListId(null);
    }
  }, [pendingDeleteListId]);

  const handleDeleteList = async (listId: string) => {
    console.log('[handleDeleteList] called with listId:', listId);
    if (!user) return;
    if (deletingListId) return; // Prevent double modal
    // Check if the list has any tasks
    const tasksQuery = query(
      getUserCollectionRef('todoItems', user.uid),
      where('listId', '==', listId)
    );
    const tasksSnapshot = await getDocs(tasksQuery);
    const listToDelete = todoLists.find(list => list.id === listId) || null;
    if (tasksSnapshot.size > 0) {
      setDeletingListId(listId);
      setListToConfirmDelete(listToDelete);
      setShowDeleteListModal(true);
      console.log('[handleDeleteList] opening modal for listId:', listId);
    } else {
      setDeletingListId(listId);
      await executeDeleteList(listId);
      setDeletingListId(null);
      console.log('[handleDeleteList] deleted list immediately:', listId);
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
      
      // Update local state
      setTodoItems(prevItems =>
        prevItems.map(item =>
          item.id === todoId ? { ...item, name: newName } : item
        )
      );
      setAllTodoItems(prevItems =>
        prevItems.map(item =>
          item.id === todoId ? { ...item, name: newName } : item
        )
      );
      
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
      if (newCategory && newCategory.trim() !== "") {
        if (!allCategories.includes(newCategory)) {
        await saveCategoryIfNew(newCategory, user.uid);
      }
      await updateDoc(itemRef, { category: newCategory, userId: user.uid });
        
        // Update local state
        setTodoItems(prevItems =>
          prevItems.map(item =>
            item.id === todoId ? { ...item, category: newCategory } : item
          )
        );
        setAllTodoItems(prevItems =>
          prevItems.map(item =>
            item.id === todoId ? { ...item, category: newCategory } : item
          )
        );
      }
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
  function getTaskGroup(deadline?: Date | null): string {
    if (!deadline || !(deadline instanceof Date) || isNaN(deadline.getTime())) {
      return 'No date yet';
    }
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
    todoItems.forEach((item: TodoItem) => {
      const group = getTaskGroup(item.deadline);
      if (!groups[group]) groups[group] = [];
      groups[group].push(item);
    });

    // Sort tasks within each group by deadline
    Object.keys(groups).forEach(group => {
      groups[group].sort((a: TodoItem, b: TodoItem) => {
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
  const handleUpdateTodoDeadline = async (todoId: string, deadline?: string | null, endDate?: string | null) => {
    if (!user) return;
    try {
      const updateObj: any = {};
      if (typeof deadline !== 'undefined') {
        updateObj.deadline = deadline && deadline !== '' ? parseLocalDateTime(deadline) : null;
      }
      if (typeof endDate !== 'undefined') {
        updateObj.endDate = endDate && endDate !== '' ? parseLocalDateTime(endDate) : null;
      }
      if (Object.keys(updateObj).length === 0) return;
      updateObj.userId = user.uid;
      const itemRef = doc(getUserCollectionRef('todoItems', user.uid), todoId);
      await updateDoc(itemRef, updateObj);
      showSuccessToast('Deadline updated!');
      // Green flash logic:
      setTodoItems(prevItems =>
        prevItems.map(item =>
          item.id === todoId ? { ...item, justUpdated: true } : item
        )
      );
      setAllTodoItems(prevItems =>
        prevItems.map(item =>
          item.id === todoId ? { ...item, justUpdated: true } : item
        )
      );
      setTimeout(() => {
        setTodoItems(prevItems =>
          prevItems.map(item =>
            item.id === todoId ? { ...item, justUpdated: false } : item
          )
        );
        setAllTodoItems(prevItems =>
          prevItems.map(item =>
            item.id === todoId ? { ...item, justUpdated: false } : item
          )
        );
      }, 1000);
      // Optionally update local state here if needed
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
      if (newNote && newNote.trim() !== "") {
        await updateDoc(itemRef, { note: newNote, userId: user.uid });
        
        // Update local state
        setTodoItems(prevItems =>
          prevItems.map(item =>
            item.id === todoId ? { ...item, note: newNote } : item
          )
        );
        setAllTodoItems(prevItems =>
          prevItems.map(item =>
            item.id === todoId ? { ...item, note: newNote } : item
          )
        );
      }
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
    if (editingListNameValue !== null) {
      await handleUpdateListName(listId, editingListNameValue);
      setEditingListNameId(null);
      setEditingListNameValue(null);
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

  // Add a logout handler for TopNav
  const handleLogoutClick = async () => {
    await handleLogout();
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

  // Always show 'My To-do' first in the list
  const sortedTodoLists = useMemo(() => {
    const myTodo = todoLists.find(list => list.name === 'My To-do');
    const others = todoLists.filter(list => list.name !== 'My To-do');
    return myTodo ? [myTodo, ...others] : others;
  }, [todoLists]);

  // Add state for todo search
  const [todoSearchQuery, setTodoSearchQuery] = useState("");

  // Set up Fuse.js for todoItems in the selected list
  const fuse = useMemo(() => {
    return todoItems.length
      ? new Fuse(todoItems, {
          keys: ["name", "note", "category"],
          threshold: 0.3,
          ignoreLocation: true,
        })
      : null;
  }, [todoItems]);

  const filteredTodoItems = useMemo(() => {
    if (!todoSearchQuery.trim()) return todoItems;
    if (!fuse) return todoItems;
    return fuse.search(todoSearchQuery).map((result) => result.item);
  }, [todoSearchQuery, fuse, todoItems]);

  // Add new state for completed items selection
  const [showCompletedItems, setShowCompletedItems] = useState(false);

  // Modify the useEffect that filters todoItems
  useEffect(() => {
    if (!selectedList) {
      if (showCompletedItems) {
        setTodoItems(allTodoItems.filter(item => item.isCompleted));
      } else {
        setTodoItems(allTodoItems);
      }
    } else {
      setTodoItems(allTodoItems.filter(item => item.listId === selectedList.id));
    }
  }, [allTodoItems, selectedList, showCompletedItems]);

  // Add state for showing the add-to-do side card/modal
  const [showAddTodoCard, setShowAddTodoCard] = useState(false);
  const [newTodoName, setNewTodoName] = useState('');
  const [newTodoListId, setNewTodoListId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  // Add new state for additional fields
  const [newTodoNote, setNewTodoNote] = useState('');
  const [newTodoDeadline, setNewTodoDeadline] = useState('');
  const [newTodoCategory, setNewTodoCategory] = useState('');

  // Update open/close handlers to reset new fields
  const handleOpenAddTodo = () => {
    setShowAddTodoCard(true);
    setNewTodoName('');
    setNewTodoListId(selectedList ? selectedList.id : null);
    setNewTodoNote('');
    setNewTodoDeadline('');
    setNewTodoCategory('');
  };
  const handleCloseAddTodo = () => {
    setShowAddTodoCard(false);
    setNewTodoName('');
    setNewTodoListId(null);
    setNewTodoNote('');
    setNewTodoDeadline('');
    setNewTodoCategory('');
    setIsAdding(false);
  };

  // Update handleAddTodo to use new fields
  const handleAddTodo = async (data: {
    name: string;
    deadline?: Date;
    startDate?: Date;
    endDate?: Date;
    note?: string;
    category?: string;
    tasks?: { name: string; deadline?: Date; startDate?: Date; endDate?: Date; note?: string; category?: string; }[];
  }) => {
    if (!user) return;
    if (!data.name.trim()) {
      showErrorToast('Task name cannot be empty.');
      return;
    }
    const listId = selectedList ? selectedList.id : newTodoListId;
    if (!listId) {
      showErrorToast('Please select a list.');
      return;
    }
    setIsAdding(true);
    try {
      await addDoc(getUserCollectionRef('todoItems', user.uid), {
        name: data.name,
        note: data.note || null,
        deadline: data.deadline || null,
        category: data.category || null,
        isCompleted: false,
        order: todoItems.length,
        createdAt: new Date(),
        listId,
        userId: user.uid,
        orderIndex: todoItems.length
      });
      showSuccessToast(`Task "${data.name}" added!`);
      handleCloseAddTodo();
    } catch (error) {
      console.error('Error adding task:', error);
      showErrorToast('Failed to add task.');
    } finally {
      setIsAdding(false);
    }
  };

  // Add state for calendar/list view
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');

  // State for viewing/editing a single task in the side card
  const [selectedTaskForSideCard, setSelectedTaskForSideCard] = useState<any | null>(null);
  const [showTaskDetailCard, setShowTaskDetailCard] = useState(false);

  // Handler for clicking a task in the calendar
  const handleCalendarTaskClick = (event: any) => {
    // Find the full task object by id
    const task = allTodoItems.find(t => t.id === event.id);
    if (task) {
      const list = todoLists.find(l => l.id === task.listId);
      setSelectedTaskForSideCard({ ...task, listName: list ? list.name : '' });
      setShowTaskDetailCard(true);
    }
  };

  // Handler for updating a task from the side card
  const handleUpdateTask = async (updatedTask: any) => {
    if (!user || !selectedTaskForSideCard) return;
    try {
      const itemRef = doc(getUserCollectionRef('todoItems', user.uid), selectedTaskForSideCard.id);
      await updateDoc(itemRef, {
        name: updatedTask.name,
        note: updatedTask.note || null,
        deadline: updatedTask.deadline ? new Date(updatedTask.deadline) : null,
        endDate: updatedTask.endDate ? new Date(updatedTask.endDate) : null,
        category: updatedTask.category || null,
        userId: user.uid,
      });
      // Update local state
      setTodoItems(prevItems =>
        prevItems.map(item =>
          item.id === selectedTaskForSideCard.id ? { ...item, ...updatedTask } : item
        )
      );
      setAllTodoItems(prevItems =>
        prevItems.map(item =>
          item.id === selectedTaskForSideCard.id ? { ...item, ...updatedTask } : item
        )
      );
      showSuccessToast('Task updated!');
      setShowTaskDetailCard(false);
      setSelectedTaskForSideCard(null);
    } catch (error) {
      console.error('Error updating task:', error);
      showErrorToast('Failed to update task.');
    }
  };

  // Add state for calendar view mode
  const [calendarViewMode, setCalendarViewMode] = useState<'month' | 'week' | 'day' | 'year'>('month');
  // Add state for calendar date
  const [calendarDate, setCalendarDate] = useState<Date>(new Date());

  // Keyboard shortcuts for calendar view
  React.useEffect(() => {
    if (viewMode !== 'calendar') return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.target && (e.target as HTMLElement).tagName === 'INPUT') return;
      if (e.key === 'm' || e.key === 'M') setCalendarViewMode('month');
      if (e.key === 'w' || e.key === 'W') setCalendarViewMode('week');
      if (e.key === 'd' || e.key === 'D') setCalendarViewMode('day');
      if (e.key === 'y' || e.key === 'Y') setCalendarViewMode('year');
      if (e.key === 't' || e.key === 'T') setCalendarDate(new Date());
      if (e.key === 'ArrowLeft') {
        setCalendarDate(prev => {
          const d = new Date(prev);
          if (calendarViewMode === 'month') d.setMonth(d.getMonth() - 1);
          else if (calendarViewMode === 'week') d.setDate(d.getDate() - 7);
          else if (calendarViewMode === 'day') d.setDate(d.getDate() - 1);
          else if (calendarViewMode === 'year') d.setFullYear(d.getFullYear() - 1);
          return d;
        });
      }
      if (e.key === 'ArrowRight') {
        setCalendarDate(prev => {
          const d = new Date(prev);
          if (calendarViewMode === 'month') d.setMonth(d.getMonth() + 1);
          else if (calendarViewMode === 'week') d.setDate(d.getDate() + 7);
          else if (calendarViewMode === 'day') d.setDate(d.getDate() + 1);
          else if (calendarViewMode === 'year') d.setFullYear(d.getFullYear() + 1);
          return d;
        });
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewMode, setCalendarViewMode, calendarViewMode]);

  // Handler to clone a list and its tasks
  const handleCloneList = async (listId: string) => {
    if (!user) {
      showErrorToast('You must be logged in to clone a list.');
      return;
    }
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
    try {
      // 1. Create the new list
      const newListRef = await addDoc(getUserCollectionRef('todoLists', user.uid), {
        name: newName,
        order: todoLists.length,
        userId: user.uid,
        createdAt: new Date(),
        orderIndex: maxListOrderIndex + 1
      });
      // 2. Fetch all tasks from the original list
      const tasksQuery = query(
        getUserCollectionRef('todoItems', user.uid),
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
        const newTaskRef = doc(getUserCollectionRef('todoItems', user.uid));
        batch.set(newTaskRef, {
          ...data,
          listId: newListRef.id,
          createdAt: new Date(),
          orderIndex: orderIndex++,
        });
      });
      await batch.commit();
      showSuccessToast(`List "${newName}" and its tasks cloned!`);
      // Navigate to the new list
      const newList = {
        id: newListRef.id,
        name: newName,
        order: todoLists.length,
        userId: user.uid,
        createdAt: new Date(),
        orderIndex: maxListOrderIndex + 1
      };
      setSelectedList(newList);
    } catch (error: any) {
      console.error('Error cloning list:', error);
      showErrorToast(`Failed to clone list: ${error.message}`);
    }
  };

  // Only show content when both loading is complete AND minimum time has passed
  const isLoading = profileLoading;

  const { handleSetWeddingDate } = useWeddingBanner(router);

  if (loading) {
  return (
      <div className="flex flex-col min-h-screen bg-linen">
        <WeddingBanner
          daysLeft={null}
          userName={null}
          isLoading={true}
          onSetWeddingDate={handleSetWeddingDate}
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
      <WeddingBanner
        daysLeft={daysLeft}
        userName={userName}
        isLoading={isLoading}
        onSetWeddingDate={handleSetWeddingDate}
      />
      <div className="flex-1 flex justify-center items-start w-full bg-linen p-4 overflow-hidden">
         <div className="w-full flex flex-row h-full min-h-0 border border-[#AB9C95] border-[0.5px] rounded-[5px] bg-white">
          {/* Sidebar */}
          <TodoSidebar
            todoLists={sortedTodoLists}
            selectedList={selectedList}
            setSelectedList={setSelectedList}
            showCompletedItems={showCompletedItems}
            setShowCompletedItems={setShowCompletedItems}
            showNewListInput={showNewListInput}
            setShowNewListInput={setShowNewListInput}
            newListName={newListName}
            setNewListName={setNewListName}
            handleAddList={handleAddList}
            listTaskCounts={listTaskCounts}
            setTodoSearchQuery={setTodoSearchQuery}
            setExplicitAllSelected={setExplicitAllSelected}
            allTodoCount={allTodoCount}
            allTodoItems={allTodoItems}
            allCategories={allCategories}
            showUpgradeModal={() => setShowUpgradeModal(true)}
          />

          {/* Sticky Top Bar - moved outside main */}
          <div className="flex-1 flex flex-col min-h-0 h-full">
            <TodoTopBar
              selectedList={selectedList}
              editingListNameId={editingListNameId}
              editingListNameValue={editingListNameValue}
              setEditingListNameId={setEditingListNameId}
              setEditingListNameValue={setEditingListNameValue}
              handleRenameList={handleRenameList}
              todoSearchQuery={todoSearchQuery}
              setTodoSearchQuery={setTodoSearchQuery}
              showCompletedItems={showCompletedItems}
              handleOpenAddTodo={handleOpenAddTodo}
              viewMode={viewMode}
              setViewMode={setViewMode}
              calendarViewMode={calendarViewMode}
              setCalendarViewMode={setCalendarViewMode}
              handleCloneList={handleCloneList}
              handleDeleteList={handleDeleteList}
            />
            <main className="flex-1 flex flex-col min-h-0 h-full bg-white">
              {viewMode === 'calendar' ? (
                <CalendarView
                  todoItems={todoItems}
                  onEventClick={handleCalendarTaskClick}
                  view={calendarViewMode}
                  date={calendarDate}
                  onNavigate={setCalendarDate}
                                handleCloneTodo={handleCloneTodo}
                                handleDeleteTodo={handleDeleteTodoItem}
                                setTaskToMove={setTaskToMove}
                                setShowMoveTaskModal={setShowMoveTaskModal}
                  todoLists={todoLists}
                  allCategories={allCategories}
                              />
              ) : (
                <TodoListView
                  todoItems={todoItems}
                  filteredTodoItems={filteredTodoItems}
                  groupedTasks={groupedTasks}
                  openGroups={openGroups}
                  toggleGroup={toggleGroup}
                  showCompletedItems={showCompletedItems}
                  setShowCompletedItems={setShowCompletedItems}
                  todoSearchQuery={todoSearchQuery}
                  selectedList={selectedList}
                  todoLists={todoLists}
                                allCategories={allCategories}
                                draggedTodoId={draggedTodoId}
                                dragOverTodoId={dragOverTodoId}
                                dropIndicatorPosition={dropIndicatorPosition}
                  user={user}
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
                  handleListDrop={handleListDrop}
                  showCompletedTasks={showCompletedTasks}
                  setShowCompletedTasks={setShowCompletedTasks}
                              />
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
        console.log('[DeleteListConfirmationModal] rendering for listId:', listToConfirmDelete.id),
        <DeleteListConfirmationModal
          list={listToConfirmDelete}
          onConfirm={async () => {
            console.log('[DeleteListConfirmationModal] onConfirm for listId:', listToConfirmDelete.id);
            if (listToConfirmDelete) {
            setShowDeleteListModal(false);
            setListToConfirmDelete(null);
              setDeletingListId(null);
              await executeDeleteList(listToConfirmDelete.id);
            }
          }}
          onClose={() => {
            setShowDeleteListModal(false);
            setListToConfirmDelete(null);
            setDeletingListId(null);
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
          setPendingDeleteListId={setPendingDeleteListId}
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

      <TaskSideCard
        isOpen={showAddTodoCard || showTaskDetailCard}
        onClose={() => {
          handleCloseAddTodo();
          setShowTaskDetailCard(false);
          setSelectedTaskForSideCard(null);
        }}
        onSubmit={showTaskDetailCard ? handleUpdateTask : handleAddTodo}
        mode={showTaskDetailCard ? 'calendar' : 'todo'}
        userId={user.uid}
        todoLists={todoLists}
        selectedListId={selectedList ? selectedList.id : ''}
        setSelectedListId={id => {
          const found = todoLists.find(l => l.id === id);
          if (found) setSelectedList(found);
        }}
        initialData={selectedTaskForSideCard ? {
          name: selectedTaskForSideCard.name,
          deadline: selectedTaskForSideCard.deadline,
          endDate: selectedTaskForSideCard.endDate,
          note: selectedTaskForSideCard.note,
          category: selectedTaskForSideCard.category
        } : undefined}
        allCategories={allCategories}
        todo={showTaskDetailCard ? selectedTaskForSideCard : undefined}
        handleToggleTodoComplete={showTaskDetailCard ? handleToggleTodoCompletion : undefined}
        handleDeleteTodo={showTaskDetailCard ? handleDeleteTodoItem : undefined}
      />

    </div>
  );
}