import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSearchParams } from 'next/navigation';
import { useCustomToast } from './useCustomToast';
import { useAuth } from './useAuth';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  writeBatch,
  getDocs,
  Timestamp,
} from 'firebase/firestore';
import { getUserCollectionRef } from '@/lib/firebase';
import { saveCategoryIfNew } from '@/lib/firebaseCategories';
import type { TodoList } from '@/types/todo';

const STARTER_TIER_MAX_LISTS = 3;

export function useTodoLists() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showSuccessToast, showErrorToast } = useCustomToast();

  // State for todo lists
  const [todoLists, setTodoLists] = useState<TodoList[]>([]);
  const [selectedList, setSelectedList] = useState<TodoList | null>(null);
  const [newListName, setNewListName] = useState('');
  const [showNewListInput, setShowNewListInput] = useState(false);

  // State for renaming lists
  const [editingListNameId, setEditingListNameId] = useState<string | null>(null);
  const [editingListNameValue, setEditingListNameValue] = useState<string | null>(null);

  // State for list menu dropdown
  const [openListMenuId, setOpenListMenuId] = useState<string | null>(null);
  const [selectedTodoListForMenu, setSelectedTodoListForMenu] = useState<TodoList | null>(null);
  const listMenuButtonRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  // State for deletion
  const [showDeleteListModal, setShowDeleteListModal] = useState(false);
  const [listToConfirmDelete, setListToConfirmDelete] = useState<TodoList | null>(null);
  const [deletingListId, setDeletingListId] = useState<string | null>(null);
  const [pendingDeleteListId, setPendingDeleteListId] = useState<string | null>(null);

  // State for upgrade modal
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showListLimitBanner, setShowListLimitBanner] = useState<boolean>(true);

  // State for explicit all selection
  const [explicitAllSelected, setExplicitAllSelected] = useState(false);

  // Effect to handle URL params for "all" selection
  useEffect(() => {
    if (searchParams && searchParams.get('all') === '1') {
      setSelectedList(null);
      setExplicitAllSelected(true);
    }
  }, [searchParams]);

  // Effect to handle pending delete
  useEffect(() => {
    if (pendingDeleteListId) {
      console.log('[useEffect] pendingDeleteListId changed:', pendingDeleteListId);
      handleDeleteList(pendingDeleteListId);
      setPendingDeleteListId(null);
    }
  }, [pendingDeleteListId]);

  // Fetch todo lists
  useEffect(() => {
    if (!user) return;

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

      if (lists.length > 0) {
        if (selectedList && lists.some(list => list.id === selectedList.id)) {
          // Keep current selection if it exists in the new list
          return;
        }
        if (!explicitAllSelected) {
          setSelectedList(lists[0]);
        }
        // If explicitAllSelected, do not auto-select
      }
    });

    return () => unsubscribeLists();
  }, [user, explicitAllSelected]);

  // Add new list
  const handleAddList = async (nameOrEvent: string | React.MouseEvent, tasks?: any[]) => {
    if (!user) return;

    let listName: string;
    if (typeof nameOrEvent === 'string') {
      listName = nameOrEvent;
    } else {
      listName = newListName.trim();
    }

    if (!listName) {
      showErrorToast('List name cannot be empty.');
      return;
    }

    // Check if list name already exists
    if (todoLists.some(list => list.name.toLowerCase() === listName.toLowerCase())) {
      showErrorToast('A list with this name already exists.');
      return;
    }

    // Check tier limits
    if (todoLists.length >= STARTER_TIER_MAX_LISTS) {
      setShowUpgradeModal(true);
      return;
    }

    try {
      const maxOrderIndex = todoLists.length > 0 ? Math.max(...todoLists.map(list => list.orderIndex)) : -1;
      const newListRef = await addDoc(getUserCollectionRef('todoLists', user.uid), {
        name: listName,
        order: todoLists.length,
        userId: user.uid,
        createdAt: new Date(),
        orderIndex: maxOrderIndex + 1
      });

      // If tasks were provided, add them to the new list
      if (tasks && tasks.length > 0) {
        // First, handle saving any new categories.
        const categoryPromises = tasks.map(task => {
          if (task.category && task.category.includes('[NEW]')) {
            const newCategory = task.category.replace('[NEW]', '').trim();
            return saveCategoryIfNew(newCategory, user.uid);
          }
          return Promise.resolve();
        });
        await Promise.all(categoryPromises);
        
        const batch = writeBatch(getUserCollectionRef('todoItems', user.uid).firestore);
        tasks.forEach((task, index) => {
          const taskRef = doc(getUserCollectionRef('todoItems', user.uid));
          
          const processedTask = { ...task };
          if (processedTask.category && processedTask.category.includes('[NEW]')) {
            processedTask.category = processedTask.category.replace('[NEW]', '').trim();
          }
          // Replace forbidden categories with 'Other'
          if (processedTask.category && [
            'Uncategorized',
            'Needs Category',
            'Other',
            'Uncategorized (New)',
            'Needs Category (New)'
          ].includes(processedTask.category)) {
            processedTask.category = 'Other';
          }

          const taskData: any = {
            ...processedTask,
            listId: newListRef.id,
            userId: user.uid,
            createdAt: new Date(),
            orderIndex: index
          };

          if (task.deadline) {
            taskData.deadline = Timestamp.fromDate(new Date(task.deadline));
          }
          if (task.endDate) {
            taskData.endDate = Timestamp.fromDate(new Date(task.endDate));
          }

          batch.set(taskRef, taskData);
        });
        await batch.commit();
      }

      showSuccessToast(`List "${listName}" created!`);
      setNewListName('');
      setShowNewListInput(false);

      // Select the new list
      const newList = {
        id: newListRef.id,
        name: listName,
        order: todoLists.length,
        userId: user.uid,
        createdAt: new Date(),
        orderIndex: maxOrderIndex + 1
      };
      setSelectedList(newList);
    } catch (error: any) {
      console.error('Error adding list:', error);
      showErrorToast(`Failed to create list: ${error.message}`);
    }
  };

  // Update list name
  const handleUpdateListName = async (listId: string, newName: string) => {
    if (!user) return;

    if (!newName.trim()) {
      showErrorToast('List name cannot be empty.');
      return;
    }

    // Check if list name already exists (excluding current list)
    if (todoLists.some(list => list.id !== listId && list.name.toLowerCase() === newName.toLowerCase())) {
      showErrorToast('A list with this name already exists.');
      return;
    }

    try {
      const listRef = doc(getUserCollectionRef('todoLists', user.uid), listId);
      await updateDoc(listRef, { name: newName });
      showSuccessToast('List name updated!');
      setEditingListNameId(null);
      setEditingListNameValue(null);
    } catch (error: any) {
      console.error('Error updating list name:', error);
      showErrorToast(`Failed to update list name: ${error.message}`);
    }
  };

  // Execute delete list
  const executeDeleteList = async (listId: string) => {
    if (!user) return;

    try {
      // 1. Delete all tasks in the list
      const tasksQuery = query(
        getUserCollectionRef('todoItems', user.uid),
        where('listId', '==', listId)
      );
      const tasksSnapshot = await getDocs(tasksQuery);
      const batch = writeBatch(getUserCollectionRef('todoItems', user.uid).firestore);
      tasksSnapshot.forEach(taskDoc => {
        batch.delete(taskDoc.ref);
      });

      // 2. Delete the list itself
      const listRef = doc(getUserCollectionRef('todoLists', user.uid), listId);
      batch.delete(listRef);

      await batch.commit();

      // 3. Update local state
      const deletedList = todoLists.find(list => list.id === listId);
      if (deletedList) {
        showSuccessToast(`List "${deletedList.name}" deleted!`);
      }

      // 4. Handle selection
      if (selectedList?.id === listId) {
        const remainingLists = todoLists.filter(list => list.id !== listId);
        if (remainingLists.length > 0) {
          setSelectedList(remainingLists[0]);
        } else {
          setSelectedList(null);
        }
      }
    } catch (error: any) {
      console.error('Error deleting list:', error);
      showErrorToast(`Failed to delete list: ${error.message}`);
    } finally {
      setDeletingListId(null);
    }
  };

  // Handle delete list
  const handleDeleteList = async (listId: string) => {
    if (deletingListId) return; // Prevent double modal

    const listToDelete = todoLists.find(list => list.id === listId);
    if (!listToDelete) return;

    // Check if list has tasks
    const hasTasks = true; // This would need to be calculated based on actual tasks

    if (hasTasks) {
      setListToConfirmDelete(listToDelete);
      setShowDeleteListModal(true);
      setDeletingListId(listId);
    } else {
      setDeletingListId(listId);
      await executeDeleteList(listId);
    }
  };

  // Rename list
  const handleRenameList = async (listId: string) => {
    if (!editingListNameValue || editingListNameValue.trim() === '') {
      setEditingListNameId(null);
      setEditingListNameValue(null);
      return;
    }
    await handleUpdateListName(listId, editingListNameValue);
  };

  // Clone list
  const handleCloneList = async (listId: string) => {
    if (!user) return;

    // Check tier limits before cloning
    if (todoLists.length >= STARTER_TIER_MAX_LISTS) {
      setShowUpgradeModal(true);
      return;
    }

    const listToClone = todoLists.find(list => list.id === listId);
    if (!listToClone) return;

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
      const batch = writeBatch(getUserCollectionRef('todoItems', user.uid).firestore);
      let maxOrderIndex = -1;
      tasksSnapshot.forEach(taskDoc => {
        const data = taskDoc.data() as any;
        maxOrderIndex = Math.max(maxOrderIndex, data.orderIndex || 0);
      });
      let orderIndex = maxOrderIndex + 1;
      tasksSnapshot.forEach(taskDoc => {
        const data = taskDoc.data() as any;
        const newTaskRef = doc(getUserCollectionRef('todoItems', user.uid));
        batch.set(newTaskRef, {
          ...(data as object),
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

  // Sorted todo lists (with "My To-do" first)
  const sortedTodoLists = todoLists.sort((a, b) => {
    if (a.name === 'My To-do') return -1;
    if (b.name === 'My To-do') return 1;
    return a.orderIndex - b.orderIndex;
  });

  return {
    // State
    todoLists: sortedTodoLists,
    selectedList,
    newListName,
    showNewListInput,
    editingListNameId,
    editingListNameValue,
    openListMenuId,
    selectedTodoListForMenu,
    listMenuButtonRefs,
    showDeleteListModal,
    listToConfirmDelete,
    deletingListId,
    showUpgradeModal,
    showListLimitBanner,
    explicitAllSelected,

    // Setters
    setSelectedList,
    setNewListName,
    setShowNewListInput,
    setEditingListNameId,
    setEditingListNameValue,
    setOpenListMenuId,
    setSelectedTodoListForMenu,
    setShowDeleteListModal,
    setListToConfirmDelete,
    setDeletingListId,
    setShowUpgradeModal,
    setShowListLimitBanner,
    setPendingDeleteListId,

    // Handlers
    handleAddList,
    handleUpdateListName,
    handleDeleteList,
    handleRenameList,
    handleCloneList,
    executeDeleteList,
  };
} 