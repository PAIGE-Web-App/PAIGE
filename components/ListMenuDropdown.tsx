// components/ListMenuDropdown.tsx
import React, { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Copy, Trash2 } from 'lucide-react';

interface TodoList {
  id: string;
  name: string;
}

interface ListMenuDropdownProps {
  list: TodoList;
  handleRenameList: (listId: string) => Promise<void>;
  handleDeleteList: (listId: string) => Promise<void>;
  setEditingListNameId: (id: string | null) => void;
  setEditingListNameValue: (value: string | null) => void;
  setOpenListMenuId: (id: string | null) => void;
  buttonRef: React.RefObject<HTMLButtonElement>; // Ref to the button that opens the menu
}

const ListMenuDropdown: React.FC<ListMenuDropdownProps> = ({
  list,
  handleRenameList,
  handleDeleteList,
  setEditingListNameId,
  setEditingListNameValue,
  setOpenListMenuId,
  buttonRef,
}) => {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    const calculatePosition = () => {
      if (buttonRef.current && dropdownRef.current) {
        const rect = buttonRef.current.getBoundingClientRect();
        // Position the dropdown below the button, aligned to the right
        setPosition({
          top: rect.bottom + window.scrollY + 8, // 8px below the button
          left: rect.right + window.scrollX - dropdownRef.current.offsetWidth, // Align right edge
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
  }, [buttonRef, list]); // Recalculate if buttonRef or list changes

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node) &&
          buttonRef.current && !buttonRef.current.contains(event.target as Node)) {
        setOpenListMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [buttonRef, setOpenListMenuId]);


  return (
    <motion.div
      ref={dropdownRef}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
      style={{ top: position.top, left: position.left }}
      className="fixed bg-white border border-[#AB9C95] rounded-[5px] shadow-lg z-50 flex flex-col w-32" // Increased z-index
    >
      <button
        onClick={() => {
          setEditingListNameId(list.id);
          setEditingListNameValue(list.name);
          setOpenListMenuId(null);
        }}
        className="flex items-center gap-2 px-3 py-2 text-sm text-[#332B42] hover:bg-[#F3F2F0] rounded-t-[5px]"
      >
        <Copy size={16} /> Rename
      </button>
      {list.name !== 'My To-do' && ( // Prevent deleting 'My To-do' list
        <button
          onClick={() => handleDeleteList(list.id)}
          className="flex items-center gap-2 px-3 py-2 text-sm text-[#D63030] hover:bg-[#F3F2F0] rounded-b-[5px]"
        >
          <Trash2 size={16} /> Delete
        </button>
      )}
    </motion.div>
  );
};

export default ListMenuDropdown;
