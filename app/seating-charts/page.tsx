"use client";
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Users, Settings, Archive, Trash2, Edit, Copy } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCustomToast } from '@/hooks/useCustomToast';
import WeddingBanner from '@/components/WeddingBanner';
import { useWeddingBanner } from '@/hooks/useWeddingBanner';
import SectionHeaderBar from '@/components/SectionHeaderBar';
import Banner from '@/components/Banner';
import { CSVUploadModal, SeatingChartWizardModal } from '@/components/seating-charts';
import { Guest, SeatingChart } from '@/types/seatingChart';

export default function SeatingChartsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { showSuccessToast, showErrorToast } = useCustomToast();
  const weddingBannerData = useWeddingBanner(router);
  
  const [seatingCharts, setSeatingCharts] = useState<SeatingChart[]>([]);
  const [selectedChart, setSelectedChart] = useState<SeatingChart | null>(null);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCSVUploadModal, setShowCSVUploadModal] = useState(false);
  const [showWizardModal, setShowWizardModal] = useState(false);

  // Initialize with empty state
  useEffect(() => {
    setSeatingCharts([]);
    setIsLoading(false);
  }, []);

  const handleCreateChart = () => {
    setShowWizardModal(true);
  };

  const handleChartSelect = (chart: SeatingChart) => {
    setSelectedChart(chart);
  };

  const handleBackToOverview = () => {
    setSelectedChart(null);
  };

  const handleGuestsUploaded = (uploadedGuests: Guest[]) => {
    setGuests(uploadedGuests);
    showSuccessToast(`Successfully imported ${uploadedGuests.length} guests!`);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-[#F8F6F4] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-[#332B42] mb-4">Please log in to access seating charts</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F6F4]">
      {/* Wedding Banner */}
      <WeddingBanner 
        daysLeft={weddingBannerData.daysLeft}
        userName={weddingBannerData.userName}
        isLoading={weddingBannerData.isLoading}
        onSetWeddingDate={weddingBannerData.handleSetWeddingDate}
      />

      {seatingCharts.length === 0 ? (
        /* Empty State - Full Width Welcome */
        <div className="h-screen bg-white flex items-center justify-center">
          <div className="text-center">
            <img 
              src="/SeatingArrangement.png" 
              alt="Seating Arrangement" 
              className="w-48 mx-auto mb-4"
            />
            <h2 className="h3 text-[#332B42] mb-2">Welcome to Seating Charts</h2>
            <p className="font-work-sans text-[#332B42] mb-6">
              Create and manage seating arrangements for your wedding events
            </p>
            <div className="flex justify-center">
              <button
                onClick={handleCreateChart}
                className="btn-primary flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Create Your First Chart
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Chart Management View - Sidebar + Main Area */
        <div className="flex h-screen">
          {/* Sidebar */}
          <div className="w-80 bg-white border-r border-[#AB9C95] flex flex-col">
            {/* Header */}
            <div className="p-6 border-b border-[#AB9C95]">
              <div className="flex items-center justify-between mb-2">
                <h1 className="h3 text-[#332B42]">Seating Charts</h1>
                <button
                  onClick={handleCreateChart}
                  className="btn-primaryinverse flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  New Chart
                </button>
              </div>
              <p className="text-sm text-[#AB9C95]">Organize your wedding seating arrangements</p>
            </div>

            {/* Charts List */}
            <div className="flex-1 overflow-y-auto p-6">
              {isLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-20 bg-gray-200 rounded-lg"></div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {seatingCharts.map((chart) => (
                    <div
                      key={chart.id}
                      onClick={() => handleChartSelect(chart)}
                      className={`p-4 rounded-lg border cursor-pointer transition-all duration-200 hover:shadow-md ${
                        selectedChart?.id === chart.id
                          ? 'border-[#A85C36] bg-[#F3F2F0]'
                          : 'border-gray-200 hover:border-[#AB9C95]'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h6 className="h6 text-[#332B42]">{chart.name}</h6>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              // Handle edit
                            }}
                            className="p-1 text-gray-400 hover:text-[#A85C36]"
                          >
                            <Edit className="w-3 h-3" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              // Handle duplicate
                            }}
                            className="p-1 text-gray-400 hover:text-[#A85C36]"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                      
                      <div className="text-xs text-[#AB9C95] mb-2">
                        {chart.eventType}
                      </div>
                      
                      <div className="flex items-center justify-between text-xs text-[#7A7A7A]">
                        <span>{chart.guestCount} guests</span>
                        <span>{chart.tableCount} tables</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 bg-white">
            {selectedChart ? (
              <div className="h-full flex flex-col">
                {/* Header */}
                <div className="p-6 border-b border-[#AB9C95]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <button
                        onClick={handleBackToOverview}
                        className="text-[#A85C36] hover:text-[#8B4A2A] font-medium"
                      >
                        ← Back to Charts
                      </button>
                      <div className="w-px h-6 bg-[#AB9C95]"></div>
                      <div>
                        <h1 className="h3 text-[#332B42]">{selectedChart.name}</h1>
                        <p className="text-sm text-[#AB9C95]">{selectedChart.eventType}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <button className="btn-primaryinverse">
                        <Settings className="w-4 h-4 mr-2" />
                        Chart Settings
                      </button>
                    </div>
                  </div>
                </div>

                {/* Main Content */}
                <div className="flex-1">
                  <div className="text-center py-12">
                    <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h2 className="h4 text-[#332B42] mb-2">Seating Chart Editor</h2>
                    <p className="text-[#AB9C95] mb-6">
                      This is where the interactive seating chart will be built
                    </p>
                    
                    {/* Guest Management Section */}
                    <div className="max-w-md mx-auto mb-8">
                      <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                        <h3 className="h6 text-[#332B42] mb-3">Guest List</h3>
                        {guests.length === 0 ? (
                          <div className="text-center">
                            <p className="text-sm text-[#AB9C95] mb-4">No guests uploaded yet</p>
                            <button
                              onClick={() => setShowCSVUploadModal(true)}
                              className="btn-primary"
                            >
                              Upload Guest List
                            </button>
                          </div>
                        ) : (
                          <div className="text-center">
                            <p className="text-sm text-[#AB9C95] mb-4">{guests.length} guests uploaded</p>
                            <div className="flex gap-2 justify-center">
                              <button
                                onClick={() => setShowCSVUploadModal(true)}
                                className="btn-primaryinverse text-sm"
                              >
                                Add More Guests
                              </button>
                              <button
                                onClick={() => setGuests([])}
                                className="btn-primaryinverse text-sm text-red-600 hover:text-red-700"
                              >
                                Clear All
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-center gap-4 text-sm text-[#7A7A7A]">
                      <span>• Upload guest list</span>
                      <span>• Design table layout</span>
                      <span>• Drag & drop guests</span>
                      <span>• AI seating suggestions</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h2 className="h4 text-[#332B42] mb-2">Select a Chart</h2>
                  <p className="text-[#AB9C95] mb-6">
                    Choose a seating chart from the sidebar to start editing
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CSV Upload Modal */}
      <CSVUploadModal
        isOpen={showCSVUploadModal}
        onClose={() => setShowCSVUploadModal(false)}
        onGuestsUploaded={handleGuestsUploaded}
      />

      {/* Seating Chart Wizard Modal */}
      <SeatingChartWizardModal
        isOpen={showWizardModal}
        onClose={() => setShowWizardModal(false)}
        onChartCreated={(chart) => {
          // TODO: Handle chart creation
          setShowWizardModal(false);
          showSuccessToast('Seating chart created successfully!');
        }}
      />
    </div>
  );
}
