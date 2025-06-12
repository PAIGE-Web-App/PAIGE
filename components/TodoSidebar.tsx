import React from 'react';
import TaskSideCard from './TaskSideCard';

interface TodoSidebarProps {
  todoLists: any[];
  selectedList: any;
  setSelectedList: (list: any) => void;
  showCompletedItems: boolean;
  setShowCompletedItems: (val: boolean) => void;
  showNewListInput: boolean;
  setShowNewListInput: (val: boolean) => void;
  newListName: string;
  setNewListName: (val: string) => void;
  handleAddList: (name: string, tasks: any[]) => Promise<void>;
  listTaskCounts: Map<string, number>;
  setTodoSearchQuery: (val: string) => void;
  setExplicitAllSelected: (val: boolean) => void;
  allTodoCount: number;
  allTodoItems: any[];
  allCategories?: any[];
  showUpgradeModal?: () => void;
}

const TodoSidebar: React.FC<TodoSidebarProps> = ({
  todoLists,
  selectedList,
  setSelectedList,
  showCompletedItems,
  setShowCompletedItems,
  showNewListInput,
  setShowNewListInput,
  newListName,
  setNewListName,
  handleAddList,
  listTaskCounts,
  setTodoSearchQuery,
  setExplicitAllSelected,
  allTodoCount,
  allTodoItems,
  allCategories = [],
  showUpgradeModal,
}) => {
  const [showAddListSideCard, setShowAddListSideCard] = React.useState(false);
  const STARTER_TIER_MAX_LISTS = 3;
  const listLimitReached = todoLists.length >= STARTER_TIER_MAX_LISTS;

  // Handler for new list creation with tasks
  const handleAddListWithTasks = async ({ name, tasks }: { name: string; tasks: any[] }) => {
    if (listLimitReached) return;
    await handleAddList(name, tasks);
    setShowAddListSideCard(false);
  };

  const handleNewListClick = () => {
    if (listLimitReached && showUpgradeModal) {
      showUpgradeModal();
    } else {
      setShowAddListSideCard(true);
    }
  };

  return (
    <aside className="w-[320px] bg-[#F3F2F0] border-r border-[#E0DBD7] flex flex-col justify-between min-h-full p-0">
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
              className={`flex items-center px-3 py-2 rounded-[5px] text-[#332B42] text-sm font-medium cursor-pointer ${!selectedList && !showCompletedItems ? 'bg-[#EBE3DD] border border-[#A85C36]' : 'hover:bg-[#F8F6F4] border border-transparent hover:border-[#AB9C95]'} mt-4 mb-2`}
              onClick={() => { setSelectedList(null); setExplicitAllSelected(true); setShowCompletedItems(false); setTodoSearchQuery(''); }}
            >
              <span className="mr-2" title="All To-Do Items">
                {/* ListChecks icon should be imported where this component is used */}
                <span className="inline-block align-middle text-[#A85C36]">📋</span>
              </span>
              <span>All To-Do Items</span>
              <span className="ml-auto text-xs text-[#7A7A7A] bg-[#EBE3DD] px-1.5 py-0.5 rounded-full font-work">{allTodoCount}</span>
            </div>
            <div
              className={`flex items-center px-3 py-2 rounded-[5px] text-[#332B42] text-sm font-medium cursor-pointer ${!selectedList && showCompletedItems ? 'bg-[#EBE3DD] border border-[#A85C36]' : 'hover:bg-[#F8F6F4] border border-transparent hover:border-[#AB9C95]'} mb-8`}
              onClick={() => { setSelectedList(null); setExplicitAllSelected(true); setShowCompletedItems(true); setTodoSearchQuery(''); }}
            >
              <span className="mr-2" title="Completed To-Do Items">
                {/* CircleCheck icon should be imported where this component is used */}
                <span className="inline-block align-middle text-[#A85C36]">✔️</span>
              </span>
              <span>Completed To-Do Items</span>
              <span className="ml-auto text-xs text-[#7A7A7A] bg-[#EBE3DD] px-1.5 py-0.5 rounded-full font-work">
                {allTodoItems.filter(item => item.isCompleted).length}
              </span>
            </div>
            <div className="my-12 flex items-center gap-2">
              <span className="text-xs text-[#AB9C95] uppercase tracking-wider font-semibold">Your Lists</span>
              <div className="flex-1 h-px bg-[#E0DBD7]"></div>
            </div>
            {todoLists.map((list) => (
              <div
                key={list.id}
                onClick={() => {
                  setSelectedList(list);
                  setTodoSearchQuery('');
                  setShowCompletedItems(false);
                }}
                className={`px-3 py-2 rounded-[5px] text-[#332B42] text-sm font-medium cursor-pointer ${selectedList?.id === list.id ? 'bg-[#EBE3DD] border border-[#A85C36]' : 'hover:bg-[#F8F6F4] border border-transparent hover:border-[#AB9C95]'}`}
              >
                <div className="flex items-center justify-between">
                  <span>{list.name}</span>
                  {listTaskCounts.has(list.id) && (
                    <span className="ml-2 text-xs text-[#7A7A7A] bg-[#EBE3DD] px-1.5 py-0.5 rounded-full">{listTaskCounts.get(list.id)}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      {/* AddSideCard for new list creation */}
      <TaskSideCard
        open={showAddListSideCard}
        onClose={() => setShowAddListSideCard(false)}
        onAddList={handleAddListWithTasks}
        allLists={todoLists}
        allCategories={allCategories}
        mode="list"
        listLimitReached={listLimitReached}
      />
    </aside>
  );
};

export default TodoSidebar; 