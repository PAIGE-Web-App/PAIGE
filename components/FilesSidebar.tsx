import React, { useState, useEffect } from 'react';
import BadgeCount from './BadgeCount';
import { FileFolder } from '@/types/files';
import { Folder, FolderOpen, Plus, X, ChevronDown, ChevronRight } from 'lucide-react';
import { useStorageUsage } from '@/hooks/useStorageUsage';

interface FilesSidebarProps {
  folders: FileFolder[];
  selectedFolder: FileFolder | null;
  setSelectedFolder: (folder: FileFolder | null) => void;
  userId: string;
  showNewFolderInput: boolean;
  setShowNewFolderInput: (val: boolean) => void;
  newFolderName: string;
  setNewFolderName: (val: string) => void;
  handleAddFolder: (name: string, description?: string, color?: string) => Promise<void>;
  folderFileCounts: Map<string, number>;
  setFileSearchQuery: (val: string) => void;
  selectAllFiles: () => void;
  allFileCount: number;
  showUpgradeModal?: () => void;
}

const FilesSidebar: React.FC<FilesSidebarProps> = ({
  folders,
  selectedFolder,
  setSelectedFolder,
  userId,
  showNewFolderInput,
  setShowNewFolderInput,
  newFolderName,
  setNewFolderName,
  handleAddFolder,
  folderFileCounts,
  setFileSearchQuery,
  selectAllFiles,
  allFileCount,
  showUpgradeModal,
}) => {
  const [showAddFolderModal, setShowAddFolderModal] = useState(false);
  const [folderName, setFolderName] = useState('');
  const [folderDescription, setFolderDescription] = useState('');
  const [selectedColor, setSelectedColor] = useState('#A85C36');
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const STARTER_TIER_MAX_FOLDERS = 5;
  const folderLimitReached = folders.length >= STARTER_TIER_MAX_FOLDERS;
  
  // Get storage usage for display
  const storageStats = useStorageUsage();

  const handleAddFolderWithDescription = async ({ name, description, color }: { name: string; description?: string; color: string }) => {
    if (folderLimitReached) return;
    await handleAddFolder(name, description, color);
    setShowAddFolderModal(false);
    setFolderName('');
    setFolderDescription('');
    setSelectedColor('#A85C36');
  };

  const handleNewFolderClick = () => {
    if (folderLimitReached && showUpgradeModal) {
      showUpgradeModal();
    } else {
      setShowAddFolderModal(true);
    }
  };

  const handleModalClose = () => {
    setShowAddFolderModal(false);
    setFolderName('');
    setFolderDescription('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (folderName.trim()) {
      handleAddFolderWithDescription({ 
        name: folderName.trim(), 
        description: folderDescription.trim(),
        color: selectedColor
      });
    }
  };

  // Helper functions for expand/collapse
  const toggleFolderExpansion = (folderId: string) => {
    setExpandedFolders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(folderId)) {
        newSet.delete(folderId);
      } else {
        newSet.add(folderId);
      }
      return newSet;
    });
  };

  const isFolderExpanded = (folderId: string) => expandedFolders.has(folderId);

  const hasSubfolders = (folderId: string) => {
    return folders.some(f => f.parentId === folderId);
  };

  // Auto-expand parent folder when a subfolder is selected
  useEffect(() => {
    if (selectedFolder && selectedFolder.parentId) {
      setExpandedFolders(prev => {
        const newSet = new Set(prev);
        newSet.add(selectedFolder.parentId!);
        return newSet;
      });
    }
  }, [selectedFolder]);

  return (
    <aside className="unified-sidebar flex flex-col">
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between p-6 pb-2 border-b border-[#E0DBD7]">
          <h4 className="text-lg font-playfair font-medium text-[#332B42] flex items-center">File Folders</h4>
          <button
            onClick={handleNewFolderClick}
            className="text-xs text-[#332B42] border border-[#AB9C95] rounded-[5px] px-2 py-1 hover:bg-[#F3F2F0] ml-2 flex items-center h-7"
            title="Create a new folder"
            style={{ alignSelf: 'center' }}
          >
            <Plus className="w-3 h-3 mr-1" />
            New Folder
          </button>
        </div>
        <div className="p-6 pt-0 flex-1 overflow-y-auto">
          <div className="space-y-1">
            {/* All Files folder */}
            <div
              onClick={() => {
                const allFilesFolder = folders.find(f => f.id === 'all');
                if (allFilesFolder) {
                  setSelectedFolder(allFilesFolder);
                  setFileSearchQuery('');
                }
              }}
              className={`flex items-center px-3 py-2 rounded-[5px] text-[#332B42] text-sm font-medium cursor-pointer ${selectedFolder?.id === 'all' ? 'bg-[#EBE3DD] border border-[#A85C36]' : 'hover:bg-[#F8F6F4] border border-transparent hover:border-[#AB9C95]'} mt-4 mb-2`}
            >
                              <span className="mr-2" title="All Files">
                  {selectedFolder?.id === 'all' ? (
                    <FolderOpen className="w-4 h-4" style={{ color: '#A85C36', strokeWidth: 1 }} />
                  ) : (
                    <Folder className="w-4 h-4" style={{ color: '#A85C36', strokeWidth: 1, fill: '#A85C36' }} />
                  )}
                </span>
              <span className="truncate flex-1 min-w-0" title="All Files">
                All Files
              </span>
              <span className="ml-auto">
                <BadgeCount count={allFileCount} />
              </span>
            </div>

            {/* Show folders with hierarchy - always show this section since "All Files" is always present */}
            {(() => {
              const topLevelFolders = folders.filter(f => f.id !== 'all' && !f.parentId);
              const subfolders = folders.filter(f => f.id !== 'all' && f.parentId);
              
              return (
                <>
                  {/* Top-level folders */}
                  {topLevelFolders.map((folder) => {
                    const hasChildren = hasSubfolders(folder.id);
                    const isExpanded = isFolderExpanded(folder.id);
                    
                    return (
                      <div key={folder.id}>
                                                  <div className="flex items-center">
                            {/* Expand/Collapse button - only show if folder has children */}
                            {hasChildren && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleFolderExpansion(folder.id);
                                }}
                                className="p-1 hover:bg-[#F8F6F4] rounded-[3px] mr-0.5"
                                title={isExpanded ? "Collapse" : "Expand"}
                              >
                                {isExpanded ? (
                                  <ChevronDown className="w-4 h-4 text-[#AB9C95]" />
                                ) : (
                                  <ChevronRight className="w-4 h-4 text-[#AB9C95]" />
                                )}
                              </button>
                            )}
                            
                            {/* Folder item */}
                            <div
                              onClick={() => {
                                setSelectedFolder(folder);
                                setFileSearchQuery('');
                              }}
                              className={`flex items-center px-3 py-2 rounded-[5px] text-[#332B42] text-sm font-medium cursor-pointer flex-1 ${selectedFolder?.id === folder.id ? 'bg-[#EBE3DD] border border-[#A85C36]' : 'hover:bg-[#F8F6F4] border border-transparent hover:border-[#AB9C95]'}`}
                            >
                              <span className="mr-2" title={folder.name}>
                                {selectedFolder?.id === folder.id ? (
                                  <FolderOpen className="w-4 h-4" style={{ color: folder.color || '#AB9C95', strokeWidth: 1 }} />
                                ) : (
                                  <Folder className="w-4 h-4" style={{ color: folder.color || '#AB9C95', strokeWidth: 1, fill: folder.color || '#AB9C95' }} />
                                )}
                              </span>
                              <span className="truncate flex-1 min-w-0" title={folder.name}>
                                {folder.name}
                              </span>
                              <span className="ml-auto">
                                <BadgeCount count={folderFileCounts.get(folder.id) ?? 0} />
                              </span>
                            </div>
                          </div>
                        
                        {/* Subfolders of this folder - only show if expanded */}
                        {isExpanded && subfolders
                          .filter(subfolder => subfolder.parentId === folder.id)
                          .map((subfolder) => (
                            <div
                              key={subfolder.id}
                              onClick={() => {
                                setSelectedFolder(subfolder);
                                setFileSearchQuery('');
                              }}
                              className={`flex items-center px-3 py-2 ml-6 rounded-[5px] text-[#332B42] text-sm font-medium cursor-pointer ${selectedFolder?.id === subfolder.id ? 'bg-[#EBE3DD] border border-[#A85C36]' : 'hover:bg-[#F8F6F4] border border-transparent hover:border-[#AB9C95]'}`}
                            >
                              <span className="mr-2" title={subfolder.name}>
                                {selectedFolder?.id === subfolder.id ? (
                                  <FolderOpen className="w-4 h-4" style={{ color: subfolder.color || '#AB9C95', strokeWidth: 1 }} />
                                ) : (
                                  <Folder className="w-4 h-4" style={{ color: subfolder.color || '#AB9C95', strokeWidth: 1, fill: subfolder.color || '#AB9C95' }} />
                                )}
                              </span>
                              <span className="truncate flex-1 min-w-0" title={subfolder.name}>
                                {subfolder.name}
                              </span>
                              <span className="ml-auto">
                                <BadgeCount count={folderFileCounts.get(subfolder.id) ?? 0} />
                              </span>
                            </div>
                          ))}
                      </div>
                    );
                  })}
                </>
              );
            })()}
          </div>
        </div>
        
        {/* Storage Usage Display - Fixed Footer */}
        <div className="p-4 border-t border-[#E0DBD7] bg-[#F8F6F4] flex-shrink-0">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs text-[#AB9C95]">Storage Usage</div>
            <span className="text-xs text-[#AB9C95]">
              {storageStats.storageAmount}
            </span>
          </div>
          <div className="w-full bg-[#E0DBD7] rounded-full h-1 mb-1">
            <div
              className={`h-1 rounded-full transition-all ${
                storageStats.isOverLimit ? 'bg-red-500' : storageStats.isNearLimit ? 'bg-yellow-500' : 'bg-[#A85C36]'
              }`}
              style={{ width: `${Math.min(storageStats.progressPercentage, 100)}%` }}
            />
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-[#AB9C95]">
              {Math.round(storageStats.progressPercentage)}% used
            </span>
            <button 
              onClick={() => showUpgradeModal?.()}
              className="text-xs text-[#A85C36] hover:underline font-medium"
            >
              Upgrade
            </button>
          </div>
        </div>
      </div>

      {/* New Folder Modal */}
      {showAddFolderModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-[5px] shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-playfair text-xl font-semibold text-[#332B42]">Create New Folder</h3>
              <button
                onClick={handleModalClose}
                className="text-[#7A7A7A] hover:text-[#332B42] p-1 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#332B42] mb-2">
                  Folder Name *
                </label>
                <input
                  type="text"
                  value={folderName}
                  onChange={(e) => setFolderName(e.target.value)}
                  className="w-full px-3 py-2 border border-[#E0DBD7] rounded-[5px] text-[#332B42] focus:outline-none focus:border-[#A85C36]"
                  placeholder="e.g., Vendor Contracts, Invoices, Photos"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-[#332B42] mb-2">
                  Description (optional)
                </label>
                <textarea
                  value={folderDescription}
                  onChange={(e) => setFolderDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-[#E0DBD7] rounded-[5px] text-[#332B42] focus:outline-none focus:border-[#A85C36] resize-none"
                  placeholder="Brief description of what this folder contains..."
                  rows={3}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-[#332B42] mb-2">
                  Folder Color
                </label>
                <div className="flex gap-2">
                  {['#A85C36', '#E53E3E', '#3182CE', '#38A169', '#D69E2E', '#805AD5', '#DD6B20', '#319795'].map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setSelectedColor(color)}
                      className={`w-8 h-8 rounded-full border-2 transition-all ${
                        selectedColor === color 
                          ? 'border-[#332B42] scale-110' 
                          : 'border-[#E0DBD7] hover:border-[#AB9C95]'
                      }`}
                      style={{ backgroundColor: color }}
                      title={`Color: ${color}`}
                    />
                  ))}
                </div>
              </div>
              
              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={handleModalClose}
                  className="btn-primaryinverse px-4 py-2 text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary px-4 py-2 text-sm"
                  disabled={!folderName.trim()}
                >
                  Create Folder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </aside>
  );
};

export default FilesSidebar; 