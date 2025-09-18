"use client";
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCustomToast } from '@/hooks/useCustomToast';
import WeddingBanner from '@/components/WeddingBanner';
import { useWeddingBanner } from '@/hooks/useWeddingBanner';
import { SeatingChart } from '@/types/seatingChart';
import { getSeatingCharts, deleteSeatingChart } from '@/lib/seatingChartService';
import SeatingChartCard from '@/components/seating-charts/SeatingChartCard';

export default function SeatingChartsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { showSuccessToast, showErrorToast } = useCustomToast();
  const weddingBannerData = useWeddingBanner(router);
  
  const [seatingCharts, setSeatingCharts] = useState<SeatingChart[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load seating charts from Firestore
  useEffect(() => {
    const loadCharts = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const charts = await getSeatingCharts(user.uid);
        console.log('Loaded charts:', charts);
        console.log('Chart IDs:', charts.map(c => c.id));
        console.log('Chart names:', charts.map(c => c.name));
        setSeatingCharts(charts);
      } catch (error) {
        console.error('Error loading seating charts:', error);
        showErrorToast('Failed to load seating charts');
      } finally {
        setIsLoading(false);
      }
    };

    loadCharts();
  }, [user]);

  const handleCreateChart = () => {
    router.push('/seating-charts/create');
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
        <WeddingBanner 
          daysLeft={weddingBannerData.daysLeft}
          userName={weddingBannerData.userName}
          isLoading={weddingBannerData.isLoading}
          onSetWeddingDate={weddingBannerData.handleSetWeddingDate}
        />
      
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-8" style={{ width: '100%', maxWidth: '1152px' }}>
          {/* Seating Charts Header */}
          <div className="flex items-center justify-between py-6 px-0 lg:px-4 bg-[#F3F2F0] border-b border-[#AB9C95] sticky top-0 z-20 shadow-sm" style={{ minHeight: 80, borderBottomWidth: '0.5px' }}>
            <h4 className="text-lg font-playfair font-medium text-[#332B42]">Seating Charts</h4>
            <div className="flex items-center gap-4">
              {seatingCharts.length > 0 && (
                <button
                  onClick={handleCleanupDuplicates}
                  className="btn-primaryinverse flex items-center gap-2"
                  disabled={isLoading}
                >
                  {isLoading ? 'Cleaning...' : 'Cleanup Duplicates'}
                </button>
              )}
              <button
                onClick={handleCreateChart}
                className="btn-primary flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                New Chart
              </button>
            </div>
          </div>
          
          {/* Main Content */}
          <div className="py-6">
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-56 bg-gray-200 rounded-lg"></div>
                  </div>
                ))}
              </div>
            ) : seatingCharts.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Users className="w-12 h-12 text-gray-400" />
                </div>
                <h2 className="h3 text-[#332B42] mb-2">Welcome to Seating Charts</h2>
                <p className="font-work-sans text-[#332B42] mb-8 max-w-md mx-auto">
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
            )}
          </div>
        </div>
      </div>
    </>
  );
}
