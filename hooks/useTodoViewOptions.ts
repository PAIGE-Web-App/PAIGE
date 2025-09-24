import { useState, useEffect, useMemo, useCallback } from 'react';
import Fuse from 'fuse.js';
import type { TodoItem } from '@/types/todo';
import { groupTasks } from '@/utils/taskGrouping';

// Helper to get the group for a given deadline
function getTaskGroup(deadline?: Date | null): string {
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
}

export function useTodoViewOptions(
  todoItems: TodoItem[],
  handleReorderAndAdjustDeadline: (
    draggedItemId: string,
    targetItemId: string,
    position: 'top' | 'bottom'
  ) => Promise<void>,
  selectedCategoryFilters: string[] = []
) {
  // Search state
  const [todoSearchQuery, setTodoSearchQuery] = useState("");

  // View mode state
  const [viewMode, setViewModeState] = useState<'list' | 'calendar'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('paige_viewMode') as 'list' | 'calendar') || 'list';
    }
    return 'list';
  });
  const [calendarViewMode, setCalendarViewModeState] = useState<'month' | 'week' | 'day' | 'year'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('paige_calendarViewMode') as 'month' | 'week' | 'day' | 'year') || 'month';
    }
    return 'month';
  });
  const [calendarDate, setCalendarDate] = useState<Date>(new Date());

  // Wrapped setters (must be defined before any useEffect that uses them)
  const setViewMode = (mode: 'list' | 'calendar') => {
    setViewModeState(mode);
  };
  const setCalendarViewMode = (mode: 'month' | 'week' | 'day' | 'year') => {
    setCalendarViewModeState(mode);
  };

  // Filter state
  const [showCompletedTasks, setShowCompletedTasks] = useState(false);
  const [showCompletedItems, setShowCompletedItems] = useState(false);

  // Sort state
  const [sortBy, setSortBy] = useState<'name' | 'deadline' | 'created' | 'category'>('deadline');

  // Group state
  const [openGroups, setOpenGroups] = useState<{ [key: string]: boolean }>({});

  // Drag and drop state
  const [draggedTodoId, setDraggedTodoId] = useState<string | null>(null);
  const [dragOverTodoId, setDragOverTodoId] = useState<string | null>(null);
  const [dropIndicatorPosition, setDropIndicatorPosition] = useState<{ id: string | null, position: 'top' | 'bottom' | null }>({ id: null, position: null });

  // Fuse.js search setup - only recreate when todoItems change significantly
  const fuse = useMemo(() => {
    if (!todoItems.length) return null;
    
    return new Fuse(todoItems, {
      keys: ["name", "note", "category"],
      threshold: 0.3,
      ignoreLocation: true,
      includeScore: false, // Disable scoring for better performance
      minMatchCharLength: 2, // Minimum character length for matches
    });
  }, [todoItems.length, todoItems.map(item => `${item.name}-${item.note}-${item.category}`).join('|')]);

  // Filtered items (search, category, etc) - optimized with early returns
  const filteredTodoItems = useMemo(() => {
    // Early return if no filters applied
    if (selectedCategoryFilters.length === 0 && !todoSearchQuery.trim()) {
      return todoItems;
    }

    let items = todoItems;
    
    // Apply category filter first (usually more selective)
    if (selectedCategoryFilters.length > 0) {
      items = items.filter((item) => selectedCategoryFilters.includes(item.category ?? ''));
    }
    
    // Apply search filter
    if (todoSearchQuery.trim()) {
      const searchTerm = todoSearchQuery.trim().toLowerCase();
      
      // Use Fuse.js for better search if available and search term is long enough
      if (fuse && searchTerm.length >= 2) {
        const searchResults = fuse.search(searchTerm);
        items = searchResults.map(result => result.item);
      } else {
        // Fallback to simple string matching for short queries
        items = items.filter((item) =>
          item.name?.toLowerCase().includes(searchTerm) ||
          item.note?.toLowerCase().includes(searchTerm)
        );
      }
    }
    
    return items;
  }, [todoItems, todoSearchQuery, selectedCategoryFilters, fuse]);

  // Group tasks using the hybrid grouping logic (supports both deadline-based and planning phase-based grouping)
  const groupedTasks = useMemo(() => {
    if (!filteredTodoItems.length) return {};

    // Limit items for better performance on mobile
    const maxItemsPerGroup = window.innerWidth < 768 ? 20 : 50;
    const limitedItems = filteredTodoItems.slice(0, maxItemsPerGroup * 9); // 9 groups max

    // Use the hybrid grouping logic from utils/taskGrouping.ts
    return groupTasks(limitedItems);
  }, [filteredTodoItems]);

  // Toggle group accordion
  const toggleGroup = useCallback((group: string) => {
    setOpenGroups(prev => ({ ...prev, [group]: !(prev[group] ?? true) }));
  }, []);

  // Keyboard shortcuts for calendar view
  useEffect(() => {
    if (viewMode !== 'calendar') return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'm' || e.key === 'M') setCalendarViewMode('month');
      if (e.key === 'w' || e.key === 'W') setCalendarViewMode('week');
      if (e.key === 'd' || e.key === 'D') setCalendarViewMode('day');
      if (e.key === 'y' || e.key === 'Y') setCalendarViewMode('year');
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [viewMode, setCalendarViewMode, calendarViewMode]);

  // Calendar navigation functions
  const navigateCalendar = useCallback((direction: 'prev' | 'next') => {
    const d = new Date(calendarDate);
    if (direction === 'prev') {
      if (calendarViewMode === 'month') d.setMonth(d.getMonth() - 1);
      else if (calendarViewMode === 'week') d.setDate(d.getDate() - 7);
      else if (calendarViewMode === 'day') d.setDate(d.getDate() - 1);
      else if (calendarViewMode === 'year') d.setFullYear(d.getFullYear() - 1);
    } else {
      if (calendarViewMode === 'month') d.setMonth(d.getMonth() + 1);
      else if (calendarViewMode === 'week') d.setDate(d.getDate() + 7);
      else if (calendarViewMode === 'day') d.setDate(d.getDate() + 1);
      else if (calendarViewMode === 'year') d.setFullYear(d.getFullYear() + 1);
    }
    setCalendarDate(d);
  }, [calendarDate, calendarViewMode]);

  // Drag and drop handlers
  const handleDragStart = useCallback((e: React.DragEvent<HTMLDivElement>, id: string) => {
    console.log('Drag start:', id);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedTodoId(id);
    e.currentTarget.classList.add('opacity-50', 'border-dashed', 'border-2', 'border-[#A85C36]');
  }, []);

  const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>, id: string) => {
    e.preventDefault();
    console.log('Drag enter:', id);
    if (draggedTodoId !== id) {
      setDragOverTodoId(id);
    }
  }, [draggedTodoId]);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    console.log('Drag leave');
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

  const handleDragEnd = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    // This function now only handles cleanup for when a drop happens outside a valid target.
    e.preventDefault();
    e.currentTarget.classList.remove('opacity-50', 'border-dashed', 'border-2', 'border-[#A85C36]');
    setDraggedTodoId(null);
    setDragOverTodoId(null);
    setDropIndicatorPosition({ id: null, position: null });
  }, []);
  
  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (draggedTodoId && dragOverTodoId && dropIndicatorPosition.position) {
      handleReorderAndAdjustDeadline(
        draggedTodoId,
        dragOverTodoId,
        dropIndicatorPosition.position
      );
    }
    // Clean up state after a successful drop
    setDraggedTodoId(null);
    setDragOverTodoId(null);
    setDropIndicatorPosition({ id: null, position: null });
  }, [draggedTodoId, dragOverTodoId, dropIndicatorPosition, handleReorderAndAdjustDeadline]);

  const handleListDrop = useCallback((e: React.DragEvent<HTMLDivElement>, targetListId: string) => {
    e.preventDefault();
    console.log('List drop:', targetListId);
    // This would need to be handled by the parent component
    setDraggedTodoId(null);
    setDragOverTodoId(null);
    setDropIndicatorPosition({ id: null, position: null });
  }, []);

  // Persist viewMode to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('paige_viewMode', viewMode);
    }
  }, [viewMode]);

  // Persist calendarViewMode to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('paige_calendarViewMode', calendarViewMode);
    }
  }, [calendarViewMode]);

  return {
    // Search state
    todoSearchQuery,
    setTodoSearchQuery,

    // View mode state
    viewMode,
    setViewMode,
    calendarViewMode,
    setCalendarViewMode,
    calendarDate,
    setCalendarDate,

    // Filter state
    showCompletedTasks,
    setShowCompletedTasks,
    showCompletedItems,
    setShowCompletedItems,

    // Sort state
    sortBy,
    setSortBy,

    // Group state
    openGroups,
    setOpenGroups,

    // Drag and drop state
    draggedTodoId,
    setDraggedTodoId,
    dragOverTodoId,
    setDragOverTodoId,
    dropIndicatorPosition,
    setDropIndicatorPosition,

    // Computed values
    filteredTodoItems,
    groupedTasks,

    // Handlers
    toggleGroup,
    navigateCalendar,
    handleDragStart,
    handleDragEnter,
    handleDragLeave,
    handleItemDragOver,
    handleDragEnd,
    handleDrop,
    handleListDrop,
    getTaskGroup,
  };
} 