import { useState, useEffect, useMemo, useCallback } from 'react';
import { db, getUserCollectionRef } from '@/lib/firebase';
import { collection, query, where, orderBy, onSnapshot, addDoc, doc, setDoc, updateDoc, deleteDoc, writeBatch, getDocs, getDoc, limit } from 'firebase/firestore';
import { getAllCategories, saveCategoryIfNew } from '@/lib/firebaseCategories';
import Fuse from 'fuse.js';
import { useCustomToast } from './useCustomToast';
import { useAuth } from './useAuth';
import type { TodoItem, TodoList } from '@/types/todo';
import { sendTodoUpdateNotification } from '@/utils/todoNotifications';

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
  const [justMovedItemId, setJustMovedItemId] = useState<string | null>(null);

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

  // Combine categories from collection and from tasks in the current list
  const allCategoriesCombined = useMemo(() => {
    // Categories from the user's collection
    const fromCollection = allCategories;
    // Categories from the current list's tasks
    const fromTasks = todoItems
      .map((item) => item.category)
      .filter((cat): cat is string => !!cat && typeof cat === 'string');
    // Combine and deduplicate
    return Array.from(new Set([...fromCollection, ...fromTasks])).filter(Boolean);
  }, [allCategories, todoItems]);

  useEffect(() => {
    if (justMovedItemId) {
      const timer = setTimeout(() => setJustMovedItemId(null), 1200); // Flash for 1.2s
      return () => clearTimeout(timer);
    }
  }, [justMovedItemId]);

  // Fetch categories with a realtime listener
  useEffect(() => {
    if (user) {
      const categoriesRef = getUserCollectionRef('categories', user.uid);
      const q = query(categoriesRef, orderBy('name', 'asc'), limit(50)); // Limit categories for better performance

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const categories = snapshot.docs.map(doc => (doc.data() as { name: string }).name);
        setAllCategories(categories);
      });

      return () => unsubscribe();
    }
  }, [user]);

  // Fetch all todo items
  useEffect(() => {
    if (!user) return;
    
    const q = query(
      getUserCollectionRef('todoItems', user.uid),
      orderBy('orderIndex', 'asc'),
      limit(100) // Limit to 100 most recent items for better performance
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: TodoItem[] = snapshot.docs.map(doc => {
        const data = doc.data() as any;
        
        // Optimize date processing
        const processDate = (dateField: any): Date | undefined => {
          if (!dateField) return undefined;
          if (typeof dateField.toDate === 'function') return dateField.toDate();
          if (dateField instanceof Date) return dateField;
          return undefined;
        };
        
        return {
          id: doc.id,
          listId: data.listId,
          name: data.name,
          isCompleted: data.isCompleted || false,
          category: data.category,
          createdAt: processDate(data.createdAt) || new Date(),
          userId: data.userId,
          orderIndex: data.orderIndex || 0,
          deadline: processDate(data.deadline),
          endDate: processDate(data.endDate),
          note: data.note || undefined,
          contactId: data.contactId,
          completedAt: processDate(data.completedAt),
          // Assignment fields
          assignedTo: data.assignedTo || null,
          assignedBy: data.assignedBy || null,
          assignedAt: processDate(data.assignedAt),
          notificationRead: data.notificationRead || false,
          // Planning phase field
          planningPhase: data.planningPhase || null
        };
      });
      
      setAllTodoItems(items);
      
    }, (error) => {
      console.error('Error fetching todo items:', error);
      setAllTodoItems([]); // Set empty array on error
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
      // Calculate the next orderIndex for the current list - place at the top
      const minOrderIndex = todoItems.length > 0 ? Math.min(...todoItems.map(item => item.orderIndex)) : 0;

      const docRef = await addDoc(getUserCollectionRef('todoItems', user.uid), {
        name: newTaskName.trim(),
        deadline: null,
        startDate: null,
        endDate: null,
        note: null,
        category: null,
        contactId: null,
        isCompleted: false,
        createdAt: new Date(),
        listId,
        userId: user.uid,
        orderIndex: minOrderIndex - 1, // Place at the top of the list
        completedAt: null,
        justUpdated: false,
        assignedTo: null,
        assignedBy: null,
        assignedAt: null,
        notificationRead: false
      });
      
      // Green flash logic for newly created item:
      setTodoItems(prevItems =>
        prevItems.map(item =>
          item.id === docRef.id ? { ...item, justUpdated: true } : item
        )
      );
      setAllTodoItems(prevItems =>
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
        setAllTodoItems(prevItems =>
          prevItems.map(item =>
            item.id === docRef.id ? { ...item, justUpdated: false } : item
          )
        );
      }, 1000);
      
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
      
      // Send notification for completion if assigned to others
      if (todo.assignedTo && Array.isArray(todo.assignedTo) && todo.assignedTo.length > 0) {
        const currentUserName = user.displayName || 'You';
        await sendTodoUpdateNotification(
          user.uid,
          todo.id,
          todo.name,
          'completed',
          currentUserName,
          todo.assignedTo
        );
      }
      
      // Trigger green flash animation for incomplete items (moving from completed back to main list)
      if (todo.isCompleted) {
        setJustMovedItemId(todo.id);
      }
      
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
      
      // Send notification for name update if assigned to others
      const todoItem = allTodoItems.find(item => item.id === todoId);
      if (todoItem && todoItem.assignedTo && Array.isArray(todoItem.assignedTo) && todoItem.assignedTo.length > 0) {
        const currentUserName = user.displayName || 'You';
        await sendTodoUpdateNotification(
          user.uid,
          todoId,
          newName.trim(),
          'updated',
          currentUserName,
          todoItem.assignedTo
        );
      }
      
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
      
      // Send notification for category update if assigned to others
      const todoItem = allTodoItems.find(item => item.id === todoId);
      if (todoItem && todoItem.assignedTo && Array.isArray(todoItem.assignedTo) && todoItem.assignedTo.length > 0) {
        const currentUserName = user.displayName || 'You';
        await sendTodoUpdateNotification(
          user.uid,
          todoId,
          todoItem.name,
          'updated',
          currentUserName,
          todoItem.assignedTo
        );
      }
      
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
      // Get the current max orderIndex in the list
      const maxOrderIndex = todoItems.length > 0 ? Math.max(...todoItems.map(item => item.orderIndex)) : -1;
      
      // Create the cloned todo with all required fields, handling undefined values
      const clonedTodo = {
        name: `${todo.name} (Copy)`,
        note: todo.note || null,
        deadline: todo.deadline || null,
        startDate: todo.startDate || null,
        endDate: todo.endDate || null,
        category: todo.category || null,
        contactId: todo.contactId || null,
        isCompleted: false,
        createdAt: new Date(),
        listId: todo.listId,
        userId: user.uid,
        orderIndex: maxOrderIndex + 1,
        completedAt: null,
        justUpdated: false,
        assignedTo: todo.assignedTo || null,
        assignedBy: todo.assignedBy || null,
        assignedAt: todo.assignedAt || null,
        notificationRead: false
      };

      const docRef = await addDoc(getUserCollectionRef('todoItems', user.uid), clonedTodo);
      showSuccessToast(`Task "${todo.name}" cloned!`);
      
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
      console.error('Error cloning task:', error);
      showErrorToast('Failed to clone task.');
    }
  };

  // Reorder tasks and adjust deadline
  const handleReorderAndAdjustDeadline = useCallback(async (
    draggedItemId: string,
    targetItemId: string,
    position: 'top' | 'bottom'
  ) => {
    if (!user) return;

    const draggedItem = allTodoItems.find(t => t.id === draggedItemId);
    const targetItem = allTodoItems.find(t => t.id === targetItemId);

    if (!draggedItem || !targetItem) {
      console.error("Dragged or target item not found");
        return;
      }

    // --- Deadline Adjustment ---
    let newDeadline: Date | undefined = undefined;
    if (targetItem.deadline) {
      const newDate = new Date(targetItem.deadline);
      if (position === 'top') {
        newDate.setHours(newDate.getHours() - 1);
      } else {
        newDate.setHours(newDate.getHours() + 1);
      }
      newDeadline = newDate;
    }

    // --- Reordering Logic ---
    const reorderedItems = [...allTodoItems];
    const draggedIndex = reorderedItems.findIndex(t => t.id === draggedItemId);
    
    // Remove the dragged item from its original position
    reorderedItems.splice(draggedIndex, 1);
    
    const targetIndex = reorderedItems.findIndex(t => t.id === targetItemId);
    
    // Insert it at the new position
    const insertIndex = position === 'top' ? targetIndex : targetIndex + 1;
    reorderedItems.splice(insertIndex, 0, draggedItem);

    // --- Batch Update to Firestore ---
    try {
      const batch = writeBatch(db);

      // Update orderIndex for all items in the list
      reorderedItems
        .filter(t => t.listId === draggedItem.listId)
        .forEach((item, index) => {
          const itemRef = doc(getUserCollectionRef('todoItems', user.uid), item.id);
          let updateData: { orderIndex: number; deadline?: Date } = { orderIndex: index };

          // If this is the dragged item, update its deadline as well
          if (item.id === draggedItemId && newDeadline) {
            updateData.deadline = newDeadline;
          }
          
          batch.update(itemRef, removeUndefinedFields(updateData));
      });

      await batch.commit();
      setJustMovedItemId(draggedItemId);
      showSuccessToast('Task moved and deadline adjusted!');

    } catch (error) {
      console.error("Failed to reorder tasks:", error);
      showErrorToast("Failed to move task.");
    }
  }, [allTodoItems, user, showSuccessToast, showErrorToast]);

  // Move task
  const handleMoveTodoItem = async (taskId: string, currentListId: string, targetListId: string) => {
    if (!user || !taskId || !targetListId) return;

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
      // Calculate the next orderIndex for the current list - place at the top
      const minOrderIndex = todoItems.length > 0 ? Math.min(...todoItems.map(item => item.orderIndex)) : 0;

      const docRef = await addDoc(getUserCollectionRef('todoItems', user.uid), {
        name: data.name,
        note: data.note || null,
        deadline: data.deadline || null,
        startDate: data.startDate || null,
        endDate: data.endDate || null,
        category: data.category || null,
        contactId: null,
        isCompleted: false,
        createdAt: new Date(),
        listId,
        userId: user.uid,
        orderIndex: minOrderIndex - 1, // Place at the top of the list
        completedAt: null,
        justUpdated: false,
        assignedTo: null,
        assignedBy: null,
        assignedAt: null,
        notificationRead: false
      });
      
      // Green flash logic for newly created item:
      setTodoItems(prevItems =>
        prevItems.map(item =>
          item.id === docRef.id ? { ...item, justUpdated: true } : item
        )
      );
      setAllTodoItems(prevItems =>
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
        setAllTodoItems(prevItems =>
          prevItems.map(item =>
            item.id === docRef.id ? { ...item, justUpdated: false } : item
          )
        );
      }, 1000);
      
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
  const handleOpenAddTodo = (hasLists: boolean = true) => {
    // If no lists exist at all, show toast and open new list modal
    if (!hasLists) {
      showErrorToast('You need to create a list before adding a to-do item.');
      if (typeof window !== 'undefined') {
        // Try to trigger the new list modal/input
        const event = new CustomEvent('open-new-list-modal');
        window.dispatchEvent(event);
      }
      return;
    }
    
    // If we have lists, always show the side card (even in All To-Do Items view)
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
    allCategoriesCombined,
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
    justMovedItemId,

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
    handleReorderAndAdjustDeadline,
  };
} 