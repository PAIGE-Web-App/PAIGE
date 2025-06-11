import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface TaskFieldsProps {
  name: string;
  setName: (val: string) => void;
  note: string;
  setNote: (val: string) => void;
  deadline: string;
  setDeadline: (val: string) => void;
  category: string;
  setCategory: (val: string) => void;
  allCategories: string[];
  disabled?: boolean;
}

const TaskFields: React.FC<TaskFieldsProps> = ({
  name, setName, note, setNote, deadline, setDeadline, category, setCategory, allCategories, disabled
}) => (
  <>
    <div className="mb-4">
      <label className="block text-sm font-medium mb-1">To-do Name</label>
      <input
        className="w-full border border-[#D6D3D1] rounded-[5px] px-2 py-1 text-sm"
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder="Enter to-do name"
        autoFocus
        disabled={disabled}
      />
    </div>
    <div className="mb-4">
      <label className="block text-sm font-medium mb-1">Notes</label>
      <textarea
        className="w-full border border-[#D6D3D1] rounded-[5px] px-2 py-1 text-sm"
        value={note}
        onChange={e => setNote(e.target.value)}
        placeholder="Add notes (optional)"
        rows={2}
        disabled={disabled}
      />
    </div>
    <div className="mb-4">
      <label className="block text-sm font-medium mb-1">Deadline</label>
      <input
        type="date"
        className="w-full border border-[#D6D3D1] rounded-[5px] px-2 py-1 text-sm"
        value={deadline}
        onChange={e => setDeadline(e.target.value)}
        disabled={disabled}
      />
    </div>
    <div className="mb-6">
      <label className="block text-sm font-medium mb-1">Category</label>
      <select
        className="w-full border border-[#D6D3D1] rounded-[5px] px-2 py-1 text-sm"
        value={category}
        onChange={e => setCategory(e.target.value)}
        disabled={disabled}
      >
        <option value="">Select category</option>
        {allCategories.map(cat => (
          <option key={cat} value={cat}>{cat}</option>
        ))}
      </select>
    </div>
  </>
);

interface AddSideCardProps {
  open: boolean;
  onClose: () => void;
  onAddList?: (list: { name: string; tasks: { name: string; note: string; deadline: string; category: string }[] }) => Promise<void>;
  onAddTodo?: (todo: { name: string; note: string; deadline: string; category: string; listId: string }) => Promise<void>;
  allLists: { id: string; name: string }[];
  allCategories: string[];
  defaultListId?: string | null;
  loading?: boolean;
  mode: 'todo' | 'list';
  listLimitReached?: boolean;
}

