import React, { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface DropdownItem {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  className?: string;
}

interface DropdownMenuProps {
  trigger: React.ReactNode;
  items: DropdownItem[];
  width?: number;
  zIndex?: number;
  align?: 'left' | 'right';
}

const DropdownMenu: React.FC<DropdownMenuProps> = ({ trigger, items, width = 200, zIndex = 50, align = 'right' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node) &&
          triggerRef.current && !triggerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="relative inline-block">
      <div ref={triggerRef} onClick={() => setIsOpen(!isOpen)}>
        {trigger}
      </div>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={dropdownRef}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            style={{ width, zIndex }}
            className={`absolute mt-2 bg-white border border-[#AB9C95] rounded-[5px] shadow-lg ${align === 'right' ? 'right-0' : 'left-0'}`}
          >
            {items.map((item, index) => (
              <button
                key={index}
                onClick={() => {
                  item.onClick();
                  setIsOpen(false);
                }}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-[#332B42] hover:bg-[#F3F2F0] whitespace-nowrap ${item.className || ''}`}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DropdownMenu; 