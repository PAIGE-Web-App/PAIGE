"use client";
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useParams } from 'next/navigation';
import { useCustomToast } from '@/hooks/useCustomToast';
import WeddingBanner from '@/components/WeddingBanner';
import { SeatingChart } from '@/types/seatingChart';
import { getSeatingChart } from '@/lib/seatingChartService';
import { ArrowLeft, Users, Table, Settings, Save, Plus, ChevronDown, Upload, X } from 'lucide-react';
import GuestListTableWithResizing from '@/components/seating-charts/GuestListTableWithResizing';
import TableLayoutStep from '@/components/seating-charts/TableLayoutStep';
import EditGroupModal from '@/components/seating-charts/EditGroupModal';
import { useWizardState } from '@/components/seating-charts/hooks/useWizardState';
import { useModalState } from '@/components/seating-charts/hooks/useModalState';
import { useUserProfileData } from '@/hooks/useUserProfileData';
import CSVUploadModal from '@/components/seating-charts/CSVUploadModal';
import { OptionsEditModal } from '@/components/seating-charts';
import AddColumnModal from '@/components/seating-charts/AddColumnModal';
import FamilyGroupingModal from '@/components/seating-charts/FamilyGroupingModal';
import { updateSeatingChart } from '@/lib/seatingChartService';

