import React from 'react';
import { FileFolder } from '@/types/files';
import { ChevronRight, Home } from 'lucide-react';

interface FolderBreadcrumbProps {
  currentFolder?: FileFolder | null;
  parentFolder?: FileFolder | null;
  onNavigateToParent: () => void;
  onNavigateToFolder: (folder: FileFolder) => void;
  folders: FileFolder[];
}

const FolderBreadcrumb: React.FC<FolderBreadcrumbProps> = ({
  currentFolder,
  parentFolder,
  onNavigateToParent,
  onNavigateToFolder,
  folders,
}) => {
  // Build the full breadcrumb path
  const buildBreadcrumbPath = (folder: FileFolder): FileFolder[] => {
    const path: FileFolder[] = [];
    let current = folder;
    
    while (current.parentId) {
      const parent = folders.find(f => f.id === current.parentId);
      if (parent) {
        path.unshift(parent);
        current = parent;
      } else {
        break;
      }
    }
    
    return path;
  };

  const breadcrumbPath = currentFolder ? buildBreadcrumbPath(currentFolder) : [];

  if (!currentFolder) {
    return null;
  }

  return (
    <div className="flex items-center justify-between text-sm text-[#AB9C95] px-6 py-3 bg-[#F8F6F4] border-b border-[#E0DBD7]">
      <div className="flex items-center gap-2">
        {/* Show full breadcrumb path */}
        {breadcrumbPath.length > 0 && (
          <>
            <button
              onClick={onNavigateToParent}
              className="flex items-center gap-1 hover:text-[#332B42] transition-colors"
              title="Go to parent"
            >
              <Home className="w-4 h-4" />
              {breadcrumbPath[0].name}
            </button>
            {breadcrumbPath.slice(1).map((folder, index) => (
              <React.Fragment key={folder.id}>
                <ChevronRight className="w-4 h-4" />
                <button
                  onClick={() => onNavigateToFolder(folder)}
                  className="hover:text-[#332B42] transition-colors"
                  title={`Go to ${folder.name}`}
                >
                  {folder.name}
                </button>
              </React.Fragment>
            ))}
            <ChevronRight className="w-4 h-4" />
          </>
        )}
        
        {/* Show current folder */}
        <span className="text-[#332B42] font-medium" title={currentFolder.name}>
          {currentFolder.name}
        </span>
      </div>


    </div>
  );
};

export default FolderBreadcrumb; 