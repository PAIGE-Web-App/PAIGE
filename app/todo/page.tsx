"use client";

import React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";

// Firebase imports
import { useAuth } from '@/hooks/useAuth';
import { useQuickStartCompletion } from '@/hooks/useQuickStartCompletion';
import { db } from '@/lib/firebase';
import { writeBatch, doc, updateDoc, collection, setDoc, Timestamp } from 'firebase/firestore';

// UI component imports - keep essential ones for initial load
import Banner from '@/components/Banner';
import WeddingBanner from '@/components/WeddingBanner';
import GlobalGmailBanner from '@/components/GlobalGmailBanner';
import LoadingSpinner from '@/components/LoadingSpinner';
import TodoDeadlineGenerationProgress from '@/components/TodoDeadlineGenerationProgress';


// Lazy load heavy components
const TodoSidebar = dynamic(() => import('../../components/TodoSidebar'), {
  ssr: false
});

const TodoTopBar = dynamic(() => import('../../components/TodoTopBar'), {
  ssr: false
});

const TodoListView = dynamic(() => import('../../components/TodoListView'), {
  ssr: false
});

const CalendarView = dynamic(() => import('../../components/CalendarView'), {
  ssr: false
});

const TaskSideCard = dynamic(() => import('../../components/TaskSideCard'), {
  ssr: false
});

// Lazy load modals - only load when needed
const MoveTaskModal = dynamic(() => import('@/components/MoveTaskModal'), {
  ssr: false
});

const DeleteListConfirmationModal = dynamic(() => import('@/components/DeleteListConfirmationModal'), {
  ssr: false
});

const UpgradePlanModal = dynamic(() => import('@/components/UpgradePlanModal'), {
  ssr: false
});

const ListMenuDropdown = dynamic(() => import('@/components/ListMenuDropdown'), {
  ssr: false
});

const NewListOnboardingModal = dynamic(() => import('@/components/NewListOnboardingModal'), {
  ssr: false
});

const TodoTemplatesModal = dynamic(() => import('@/components/TodoTemplatesModal'), {
  ssr: false
});


const GoogleCalendarSync = dynamic(() => import('../../components/GoogleCalendarSync'), {
  ssr: false
});

// Custom hooks
import { useUserProfileData } from "../../hooks/useUserProfileData";
import { useAgentData } from "../../contexts/AgentDataContext"; // ✨ NEW
import { useTodoLists } from "../../hooks/useTodoLists";
import { useTodoItems } from "../../hooks/useTodoItems";
import { useTodoViewOptions } from "../../hooks/useTodoViewOptions";
import { saveCategoryIfNew, deleteCategoryByName, defaultCategories } from "@/lib/firebaseCategories";
import { useCustomToast } from "../../hooks/useCustomToast";
import { useMobileTodoState } from "../../hooks/useMobileTodoState";
import { useGlobalCompletionToasts } from "../../hooks/useGlobalCompletionToasts";
import { CreditServiceClient } from "@/lib/creditServiceClient";
import { creditEventEmitter } from "@/utils/creditEventEmitter";
import PaigeContextualAssistant from "@/components/PaigeContextualAssistant";
import { isPaigeChatEnabled } from "@/hooks/usePaigeChat";

const STARTER_TIER_MAX_LISTS = 3;

