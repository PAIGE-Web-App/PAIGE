import React, { useState, useRef, useEffect } from 'react';
import { FileFolder } from '@/types/files';
import { Search, Plus, Upload, Copy, Trash2, ChevronDown, Folder } from 'lucide-react';
import SearchBar from './SearchBar';

interface FilesTopBarProps {
  currentFolder: FileFolder | null;
  editingFolderNameId: string | null;
  editingFolderNameValue: string | null;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  onSearchToggle: () => void;
  onEditFolder: (folderId: string, name: string) => void;
  onCloneFolder: (folderId: string) => void;
  onDeleteFolder: (folderId: string) => void;
  onRenameFolder: (folderId: string) => void;
  onEditingFolderNameChange: (value: string) => void;
  onCancelEdit: () => void;
  onCreateSubfolder: () => void;
  onUploadFile: () => void;
}

const FilesTopBar: React.FC<FilesTopBarProps> = ({
  currentFolder,
  editingFolderNameId,
  editingFolderNameValue,
  searchQuery,
  onSearchQueryChange,
  onSearchToggle,
  onEditFolder,
  onCloneFolder,
  onDeleteFolder,
  onRenameFolder,
  onEditingFolderNameChange,
  onCancelEdit,
  onCreateSubfolder,
  onUploadFile,
}) => {
  const [searchOpen, setSearchOpen] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (searchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [searchOpen]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      // Handle dropdown click outside
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
      
      // Handle search click outside
      if (
        searchOpen &&
        searchInputRef.current &&
        !(searchInputRef.current.parentElement?.contains(event.target as Node))
      ) {
        setSearchOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [searchOpen]);
  return (
    <div className="bg-white border-b border-[#E0DBD7] p-6 flex-shrink-0">
      <div className="flex items-center gap-4">
        {/* Left Side - Folder Name and Controls */}
        <div className="flex items-center gap-4 flex-shrink-0">
          <div
            className="relative flex items-center transition-all duration-300"
            style={{
              width: editingFolderNameId ? '240px' : 'auto',
              minWidth: editingFolderNameId ? '240px' : 'auto',
            }}
          >
            <h6
              className={`transition-opacity duration-300 truncate max-w-[300px] ${
                editingFolderNameId ? 'opacity-0' : 'opacity-100'
              }`}
              title={currentFolder ? currentFolder.name : 'All Files'}
            >
              {currentFolder ? currentFolder.name : 'All Files'}
            </h6>
            <input
              type="text"
              value={editingFolderNameValue || ''}
              onChange={(e) => onEditingFolderNameChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && currentFolder) {
                  onRenameFolder(currentFolder.id);
                } else if (e.key === 'Escape') {
                  onCancelEdit();
                }
              }}
              onBlur={() => {
                if (editingFolderNameValue && currentFolder) {
                  onRenameFolder(currentFolder.id);
                } else {
                  onCancelEdit();
                }
              }}
              className={`absolute left-0 w-full h-8 px-2 border border-[#D6D3D1] rounded-[5px] bg-white text-sm focus:outline-none focus:border-[#A85C36] transition-all duration-300 ${
                editingFolderNameId
                  ? 'opacity-100 pointer-events-auto'
                  : 'opacity-0 pointer-events-none'
              }`}
              autoFocus
            />
          </div>
          
          {/* Folder Controls - Only show for non-All Files folders */}
          {currentFolder && currentFolder.id !== 'all' && (
            <div className="flex items-center gap-2">
              {/* Edit Folder Button */}
              <button
                onClick={() => {
                  if (currentFolder && currentFolder.id !== 'all') {
                    onEditFolder(currentFolder.id, currentFolder.name);
                  }
                }}
                className="p-1 hover:bg-[#EBE3DD] rounded-[5px]"
                title="Rename Folder"
              >
                <span className="inline-block align-middle text-[#AB9C95] -scale-x-100">
                  ✏️
                </span>
              </button>
              
              {/* Clone Folder Button */}
              <button
                onClick={() => {
                  if (currentFolder && currentFolder.id !== 'all') {
                    onCloneFolder(currentFolder.id);
                  }
                }}
                className="p-1 hover:bg-[#EBE3DD] rounded-[5px]"
                title="Clone Folder"
                aria-label="Clone Folder"
              >
                <Copy className="w-4 h-4 text-[#364257]" />
              </button>
              
              {/* Delete Folder Button */}
              <button
                onClick={() => {
                  if (currentFolder && currentFolder.id !== 'all') {
                    onDeleteFolder(currentFolder.id);
                  }
                }}
                className="p-1 hover:bg-[#FDEAEA] rounded-[5px]"
                title="Delete Folder"
                aria-label="Delete Folder"
              >
                <Trash2 className="w-4 h-4 text-[#D63030]" />
              </button>
              
              {/* Divider */}
              <div className="w-px h-4 bg-[#E0DBD7]"></div>
            </div>
          )}
        </div>

        {/* Search - Left aligned next to folder controls */}
        <div className={`flex items-center transition-all duration-300 gap-3 ${searchOpen ? 'flex-grow min-w-0' : 'w-[32px] min-w-[32px]'}`} style={{ height: '32px' }}>
          <SearchBar
            value={searchQuery}
            onChange={onSearchQueryChange}
            placeholder="Search files..."
            isOpen={searchOpen}
            setIsOpen={setSearchOpen}
          />
        </div>

        {/* Right Side - New Button */}
        <div className="flex items-center gap-3 flex-shrink-0 ml-auto">
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
      </div>
    </div>
  );
};

export default FilesTopBar; 