export default function SeatingChartDetailPage() {
  const { user, profileImageUrl } = useAuth();
  const { userName, partnerName } = useUserProfileData();
  const router = useRouter();
  const params = useParams();
  const { showSuccessToast, showErrorToast } = useCustomToast();
  
  const [chart, setChart] = useState<SeatingChart | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'guests' | 'layout'>('guests');
  const [showEditGroupModal, setShowEditGroupModal] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<{
    id: string;
    name: string;
    type: string;
    guestIds: string[];
  } | null>(null);
  const [showActionsDropdown, setShowActionsDropdown] = useState(false);
  const [showHowToUseModal, setShowHowToUseModal] = useState(false);
  const [editingChartName, setEditingChartName] = useState(false);
  const [editingChartNameValue, setEditingChartNameValue] = useState('');
  const [showFamilyGroupingModal, setShowFamilyGroupingModal] = useState(false);
  const [selectedGuestsForGrouping, setSelectedGuestsForGrouping] = useState<any[]>([]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showActionsDropdown) {
        const target = event.target as Element;
        if (!target.closest('.relative')) {
          setShowActionsDropdown(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showActionsDropdown]);
  
  // Initialize wizard state from chart data
  const {
    wizardState,
    updateWizardState,
    updateGuest,
    removeGuest,
    updateColumn,
    guestColumns,
    addGuest,
    addColumn,
    removeColumn,
    getGroupColor
  } = useWizardState();

  // Initialize modal state
  const {
    modalState,
    modalData,
    openModal,
    closeModal,
    openMealOptionsModal,
    openRelationshipOptionsModal,
    openColumnOptionsModal,
    openFamilyGroupingModal,
    closeAllModals
  } = useModalState();

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
            
            // Restore table positions and rotations from saved chart data
            if (chartData.tables && chartData.tables.length > 0) {
              const tablePositions = chartData.tables.map((table, index) => {
                if (table.position) {
                  return {
                    id: table.id,
                    x: table.position.x,
                    y: table.position.y,
                    rotation: table.rotation || 0 // Restore saved rotation
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
              console.log('Restored table positions and rotations:', tablePositions);
            }
            
            // Restore guest assignments from saved chart data
            if (chartData.tables) {
              const guestAssignments: any = {};
              
              chartData.tables.forEach(table => {
                if (table.guests && Array.isArray(table.guests)) {
                  table.guests.forEach((guestId) => {
                    // Use stored seat index if available, otherwise fall back to 0
                    let seatIndex = 0;
                    
                    if (table.guestAssignments && table.guestAssignments[guestId]) {
                      // Use the stored seat index for this specific guest
                      seatIndex = table.guestAssignments[guestId].seatIndex || 0;
                    }
                    
                    guestAssignments[guestId] = {
                      tableId: table.id,
                      seatIndex: seatIndex
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

  const handleEditGroup = (groupId: string) => {
    const group = wizardState.guestGroups?.find(g => g.id === groupId);
    if (group) {
      setSelectedGroup({
        id: group.id,
        name: group.name,
        type: group.type,
        guestIds: group.guestIds || []
      });
      setShowEditGroupModal(true);
    }
  };

  const handleUpdateGroup = (groupId: string, updates: {
    name: string;
    type: string;
    guestIds: string[];
  }) => {
    // Update the group in wizard state
    const updatedGroups = (wizardState.guestGroups || []).map(group => 
      group.id === groupId 
        ? { ...group, ...updates, type: updates.type as 'couple' | 'family' | 'extended' | 'friends' | 'other' }
        : group
    );
    
    updateWizardState({ guestGroups: updatedGroups });
    showSuccessToast(`Group "${updates.name}" updated successfully!`);
  };

  const handleDeleteGroup = (groupId: string) => {
    // Remove the group from wizard state
    const updatedGroups = (wizardState.guestGroups || []).filter(group => group.id !== groupId);
    
    // Also remove group associations from guests
    const updatedGuests = wizardState.guests.map(guest => ({
      ...guest,
      groupIds: (guest.groupIds || []).filter(id => id !== groupId)
    }));
    
    updateWizardState({ 
      guestGroups: updatedGroups,
      guests: updatedGuests
    });
    
    showSuccessToast('Group deleted successfully!');
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
      
      // Update tables with positions, rotation, and guest assignments
      const updatedTables = wizardState.tableLayout.tables.map(table => {
        const savedPosition = tablePositions.find(pos => pos.id === table.id);
        const assignedGuests = Object.keys(guestAssignments).filter(guestId => 
          guestAssignments[guestId].tableId === table.id
        );
        
        // Store guest assignments with seat indices for this table
        const guestAssignmentsForTable: Record<string, { seatIndex: number }> = {};
        assignedGuests.forEach(guestId => {
          const assignment = guestAssignments[guestId];
          if (assignment && assignment.seatIndex !== undefined) {
            guestAssignmentsForTable[guestId] = { seatIndex: assignment.seatIndex };
          }
        });
        
        // Convert TableType to Table (database format)
        return {
          id: table.id,
          name: table.name,
          type: table.type,
          capacity: table.capacity,
          position: savedPosition ? { x: savedPosition.x, y: savedPosition.y } : { x: 0, y: 0 },
          rotation: table.rotation || 0, // Save the rotation
          guests: assignedGuests,
          guestAssignments: guestAssignmentsForTable, // Store seat indices with guest IDs
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

  // Handle CSV upload
  const handleGuestsUploaded = (uploadedGuests: any[], customColumns?: any[]) => {
    // Convert uploaded guests to our format
    const convertedGuests = uploadedGuests.map(guest => ({
      id: `guest-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      fullName: guest.fullName || `${guest.firstName || ''} ${guest.lastName || ''}`.trim(),
      mealPreference: guest.mealPreference || '',
      relationship: guest.relationship || '',
      customFields: guest.customFields || {},
      tableId: null,
      seatNumber: null
    }));

    // Add new guests to existing guests instead of replacing
    updateWizardState({ guests: [...wizardState.guests, ...convertedGuests] });
    
    closeModal('csvUpload');
    showSuccessToast(`${convertedGuests.length} guests added successfully`);
  };

  // Handle meal options modal
  const handleMealOptionsSave = (options: string[]) => {
    // Update relationship options in the appropriate column
    const relationshipColumn = guestColumns.find(col => col.key === 'mealPreference');
    if (relationshipColumn) {
      updateColumn(relationshipColumn.id, { options });
    }
    closeModal('mealOptions');
    showSuccessToast('Meal options updated successfully');
  };

  // Handle relationship options modal
  const handleRelationshipOptionsSave = (options: string[]) => {
    // Update relationship options in the appropriate column
    const relationshipColumn = guestColumns.find(col => col.key === 'relationship');
    if (relationshipColumn) {
      updateColumn(relationshipColumn.id, { options });
    }
    closeModal('relationshipOptions');
    showSuccessToast('Relationship options updated successfully');
  };

  // Handle chart name editing
  const handleRenameChart = async () => {
    if (!chart || !user) return;
    
    const trimmedName = editingChartNameValue.trim();
    if (!trimmedName) {
      showErrorToast('Chart name cannot be empty.');
      setEditingChartNameValue(chart.name);
      setEditingChartName(false);
      return;
    }

    if (trimmedName === chart.name) {
      setEditingChartName(false);
      return;
    }

    try {
      // Update the chart name using the service
      await updateSeatingChart(chart.id, { name: trimmedName }, user.uid);
      
      // Update local state
      setChart({ ...chart, name: trimmedName });
      setEditingChartName(false);
      showSuccessToast('Chart renamed successfully!');
    } catch (error: any) {
      console.error('Error renaming chart:', error);
      showErrorToast(`Failed to rename chart: ${error.message}`);
      setEditingChartNameValue(chart.name);
      setEditingChartName(false);
    }
  };

  // Handle family grouping
  const handleShowLinkUsersModal = (selectedGuestIds: string[]) => {
    const selectedGuests = wizardState.guests.filter(guest => selectedGuestIds.includes(guest.id));
    setSelectedGuestsForGrouping(selectedGuests);
    setShowFamilyGroupingModal(true);
  };

  const handleCreateFamilyGroup = (groupData: { name: string; type: string; memberIds: string[] }) => {
    // Create a new family group
    const newGroup = {
      id: `group-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: groupData.name,
      type: groupData.type as 'couple' | 'family' | 'extended' | 'friends' | 'other',
      guestIds: groupData.memberIds,
      createdAt: new Date()
    };
    
    updateWizardState({
      guestGroups: [...(wizardState.guestGroups || []), newGroup]
    });
    
    setShowFamilyGroupingModal(false);
    setSelectedGuestsForGrouping([]);
    showSuccessToast('Family group created successfully!');
  };

  const handleAddToExistingGroup = (groupId: string, guestIds: string[]) => {
    // Add guests to existing group
    const updatedGroups = (wizardState.guestGroups || []).map(group => {
      if (group.id === groupId) {
        return {
          ...group,
          guestIds: [...group.guestIds, ...guestIds]
        };
      }
      return group;
    });
    
    updateWizardState({ guestGroups: updatedGroups });
    setShowFamilyGroupingModal(false);
    setSelectedGuestsForGrouping([]);
    showSuccessToast('Guests added to group successfully!');
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
        <WeddingBanner />
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
        <WeddingBanner />
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
    <div className="min-h-screen bg-linen">
      {/* Wedding Banner */}
      <WeddingBanner />

      {/* Main Content Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8" style={{ width: '100%', maxWidth: '1400px' }}>
        {/* Chart Header */}
        <div className="flex items-center justify-between py-6 px-0 lg:px-4 bg-[#F3F2F0] border-b border-[#AB9C95] sticky top-0 z-20 shadow-sm" style={{ minHeight: 80, borderBottomWidth: '0.5px' }}>
          <div className="flex items-center gap-4">
            <button
              onClick={handleBackToCharts}
              className="p-1 hover:bg-[#EBE3DD] rounded-[5px] transition-colors flex-shrink-0"
              aria-label="Back to previous page"
            >
              <ArrowLeft className="w-5 h-5 text-[#AB9C95]" />
            </button>
            <div className="flex items-center gap-2">
              <div
                className="relative flex items-center transition-all duration-300"
                style={{
                  width: editingChartName ? '240px' : 'auto',
                  minWidth: editingChartName ? '240px' : 'auto',
                }}
              >
                <h1
                  className={`h3 text-[#332B42] transition-opacity duration-300 truncate max-w-[300px] ${
                    editingChartName ? 'opacity-0' : 'opacity-100'
                  }`}
                  title={chart.name}
                >
                  {chart.name}
                </h1>
                <input
                  type="text"
                  value={editingChartNameValue || ''}
                  onChange={(e) => setEditingChartNameValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleRenameChart();
                    } else if (e.key === 'Escape') {
                      setEditingChartName(false);
                      setEditingChartNameValue('');
                    }
                  }}
                  onBlur={() => {
                    if (editingChartNameValue) {
                      handleRenameChart();
                    } else {
                      setEditingChartName(false);
                      setEditingChartNameValue('');
                    }
                  }}
                  className={`absolute left-0 w-full h-8 px-2 border border-[#D6D3D1] rounded-[5px] bg-white text-sm focus:outline-none focus:border-[#A85C36] transition-all duration-300 ${
                    editingChartName
                      ? 'opacity-100 pointer-events-auto'
                      : 'opacity-0 pointer-events-none'
                  }`}
                  autoFocus
                />
              </div>
              <button
                onClick={() => {
                  setEditingChartName(true);
                  setEditingChartNameValue(chart.name);
                }}
                className="p-1 hover:bg-[#EBE3DD] rounded-[5px]"
                title="Rename Chart"
              >
                <span className="inline-block align-middle text-[#AB9C95] -scale-x-100">
                  ✏️
                </span>
              </button>
            </div>
          </div>
          
          {/* Chart Stats */}
          <div className="flex items-center gap-6">
            <div className="text-center">
              <div className="text-2xl font-semibold text-[#332B42] font-work">{chart.guestCount}</div>
              <div className="text-xs text-[#AB9C95] font-work">Guests</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-semibold text-[#332B42] font-work">{chart.tableCount}</div>
              <div className="text-xs text-[#AB9C95] font-work">Tables</div>
            </div>
            <button
              onClick={() => {
                handleSave();
              }}
              className="btn-primaryinverse flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              Save
            </button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex flex-col">
          {/* Header with Tabs */}
          <div>
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
            </div>
          </div>

          {/* Guest List Header - Only show when guests tab is active */}
          {activeTab === 'guests' && (
            <div className="px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => setShowHowToUseModal(true)}
                    className="flex items-center gap-1 text-sm text-gray-500 hover:text-[#A85C36] transition-colors"
                  >
                    <div className="w-4 h-4 bg-gray-300 rounded-full flex items-center justify-center">
                      <span className="text-xs">?</span>
                    </div>
                    <span>How to use your guest list</span>
                  </button>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <button 
                      onClick={() => setShowActionsDropdown(!showActionsDropdown)}
                      className="btn-primaryinverse flex items-center gap-2"
                    >
                      <Settings className="w-4 h-4" />
                      More Actions
                      <ChevronDown className="w-4 h-4" />
                    </button>
                    
                    {showActionsDropdown && (
                      <div className="absolute right-0 top-full mt-1 bg-white border border-[#E0DBD7] rounded-[5px] shadow-lg z-50 min-w-[180px]">
                        <div className="py-1">
                          <button
                            onClick={() => {
                              openModal('csvUpload');
                              setShowActionsDropdown(false);
                            }}
                            className="w-full px-3 py-2 text-sm text-[#332B42] hover:bg-[#F8F6F4] text-left flex items-center gap-2 whitespace-nowrap"
                          >
                            <Upload className="w-4 h-4" />
                            Upload CSV
                          </button>
                          <button
                            onClick={() => {
                              openModal('addColumn');
                              setShowActionsDropdown(false);
                            }}
                            className="w-full px-3 py-2 text-sm text-[#332B42] hover:bg-[#F8F6F4] text-left flex items-center gap-2 whitespace-nowrap"
                          >
                            <Settings className="w-4 h-4" />
                            Manage Columns
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                  <button 
                    onClick={() => addGuest({ fullName: '', mealPreference: '', relationship: '', customFields: {} })}
                    className="btn-primary flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add Guest
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Tab Content */}
          <div className="flex-1 flex flex-col min-h-0">
            {activeTab === 'guests' ? (
              <div className="flex flex-col" style={{ height: '60vh' }}>
                <div className="flex-1 overflow-y-auto">
                  <GuestListTableWithResizing
                    wizardState={wizardState}
                    guestColumns={guestColumns}
                    onUpdateGuest={updateGuest}
                    onRemoveGuest={removeGuest}
                    onUpdateColumn={updateColumn}
                    onEditGroup={handleEditGroup}
                    onShowMealOptionsModal={openMealOptionsModal}
                    onShowRelationshipOptionsModal={openRelationshipOptionsModal}
                    onShowLinkUsersModal={handleShowLinkUsersModal}
                  />
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col">
                <div className="flex-1">
                  <TableLayoutStep
                    tableLayout={wizardState.tableLayout}
                    onUpdate={(updates) => updateWizardState({ tableLayout: { ...wizardState.tableLayout, ...updates } })}
                    guestCount={wizardState.guests.length}
                    guests={wizardState.guests}
                    guestGroups={wizardState.guestGroups || []}
                    onEditGroup={handleEditGroup}
                    onGuestAssignment={(guestId: string, tableId: string, seatIndex: number) => {
                      // Update guest assignment in wizard state
                      const updatedGuests = wizardState.guests.map(guest =>
                        guest.id === guestId 
                          ? { ...guest, tableId, seatNumber: seatIndex } // Use the actual seat index
                          : guest
                      );
                      updateWizardState({ guests: updatedGuests });
                    }}
                    profileImageUrl={profileImageUrl}
                    userName={userName}
                    partnerName={partnerName}
                  />
                </div>
                <div className="py-3 px-0 lg:px-4">
                  {/* Bottom padding */}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Group Modal */}
      <EditGroupModal
        isOpen={showEditGroupModal}
        onClose={() => {
          setShowEditGroupModal(false);
          setSelectedGroup(null);
        }}
        group={selectedGroup}
        allGuests={wizardState.guests.map(guest => ({
          id: guest.id,
          fullName: guest.fullName
        }))}
        onUpdateGroup={handleUpdateGroup}
        onDeleteGroup={handleDeleteGroup}
      />

      {/* CSV Upload Modal */}
      <CSVUploadModal
        isOpen={modalState.csvUpload}
        onClose={() => closeModal('csvUpload')}
        onGuestsUploaded={handleGuestsUploaded}
      />

      {/* Meal Options Modal */}
      <OptionsEditModal
        isOpen={modalState.mealOptions}
        onClose={() => closeModal('mealOptions')}
        title="Edit Meal Preference Options"
        placeholder="Beef\nChicken\nFish\nVegetarian\nVegan\nGluten-Free"
        initialOptions={modalData.mealOptions}
        onSave={handleMealOptionsSave}
        rows={6}
      />

      {/* Relationship Options Modal */}
      <OptionsEditModal
        isOpen={modalState.relationshipOptions}
        onClose={() => closeModal('relationshipOptions')}
        title="Edit Relationship to You Options"
        placeholder="Bride's Family\nGroom's Family\nBride's Friends\nGroom's Friends\nWork Colleagues\nCollege Friends\nChildhood Friends\nNeighbors\nOther"
        initialOptions={modalData.relationshipOptions}
        onSave={handleRelationshipOptionsSave}
        rows={8}
      />

      {/* Add Column Modal */}
      <AddColumnModal
        isOpen={modalState.addColumn}
        onClose={() => closeModal('addColumn')}
        onAddColumn={addColumn}
        guestColumns={guestColumns}
        onToggleColumnVisibility={(columnId: string) => {
          const column = guestColumns.find(col => col.id === columnId);
          if (column) {
            // For now, just remove the column to hide it
            // In the future, we could add an isVisible property
            removeColumn(columnId);
          }
        }}
      />

      {/* Family Grouping Modal */}
      <FamilyGroupingModal
        isOpen={showFamilyGroupingModal}
        onClose={() => {
          setShowFamilyGroupingModal(false);
          setSelectedGuestsForGrouping([]);
        }}
        selectedGuests={selectedGuestsForGrouping}
        allGuests={wizardState.guests}
        onCreateFamilyGroup={handleCreateFamilyGroup}
        existingGroups={wizardState.guestGroups || []}
        onAddToExistingGroup={handleAddToExistingGroup}
      />

      {/* Help Modal */}
      {showHowToUseModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-[5px] shadow-xl max-w-xl w-full p-6 relative">
            {/* Header row with title and close button */}
            <div className="flex items-center justify-between mb-4">
              <h5 className="h5 text-left">How to use your guest list</h5>
              <button
                onClick={() => setShowHowToUseModal(false)}
                className="text-[#7A7A7A] hover:text-[#332B42] p-1 rounded-full"
                title="Close"
              >
                <X size={20} />
              </button>
            </div>

            {/* Description */}
            <div className="mb-6">
              <p className="text-sm text-gray-600 text-left">
                Learn how to make the most of your guest list to help Paige create the perfect seating arrangement for your event.
              </p>
            </div>

            <div className="mb-6">
              <h6 className="font-medium text-[#332B42] mb-3">Key features:</h6>
              <ul className="space-y-2">
                <li className="flex items-start text-sm text-gray-600">
                  <div className="w-2 h-2 bg-[#A85C36] rounded-full mr-3 mt-2 flex-shrink-0"></div>
                  <div>
                    <strong>Link Guests Together:</strong> Select multiple guests and group them to help Paige understand family relationships and seating preferences.
                  </div>
                </li>
                <li className="flex items-start text-sm text-gray-600">
                  <div className="w-2 h-2 bg-[#A85C36] rounded-full mr-3 mt-2 flex-shrink-0"></div>
                  <div>
                    <strong>Add Detailed Notes:</strong> Include dietary restrictions, accessibility needs, or personality traits to help create optimal seating.
                  </div>
                </li>
                <li className="flex items-start text-sm text-gray-600">
                  <div className="w-2 h-2 bg-[#A85C36] rounded-full mr-3 mt-2 flex-shrink-0"></div>
                  <div>
                    <strong>AI-Powered Seating:</strong> Paige analyzes your guest data to automatically create seating arrangements that work for everyone.
                  </div>
                </li>
                <li className="flex items-start text-sm text-gray-600">
                  <div className="w-2 h-2 bg-[#A85C36] rounded-full mr-3 mt-2 flex-shrink-0"></div>
                  <div>
                    <strong>Custom Columns:</strong> Add your own fields like meal preferences, relationship to you, or special requirements.
                  </div>
                </li>
              </ul>
            </div>

            <div className="flex justify-center">
              <button
                onClick={() => setShowHowToUseModal(false)}
                className="btn-primary px-6 py-2 text-sm"
              >
                Got it!
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
