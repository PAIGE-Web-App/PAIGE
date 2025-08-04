import React, { useState, useRef, useEffect } from 'react';
import { FileFolder } from '@/types/files';
import { ChevronRight, Home, ChevronDown, Folder, Upload } from 'lucide-react';

interface FolderBreadcrumbProps {
  currentFolder?: FileFolder | null;
  parentFolder?: FileFolder | null;
  onNavigateToParent: () => void;
  onNavigateToFolder: (folder: FileFolder) => void;
  onCreateSubfolder: () => void;
  onUploadFile: () => void;
  folders: FileFolder[];
}

const FolderBreadcrumb: React.FC<FolderBreadcrumbProps> = ({
  currentFolder,
  parentFolder,
  onNavigateToParent,
  onNavigateToFolder,
  onCreateSubfolder,
  onUploadFile,
  folders,
}) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
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

      {/* New button with dropdown */}
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="btn-primaryinverse flex items-center gap-1 px-3 py-2 text-sm transition-colors"
          title="New"
        >
          <span>New</span>
          <ChevronDown className={`w-4 h-4 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
        </button>
        
        {showDropdown && (
          <div className="absolute right-0 top-full mt-1 bg-white border border-[#E0DBD7] rounded-[5px] shadow-lg z-10 min-w-[160px]">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCreateSubfolder();
                setShowDropdown(false);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[#332B42] hover:bg-[#F8F6F4] transition-colors"
            >
                                     <Folder className="w-4 h-4" style={{ strokeWidth: 1, fill: '#AB9C95' }} />
              New Subfolder
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onUploadFile();
                setShowDropdown(false);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[#332B42] hover:bg-[#F8F6F4] transition-colors"
            >
              <Upload className="w-4 h-4" />
              Upload File(s)
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default FolderBreadcrumb; 