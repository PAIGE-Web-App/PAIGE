import { useState, useEffect, useCallback } from 'react';

interface MobileTodoState {
  selectedListId: string | null;
  viewMode: 'list' | 'calendar';
  isAllSelected: boolean;
  isCompletedSelected: boolean;
}

const STORAGE_KEY = 'mobile-todo-state';

export const useMobileTodoState = () => {
  const [state, setState] = useState<MobileTodoState>({
    selectedListId: null,
    viewMode: 'list',
    isAllSelected: false,
    isCompletedSelected: false,
  });

  // Load state from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setState(parsed);
      }
    } catch (error) {
      console.error('Failed to load mobile todo state:', error);
    }
  }, []);

  // Save state to localStorage whenever it changes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.error('Failed to save mobile todo state:', error);
    }
  }, [state]);

  const updateState = useCallback((updates: Partial<MobileTodoState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  const selectList = useCallback((listId: string | null, isAll: boolean = false, isCompleted: boolean = false) => {
    updateState({
      selectedListId: listId,
      isAllSelected: isAll,
      isCompletedSelected: isCompleted,
    });
  }, [updateState]);

  const setViewMode = useCallback((mode: 'list' | 'calendar') => {
    updateState({ viewMode: mode });
  }, [updateState]);

  const clearSelection = useCallback(() => {
    updateState({
      selectedListId: null,
      isAllSelected: false,
      isCompletedSelected: false,
    });
  }, [updateState]);

  return {
    ...state,
    selectList,
    setViewMode,
    clearSelection,
    updateState,
  };
};
