"use client";

// IMPORTS FROM REACT AND NEXT.JS LIBS
import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence } from "framer-motion";


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
import { Plus, MoreHorizontal, Filter, ChevronRight } from 'lucide-react';

// HOOKS IMPORTS (from hooks/ folder)
import { useCustomToast } from '@/hooks/useCustomToast';

// UTILS IMPORTS (from utils/ folder)
import { getCategoryStyle } from '@/utils/categoryStyle';


// Interfaces (ensure these are defined as needed, or imported)
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

interface TodoList {
  id: string;
  name: string;
  order: number;
  userId: string;
  createdAt: Date;
  orderIndex: number;
}

const STARTER_TIER_MAX_LISTS = 3; // Example tier limit

export default function TodoPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { showSuccessToast, showErrorToast, showInfoToast } = useCustomToast();

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

  // Add effect to calculate task counts for each list
  useEffect(() => {
    const counts = new Map<string, number>();
    todoItems.forEach(item => {
      const listId = item.listId;
      if (listId) {
        counts.set(listId, (counts.get(listId) || 0) + 1);
      }
    });
    setListTaskCounts(counts);
  }, [todoItems]);

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

      // If no list is selected, or selected list is deleted, select the first one
      if (!selectedList || !lists.some(list => list.id === selectedList.id)) {
        if (lists.length > 0) {
          console.log('Setting selected list to first list:', lists[0]);
          setSelectedList(lists[0]);
        } else {
          console.log('No lists available, setting selectedList to null');
          setSelectedList(null);
        }
      }
    }, (error) => {
      console.error('Error fetching todo lists:', error);
    });

    return () => unsubscribeLists();
  }, [user, loading, router, selectedList]);


  useEffect(() => {
    if (!user || !selectedList) {
      console.log('No user or selected list, clearing todo items');
      setTodoItems([]);
      return;
    }

    console.log('Fetching todo items for list:', selectedList.id);
    const q = query(
      getUserCollectionRef('todoItems', user.uid),
      where('listId', '==', selectedList.id),
      orderBy('orderIndex', 'asc')
    );

    const unsubscribeItems = onSnapshot(q, (snapshot) => {
      const items: TodoItem[] = snapshot.docs.map(doc => {
        const data = doc.data() as {
          listId: string;
          name: string;
          completed: boolean;
          order: number;
          category?: string;
          createdAt: any;
          userId: string;
          orderIndex: number;
          deadline?: any;
          note?: string;
          contactId?: string;
          completedAt?: any;
        };
        return {
          id: doc.id,
          listId: data.listId,
          name: data.name,
          isCompleted: data.completed || false,
          category: data.category,
          createdAt: data.createdAt?.toDate() || new Date(),
          userId: data.userId,
          orderIndex: data.orderIndex || 0,
          deadline: data.deadline?.toDate() || null,
          note: data.note || null,
          contactId: data.contactId,
          completedAt: data.completedAt?.toDate() || null
        };
      });
      console.log('Fetched todo items:', items);
      setTodoItems(items);
    }, (error) => {
      console.error('Error fetching todo items:', error);
    });

    return () => unsubscribeItems();
  }, [user, selectedList]);

  // Handler for adding a new list
  const handleAddList = async () => {
    if (!user) {
      showErrorToast('You must be logged in to add a list.');
      return;
    }
    if (newListName.trim() === '') {
      showErrorToast('List name cannot be empty.');
      return;
    }

    if (todoLists.length >= STARTER_TIER_MAX_LISTS) {
      setShowUpgradeModal(true);
      return;
    }

    try {
      const newListRef = await addDoc(getUserCollectionRef('todoLists', user.uid), {
        name: newListName,
        order: todoLists.length,
        userId: user.uid,
        createdAt: new Date(),
        orderIndex: todoLists.length
      });
      showSuccessToast(`List "${newListName}" added!`);
      setNewListName('');
      const newList = { 
        id: newListRef.id, 
        name: newListName, 
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
        completed: false,
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
    if (!user || !selectedList) return;
    try {
      const itemRef = doc(getUserCollectionRef("todoItems", user.uid), todo.id);
      const updatedIsCompleted = !todo.isCompleted;
      const completedAt = updatedIsCompleted ? new Date() : null;
      await updateDoc(itemRef, { 
        isCompleted: updatedIsCompleted,
        completedAt: completedAt,
        userId: user.uid 
      });
      showSuccessToast(`Task "${todo.name}" ${todo.isCompleted ? 'unmarked' : 'marked'} as complete!`);
    } catch (error) {
      console.error('Error toggling todo completion:', error);
      showErrorToast('Failed to update task.');
    }
  };

  // Handler for updating task name
  const handleUpdateTodoName = async (todoId: string, newName: string) => {
    if (!user || !selectedList) return;
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
    if (!user || !selectedList) return;
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
    if (!user || !selectedList) return;
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
    if (!user || !selectedList) return;
    try {
      await addDoc(getUserCollectionRef("todoItems", user.uid), {
        ...todo,
        id: undefined, // Firestore will generate a new ID
        name: `${todo.name} (Clone)`,
        orderIndex: todoItems.length, // Add to the end
        createdAt: new Date(),
        userId: user.uid,
      });
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
  const handleUpdateTodoDeadline = async (todoId: string, deadline: Date | string | null) => {
    if (!user) return;
    
    try {
      const itemRef = doc(getUserCollectionRef("todoItems", user.uid), todoId);
      
      // If a deadline is provided, ensure it has a time component
      let deadlineWithTime = deadline;
      if (deadline) {
        // Handle both Date objects and date strings
        if (typeof deadline === 'string') {
          // Parse the date string (assuming MM/DD/YYYY format)
          const [month, day, year] = deadline.split('/').map(Number);
          deadlineWithTime = new Date(year, month - 1, day);
        } else {
          deadlineWithTime = new Date(deadline);
        }
        
        // Validate the date
        if (isNaN(deadlineWithTime.getTime())) {
          throw new Error('Invalid date');
        }
      }
      
      console.log('Updating deadline to:', deadlineWithTime);
      
      await updateDoc(itemRef, { 
        deadline: deadlineWithTime,
        userId: user.uid 
      });
      showSuccessToast('Deadline updated!');
    } catch (error) {
      console.error('Error updating deadline:', error);
      showErrorToast('Failed to update deadline.');
    }
  };

  // Handler for updating task note
  const handleUpdateTodoNote = async (todoId: string, newNote: string | null) => {
    if (!user || !selectedList) return;
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
    console.log('List drop');
    e.preventDefault();
    e.stopPropagation();

    if (!draggedTodoId || !user) {
      console.log('No dragged todo or user');
      return;
    }

    // Get the dragged task
    const draggedTask = todoItems.find(item => item.id === draggedTodoId);
    if (!draggedTask) {
      console.log('No dragged task found');
      return;
    }

    // Get the target task (if any)
    const targetTask = dropIndicatorPosition.id ? todoItems.find(item => item.id === dropIndicatorPosition.id) : null;
    console.log('Target task:', targetTask?.id, 'Position:', dropIndicatorPosition.position);

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
    if (selectedList) {
      await handleMoveTodoItem(taskId, selectedList.id, targetListId);
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
         <div className="w-full flex flex-row min-h-full border border-[#AB9C95] border-[0.5px] rounded-[5px] bg-white">
          {/* Sidebar */}
          <aside className="w-[320px] bg-[#F3F2F0] border-r border-[#E0DBD7] flex flex-col justify-between min-h-full p-0">
            <div className="flex-1 flex flex-col">
              <div className="p-6 pb-2 border-b border-[#E0DBD7]">
                <h4 className="text-lg font-playfair font-medium text-[#332B42] mb-4">To-do Lists</h4>
                
                {/* Banner for list limit */}
                <AnimatePresence>
                  {willReachListLimit && showListLimitBanner && (
                    <div className="mb-3">
                      <Banner
                        message={
                          <>
                            Your plan allows for a maximum of {STARTER_TIER_MAX_LISTS} lists.{' '}
                            <a
                              href="#"
                              onClick={(e) => {
                                e.preventDefault();
                                setShowUpgradeModal(true);
                              }}
                              className="underline text-blue-700 hover:text-blue-900"
                            >
                              Upgrade to create more!
                            </a>
                          </>
                        }
                        type="info"
                      />
                    </div>
                  )}
                </AnimatePresence>

                <div className="space-y-1">
                  <div className={`px-3 py-2 rounded-[5px] text-[#332B42] text-sm font-medium cursor-pointer ${!selectedList ? 'bg-[#EBE3DD] border border-[#A85C36]' : 'hover:bg-[#F8F6F4] border border-transparent hover:border-[#AB9C95]'}`}
                    onClick={() => setSelectedList(null)}>
                    <div className="flex items-center justify-between">
                      <span>All To-do Items</span>
                      <span className="text-xs text-[#7A7A7A] bg-[#EBE3DD] px-1.5 py-0.5 rounded-full font-work">
                        {todoItems.length}
                      </span>
                    </div>
                  </div>
                  {todoLists.map((list) => (
                    <div
                      key={list.id}
                      onClick={() => setSelectedList(list)}
                      className={`px-3 py-2 rounded-[5px] text-[#332B42] text-sm font-medium cursor-pointer ${selectedList?.id === list.id ? 'bg-[#EBE3DD] border border-[#A85C36]' : 'hover:bg-[#F8F6F4] border border-transparent hover:border-[#AB9C95]'}`}
                    >
                      <div className="flex items-center justify-between">
                        <span>{list.name}</span>
                        {listTaskCounts.has(list.id) && (
                          <span className="text-xs text-[#7A7A7A] bg-[#EBE3DD] px-1.5 py-0.5 rounded-full font-work">
                            {listTaskCounts.get(list.id)}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1 flex flex-col min-h-full bg-white p-4">
            {/* Top bar: search, view toggle, new todo button */}
            <div className="flex items-center gap-4 mb-3">
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

            {/* Grouped To-do Items by Relative Date */}
            <div className="flex-1 overflow-y-auto">
              {Object.entries(groupedTasks).length === 0 && (
                <div className="text-sm text-gray-500 text-center py-4">No tasks yet. Add one!</div>
              )}
              {Object.entries(groupedTasks).map(([group, items]) => (
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
                      {items.length}
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
                    {items.map((item, index) => (
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
                          allCategories={[]}
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
                        />
                        {dropIndicatorPosition.id === item.id && dropIndicatorPosition.position === 'bottom' && (
                          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#A85C36] -mb-0.5" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-4 mb-6 relative">
              <button
                ref={filterButtonRef}
                className="btn-secondary"
                onClick={() => setShowFilters((prev) => !prev)}
              >
                <Filter size={18} />
                Filters
              </button>
              {showFilters && (
                <div className="absolute left-0 mt-2 z-50 bg-white border border-[#AB9C95] rounded-[5px] shadow-lg min-w-[250px] p-4 space-y-3">
                  <div className="text-sm font-semibold text-[#332B42] mb-2">Filter Tasks</div>
                  {/* Placeholder filter options */}
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" /> This Week
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" /> This Month
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" /> Unscheduled
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" /> Completed
                  </label>
                  <button
                    className="mt-2 w-full py-2 rounded-[5px] bg-[#332B42] text-white text-sm font-medium hover:bg-[#4B3A5A]"
                    onClick={() => setShowFilters(false)}
                  >
                    Close
                  </button>
                </div>
              )}
            </div>
          </main>
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