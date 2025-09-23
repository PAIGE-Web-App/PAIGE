import React, { useState } from 'react';
import TaskSideCard from './TaskSideCard';
import BadgeCount from './BadgeCount';
import NewListOnboardingModal from './NewListOnboardingModal';
import SectionHeader from './SectionHeader';
import { useRAGTodoGeneration } from '../hooks/useRAGTodoGeneration';

interface TodoSidebarProps {
  todoLists: any[];
  selectedList: any;
  setSelectedList: (list: any) => void;
  selectedListId: string | null;
  setSelectedListId: (id: string) => void;
  userId: string;
  showCompletedItems: boolean;
  setShowCompletedItems: (val: boolean) => void;
  showNewListInput: boolean;
  setShowNewListInput: (val: boolean) => void;
  newListName: string;
  setNewListName: (val: string) => void;
  handleAddList: (name: string, tasks: any[]) => Promise<void>;
  listTaskCounts: Map<string, number>;
  setTodoSearchQuery: (val: string) => void;
  selectAllItems: () => void;
  allTodoCount: number;
  allTodoItems: any[];
  allCategories?: any[];
  showUpgradeModal?: () => void;
  
  // Props for moving to-do items between lists
  draggedTodoId?: string | null;
  onMoveTodoItem?: (taskId: string, currentListId: string, targetListId: string) => Promise<void>;
  
  // Mobile view mode props
  mobileViewMode?: 'lists' | 'items';
  onMobileListSelect?: (listId: string) => void;
}