const AddSideCard: React.FC<AddSideCardProps> = ({
  open,
  onClose,
  onAddList,
  onAddTodo,
  allLists,
  allCategories,
  defaultListId = null,
  loading = false,
  mode,
  listLimitReached = false,
}) => {
  // For todo mode
  const [todoName, setTodoName] = useState('');
  const [todoNote, setTodoNote] = useState('');
  const [todoDeadline, setTodoDeadline] = useState('');
  const [todoCategory, setTodoCategory] = useState('');
  const [todoListId, setTodoListId] = useState<string | null>(defaultListId);
  const [isAdding, setIsAdding] = useState(false);

  // For list mode
  const [listName, setListName] = useState('');
  const [tasks, setTasks] = useState([
    { name: '', note: '', deadline: '', category: '' }
  ]);

  React.useEffect(() => {
    if (open) {
      setTodoName('');
      setTodoNote('');
      setTodoDeadline('');
      setTodoCategory('');
      setTodoListId(defaultListId || (allLists.length > 0 ? allLists[0].id : null));
      setIsAdding(false);
      setListName('');
      setTasks([{ name: '', note: '', deadline: '', category: '' }]);
    }
  }, [open, defaultListId, allLists]);

  const handleAddTaskField = () => {
    setTasks([...tasks, { name: '', note: '', deadline: '', category: '' }]);
  };
  const handleRemoveTaskField = (idx: number) => {
    setTasks(tasks.filter((_, i) => i !== idx));
  };
  const handleTaskChange = (idx: number, field: string, value: string) => {
    setTasks(tasks.map((task, i) => i === idx ? { ...task, [field]: value } : task));
  };

  const handleSubmit = async () => {
    if (mode === 'todo') {
      if (!todoName.trim() || !todoListId || !onAddTodo) return;
      setIsAdding(true);
      await onAddTodo({ name: todoName, note: todoNote, deadline: todoDeadline, category: todoCategory, listId: todoListId });
      setIsAdding(false);
    } else if (mode === 'list') {
      if (!listName.trim() || !onAddList) return;
      setIsAdding(true);
      await onAddList({ name: listName, tasks: tasks.filter(t => t.name.trim()) });
      setIsAdding(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex justify-end bg-black bg-opacity-30"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="w-full max-w-md h-full bg-white shadow-xl p-6 flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            {mode === 'todo' ? (
              <>
                <h2 className="text-lg font-playfair font-medium mb-4">Add New To-do Item</h2>
                {allLists.length > 1 && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-1">Select List</label>
                    <select
                      className="w-full border border-[#D6D3D1] rounded-[5px] px-2 py-1 text-sm"
                      value={todoListId || ''}
                      onChange={e => setTodoListId(e.target.value)}
                    >
                      <option value="" disabled>Select a list</option>
                      {allLists.map(list => (
                        <option key={list.id} value={list.id}>{list.name}</option>
                      ))}
                    </select>
                  </div>
                )}
                <TaskFields
                  name={todoName}
                  setName={setTodoName}
                  note={todoNote}
                  setNote={setTodoNote}
                  deadline={todoDeadline}
                  setDeadline={setTodoDeadline}
                  category={todoCategory}
                  setCategory={setTodoCategory}
                  allCategories={allCategories}
                  disabled={isAdding || loading}
                />
              </>
            ) : (
              <>
                <h2 className="text-lg font-playfair font-medium mb-4">Add New List</h2>
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-1">List Name</label>
                  <input
                    className="w-full border border-[#D6D3D1] rounded-[5px] px-2 py-1 text-sm"
                    value={listName}
                    onChange={e => setListName(e.target.value)}
                    placeholder="Enter list name"
                    autoFocus
                    disabled={isAdding || loading || listLimitReached}
                  />
                </div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-medium text-sm">Tasks for this list</span>
                  <button
                    className="btn-primary-inverse text-xs px-2 py-1"
                    onClick={handleAddTaskField}
                    disabled={isAdding || loading || listLimitReached}
                  >+ Add Task</button>
                </div>
                {tasks.map((task, idx) => (
                  <div key={idx} className="mb-4 border rounded p-2 relative">
                    <TaskFields
                      name={task.name}
                      setName={val => handleTaskChange(idx, 'name', val)}
                      note={task.note}
                      setNote={val => handleTaskChange(idx, 'note', val)}
                      deadline={task.deadline}
                      setDeadline={val => handleTaskChange(idx, 'deadline', val)}
                      category={task.category}
                      setCategory={val => handleTaskChange(idx, 'category', val)}
                      allCategories={allCategories}
                      disabled={isAdding || loading || listLimitReached}
                    />
                    {tasks.length > 1 && (
                      <button
                        className="absolute top-2 right-2 text-xs text-red-500"
                        onClick={() => handleRemoveTaskField(idx)}
                        disabled={isAdding || loading || listLimitReached}
                      >Remove</button>
                    )}
                  </div>
                ))}
                {listLimitReached && (
                  <div className="text-red-500 text-sm mb-2">You have reached the maximum number of lists for your plan.</div>
                )}
              </>
            )}
            <div className="flex justify-end gap-2 mt-auto">
              <button className="btn-primary-inverse" onClick={onClose} type="button">Cancel</button>
              <button
                className="btn-primary"
                onClick={handleSubmit}
                disabled={isAdding || loading || (mode === 'todo' ? !todoName.trim() || !todoListId : !listName.trim() || listLimitReached)}
                type="button"
              >Submit</button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AddSideCard; 