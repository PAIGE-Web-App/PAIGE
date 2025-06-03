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
  updateDoc,
  deleteDoc,
  writeBatch,
  getDocs,
} from 'firebase/firestore';
import { db, getUserCollectionRef } from '../lib/firebase'; // Import getUserCollectionRef
import { User } from 'firebase/auth';
import toast from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid';
import Link from 'next/link';
import { CheckCircle, Circle, MoreHorizontal, MessageSquare, Heart, ClipboardList, Check, Copy, Trash2, ListFilter, Plus } from 'lucide-react';
import CategoryPill from './CategoryPill';
import CategorySelectField from './CategorySelectField';
import { getAllCategories, saveCategoryIfNew } from '../lib/firebaseCategories';
import { AnimatePresence, motion } from 'framer-motion';

// Define necessary interfaces
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
}

interface TodoList {
  id: string;
  name: string;
  userId: string;
  createdAt: Date;
  orderIndex: number;
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
  contacts: Contact[];
}

// Helper function to reorder an array
const reorder = (list: TodoItem[], startIndex: number, endIndex: number): TodoItem[] => {
  const result = Array.from(list);
  const [removed] = result.splice(startIndex, 1);
  result.splice(endIndex, 0, removed);
  return result;
};

// Removed global collection references as getUserCollectionRef will be used directly

