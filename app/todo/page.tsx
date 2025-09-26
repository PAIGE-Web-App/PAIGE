"use client";

import React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";

// Firebase imports
import { useAuth } from '@/hooks/useAuth';
import { useQuickStartCompletion } from '@/hooks/useQuickStartCompletion';

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
import { useTodoLists } from "../../hooks/useTodoLists";
import { useTodoItems } from "../../hooks/useTodoItems";
import { useTodoViewOptions } from "../../hooks/useTodoViewOptions";
import { saveCategoryIfNew, deleteCategoryByName, defaultCategories } from "@/lib/firebaseCategories";
import { useCustomToast } from "../../hooks/useCustomToast";
import { useMobileTodoState } from "../../hooks/useMobileTodoState";
import { useGlobalCompletionToasts } from "../../hooks/useGlobalCompletionToasts";

const STARTER_TIER_MAX_LISTS = 3;

export default function TodoPage() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showSuccessToast, showInfoToast } = useCustomToast();
  const { showCompletionToast } = useGlobalCompletionToasts();

  // Use shared user profile data hook
  const { userName, daysLeft, profileLoading, weddingDate } = useUserProfileData();
  
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
          endDate: null,
          planningPhase: planningPhase,
          allowAIDeadlines: allowAIDeadlines
        };
      });

      // If AI deadlines are enabled and user has a wedding date, generate AI deadlines
      if (allowAIDeadlines && weddingDate && user?.uid) {
        
        // Declare progress interval outside try block for error handling
        let progressInterval: NodeJS.Timeout | null = null;
        
        try {
          // Start progress tracking
          setIsGeneratingDeadlines(true);
          setDeadlineGenerationProgress({
            current: 0,
            total: tasks.length,
            currentItem: 'Initializing AI deadline generation...'
          });
          
          // Simulate progress updates
          progressInterval = setInterval(() => {
            setDeadlineGenerationProgress(prev => {
              if (!prev) return null;
              const newCurrent = Math.min(prev.current + 1, prev.total - 1);
              const messages = [
                'Analyzing wedding timeline...',
                'Calculating optimal deadlines...',
                'Prioritizing critical tasks...',
                'Generating intelligent schedules...',
                'Finalizing deadline assignments...'
              ];
              return {
                ...prev,
                current: newCurrent,
                currentItem: messages[Math.floor((newCurrent / prev.total) * messages.length)] || 'Processing...'
              };
            });
          }, 800);

          const response = await fetch('/api/generate-todo-deadlines', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              todos: tasks,
              weddingDate: weddingDate,
              userId: user.uid,
              userEmail: user.email,
              listName: template.name
            }),
          });

          // Clear progress interval
          if (progressInterval) clearInterval(progressInterval);

          if (!response.ok) {
            const errorData = await response.json();
            if (response.status === 402) {
              // Insufficient credits
              showInfoToast(errorData.message || 'Insufficient credits for AI deadline generation');
              // Continue with template creation without AI deadlines
            } else {
              throw new Error(errorData.message || 'Failed to generate AI deadlines');
            }
          } else {
            const result = await response.json();
            
            if (result.success && result.todos) {
              // Use AI-generated deadlines
              const tasksWithDeadlines = result.todos.map((todo: any) => ({
                ...todo,
                deadline: todo.deadline ? new Date(todo.deadline) : null,
                endDate: todo.endDate ? new Date(todo.endDate) : null
              }));
              
              // Update progress to completion
              setDeadlineGenerationProgress({
                current: tasks.length,
                total: tasks.length,
                currentItem: 'Creating todo list with AI deadlines...'
              });
              
              // Create the list with AI-generated deadlines
              await todoLists.handleAddList(template.name, tasksWithDeadlines);
              
              // Close progress modal
              setIsGeneratingDeadlines(false);
              setDeadlineGenerationProgress(null);
              
              showSuccessToast('Todo list created with AI-powered deadlines!');
            } else {
              throw new Error('Invalid response from AI deadline generation');
            }
          }
        } catch (aiError) {
          console.error('AI deadline generation failed:', aiError);
          
          // Clear any remaining progress interval
          if (progressInterval) clearInterval(progressInterval);
          
          // Close progress modal
          setIsGeneratingDeadlines(false);
          setDeadlineGenerationProgress(null);
          
          showInfoToast('AI deadline generation failed. Creating list with template deadlines.');
          // Fall back to creating list without AI deadlines
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
        <GlobalGmailBanner />
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

  return (
    <div className="flex flex-col h-full bg-linen">
      <WeddingBanner />
      <GlobalGmailBanner />
      
      <div className="app-content-container flex-1 overflow-hidden">
        <div className="flex h-full gap-4 lg:flex-row flex-col">
          <main className="unified-container">
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
                        !todoLists.selectedList ? (
                          <GoogleCalendarSync
                            userId={user?.uid || ''}
                            todoItems={viewOptions.filteredTodoItems}
                            selectedListId={null}
                            onSyncComplete={() => {
                              todoItems.todoItems = [...todoItems.todoItems];
                            }}
                            compact
                          />
                        ) : null
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