import { useState, useCallback, useEffect } from 'react';

interface UseNewlyAddedItemsProps {
  animationDuration?: number;
}

export const useNewlyAddedItems = ({ 
  animationDuration = 1000 
}: UseNewlyAddedItemsProps = {}) => {
  const [newlyAddedItems, setNewlyAddedItems] = useState<Set<string>>(new Set());

  const addNewItem = useCallback((itemId: string) => {
    setNewlyAddedItems(prev => new Set(prev).add(itemId));
  }, []);

  const removeItem = useCallback((itemId: string) => {
    setNewlyAddedItems(prev => {
      const newSet = new Set(prev);
      newSet.delete(itemId);
      return newSet;
    });
  }, []);

  const clearAll = useCallback(() => {
    setNewlyAddedItems(new Set());
  }, []);

  const isNewlyAdded = useCallback((itemId: string) => {
    return newlyAddedItems.has(itemId);
  }, [newlyAddedItems]);

  // Auto-clear items after animation duration
  useEffect(() => {
    if (newlyAddedItems.size > 0) {
      const timer = setTimeout(() => {
        setNewlyAddedItems(new Set());
      }, animationDuration);
      return () => clearTimeout(timer);
    }
  }, [newlyAddedItems, animationDuration]);

  return {
    newlyAddedItems,
    addNewItem,
    removeItem,
    clearAll,
    isNewlyAdded,
    hasItems: newlyAddedItems.size > 0
  };
}; 