import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './useAuth';
import { TodoQueryOptimizer } from '@/utils/databaseOptimizer';
import { TodoList, TodoItem } from '@/types/todo';
import { logger } from '@/utils/logger';

interface OptimizedTodoData {
  todoLists: TodoList[];
  todoItems: TodoItem[];
  loading: boolean;
  error: string | null;
  refreshData: () => Promise<void>;
  invalidateCache: () => void;
}

const CACHE_TTL = 2 * 60 * 1000; // 2 minutes
const MAX_RETRIES = 3;

export function useOptimizedTodoData(selectedListId?: string | null): OptimizedTodoData {
  const { user } = useAuth();
  const [todoLists, setTodoLists] = useState<TodoList[]>([]);
  const [todoItems, setTodoItems] = useState<TodoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Cache refs to prevent unnecessary re-fetches
  const listsCacheRef = useRef<{ data: TodoList[]; timestamp: number } | null>(null);
  const itemsCacheRef = useRef<{ data: TodoItem[]; timestamp: number } | null>(null);
  const retryCountRef = useRef(0);

  // Process date fields consistently
  const processDate = (dateField: any): Date | undefined => {
    if (!dateField) return undefined;
    if (typeof dateField.toDate === 'function') return dateField.toDate();
    if (dateField instanceof Date) return dateField;
    return undefined;
  };

  // Convert Firestore data to TodoList
  const convertToTodoList = (data: any): TodoList => ({
    id: data.id,
    name: data.name,
    order: data.order || 0,
    userId: data.userId,
    createdAt: processDate(data.createdAt) || new Date(),
    orderIndex: data.orderIndex || 0
  });

  // Convert Firestore data to TodoItem
  const convertToTodoItem = (data: any): TodoItem => ({
    id: data.id,
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
  });

  // Fetch todo lists with caching
  const fetchTodoLists = useCallback(async (): Promise<TodoList[]> => {
    if (!user) return [];

    // Check cache first
    if (listsCacheRef.current && Date.now() - listsCacheRef.current.timestamp < CACHE_TTL) {
      logger.debug('Using cached todo lists');
      return listsCacheRef.current.data;
    }

    try {
      logger.debug('Fetching todo lists from Firestore');
      const data = await TodoQueryOptimizer.getTodoListsByUser(user.uid, {
        cache: true,
        cacheTTL: CACHE_TTL,
        limit: 50
      });

      const lists = data.map(convertToTodoList);
      
      // Update cache
      listsCacheRef.current = {
        data: lists,
        timestamp: Date.now()
      };

      return lists;
    } catch (err) {
      logger.error('Error fetching todo lists:', err);
      throw err;
    }
  }, [user]);

  // Fetch todo items with caching
  const fetchTodoItems = useCallback(async (listId?: string | null): Promise<TodoItem[]> => {
    if (!user) return [];

    const cacheKey = listId || 'all';
    
    // Check cache first
    if (itemsCacheRef.current && Date.now() - itemsCacheRef.current.timestamp < CACHE_TTL) {
      logger.debug(`Using cached todo items for ${cacheKey}`);
      return itemsCacheRef.current.data;
    }

    try {
      logger.debug(`Fetching todo items from Firestore for ${cacheKey}`);
      const data = listId 
        ? await TodoQueryOptimizer.getTodoItemsByList(user.uid, listId, {
            cache: true,
            cacheTTL: CACHE_TTL,
            pageSize: 100
          })
        : await TodoQueryOptimizer.getAllTodoItemsByUser(user.uid, {
            cache: true,
            cacheTTL: CACHE_TTL,
            pageSize: 200
          });

      const items = data.map(convertToTodoItem);
      
      // Update cache
      itemsCacheRef.current = {
        data: items,
        timestamp: Date.now()
      };

      return items;
    } catch (err) {
      logger.error('Error fetching todo items:', err);
      throw err;
    }
  }, [user]);

  // Main data fetching function with retry logic
  const fetchData = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [lists, items] = await Promise.all([
        fetchTodoLists(),
        fetchTodoItems(selectedListId)
      ]);

      setTodoLists(lists);
      setTodoItems(items);
      retryCountRef.current = 0; // Reset retry count on success
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch data';
      setError(errorMessage);
      
      // Retry logic
      if (retryCountRef.current < MAX_RETRIES) {
        retryCountRef.current++;
        logger.warn(`Retrying data fetch (attempt ${retryCountRef.current}/${MAX_RETRIES})`);
        setTimeout(() => fetchData(), 1000 * retryCountRef.current); // Exponential backoff
      } else {
        logger.error('Max retries reached, giving up');
        retryCountRef.current = 0;
      }
    } finally {
      setLoading(false);
    }
  }, [user, selectedListId, fetchTodoLists, fetchTodoItems]);

  // Refresh data function
  const refreshData = useCallback(async () => {
    invalidateCache();
    await fetchData();
  }, [fetchData]);

  // Invalidate cache function
  const invalidateCache = useCallback(() => {
    listsCacheRef.current = null;
    itemsCacheRef.current = null;
    logger.debug('Todo data cache invalidated');
  }, []);

  // Initial data fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    todoLists,
    todoItems,
    loading,
    error,
    refreshData,
    invalidateCache
  };
}
