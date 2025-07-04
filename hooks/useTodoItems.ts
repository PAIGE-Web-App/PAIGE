import { useState, useEffect, useMemo, useCallback } from 'react';
import { db, getUserCollectionRef } from '@/lib/firebase';
import { collection, query, where, orderBy, onSnapshot, addDoc, doc, setDoc, updateDoc, deleteDoc, writeBatch, getDocs, getDoc } from 'firebase/firestore';
import { getAllCategories, saveCategoryIfNew } from '@/lib/firebaseCategories';
import Fuse from 'fuse.js';

// Utility functions
function removeUndefinedFields<T extends object>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([_, v]) => v !== undefined)
  ) as Partial<T>;
}

function parseLocalDateTime(input: string): Date {
  const [datePart, timePart] = input.split('T');
  const [year, month, day] = datePart.split('-').map(Number);
  const [hours, minutes] = (timePart || '00:00').split(':').map(Number);
  // Always create a local date
  return new Date(year, month - 1, day, hours, minutes);
}

function forceLocalMidnight(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

const isValidDateInput = (str: any) => {
  if (!str) return false;
  const date = new Date(str);
  return date instanceof Date && !isNaN(date.getTime());
};

interface TodoItem {
  id: string;
  name: string;
  isCompleted: boolean;
  deadline?: Date;
  endDate?: Date;
  note?: string;
  category?: string;
  listId: string;
  userId: string;
  orderIndex: number;
  createdAt: Date;
  completedAt?: Date;
}

export function useTodoItems({ user, selectedList, showSuccessToast, showErrorToast, allCategories }) {
  const [todoItems, setTodoItems] = useState<TodoItem[]>([]);
  const [allTodoItems, setAllTodoItems] = useState<TodoItem[]>([]);
  const [filteredTodoItems, setFilteredTodoItems] = useState<TodoItem[]>([]);
  const [todoSearchQuery, setTodoSearchQuery] = useState('');
  const [groupedTasks, setGroupedTasks] = useState<Record<string, TodoItem[]>>({});
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const [showCompletedItems, setShowCompletedItems] = useState(false);
  const [showCompletedTasks, setShowCompletedTasks] = useState(false);
  const [draggedTodoId, setDraggedTodoId] = useState<string | null>(null);
  const [dragOverTodoId, setDragOverTodoId] = useState<string | null>(null);
  const [dropIndicatorPosition, setDropIndicatorPosition] = useState<{ id: string | null, position: 'top' | 'bottom' | null }>({ id: null, position: null });

  // Fetch to-do items
  useEffect(() => {
    if (!user) return;
    const q = query(getUserCollectionRef('todoItems', user.uid), orderBy('orderIndex', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(docSnap => {
        const data = docSnap.data() as Record<string, any>;
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
        return { id: docSnap.id, ...data, deadline, endDate } as TodoItem;
      });
      setAllTodoItems(items);
      if (!selectedList) {
        setTodoItems(items);
      } else {
        setTodoItems(items.filter(item => item.listId === selectedList.id));
      }
    });
    return () => unsubscribe();
  }, [user, selectedList]);

  // Fuse.js search
  const fuse = useMemo(() => {
    return todoItems.length
      ? new Fuse(todoItems, {
          keys: ['name', 'note', 'category'],
          threshold: 0.3,
          ignoreLocation: true,
        })
      : null;
  }, [todoItems]);

  useEffect(() => {
    if (!todoSearchQuery.trim()) setFilteredTodoItems(todoItems);
    else if (fuse) setFilteredTodoItems(fuse.search(todoSearchQuery).map(result => result.item));
    else setFilteredTodoItems(todoItems);
  }, [todoSearchQuery, fuse, todoItems]);

  // Helper to get the group for a given deadline
  const getTaskGroup = useCallback((deadline?: Date | null): string => {
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
  }, []);

  // Group tasks
  useEffect(() => {
    const groups: Record<string, TodoItem[]> = {};
    todoItems.forEach((item) => {
      const group = getTaskGroup(item.deadline);
      if (!groups[group]) groups[group] = [];
      groups[group].push(item);
    });

    // Sort tasks within each group by deadline
    Object.keys(groups).forEach(group => {
      groups[group].sort((a, b) => {
        if (!a.deadline) return 1;
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
    const orderedGroups: Record<string, TodoItem[]> = {};
    groupOrder.forEach(group => {
      if (groups[group]) {
        orderedGroups[group] = groups[group];
      }
    });

    setGroupedTasks(orderedGroups);
  }, [todoItems, getTaskGroup]);

  // Toggle accordion
  const toggleGroup = useCallback((group: string) => {
    setOpenGroups(prev => ({ ...prev, [group]: !prev[group] }));
  }, []);

  // Handlers
  const handleDeleteTodoItem = useCallback(async (todoId: string) => {
    if (!user) return;
    try {
      const itemRef = doc(getUserCollectionRef("todoItems", user.uid), todoId);
      await deleteDoc(itemRef);
      showSuccessToast('Task deleted!');
    } catch (error) {
      console.error('Error deleting todo item:', error);
      showErrorToast('Failed to delete task.');
    }
  }, [user, showSuccessToast, showErrorToast]);

  const handleCloneTodo = useCallback(async (todo: TodoItem) => {
    if (!user) return;
    try {
      const { id, ...rest } = todo;
      const sanitized = removeUndefinedFields({
        ...rest,
        name: `${todo.name} (Clone)`,
        orderIndex: todoItems.length,
        createdAt: new Date(),
        userId: user.uid,
      });
      await addDoc(getUserCollectionRef("todoItems", user.uid), sanitized);
      showSuccessToast(`Task "${todo.name}" cloned!`);
    } catch (error) {
      console.error('Error cloning todo item:', error);
      showErrorToast('Failed to clone task.');
    }
  }, [user, todoItems.length, showSuccessToast, showErrorToast]);

  const handleMoveTodoItem = useCallback(async (taskId: string, currentListId: string, targetListId: string) => {
    if (!user) return;
    try {
      const taskRef = doc(getUserCollectionRef("todoItems", user.uid), taskId);
      const taskDoc = await getDoc(taskRef);

      if (!taskDoc.exists()) {
        showErrorToast('Task not found.');
        return;
      }

      const taskData = taskDoc.data() as TodoItem;

      const batch = writeBatch(db);

      const newTaskRef = doc(getUserCollectionRef("todoItems", user.uid));
      batch.set(newTaskRef, {
        ...taskData,
        listId: targetListId,
        order: todoItems.length,
        userId: user.uid,
      });

      batch.delete(taskRef);

      await batch.commit();
      showSuccessToast(`Task "${taskData.name}" moved!`);
    } catch (error) {
      console.error('Error moving todo item:', error);
      showErrorToast('Failed to move task.');
    }
  }, [user, todoItems.length, showSuccessToast, showErrorToast]);

  const handleUpdateTodoDeadline = useCallback(async (todoId: string, deadline: string | null | undefined) => {
    if (!user) return;
    try {
      const itemRef = doc(getUserCollectionRef("todoItems", user.uid), todoId);
      let deadlineDate: Date | null = null;
      if (isValidDateInput(deadline)) {
        deadlineDate = parseLocalDateTime(deadline as string);
        if (isNaN(deadlineDate.getTime())) {
          throw new Error('Invalid date string');
        }
      }
      await updateDoc(itemRef, {
        deadline: deadlineDate,
        userId: user.uid
      });
      setTodoItems(prevItems =>
        prevItems.map(item =>
          item.id === todoId ? { ...item, deadline: deadlineDate ?? undefined } : item
        )
      );
      setAllTodoItems(prevItems =>
        prevItems.map(item =>
          item.id === todoId ? { ...item, deadline: deadlineDate ?? undefined } : item
        )
      );
      showSuccessToast('Deadline updated!');
    } catch (error) {
      console.error('Error updating deadline:', error);
      showErrorToast('Failed to update deadline.');
    }
  }, [user, showSuccessToast, showErrorToast]);

  const handleUpdateTodoNote = useCallback(async (todoId: string, newNote: string | null) => {
    if (!user) return;
    try {
      const itemRef = doc(getUserCollectionRef("todoItems", user.uid), todoId);
      if (newNote && newNote.trim() !== "") {
        await updateDoc(itemRef, { note: newNote, userId: user.uid });
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
  }, [user, showSuccessToast, showErrorToast]);

  const handleToggleTodoCompletion = useCallback(async (todo: TodoItem) => {
    if (!user) return;
    try {
      const updatedIsCompleted = !todo.isCompleted;
      const firestoreCompletedAt = updatedIsCompleted ? new Date() : null;
      const localCompletedAt = updatedIsCompleted ? new Date() : undefined;

      const todoRef = doc(getUserCollectionRef("todoItems", todo.userId), todo.id);
      await setDoc(todoRef, {
        isCompleted: updatedIsCompleted,
        completedAt: firestoreCompletedAt,
      }, { merge: true });

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
  }, [user, showSuccessToast, showErrorToast]);

  const handleUpdateTodoName = useCallback(async (todoId: string, newName: string) => {
    if (!user) return;
    if (newName.trim() === '') {
      showErrorToast('Task name cannot be empty.');
      return;
    }
    try {
      const itemRef = doc(getUserCollectionRef("todoItems", user.uid), todoId);
      await updateDoc(itemRef, { name: newName, userId: user.uid });
      
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
  }, [user, showSuccessToast, showErrorToast]);

  const handleUpdateTodoCategory = useCallback(async (todoId: string, newCategory: string) => {
    if (!user) return;
    try {
      const itemRef = doc(getUserCollectionRef("todoItems", user.uid), todoId);
      if (newCategory && newCategory.trim() !== "") {
        if (!allCategories.includes(newCategory)) {
          await saveCategoryIfNew(newCategory, user.uid);
        }
        await updateDoc(itemRef, { category: newCategory, userId: user.uid });
        
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
      showSuccessToast('Category updated!');
    } catch (error) {
      console.error('Error updating category:', error);
      showErrorToast('Failed to update category.');
    }
  }, [user, allCategories, showSuccessToast, showErrorToast]);

  // Drag and Drop
  const handleDragStart = useCallback((e: React.DragEvent<HTMLDivElement>, id: string) => {
    e.dataTransfer.effectAllowed = 'move';
    setDraggedTodoId(id);
    e.currentTarget.classList.add('opacity-50', 'border-dashed', 'border-2', 'border-[#A85C36]');
  }, []);

  const handleDragEnd = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    setDraggedTodoId(null);
    setDragOverTodoId(null);
    setDropIndicatorPosition({ id: null, position: null });
    e.currentTarget.classList.remove('opacity-50', 'border-dashed', 'border-2', 'border-[#A85C36]');
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>, id: string) => {
    e.preventDefault();
    if (id === draggedTodoId) return;
    setDragOverTodoId(id);
  }, [draggedTodoId]);

  const handleDrop = useCallback(async (e: React.DragEvent<HTMLDivElement>, targetId: string) => {
    e.preventDefault();
    if (!draggedTodoId || !user) return;

    const draggedIndex = todoItems.findIndex(item => item.id === draggedTodoId);
    const targetIndex = todoItems.findIndex(item => item.id === targetId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    const reorderedItems = [...todoItems];
    const [draggedItem] = reorderedItems.splice(draggedIndex, 1);
    reorderedItems.splice(targetIndex, 0, draggedItem);

    // Update orderIndex for all items
    const batch = writeBatch(db);
    reorderedItems.forEach((item, index) => {
      const itemRef = doc(getUserCollectionRef("todoItems", user.uid), item.id);
      batch.update(itemRef, { orderIndex: index });
    });

    try {
      await batch.commit();
      setTodoItems(reorderedItems);
    } catch (error) {
      console.error('Error reordering items:', error);
      showErrorToast('Failed to reorder items.');
    }

    setDraggedTodoId(null);
    setDragOverTodoId(null);
    setDropIndicatorPosition({ id: null, position: null });
  }, [draggedTodoId, todoItems, user, showErrorToast]);

  return {
    todoItems,
    allTodoItems,
    filteredTodoItems,
    todoSearchQuery,
    setTodoSearchQuery,
    groupedTasks,
    openGroups,
    setOpenGroups,
    showCompletedItems,
    setShowCompletedItems,
    showCompletedTasks,
    setShowCompletedTasks,
    draggedTodoId,
    setDraggedTodoId,
    dragOverTodoId,
    setDragOverTodoId,
    dropIndicatorPosition,
    setDropIndicatorPosition,
    handleDeleteTodoItem,
    handleCloneTodo,
    handleMoveTodoItem,
    handleUpdateTodoDeadline,
    handleUpdateTodoNote,
    handleToggleTodoCompletion,
    handleUpdateTodoName,
    handleUpdateTodoCategory,
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleDrop,
    toggleGroup,
    getTaskGroup,
  };
} 