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
import LoadingSpinner from '@/components/LoadingSpinner';

// Import standardized skeleton components
import TodoSidebarSkeleton from '../../components/skeletons/TodoSidebarSkeleton';
import TodoTopBarSkeleton from '../../components/skeletons/TodoTopBarSkeleton';
import TodoListViewSkeleton from '../../components/skeletons/TodoListViewSkeleton';
import CalendarViewSkeleton from '../../components/skeletons/CalendarViewSkeleton';
import TaskSideCardSkeleton from '../../components/skeletons/TaskSideCardSkeleton';

// Lazy load heavy components
const TodoSidebar = dynamic(() => import('../../components/TodoSidebar'), {
  loading: () => <TodoSidebarSkeleton />
});

const TodoTopBar = dynamic(() => import('../../components/TodoTopBar'), {
  loading: () => <TodoTopBarSkeleton />
});

const TodoListView = dynamic(() => import('../../components/TodoListView'), {
  loading: () => <TodoListViewSkeleton />
});

const CalendarView = dynamic(() => import('../../components/CalendarView'), {
  loading: () => <CalendarViewSkeleton />
});

const TaskSideCard = dynamic(() => import('../../components/TaskSideCard'), {
  loading: () => <TaskSideCardSkeleton />
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
  const { user, loading } = useAuth();
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
  const isLoading = profileLoading || loading || todoLists.todoLists === undefined;


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

  // Listen for custom event from empty state button
  React.useEffect(() => {
    const handleOpenNewListModal = () => {
      setShowNewListModal(true);
    };

    window.addEventListener('openNewListModal', handleOpenNewListModal);
    
    return () => {
      window.removeEventListener('openNewListModal', handleOpenNewListModal);
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

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen bg-linen">
        <WeddingBanner />
        <div className="flex-1 flex items-center justify-center">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    );
  }

  // If not loading and no user, just return null (middleware will redirect)
  if (!user) {
    return null;
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
            {/* Conditional rendering for loading state */}
            {loading && !user ? (
              <div className="flex-1 flex items-center justify-center">
                <LoadingSpinner size="lg" text="Loading your to-do lists..." />
              </div>
            ) : (
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
            )}
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


      {/* Mobile Navigation is handled by VerticalNavWrapper */}
    </div>
  );
}