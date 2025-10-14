"use client";
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCustomToast } from '@/hooks/useCustomToast';
import { useGlobalCompletionToasts } from '@/hooks/useGlobalCompletionToasts';
import WeddingBanner from '@/components/WeddingBanner';
import GlobalGmailBanner from '@/components/GlobalGmailBanner';
import { SeatingChart } from '@/types/seatingChart';
import { getSeatingCharts, deleteSeatingChart } from '@/lib/seatingChartService';
import SeatingChartCard from '@/components/seating-charts/SeatingChartCard';
import { getTemplates, SavedTemplate, cloneTemplate, deleteTemplate } from '@/lib/templateService';
import TemplateCard from '@/components/seating-charts/TemplateCard';
import DeleteTemplateModal from '@/components/seating-charts/DeleteTemplateModal';

export default function SeatingChartsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { showSuccessToast, showErrorToast } = useCustomToast();
  const { showCompletionToast } = useGlobalCompletionToasts();
  
  const [seatingCharts, setSeatingCharts] = useState<SeatingChart[]>([]);
  const [templates, setTemplates] = useState<SavedTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'charts' | 'templates'>('charts');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<SavedTemplate | null>(null);

  // Load seating charts and templates from Firestore
  useEffect(() => {
    const loadData = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        // Load both charts and templates in parallel for optimal performance
        const [charts, templates] = await Promise.all([
          getSeatingCharts(user.uid),
          getTemplates(user.uid)
        ]);
        
        console.log('Loaded charts:', charts);
        console.log('Chart IDs:', charts.map(c => c.id));
        console.log('Chart names:', charts.map(c => c.name));
        setSeatingCharts(charts);
        setTemplates(templates);
      } catch (error) {
        console.error('Error loading data:', error);
        showErrorToast('Failed to load data');
        setSeatingCharts([]);
        setTemplates([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [user, showErrorToast]);

  const handleCreateChart = () => {
    router.push('/seating-charts/create');
  };

  const refreshTemplates = async () => {
    if (!user) return;
    try {
      const savedTemplates = await getTemplates(user.uid);
      setTemplates(savedTemplates);
    } catch (error) {
      console.error('Error refreshing templates:', error);
      showErrorToast('Failed to refresh templates');
    }
  };

  const handleEditTemplate = (template: SavedTemplate) => {
    router.push(`/seating-charts/template/${template.id}`);
  };

  const handleCloneTemplate = async (template: SavedTemplate) => {
    if (!user) return;
    try {
      const newName = `${template.name} Copy`;
      const cloned = await cloneTemplate(template.id, newName, user.uid);
      if (cloned) {
        await refreshTemplates();
        showSuccessToast('Template cloned successfully!');
      } else {
        showErrorToast('Failed to clone template');
      }
    } catch (error) {
      console.error('Error cloning template:', error);
      showErrorToast('Failed to clone template');
    }
  };

  const handleDeleteTemplate = (template: SavedTemplate) => {
    setTemplateToDelete(template);
    setShowDeleteModal(true);
  };

  const confirmDeleteTemplate = async () => {
    if (!templateToDelete || !user) return;
    
    try {
      await deleteTemplate(templateToDelete.id, user.uid);
      await refreshTemplates();
      
      // If no templates left and we're on templates tab, switch to charts tab
      if (templates.length === 1 && activeTab === 'templates') {
        setActiveTab('charts');
      }
      
      showSuccessToast('Template deleted successfully');
    } catch (error) {
      console.error('Error deleting template:', error);
      showErrorToast('Failed to delete template');
    }
    
    setShowDeleteModal(false);
    setTemplateToDelete(null);
  };

  const cancelDeleteTemplate = () => {
    setShowDeleteModal(false);
    setTemplateToDelete(null);
  };

  const handleCleanupDuplicates = async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      
      // Group charts by name and keep only the most recent one
      const chartGroups = seatingCharts.reduce((groups, chart) => {
        const key = chart.name;
        if (!groups[key]) {
          groups[key] = [];
        }
        groups[key].push(chart);
        return groups;
      }, {} as Record<string, SeatingChart[]>);

      // For each group, keep only the most recent chart
      const chartsToKeep: SeatingChart[] = [];
      const chartsToDelete: string[] = [];
      
      Object.values(chartGroups).forEach(group => {
        if (group.length > 1) {
          // Sort by updatedAt and keep the most recent
          group.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
          chartsToKeep.push(group[0]);
          // Mark the rest for deletion
          group.slice(1).forEach(chart => chartsToDelete.push(chart.id));
        } else {
          chartsToKeep.push(group[0]);
        }
      });

      console.log(`Found ${chartsToDelete.length} duplicate charts to delete`);
      console.log('Charts to keep:', chartsToKeep.map(c => c.name));
      console.log('Charts to delete:', chartsToDelete);

      // Actually delete the duplicate charts from the database
      for (const chartId of chartsToDelete) {
        await deleteSeatingChart(chartId, user.uid);
        console.log(`Deleted chart: ${chartId}`);
      }

      // Update the display with the cleaned up charts
      setSeatingCharts(chartsToKeep);
      showSuccessToast(`Cleaned up ${chartsToDelete.length} duplicate charts from database`);
    } catch (error) {
      console.error('Error cleaning up duplicates:', error);
      showErrorToast('Failed to clean up duplicates');
    } finally {
      setIsLoading(false);
    }
  };


  // Simplified loading - show page immediately, handle auth in background
  if (!user) {
    return null; // Let middleware handle redirect
  }

  return (
    <>
      <style jsx global>{`
        html, body {
          overflow-x: hidden;
          height: 100vh;
          margin: 0;
          padding: 0;
        }
        body {
          position: relative;
        }
        /* Mobile: Full height with fixed nav at bottom */
        @media (max-width: 768px) {
          html, body {
            height: 100vh;
            overflow: hidden;
          }
          .mobile-scroll-container {
            height: 100vh;
            overflow-y: auto;
            -webkit-overflow-scrolling: touch;
          }
        }
        /* Desktop: Normal scrolling */
        @media (min-width: 769px) {
          html, body {
            height: auto;
            min-height: 100vh;
            overflow-y: auto;
          }
        }
      `}</style>
      <div className="min-h-screen bg-linen mobile-scroll-container">
        <WeddingBanner />
      
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-8" style={{ width: '100%', maxWidth: '1152px' }}>
          {/* Header - Show when there are charts or templates */}
          {!isLoading && (seatingCharts.length > 0 || templates.length > 0) && (
            <div className="py-6 px-0 lg:px-4 bg-[#F3F2F0] border-b border-[#AB9C95]" style={{ minHeight: 80, borderBottomWidth: '0.5px' }}>
              {/* Title */}
              <div className="flex items-center justify-between">
                <h4 className="text-lg font-playfair font-medium text-[#332B42]">
                  {activeTab === 'charts' ? 'Seating Charts' : 'Saved Templates'}
                </h4>
                {activeTab === 'charts' && (
                  <div className="flex items-center gap-4">
                    <button
                      onClick={handleCleanupDuplicates}
                      className="btn-primaryinverse flex items-center gap-2"
                      disabled={isLoading}
                    >
                      {isLoading ? 'Cleaning...' : 'Cleanup Duplicates'}
                    </button>
                    <button
                      onClick={handleCreateChart}
                      className="btn-primary flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      New Chart
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Tabs - Only show if there are templates */}
          {!isLoading && templates.length > 0 && (
            <div className="py-4">
              <div className="flex space-x-8">
                <button
                  onClick={() => setActiveTab('charts')}
                  className={`pb-2 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'charts'
                      ? 'border-[#A85C36] text-[#A85C36]'
                      : 'border-transparent text-[#AB9C95] hover:text-[#332B42]'
                  }`}
                >
                  Guest Lists & Charts
                </button>
                <button
                  onClick={() => setActiveTab('templates')}
                  className={`pb-2 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'templates'
                      ? 'border-[#A85C36] text-[#A85C36]'
                      : 'border-transparent text-[#AB9C95] hover:text-[#332B42]'
                  }`}
                >
                  Templates
                </button>
              </div>
            </div>
          )}

          {/* Main Content */}
          <div className="py-6">
            {isLoading ? (
              <div className="animate-pulse">
                {/* Seating Charts Header Skeleton */}
                <div className="flex items-center justify-between py-6 px-0 lg:px-4 bg-[#F3F2F0] border-b border-[#AB9C95]" style={{ minHeight: 80, borderBottomWidth: '0.5px' }}>
                  <div className="h-6 bg-gray-200 rounded w-32"></div>
                  <div className="flex items-center gap-4">
                    <div className="h-8 bg-gray-200 rounded w-24"></div>
                    <div className="h-8 bg-gray-200 rounded w-32"></div>
                  </div>
                </div>
                
                {/* Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                  {[...Array(2)].map((_, i) => (
                    <div key={i} className="border border-gray-200 rounded-lg flex flex-col h-72 overflow-hidden">
                      {/* Card Content */}
                      <div className="p-4 flex-1 flex flex-col bg-white">
                        {/* Header */}
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="h-3 bg-gray-200 rounded w-8"></div>
                            <div className="h-3 bg-gray-200 rounded w-8"></div>
                          </div>
                        </div>
                        
                        {/* Content Area */}
                        <div className="space-y-3">
                          {/* Guest Preview Section */}
                          <div className="space-y-2">
                            <div className="h-3 bg-gray-200 rounded w-24"></div>
                            <div className="space-y-1">
                              {[1, 2, 3].map((j) => (
                                <div key={j} className="flex items-center gap-2">
                                  <div className="w-6 h-6 bg-gray-200 rounded-full"></div>
                                  <div className="h-3 bg-gray-200 rounded w-20"></div>
                                </div>
                              ))}
                            </div>
                          </div>
                          
                          {/* Table Preview Section */}
                          <div className="space-y-2">
                            <div className="h-3 bg-gray-200 rounded w-16"></div>
                            <div className="flex flex-wrap gap-1">
                              {[1, 2, 3, 4].map((j) => (
                                <div key={j} className="h-6 bg-gray-200 rounded w-12"></div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Card Footer */}
                      <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 flex-shrink-0">
                        <div className="flex items-center justify-between">
                          <div className="h-3 bg-gray-200 rounded w-20"></div>
                          <div className="h-3 bg-gray-200 rounded w-16"></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : activeTab === 'charts' ? (
              // Charts tab content
              seatingCharts.length === 0 ? (
              <div className="text-center py-16 flex flex-col items-center justify-center min-h-[60vh]">
                <div className="mx-auto mb-3" style={{ width: '240px' }}>
                  <img 
                    src="/SeatingArrangement.png" 
                    alt="Seating Arrangement" 
                    className="w-full h-auto object-contain"
                  />
                </div>
                <h4 className="text-[#332B42] mb-3">Seating Charts made easy</h4>
                <p className="font-work text-[#332B42] mb-8 max-w-sm mx-auto text-sm leading-tight">
                  Create and manage seating arrangements for your wedding events
                </p>
                <button
                  onClick={handleCreateChart}
                  className="btn-primary flex items-center gap-2 mx-auto"
                >
                  <Plus className="w-4 h-4" />
                  Create Your First Chart
                </button>
              </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {seatingCharts.map((chart) => (
                    <SeatingChartCard key={chart.id} chart={chart} />
                  ))}
                </div>
              )
            ) : (
              // Templates tab content
              templates.length === 0 ? (
                <div className="text-center py-16 flex flex-col items-center justify-center min-h-[60vh]">
                  <div className="mx-auto mb-3" style={{ width: '240px' }}>
                    <img 
                      src="/SeatingArrangement.png" 
                      alt="Templates" 
                      className="w-full h-auto object-contain"
                    />
                  </div>
                  <h4 className="text-[#332B42] mb-3">No Templates Yet</h4>
                  <p className="font-work text-[#332B42] mb-8 max-w-sm mx-auto text-sm leading-tight">
                    Create a seating layout and save it as a template to reuse for future events
                  </p>
                  <button
                    onClick={handleCreateChart}
                    className="btn-primary flex items-center gap-2 mx-auto"
                  >
                    <Plus className="w-4 h-4" />
                    Create Your First Chart
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {templates.map((template) => (
                    <TemplateCard
                      key={template.id}
                      template={template}
                      onEdit={handleEditTemplate}
                      onClone={handleCloneTemplate}
                      onDelete={handleDeleteTemplate}
                    />
                  ))}
                </div>
              )
            )}
          </div>
        </div>
      </div>

      {/* Delete Template Modal */}
      <DeleteTemplateModal
        isOpen={showDeleteModal}
        onClose={cancelDeleteTemplate}
        onConfirm={confirmDeleteTemplate}
        template={templateToDelete}
      />
    </>
  );
}
