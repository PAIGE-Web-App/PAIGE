import React, { useRef, useEffect } from 'react';
import { Search, X as LucideX } from 'lucide-react';
import { motion } from 'framer-motion';

interface SearchBarProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

const SearchBar: React.FC<SearchBarProps> = ({ value, onChange, placeholder = '', isOpen, setIsOpen }) => {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    function handleClickOutside(event: MouseEvent) {
      if (
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        // Only close if there's no text in the search bar
        if (!value.trim()) {
          setIsOpen(false);
        }
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, setIsOpen, value]);

  return (
    <>
      {!isOpen && (
        <button
          className="p-2 rounded-full hover:bg-[#EBE3DD] transition-colors duration-200 flex-shrink-0"
          style={{ height: '32px', width: '32px' }}
          onClick={() => setIsOpen(true)}
          aria-label="Open search"
          type="button"
        >
          <Search className="w-4 h-4 text-[#364257]" />
        </button>
      )}
      {isOpen && (
        <motion.div
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: '100%', opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.25, ease: 'easeInOut' }}
          className="relative flex items-center flex-grow min-w-0 h-8"
        >
          <Search className="w-4 h-4 text-[#364257] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            placeholder={placeholder}
            className="pl-12 pr-9 w-full h-8 border border-[#A85C36] rounded-[5px] bg-white text-base focus:outline-none focus:border-[#A85C36] transition-all duration-300"
            value={value}
            onChange={e => onChange(e.target.value)}
            onKeyDown={e => { if (e.key === 'Escape') setIsOpen(false); }}
            tabIndex={0}
            autoFocus
          />
          {value && (
            <button
              className="absolute right-3 text-[#364257] hover:text-[#A85C36] transition-opacity duration-200 opacity-100"
              onClick={() => onChange('')}
              tabIndex={0}
              type="button"
              style={{ zIndex: 10 }}
            >
              <LucideX className="w-4 h-4" />
            </button>
          )}
        </motion.div>
      )}
    </>
  );
};

export default SearchBar; 