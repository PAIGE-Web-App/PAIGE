"use client";

import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useUserProfileData } from '@/hooks/useUserProfileData';
import { Search, Plus, Upload, FileText, X, ChevronDown, MoreHorizontal } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

// Components
import Banner from '@/components/Banner';
import BottomNavBar from '@/components/BottomNavBar';
import WeddingBanner from '@/components/WeddingBanner';
import RightDashboardPanel from '@/components/RightDashboardPanel';

// Types
interface FileCategory {
  id: string;
  name: string;
  count: number;
}

interface FileItem {
  id: string;
  name: string;
  description: string;
  category: string;
  uploadedAt: Date;
  fileType: string;
  fileSize: number;
  aiSummary?: string;
  keyPoints?: string[];
  vendorAccountability?: string[];
}

export default function FilesPage() {
  const { user, loading } = useAuth();
  const { daysLeft, userName, profileLoading } = useUserProfileData();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [rightPanelSelection, setRightPanelSelection] = useState<'todo' | 'messages' | 'favorites'>('todo');
  const [activeMobileTab, setActiveMobileTab] = useState<'contacts' | 'messages' | 'todo'>('todo');
  const [activeTab, setActiveTab] = useState<'contacts' | 'messages' | 'todo' | 'budget'>('todo');

  // Mock data - replace with real data from your backend
  const categories: FileCategory[] = [
    { id: 'all', name: 'All Files', count: 12 },
    { id: 'contracts', name: 'Contracts', count: 5 },
    { id: 'invoices', name: 'Invoices', count: 3 },
    { id: 'proposals', name: 'Proposals', count: 2 },
    { id: 'photos', name: 'Photos', count: 2 },
  ];

  const files: FileItem[] = [
    {
      id: '1',
      name: 'Photographer contract',
      description: 'Description here. Lorem ipsum dolor. Description here. Lorem ipsum dolor...',
      category: 'contracts',
      uploadedAt: new Date('2024-01-15'),
      fileType: 'pdf',
      fileSize: 2048576,
      aiSummary: 'Contract for wedding photography services covering ceremony and reception...',
      keyPoints: ['Payment schedule: 50% deposit, 50% 2 weeks before', 'Coverage: 8 hours on wedding day', 'Delivery: 4-6 weeks after wedding'],
      vendorAccountability: ['Must deliver photos within 6 weeks', 'Must provide backup photographer if unavailable', 'Must attend rehearsal dinner for planning']
    }
  ];

  const filteredFiles = files.filter(file => {
    const matchesSearch = file.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         file.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || file.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  if (loading) {
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
      {/* Wedding Banner */}
      <WeddingBanner 
        daysLeft={daysLeft}
        userName={userName}
        isLoading={profileLoading}
        onSetWeddingDate={() => {}}
      />
      
      {/* Main Content */}
      <div className="app-content-container flex-1 overflow-hidden">
        <div className="flex h-full gap-4 lg:flex-row flex-col">
          
          {/* Main Content Area - Same layout as main page */}
          <main className="unified-container">
            {/* Left Sidebar - File Categories (similar to ContactsList) */}
            <div className="unified-sidebar">
              {/* Header */}
              <div className="p-6 border-b border-[#AB9C95]">
                <h1 className="text-2xl font-playfair font-semibold text-[#332B42] mb-4">Files</h1>
                
                {/* Search Bar */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#AB9C95] w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search in Files"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-[#AB9C95] rounded-[5px] text-sm focus:outline-none focus:ring-2 focus:ring-[#A85C36] bg-white"
                  />
                </div>
              </div>

              {/* Categories */}
              <div className="flex-1 overflow-y-auto p-4">
                <div className="space-y-1">
                  {categories.map((category) => (
                    <button
                      key={category.id}
                      onClick={() => setSelectedCategory(category.id)}
                      className={`w-full flex items-center justify-between p-3 rounded-[5px] text-left transition-colors ${
                        selectedCategory === category.id
                          ? 'bg-[#F8F6F4] border border-[#E0DBD7]'
                          : 'hover:bg-[#F8F6F4]'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-[#332B42]">
                          {category.name}
                        </span>
                        {category.id === 'all' && (
                          <ChevronDown className="w-4 h-4 text-[#AB9C95]" />
                        )}
                      </div>
                      <span className="text-xs text-[#AB9C95]">
                        {category.count}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* New Category Button */}
              <div className="p-4 border-t border-[#AB9C95]">
                <button className="w-full flex items-center justify-center gap-2 py-2 px-4 border border-[#AB9C95] rounded-[5px] text-sm text-[#332B42] hover:bg-[#F8F6F4] transition-colors">
                  <Plus className="w-4 h-4" />
                  New Category
                </button>
              </div>
            </div>

            {/* Main Content Area (similar to MessagesPanel) */}
            <div className="unified-main-content">
              {/* Empty State */}
              {filteredFiles.length === 0 ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center max-w-md">
                    {/* Champagne glasses illustration */}
                    <div className="w-32 h-32 mx-auto mb-6 bg-[#F8F6F4] rounded-full flex items-center justify-center">
                      <FileText className="w-16 h-16 text-[#AB9C95]" />
                    </div>
                    
                    <button
                      onClick={() => setShowUploadModal(true)}
                      className="bg-[#332B42] text-white px-6 py-3 rounded-[5px] font-semibold mb-4 hover:bg-[#2A2335] transition-colors flex items-center gap-2 mx-auto"
                    >
                      <Upload className="w-4 h-4" />
                      Upload New
                    </button>
                    
                    <p className="text-sm text-[#AB9C95] mb-2">
                      Not sure what to do? Try uploading a vendor contract and Paige will summarize it for you!
                    </p>
                    
                    <button className="text-[#A85C36] text-sm font-medium hover:underline flex items-center gap-1 mx-auto">
                      <span className="w-3 h-3 bg-red-500 rounded-full"></span>
                      See it in action
                    </button>
                  </div>
                </div>
              ) : (
                /* File List */
                <div className="flex-1 p-6">
                  <div className="space-y-4">
                    {filteredFiles.map((file) => (
                      <div
                        key={file.id}
                        className="bg-white border border-[#E0DBD7] rounded-[5px] p-4 hover:shadow-sm transition-shadow"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-4 flex-1">
                            {/* File Icon */}
                            <div className="w-12 h-12 bg-red-100 rounded-[5px] flex items-center justify-center flex-shrink-0">
                              <FileText className="w-6 h-6 text-red-600" />
                            </div>
                            
                            {/* File Details */}
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-[#332B42] mb-1">
                                {file.name}
                              </h3>
                              <p className="text-sm text-[#AB9C95] mb-2">
                                {file.description}
                              </p>
                              <div className="flex items-center gap-2">
                                <span className="inline-block px-2 py-1 bg-[#F8F6F4] text-xs text-[#332B42] rounded-[3px]">
                                  {file.category}
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          {/* Actions */}
                          <div className="flex items-center gap-2">
                            <button className="p-2 hover:bg-[#F8F6F4] rounded-[5px] transition-colors">
                              <MoreHorizontal className="w-4 h-4 text-[#AB9C95]" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Ask Paige Button */}
                  <div className="mt-6">
                    <button className="bg-[#A85C36] text-white px-4 py-2 rounded-[5px] font-medium hover:bg-[#8B4513] transition-colors flex items-center gap-2">
                      <Plus className="w-4 h-4" />
                      Ask Paige
                    </button>
                  </div>
                </div>
              )}
            </div>
          </main>

          {/* Right Sidebar - Same width as main page */}
          <div className="md:w-[420px] w-full">
            <RightDashboardPanel
              currentUser={user}
              contacts={[]} // TODO: Pass actual contacts from your contacts hook
              isMobile={false}
              rightPanelSelection={rightPanelSelection}
              setRightPanelSelection={setRightPanelSelection}
              activeMobileTab={activeMobileTab}
              onUpdateTodoDeadline={async (todoId: string, deadline: string | null) => {
                // TODO: Implement todo deadline update
                console.log('Update todo deadline:', todoId, deadline);
              }}
              onUpdateTodoNotes={async (todoId: string, notes: string) => {
                // TODO: Implement todo notes update
                console.log('Update todo notes:', todoId, notes);
              }}
              onUpdateTodoCategory={async (todoId: string, category: string) => {
                // TODO: Implement todo category update
                console.log('Update todo category:', todoId, category);
              }}
            />
          </div>
        </div>
      </div>

      {/* Upload Modal */}
      <AnimatePresence>
        {showUploadModal && (
          <UploadModal onClose={() => setShowUploadModal(false)} />
        )}
      </AnimatePresence>

      {/* Mobile Bottom Navigation */}
      <BottomNavBar 
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />
    </div>
  );
}

// Upload Modal Component
function UploadModal({ onClose }: { onClose: () => void }) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [category, setCategory] = useState('');
  const [fileName, setFileName] = useState('');
  const [description, setDescription] = useState('');

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-[10px] w-full max-w-md p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-[#332B42]">Upload file</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-[#F8F6F4] rounded-[5px] transition-colors"
          >
            <X className="w-5 h-5 text-[#AB9C95]" />
          </button>
        </div>

        {/* Upload Area */}
        <div className="border-2 border-dashed border-[#AB9C95] rounded-[5px] p-8 text-center mb-6">
          <div className="w-16 h-16 mx-auto mb-4 bg-[#F8F6F4] rounded-full flex items-center justify-center">
            <FileText className="w-8 h-8 text-[#AB9C95]" />
          </div>
          
          <button className="bg-[#332B42] text-white px-4 py-2 rounded-[5px] font-medium mb-2 hover:bg-[#2A2335] transition-colors flex items-center gap-2 mx-auto">
            <Upload className="w-4 h-4" />
            Choose file
          </button>
          
          <p className="text-sm text-[#AB9C95] mb-2">
            or drop files and folders here
          </p>
          
          <p className="text-xs text-[#AB9C95]">
            Examples: PDF, txt, csv, markdown, image
          </p>
        </div>

        {/* Form Fields */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#332B42] mb-1">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full p-2 border border-[#AB9C95] rounded-[5px] text-sm focus:outline-none focus:ring-2 focus:ring-[#A85C36] bg-white"
            >
              <option value="">Select Category</option>
              <option value="contracts">Contracts</option>
              <option value="invoices">Invoices</option>
              <option value="proposals">Proposals</option>
              <option value="photos">Photos</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#332B42] mb-1">
              File Name
            </label>
            <input
              type="text"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              placeholder="File name here"
              className="w-full p-2 border border-[#AB9C95] rounded-[5px] text-sm focus:outline-none focus:ring-2 focus:ring-[#A85C36] bg-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#332B42] mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter file description"
              rows={3}
              className="w-full p-2 border border-[#AB9C95] rounded-[5px] text-sm focus:outline-none focus:ring-2 focus:ring-[#A85C36] bg-white resize-none"
            />
          </div>
        </div>

        {/* Action Button */}
        <div className="flex justify-end mt-6">
          <button
            onClick={onClose}
            className="bg-[#332B42] text-white px-6 py-2 rounded-[5px] font-medium hover:bg-[#2A2335] transition-colors"
          >
            Done
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
} 