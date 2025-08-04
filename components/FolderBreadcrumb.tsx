import React from 'react';
import { FileFolder } from '@/types/files';
import { ChevronRight, Home } from 'lucide-react';

interface FolderBreadcrumbProps {
  currentFolder?: FileFolder | null;
  parentFolder?: FileFolder | null;
  onNavigateToParent: () => void;
}

const FolderBreadcrumb: React.FC<FolderBreadcrumbProps> = ({
  currentFolder,
  parentFolder,
  onNavigateToParent,
}) => {
  if (!currentFolder || currentFolder.id === 'all') {
    return null;
  }

  return (
    <div className="flex items-center gap-2 text-sm text-[#AB9C95] px-6 py-3 bg-[#F8F6F4] border-b border-[#E0DBD7]">
      {/* Show parent folder if it exists */}
      {parentFolder && (
        <>
          <button
            onClick={onNavigateToParent}
            className="flex items-center gap-1 hover:text-[#332B42] transition-colors"
            title="Go to parent"
          >
            <Home className="w-4 h-4" />
            {parentFolder.name}
          </button>
          <ChevronRight className="w-4 h-4" />
        </>
      )}
      
      {/* Show current folder */}
      <span className="text-[#332B42] font-medium" title={currentFolder.name}>
        {currentFolder.name}
      </span>
    </div>
  );
};

export default FolderBreadcrumb; 