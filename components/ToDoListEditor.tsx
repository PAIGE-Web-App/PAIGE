import React from 'react';
import UnifiedTodoItem from './UnifiedTodoItem';

interface ToDoListEditorProps {
  tasks: { name: string; note?: string; category?: string; deadline?: string; endDate?: string }[];
  setTasks: (tasks: { name: string; note?: string; category?: string; deadline?: string; endDate?: string }[]) => void;
  customCategoryValue: string;
  setCustomCategoryValue: (val: string) => void;
  allCategories: string[];
}

const ToDoListEditor: React.FC<ToDoListEditorProps> = ({ tasks, setTasks, customCategoryValue, setCustomCategoryValue, allCategories }) => {
  const handleAddToDo = () => {
    setTasks([...tasks, { name: '', note: '', category: '', deadline: '', endDate: '' }]);
  };
  const handleRemoveToDo = (idx: number) => {
    setTasks(tasks.filter((_, i) => i !== idx));
  };
  return (
    <>
      <div className="space-y-4">
        {tasks.map((task, idx) => (
          <UnifiedTodoItem
            key={idx}
            todo={{
              id: `temp-${idx}`,
              name: task.name,
              note: task.note,
              category: task.category,
              deadline: task.deadline ? new Date(task.deadline) : undefined,
              endDate: task.endDate ? new Date(task.endDate) : undefined,
              isCompleted: false,
              completedAt: undefined,
              startDate: undefined,
              contactId: undefined,
              justUpdated: false,
              userId: 'temp-user',
              createdAt: new Date(),
              orderIndex: idx,
              listId: 'temp-list',
            }}
            contacts={[]}
            allCategories={allCategories}
            sortOption="myOrder"
            draggedTodoId={null}
            dragOverTodoId={null}
            dropIndicatorPosition={{ id: null, position: null }}
            currentUser={null}
            handleToggleTodoComplete={() => {}}
            handleUpdateTaskName={async (_, newName) => {
              setTasks(tasks.map((t, i) => i === idx ? { ...t, name: newName || '' } : t));
            }}
            handleUpdateDeadline={(_, deadline, endDate) => {
              setTasks(tasks.map((t, i) => i === idx ? { ...t, deadline: deadline || '', endDate: endDate || '' } : t));
            }}
            handleUpdateNote={(_, newNote) => {
              setTasks(tasks.map((t, i) => i === idx ? { ...t, note: newNote || '' } : t));
            }}
            handleUpdateCategory={(_, newCategory) => {
              setTasks(tasks.map((t, i) => i === idx ? { ...t, category: newCategory || '' } : t));
            }}
            handleCloneTodo={() => {}}
            handleDeleteTodo={() => {}}
            setTaskToMove={() => {}}
            setShowMoveTaskModal={() => {}}
            handleDragStart={() => {}}
            handleDragEnter={() => {}}
            handleDragLeave={() => {}}
            handleItemDragOver={() => {}}
            handleDragEnd={() => {}}
            mode="editor"
            onRemove={tasks.length > 1 ? () => handleRemoveToDo(idx) : undefined}
          />
        ))}
      </div>
      <button
        type="button"
        onClick={handleAddToDo}
        className="text-xs text-[#332B42] border border-[#AB9C95] rounded-[5px] px-2 py-1 hover:bg-[#F3F2F0] flex items-center h-7 mt-2"
      >
        + Add another To-Do item
      </button>
    </>
  );
};

export default ToDoListEditor; 