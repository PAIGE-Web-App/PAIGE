// components/ListMenuDropdown.tsx
import React, { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Copy, Trash2, MoveRight } from 'lucide-react';
import type { TodoList } from '../types/todo';

interface ListMenuDropdownProps {
  list?: TodoList;
  todo?: any;
  handleRenameList?: (listId: string) => Promise<void>;
  setPendingDeleteListId?: (listId: string) => void;
  handleCloneTodo?: (todo: any) => void;
  handleDeleteTodo?: (todoId: string) => void;
  setEditingListNameId?: (id: string | null) => void;
  setEditingListNameValue?: (value: string | null) => void;
  setOpenListMenuId?: (id: string | null) => void;
  setTaskToMove?: (todo: any) => void;
  setShowMoveTaskModal?: (show: boolean) => void;
  todoLists?: any[];
  allCategories?: string[];
  onClose?: () => void;
  buttonRef?: React.RefObject<HTMLButtonElement | null>;
  position?: { x: number; y: number };
}

const ListMenuDropdown: React.FC<ListMenuDropdownProps> = ({
  list,
  todo,
  handleRenameList,
  setPendingDeleteListId,
  handleCloneTodo,
  handleDeleteTodo,
  setEditingListNameId,
  setEditingListNameValue,
  setOpenListMenuId,
  setTaskToMove,
  setShowMoveTaskModal,
  todoLists = [],
  allCategories = [],
  onClose,
  buttonRef,
  position,
}) => {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    const calculatePosition = () => {
      if (position && dropdownRef.current) {
        // Default position: below and right of cursor
        let top = position.y;
        let left = position.x;
        const dropdownRect = dropdownRef.current.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        // Adjust if dropdown would overflow right edge
        if (left + dropdownRect.width > viewportWidth) {
          left = viewportWidth - dropdownRect.width - 8; // 8px margin
        }
        // Adjust if dropdown would overflow bottom edge
        if (top + dropdownRect.height > viewportHeight) {
          top = viewportHeight - dropdownRect.height - 8; // 8px margin
        }
        // Prevent negative positions
        left = Math.max(8, left);
        top = Math.max(8, top);

        setDropdownPosition({ top, left });
      } else if (buttonRef?.current && dropdownRef.current) {
        // For button-based positioning
        const rect = buttonRef.current.getBoundingClientRect();
        setDropdownPosition({
          top: rect.bottom + window.scrollY + 8,
          left: rect.right + window.scrollX - dropdownRef.current.offsetWidth,
        });
      }
    };

    calculatePosition();
    window.addEventListener('resize', calculatePosition);
    window.addEventListener('scroll', calculatePosition);

    return () => {
      window.removeEventListener('resize', calculatePosition);
      window.removeEventListener('scroll', calculatePosition);
    };
  }, [buttonRef, position, list]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose?.();
        setOpenListMenuId?.(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [setOpenListMenuId, onClose]);

  const renderListMenu = () => (
    <>
      {list && list.name !== 'My To-do' && (
        <button
          onClick={() => {
            setEditingListNameId?.(list?.id || null);
            setEditingListNameValue?.(list?.name || null);
            setOpenListMenuId?.(null);
          }}
          className="w-full flex items-center gap-2 px-4 py-2 text-sm text-[#332B42] hover:bg-[#F3F2F0] rounded-t-[5px] text-left"
        >
          <Copy size={16} /> Rename
        </button>
      )}
      {list && list.name !== 'My To-do' && (
        <button
          onClick={() => {
            setPendingDeleteListId?.(list.id);
            setOpenListMenuId?.(null);
            onClose?.();
          }}
          className="w-full flex items-center gap-2 px-4 py-2 text-sm text-[#D63030] hover:bg-[#F3F2F0] rounded-b-[5px] text-left"
        >
          <Trash2 size={16} /> Delete
        </button>
      )}
    </>
  );

  const renderTodoMenu = () => (
    <>
      <button
        onClick={() => {
          handleCloneTodo?.(todo);
          onClose?.();
        }}
        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-[#332B42] hover:bg-[#F3F2F0] rounded-t-[5px] text-left"
      >
        <Copy size={16} /> Clone
      </button>
      <button
        onClick={() => {
          setTaskToMove?.(todo);
          setShowMoveTaskModal?.(true);
          onClose?.();
        }}
        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-[#332B42] hover:bg-[#F3F2F0] text-left"
      >
        <MoveRight size={16} /> Move to List
      </button>
      <button
        onClick={() => {
          handleDeleteTodo?.(todo.id);
          onClose?.();
        }}
        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-[#D63030] hover:bg-[#F3F2F0] rounded-b-[5px] text-left"
      >
        <Trash2 size={16} /> Delete
      </button>
    </>
  );

  return (
    <motion.div
      ref={dropdownRef}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
      style={{ top: dropdownPosition.top, left: dropdownPosition.left }}
      className="fixed bg-white border border-[#AB9C95] rounded-[5px] shadow-lg z-50 flex flex-col w-48"
    >
      {list ? renderListMenu() : renderTodoMenu()}
    </motion.div>
  );
};

export default ListMenuDropdown;
