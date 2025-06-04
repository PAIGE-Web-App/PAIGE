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
import { db, getUserCollectionRef } from '../lib/firebase';
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
// import Banner from './Banner'; // Commented out as we're including it directly for demonstration

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
  completedAt?: Date; // Added completedAt to TodoItem interface
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


const RightDashboardPanel: React.FC<RightDashboardPanelProps> = ({ currentUser, contacts }) => {
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
            completedAt: data.completedAt?.toDate(), // Ensure completedAt is fetched and converted
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
            const taskData = docSnap.data();
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
            const taskData = docSnap.data();
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
    let updatedCompletedAt: Date | null = null; // Initialize as null or undefined

    if (updatedIsCompleted) {
      updatedCompletedAt = new Date(); // Set to current time when completed
    } else {
      updatedCompletedAt = null; // Clear when uncompleted
    }

    const todoRef = doc(getUserCollectionRef("todoItems", todo.userId), todo.id);
    await setDoc(todoRef, {
      isCompleted: updatedIsCompleted,
      completedAt: updatedCompletedAt, // Add this line to update the completedAt field
    }, { merge: true });

    // Optimistically update the local state without re-fetching all todos
    setTodoItems((prevTodoItems) => // Changed setTodos to setTodoItems
      prevTodoItems.map((item) =>
        item.id === todo.id
          ? { ...item, isCompleted: updatedIsCompleted, completedAt: updatedCompletedAt }
          : item
      )
    );

    toast.success(`To-do item marked as ${updatedIsCompleted ? 'complete' : 'incomplete'}!`);
  } catch (error: any) {
    console.error('Error toggling To-Do item completion:', error);
    toast.error(`Failed to update To-do item: ${error.message}`);
  }
}, [setTodoItems]); // Changed setTodos to setTodoItems in dependency array

  // Function to handle updating the deadline (now called from TodoItemComponent)
  const handleUpdateDeadline = useCallback(async (todoId: string, newDeadline: Date | null) => {
    if (!currentUser) {
      toast.error('User not authenticated.');
      return;
    }
    try {
      const todoRef = doc(getUserCollectionRef("todoItems", currentUser.uid), todoId);
      await setDoc(todoRef, { deadline: newDeadline }, { merge: true });
      toast.success('Deadline updated!');
    }  catch (error: any) {
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


  return (
    <div
      className="hidden md:flex flex-row w-full h-full rounded-[5px] border border-[#AB9C95] overflow-hidden"
      style={{ maxHeight: '100%' }}
    >
      {/* Vertical Navigation (Icons) - Main Panel Switcher - Left Column of Right Panel */}
      <div className="flex flex-col bg-[#F3F2F0] p-2 border-r border-[#AB9C95] space-y-2 flex-shrink-0 w-[60px]"> {/* Added fixed width */}
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
        className="flex-1 bg-[#DEDBDB] p-3 overflow-y-auto w-full"
        style={{ maxHeight: '100%' }}
      >
        {/* Conditional Content based on rightPanelSelection */}
        {rightPanelSelection === 'todo' && (
          <div className="flex flex-col h-full">
            {/* Wrapper div for the header and tabs with the desired background color */}
            <div className="bg-[#F3F2F0] rounded-t-[5px] -mx-4 -mt-4 border-b border-[#AB9C95] p-3 md:p-4">
              <div className="flex justify-between items-center px-1 pt-1 mb-2 md:px-0 md:pt-0">
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
                      className="p-1 rounded-[5px] text-[#7A7A7A] hover:text-[#332B42] border border-[#AB9C95] hover:bg-[#F3F2F0]"
                      title="Sort tasks"
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
                            className="flex items-center gap-2 px-3 py-2 text-sm text-[#332B42] hover:bg-[#F3F2F0] rounded-[3px]"
                          >
                            <Plus size={16} /> New To-do Item
                          </button>
                          {/* Add other options if needed in the future */}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>

              {/* To-do Lists Tabs */}
              <div className="flex px-1 overflow-x-auto pb-3 custom-scrollbar"> {/* Changed pb-0 to pb-3 */}
                {todoLists.map((list) => (
                  <div key={list.id} className="relative list-tab-wrapper">
                    {editingListNameId === list.id ? (
                      <input
                        key={list.id} // Added key for proper re-rendering
                        type="text"
                        value={editingListNameValue || ''}
                        onChange={(e) => setEditingListNameValue(e.target.value)}
                        onBlur={() => handleRenameList(list.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.currentTarget.blur(); // This will trigger onBlur
                          } else if (e.key === 'Escape') {
                            setEditingListNameId(null);
                            setEditingListNameValue(null);
                          }
                        }}
                        className="text-sm border border-[#AB9C95] rounded-[5px] px-2 py-1 w-32 focus:outline-none focus:ring-1 focus:ring-[#A85C36] mr-2"
                        autoFocus
                      />
                    ) : (
                      <div
                        onClick={() => setSelectedListId(list.id)}
                        className={`
                          flex items-center justify-between px-4 py-1 text-sm font-medium whitespace-nowrap transition-all duration-200 ease-in-out group relative cursor-pointer
                          ${selectedListId === list.id
                            ? 'bg-[#DEDBDB] text-[#332B42] rounded-t-[5px]'
                            : 'bg-[#F3F2F0] text-[#364257] hover:bg-[#E0DBD7] border-b-2 border-transparent hover:border-[#AB9C95] rounded-t-[5px]'
                          }
                          mr-2
                        `}
                      >
                        <span>{list.name}</span>
                        {/* Display task count */}
                        {listTaskCounts.has(list.id) && (
                          <span className="ml-2 text-xs text-[#7A7A7A] bg-[#EBE3DD] px-1.5 py-0.5 rounded-full">
                            {listTaskCounts.get(list.id)}
                          </span>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenListMenuId(openListMenuId === list.id ? null : list.id);
                          }}
                          className="flex-shrink-0 p-1 rounded-full text-gray-500 hover:bg-gray-300 ml-2 opacity-0 group-hover:opacity-100 transition-opacity"
                          ref={el => listButtonRefs.current[list.id] = el}
                        >
                          <MoreHorizontal size={14} />
                        </button>
                      </div>
                    )}
                    <AnimatePresence>
                      {openListMenuId === list.id && (
                        <ListMenuDropdown
                          list={list}
                          handleRenameList={handleRenameList}
                          handleDeleteList={handleDeleteList}
                          setEditingListNameId={setEditingListNameId}
                          setEditingListNameValue={setEditingListNameValue}
                          setOpenListMenuId={setOpenListMenuId}
                          buttonRef={{ current: listButtonRefs.current[list.id] }}
                        />
                      )}
                    </AnimatePresence>
                  </div>
                ))}
                {/* New List Button / Input */}
                {!showNewListInput ? (
                  <button
                    onClick={() => {
                      // Always show the input field when the "New List" button is clicked
                      setShowNewListInput(true);
                    }}
                    className="btn-primary-inverse px-2 py-1 text-xs font-medium rounded-full whitespace-nowrap mr-2 transition-colors"
                    title={willReachListLimit ? `You have reached the limit of ${STARTER_TIER_MAX_LISTS} lists.` : 'Create a new list'}
                  >
                    + New List
                  </button>
                ) : (
                  <motion.div
                    key="new-list-input-container" // Added key for proper re-rendering
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 'auto' }}
                    exit={{ opacity: 0, width: 0 }}
                    transition={{ duration: 0.2 }}
                    className="flex items-center gap-2 pr-2"
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
                      placeholder="List name"
                      className="text-sm border border-[#AB9C95] rounded-[5px] px-2 py-1 w-32 focus:outline-none focus:ring-1 focus:ring-[#A85C36]"
                      autoFocus
                    />
                    <button
                      onClick={handleCreateNewList}
                      className="btn-primary text-xs px-3 py-1"
                    >
                      Add
                    </button>
                    <button
                      onClick={() => { setShowNewListInput(false); setNewListName(''); }}
                      className="btn-primary-inverse text-xs px-3 py-1"
                    >
                      Cancel
                    </button>
                  </motion.div>
                )}
              </div>
            </div>

            {/* Banner for list limit */}
            <AnimatePresence>
              {willReachListLimit && showListLimitBanner && ( // Conditionally render based on showListLimitBanner
                <div className="-mx-3">
                <Banner
                  message={
                    <>
                      Your plan allows for a maximum of {STARTER_TIER_MAX_LISTS} lists.{' '}
                      <a
                        href="#"
                        onClick={(e) => {
                          e.preventDefault(); // Prevent default link behavior
                          setShowUpgradeModal(true);
                        }}
                        className="underline text-blue-700 hover:text-blue-900"
                      >
                        Upgrade to create more!
                      </a>
                    </>
                  }
                  type="info"
                  onDismiss={() => setShowListLimitBanner(false)}
                />
                </div>
              )}
            </AnimatePresence>


            {/* Main To-Do Items Display Area - This will now ONLY contain incomplete tasks and be the scrollable part */}
            <div
              className="flex-1 overflow-y-auto pt-2 px-1 md:px-0" // Removed pb-16 as sticky footer is outside
              onDragOver={handleListDragOver}
              onDrop={handleListDrop}
            >
              {filteredTodoItems.incompleteTasks.length === 0 && filteredTodoItems.completedTasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center text-gray-500 text-sm py-8">
                  <img src="/To_Do_Items.png" alt="Empty To-do List" className="w-24 h-24 mb-4 opacity-70" />
                  <p>Add a To-do item to this list</p>
                </div>
              ) : (
                <div className="space-y-0">
                  {/* Incomplete Tasks */}
                  {filteredTodoItems.incompleteTasks.length > 0 && (
                    <AnimatePresence initial={false}>
                      {filteredTodoItems.incompleteTasks.map((todo) => (
                        <TodoItemComponent
                          key={todo.id}
                          todo={todo}
                          contacts={contacts}
                          allCategories={allCategories}
                          sortOption={sortOption}
                          draggedTodoId={draggedTodoId}
                          dragOverTodoId={dragOverTodoId}
                          dropIndicatorPosition={dropIndicatorPosition}
                          currentUser={currentUser}
                          handleToggleTodoComplete={handleToggleTodoComplete}
                          handleUpdateTaskName={handleUpdateTaskName}
                          handleUpdateDeadline={handleUpdateDeadline}
                          handleUpdateNote={handleUpdateNote}
                          handleUpdateCategory={handleUpdateCategory}
                          handleCloneTodo={handleCloneTodo}
                          handleDeleteTodo={handleDeleteTodo}
                          setTaskToMove={setTaskToMove}
                          setShowMoveTaskModal={setShowMoveTaskModal}
                          handleDragStart={handleDragStart}
                          handleDragEnter={handleDragEnter}
                          handleDragLeave={handleDragLeave}
                          handleItemDragOver={handleItemDragOver}
                          handleDragEnd={handleDragEnd}
                        />
                      ))}
                    </AnimatePresence>
                  )}
                  {/* Removed the Completed Tasks Section from here */}
                </div>
              )}
            </div>

            {/* COMPLETED TASKS SECTION - Moved OUTSIDE the main scrollable area for incomplete tasks */}
            {filteredTodoItems.completedTasks.length > 0 && (
              <div className="sticky bottom-0 z-10 bg-[#DEDBDB] mt-4 border-t border-[#AB9C95] pt-3 -mx-3">
                <button
                  onClick={() => setShowCompletedTasks(!showCompletedTasks)}
                  className="w-full flex items-center justify-between text-sm font-medium text-[#332B42] py-2 px-3 md:px-4 hover:bg-[#F3F2F0] rounded-[5px]" // Changed px-1 to px-3 md:px-4
                >
                  <div className="flex items-center gap-2"> {/* Add this div for the icon and text */}
                    <CircleCheck size={16} /> {/* Add the CircleCheck icon */}
                    <span>Completed ({filteredTodoItems.completedTasks.length})</span>
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
                      className="overflow-hidden max-h-[40vh] overflow-y-auto"
                    >
                      <div className="space-y-0">
                        {filteredTodoItems.completedTasks.map((todo) => (
                          <TodoItemComponent
                            key={todo.id}
                            todo={todo}
                            contacts={contacts}
                            allCategories={allCategories}
                            sortOption={sortOption}
                            draggedTodoId={draggedTodoId}
                            dragOverTodoId={dragOverTodoId}
                            dropIndicatorPosition={dropIndicatorPosition}
                            currentUser={currentUser}
                            handleToggleTodoComplete={handleToggleTodoComplete}
                            handleUpdateTaskName={handleUpdateTaskName}
                            handleUpdateDeadline={handleUpdateDeadline}
                            handleUpdateNote={handleUpdateNote}
                            handleUpdateCategory={handleUpdateCategory}
                            handleCloneTodo={handleCloneTodo}
                            handleDeleteTodo={handleDeleteTodo}
                            setTaskToMove={setTaskToMove}
                            setShowMoveTaskModal={setShowMoveTaskModal}
                            handleDragStart={handleDragStart}
                            handleDragEnter={handleDragEnter}
                            handleDragLeave={handleDragLeave}
                            handleItemDragOver={handleItemDragOver}
                            handleDragEnd={handleDragEnd}
                            className="px-3 md:px-4" // ADD THIS PROP TO THE TodoItemComponent

                          />
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
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
