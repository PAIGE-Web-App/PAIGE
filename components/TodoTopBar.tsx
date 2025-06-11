import React from 'react';

interface TodoTopBarProps {
  selectedList: any;
  editingListNameId: string | null;
  editingListNameValue: string | null;
  setEditingListNameId: (id: string | null) => void;
  setEditingListNameValue: (val: string | null) => void;
  handleRenameList: (id: string) => void;
  todoSearchQuery: string;
  setTodoSearchQuery: (val: string) => void;
  showCompletedItems: boolean;
  handleOpenAddTodo: () => void;
  onListViewClick?: () => void;
}

const TodoTopBar: React.FC<TodoTopBarProps> = ({
  selectedList,
  editingListNameId,
  editingListNameValue,
  setEditingListNameId,
  setEditingListNameValue,
  handleRenameList,
  todoSearchQuery,
  setTodoSearchQuery,
  showCompletedItems,
  handleOpenAddTodo,
  onListViewClick,
}) => (
  <div className="sticky top-0 z-20 bg-[#F3F2F0] border-b-[0.5px] border-b-[var(--border-color)] w-full">
    <div className="flex items-center w-full gap-4 px-4 py-3">
      {/* List Name (left) */}
      <div className="flex-shrink-0 flex items-center gap-2">
        <div className="flex items-center gap-2">
          {editingListNameId === selectedList?.id ? (
            <input
              type="text"
              value={editingListNameValue || ''}
              onChange={(e) => setEditingListNameValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleRenameList(selectedList.id);
                } else if (e.key === 'Escape') {
                  setEditingListNameId(null);
                  setEditingListNameValue(null);
                }
              }}
              onBlur={() => {
                if (editingListNameValue) {
                  handleRenameList(selectedList.id);
                } else {
                  setEditingListNameId(null);
                  setEditingListNameValue(null);
                }
              }}
              className="px-2 py-1 border border-[#D6D3D1] rounded-[5px] bg-white text-sm focus:outline-none focus:border-[#A85C36]"
              autoFocus
            />
          ) : (
            <h1 className="text-xl font-playfair font-medium text-[#332B42]">
              {showCompletedItems && !selectedList
                ? 'Completed To-Do Items'
                : selectedList?.name || 'All To-Do Items'}
            </h1>
          )}
          {selectedList && selectedList.name !== 'My To-do' && !editingListNameId && (
            <button
              onClick={() => {
                setEditingListNameId(selectedList.id);
                setEditingListNameValue(selectedList.name);
              }}
              className="p-1 hover:bg-[#EBE3DD] rounded-[5px]"
            >
              <span className="inline-block align-middle text-[#AB9C95] -scale-x-100">✏️</span>
            </button>
          )}
        </div>
      </div>
      {/* Search Bar (center, grows) */}
      <div className="flex-1 flex justify-center">
        <input
          type="text"
          placeholder="Search for a To-do Item"
          className="w-full max-w-md px-4 py-2 border border-[#D6D3D1] rounded-[5px] bg-white text-sm focus:outline-none focus:border-[#A85C36]"
          value={todoSearchQuery}
          onChange={(e) => setTodoSearchQuery(e.target.value)}
        />
      </div>
      {/* Action Buttons (right) */}
      <div className="flex-shrink-0 flex gap-2">
        <button className="btn-secondary" onClick={onListViewClick}>
          List View
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><path d="M7 10l5 5 5-5" stroke="#F3F2F0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        {/* Only show the New To-do button if not viewing Completed To-Do Items */}
        {!showCompletedItems && (
          <button className="btn-primary" onClick={handleOpenAddTodo}>
            + New To-do Item
          </button>
        )}
      </div>
    </div>
  </div>
);

export default TodoTopBar; 