import React, { useState, useRef, useEffect } from 'react';
import { FileFolder } from '@/types/files';
import { Search, Plus, Upload, Copy, Trash2, List, Grid3X3 } from 'lucide-react';
import SearchBar from './SearchBar';

interface FilesTopBarProps {
  currentFolder: FileFolder | null;
  viewMode: 'list' | 'grid';
  editingFolderNameId: string | null;
  editingFolderNameValue: string | null;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  onViewModeChange: (mode: 'list' | 'grid') => void;
  onSearchToggle: () => void;
  onEditFolder: (folderId: string, name: string) => void;
  onCloneFolder: (folderId: string) => void;
  onDeleteFolder: (folderId: string) => void;
  onRenameFolder: (folderId: string) => void;
  onEditingFolderNameChange: (value: string) => void;
  onCancelEdit: () => void;
}

const FilesTopBar: React.FC<FilesTopBarProps> = ({
  currentFolder,
  viewMode,
  editingFolderNameId,
  editingFolderNameValue,
  searchQuery,
  onSearchQueryChange,
  onViewModeChange,
  onSearchToggle,
  onEditFolder,
  onCloneFolder,
  onDeleteFolder,
  onRenameFolder,
  onEditingFolderNameChange,
  onCancelEdit,
}) => {
  const [searchOpen, setSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (searchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [searchOpen]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
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

        {/* Right Side - View Toggle */}
        <div className="flex items-center gap-3 flex-shrink-0 ml-auto">
          {/* View Toggle */}
          <div className="flex rounded-full border border-gray-400 overflow-hidden" style={{ height: 32 }}>
            <button
              className={`flex items-center justify-center px-2 transition-colors duration-150 ${viewMode === 'list' ? 'bg-[#EBE3DD]' : 'bg-white'} border-r border-gray-300`}
              style={{ outline: 'none' }}
              onClick={() => onViewModeChange('list')}
              type="button"
              title="List view"
            >
              <List className="w-4 h-4" stroke={viewMode === 'list' ? '#A85C36' : '#364257'} />
            </button>
            <button
              className={`flex items-center justify-center px-2 transition-colors duration-150 ${viewMode === 'grid' ? 'bg-[#EBE3DD]' : 'bg-white'}`}
              style={{ outline: 'none' }}
              onClick={() => onViewModeChange('grid')}
              type="button"
              title="Grid view"
            >
              <Grid3X3 className="w-4 h-4" stroke={viewMode === 'grid' ? '#A85C36' : '#364257'} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FilesTopBar; 