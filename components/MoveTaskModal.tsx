// components/MoveTaskModal.tsx
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface TodoItem {
  id: string;
  name: string;
  listId: string;
  // ... other properties you might need from TodoItem
}

interface TodoList {
  id: string;
  name: string;
  // ... other properties you might need from TodoList
}

interface MoveTaskModalProps {
  task: TodoItem;
  todoLists: TodoList[];
  currentListId: string;
  onMove: (taskId: string, targetListId: string) => void;
  onClose: () => void;
}

const MoveTaskModal: React.FC<MoveTaskModalProps> = ({ task, todoLists, currentListId, onMove, onClose }) => {
  // Filter out the current list from the options
  const availableLists = todoLists.filter(list => list.id !== currentListId);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center p-4 z-50"
        onClick={onClose} // Close modal when clicking outside
      >
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -50, opacity: 0 }}
          className="bg-white rounded-[10px] shadow-xl w-full max-w-sm p-6 relative"
          onClick={(e) => e.stopPropagation()} // Prevent click from closing modal
        >
          <button
            onClick={onClose}
            className="absolute top-3 right-3 text-[#7A7A7A] hover:text-[#332B42] p-1 rounded-full"
            title="Close"
          >
            <X size={20} />
          </button>

          <h3 className="font-playfair text-xl font-semibold text-[#332B42] mb-4">Move Task: "{task.name}"</h3>

          {availableLists.length === 0 ? (
            <p className="text-sm text-gray-600">No other lists available to move this task to.</p>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-[#364257] mb-2">Select a list to move this task to:</p>
              {availableLists.map((list) => (
                <button
                  key={list.id}
                  onClick={() => onMove(task.id, list.id)}
                  className="w-full text-left px-4 py-2 text-sm rounded-[5px] bg-[#F3F2F0] text-[#332B42] hover:bg-[#E0DBD7] transition-colors duration-200"
                >
                  {list.name}
                </button>
              ))}
            </div>
          )}

          <div className="mt-6 flex justify-end">
            <button onClick={onClose} className="btn-primary-inverse">
              Cancel
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default MoveTaskModal;
