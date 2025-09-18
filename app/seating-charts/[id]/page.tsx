"use client";
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useParams } from 'next/navigation';
import { useCustomToast } from '@/hooks/useCustomToast';
import WeddingBanner from '@/components/WeddingBanner';
import { useWeddingBanner } from '@/hooks/useWeddingBanner';
import { SeatingChart } from '@/types/seatingChart';
import { getSeatingChart } from '@/lib/seatingChartService';
import { ArrowLeft, Users, Table, Settings, Save } from 'lucide-react';
import GuestListTableWithResizing from '@/components/seating-charts/GuestListTableWithResizing';
import VisualTableLayoutSVG from '@/components/seating-charts/VisualTableLayoutSVG';
import { useWizardState } from '@/components/seating-charts/hooks/useWizardState';
import { useUserProfileData } from '@/hooks/useUserProfileData';

export default function SeatingChartDetailPage() {
  const { user, profileImageUrl } = useAuth();
  const { userName, partnerName } = useUserProfileData();
  const router = useRouter();
  const params = useParams();
  const { showSuccessToast, showErrorToast } = useCustomToast();
  const weddingBannerData = useWeddingBanner(router);
  
  const [chart, setChart] = useState<SeatingChart | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'guests' | 'layout'>('guests');
  
  // Initialize wizard state from chart data
  const {
    wizardState,
    updateWizardState,
    updateGuest,
    removeGuest,
    updateColumn,
    guestColumns
  } = useWizardState();

  const chartId = params.id as string;

  // Load chart data
  useEffect(() => {
    const loadChart = async () => {
      if (!user || !chartId) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const chartData = await getSeatingChart(chartId, user.uid);
        if (chartData) {
          setChart(chartData);
          // Populate wizard state with chart data
          updateWizardState({
            chartName: chartData.name,
            eventType: chartData.eventType,
            description: chartData.description || '',
            guests: chartData.guests || [],
            tableLayout: {
              tables: (chartData.tables || []).map(table => ({
                ...table,
                description: '', // Add missing description property with default value
                isDefault: table.id === 'sweetheart-table' // Ensure sweetheart table is marked as default
              })),
              totalCapacity: chartData.tableCount || 0
            },
            guestGroups: chartData.guestGroups || []
          });
          
          // Always restore from Firestore data (source of truth)
          try {
            console.log('Loading chart data from Firestore:', {
              chartData,
              tables: chartData.tables,
              tableCount: chartData.tables?.length,
              guestCount: chartData.guests?.length
            });
            console.log('🔍 CHART LOAD DEBUG - Table positions from Firestore:', chartData.tables.map(t => ({ id: t.id, name: t.name, position: t.position })));
            
            // Restore table positions from saved chart data
            if (chartData.tables && chartData.tables.length > 0) {
              const tablePositions = chartData.tables.map((table, index) => {
                if (table.position) {
                  return {
                    id: table.id,
                    x: table.position.x,
                    y: table.position.y,
                    rotation: 0
                  };
                } else {
                  // Default positions if not saved
                  if (table.id === 'sweetheart-table') {
                    return { id: table.id, x: 400, y: 300, rotation: 0 };
                  } else {
                    const baseX = (index % 4) * 300 + 200;
                    const baseY = Math.floor(index / 4) * 300 + 200;
                    return { id: table.id, x: baseX, y: baseY, rotation: 0 };
                  }
                }
              });
              sessionStorage.setItem('seating-chart-table-positions', JSON.stringify(tablePositions));
              console.log('Restored table positions:', tablePositions);
            }
            
            // Restore guest assignments from saved chart data
            if (chartData.tables) {
              const guestAssignments: any = {};
              
              chartData.tables.forEach(table => {
                if (table.guests && Array.isArray(table.guests)) {
                  table.guests.forEach((guestId) => {
                    // Use stored coordinates if available, otherwise fall back to table position
                    let position = { x: table.position?.x || 0, y: table.position?.y || 0 };
                    
                    if (table.guestAssignments && table.guestAssignments[guestId]) {
                      // Use the stored coordinates for this specific guest
                      position = table.guestAssignments[guestId];
                    }
                    
                    guestAssignments[guestId] = {
                      tableId: table.id,
                      position: position
                    };
                  });
                }
              });
              
              if (Object.keys(guestAssignments).length > 0) {
                sessionStorage.setItem('seating-chart-guest-assignments', JSON.stringify(guestAssignments));
                
                // Trigger a custom event to notify components that assignments have been restored
                // Use setTimeout to ensure components are mounted
                setTimeout(() => {
                  window.dispatchEvent(new CustomEvent('guestAssignmentsRestored', { 
                    detail: { assignments: guestAssignments } 
                  }));
                }, 500);
              } else {
                console.log('💾 CHART DETAIL LOAD - No guest assignments to restore');
              }
            }
          } catch (error) {
            console.warn('Could not restore session storage data:', error);
          }
        } else {
          showErrorToast('Chart not found');
          router.push('/seating-charts');
        }
      } catch (error) {
        console.error('Error loading chart:', error);
        showErrorToast('Failed to load chart');
        router.push('/seating-charts');
      } finally {
        setIsLoading(false);
      }
    };

    loadChart();
  }, [user, chartId, updateWizardState]);

  const handleBackToCharts = () => {
    router.push('/seating-charts');
  };

    const handleSave = async () => {
      if (!user || !chart) {
        return;
      }
    
    try {
      // Get current session storage data
      let tablePositions: any[] = [];
      let guestAssignments: any = {};
      
      try {
        const positionsData = sessionStorage.getItem('seating-chart-table-positions');
        const assignmentsData = sessionStorage.getItem('seating-chart-guest-assignments');
        
        if (positionsData) {
          tablePositions = JSON.parse(positionsData);
        }
        if (assignmentsData) {
          guestAssignments = JSON.parse(assignmentsData);
        }
        
      } catch (error) {
        console.warn('Could not load session storage data for save:', error);
      }
      
      // Update tables with positions and guest assignments
      const updatedTables = wizardState.tableLayout.tables.map(table => {
        const savedPosition = tablePositions.find(pos => pos.id === table.id);
        const assignedGuests = Object.keys(guestAssignments).filter(guestId => 
          guestAssignments[guestId].tableId === table.id
        );
        
        // Store guest assignments with coordinates for this table
        const guestAssignmentsForTable: Record<string, { x: number; y: number }> = {};
        assignedGuests.forEach(guestId => {
          const assignment = guestAssignments[guestId];
          if (assignment && assignment.position) {
            guestAssignmentsForTable[guestId] = assignment.position;
          }
        });
        
        // Convert TableType to Table (database format)
        return {
          id: table.id,
          name: table.name,
          type: table.type,
          capacity: table.capacity,
          position: savedPosition ? { x: savedPosition.x, y: savedPosition.y } : { x: 0, y: 0 },
          guests: assignedGuests,
          guestAssignments: guestAssignmentsForTable, // Store coordinates with guest IDs
          isActive: true
        };
      });
      
      // Update the chart with current wizard state
      const updatedChart = {
        ...chart,
        name: wizardState.chartName,
        eventType: wizardState.eventType,
        description: wizardState.description,
        guests: wizardState.guests,
        tables: updatedTables,
        tableCount: updatedTables.length,
        guestCount: wizardState.guests.length,
        guestGroups: wizardState.guestGroups,
        updatedAt: new Date()
      };
      
      // Save to Firestore
      const { updateDoc, doc } = await import('firebase/firestore');
      const { db } = await import('@/lib/firebase');
      const chartRef = doc(db, 'users', user.uid, 'seatingCharts', chart.id);
      await updateDoc(chartRef, updatedChart);
      
      // Update local state
      setChart(updatedChart);
      showSuccessToast('Chart saved successfully!');
    } catch (error) {
      console.error('Error saving chart:', error);
      showErrorToast('Failed to save chart');
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F8F6F4]">
        <WeddingBanner 
          daysLeft={weddingBannerData.daysLeft}
          userName={weddingBannerData.userName}
          isLoading={weddingBannerData.isLoading}
          onSetWeddingDate={weddingBannerData.handleSetWeddingDate}
        />
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#A85C36] mx-auto mb-4"></div>
            <p className="text-[#AB9C95]">Loading chart...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!chart) {
    return (
      <div className="min-h-screen bg-[#F8F6F4]">
        <WeddingBanner 
          daysLeft={weddingBannerData.daysLeft}
          userName={weddingBannerData.userName}
          isLoading={weddingBannerData.isLoading}
          onSetWeddingDate={weddingBannerData.handleSetWeddingDate}
        />
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <h1 className="text-2xl font-semibold text-[#332B42] mb-4">Chart not found</h1>
            <button
              onClick={handleBackToCharts}
              className="btn-primary"
            >
              Back to Charts
            </button>
          </div>
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

      {/* Main Content */}
      <div className="flex h-screen">
        {/* Sidebar - Chart List */}
        <div className="w-80 bg-white border-r border-[#AB9C95] flex flex-col">
          {/* Header */}
          <div className="p-6 border-b border-[#AB9C95]">
            <div className="flex items-center gap-4 mb-4">
              <button
                onClick={handleBackToCharts}
                className="text-[#A85C36] hover:text-[#8B4A2A] font-medium flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Charts
              </button>
            </div>
            <h1 className="h3 text-[#332B42]">{chart.name}</h1>
            <p className="text-sm text-[#AB9C95]">{chart.eventType}</p>
          </div>

          {/* Chart Stats */}
          <div className="p-6 border-b border-[#AB9C95]">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="flex items-center justify-center w-12 h-12 bg-[#F3F2F0] rounded-lg mx-auto mb-2">
                  <Users className="w-6 h-6 text-[#A85C36]" />
                </div>
                <div className="text-2xl font-semibold text-[#332B42]">{chart.guestCount}</div>
                <div className="text-xs text-[#AB9C95]">Guests</div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center w-12 h-12 bg-[#F3F2F0] rounded-lg mx-auto mb-2">
                  <Table className="w-6 h-6 text-[#A85C36]" />
                </div>
                <div className="text-2xl font-semibold text-[#332B42]">{chart.tableCount}</div>
                <div className="text-xs text-[#AB9C95]">Tables</div>
              </div>
            </div>
          </div>

          {/* Chart List Placeholder */}
          <div className="flex-1 p-6">
            <h3 className="text-sm font-medium text-[#332B42] mb-4">Your Charts</h3>
            <div className="space-y-2">
              <div className="p-3 bg-[#F3F2F0] rounded-lg border border-[#A85C36]">
                <div className="font-medium text-sm text-[#332B42]">{chart.name}</div>
                <div className="text-xs text-[#AB9C95]">Current chart</div>
              </div>
              {/* TODO: Add other charts here */}
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 bg-white flex flex-col">
          {/* Header with Tabs */}
          <div className="border-b border-[#AB9C95]">
            <div className="flex items-center justify-between px-6 py-4">
              <div className="flex space-x-8">
                <button
                  onClick={() => setActiveTab('guests')}
                  className={`pb-2 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'guests'
                      ? 'border-[#A85C36] text-[#A85C36]'
                      : 'border-transparent text-[#AB9C95] hover:text-[#332B42]'
                  }`}
                >
                  Guest List
                </button>
                <button
                  onClick={() => setActiveTab('layout')}
                  className={`pb-2 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'layout'
                      ? 'border-[#A85C36] text-[#A85C36]'
                      : 'border-transparent text-[#AB9C95] hover:text-[#332B42]'
                  }`}
                >
                  Table Layout
                </button>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
        handleSave();
                  }}
                  className="btn-primaryinverse flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Save
                </button>
                <button className="btn-primaryinverse flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  Settings
                </button>
              </div>
            </div>
          </div>

          {/* Tab Content */}
          <div className="flex-1 p-6">
            {activeTab === 'guests' ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="h4 text-[#332B42]">Guest List</h2>
                    <p className="text-sm text-[#AB9C95]">Manage your guest list and seating assignments</p>
                  </div>
                  <div className="text-sm text-[#7A7A7A]">
                    {chart.guestCount} guests • {chart.tableCount} tables
                  </div>
                </div>
                
                <div className="bg-white border border-[#E0DBD7] rounded-[5px] overflow-hidden">
                  <GuestListTableWithResizing
                    wizardState={wizardState}
                    guestColumns={guestColumns}
                    onUpdateGuest={updateGuest}
                    onRemoveGuest={removeGuest}
                    onUpdateColumn={updateColumn}
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="h4 text-[#332B42]">Table Layout</h2>
                    <p className="text-sm text-[#AB9C95]">Design and arrange your table layout</p>
                  </div>
                  <div className="text-sm text-[#7A7A7A]">
                    {chart.tableCount} tables • {chart.guestCount} guests
                  </div>
                </div>
                
                <div className="bg-white border border-[#E0DBD7] rounded-[5px] overflow-hidden">
                  <VisualTableLayoutSVG
                    tableLayout={wizardState.tableLayout}
                    onUpdate={(updates) => updateWizardState({ tableLayout: { ...wizardState.tableLayout, ...updates } })}
                    onAddTable={(newTable) => {
                      const updatedTables = [...wizardState.tableLayout.tables, newTable];
                      const totalCapacity = updatedTables.reduce((sum, t) => sum + t.capacity, 0);
                      updateWizardState({ tableLayout: { tables: updatedTables, totalCapacity } });
                    }}
                    guestCount={wizardState.guests.length}
                    guests={wizardState.guests}
                    onGuestAssignment={() => {}}
                    onRotationUpdate={(tableId, rotation) => {
                      // Update guest positions when table rotates
                      const tablePosition = JSON.parse(sessionStorage.getItem('seating-chart-table-positions') || '[]').find((p: any) => p.id === tableId);
                      const table = wizardState.tableLayout.tables.find(t => t.id === tableId);
                      const oldRotation = table?.rotation || 0;
                      const rotationDelta = rotation - oldRotation;
                      
                      if (tablePosition && Math.abs(rotationDelta) > 0.1) {
                        console.log('🔄 ROTATING GUEST POSITIONS:', { tableId, oldRotation, rotation, rotationDelta });
                        
                        // Convert rotation delta to radians
                        const rotationRad = (rotationDelta * Math.PI) / 180;
                        const cos = Math.cos(rotationRad);
                        const sin = Math.sin(rotationRad);
                        
                        // Get current guest assignments
                        const currentAssignments = JSON.parse(sessionStorage.getItem('seating-chart-guest-assignments') || '{}');
                        const newAssignments = { ...currentAssignments };
                        let hasChanges = false;
                        
                        Object.keys(newAssignments).forEach(guestId => {
                          const assignment = newAssignments[guestId];
                          if (assignment.tableId === tableId) {
                            // Calculate the guest's position relative to the table center
                            const relativeX = assignment.position.x - tablePosition.x;
                            const relativeY = assignment.position.y - tablePosition.y;
                            
                            // Rotate the relative position
                            const newRelativeX = relativeX * cos - relativeY * sin;
                            const newRelativeY = relativeX * sin + relativeY * cos;
                            
                            // Update the absolute position
                            newAssignments[guestId] = {
                              ...assignment,
                              position: {
                                x: tablePosition.x + newRelativeX,
                                y: tablePosition.y + newRelativeY
                              }
                            };
                            hasChanges = true;
                            
                            console.log('🔄 ROTATED GUEST POSITION:', {
                              guestId,
                              oldPosition: assignment.position,
                              newPosition: newAssignments[guestId].position,
                              relativeX,
                              relativeY,
                              newRelativeX,
                              newRelativeY
                            });
                          }
                        });
                        
                        if (hasChanges) {
                          sessionStorage.setItem('seating-chart-guest-assignments', JSON.stringify(newAssignments));
                        }
                      }
                      
                      const updatedTables = wizardState.tableLayout.tables.map(table => 
                        table.id === tableId ? { ...table, rotation } : table
                      );
                      const totalCapacity = updatedTables.reduce((sum, t) => sum + t.capacity, 0);
                      updateWizardState({ tableLayout: { tables: updatedTables, totalCapacity } });
                    }}
                    guestGroups={wizardState.guestGroups}
                    onEditGroup={() => {}}
                    profileImageUrl={profileImageUrl}
                    userName={userName}
                    partnerName={partnerName}
                    guestAssignments={(() => {
                      try {
                        const assignmentsData = sessionStorage.getItem('seating-chart-guest-assignments');
                        return assignmentsData ? JSON.parse(assignmentsData) : {};
                      } catch (error) {
                        console.warn('Could not load guest assignments:', error);
                        return {};
                      }
                    })()}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