const TodoSidebar: React.FC<TodoSidebarProps> = ({
  todoLists,
  selectedList,
  setSelectedList,
  selectedListId,
  setSelectedListId,
  userId,
  showCompletedItems,
  setShowCompletedItems,
  showNewListInput,
  setShowNewListInput,
  newListName,
  setNewListName,
  handleAddList,
  listTaskCounts,
  setTodoSearchQuery,
  selectAllItems,
  allTodoCount,
  allTodoItems,
  allCategories = [],
  showUpgradeModal,
  draggedTodoId,
  onMoveTodoItem,
  mobileViewMode = 'lists',
  onMobileListSelect,
}) => {
  const [showAddListModal, setShowAddListModal] = React.useState(false);
  const [creationStep, setCreationStep] = useState<'choose' | 'manual' | 'import' | 'ai'>('choose');
  const [isGenerating, setIsGenerating] = useState(false);
  const [listName, setListName] = useState('');
  const [tasks, setTasks] = useState<any[]>([]);
  
  // State for tracking which list is being hovered over during drag
  const [hoveredListForMove, setHoveredListForMove] = useState<any>(null);
  const { generateTodos, isLoading: ragLoading, error: ragError } = useRAGTodoGeneration();
  const STARTER_TIER_MAX_LISTS = 3;
  const listLimitReached = todoLists.length >= STARTER_TIER_MAX_LISTS;

  // Handler for new list creation with tasks
  const handleAddListWithTasks = async ({ name, tasks }: { name: string; tasks?: any[] }) => {
    if (listLimitReached) return;
    await handleAddList(name, tasks || []);
    setShowAddListModal(false);
  };

  const handleNewListClick = () => {
    if (listLimitReached && showUpgradeModal) {
      showUpgradeModal();
    } else {
      setShowAddListModal(true);
      setCreationStep('choose');
    }
  };

  const handleOnboardingSelect = (method: 'manual' | 'import' | 'ai') => {
    setCreationStep(method);
  };

  const handleOnboardingClose = () => {
    setShowAddListModal(false);
    setCreationStep('choose');
  };

  const handleBuildWithAI = async (template: string) => {
    setIsGenerating(true);
    try {
      // Use RAG system for todo generation
      const ragResponse = await generateTodos({
        description: template,
        weddingDate: '2023-12-31',
        todoType: 'comprehensive',
        focusCategories: [],
        existingTodos: [],
        vendorData: []
      });

      if (ragResponse.success && ragResponse.todos) {
        setListName(ragResponse.todos.listName);
        setTasks(ragResponse.todos.todos);
        
        // Trigger credit refresh for useCredits hook
        if (ragResponse.credits && ragResponse.credits.required > 0) {
          console.log('🎯 Todo generation complete, triggering credit refresh:', ragResponse.credits);
          if (typeof window !== 'undefined') {
            localStorage.setItem('creditUpdateEvent', Date.now().toString());
            setTimeout(async () => {
              const { creditEventEmitter } = await import('@/utils/creditEventEmitter');
              creditEventEmitter.emit();
            }, 1000);
          }
        }
      } else {
        throw new Error('Failed to generate todo list');
      }
    } catch (error) {
      console.error('Error generating list:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const onListSelect = (list: any) => {
    setSelectedList(list);
    setTodoSearchQuery('');
    setShowCompletedItems(false);
    
    // Handle mobile view mode
    if (onMobileListSelect) {
      onMobileListSelect(list.id);
    }
  };

  return (
    <aside className={`unified-sidebar mobile-${mobileViewMode}-view`}>
      <div className="flex-1 flex flex-col">
        <div className="flex items-center justify-between p-6 pb-2 border-b border-[#E0DBD7]">
          <h4 className="text-lg font-playfair font-medium text-[#332B42] flex items-center">To-do Lists</h4>
          {/* New List Button opens side card or triggers upgrade modal */}
          <button
            onClick={handleNewListClick}
            className="text-xs text-[#332B42] border border-[#AB9C95] rounded-[5px] px-2 py-1 hover:bg-[#F3F2F0] ml-2 flex items-center h-7"
            title="Create a new list"
            style={{ alignSelf: 'center' }}
          >
            + New List
          </button>
        </div>
        <div className="p-6 pt-0">
          <div className="space-y-1">
            <div
              className={`flex items-center px-0 lg:px-3 py-2 rounded-[5px] text-[#332B42] text-sm font-medium cursor-pointer ${!selectedList && !showCompletedItems && mobileViewMode !== 'lists' ? 'bg-[#EBE3DD] border border-[#A85C36]' : 'hover:bg-[#F8F6F4] border border-transparent hover:border-[#AB9C95]'} mt-4 mb-2`}
              onClick={() => { 
                selectAllItems(); 
                setShowCompletedItems(false); 
                setTodoSearchQuery(''); 
                // Handle mobile view mode
                if (onMobileListSelect) {
                  onMobileListSelect('all-items');
                }
              }}
            >
              <span className="mr-2" title="All To-Do Items">
                {/* ListChecks icon should be imported where this component is used */}
                <span className="inline-block align-middle text-[#A85C36]">📋</span>
              </span>
              <span>All To-Do Items</span>
              <span className="ml-auto">
                <BadgeCount count={allTodoCount} />
              </span>
            </div>
            <div
              className={`flex items-center px-0 lg:px-3 py-2 rounded-[5px] text-[#332B42] text-sm font-medium cursor-pointer ${!selectedList && showCompletedItems && mobileViewMode !== 'lists' ? 'bg-[#EBE3DD] border border-[#A85C36]' : 'hover:bg-[#F8F6F4] border border-transparent hover:border-[#AB9C95]'} mb-12`}
              onClick={() => { 
                selectAllItems(); 
                setShowCompletedItems(true); 
                setTodoSearchQuery(''); 
                // Handle mobile view mode
                if (onMobileListSelect) {
                  onMobileListSelect('completed-items');
                }
              }}
            >
              <span className="mr-2" title="Completed To-Do Items">
                {/* CircleCheck icon should be imported where this component is used */}
                <span className="inline-block align-middle text-[#A85C36]">✔️</span>
              </span>
              <span>Completed To-Do Items</span>
              <span className="ml-auto">
                <BadgeCount count={allTodoItems.filter(item => item.isCompleted).length} />
              </span>
            </div>
            <SectionHeader title="Your Lists" className="pt-3" />
            {todoLists.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 px-4">
                <img 
                  src="/todo.png" 
                  alt="No todo lists" 
                  className="w-24 h-24 mb-4 opacity-60"
                />
                <p className="text-sm text-[#7A7A7A] text-center">
                  No To-do lists yet. Create a New List to get started!
                </p>
              </div>
            ) : (
              todoLists.map((list) => (
                <div
                  key={list.id}
                  onClick={() => onListSelect(list)}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    // Don't allow dropping into the currently selected list
                    if (draggedTodoId && onMoveTodoItem && selectedListId !== list.id) {
                      e.currentTarget.classList.add('bg-[#F0EDE8]', 'border-2', 'border-[#A85C36]', 'shadow-md');
                      setHoveredListForMove(list);
                    }
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                      e.currentTarget.classList.remove('bg-[#F0EDE8]', 'border-2', 'border-[#A85C36]', 'shadow-md');
                      setHoveredListForMove(null);
                    }
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    e.currentTarget.classList.remove('bg-[#F0EDE8]', 'border-2', 'border-[#A85C36]', 'shadow-md');
                    setHoveredListForMove(null);
                    // Don't allow dropping into the currently selected list
                    if (draggedTodoId && onMoveTodoItem && selectedListId !== list.id) {
                      onMoveTodoItem(draggedTodoId, selectedListId || '', list.id);
                    }
                  }}
                  className={`px-0 lg:px-3 py-2 rounded-[5px] text-[#332B42] text-sm font-medium cursor-pointer ${selectedList?.id === list.id && mobileViewMode !== 'lists' ? 'bg-[#EBE3DD] border border-[#A85C36]' : 'hover:bg-[#F8F6F4] border border-transparent hover:border-[#AB9C95]'} ${draggedTodoId && onMoveTodoItem && selectedListId !== list.id ? 'cursor-copy' : ''}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="truncate flex-1 min-w-0" title={draggedTodoId && onMoveTodoItem ? `Drop to-do item here to move it to "${list.name}"` : list.name}>{list.name}</span>
                    <BadgeCount count={listTaskCounts.get(list.id) ?? 0} />
                  </div>
                </div>
              ))
            )}
                      </div>
          </div>
          
          {/* Floating indicator for todo move operations */}
          {draggedTodoId && onMoveTodoItem && hoveredListForMove && selectedListId !== hoveredListForMove.id && (
            <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center p-4">
              <div className="bg-[#332B42] text-white px-4 py-3 md:px-6 md:py-4 rounded-full shadow-2xl animate-pulse max-w-[90vw]">
                <div className="flex items-center gap-2 md:gap-3">
                  <svg className="w-5 h-5 md:w-6 md:h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M7 17l5-5 5 5"></path>
                    <path d="M7 7l5 5 5-5"></path>
                  </svg>
                  <span className="font-playfair font-medium text-base md:text-lg leading-5 md:leading-6 text-white">
                    Move to-do item to "{hoveredListForMove.name}"
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
        <NewListOnboardingModal
        isOpen={showAddListModal}
        onClose={handleOnboardingClose}
        onSubmit={handleAddListWithTasks}
      />
    </aside>
  );
};

export default TodoSidebar; 