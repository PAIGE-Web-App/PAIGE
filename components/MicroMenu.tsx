import React, { useState, useRef, useEffect } from 'react';
import { MoreHorizontal } from 'lucide-react';

interface MicroMenuItem {
  label: string;
  onClick: () => void;
  className?: string;
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
  menuClassName = "absolute right-0 mt-1 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-10",
  title = "More options"
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleToggleMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
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
      
      {isOpen && (
        <div className={menuClassName}>
          {items.map((item, index) => (
            <button
              key={index}
              onClick={() => handleItemClick(item)}
              className={`block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${
                item.className || 'text-gray-700'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default MicroMenu; 