const RightDashboardPanel: React.FC<RightDashboardPanelProps> = ({ currentUser, contacts }) => {
  // State declarations remain the same
  const [rightPanelSelection, setRightPanelSelection] = useState<'todo' | 'messages' | 'favorites'>('todo');
  const [todoItems, setTodoItems] = useState<TodoItem[]>([]);
  const [todoLists, setTodoLists] = useState<TodoList[]>([]);
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [editingDeadlineId, setEditingDeadlineId] = useState<string | null>(null);
  const [editingDeadlineValue, setEditingDeadlineValue] = useState<string | null>(null);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteValue, setEditingNoteValue] = useState<string | null>(null);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCategoryValue, setEditingCategoryValue] = useState<string | null>(null);
  const [editingCustomCategoryValue, setEditingCustomCategoryValue] = useState<string | null>(null);
  const [allCategories, setAllCategories] = useState<string[]>([]);
  const [showAddTaskDropdown, setShowAddTaskDropdown] = useState(false);
  const addTaskDropdownRef = useRef<HTMLDivElement>(null);
  const [editingTaskNameId, setEditingTaskNameId] = useState<string | null>(null);
  const [editingTaskNameValue, setEditingTaskNameValue] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [sortOption, setSortOption] = useState<'myOrder' | 'date' | 'title'>('myOrder');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const sortMenuRef = useRef<HTMLDivElement>(null);
  const [draggedTodoId, setDraggedTodoId] = useState<string | null>(null);
  const [dragOverTodoId, setDragOverTodoId] = useState<string | null>(null);
  const [dropIndicatorPosition, setDropIndicatorPosition] = useState<{ id: string | null, position: 'top' | 'bottom' | null }>({ id: null, position: null });
  const [showNewListInput, setShowNewListInput] = useState(false);
  const [newListName, setNewListName] = useState('');
  const newListInputRef = useRef<HTMLInputElement>(null);

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
      // Use getUserCollectionRef for todoLists
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
            createdAt: data.createdAt.toDate(),
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
              const docRef = await addDoc(getUserCollectionRef("todoLists", userId), newMyTodoList); // Use getUserCollectionRef
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
  }, [currentUser?.uid, selectedListId]); // Depend on selectedListId to react to changes

  // Effect to fetch To-Do items based on selectedListId
  useEffect(() => {
    let unsubscribeTodoItems: () => void;
    if (currentUser && rightPanelSelection === 'todo' && selectedListId) {
      // Use getUserCollectionRef for todoItems
      const todoItemsCollectionRef = getUserCollectionRef<TodoItem>("todoItems", currentUser.uid);
      const q = query(
        todoItemsCollectionRef,
        where('userId', '==', currentUser.uid),
        where('listId', '==', selectedListId),
        orderBy('orderIndex', 'asc'),
        orderBy('createdAt', 'asc')
      );

      unsubscribeTodoItems = onSnapshot(q, async (snapshot) => {
        const fetchedTodoItems: TodoItem[] = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            name: data.name,
            deadline: data.deadline?.toDate(),
            note: data.note,
            category: data.category,
            contactId: data.contactId,
            isCompleted: data.isCompleted,
            userId: data.userId,
            createdAt: data.createdAt.toDate(),
            orderIndex: data.orderIndex || 0,
            listId: data.listId || '',
          };
        });

        // --- Migration Logic for old tasks without listId ---
        const batch = writeBatch(db);
        let needsBatchCommit = false;
        const myTodoList = todoLists.find(list => list.name === 'My To-do');

        if (myTodoList) {
          const tasksWithoutListIdQuery = query(
            getUserCollectionRef("todoItems", currentUser.uid), // Use getUserCollectionRef
            where('userId', '==', currentUser.uid),
            where('listId', '==', null)
          );
          const tasksWithoutListIdSnapshot = await getDocs(tasksWithoutListIdQuery);

          tasksWithoutListIdSnapshot.forEach(docSnap => {
            const taskData = docSnap.data();
            if (!taskData.listId) {
              const taskRef = doc(getUserCollectionRef("todoItems", currentUser.uid), docSnap.id); // Use getUserCollectionRef
              batch.update(taskRef, { listId: myTodoList.id });
              needsBatchCommit = true;
            }
          });

          const tasksWithEmptyListIdQuery = query(
            getUserCollectionRef("todoItems", currentUser.uid), // Use getUserCollectionRef
            where('userId', '==', currentUser.uid),
            where('listId', '==', '')
          );
          const tasksWithEmptyListIdSnapshot = await getDocs(tasksWithEmptyListIdQuery);

          tasksWithEmptyListIdSnapshot.forEach(docSnap => {
            const taskData = docSnap.data();
            if (taskData.listId === '') {
              const taskRef = doc(getUserCollectionRef("todoItems", currentUser.uid), docSnap.id); // Use getUserCollectionRef
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
            console.error('Error migrating old tasks:', error);
          }
        }
        // --- End Migration Logic ---

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
  }, [currentUser, rightPanelSelection, selectedListId, todoLists]); // Depend on todoLists for migration logic

  // Effect to close dropdowns and input when clicking outside
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
        !clickedElement.closest('.todo-item-menu-container') &&
        !clickedElement.closest('.more-horizontal-button')
      ) {
        setOpenMenuId(null);
      }

      // Close sort menu if open and click is outside
      if (sortMenuRef.current && !sortMenuRef.current.contains(event.target as Node)) {
        setShowSortMenu(false);
      }

      // Close new list input if open and click is outside
      if (showNewListInput && newListInputRef.current && !newListInputRef.current.contains(event.target as Node)) {
        setShowNewListInput(false);
        setNewListName(''); // Clear input on close
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showAddTaskDropdown, openMenuId, showSortMenu, showNewListInput]);

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
      await addDoc(getUserCollectionRef("todoItems", currentUser.uid), { // Use getUserCollectionRef
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
    if (!currentUser) {
      toast.error('You must be logged in to create a new list.');
      return;
    }
    const trimmedListName = newListName.trim();
    if (!trimmedListName) {
      toast.error('List name cannot be empty.');
      return;
    }

    // Check if a list with this name already exists for the user
    const existingList = todoLists.find(list => list.name.toLowerCase() === trimmedListName.toLowerCase());
    if (existingList) {
      toast.error('A list with this name already exists.');
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
      const docRef = await addDoc(getUserCollectionRef("todoLists", currentUser.uid), newList); // Use getUserCollectionRef
      toast.success(`List "${trimmedListName}" created!`);
      setNewListName('');
      setShowNewListInput(false);
      setSelectedListId(docRef.id); // Automatically select the new list
    } catch (error: any) {
      console.error('Error creating new list:', error);
      toast.error(`Failed to create new list: ${error.message}`);
    }
  };

  // Function to toggle To-Do item completion
  const handleToggleTodoComplete = async (todo: TodoItem) => {
    try {
      const todoRef = doc(getUserCollectionRef("todoItems", todo.userId), todo.id); // Use getUserCollectionRef
      await setDoc(todoRef, { isCompleted: !todo.isCompleted }, { merge: true });
      toast.success(`To-do item marked as ${todo.isCompleted ? 'incomplete' : 'complete'}!`);
    } catch (error: any) {
      console.error('Error toggling To-Do item completion:', error);
      toast.error(`Failed to update To-Do item: ${error.message}`);
    }
  };

  // Function to handle showing the deadline input
  const handleAddDeadline = (todo: TodoItem) => {
    if (todo.isCompleted) return;
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
      const todoRef = doc(getUserCollectionRef("todoItems", currentUser.uid), todoId); // Use getUserCollectionRef
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
    if (todo.isCompleted) return;
    setEditingNoteId(todo.id);
    setEditingNoteValue(todo.note || '');
  };

  const handleUpdateNote = async (todoId: string) => {
    if (!currentUser) {
      toast.error('User not authenticated.');
      return;
    }

    try {
      const todoRef = doc(getUserCollectionRef("todoItems", currentUser.uid), todoId); // Use getUserCollectionRef
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
    if (todo.isCompleted) return;
    setEditingCategoryId(todo.id);
    setEditingCategoryValue(todo.category || '');
    const defaultCategories = ["Photographer", "Caterer", "Florist", "DJ", "Venue", "Wedding Planner", "Officiant", "Baker", "Dress Shop", "Suit/Tux Rental", "Hair Stylist", "Makeup Artist", "Musician", "Stationery", "Transportation", "Rentals", "Favors", "Jeweler", "Videographer"];
    if (todo.category && !defaultCategories.includes(todo.category) && allCategories.includes(todo.category)) {
      setEditingCategoryValue("Other");
      setEditingCustomCategoryValue(todo.category);
    } else {
      setEditingCustomCategoryValue("");
    }
  };

  const handleCategoryDropdownChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setEditingCategoryValue(e.target.value);
    if (e.target.value !== "Other") {
      setEditingCustomCategoryValue("");
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
      finalCategory = null;
    } else if (editingCategoryValue === "Other") {
      finalCategory = editingCustomCategoryValue?.trim() || "";
      if (!finalCategory) {
        toast.error("Custom category name is required.");
        return;
      }
      await saveCategoryIfNew(finalCategory, currentUser.uid);
    }

    try {
      const todoRef = doc(getUserCollectionRef("todoItems", currentUser.uid), todoId); // Use getUserCollectionRef
      await setDoc(todoRef, { category: finalCategory }, { merge: true });
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
      const originalTodo = todoItems.find(item => item.id === todoId);
      if (originalTodo) {
        setEditingTaskNameValue(originalTodo.name);
      }
      setEditingTaskNameId(null);
      return;
    }
    try {
      const todoRef = doc(getUserCollectionRef("todoItems", currentUser.uid), todoId); // Use getUserCollectionRef
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
    if (!selectedListId) {
      toast.error('Cannot clone task: no list selected.');
      return;
    }

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
      await addDoc(getUserCollectionRef("todoItems", currentUser.uid), { // Use getUserCollectionRef
        ...clonedTodo,
        createdAt: clonedTodo.createdAt,
      });
      toast.success('To-do item cloned successfully!');
    } catch (error: any) {
      console.error('Error cloning To-do item:', error);
      toast.error(`Failed to clone To-do item: ${error.message}`);
    } finally {
      setOpenMenuId(null);
    }
  };

  // Function to delete a To-Do item
  const handleDeleteTodo = async (todoId: string) => {
    if (!currentUser) {
      toast.error('You must be logged in to delete a To-Do item.');
      return;
    }
    try {
      await deleteDoc(doc(getUserCollectionRef("todoItems", currentUser.uid), todoId)); // Use getUserCollectionRef
      toast.success('To-do item deleted successfully!');
    } catch (error: any) {
      console.error('Error deleting To-do item:', error);
      toast.error(`Failed to delete To-do item: ${error.message}`);
    } finally {
      setOpenMenuId(null);
    }
  };

  // Function to handle sort option selection
  const handleSortOptionSelect = (option: 'myOrder' | 'date' | 'title') => {
    setSortOption(option);
    setShowSortMenu(false);
  };

  // Drag and Drop Handlers
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, id: string) => {
    setDraggedTodoId(id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
    e.currentTarget.classList.add('opacity-50', 'border-dashed', 'border-2', 'border-[#A85C36]');
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>, id: string) => {
    e.preventDefault();
    if (draggedTodoId !== id) {
      setDragOverTodoId(id);
    }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.classList.remove('bg-[#EBE3DD]');
    setDragOverTodoId(null);
    setDropIndicatorPosition({ id: null, position: null });
  };

  const handleItemDragOver = (e: React.DragEvent<HTMLDivElement>, id: string) => {
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
  };

  const handleListDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    if (!draggedTodoId) {
      setDropIndicatorPosition({ id: null, position: null });
      return;
    }

    if (dragOverTodoId === null) {
      if (filteredTodoItems.length > 0) {
        const lastItem = filteredTodoItems[filteredTodoItems.length - 1];
        if (draggedTodoId !== lastItem.id) {
          setDropIndicatorPosition({ id: lastItem.id, position: 'bottom' });
        } else {
          setDropIndicatorPosition({ id: null, position: null });
        }
      } else {
        setDropIndicatorPosition({ id: null, position: 'top' });
      }
    }
  };

  const handleListDrop = async (e: React.DragEvent<HTMLDivElement>) => {
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

    const orderedItems = [...todoItems].sort((a, b) => a.orderIndex - b.orderIndex);
    const draggedIndex = orderedItems.findIndex(item => item.id === draggedTodoId);

    if (draggedIndex === -1) {
      return;
    }

    let finalDropIndex: number;

    if (dropIndicatorPosition.id === null) {
      if (filteredTodoItems.length === 0) {
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

    if (draggedIndex < finalDropIndex) {
      finalDropIndex--;
    }

    if (draggedIndex === finalDropIndex) {
      return;
    }

    const newOrderedItems = reorder(orderedItems, draggedIndex, finalDropIndex);

    const batch = writeBatch(db);
    newOrderedItems.forEach((item, index) => {
      if (item.orderIndex !== index) {
        const todoRef = doc(getUserCollectionRef("todoItems", currentUser.uid), item.id); // Use getUserCollectionRef
        batch.update(todoRef, { orderIndex: index });
      }
    });

    try {
      await batch.commit();
      toast.success('To-do item reordered!');
    } catch (error: any) {
      console.error('Error reordering To-do item:', error);
      toast.error(`Failed to reorder To-do item: ${error.message}`);
    }
  };

  const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
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
  };


  // Filtered To-Do items based on selectedListId and sortOption
  const filteredTodoItems = useMemo(() => {
    let items = [...todoItems];

    if (sortOption === 'date') {
      items.sort((a, b) => {
        if (!a.deadline && !b.deadline) return 0;
        if (!a.deadline) return 1;
        if (!b.deadline) return -1;
        return a.deadline.getTime() - b.deadline.getTime();
      });
    } else if (sortOption === 'title') {
      items.sort((a, b) => a.name.localeCompare(b.name));
    }

    return items;
  }, [todoItems, sortOption]);

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
                {/* Sort and New Task buttons */}
                <div className="flex items-center gap-2">
                  {/* Sort Icon with Dropdown */}
                  <div className="relative" ref={sortMenuRef}>
                    <button
                      onClick={() => setShowSortMenu(!showSortMenu)}
                      className="p-1 rounded-[5px] border border-[#AB9C95] text-[#332B42] hover:bg-[#E0DBD7] flex items-center justify-center"
                      title="Sort To-do Items"
                    >
                      <ListFilter className="w-4 h-4" />
                    </button>
                    <AnimatePresence>
                      {showSortMenu && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ duration: 0.2 }}
                          className="absolute top-full right-0 mt-2 p-2 bg-white border border-[#AB9C95] rounded-[5px] shadow-lg z-10 flex flex-col min-w-[120px]"
                        >
                          <button
                            onClick={() => handleSortOptionSelect('myOrder')}
                            className={`w-full text-left px-3 py-2 text-sm rounded-[3px] ${sortOption === 'myOrder' ? 'bg-[#EBE3DD] text-[#A85C36]' : 'text-[#332B42] hover:bg-[#F3F2F0]'}`}
                          >
                            My Order
                          </button>
                          <button
                            onClick={() => handleSortOptionSelect('date')}
                            className={`w-full text-left px-3 py-2 text-sm rounded-[3px] ${sortOption === 'date' ? 'bg-[#EBE3DD] text-[#A85C36]' : 'text-[#332B42] hover:bg-[#F3F2F0]'}`}
                          >
                            Date
                          </button>
                          <button
                            onClick={() => handleSortOptionSelect('title')}
                            className={`w-full text-left px-3 py-2 text-sm rounded-[3px] ${sortOption === 'title' ? 'bg-[#EBE3DD] text-[#A85C36]' : 'text-[#332B42] hover:bg-[#F3F2F0]'}`}
                          >
                            Title
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
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
              </div>
              {/* Tabs container */}
              <div className="flex border-b border-[#AB9C95] px-4 overflow-x-auto whitespace-nowrap">
                {todoLists.map((list) => (
                  <button
                    key={list.id}
                    onClick={() => setSelectedListId(list.id)}
                    className={`flex-1 text-center py-2 px-3 transition-colors text-xs
                      ${selectedListId === list.id
                        ? 'text-[#A85C36] border-b-[3px] border-[#A85C36] font-medium'
                        : 'text-[#332B42] hover:bg-[#E0DBD7] font-normal'
                      }`}
                  >
                    {list.name}
                  </button>
                ))}
                <button
                  onClick={() => setShowNewListInput(true)}
                  className="flex-shrink-0 py-2 px-3 transition-colors text-xs text-[#332B42] hover:bg-[#E0DBD7] font-normal flex items-center gap-1"
                >
                  <Plus size={14} /> New List
                </button>
              </div>
              {/* New List Input */}
              <AnimatePresence>
                {showNewListInput && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="px-4 py-2 bg-[#F3F2F0] border-t border-[#AB9C95] flex items-center gap-2"
                  >
                    <input
                      ref={newListInputRef}
                      type="text"
                      value={newListName}
                      onChange={(e) => setNewListName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleCreateNewList();
                        } else if (e.key === 'Escape') {
                          setShowNewListInput(false);
                          setNewListName('');
                        }
                      }}
                      placeholder="Enter new list name"
                      className="flex-1 text-sm border border-[#AB9C95] rounded-[5px] px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[#A85C36]"
                      autoFocus
                    />
                    <button
                      onClick={handleCreateNewList}
                      className="btn-primary text-xs px-3 py-1"
                    >
                      Create
                    </button>
                    <button
                      onClick={() => { setShowNewListInput(false); setNewListName(''); }}
                      className="btn-primary-inverse text-xs px-3 py-1"
                    >
                      Cancel
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div
              className="flex-1 overflow-y-auto"
              onDragOver={handleListDragOver}
              onDrop={handleListDrop}
            >
              {filteredTodoItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center text-gray-500 text-sm py-8">
                  <img src="/To_Do_Items.png" alt="Empty To-do List" className="w-24 h-24 mb-4 opacity-70" />
                  <p>Add a To-do item to this list</p>
                </div>
              ) : (
                <div className="space-y-0">
                  <AnimatePresence initial={false}>
                    {filteredTodoItems.map((todo) => (
                      <motion.div
                        key={todo.id}
                        id={`todo-item-${todo.id}`}
                        layout
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -50, scale: 0.8 }}
                        transition={{ duration: 0.3, ease: "easeOut" }}
                        className={`relative flex items-start gap-1 py-3 border-b-[0.5px] border-[#AB9C95]
                          ${sortOption === 'myOrder' ? 'cursor-grab' : ''}
                          ${draggedTodoId === todo.id ? 'opacity-50 border-dashed border-2 border-[#A85C36]' : ''}
                          ${dragOverTodoId === todo.id ? 'bg-[#EBE3DD]' : ''}
                        `}
                        draggable={sortOption === 'myOrder'}
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
                                  e.currentTarget.blur();
                                }
                              }}
                              className="font-work text-xs font-medium text-[#332B42] border border-[#AB9C95] rounded-[3px] px-1 py-0.5 w-full"
                              autoFocus
                              disabled={todo.isCompleted}
                            />
                          ) : (
                            <p
                              className={`font-work text-xs font-medium text-[#332B42] ${todo.isCompleted ? 'line-through text-gray-500' : ''} ${todo.isCompleted ? '' : 'cursor-pointer'}`}
                              onClick={todo.isCompleted ? undefined : () => {
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
                                disabled={todo.isCompleted}
                              />
                              <button
                                onClick={() => handleUpdateDeadline(todo.id)}
                                className="btn-primary text-xs px-2 py-1"
                                disabled={todo.isCompleted}
                              >
                                Update
                              </button>
                               <button
                                onClick={handleCancelDeadline}
                                className="btn-primary-inverse text-xs px-2 py-1"
                                disabled={todo.isCompleted}
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
                              disabled={todo.isCompleted}
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
                                disabled={todo.isCompleted}
                              />
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleUpdateNote(todo.id)}
                                  className="btn-primary text-xs px-2 py-1"
                                  disabled={todo.isCompleted}
                                >
                                  Update
                                </button>
                                <button
                                  onClick={handleCancelNote}
                                  className="btn-primary-inverse text-xs px-2 py-1"
                                  disabled={todo.isCompleted}
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
                                whiteSpace: 'pre-wrap'
                              }}
                              onClick={() => handleAddNote(todo)}
                            >
                              Note: {todo.note}
                            </p>
                          ) : (
                            <button
                              onClick={() => handleAddNote(todo)}
                              className={`text-xs font-normal text-[#364257] underline italic text-left p-0 bg-transparent border-none block mt-1 ${todo.isCompleted ? 'text-gray-500' : ''}`}
                              disabled={todo.isCompleted}
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
                                  label=""
                                  placeholder="Select Category"
                                  allowRemoval={true}
                                  disabled={todo.isCompleted}
                                />
                                {editingCategoryValue === "Other" && (
                                  <input
                                    type="text"
                                    value={editingCustomCategoryValue || ''}
                                    onChange={handleCustomCategoryInputChange}
                                    placeholder="Enter custom category"
                                    className="text-xs font-normal text-[#364257] border border-[#AB9C95] rounded-[3px] px-1 py-0.5 block mt-1"
                                    disabled={todo.isCompleted}
                                  />
                                )}
                                <div className="flex gap-2 mt-1">
                                  <button
                                    onClick={() => handleUpdateCategory(todo.id)}
                                    className="btn-primary text-xs px-2 py-1"
                                    disabled={todo.isCompleted}
                                  >
                                    Update
                                  </button>
                                  <button
                                    onClick={handleCancelCategory}
                                    className="btn-primary-inverse text-xs px-2 py-1"
                                    disabled={todo.isCompleted}
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : todo.category ? (
                              <button
                                onClick={() => handleEditCategory(todo)}
                                className={`text-xs font-normal text-[#364257] text-left p-0 bg-transparent border-none ${todo.isCompleted ? 'opacity-70 cursor-not-allowed' : ''}`}
                                disabled={todo.isCompleted}
                              >
                                <CategoryPill category={todo.category} />
                              </button>
                            ) : (
                              <button
                                onClick={() => handleEditCategory(todo)}
                                className={`text-xs font-normal text-[#364257] underline text-left p-0 bg-transparent border-none ${todo.isCompleted ? 'text-gray-500' : ''}`}
                                disabled={todo.isCompleted}
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
                              e.stopPropagation();
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