export default function TodoPage() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showSuccessToast, showInfoToast, showErrorToast } = useCustomToast();
  const { showCompletionToast } = useGlobalCompletionToasts();
  
  // Paige AI Assistant (contextual + inline chat)
  const isPaigeEnabled = isPaigeChatEnabled(user?.uid);


  // Use shared user profile data hook
  const { userName, daysLeft, profileLoading, weddingDate, weddingLocation } = useUserProfileData();
  
  // ✨ Use global agent data for cross-agent intelligence
  const agentData = useAgentData();
  
  // Track Quick Start Guide completion
  useQuickStartCompletion();

  // Use custom hooks for todo functionality
  const todoLists = useTodoLists();
  const todoItems = useTodoItems(todoLists.selectedList);
  const [selectedCategories, setSelectedCategories] = React.useState<string[]>([]);
  const viewOptions = useTodoViewOptions(
    todoItems.todoItems,
    todoItems.handleReorderAndAdjustDeadline,
    selectedCategories
  );

  // Mobile persistent state
  const mobileState = useMobileTodoState();
  const [mobileViewMode, setMobileViewMode] = React.useState<'lists' | 'items'>('lists');
  const [mobileInitialized, setMobileInitialized] = React.useState(false);

  // Paige contextual data is now handled directly in the component props
  
  // Listen for Paige's todo manipulation events
  React.useEffect(() => {
    const handlePaigeAddDeadline = (event: CustomEvent) => {
      const { todoId, deadline } = event.detail;
      console.log('Paige adding deadline:', { todoId, deadline });
      
      // Find and update the todo with the new deadline
      const todoToUpdate = todoItems.allTodoItems?.find(todo => todo.id === todoId);
      if (todoToUpdate) {
        // Use your existing deadline update logic - pass string format YYYY-MM-DD
        console.log('📅 Setting deadline:', deadline, 'for todo:', todoId);
        todoItems.handleUpdateTodoDeadline(todoId, deadline);
      }
    };

    const handlePaigeReorderTodos = async (event: CustomEvent) => {
      const { newOrder } = event.detail;
      console.log('🔄 Paige reordering todos:', newOrder);
      
      if (!newOrder || !Array.isArray(newOrder) || !user) return;
      
      try {
        // Update orderIndex for each todo based on new order
        const updatePromises = newOrder.map((todoId: string, index: number) => {
          const todoRef = doc(db, 'users', user.uid, 'todoItems', todoId);
          return updateDoc(todoRef, { orderIndex: index });
        });
        
        await Promise.all(updatePromises);
        console.log('✅ Todos reordered successfully');
      } catch (error) {
        console.error('❌ Error reordering todos:', error);
      }
    };

    const handlePaigeCompleteTodo = (event: CustomEvent) => {
      const { todoId } = event.detail;
      console.log('Paige completing todo:', todoId);
      
      // Use your existing completion logic
      todoItems.handleToggleTodoCompletion(todoId);
    };

    const handlePaigeUpdateTodo = (event: CustomEvent) => {
      const { todoId, updates } = event.detail;
      console.log('Paige updating todo:', { todoId, updates });
      
      // Use your existing update logic - need to update specific fields
      if (updates.name) todoItems.handleUpdateTodoName(todoId, updates.name);
      if (updates.category) todoItems.handleUpdateTodoCategory(todoId, updates.category);
      if (updates.deadline) todoItems.handleUpdateTodoDeadline(todoId, updates.deadline);
      if (updates.note) todoItems.handleUpdateTodoNote(todoId, updates.note);
    };

    const handlePaigeCreateTodos = async (event: CustomEvent) => {
      const { todos, listId, listName } = event.detail;
      console.log('🎯 Paige creating todos:', { todos, listId, listName });
      
      if (!todos || !Array.isArray(todos) || todos.length === 0 || !user) return;
      
      try {
        // Create each todo directly in Firestore with the specific listId
        for (const todo of todos) {
          const todoRef = doc(collection(db, 'users', user.uid, 'todoItems'));
          await setDoc(todoRef, {
            name: todo.name,
            category: todo.category || 'Wedding',
            listId: listId || null,
            isCompleted: false,
            userId: user.uid,
            createdAt: Timestamp.now(),
            orderIndex: Date.now() // Use timestamp for unique ordering
          });
        }
        
        console.log(`✅ Created ${todos.length} todos in "${listName}"`);
      } catch (error) {
        console.error('❌ Error creating todos:', error);
      }
    };

    // Add event listeners
    window.addEventListener('paige-add-deadline', handlePaigeAddDeadline as EventListener);
    window.addEventListener('paige-reorder-todos', handlePaigeReorderTodos as EventListener);
    window.addEventListener('paige-complete-todo', handlePaigeCompleteTodo as EventListener);
    window.addEventListener('paige-update-todo', handlePaigeUpdateTodo as EventListener);
    window.addEventListener('paige-create-todos', handlePaigeCreateTodos as EventListener);

    // Cleanup
    return () => {
      window.removeEventListener('paige-add-deadline', handlePaigeAddDeadline as EventListener);
      window.removeEventListener('paige-reorder-todos', handlePaigeReorderTodos as EventListener);
      window.removeEventListener('paige-complete-todo', handlePaigeCompleteTodo as EventListener);
      window.removeEventListener('paige-update-todo', handlePaigeUpdateTodo as EventListener);
      window.removeEventListener('paige-create-todos', handlePaigeCreateTodos as EventListener);
    };
  }, [todoItems]);

  // Mobile initialization - restore persistent state
  React.useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024 && !mobileInitialized) {
      console.log('📱 Mobile initialization: restoring state', mobileState);
      
      // Restore view mode
      setMobileViewMode(mobileState.viewMode === 'calendar' ? 'items' : 'lists');
      
      // Restore list selection
      if (mobileState.isAllSelected) {
        todoLists.setSelectedList(null);
        todoLists.setExplicitAllSelected(true);
        setMobileViewMode('items');
      } else if (mobileState.isCompletedSelected) {
        todoLists.setSelectedList(null);
        todoLists.setExplicitAllSelected(false);
        setMobileViewMode('items');
      } else if (mobileState.selectedListId) {
        const list = todoLists.todoLists.find(l => l.id === mobileState.selectedListId);
        if (list) {
          todoLists.setSelectedList(list);
          todoLists.setExplicitAllSelected(false);
          setMobileViewMode('items');
        }
      }
      
      setMobileInitialized(true);
    }
  }, [mobileInitialized, mobileState, todoLists]);

  // Desktop view mode logic - only for desktop
  React.useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
      if (todoLists.selectedList) {
        setMobileViewMode('items');
      } else if (todoLists.explicitAllSelected) {
        setMobileViewMode('items');
      } else {
        setMobileViewMode('lists');
      }
    }
  }, [todoLists.selectedList, todoLists.explicitAllSelected]);

  // Mobile handlers
  const handleMobileListSelect = React.useCallback((listId: string) => {
    console.log('📱 Mobile list select:', listId);
    
    if (listId === 'all-items') {
      // Handle "All To-Do Items" selection
      todoLists.setSelectedList(null);
      todoLists.setExplicitAllSelected(true);
      setMobileViewMode('items');
      mobileState.selectList(null, true, false);
    } else if (listId === 'completed-items') {
      // Handle "Completed To-Do Items" selection
      todoLists.setSelectedList(null);
      todoLists.setExplicitAllSelected(false);
      setMobileViewMode('items');
      mobileState.selectList(null, false, true);
    } else {
      // Handle regular list selection
      const list = todoLists.todoLists.find(l => l.id === listId);
      if (list) {
        console.log('📱 Selecting list:', list.name);
        todoLists.setSelectedList(list);
        todoLists.setExplicitAllSelected(false);
        setMobileViewMode('items');
        mobileState.selectList(listId, false, false);
      }
    }
  }, [todoLists, mobileState]);

  const handleMobileBackToLists = React.useCallback(() => {
    setMobileViewMode('lists');
    mobileState.clearSelection();
  }, [mobileState]);

  // Wrapper for view mode changes that also saves to mobile state
  const handleViewModeChange = React.useCallback((mode: 'list' | 'calendar') => {
    viewOptions.setViewMode(mode);
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      mobileState.setViewMode(mode);
    }
  }, [viewOptions, mobileState]);

  // Mobile navigation is now handled by VerticalNavWrapper

  // Only show content when profile loading is complete
  const isLoading = profileLoading || todoLists.todoLists === undefined;


  // Sync & Clean Up Categories handler
  const onSyncCategories = async () => {
    if (!user) return;
    const inCollection = todoItems.allCategories;
    const inUse = todoItems.allCategoriesCombined;
    // Add missing
    const toAdd = inUse.filter(cat => !inCollection.includes(cat) && !defaultCategories.includes(cat));
    // Remove unused
    const toRemove = inCollection.filter(cat => !inUse.includes(cat));

    for (const cat of toAdd) {
      await saveCategoryIfNew(cat, user.uid);
    }

    if (toAdd.length === 0 && toRemove.length === 0) {
      showSuccessToast('Your categories are already up to date!');
    } else if (toRemove.length > 0) {
      if (window.confirm(`Delete unused categories?\n${toRemove.join(", ")}`)) {
        for (const cat of toRemove) {
          await deleteCategoryByName(cat, user.uid);
        }
        showSuccessToast(`Added ${toAdd.length}, deleted ${toRemove.length} categories.`);
    } else {
        showInfoToast(`Added ${toAdd.length} categories. No deletions.`);
      }
    } else {
      showSuccessToast(`Added ${toAdd.length} categories. No deletions.`);
    }
  };

  const [showNewListModal, setShowNewListModal] = React.useState(false);
  const [showTemplatesModal, setShowTemplatesModal] = React.useState(false);
  
  // AI Deadline Generation Progress
  const [isGeneratingDeadlines, setIsGeneratingDeadlines] = React.useState(false);
  const [deadlineGenerationProgress, setDeadlineGenerationProgress] = React.useState<{
    current: number;
    total: number;
    currentItem: string;
  } | null>(null);

  // Listen for custom events from empty state buttons
  React.useEffect(() => {
    const handleOpenNewListModal = () => {
      setShowNewListModal(true);
    };

    const handleOpenTemplatesModal = () => {
      setShowTemplatesModal(true);
    };

    window.addEventListener('openNewListModal', handleOpenNewListModal);
    window.addEventListener('openTodoTemplatesModal', handleOpenTemplatesModal);
    
    return () => {
      window.removeEventListener('openNewListModal', handleOpenNewListModal);
      window.removeEventListener('openTodoTemplatesModal', handleOpenTemplatesModal);
    };
  }, []);


  // Custom onSubmit handler for list creation
  const handleListCreation = async (listData: { name: string; tasks: any[] }) => {
    try {
      // Call the original handleAddList
      await todoLists.handleAddList(listData.name, listData.tasks);
      // Close the modal after successful creation
      setShowNewListModal(false);
      
      // Show completion toast for creating first todo list
      showCompletionToast('todos');
    } catch (error) {
      console.error('Error creating list:', error);
      // Don't close modal on error so user can try again
    }
  };

  // Handler for template selection
  const handleTemplateSelection = async (template: any, allowAIDeadlines: boolean = false) => {
    try {
      // Convert template tasks to the format expected by handleAddList
      const tasks = template.tasks.map((task: any, index: number) => {
        // Handle both old string format and new object format
        const taskName = typeof task === 'string' ? task : task.name;
        const taskNote = typeof task === 'string' ? '' : (task.note || '');
        
        // Determine planning phase based on task content and position
        let planningPhase = 'Later'; // default
        
        if (template.id === 'venue-selection') {
          // Map venue selection tasks to planning phases
          if (index < 6) planningPhase = 'Discover & Shortlist';
          else if (index < 8) planningPhase = 'Inquire (from your Shortlist)';
          else if (index < 14) planningPhase = 'Tour Like a Pro';
          else planningPhase = 'Lock It In';
              } else if (template.id === 'full-wedding-planning') {
                // Map tasks to planning phases based on their position in the comprehensive list
                if (index < 5) planningPhase = 'Kickoff (ASAP)';
                else if (index < 9) planningPhase = 'Lock Venue + Date (early)';
                else if (index < 13) planningPhase = 'Core Team (9–12 months out)';
                else if (index < 16) planningPhase = 'Looks + Attire (8–10 months out)';
                else if (index < 21) planningPhase = 'Food + Flow (6–8 months out)';
                else if (index < 25) planningPhase = 'Paper + Details (4–6 months out)';
                else if (index < 30) planningPhase = 'Send + Finalize (2–4 months out)';
                else if (index < 35) planningPhase = 'Tighten Up (4–6 weeks out)';
                else if (index < 40) planningPhase = 'Week Of';
                else if (index < 43) planningPhase = 'Day Before';
                else if (index < 47) planningPhase = 'Wedding Day';
                else if (index < 51) planningPhase = 'After';
                else planningPhase = 'Tiny "Don\'t-Forget" Wins';
        } else {
          // For other templates, use a generic planning phase
          planningPhase = 'Planning Phase';
        }

        return {
          _id: `temp-id-${Date.now()}-${index}`,
          name: taskName,
          note: taskNote,
          category: null, // No default category for template items
          deadline: null,
          planningPhase: planningPhase,
          allowAIDeadlines: allowAIDeadlines
        };
      });

      // If AI deadlines are enabled and user has a wedding date, generate intelligent deadlines
      if (allowAIDeadlines && weddingDate && user?.uid) {
        
        // Declare progress interval outside try block for error handling
        let progressInterval: NodeJS.Timeout | null = null;
        
        try {
          // Start progress tracking
          setIsGeneratingDeadlines(true);
          setDeadlineGenerationProgress({
            current: 0,
            total: tasks.length,
            currentItem: 'Generating intelligent deadlines...'
          });
          
          // Simulate progress updates
          progressInterval = setInterval(() => {
            setDeadlineGenerationProgress(prev => {
              if (!prev) return null;
              const newCurrent = Math.min(prev.current + 1, prev.total - 1);
              const messages = [
                'Analyzing wedding timeline...',
                'Calculating optimal deadlines...',
                'Preserving template order...',
                'Generating intelligent schedules...',
                'Finalizing deadline assignments...'
              ];
              return {
                ...prev,
                current: newCurrent,
                currentItem: messages[Math.floor((newCurrent / prev.total) * messages.length)] || 'Processing...'
              };
            });
          }, 400);

          // Use the same deadline generation logic as onboarding flow
          const tasksWithDeadlines = tasks.map((task, index) => {
            const deadline = getIntelligentDeadline(index, task, weddingDate.toString(), template.id);
            const deadlineReasoning = getDeadlineReasoning(index, task, template.id);
            
            return {
              ...task,
              deadline: deadline,
              deadlineReasoning: deadlineReasoning
            };
          });

          // Clear progress interval
          if (progressInterval) clearInterval(progressInterval);
          
          // Update progress to completion
          setDeadlineGenerationProgress({
            current: tasks.length,
            total: tasks.length,
            currentItem: 'Creating todo list with intelligent deadlines...'
          });

          // Deduct credits for AI deadline generation (2 credits)
          try {
            const creditService = new CreditServiceClient();
            const success = await creditService.deductCredits(user.uid, 'todo_generation', {
              listName: template.name,
              taskCount: tasks.length,
              weddingDate: weddingDate,
              timestamp: new Date().toISOString()
            });

            if (!success) {
              throw new Error('Insufficient credits for AI deadline generation');
            }

            // Emit credit update event to refresh UI immediately
            creditEventEmitter.emit();
          } catch (creditError) {
            console.error('Credit deduction failed:', creditError);
            showInfoToast('Insufficient credits for AI deadline generation. Creating list without deadlines.');
            // Fall back to creating list without deadlines
            await todoLists.handleAddList(template.name, tasks);
            setIsGeneratingDeadlines(false);
            setDeadlineGenerationProgress(null);
            showCompletionToast('todos');
            return;
          }
          
          // Create the list with intelligent deadlines
          await todoLists.handleAddList(template.name, tasksWithDeadlines);
          
          // Close progress modal
          setIsGeneratingDeadlines(false);
          setDeadlineGenerationProgress(null);
          
          showSuccessToast('Todo list created with intelligent deadlines!');
        } catch (aiError) {
          console.error('Deadline generation failed:', aiError);
          
          // Clear any remaining progress interval
          if (progressInterval) clearInterval(progressInterval);
          
          // Close progress modal
          setIsGeneratingDeadlines(false);
          setDeadlineGenerationProgress(null);
          
          showInfoToast('Deadline generation failed. Creating list without deadlines.');
          // Fall back to creating list without deadlines
          await todoLists.handleAddList(template.name, tasks);
          showCompletionToast('todos');
        }
      } else {
        // Create the list with template tasks (no AI deadlines)
        await todoLists.handleAddList(template.name, tasks);
        showCompletionToast('todos');
      }
    } catch (error) {
      console.error('Error creating list from template:', error);
      showInfoToast('Failed to create list from template. Please try again.');
    }
  };

  React.useEffect(() => {
    const handler = () => {
      setShowNewListModal(true);
    };
    window.addEventListener('open-new-list-modal', handler);
    
    // Handle AI generation from budget page
    const aiHandler = (event: any) => {
      setShowNewListModal(true);
      // The modal will handle the AI generation with the provided data
    };
    window.addEventListener('create-todo-list-from-ai', aiHandler);
    
    // Check URL params for AI generation and new list creation
    const aiGenerate = searchParams?.get('ai-generate');
    const description = searchParams?.get('description');
    const newList = searchParams?.get('new-list');
    
    if (aiGenerate === 'true' && description) {
      setShowNewListModal(true);
      // Clear the URL params
      router.replace('/todo');
    } else if (newList === 'true') {
      // Add a small delay to ensure component is fully mounted
      setTimeout(() => {
        setShowNewListModal(true);
      }, 100);
      // Clear the URL params
      router.replace('/todo');
    }
    
    return () => {
      window.removeEventListener('open-new-list-modal', handler);
      window.removeEventListener('create-todo-list-from-ai', aiHandler);
    };
  }, [searchParams, router]);

  // Note: Highlight functionality is now handled directly in the dashboard
  // No need for URL parameter handling

  // Compute categories for the current selected list's to-do items, filtering out ID-like categories
  const idLikeCategory = React.useCallback((cat) => typeof cat === 'string' && /^[a-zA-Z0-9]{15,}$/.test(cat), []);
  const categoriesForCurrentList = React.useMemo(() => {
    const items = todoLists.selectedList && todoLists.selectedList.id
      ? todoItems.todoItems.filter(item => item.listId === todoLists.selectedList?.id)
      : todoItems.todoItems;
    const cats = Array.from(new Set(items.map(item => item.category).filter(cat => typeof cat === 'string' && cat && !idLikeCategory(cat))));
    return cats as string[];
  }, [todoLists.selectedList, todoItems.todoItems, idLikeCategory]);

  // Compute calendar events - must be before any early returns
  const calendarEvents = React.useMemo(() => {
    const events = [...viewOptions.filteredTodoItems];
    if (weddingDate) {
      events.push({
        id: 'wedding-date-event',
        name: 'Wedding Day 🎉',
        deadline: weddingDate,
        startDate: weddingDate,
        endDate: weddingDate,
        category: 'Wedding',
        isCompleted: false,
        userId: user?.uid || 'wedding',
        createdAt: weddingDate,
        orderIndex: -1,
        listId: 'wedding',
      });
    }
    return events;
  }, [viewOptions.filteredTodoItems, weddingDate, user?.uid]);

  // Add initial loading state to prevent empty state flash
  const [initialLoadComplete, setInitialLoadComplete] = React.useState(false);

  // Mark initial load as complete after a short delay to allow data to load
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setInitialLoadComplete(true);
    }, 1000); // 1 second delay to allow data to load

    return () => clearTimeout(timer);
  }, []);

  // If not loading and no user, just return null (middleware will redirect)
  if (!user) {
    return null;
  }

  // Show skeleton loading while initial data loads
  if (!initialLoadComplete) {
    return (
      <div className="flex flex-col h-full bg-linen">
        <WeddingBanner />
        <div className="flex-1 flex">
          {/* Sidebar Skeleton */}
          <div className="w-72 bg-white border-r border-gray-200 p-4">
            <div className="animate-pulse">
              <div className="h-6 bg-gray-200 rounded mb-4"></div>
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-4 bg-gray-200 rounded"></div>
                ))}
              </div>
            </div>
          </div>
          
          {/* Main Content Skeleton */}
          <div className="flex-1 p-6">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded mb-6 w-1/3"></div>
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-16 bg-gray-200 rounded"></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const handleCalendarEventClick = (event) => {
    if (event.id === 'wedding-date-event') {
      router.push('/settings?tab=wedding&highlight=weddingDate');
    } else if (todoItems.handleCalendarTaskClick) {
      todoItems.handleCalendarTaskClick(event);
    }
  };

  // Delete all todo items
  const handleDeleteAllItems = async () => {
    if (!user) return;

    try {
      // Get all todo items
      const allItems = todoItems.todoItems;
      if (allItems.length === 0) return;

      // Delete all items in batches
      const batch = writeBatch(db);
      const batchSize = 500; // Firestore batch limit
      
      for (let i = 0; i < allItems.length; i += batchSize) {
        const batchItems = allItems.slice(i, i + batchSize);
        batchItems.forEach(item => {
          const itemRef = doc(db, `users/${user.uid}/todoItems`, item.id);
          batch.delete(itemRef);
        });
        await batch.commit();
      }

      showSuccessToast(`Deleted all ${allItems.length} to-do items!`);
    } catch (error: any) {
      console.error('Error deleting all items:', error);
      showErrorToast('Failed to delete all items.');
    }
  };

  return (
    <div className="flex flex-col h-full bg-linen">
      <WeddingBanner />
      
      {/* Global Gmail Banner - positioned after WeddingBanner */}
      <GlobalGmailBanner />
      
      <div className="app-content-container flex-1 overflow-hidden flex flex-col min-h-0">
        <div className="dashboard-layout">
          <main className="dashboard-main">
            <TodoSidebar
              todoLists={todoLists.todoLists}
              selectedList={todoLists.selectedList}
              setSelectedList={todoLists.setSelectedList}
              selectedListId={todoLists.selectedList?.id || null}
              setSelectedListId={(id) => {
                const list = todoLists.todoLists.find(l => l.id === id);
                if (list) todoLists.setSelectedList(list);
              }}
              userId={user?.uid || ''}
              showCompletedItems={viewOptions.showCompletedItems}
              setShowCompletedItems={viewOptions.setShowCompletedItems}
              showNewListInput={todoLists.showNewListInput}
              setShowNewListInput={todoLists.setShowNewListInput}
              newListName={todoLists.newListName}
              setNewListName={todoLists.setNewListName}
              handleAddList={todoLists.handleAddList}
              listTaskCounts={todoItems.listTaskCounts}
              setTodoSearchQuery={viewOptions.setTodoSearchQuery}
              selectAllItems={todoLists.selectAllItems}
              allTodoCount={todoItems.allTodoCount}
              allTodoItems={todoItems.allTodoItems}
              allCategories={todoItems.allCategories}
              showUpgradeModal={() => todoLists.setShowUpgradeModal(true)}
              draggedTodoId={viewOptions.draggedTodoId}
              onMoveTodoItem={todoItems.handleMoveTodoItem}
              mobileViewMode={mobileViewMode}
              onMobileListSelect={handleMobileListSelect}
              onDeleteAllItems={handleDeleteAllItems}
            />

            <div className={`unified-main-content mobile-${mobileViewMode}-view`}>
            {/* Loading is now handled by LoadingProvider in layout.tsx */}
            <>
            <TodoTopBar
                  selectedList={todoLists.selectedList}
                  editingListNameId={todoLists.editingListNameId}
                  editingListNameValue={todoLists.editingListNameValue}
                  setEditingListNameId={todoLists.setEditingListNameId}
                  setEditingListNameValue={todoLists.setEditingListNameValue}
                  handleRenameList={todoLists.handleRenameList}
                  todoSearchQuery={viewOptions.todoSearchQuery}
                  setTodoSearchQuery={viewOptions.setTodoSearchQuery}
                  showCompletedItems={viewOptions.showCompletedItems}
                  handleOpenAddTodo={() => todoItems.handleOpenAddTodo(todoLists.todoLists.length > 0)}
                  viewMode={viewOptions.viewMode}
                  setViewMode={handleViewModeChange}
                  calendarViewMode={viewOptions.calendarViewMode}
                  setCalendarViewMode={viewOptions.setCalendarViewMode}
                  handleCloneList={todoLists.handleCloneList}
                  handleDeleteList={todoLists.handleDeleteList}
                  allCategories={categoriesForCurrentList}
                  selectedCategories={selectedCategories}
                  setSelectedCategories={setSelectedCategories}
                  onSyncCategories={onSyncCategories}
                  mobileViewMode={mobileViewMode}
                  onMobileBackToLists={handleMobileBackToLists}
                  hasTodoLists={todoLists.todoLists.length > 0}
                  onDeleteAllItems={handleDeleteAllItems}
                  allTodoCount={todoItems.allTodoCount}
                  showPaigeChat={false}
                  onTogglePaigeChat={undefined}
            />


                <AnimatePresence>
                  {todoLists.showListLimitBanner && todoLists.todoLists.length >= STARTER_TIER_MAX_LISTS && (
                    <div className="px-4 pt-2">
                      <Banner
                        message={
                          <>
                            You've reached the maximum number of lists for the Starter tier.
                            <button onClick={() => todoLists.setShowUpgradeModal(true)} className="ml-2 font-semibold underline">Upgrade Plan</button> to create more.
                          </>
                        }
                        type="info"
                        onDismiss={() => todoLists.setShowListLimitBanner(false)}
                      />
                    </div>
                  )}
                </AnimatePresence>
                
                <div className="flex-1 overflow-y-auto">
                  {viewOptions.viewMode === 'list' ? (
                <TodoListView
                      todoItems={
                        (!todoLists.selectedList && viewOptions.showCompletedItems)
                          ? todoItems.todoItems.filter(item => item.isCompleted)
                          : todoItems.todoItems
                      }
                      filteredTodoItems={
                        (!todoLists.selectedList && viewOptions.showCompletedItems)
                          ? viewOptions.filteredTodoItems.filter(item => item.isCompleted)
                          : viewOptions.filteredTodoItems
                      }
                      groupedTasks={viewOptions.groupedTasks}
                      openGroups={viewOptions.openGroups}
                      toggleGroup={viewOptions.toggleGroup}
                      showCompletedItems={viewOptions.showCompletedItems}
                      setShowCompletedItems={viewOptions.setShowCompletedItems}
                      todoSearchQuery={viewOptions.todoSearchQuery}
                      selectedList={todoLists.selectedList}
                      todoLists={todoLists.todoLists}
                      allCategories={todoItems.allCategories}
                      draggedTodoId={viewOptions.draggedTodoId}
                      dragOverTodoId={viewOptions.dragOverTodoId}
                      dropIndicatorPosition={viewOptions.dropIndicatorPosition}
                  user={user}
                      handleToggleTodoComplete={todoItems.handleToggleTodoCompletion}
                      handleUpdateTaskName={todoItems.handleUpdateTodoName}
                      handleUpdateDeadline={todoItems.handleUpdateTodoDeadline}
                      handleUpdateNote={todoItems.handleUpdateTodoNote}
                      handleUpdateCategory={todoItems.handleUpdateTodoCategory}
                      handleCloneTodo={todoItems.handleCloneTodo}
                      handleDeleteTodo={todoItems.handleDeleteTodoItem}
                      setTaskToMove={todoItems.setTaskToMove}
                      setShowMoveTaskModal={todoItems.setShowMoveTaskModal}
                      handleDragStart={viewOptions.handleDragStart}
                      handleDragEnter={viewOptions.handleDragEnter}
                      handleDragLeave={viewOptions.handleDragLeave}
                      handleItemDragOver={viewOptions.handleItemDragOver}
                      handleDragEnd={viewOptions.handleDragEnd}
                      handleDrop={viewOptions.handleDrop}
                      handleListDrop={(e) => {
                        // This would need to be implemented based on the drag target
                        viewOptions.handleListDrop(e, '');
                      }}
                      showCompletedTasks={viewOptions.showCompletedTasks}
                      setShowCompletedTasks={viewOptions.setShowCompletedTasks}
                      justMovedItemId={todoItems.justMovedItemId}
                      onMoveTodoItem={todoItems.handleMoveTodoItem}
                      mobileViewMode={mobileViewMode}
                      onMobileBackToLists={handleMobileBackToLists}
                      onSelectTemplate={(template, allowAIDeadlines) => {
                        handleTemplateSelection(template, allowAIDeadlines);
                      }}
                      onCreateWithAI={() => setShowNewListModal(true)}
                              />
                  ) : (
                    <CalendarView
                      todoItems={calendarEvents}
                      onEventClick={handleCalendarEventClick}
                      view={viewOptions.calendarViewMode}
                      onViewChange={viewOptions.setCalendarViewMode}
                      onNavigate={viewOptions.setCalendarDate}
                      date={viewOptions.calendarDate}
                      handleCloneTodo={todoItems.handleCloneTodo}
                      handleDeleteTodo={todoItems.handleDeleteTodoItem}
                      setTaskToMove={todoItems.setTaskToMove}
                      setShowMoveTaskModal={todoItems.setShowMoveTaskModal}
                      todoLists={todoLists.todoLists}
                      allCategories={todoItems.allCategories}
                      googleCalendarSyncComponent={
                        <GoogleCalendarSync
                          userId={user?.uid || ''}
                          todoItems={viewOptions.filteredTodoItems}
                          selectedListId={todoLists.selectedList?.id || null}
                          onSyncComplete={() => {
                            todoItems.todoItems = [...todoItems.todoItems];
                          }}
                          compact
                        />
                      }
                    />
                  )}
                </div>
              </>
            </div>
          </main>
          
          {todoItems.selectedTaskForSideCard && (
            <TaskSideCard
              isOpen={true}
              onClose={() => todoItems.setSelectedTaskForSideCard(null)}
              mode="calendar"
              onSubmit={todoItems.handleUpdateTask}
              initialData={{
                name: todoItems.selectedTaskForSideCard.name,
                deadline: todoItems.selectedTaskForSideCard.deadline,
                endDate: todoItems.selectedTaskForSideCard.endDate,
                note: todoItems.selectedTaskForSideCard.note,
                category: todoItems.selectedTaskForSideCard.category
              }}
              userId={user?.uid || ''}
              todoLists={todoLists.todoLists}
              selectedListId={todoItems.selectedTaskForSideCard.listId}
              setSelectedListId={(id) => {
                const list = todoLists.todoLists.find(l => l.id === id);
                if (list) todoLists.setSelectedList(list);
              }}
              allCategories={todoItems.allCategories}
              todo={todoItems.selectedTaskForSideCard}
              handleToggleTodoComplete={todoItems.handleToggleTodoCompletion}
              handleDeleteTodo={todoItems.handleDeleteTodoItem}
            />
          )}

        </div>
      </div>

      {/* Paige Contextual Assistant */}
      {isPaigeEnabled && (
          <PaigeContextualAssistant
            context="todo"
            currentData={{
              overdueTasks: todoItems.allTodoItems?.filter(todo => 
                !todo.isCompleted && todo.deadline && new Date(todo.deadline) < new Date()
              ).length || 0,
              upcomingDeadlines: todoItems.allTodoItems?.filter(todo => 
                !todo.isCompleted && todo.deadline && 
                new Date(todo.deadline) > new Date() && 
                new Date(todo.deadline) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
              ).length || 0,
              completedTasks: todoItems.allTodoItems?.filter(todo => todo.isCompleted).length || 0,
              totalTasks: todoItems.allTodoItems?.length || 0,
              daysUntilWedding: daysLeft,
              selectedList: todoLists.selectedList?.name || 'All To-Do Items',
              selectedListId: todoLists.selectedList?.id || null,
              weddingLocation: weddingLocation || undefined,
              todoItems: todoItems.allTodoItems || [],
              // ✨ Cross-agent data: Budget info from AgentDataProvider (no manual parsing!)
              hasBudget: agentData.budgetCategories?.length > 0 || false,
              totalBudget: agentData.userData?.maxBudget || agentData.budgetData?.maxBudget || 0
            }}
          />
      )}


      {/* MODALS */}
      {todoItems.showMoveTaskModal && todoItems.taskToMove && (
        <MoveTaskModal
          task={todoItems.taskToMove}
          todoLists={todoLists.todoLists}
          currentListId={todoItems.taskToMove.listId}
          onMove={todoItems.handleMoveTaskModal}
          onClose={() => {
            todoItems.setShowMoveTaskModal(false);
            todoItems.setTaskToMove(null);
          }}
        />
      )}

      {todoLists.showDeleteListModal && todoLists.listToConfirmDelete && (
        <DeleteListConfirmationModal
          list={todoLists.listToConfirmDelete}
          onConfirm={async () => {
            if (todoLists.listToConfirmDelete) {
              todoLists.setShowDeleteListModal(false);
              todoLists.setListToConfirmDelete(null);
              todoLists.setDeletingListId(null);
              await todoLists.executeDeleteList(todoLists.listToConfirmDelete.id);
            }
          }}
          onClose={() => {
            todoLists.setShowDeleteListModal(false);
            todoLists.setListToConfirmDelete(null);
            todoLists.setDeletingListId(null);
          }}
        />
      )}

      {todoLists.showUpgradeModal && (
        <UpgradePlanModal
          maxLists={STARTER_TIER_MAX_LISTS}
          onClose={() => todoLists.setShowUpgradeModal(false)}
        />
      )}

      {todoItems.showAddTodoCard && (
        <TaskSideCard
          isOpen={true}
          onClose={todoItems.handleCloseAddTodo}
          mode="todo"
          onSubmit={todoItems.handleAddTodo}
          allCategories={todoItems.allCategories}
          userId={user?.uid || ''}
          todoLists={todoLists.todoLists}
          selectedListId={todoLists.selectedList?.id || null}
          setSelectedListId={(id) => {
            const list = todoLists.todoLists.find(l => l.id === id);
            if (list) todoLists.setSelectedList(list);
          }}
        />
      )}

      {/* CENTRALIZED ListMenuDropdown RENDERING */}
      {todoLists.openListMenuId && todoLists.selectedTodoListForMenu && (
        <ListMenuDropdown
          list={todoLists.selectedTodoListForMenu}
          handleRenameList={todoLists.handleRenameList}
          setPendingDeleteListId={todoLists.setPendingDeleteListId}
          setEditingListNameId={todoLists.setEditingListNameId}
          setEditingListNameValue={todoLists.setEditingListNameValue}
          setOpenListMenuId={todoLists.setOpenListMenuId}
          buttonRef={{ current: todoLists.listMenuButtonRefs.current.get(todoLists.openListMenuId) || null }}
        />
      )}

      <NewListOnboardingModal
        isOpen={showNewListModal}
        onClose={() => setShowNewListModal(false)}
        onSubmit={handleListCreation}
      />

      <TodoTemplatesModal
        isOpen={showTemplatesModal}
        onClose={() => setShowTemplatesModal(false)}
        onSelectTemplate={(template, allowAIDeadlines) => {
          handleTemplateSelection(template, allowAIDeadlines);
        }}
        onCreateWithAI={() => setShowNewListModal(true)}
      />

      {/* AI Deadline Generation Progress */}
      {deadlineGenerationProgress && (
        <TodoDeadlineGenerationProgress
          isVisible={isGeneratingDeadlines}
          current={deadlineGenerationProgress.current}
          total={deadlineGenerationProgress.total}
          currentItem={deadlineGenerationProgress.currentItem}
        />
      )}

      {/* Mobile Navigation is handled by VerticalNavWrapper */}
    </div>
  );
}

