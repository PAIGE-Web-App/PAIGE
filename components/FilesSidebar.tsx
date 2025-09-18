import React, { useState, useEffect } from 'react';
import BadgeCount from './BadgeCount';
import { FileFolder } from '@/types/files';
import { Folder, FolderOpen, Plus, X, ChevronDown, ChevronRight } from 'lucide-react';
import { useStorageUsage } from '@/hooks/useStorageUsage';
import { useDragDrop } from './DragDropContext';
import SectionHeader from './SectionHeader';

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
  onMoveFile?: (fileId: string, newFolderId: string) => Promise<void>;
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
  onMoveFile,
}) => {
  const [showAddFolderModal, setShowAddFolderModal] = useState(false);
  const [folderName, setFolderName] = useState('');
  const [folderDescription, setFolderDescription] = useState('');
  const [selectedColor, setSelectedColor] = useState('#A85C36');
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const STARTER_TIER_MAX_FOLDERS = 10; // Increased from 5 to 10
  const userFolders = folders.filter(f => f.id !== 'all');
  const folderLimitReached = userFolders.length >= STARTER_TIER_MAX_FOLDERS;
  
  // Debug folder counting (commented out for production)
  // console.log('=== FOLDER LIMIT DEBUG ===');
  // console.log('Total folders:', folders.length);
  // console.log('User folders:', userFolders.length);
  // console.log('All Files folder exists:', !!folders.find(f => f.id === 'all'));
  // console.log('Folder limit reached:', folderLimitReached);
  // console.log('Max folders allowed:', STARTER_TIER_MAX_FOLDERS);
  // console.log('All folder IDs:', folders.map(f => f.id));
  // console.log('========================');
  
  // Get storage usage for display
  const storageStats = useStorageUsage();
  
  // Drag and drop functionality
  const { draggedItem, isDragging, dropTarget, setDropTarget } = useDragDrop();

  // State for floating indicator
  const [hoveredFolderForMove, setHoveredFolderForMove] = useState<FileFolder | null>(null);

  const handleAddFolderWithDescription = async ({ name, description, color }: { name: string; description?: string; color: string }) => {
    if (folderLimitReached) {
      return;
    }
    
    try {
      await handleAddFolder(name, description, color);
      setShowAddFolderModal(false);
      setFolderName('');
      setFolderDescription('');
      setSelectedColor('#A85C36');
    } catch (error) {
      console.error('Error in handleAddFolderWithDescription:', error);
    }
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

  // Recursive function to render nested subfolders
  const renderSubfolders = (parentId: string, level: number = 1) => {
    const childSubfolders = folders.filter(f => f.parentId === parentId);
    
    return childSubfolders.map((subfolder) => {
      const hasChildren = hasSubfolders(subfolder.id);
      const isExpanded = isFolderExpanded(subfolder.id);
      const marginLeft = level * 24; // 24px per level (6 * 4)
      
      return (
        <div key={subfolder.id}>
          <div className="flex items-center">
            {/* Expand/Collapse button - only show if subfolder has children */}
            {hasChildren && (
              <div className="w-6 h-6 flex items-center justify-center mr-1" style={{ marginLeft: `${marginLeft}px` }}>
                <button
                  onClick={(e) => { e.stopPropagation(); toggleFolderExpansion(subfolder.id); }}
                  className="p-1 hover:bg-[#F8F6F4] rounded-[3px]"
                  title={isExpanded ? "Collapse" : "Expand"}
                >
                  {isExpanded ? (<ChevronDown className="w-4 h-4 text-[#AB9C95]" />) : (<ChevronRight className="w-4 h-4 text-[#AB9C95]" />)}
                </button>
              </div>
            )}
            <div
              onClick={() => { setSelectedFolder(subfolder); setFileSearchQuery(''); }}
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
                // Don't allow dropping into the currently selected folder
                if (isDragging && draggedItem?.type === 'file' && selectedFolder?.id !== subfolder.id) {
                  setDropTarget(subfolder.id);
                  setHoveredFolderForMove(subfolder);
                }
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                e.stopPropagation();
                // Only clear if we're not dragging over a child element
                if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                  setDropTarget(null);
                  setHoveredFolderForMove(null);
                }
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setDropTarget(null);
                setHoveredFolderForMove(null);
                // Don't allow dropping into the currently selected folder
                if (draggedItem?.type === 'file' && onMoveFile && selectedFolder?.id !== subfolder.id) {
                  onMoveFile(draggedItem.item.id, subfolder.id);
                }
              }}
              className={`flex items-center px-3 py-2 rounded-[5px] text-[#332B42] text-sm font-medium cursor-pointer flex-1 transition-all duration-200 ${selectedFolder?.id === subfolder.id ? 'bg-[#EBE3DD] border border-[#A85C36]' : 'hover:bg-[#F8F6F4] border border-transparent hover:border-[#AB9C95]'} ${
                dropTarget === subfolder.id && isDragging ? 'bg-[#F0EDE8] border-2 border-[#A85C36] shadow-md' : ''
              }`}
            >
              <span className="mr-2" title={subfolder.name}>
                {hasChildren ? (
                  <FolderOpen className="w-4 h-4" style={{ color: subfolder.color || '#8B7355', strokeWidth: 1, fill: subfolder.color || '#8B7355' }} />
                ) : (
                  <Folder className="w-4 h-4" style={{ color: subfolder.color || '#8B7355', strokeWidth: 1, fill: subfolder.color || '#8B7355' }} />
                )}
              </span>
              <span className="truncate flex-1 min-w-0" title={subfolder.name}>
                {subfolder.name}
              </span>
              <span className="ml-auto">
                <BadgeCount count={folderFileCounts.get(subfolder.id) ?? 0} />
              </span>
            </div>
          </div>
          
          {/* Recursively render children if expanded */}
          {isExpanded && hasChildren && (
            <div>
              {renderSubfolders(subfolder.id, level + 1)}
            </div>
          )}
        </div>
      );
    });
  };

  // Auto-expand all parent folders when a subfolder is selected
  useEffect(() => {
    if (selectedFolder && selectedFolder.parentId) {
      const expandAllParents = (folderId: string) => {
        const parent = folders.find(f => f.id === folderId);
        if (parent && parent.parentId) {
          setExpandedFolders(prev => {
            const newSet = new Set(prev);
            newSet.add(parent.id);
            return newSet;
          });
          expandAllParents(parent.parentId);
        }
      };
      
      setExpandedFolders(prev => {
        const newSet = new Set(prev);
        newSet.add(selectedFolder.parentId!);
        return newSet;
      });
      
      expandAllParents(selectedFolder.parentId!);
    }
  }, [selectedFolder, folders]);

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
              className={`flex items-center px-3 py-2 rounded-[5px] text-[#332B42] text-sm font-medium cursor-pointer transition-all duration-200 ${selectedFolder?.id === 'all' ? 'bg-[#EBE3DD] border border-[#A85C36]' : 'hover:bg-[#F8F6F4] border border-transparent hover:border-[#AB9C95]'} mt-4 mb-2`}
            >
              <span className="mr-2" title="All Files">
                <Folder className="w-4 h-4" style={{ color: '#8B4513', strokeWidth: 1, fill: '#8B4513' }} />
              </span>
              <span className="truncate flex-1 min-w-0" title="All Files">
                All Files
              </span>
              <span className="ml-auto">
                <BadgeCount count={allFileCount} />
              </span>
            </div>

            {/* Folders Section */}
            <SectionHeader title="Folders" />
            {(() => {
              const topLevelFolders = folders.filter(f => f.id !== 'all' && !f.parentId);
              const subfolders = folders.filter(f => f.id !== 'all' && f.parentId);
              
              // Debug rendering (commented out for production)
              // console.log('=== SIDEBAR RENDERING DEBUG ===');
              // console.log('Total folders:', folders.length);
              // console.log('Top level folders:', topLevelFolders.length);
              // console.log('Subfolders:', subfolders.length);
              // console.log('Top level folder IDs:', topLevelFolders.map(f => f.id));
              // console.log('Subfolder IDs:', subfolders.map(f => f.id));
              // console.log('=== FOLDER DETAILS ===');
              // const allFolderIds = new Set(folders.map(f => f.id));
              // folders.filter(f => f.id !== 'all').forEach(folder => {
              //   const isOrphaned = folder.parentId && !allFolderIds.has(folder.parentId);
              //   console.log(`Folder: ${folder.name} (${folder.id}) - parentId: ${folder.parentId || 'null'} ${isOrphaned ? '[ORPHANED]' : ''}`);
              // });
              // console.log('==============================');
              
              return (
                <>
                  {/* Top-level folders */}
                  {topLevelFolders.length === 0 ? (
                    <div className="text-center py-8 px-4">
                      <img src="/Files.png" alt="No Folders" className="w-12 h-12 mx-auto mb-3 opacity-70" />
                      <p className="text-sm text-[#AB9C95] font-medium">No folders yet!</p>
                      <p className="text-xs text-[#AB9C95] mt-1">Add a new one above</p>
                    </div>
                  ) : (
                    topLevelFolders.map((folder) => {
                    const hasChildren = hasSubfolders(folder.id);
                    const isExpanded = isFolderExpanded(folder.id);
                    
                    return (
                      <div key={folder.id}>
                        <div className="flex items-center">
                          {/* Expand/Collapse button - only show if folder has children */}
                          {hasChildren && (
                            <div className="w-5 h-6 flex items-center justify-center mr-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleFolderExpansion(folder.id);
                                }}
                                className="p-1 hover:bg-[#F8F6F4] rounded-[3px] transition-colors"
                                title={isExpanded ? "Collapse" : "Expand"}
                              >
                                {isExpanded ? (
                                  <ChevronDown className="w-4 h-4 text-[#AB9C95]" />
                                ) : (
                                  <ChevronRight className="w-4 h-4 text-[#AB9C95]" />
                                )}
                              </button>
                            </div>
                          )}
                          
                          {/* Spacer for folders without children to maintain alignment */}
                          {!hasChildren && (
                            <div className="w-5 h-6 mr-1"></div>
                          )}
                          
                          {/* Folder item */}
                          <div
                            onClick={() => {
                              setSelectedFolder(folder);
                              setFileSearchQuery('');
                            }}
                            onDragOver={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              // Don't allow dropping into the currently selected folder
                              if (isDragging && draggedItem?.type === 'file' && selectedFolder?.id !== folder.id) {
                                setDropTarget(folder.id);
                                setHoveredFolderForMove(folder);
                              }
                            }}
                            onDragLeave={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              // Only clear if we're not dragging over a child element
                              if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                                setDropTarget(null);
                                setHoveredFolderForMove(null);
                              }
                            }}
                            onDrop={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setDropTarget(null);
                              setHoveredFolderForMove(null);
                              // Don't allow dropping into the currently selected folder
                              if (draggedItem?.type === 'file' && onMoveFile && selectedFolder?.id !== folder.id) {
                                onMoveFile(draggedItem.item.id, folder.id);
                              }
                            }}
                            className={`flex items-center px-3 py-2 rounded-[5px] text-[#332B42] text-sm font-medium cursor-pointer flex-1 transition-all duration-200 ${selectedFolder?.id === folder.id ? 'bg-[#EBE3DD] border border-[#A85C36]' : 'hover:bg-[#F8F6F4] border border-transparent hover:border-[#AB9C95]'} ${
                              dropTarget === folder.id && isDragging ? 'bg-[#F0EDE8] border-2 border-[#A85C36] shadow-md' : ''
                            }`}
                          >
                            <span className="mr-2" title={folder.name}>
                              {hasChildren ? (
                                <FolderOpen className="w-4 h-4" style={{ color: folder.color || '#8B7355', strokeWidth: 1, fill: folder.color || '#8B7355' }} />
                              ) : (
                                <Folder className="w-4 h-4" style={{ color: folder.color || '#8B7355', strokeWidth: 1, fill: folder.color || '#8B7355' }} />
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
                        {isExpanded && renderSubfolders(folder.id)}
                      </div>
                    );
                    })
                  )}
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
      
      {/* Floating indicator for file move operations */}
      {draggedItem?.type === 'file' && onMoveFile && hoveredFolderForMove && selectedFolder?.id !== hoveredFolderForMove.id && (
        <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center p-4">
          <div className="bg-[#332B42] text-white px-4 py-3 md:px-6 md:py-4 rounded-full shadow-2xl animate-pulse max-w-[90vw]">
            <div className="flex items-center gap-2 md:gap-3">
              <svg className="w-5 h-5 md:w-6 md:h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M7 17l5-5 5 5"></path>
                <path d="M7 7l5 5 5-5"></path>
              </svg>
              <span className="font-playfair font-medium text-base md:text-lg leading-5 md:leading-6 text-white">
                Move file to "{hoveredFolderForMove.name}"
              </span>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};

export default FilesSidebar; 