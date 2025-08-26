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

interface SeatingChart {
  id: string;
  name: string;
  eventType: string;
  createdAt: Date;
  updatedAt: Date;
  guestCount: number;
  tableCount: number;
  isActive: boolean;
}

export default function SeatingChartsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { showSuccessToast, showErrorToast } = useCustomToast();
  const { showWeddingBanner, hideWeddingBanner } = useWeddingBanner();
  
  const [seatingCharts, setSeatingCharts] = useState<SeatingChart[]>([]);
  const [selectedChart, setSelectedChart] = useState<SeatingChart | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Mock data for now - we'll replace with real data later
  useEffect(() => {
    const mockCharts: SeatingChart[] = [
      {
        id: '1',
        name: 'Wedding Reception',
        eventType: 'Reception',
        createdAt: new Date(),
        updatedAt: new Date(),
        guestCount: 120,
        tableCount: 15,
        isActive: true
      },
      {
        id: '2',
        name: 'Cocktail Hour',
        eventType: 'Cocktail Hour',
        createdAt: new Date(),
        updatedAt: new Date(),
        guestCount: 80,
        tableCount: 8,
        isActive: true
      }
    ];
    
    setSeatingCharts(mockCharts);
    setIsLoading(false);
  }, []);

  const handleCreateChart = () => {
    setShowCreateModal(true);
  };

  const handleChartSelect = (chart: SeatingChart) => {
    setSelectedChart(chart);
  };

  const handleBackToOverview = () => {
    setSelectedChart(null);
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
        isVisible={showWeddingBanner} 
        onHide={hideWeddingBanner} 
      />

      <div className="flex h-screen">
        {/* Sidebar */}
        <div className="w-80 bg-white border-r border-[#AB9C95] flex flex-col">
          {/* Header */}
          <div className="p-6 border-b border-[#AB9C95]">
            <h1 className="h3 text-[#332B42] mb-2">Seating Charts</h1>
            <p className="text-sm text-[#AB9C95]">Organize your wedding seating arrangements</p>
          </div>

          {/* Create New Button */}
          <div className="p-6">
            <button
              onClick={handleCreateChart}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Create New Chart
            </button>
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
            ) : seatingCharts.length === 0 ? (
              <div className="text-center py-8">
                <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 mb-4">No seating charts yet</p>
                <p className="text-sm text-gray-400">Create your first chart to get started</p>
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
                      <h3 className="h6 text-[#332B42]">{chart.name}</h3>
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
              <div className="flex-1 p-6">
                <div className="text-center py-12">
                  <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h2 className="h4 text-[#332B42] mb-2">Seating Chart Editor</h2>
                  <p className="text-[#AB9C95] mb-6">
                    This is where the interactive seating chart will be built
                  </p>
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
                <h2 className="h4 text-[#332B42] mb-2">Welcome to Seating Charts</h2>
                <p className="text-[#AB9C95] mb-6">
                  Create and manage seating arrangements for your wedding events
                </p>
                <button
                  onClick={handleCreateChart}
                  className="btn-primary"
                >
                  Create Your First Chart
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create Chart Modal - We'll build this next */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-[5px] p-6 max-w-md w-full mx-4">
            <h3 className="h4 text-[#332B42] mb-4">Create New Seating Chart</h3>
            <p className="text-sm text-[#AB9C95] mb-6">
              This modal will be built in the next step
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="btn-primaryinverse flex-1"
              >
                Cancel
              </button>
              <button
                onClick={() => setShowCreateModal(false)}
                className="btn-primary flex-1"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
