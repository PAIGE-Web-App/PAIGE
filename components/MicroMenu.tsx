import React, { useState, useRef } from 'react';
import { MoreHorizontal } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useClickOutside } from '@/hooks/useClickOutside';

interface MicroMenuItem {
  label: string;
  onClick: () => void;
  className?: string;
  icon?: React.ReactNode;
}

interface MicroMenuProps {
  items: MicroMenuItem[];
  className?: string;
  buttonClassName?: string;
  menuClassName?: string;
  title?: string;
}

const MicroMenu: React.FC<MicroMenuProps> = ({
  items,
  className = "",
  buttonClassName = "p-1 hover:bg-gray-100 rounded-full",
  menuClassName = "absolute right-0 mt-1 w-max bg-white border border-gray-200 rounded-md shadow-lg z-50",
  title = "More options"
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPosition, setMenuPosition] = useState<'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'>('bottom-right');

  // Close menu when clicking outside
  useClickOutside(menuRef, () => setIsOpen(false), isOpen);

  const handleToggleMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!isOpen) {
      // Calculate position to prevent overlap
      const buttonRect = e.currentTarget.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const menuWidth = 200; // Approximate max width for dynamic sizing
      const menuHeight = 80; // Approximate height
      
      // Find the actual container element to get real available space
      const container = e.currentTarget.closest('.grid, .flex, [class*="grid"], [class*="flex"]');
      let containerRect: DOMRect | null = null;
      if (container) {
        containerRect = container.getBoundingClientRect();
      }
      
      let position: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left' = 'bottom-right';
      
      // Calculate available space considering the actual container
      const availableRight = containerRect ? containerRect.right - buttonRect.right : viewportWidth - buttonRect.right;
      const availableLeft = containerRect ? buttonRect.left - containerRect.left : buttonRect.left;
      
      // Always prefer left alignment for grid layouts to prevent overlap with adjacent cards
      // This is especially important when the middle pane is constrained by the AI panel
      if (availableRight < menuWidth + 30 || buttonRect.right > (containerRect?.right || viewportWidth) - 100) {
        position = position.includes('bottom') ? 'bottom-left' : 'top-left';
      }
      
      // Additional safety check: if we're very close to the right edge of any container, force left alignment
      const rightEdgeBuffer = 50; // 50px buffer from right edge
      if (buttonRect.right > (containerRect?.right || viewportWidth) - rightEdgeBuffer) {
        position = position.includes('bottom') ? 'bottom-left' : 'top-left';
      }
      
      // Check if menu would overflow bottom edge
      if (buttonRect.bottom + menuHeight > viewportHeight) {
        position = position.includes('left') ? 'top-left' : 'top-right';
      }
      
      setMenuPosition(position);
    }
    
    setIsOpen(!isOpen);
  };

  const handleItemClick = (item: MicroMenuItem) => {
    item.onClick();
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`} ref={menuRef}>
      <button
        onClick={handleToggleMenu}
        className={buttonClassName}
        title={title}
      >
        <MoreHorizontal size={16} className="text-gray-500" />
      </button>
      
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className={`${menuClassName} ${
              menuPosition === 'bottom-right' ? 'top-full left-0' :
              menuPosition === 'bottom-left' ? 'top-full right-0' :
              menuPosition === 'top-right' ? 'bottom-full left-0' :
              'bottom-full right-0'
            }`}
          >
            {items.map((item, index) => (
              <button
                key={index}
                onClick={() => handleItemClick(item)}
                className={`block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${
                  item.className || 'text-gray-700'
                }`}
              >
                <div className="flex items-center gap-2 whitespace-nowrap">
                  {item.icon && <span className="flex-shrink-0">{item.icon}</span>}
                  <span className="truncate">{item.label}</span>
                </div>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MicroMenu; 