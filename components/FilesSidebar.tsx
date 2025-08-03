import React, { useState } from 'react';
import BadgeCount from './BadgeCount';
import { FileCategory } from '@/types/files';
import { Folder, Plus, FolderOpen, X } from 'lucide-react';

interface FilesSidebarProps {
  folders: FileCategory[];
  selectedFolder: FileCategory | null;
  setSelectedFolder: (folder: FileCategory | null) => void;
  userId: string;
  showNewFolderInput: boolean;
  setShowNewFolderInput: (val: boolean) => void;
  newFolderName: string;
  setNewFolderName: (val: string) => void;
  handleAddFolder: (name: string, description?: string) => Promise<void>;
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
  const STARTER_TIER_MAX_FOLDERS = 5;
  const folderLimitReached = folders.length >= STARTER_TIER_MAX_FOLDERS;

  const handleAddFolderWithDescription = async ({ name, description }: { name: string; description?: string }) => {
    if (folderLimitReached) return;
    await handleAddFolder(name, description);
    setShowAddFolderModal(false);
    setFolderName('');
    setFolderDescription('');
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
      handleAddFolderWithDescription({ name: folderName.trim(), description: folderDescription.trim() });
    }
  };

  return (
    <aside className="unified-sidebar">
      <div className="flex-1 flex flex-col">
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
        <div className="p-6 pt-0">
          <div className="space-y-1">
            <div
              className={`flex items-center px-3 py-2 rounded-[5px] text-[#332B42] text-sm font-medium cursor-pointer ${!selectedFolder ? 'bg-[#EBE3DD] border border-[#A85C36]' : 'hover:bg-[#F8F6F4] border border-transparent hover:border-[#AB9C95]'} mt-4 mb-2`}
              onClick={() => { selectAllFiles(); setFileSearchQuery(''); }}
            >
              <span className="mr-2" title="All Files">
                <Folder className="w-4 h-4 text-[#A85C36]" />
              </span>
              <span>All Files</span>
              <span className="ml-auto">
                <BadgeCount count={allFileCount} />
              </span>
            </div>
            
            <div className="my-12 flex items-center gap-2">
              <span className="text-xs text-[#AB9C95] uppercase tracking-wider font-semibold">Your Folders</span>
              <div className="flex-1 h-px bg-[#E0DBD7]"></div>
            </div>
            
            {folders.map((folder) => (
              <div
                key={folder.id}
                onClick={() => {
                  setSelectedFolder(folder);
                  setFileSearchQuery('');
                }}
                className={`px-3 py-2 rounded-[5px] text-[#332B42] text-sm font-medium cursor-pointer ${selectedFolder?.id === folder.id ? 'bg-[#EBE3DD] border border-[#A85C36]' : 'hover:bg-[#F8F6F4] border border-transparent hover:border-[#AB9C95]'}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    {selectedFolder?.id === folder.id ? (
                      <FolderOpen className="w-4 h-4 mr-2 text-[#A85C36]" />
                    ) : (
                      <Folder className="w-4 h-4 mr-2 text-[#AB9C95]" />
                    )}
                    <span>{folder.name}</span>
                  </div>
                  <BadgeCount count={folderFileCounts.get(folder.id) ?? 0} />
                </div>
              </div>
            ))}
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