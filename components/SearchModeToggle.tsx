import React from 'react';
import { Search, Sparkles } from 'lucide-react';

interface SearchModeToggleProps {
  isRAGMode: boolean;
  onToggle: (isRAG: boolean) => void;
  className?: string;
}

const SearchModeToggle: React.FC<SearchModeToggleProps> = ({ 
  isRAGMode, 
  onToggle, 
  className = '' 
}) => {
  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <button
        onClick={() => onToggle(false)}
        className={`flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors ${
          !isRAGMode 
            ? 'bg-[#A85C36] text-white' 
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
        }`}
        title="Regular search (filename only)"
      >
        <Search className="w-3 h-3" />
        <span>Regular</span>
      </button>
      <button
        onClick={() => onToggle(true)}
        className={`flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors ${
          isRAGMode 
            ? 'bg-purple-600 text-white' 
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
        }`}
        title="AI search (file content)"
      >
        <Sparkles className="w-3 h-3" />
        <span>AI</span>
      </button>
    </div>
  );
};

export default SearchModeToggle;

