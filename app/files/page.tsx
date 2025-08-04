"use client";

import React, { useState, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useUserProfileData } from '@/hooks/useUserProfileData';
import { useFileFolders } from '@/hooks/useFileFolders';
import { Search, Plus, Upload, FileText, X, ChevronDown, Edit, Trash2, List, Grid3X3, Folder, FolderOpen } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import dynamic from 'next/dynamic';

// Components
import Banner from '@/components/Banner';
import BottomNavBar from '@/components/BottomNavBar';
import WeddingBanner from '@/components/WeddingBanner';
import FilesSidebar from '@/components/FilesSidebar';
import AIFileAnalyzer from '@/components/AIFileAnalyzer';
import SearchBar from '@/components/SearchBar';

// Lazy load heavy components
const FileItemComponent = dynamic(() => import('@/components/FileItemComponent'), {
  loading: () => <div className="bg-white border border-[#E0DBD7] rounded-[5px] p-4 animate-pulse h-32" />
});

// Types
import { FileItem, FileFolder } from '@/types/files';

export default function FilesPage() {
  const { user, loading } = useAuth();
  const { daysLeft, userName, profileLoading } = useUserProfileData();
  const {
    folders,
    selectedFolder,
    setSelectedFolder,
    loading: foldersLoading,
    error: foldersError,
    addFolder,
    updateFolder,
    deleteFolder,
    updateFolderFileCount,
  } = useFileFolders();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [showNewFolderInput, setShowNewFolderInput] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [searchOpen, setSearchOpen] = useState(false);

  const files: FileItem[] = useMemo(() => [
    {
      id: '1',
      name: 'Photographer contract',
      description: 'Description here. Lorem ipsum dolor. Description here. Lorem ipsum dolor...',
      category: 'contracts',
      categoryId: 'contracts',
      folderId: 'folder1',
      uploadedAt: new Date('2024-01-15'),
      fileType: 'pdf',
      fileSize: 2048576,
      fileUrl: '/files/contract.pdf',
      userId: user?.uid || '',
      aiSummary: 'Contract for wedding photography services covering ceremony and reception...',
      keyPoints: ['Payment schedule: 50% deposit, 50% 2 weeks before', 'Coverage: 8 hours on wedding day', 'Delivery: 4-6 weeks after wedding'],
      vendorAccountability: ['Must deliver photos within 6 weeks', 'Must provide backup photographer if unavailable', 'Must attend rehearsal dinner for planning'],
      createdAt: new Date('2024-01-15'),
      updatedAt: new Date('2024-01-15'),
    }
  ], [user?.uid]);

  // Filter files based on selected folder and search
  const filteredFiles = useMemo(() => {
    return files.filter(file => {
      const matchesSearch = file.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           file.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || file.category === selectedCategory;
      const matchesFolder = !selectedFolder || file.categoryId === selectedFolder.id;
      return matchesSearch && matchesCategory && matchesFolder;
    });
  }, [files, searchQuery, selectedCategory, selectedFolder]);

  // Calculate file counts for folders
  const folderFileCounts = useMemo(() => {
    const counts = new Map<string, number>();
    folders.forEach(folder => {
      const count = files.filter(file => file.categoryId === folder.id).length;
      counts.set(folder.id, count);
    });
    return counts;
  }, [files, folders]);

  // Dynamic categories based on actual folders
  const categories = useMemo(() => {
    if (foldersLoading) {
      return [
        { id: 'all', name: 'All Files', count: 0 },
        { id: 'loading1', name: 'Loading...', count: 0 },
        { id: 'loading2', name: 'Loading...', count: 0 },
      ];
    }
    
    const allFilesCount = files.length;
    const folderCategories = folders
      .filter(folder => folder.id !== 'all') // Prevent conflict with "All Files"
      .map(folder => ({
        id: folder.id,
        name: folder.name,
        count: folderFileCounts.get(folder.id) || 0
      }));
    
    return [
      { id: 'all', name: 'All Files', count: allFilesCount },
      ...folderCategories
    ];
  }, [folders, foldersLoading, files.length, folderFileCounts]);

  // Handle folder operations
  const handleAddFolder = async (name: string, description?: string) => {
    try {
      await addFolder(name, description);
      setShowNewFolderInput(false);
      setNewFolderName('');
    } catch (error) {
      console.error('Error adding folder:', error);
    }
  };

  const selectAllFiles = () => {
    setSelectedFolder(null);
  };

  if (loading || profileLoading) {
    return (
      <div className="min-h-screen bg-[#F3F2F0] flex items-center justify-center">
        <div className="text-[#332B42]">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#F3F2F0] flex items-center justify-center">
        <div className="text-[#332B42]">Please log in to access files.</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-linen">
      <WeddingBanner 
        daysLeft={daysLeft}
        userName={userName}
        isLoading={profileLoading}
        onSetWeddingDate={() => {}}
      />

      <div className="app-content-container flex-1 overflow-hidden flex flex-col">
        <div className="flex flex-1 gap-4 md:flex-row flex-col overflow-hidden">
          {/* Main Content Area */}
          <main className="unified-container">
            {/* Files Sidebar */}
            <div className="w-80 bg-white border-r border-[#E0DBD7] flex flex-col">
              <FilesSidebar
                folders={folders}
                selectedFolder={selectedFolder}
                setSelectedFolder={setSelectedFolder}
                userId={user.uid}
                showNewFolderInput={showNewFolderInput}
                setShowNewFolderInput={setShowNewFolderInput}
                newFolderName={newFolderName}
                setNewFolderName={setNewFolderName}
                handleAddFolder={handleAddFolder}
                folderFileCounts={folderFileCounts}
                setFileSearchQuery={setSearchQuery}
                selectAllFiles={selectAllFiles}
                allFileCount={files.length}
              />
            </div>

            {/* Files Content Area */}
            <div className="flex-1 flex flex-col min-h-0">
              {/* Top Bar */}
              <div className="bg-white border-b border-[#E0DBD7] p-6 flex-shrink-0">
                <div className="flex items-center gap-4">
                  {/* Left Side - Folder Name and Controls */}
                  <div className="flex items-center gap-4 flex-shrink-0">
                    <h1 className="text-2xl font-playfair font-semibold text-[#332B42]">
                      {selectedFolder ? selectedFolder.name : 'All Files'}
                    </h1>
                    
                    {/* Folder Controls - Only show for non-All Files folders */}
                    {selectedFolder && selectedFolder.id !== 'all' && (
                      <div className="flex items-center gap-2">
                        {/* Edit Folder Button */}
                        <button
                          onClick={() => {
                            // TODO: Implement folder editing
                            console.log('Edit folder:', selectedFolder.id);
                          }}
                          className="p-2 text-[#AB9C95] hover:text-[#332B42] hover:bg-[#F8F6F4] rounded-[5px] transition-colors"
                          title="Edit folder"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        
                        {/* Delete Folder Button */}
                        <button
                          onClick={() => {
                            // TODO: Implement folder deletion
                            console.log('Delete folder:', selectedFolder.id);
                          }}
                          className="p-2 text-[#AB9C95] hover:text-[#E53E3E] hover:bg-[#F8F6F4] rounded-[5px] transition-colors"
                          title="Delete folder"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        
                        {/* Divider */}
                        <div className="w-px h-4 bg-[#E0DBD7]"></div>
                      </div>
                    )}
                  </div>
                  
                  {/* Middle - Search Bar (Flex Grow) */}
                  <div className="flex items-center transition-all duration-300 gap-3 flex-grow min-w-0" style={{ height: '32px' }}>
                    <SearchBar
                      value={searchQuery}
                      onChange={setSearchQuery}
                      placeholder="Search files..."
                      isOpen={searchOpen}
                      setIsOpen={setSearchOpen}
                    />
                  </div>
                  
                  {/* Right Side - View Toggle and Add Button */}
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {/* View Toggle */}
                    <div className="flex rounded-full border border-gray-400 overflow-hidden" style={{ height: 32 }}>
                      <button
                        className={`flex items-center justify-center px-2 transition-colors duration-150 ${viewMode === 'list' ? 'bg-[#EBE3DD]' : 'bg-white'} border-r border-gray-300`}
                        style={{ outline: 'none' }}
                        onClick={() => setViewMode('list')}
                        type="button"
                        title="List view"
                      >
                        <List className="w-4 h-4" stroke={viewMode === 'list' ? '#A85C36' : '#364257'} />
                      </button>
                      <button
                        className={`flex items-center justify-center px-2 transition-colors duration-150 ${viewMode === 'grid' ? 'bg-[#EBE3DD]' : 'bg-white'}`}
                        style={{ outline: 'none' }}
                        onClick={() => setViewMode('grid')}
                        type="button"
                        title="Grid view"
                      >
                        <Grid3X3 className="w-4 h-4" stroke={viewMode === 'grid' ? '#A85C36' : '#364257'} />
                      </button>
                    </div>
                    
                    {/* Add File Button */}
                    <button
                      onClick={() => setShowUploadModal(true)}
                      className="btn-primary ml-2 flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Add File
                    </button>
                  </div>
                </div>
              </div>

              {/* Category Filter */}
              <div className="bg-white border-b border-[#E0DBD7] px-6 py-4 flex-shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 overflow-x-auto">
                    {foldersLoading ? (
                      // Loading skeleton for categories
                      Array.from({ length: 5 }).map((_, index) => (
                        <div
                          key={index}
                          className="px-4 py-2 rounded-[5px] bg-[#F8F6F4] animate-pulse"
                          style={{ width: `${80 + Math.random() * 40}px` }}
                        />
                      ))
                    ) : (
                      categories.map((category, index) => (
                        <button
                          key={`${category.id}-${index}`}
                          onClick={() => setSelectedCategory(category.id)}
                          className={`px-4 py-2 rounded-[5px] text-sm font-medium whitespace-nowrap flex items-center gap-2 ${
                            selectedCategory === category.id
                              ? 'bg-[#A85C36] text-white'
                              : 'bg-[#F8F6F4] text-[#332B42] hover:bg-[#EBE3DD]'
                          }`}
                        >
                          {category.id === 'all' ? (
                            <Folder className="w-4 h-4" />
                          ) : (
                            <FolderOpen className="w-4 h-4" />
                          )}
                          {category.name} ({category.count})
                        </button>
                      ))
                    )}
                  </div>
                  
                  {/* Create Folder Button */}
                  <button
                    onClick={() => setShowNewFolderInput(true)}
                    className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-[#332B42] border border-[#E0DBD7] rounded-[5px] hover:bg-[#F8F6F4] hover:border-[#AB9C95] transition-colors flex-shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                    New Folder
                  </button>
                </div>
              </div>

              {/* Files List */}
              <div className="flex-1 p-6 overflow-y-auto min-h-0">
                {foldersLoading ? (
                  // Loading skeleton for files
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {Array.from({ length: 6 }).map((_, index) => (
                      <div key={index} className="bg-white border border-[#E0DBD7] rounded-[5px] p-4 animate-pulse">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-8 h-8 bg-[#F8F6F4] rounded"></div>
                          <div className="flex-1">
                            <div className="h-4 bg-[#F8F6F4] rounded mb-2" style={{ width: `${60 + Math.random() * 40}%` }}></div>
                            <div className="h-3 bg-[#F8F6F4] rounded" style={{ width: `${40 + Math.random() * 30}%` }}></div>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="h-3 bg-[#F8F6F4] rounded" style={{ width: `${80 + Math.random() * 20}%` }}></div>
                          <div className="h-3 bg-[#F8F6F4] rounded" style={{ width: `${70 + Math.random() * 30}%` }}></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : filteredFiles.length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="w-16 h-16 text-[#AB9C95] mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-[#332B42] mb-2">
                      {searchQuery ? 'No files found' : 'No files yet'}
                    </h3>
                    <p className="text-[#AB9C95] mb-6">
                      {searchQuery 
                        ? 'Try adjusting your search terms'
                        : 'Upload your first file to get started'
                      }
                    </p>
                    {!searchQuery && (
                      <button
                        onClick={() => setShowUploadModal(true)}
                        className="btn-primary"
                      >
                        Upload Your First File
                      </button>
                    )}
                  </div>
                ) : (
                  <div className={viewMode === 'grid' ? 'grid gap-4 md:grid-cols-2 lg:grid-cols-3' : 'space-y-4'}>
                    {filteredFiles.map((file) => (
                      <FileItemComponent
                        key={file.id}
                        file={file}
                        onDelete={(fileId) => console.log('Delete file:', fileId)}
                        onEdit={(file) => console.log('Edit file:', file)}
                        onSelect={(file) => setSelectedFile(file)}
                        isSelected={selectedFile?.id === file.id}
                        viewMode={viewMode}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </main>

          {/* AI File Analyzer Panel */}
          <div className="md:w-[420px] w-full">
            <AIFileAnalyzer
              selectedFile={selectedFile}
              onClose={() => setSelectedFile(null)}
              onAnalyzeFile={async (fileId: string, analysisType: string) => {
                // TODO: Implement file analysis
                console.log('Analyze file:', fileId, analysisType);
              }}
              onAskQuestion={async (fileId: string, question: string) => {
                // TODO: Implement AI question answering
                console.log('Ask question:', fileId, question);
                return `This is a mock response to: "${question}". In the future, this will be powered by AI analysis of your file.`;
              }}
            />
          </div>
        </div>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <UploadModal onClose={() => setShowUploadModal(false)} />
      )}
    </div>
  );
}

// Upload Modal Component
function UploadModal({ onClose }: { onClose: () => void }) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSelectedFiles(Array.from(e.target.files));
    }
  };

  const handleUpload = async () => {
    setUploading(true);
    // TODO: Implement file upload logic
    setTimeout(() => {
      setUploading(false);
      onClose();
    }, 2000);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-[5px] shadow-xl max-w-2xl w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-playfair text-xl font-semibold text-[#332B42]">Upload Files</h3>
          <button
            onClick={onClose}
            className="text-[#7A7A7A] hover:text-[#332B42] p-1 rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div
          className={`border-2 border-dashed rounded-[5px] p-8 text-center ${
            dragActive ? 'border-[#A85C36] bg-[#F8F6F4]' : 'border-[#E0DBD7]'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <Upload className="w-12 h-12 text-[#AB9C95] mx-auto mb-4" />
          <h4 className="text-lg font-medium text-[#332B42] mb-2">
            Drop files here or click to browse
          </h4>
          <p className="text-[#AB9C95] mb-4">
            Upload contracts, invoices, photos, and other wedding-related files
          </p>
          <input
            type="file"
            multiple
            onChange={handleFileSelect}
            className="hidden"
            id="file-upload"
          />
          <label
            htmlFor="file-upload"
            className="btn-primary cursor-pointer"
          >
            Choose Files
          </label>
        </div>

        {selectedFiles.length > 0 && (
          <div className="mt-6">
            <h4 className="font-medium text-[#332B42] mb-3">Selected Files:</h4>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {selectedFiles.map((file, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-[#F8F6F4] rounded-[5px]">
                  <span className="text-sm text-[#332B42]">{file.name}</span>
                  <span className="text-xs text-[#AB9C95]">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="btn-primaryinverse px-4 py-2"
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={selectedFiles.length === 0 || uploading}
            className="btn-primary px-4 py-2 disabled:opacity-50"
          >
            {uploading ? 'Uploading...' : 'Upload Files'}
          </button>
        </div>
      </div>
    </div>
  );
} 