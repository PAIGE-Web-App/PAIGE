import { useState, useEffect, useMemo, useCallback } from 'react';
import { db, getUserCollectionRef } from '@/lib/firebase';
import { collection, query, where, orderBy, onSnapshot, addDoc, doc, setDoc, updateDoc, deleteDoc, writeBatch, getDocs, getDoc } from 'firebase/firestore';
import { getAllCategories, saveCategoryIfNew } from '@/lib/firebaseCategories';
import Fuse from 'fuse.js';
import { useCustomToast } from './useCustomToast';
import { useAuth } from './useAuth';
import type { TodoItem, TodoList } from '@/types/todo';

// Utility functions
function removeUndefinedFields<T extends object>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([_, v]) => v !== undefined)
  ) as Partial<T>;
}

function parseLocalDateTime(input: string): Date {
  if (typeof input !== 'string') return new Date(NaN);
  const [datePart, timePart] = input.split('T');
  const [year, month, day] = datePart.split('-').map(Number);
  const [hour = 17, minute = 0] = (timePart ? timePart.split(':').map(Number) : [17, 0]);
  // Always create a local date
  return new Date(year, month - 1, day, hour, minute, 0, 0);
}

function forceLocalMidnight(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

const isValidDateInput = (str: any) => {
  if (!str) return false;
  const date = new Date(str);
  return date instanceof Date && !isNaN(date.getTime());
};

export function useTodoItems(selectedList: TodoList | null) {
  const { user } = useAuth();
  const { showSuccessToast, showErrorToast } = useCustomToast();

  // State for todo items
  const [allTodoItems, setAllTodoItems] = useState<TodoItem[]>([]);
  const [todoItems, setTodoItems] = useState<TodoItem[]>([]);
  const [newTaskName, setNewTaskName] = useState('');

  // State for categories
  const [allCategories, setAllCategories] = useState<string[]>([]);

  // State for task counts
  const [listTaskCounts, setListTaskCounts] = useState<Map<string, number>>(new Map());

  // State for move task modal
  const [showMoveTaskModal, setShowMoveTaskModal] = useState(false);
  const [taskToMove, setTaskToMove] = useState<TodoItem | null>(null);

  // State for selected task in side card
  const [selectedTaskForSideCard, setSelectedTaskForSideCard] = useState<any | null>(null);
  const [showTaskDetailCard, setShowTaskDetailCard] = useState(false);

  // State for add todo
  const [showAddTodoCard, setShowAddTodoCard] = useState(false);
  const [newTodoName, setNewTodoName] = useState('');
  const [newTodoListId, setNewTodoListId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [newTodoNote, setNewTodoNote] = useState('');
  const [newTodoDeadline, setNewTodoDeadline] = useState('');
  const [newTodoCategory, setNewTodoCategory] = useState('');

  // Fetch categories
  useEffect(() => {
    if (user) {
      const fetchCategories = async () => {
        const categories = await getAllCategories(user.uid);
        setAllCategories(categories);
      };
      fetchCategories();
    }
  }, [user]);

  // Fetch all todo items
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

  // Filter todo items based on selected list
  useEffect(() => {
    if (!selectedList) {
      setTodoItems(allTodoItems);
    } else {
      setTodoItems(allTodoItems.filter(item => item.listId === selectedList.id));
    }
  }, [allTodoItems, selectedList]);

  // Calculate task counts
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

  // Add task
  const handleAddTask = async () => {
    if (!user || !newTaskName.trim()) return;

    const listId = selectedList ? selectedList.id : newTodoListId;
    if (!listId) {
      showErrorToast('Please select a list.');
      return;
    }

    try {
      await addDoc(getUserCollectionRef('todoItems', user.uid), {
        name: newTaskName.trim(),
        isCompleted: false,
        order: todoItems.length,
        createdAt: new Date(),
        listId,
        userId: user.uid,
        orderIndex: todoItems.length
      });
      showSuccessToast(`Task "${newTaskName}" added!`);
      setNewTaskName('');
    } catch (error: any) {
      console.error('Error adding task:', error);
      showErrorToast('Failed to add task.');
    }
  };

  // Toggle task completion
  const handleToggleTodoCompletion = async (todo: TodoItem) => {
    if (!user) return;

    try {
      const itemRef = doc(getUserCollectionRef('todoItems', user.uid), todo.id);
      const updateData: any = {
        isCompleted: !todo.isCompleted,
        userId: user.uid,
      };

      if (!todo.isCompleted) {
        updateData.completedAt = new Date();
      } else {
        updateData.completedAt = null;
      }

      await updateDoc(itemRef, updateData);
      showSuccessToast(todo.isCompleted ? 'Task marked as incomplete!' : 'Task completed!');
    } catch (error: any) {
      console.error('Error toggling task completion:', error);
      showErrorToast('Failed to update task.');
    }
  };

  // Update task name
  const handleUpdateTodoName = async (todoId: string, newName: string) => {
    if (!user || !newName.trim()) return;

    try {
      const itemRef = doc(getUserCollectionRef('todoItems', user.uid), todoId);
      await updateDoc(itemRef, { name: newName.trim(), userId: user.uid });
      showSuccessToast('Task name updated!');
    } catch (error: any) {
      console.error('Error updating task name:', error);
      showErrorToast('Failed to update task name.');
    }
  };

  // Update task category
  const handleUpdateTodoCategory = async (todoId: string, newCategory: string) => {
    if (!user) return;

    try {
      const itemRef = doc(getUserCollectionRef('todoItems', user.uid), todoId);
      await updateDoc(itemRef, { category: newCategory || null, userId: user.uid });
      showSuccessToast('Category updated!');
    } catch (error: any) {
      console.error('Error updating category:', error);
      showErrorToast('Failed to update category.');
    }
  };

  // Delete task
  const handleDeleteTodoItem = async (todoId: string) => {
    if (!user) return;

    try {
      await deleteDoc(doc(getUserCollectionRef('todoItems', user.uid), todoId));
      showSuccessToast('Task deleted!');
    } catch (error: any) {
      console.error('Error deleting task:', error);
      showErrorToast('Failed to delete task.');
    }
  };

  // Clone task
  const handleCloneTodo = async (todo: TodoItem) => {
    if (!user) return;

    try {
      await addDoc(getUserCollectionRef('todoItems', user.uid), {
        name: `${todo.name} (Copy)`,
        note: todo.note,
        deadline: todo.deadline,
        endDate: todo.endDate,
        category: todo.category,
        isCompleted: false,
        order: todoItems.length,
        createdAt: new Date(),
        listId: todo.listId,
        userId: user.uid,
        orderIndex: todoItems.length
      });
      showSuccessToast(`Task "${todo.name}" cloned!`);
    } catch (error: any) {
      console.error('Error cloning task:', error);
      showErrorToast('Failed to clone task.');
    }
  };

  // Move task
  const handleMoveTodoItem = async (taskId: string, currentListId: string, targetListId: string) => {
    if (!user || currentListId === targetListId) return;

    try {
      const itemRef = doc(getUserCollectionRef('todoItems', user.uid), taskId);
      await updateDoc(itemRef, { listId: targetListId, userId: user.uid });
      showSuccessToast('Task moved!');
    } catch (error: any) {
      console.error('Error moving todo item:', error);
      showErrorToast('Failed to move task.');
    }
  };

  // Update task deadline
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
    } catch (error) {
      console.error('Error updating deadline:', error);
      showErrorToast('Failed to update deadline.');
    }
  };

  // Update task note
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

  // Add todo with full data
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

  // Update task from side card
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

  // Move task modal handler
  const handleMoveTaskModal = async (taskId: string, targetListId: string) => {
    const task = allTodoItems.find(t => t.id === taskId);
    if (task) {
      await handleMoveTodoItem(taskId, task.listId, targetListId);
    }
    setShowMoveTaskModal(false);
    setTaskToMove(null);
  };

  // Open/close add todo handlers
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

  // Calendar task click handler
  const handleCalendarTaskClick = (event: any) => {
    // Find the full task object by id
    const task = allTodoItems.find(t => t.id === event.id);
    if (task) {
      setSelectedTaskForSideCard({ ...task, listName: '' }); // listName would need to be passed from parent
      setShowTaskDetailCard(true);
    }
  };

  return {
    // State
    allTodoItems,
    todoItems,
    newTaskName,
    allCategories,
    listTaskCounts,
    allTodoCount,
    showMoveTaskModal,
    taskToMove,
    selectedTaskForSideCard,
    showTaskDetailCard,
    showAddTodoCard,
    newTodoName,
    newTodoListId,
    isAdding,
    newTodoNote,
    newTodoDeadline,
    newTodoCategory,

    // Setters
    setNewTaskName,
    setAllCategories,
    setShowMoveTaskModal,
    setTaskToMove,
    setSelectedTaskForSideCard,
    setShowTaskDetailCard,
    setShowAddTodoCard,
    setNewTodoName,
    setNewTodoListId,
    setNewTodoNote,
    setNewTodoDeadline,
    setNewTodoCategory,

    // Handlers
    handleAddTask,
    handleToggleTodoCompletion,
    handleUpdateTodoName,
    handleUpdateTodoCategory,
    handleDeleteTodoItem,
    handleCloneTodo,
    handleMoveTodoItem,
    handleUpdateTodoDeadline,
    handleUpdateTodoNote,
    handleAddTodo,
    handleUpdateTask,
    handleMoveTaskModal,
    handleOpenAddTodo,
    handleCloseAddTodo,
    handleCalendarTaskClick,
  };
} 