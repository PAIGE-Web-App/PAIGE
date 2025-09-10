"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";

// Firebase imports
import { useAuth } from '@/hooks/useAuth';

// UI component imports - keep essential ones for initial load
import Banner from '@/components/Banner';
import BottomNavBar from '@/components/BottomNavBar';
import WeddingBanner from '@/components/WeddingBanner';
import LoadingSpinner from '@/components/LoadingSpinner';

// Lazy load heavy components
const TodoSidebar = dynamic(() => import('../../components/TodoSidebar'), {
  loading: () => <div className="w-64 bg-[#F3F2F0] animate-pulse" />
});

const TodoTopBar = dynamic(() => import('../../components/TodoTopBar'), {
  loading: () => <div className="h-16 bg-white border-b border-[#AB9C95] animate-pulse" />
});

const TodoListView = dynamic(() => import('../../components/TodoListView'), {
  loading: () => <div className="flex-1 bg-white animate-pulse" />
});

const CalendarView = dynamic(() => import('../../components/CalendarView'), {
  loading: () => <div className="flex-1 bg-white animate-pulse" />
});

const TaskSideCard = dynamic(() => import('../../components/TaskSideCard'), {
  loading: () => <div className="w-80 bg-white border-l border-[#AB9C95] animate-pulse" />
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

const ContinuousImprovementModal = dynamic(() => import('@/components/ContinuousImprovementModal'), {
  ssr: false
});

const GoogleCalendarSync = dynamic(() => import('../../components/GoogleCalendarSync'), {
  ssr: false
});

// Custom hooks
import { useUserProfileData } from "../../hooks/useUserProfileData";
import { useWeddingBanner } from "../../hooks/useWeddingBanner";
import { useTodoLists } from "../../hooks/useTodoLists";
import { useTodoItems } from "../../hooks/useTodoItems";
import { useTodoViewOptions } from "../../hooks/useTodoViewOptions";
import { saveCategoryIfNew, deleteCategoryByName, defaultCategories } from "@/lib/firebaseCategories";
import { useCustomToast } from "../../hooks/useCustomToast";

const STARTER_TIER_MAX_LISTS = 3;

export default function TodoPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { showSuccessToast, showInfoToast } = useCustomToast();

  // Use shared user profile data hook
  const { userName, daysLeft, profileLoading, weddingDate } = useUserProfileData();

  // Use custom hooks for todo functionality
  const todoLists = useTodoLists();
  const todoItems = useTodoItems(todoLists.selectedList);
  const [selectedCategories, setSelectedCategories] = React.useState<string[]>([]);
  const [showContinuousImprovementModal, setShowContinuousImprovementModal] = React.useState(false);
  const [aiGeneratedListData, setAiGeneratedListData] = React.useState<{
    categories: string[];
    promptType: string;
  } | null>(null);
  const viewOptions = useTodoViewOptions(
    todoItems.todoItems,
    todoItems.handleReorderAndAdjustDeadline,
    selectedCategories
  );

  // Handle mobile tab change
  const handleMobileTabChange = (tab: string) => {
    if (tab === 'dashboard') {
      router.push('/');
    }
  };

  // Only show content when profile loading is complete
  const isLoading = profileLoading || loading || todoLists.todoLists === undefined;

  const { handleSetWeddingDate } = useWeddingBanner(router);

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

  // Custom onSubmit handler to detect AI-generated lists
  const handleListCreation = async (listData: { name: string; tasks: any[] }) => {
    // Check if this is an AI-generated list (has tasks with AI-generated characteristics)
    const isAiGenerated = listData.tasks.some(task => 
      task.note && task.note.includes('wedding') || 
      task.category && ['Venue', 'Catering', 'Photography', 'Flowers', 'Music'].includes(task.category)
    );

    if (isAiGenerated) {
      // Extract categories from the tasks
      const categories = [...new Set(listData.tasks.map(task => task.category).filter(Boolean))];
      
      // Store the data for the modal
      setAiGeneratedListData({
        categories,
        promptType: 'comprehensive'
      });
    }

    // Call the original handleAddList
    await todoLists.handleAddList(listData.name, listData.tasks);

    // Show the continuous improvement modal if it was AI-generated
    if (isAiGenerated) {
      setTimeout(() => {
        setShowContinuousImprovementModal(true);
      }, 1000); // Small delay to ensure the list is created and selected
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
    
    // Check URL params for AI generation
    const urlParams = new URLSearchParams(window.location.search);
    const aiGenerate = urlParams.get('ai-generate');
    const description = urlParams.get('description');
    
    if (aiGenerate === 'true' && description) {
      setShowNewListModal(true);
      // Clear the URL params
      window.history.replaceState({}, '', '/todo');
    }
    
    return () => {
      window.removeEventListener('open-new-list-modal', handler);
      window.removeEventListener('create-todo-list-from-ai', aiHandler);
    };
  }, []);

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
        <WeddingBanner
          daysLeft={null}
          userName={null}
          isLoading={true}
          onSetWeddingDate={handleSetWeddingDate}
        />
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
      <WeddingBanner
        daysLeft={daysLeft}
        userName={userName}
        isLoading={profileLoading}
        onSetWeddingDate={handleSetWeddingDate}
      />
      
      <div className="app-content-container flex-1 overflow-hidden">
        <div className="flex h-full gap-4 md:flex-row flex-col">
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
            />

            <div className="unified-main-content">
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
                  setViewMode={viewOptions.setViewMode}
                  calendarViewMode={viewOptions.calendarViewMode}
                  setCalendarViewMode={viewOptions.setCalendarViewMode}
                  handleCloneList={todoLists.handleCloneList}
                  handleDeleteList={todoLists.handleDeleteList}
                  allCategories={categoriesForCurrentList}
                  selectedCategories={selectedCategories}
                  setSelectedCategories={setSelectedCategories}
                  onSyncCategories={onSyncCategories}
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

      {/* Continuous Improvement Modal */}
      {aiGeneratedListData && (
        <ContinuousImprovementModal
          isOpen={showContinuousImprovementModal}
          onClose={() => {
            setShowContinuousImprovementModal(false);
            setAiGeneratedListData(null);
          }}
          userId={user?.uid || ''}
          categories={aiGeneratedListData.categories}
          promptType={aiGeneratedListData.promptType}
          onCreditsAwarded={(credits) => {
            // Trigger credit refresh
            if (typeof window !== 'undefined') {
              localStorage.setItem('creditUpdateEvent', Date.now().toString());
              setTimeout(async () => {
                const { creditEventEmitter } = await import('@/utils/creditEventEmitter');
                creditEventEmitter.emit();
              }, 1000);
            }
          }}
        />
      )}

      {/* Mobile Navigation */}
      <BottomNavBar
        activeTab="todo"
        onTabChange={handleMobileTabChange}
      />
    </div>
  );
}