/**
 * Generate intelligent deadline based on task index, task content, and wedding date
 * Uses the same logic as the onboarding flow to preserve template order
 */
function getIntelligentDeadline(index: number, task: any, weddingDate: string, templateId: string): Date {
  const now = new Date();
  const wedding = new Date(weddingDate);
  const daysUntilWedding = Math.ceil((wedding.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  // Generate realistic time based on task content
  const getRealisticTime = (taskName: string, index: number): { hours: number; minutes: number } => {
    const taskLower = taskName.toLowerCase();
    
    // Administrative/research tasks - morning
    if (taskLower.includes('budget') || taskLower.includes('define') || taskLower.includes('research') || 
        taskLower.includes('browse') || taskLower.includes('shortlist')) {
      return { hours: 9, minutes: 30 }; // 9:30 AM
    }
    
    // Vendor communications - afternoon
    if (taskLower.includes('venue') || taskLower.includes('vendor') || taskLower.includes('photographer') || 
        taskLower.includes('caterer') || taskLower.includes('hire') || taskLower.includes('book')) {
      return { hours: 14, minutes: 0 }; // 2:00 PM
    }
    
    // Personal tasks - evening
    if (taskLower.includes('attire') || taskLower.includes('guest') || taskLower.includes('invitation') || 
        taskLower.includes('personal') || taskLower.includes('dress') || taskLower.includes('suit')) {
      return { hours: 19, minutes: 0 }; // 7:00 PM
    }
    
    // Default to rotating time slots to avoid clustering
    const timeSlots = [
      { hours: 9, minutes: 0 },   // 9:00 AM
      { hours: 9, minutes: 30 },  // 9:30 AM
      { hours: 10, minutes: 0 },  // 10:00 AM
      { hours: 14, minutes: 0 },  // 2:00 PM
      { hours: 14, minutes: 30 }, // 2:30 PM
      { hours: 19, minutes: 0 },  // 7:00 PM
      { hours: 19, minutes: 30 }  // 7:30 PM
    ];
    
    return timeSlots[index % timeSlots.length];
  };

  const time = getRealisticTime(task.name, index);
  
  // For tight timelines (< 90 days), compress all deadlines
  if (daysUntilWedding < 90) {
    let deadline: Date;
    
    // Use index-based distribution for tight timelines
    if (index < 5) {
      // Kickoff tasks - ASAP (1-3 days)
      deadline = new Date(now.getTime() + (index + 1) * 24 * 60 * 60 * 1000);
    } else if (index < 9) {
      // Lock Venue + Date - early (4-7 days)
      deadline = new Date(now.getTime() + (index + 3) * 24 * 60 * 60 * 1000);
    } else if (index < 13) {
      // Core Team - 9-12 months out (1-2 weeks)
      deadline = new Date(now.getTime() + (index + 7) * 24 * 60 * 60 * 1000);
    } else if (index < 16) {
      // Looks + Attire - 8-10 months out (2-3 weeks)
      deadline = new Date(now.getTime() + (index + 14) * 24 * 60 * 60 * 1000);
    } else if (index < 21) {
      // Food + Flow - 6-8 months out (3-4 weeks)
      deadline = new Date(now.getTime() + (index + 21) * 24 * 60 * 60 * 1000);
    } else if (index < 25) {
      // Paper + Details - 4-6 months out (4-5 weeks)
      deadline = new Date(now.getTime() + (index + 28) * 24 * 60 * 60 * 1000);
    } else if (index < 30) {
      // Send + Finalize - 2-4 months out (5-6 weeks)
      deadline = new Date(now.getTime() + (index + 35) * 24 * 60 * 60 * 1000);
    } else if (index < 35) {
      // Tighten Up - 4-6 weeks out (6-7 weeks)
      deadline = new Date(now.getTime() + (index + 42) * 24 * 60 * 60 * 1000);
    } else if (index < 40) {
      // Week Of (1 week before)
      deadline = new Date(wedding.getTime() - (40 - index) * 24 * 60 * 60 * 1000);
    } else if (index < 43) {
      // Day Before
      deadline = new Date(wedding.getTime() - 24 * 60 * 60 * 1000);
    } else if (index < 47) {
      // Wedding Day
      deadline = new Date(wedding);
    } else {
      // After
      deadline = new Date(wedding.getTime() + 7 * 24 * 60 * 60 * 1000);
    }
    
    // Ensure deadline is not after wedding (except for "after" items)
    if (deadline > wedding && !task.name.toLowerCase().includes('after')) {
      deadline = new Date(wedding.getTime() - 1 * 24 * 60 * 60 * 1000); // 1 day before
    }
    
    // Set the realistic time
    deadline.setHours(time.hours, time.minutes, 0, 0);
    return deadline;
  }
  
  // Normal timeline (90+ days) - use original planning phases
  let deadline: Date;
  
  if (index < 5) {
    // Kickoff tasks - ASAP (1 week)
    deadline = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  } else if (index < 9) {
    // Lock Venue + Date - early (2-4 weeks)
    deadline = new Date(now.getTime() + 21 * 24 * 60 * 60 * 1000);
  } else if (index < 13) {
    // Core Team - 9-12 months out (6-9 months)
    deadline = new Date(now.getTime() + 240 * 24 * 60 * 60 * 1000);
  } else if (index < 16) {
    // Looks + Attire - 8-10 months out (5-8 months)
    deadline = new Date(now.getTime() + 200 * 24 * 60 * 60 * 1000);
  } else if (index < 21) {
    // Food + Flow - 6-8 months out (4-6 months)
    deadline = new Date(now.getTime() + 150 * 24 * 60 * 60 * 1000);
  } else if (index < 25) {
    // Paper + Details - 4-6 months out (3-5 months)
    deadline = new Date(now.getTime() + 120 * 24 * 60 * 60 * 1000);
  } else if (index < 30) {
    // Send + Finalize - 2-4 months out (2-4 months)
    deadline = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
  } else if (index < 35) {
    // Tighten Up - 4-6 weeks out (1-2 months)
    deadline = new Date(now.getTime() + 45 * 24 * 60 * 60 * 1000);
  } else if (index < 40) {
    // Week Of (2 weeks before)
    deadline = new Date(wedding.getTime() - 14 * 24 * 60 * 60 * 1000);
  } else if (index < 43) {
    // Day Before
    deadline = new Date(wedding.getTime() - 24 * 60 * 60 * 1000);
  } else if (index < 47) {
    // Wedding Day
    deadline = new Date(wedding);
  } else {
    // After
    deadline = new Date(wedding.getTime() + 7 * 24 * 60 * 60 * 1000);
  }
  
  // Ensure deadline is not after wedding (except for "after" items)
  if (deadline > wedding && !task.name.toLowerCase().includes('after')) {
    deadline = new Date(wedding.getTime() - 1 * 24 * 60 * 60 * 1000); // 1 day before
  }
  
  // Set the realistic time
  deadline.setHours(time.hours, time.minutes, 0, 0);
  return deadline;
}

/**
 * Generate reasoning for deadline assignment
 */
function getDeadlineReasoning(index: number, task: any, templateId: string): string {
  const taskName = task.name.toLowerCase();
  
  if (taskName.includes('budget') || taskName.includes('define')) {
    return 'Budget planning should be done early to guide all other decisions';
  } else if (taskName.includes('venue') || taskName.includes('book venue')) {
    return 'Venue booking is critical and should be prioritized early in planning';
  } else if (taskName.includes('photographer') || taskName.includes('hire')) {
    return 'Photographer booking requires early planning due to high demand';
  } else if (taskName.includes('attire') || taskName.includes('dress')) {
    return 'Attire selection takes time for fittings and alterations';
  } else if (taskName.includes('invitation') || taskName.includes('send')) {
    return 'Invitations need time for design, printing, and mailing';
  } else if (taskName.includes('week of') || taskName.includes('day before')) {
    return 'Final preparations scheduled close to wedding date';
  } else if (taskName.includes('after')) {
    return 'Post-wedding tasks scheduled after the big day';
  } else if (index < 5) {
    return 'Kickoff task scheduled early in planning process';
  } else if (index < 13) {
    return 'Core planning task scheduled based on wedding timeline';
  } else if (index < 21) {
    return 'Mid-planning task scheduled for optimal timing';
  } else if (index < 30) {
    return 'Final planning task scheduled closer to wedding date';
  } else {
    return 'Task scheduled based on optimal wedding planning timeline';
  }
}