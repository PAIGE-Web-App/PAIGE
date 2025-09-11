import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './useAuth';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  onSnapshot,
  QuerySnapshot,
  DocumentData
} from 'firebase/firestore';
import { getUserCollectionRef } from '@/lib/firebase';
import { TodoList, TodoItem } from '@/types/todo';
import { logger } from '@/utils/logger';

interface OptimizedTodoData {
  todoLists: TodoList[];
  allTodoItems: TodoItem[];
  todoItems: TodoItem[];
  loading: boolean;
  error: string | null;
  refreshData: () => void;
}

const CACHE_TTL = 2 * 60 * 1000; // 2 minutes
const MAX_ITEMS = 200;
const MAX_LISTS = 50;

export function useOptimizedTodoListeners(selectedListId?: string | null): OptimizedTodoData {
  const { user } = useAuth();
  const [todoLists, setTodoLists] = useState<TodoList[]>([]);
  const [allTodoItems, setAllTodoItems] = useState<TodoItem[]>([]);
  const [todoItems, setTodoItems] = useState<TodoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Cache refs to prevent unnecessary re-fetches
  const lastFetchRef = useRef<number>(0);
  const unsubscribeRefs = useRef<(() => void)[]>([]);

  // Process date fields consistently
  const processDate = (dateField: any): Date | undefined => {
    if (!dateField) return undefined;
    if (typeof dateField.toDate === 'function') return dateField.toDate();
    if (dateField instanceof Date) return dateField;
    return undefined;
  };

  // Convert Firestore data to TodoList
  const convertToTodoList = (doc: any): TodoList => ({
    id: doc.id,
    name: doc.data().name,
    order: doc.data().order || 0,
    userId: doc.data().userId,
    createdAt: processDate(doc.data().createdAt) || new Date(),
    orderIndex: doc.data().orderIndex || 0
  });

  // Convert Firestore data to TodoItem
  const convertToTodoItem = (doc: any): TodoItem => {
    const data = doc.data();
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
      assignedTo: data.assignedTo || null,
      assignedBy: data.assignedBy || null,
      assignedAt: processDate(data.assignedAt),
      notificationRead: data.notificationRead || false
    };
  };

  // Setup optimized listeners
  const setupListeners = useCallback(() => {
    if (!user) return;

    // Clear existing listeners
    unsubscribeRefs.current.forEach(unsubscribe => unsubscribe());
    unsubscribeRefs.current = [];

    setLoading(true);
    setError(null);

    // Listener for todo lists
    const listsQuery = query(
      getUserCollectionRef('todoLists', user.uid),
      where('userId', '==', user.uid),
      orderBy('orderIndex', 'asc'),
      orderBy('createdAt', 'asc'),
      limit(MAX_LISTS)
    );

    const unsubscribeLists = onSnapshot(listsQuery, 
      (snapshot: QuerySnapshot<DocumentData>) => {
        try {
          const lists = snapshot.docs.map(convertToTodoList);
          setTodoLists(lists);
          logger.debug(`Fetched ${lists.length} todo lists`);
        } catch (err) {
          logger.error('Error processing todo lists:', err);
          setError('Failed to process todo lists');
        }
      },
      (err) => {
        logger.error('Error fetching todo lists:', err);
        setError('Failed to load todo lists');
        setLoading(false);
      }
    );

    // Listener for all todo items (for counts and filtering)
    const itemsQuery = query(
      getUserCollectionRef('todoItems', user.uid),
      where('userId', '==', user.uid),
      orderBy('orderIndex', 'asc'),
      orderBy('createdAt', 'asc'),
      limit(MAX_ITEMS)
    );

    const unsubscribeItems = onSnapshot(itemsQuery,
      (snapshot: QuerySnapshot<DocumentData>) => {
        try {
          const items = snapshot.docs.map(convertToTodoItem);
          setAllTodoItems(items);
          logger.debug(`Fetched ${items.length} todo items`);
        } catch (err) {
          logger.error('Error processing todo items:', err);
          setError('Failed to process todo items');
        }
      },
      (err) => {
        logger.error('Error fetching todo items:', err);
        setError('Failed to load todo items');
        setLoading(false);
      }
    );

    unsubscribeRefs.current = [unsubscribeLists, unsubscribeItems];
    setLoading(false);
  }, [user]);

  // Filter todo items based on selected list
  useEffect(() => {
    if (!selectedListId) {
      setTodoItems(allTodoItems);
    } else {
      setTodoItems(allTodoItems.filter(item => item.listId === selectedListId));
    }
  }, [allTodoItems, selectedListId]);

  // Setup listeners when user changes
  useEffect(() => {
    setupListeners();
    
    return () => {
      unsubscribeRefs.current.forEach(unsubscribe => unsubscribe());
    };
  }, [setupListeners]);

  // Refresh data function
  const refreshData = useCallback(() => {
    const now = Date.now();
    if (now - lastFetchRef.current < CACHE_TTL) {
      logger.debug('Skipping refresh - data is still fresh');
      return;
    }
    
    lastFetchRef.current = now;
    setupListeners();
  }, [setupListeners]);

  return {
    todoLists,
    allTodoItems,
    todoItems,
    loading,
    error,
    refreshData
  };
}
