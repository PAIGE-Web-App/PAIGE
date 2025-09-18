"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, X, Plus, Upload, Settings, ChevronDown, ChevronUp, HelpCircle, Link, StickyNote, Sparkles } from 'lucide-react';
import WizardSidebar from '@/components/seating-charts/WizardSidebar';
import ChartDetailsForm from '@/components/seating-charts/ChartDetailsForm';
import GuestListTableWithResizing from '@/components/seating-charts/GuestListTableWithResizing';
import TableLayoutStep from '@/components/seating-charts/TableLayoutStep';
import { useWizardState } from '@/components/seating-charts/hooks/useWizardState';
import { useModalState } from '@/components/seating-charts/hooks/useModalState';
import CSVUploadModal from '@/components/seating-charts/CSVUploadModal';
import AddColumnModal from '@/components/seating-charts/AddColumnModal';
import { OptionsEditModal } from '@/components/seating-charts/components/OptionsEditModal';
import FamilyGroupingModal from '@/components/seating-charts/FamilyGroupingModal';
import EditGroupModal from '@/components/seating-charts/EditGroupModal';

import { useCustomToast } from '@/hooks/useCustomToast';
import { useGlobalCompletionToasts } from '@/hooks/useGlobalCompletionToasts';
import { SeatingChart } from '@/types/seatingChart';
import BadgeCount from '@/components/BadgeCount';
import { saveSeatingChart, getSeatingCharts, updateSeatingChart } from '@/lib/seatingChartService';
import { useAuth } from '@/contexts/AuthContext';

export default function CreateSeatingChartPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { showSuccessToast, showErrorToast } = useCustomToast();
  const { showCompletionToast } = useGlobalCompletionToasts();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  
  // Family grouping modal state
  const [showFamilyGroupingModal, setShowFamilyGroupingModal] = useState(false);
  const [selectedGuestsForGrouping, setSelectedGuestsForGrouping] = useState<any[]>([]);
  const [showEditGroupModal, setShowEditGroupModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState<any>(null);
  const [showActionsDropdown, setShowActionsDropdown] = useState(false);
  const [showValidationErrors, setShowValidationErrors] = useState(false);
  const [clearTableSelection, setClearTableSelection] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showExitConfirmModal, setShowExitConfirmModal] = useState(false);
  const [editingChartId, setEditingChartId] = useState<string | null>(null);
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showActionsDropdown) {
        setShowActionsDropdown(false);
      }
    };
    
    if (showActionsDropdown) {
      document.addEventListener('click', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [showActionsDropdown]);

  // Use our optimized hooks
  const {
    wizardState,
    guestColumns,
    areChartDetailsComplete,
    canProceedToNext,
    updateWizardState,
    updateTableLayout,
    addGuest,
    updateGuest,
    removeGuest,
    updateColumn,
    removeColumn,
    addColumn,
    reorderColumns,
    getCellValue,
    clearStoredState,
    handleColumnResize,
    toggleColumnVisibility,
    createGuestGroup,
    removeGuestGroup,
    getGroupColor,
    getGuestGroups,
    addGuestsToGroup,
    updateGuestGroup
  } = useWizardState();

  // Warn user before page refresh/close if they have unsaved data
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Check if there's meaningful data that would be lost
      const hasData = wizardState.chartName.trim() || wizardState.guests.length > 0;
      
      if (hasData) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return 'You have unsaved changes. Are you sure you want to leave?';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [wizardState.chartName, wizardState.guests.length]);


  const {
    modalState,
    modalData,
    openModal,
    closeModal,
    openMealOptionsModal,
    openRelationshipOptionsModal,
    openColumnOptionsModal,
    closeAllModals
  } = useModalState();

  // Navigation functions
  const goToStep = (step: number) => {
    setCurrentStep(step);
  };

  const goToNextStep = () => {
    if (currentStep === 1) {
      // For step 1, validate chart name and guest information
      if (!wizardState.chartName.trim()) {
        setShowValidationErrors(true);
        showErrorToast('Please enter a chart name before proceeding.');
        return;
      }
      
      // Validate that all guests have required fields
      const guestsWithMissingNames = wizardState.guests.filter(guest => !guest.fullName.trim());
      if (guestsWithMissingNames.length > 0) {
        setShowValidationErrors(true);
        showErrorToast(`Please fill in the full name for ${guestsWithMissingNames.length} guest${guestsWithMissingNames.length === 1 ? '' : 's'} before proceeding.`);
        return;
      }
      
      setShowValidationErrors(false);
      setCurrentStep(2); // Go directly to Table Layout step (now the final step)
    }
  };

  const goToPreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    } else {
      clearStoredState();
      router.push('/seating-charts');
    }
  };

  const handleCloseWizard = () => {
    const hasData = wizardState.chartName.trim() || wizardState.guests.length > 0;
    if (hasData) {
      setShowExitConfirmModal(true);
    } else {
      clearStoredState();
      router.push('/seating-charts');
    }
  };

  const handleSaveAndClose = async () => {
    await handleSaveChart();
    clearStoredState();
    router.push('/seating-charts');
  };

  const handleConfirmExit = () => {
    clearStoredState();
    setShowExitConfirmModal(false);
    router.push('/seating-charts');
  };

  // Handle CSV upload
    const handleGuestsUploaded = (uploadedGuests: any[], customColumns?: any[]) => {
    // Collect new options from CSV upload
    const newRelationshipOptions: string[] = [];
    const newMealPreferenceOptions: string[] = [];
    
    // Find current options
    const currentRelationshipOptions = guestColumns.find(col => col.id === 'relationship')?.options || [];
    const currentMealPreferenceOptions = guestColumns.find(col => col.id === 'mealPreference')?.options || [];
    
    // Check for new options in uploaded guests
    uploadedGuests.forEach(guest => {
      if (guest.relationship && !currentRelationshipOptions.includes(guest.relationship)) {
        newRelationshipOptions.push(guest.relationship);
      }
      if (guest.mealPreference && !currentMealPreferenceOptions.includes(guest.mealPreference)) {
        newMealPreferenceOptions.push(guest.mealPreference);
      }
    });
    
    // Auto-add new options to columns
    if (newRelationshipOptions.length > 0) {
      const updatedRelationshipOptions = [...currentRelationshipOptions, ...newRelationshipOptions];
      updateColumn('relationship', { options: updatedRelationshipOptions });
    }
    
    if (newMealPreferenceOptions.length > 0) {
      const updatedMealPreferenceOptions = [...currentMealPreferenceOptions, ...newMealPreferenceOptions];
      updateColumn('mealPreference', { options: updatedMealPreferenceOptions });
    }
    
    // Process family/plus ones and create additional guests
    const allGuests: any[] = [];
    let familyMembersCreated = 0;
    
    uploadedGuests.forEach(guest => {
      // Add the primary guest
      const primaryGuest = {
        id: `guest-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        fullName: guest.fullName || `${guest.firstName || ''} ${guest.lastName || ''}`.trim(),
        mealPreference: guest.mealPreference || '',
        relationship: guest.relationship || '',
        notes: guest.notes || '',
        customFields: guest.customFields || {},
        tableId: null,
        seatNumber: null
      };
      allGuests.push(primaryGuest);
      
      // Process family/plus ones if they exist
      if (guest.customFields?.familyPlusOnes) {
        const familyNames = guest.customFields.familyPlusOnes
          .split(',')
          .map(name => name.trim())
          .filter(name => name.length > 0);
        
        familyNames.forEach(familyName => {
          const familyGuest = {
            id: `guest-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            fullName: familyName,
            mealPreference: guest.mealPreference || '', // Inherit meal preference
            relationship: 'Family Member',
            notes: `Plus one of ${guest.fullName}`,
            customFields: {
              ...guest.customFields,
              primaryGuestId: primaryGuest.id,
              isFamilyMember: 'true'
            },
            tableId: null,
            seatNumber: null
          };
          allGuests.push(familyGuest);
          familyMembersCreated++;
        });
      }
    });
  
    // Add new guests to existing guests instead of replacing
    const updatedGuests = [...wizardState.guests, ...allGuests];
    
    // If this is the first import and we now have multiple guests, make the first guest removable
    if (wizardState.guests.length === 1 && allGuests.length > 0) {
      updatedGuests[0] = { ...updatedGuests[0], isRemovable: true };
    }
    
    updateWizardState({ guests: updatedGuests });
    
    // Add custom columns if any were detected
    if (customColumns && customColumns.length > 0) {
      customColumns.forEach(customColumn => {
        addColumn(customColumn);
      });
      console.log(`Added ${customColumns.length} custom columns from CSV upload`);
    }
    
    closeModal('csvUpload');
    
    // Show success message with new options and family info
    let message = `${allGuests.length} guests added successfully!`;
    if (newRelationshipOptions.length > 0) {
      message += ` Added ${newRelationshipOptions.length} new relationship option${newRelationshipOptions.length === 1 ? '' : 's'}: ${newRelationshipOptions.join(', ')}`;
    }
    if (newMealPreferenceOptions.length > 0) {
      message += ` Added ${newMealPreferenceOptions.length} new meal preference option${newMealPreferenceOptions.length === 1 ? '' : 's'}: ${newMealPreferenceOptions.join(', ')}`;
    }
    if (familyMembersCreated > 0) {
      message += ` Created ${familyMembersCreated} additional family/plus one guest${familyMembersCreated === 1 ? '' : 's'}`;
    }
    showSuccessToast(message);
  };

  // Handle modal saves
  const handleMealOptionsSave = (options: string[]) => {
    updateColumn('mealPreference', { options });
    closeModal('mealOptions');
  };

  const handleRelationshipOptionsSave = (options: string[]) => {
    updateColumn('relationship', { options });
    closeModal('relationshipOptions');
  };

  const handleColumnOptionsSave = (options: string[]) => {
    updateColumn(modalData.columnId, { options });
    closeModal('columnOptions');
  };
  
  
  // Handle showing the link users modal
  const handleShowLinkUsersModal = (selectedGuestIds: string[]) => {
    const guests = wizardState.guests.filter(g => selectedGuestIds.includes(g.id));
    setSelectedGuestsForGrouping(guests);
    setShowFamilyGroupingModal(true);
  };
  
  // Handle creating family group from modal
  const handleCreateFamilyGroup = (groupData: { name: string; type: string; memberIds: string[] }) => {
    createGuestGroup({
      name: groupData.name,
      type: groupData.type as 'couple' | 'family' | 'extended' | 'friends' | 'other',
      memberIds: groupData.memberIds
    });
    showSuccessToast(`Created ${groupData.type} group: ${groupData.name} with ${groupData.memberIds.length} members`);
    setShowFamilyGroupingModal(false);
    setSelectedGuestsForGrouping([]);
    // Clear table selection
    setClearTableSelection(true);
    setTimeout(() => setClearTableSelection(false), 100);
  };

  // Handle adding guests to existing group
  const handleAddToExistingGroup = (groupId: string, guestIds: string[]) => {
    addGuestsToGroup(groupId, guestIds);
    const group = wizardState.guestGroups.find(g => g.id === groupId);
    showSuccessToast(`Added ${guestIds.length} guest${guestIds.length === 1 ? '' : 's'} to ${group?.name || 'group'}`);
    setShowFamilyGroupingModal(false);
    setSelectedGuestsForGrouping([]);
    // Clear table selection
    setClearTableSelection(true);
    setTimeout(() => setClearTableSelection(false), 100);
  };

  const handleEditGroup = (groupId: string) => {
    const group = wizardState.guestGroups.find(g => g.id === groupId);
    if (group) {
      setEditingGroup(group);
      setShowEditGroupModal(true);
    }
  };

  const handleUpdateGroup = (groupId: string, updates: {
    name: string;
    type: 'couple' | 'family' | 'extended' | 'friends' | 'other';
    guestIds: string[];
  }) => {
    updateGuestGroup(groupId, updates);
    showSuccessToast(`Updated group: ${updates.name}`);
    setShowEditGroupModal(false);
    setEditingGroup(null);
  };

  const handleDeleteGroup = (groupId: string) => {
    removeGuestGroup(groupId);
    showSuccessToast('Group deleted successfully');
    setShowEditGroupModal(false);
    setEditingGroup(null);
  };

  // Save chart
  const handleSaveChart = async () => {
    if (!wizardState.chartName.trim()) {
      showErrorToast('Please enter a chart name before saving.');
      return;
    }

    if (!user) {
      showErrorToast('Please log in to save charts.');
      return;
    }

    setIsLoading(true);
    try {
      // Check if a chart with this name already exists
      const existingCharts = await getSeatingCharts(user.uid);
      const existingChart = existingCharts.find(chart => chart.name === wizardState.chartName);

      // Get current layout data from session storage
      let savedPositions: any[] = [];
      let savedAssignments: any = {};
      
      try {
        const positionsData = sessionStorage.getItem('seating-chart-table-positions');
        const assignmentsData = sessionStorage.getItem('seating-chart-guest-assignments');
        
        if (positionsData) {
          savedPositions = JSON.parse(positionsData);
        }
        if (assignmentsData) {
          savedAssignments = JSON.parse(assignmentsData);
        }
      } catch (error) {
        console.warn('Could not load session storage data for save:', error);
      }


      const chartData: Omit<SeatingChart, 'id'> = {
        name: wizardState.chartName,
        eventType: wizardState.eventType,
        description: wizardState.description || '',
        venueName: '',
        venueImage: '',
        guestCount: wizardState.guests.length,
        tableCount: wizardState.tableLayout.tables.length,
        tables: wizardState.tableLayout.tables.map(table => {
          const savedPosition = savedPositions.find((p: any) => p.id === table.id);
          const assignedGuests = Object.keys(savedAssignments).filter(guestId => 
            savedAssignments[guestId].tableId === table.id
          );
          
          // Store guest assignments with seat indices for this table
          const guestAssignmentsForTable: Record<string, { seatIndex: number }> = {};
          assignedGuests.forEach(guestId => {
            const assignment = savedAssignments[guestId];
            if (assignment && assignment.seatIndex !== undefined) {
              guestAssignmentsForTable[guestId] = { seatIndex: assignment.seatIndex };
            }
          });
          
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
        }),
        guests: wizardState.guests,
        guestGroups: wizardState.guestGroups || [],
        seatingRules: [],
        isActive: true,
        isTemplate: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      if (existingChart) {
        // Update existing chart
        await updateSeatingChart(existingChart.id, chartData, user.uid);
        setEditingChartId(existingChart.id);
        showSuccessToast('Chart updated successfully!');
      } else {
        // Create new chart
        const chartId = await saveSeatingChart(chartData, user.uid);
        setEditingChartId(chartId);
        showSuccessToast('Chart saved successfully!');
        
        // Show completion toast for creating first seating chart
        showCompletionToast('seating-chart');
      }
    } catch (error) {
      console.error('Save chart error:', error);
      showErrorToast('Failed to save chart. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Create chart
  const handleCreateChart = async () => {
    setIsLoading(true);
    try {
      // TODO: Implement chart creation logic
      const chart: SeatingChart = {
        id: `chart-${Date.now()}`,
        name: wizardState.chartName,
        eventType: wizardState.eventType,
        description: wizardState.description || '',
        venueName: '',
        venueImage: '',
        guestCount: wizardState.guests.length,
        tableCount: wizardState.tableLayout.tables.length,
        tables: wizardState.tableLayout.tables.map(table => ({
          id: table.id,
          name: table.name,
          type: table.type,
          capacity: table.capacity,
          position: { x: 0, y: 0 }, // Default position
          guests: [], // No guests assigned yet
          isActive: true
        })),
        guests: wizardState.guests,
        seatingRules: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        isActive: true,
        isTemplate: false
      };
      
      // TODO: Save chart to database
      console.log('Chart created:', chart);
      
      showSuccessToast('Seating chart created successfully!');
      
      // Clear stored wizard state
      clearStoredState();
      
      // Redirect back to seating charts list
      router.push('/seating-charts');
    } catch (error) {
      showErrorToast('Failed to create seating chart');
      console.error('Chart creation error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, guestId: string) => {
    e.dataTransfer.setData('text/plain', guestId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDragEnd = (e: React.DragEvent) => {
    e.preventDefault();
  };

  // Column drag and drop handlers
  const handleColumnDragStart = (e: React.DragEvent, columnId: string) => {
    e.dataTransfer.setData('text/plain', columnId);
    e.dataTransfer.effectAllowed = 'move';
    
    // Add visual feedback for dragged column using CSS classes
    const target = e.currentTarget as HTMLElement;
    target.classList.add('column-drag-active');
    target.style.transition = 'none'; // Disable transitions during drag
    
    // Store the original position for smooth animation
    const rect = target.getBoundingClientRect();
    target.dataset.originalX = rect.left.toString();
    
    // Add a custom drag image
    const dragImage = target.cloneNode(true) as HTMLElement;
    dragImage.style.transform = 'rotate(2deg)';
    dragImage.style.opacity = '0.8';
    document.body.appendChild(dragImage);
    e.dataTransfer.setDragImage(dragImage, e.clientX - rect.left, 20);
    
    // Clean up the drag image after a short delay
    setTimeout(() => {
      if (document.body.contains(dragImage)) {
        document.body.removeChild(dragImage);
      }
    }, 0);
  };

  const handleColumnDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    // Add visual feedback for drop target using CSS class
    const target = e.currentTarget as HTMLElement;
    target.classList.add('column-drop-target');
  };

  const handleColumnDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    
    // Reset visual feedback for drop target
    const target = e.currentTarget as HTMLElement;
    target.classList.remove('column-drop-target');
  };

  const handleColumnDrop = (e: React.DragEvent, targetColumnId: string) => {
    e.preventDefault();
    const draggedColumnId = e.dataTransfer.getData('text/plain');
    
    // Reset visual feedback for drop target
    const target = e.currentTarget as HTMLElement;
    target.classList.remove('column-drop-target');
    
    if (draggedColumnId && draggedColumnId !== targetColumnId) {
      // Create smooth animation for column reordering
      const allHeaders = document.querySelectorAll('th[draggable="true"]');
      const allRows = document.querySelectorAll('tbody tr');
      
      // Add a brief delay to allow the state update to complete
      setTimeout(() => {
        // Re-enable transitions for smooth animation
        allHeaders.forEach(header => {
          const headerElement = header as HTMLElement;
          headerElement.classList.add('column-transition-smooth');
        });
        
        allRows.forEach(row => {
          const rowElement = row as HTMLElement;
          const cells = rowElement.querySelectorAll('td:not(:first-child)'); // Exclude Full Name column
          cells.forEach(cell => {
            const cellElement = cell as HTMLElement;
            cellElement.classList.add('column-transition-smooth');
          });
        });
        
        // Use the reorderColumns function from the hook
        reorderColumns(draggedColumnId, targetColumnId);
      }, 50);
    }
  };

  const handleColumnDragEnd = (e: React.DragEvent) => {
    e.preventDefault();
    
    // Reset visual feedback for dragged column
    const target = e.currentTarget as HTMLElement;
    target.classList.remove('column-drag-active');
    target.classList.add('column-transition');
    
    // Reset any drop target styling
    const allHeaders = document.querySelectorAll('th[draggable="true"]');
    allHeaders.forEach(header => {
      const headerElement = header as HTMLElement;
      headerElement.classList.remove('column-drop-target');
      headerElement.classList.add('column-transition');
    });
    
    // Ensure all table cells have smooth transitions
    const allRows = document.querySelectorAll('tbody tr');
    allRows.forEach(row => {
      const rowElement = row as HTMLElement;
      const cells = rowElement.querySelectorAll('td:not(:first-child)'); // Exclude Full Name column
      cells.forEach(cell => {
        const cellElement = cell as HTMLElement;
        cellElement.classList.add('column-transition');
      });
    });
  };

  // Step titles
  const steps = [
    { id: 1, name: 'Guest Information' },
    { id: 2, name: 'Table Layout' },
    { id: 3, name: 'AI Organization' }
  ];

  // Get current step title
  const getCurrentStepTitle = () => {
    return steps.find(step => step.id === currentStep)?.name || '';
  };



  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div 
            className="bg-white rounded-[5px] border border-[#AB9C95] p-6 mb-6 flex flex-col overflow-hidden"
            style={{ 
              height: 'calc(100vh - 200px)', // Fixed height - won't grow with content
              minHeight: '600px'
            }}
          >
            {/* Chart Details Form */}
            <ChartDetailsForm
              wizardState={wizardState}
              onUpdate={updateWizardState}
              areChartDetailsComplete={areChartDetailsComplete}
              showValidationErrors={showValidationErrors}
            />

            {/* Guest List Table */}
            <div className="pt-6 flex-1 flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-playfair font-semibold text-[#332B42]">Guest List</h3>
                    <BadgeCount count={wizardState.guests.length} />
                  </div>
                  <button
                    onClick={() => setShowHelpModal(true)}
                    className="text-sm text-[#AB9C95] hover:text-[#A85C36] transition-colors flex items-center gap-1 mt-1"
                  >
                    <HelpCircle className="w-4 h-4" />
                    How to use your guest list
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  {/* Primary Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => addGuest({ fullName: '', mealPreference: '', relationship: '', customFields: {} })}
                      className="btn-primary text-sm flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Add Guest
                    </button>
                  </div>
                  
                  {/* Secondary Actions Dropdown */}
                  <div className="relative">
                    <button
                      onClick={() => setShowActionsDropdown(!showActionsDropdown)}
                      className="btn-primaryinverse text-sm flex items-center gap-2 px-3 py-2"
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
                </div>
              </div>
              
              <GuestListTableWithResizing
                wizardState={wizardState}
                guestColumns={guestColumns}
                onUpdateGuest={updateGuest}
                onRemoveGuest={removeGuest}
                onUpdateColumn={updateColumn}
                onColumnResize={handleColumnResize}
                onShowMealOptionsModal={openMealOptionsModal}
                onShowRelationshipOptionsModal={openRelationshipOptionsModal}
                onRemoveColumn={removeColumn}
                onShowColumnOptionsModal={openColumnOptionsModal}
                onShowLinkUsersModal={handleShowLinkUsersModal}
                onEditGroup={handleEditGroup}
                clearSelection={clearTableSelection}
                showValidationErrors={showValidationErrors}
              />
            </div>
          </div>
        );
      case 2:
        return (
          <div className="bg-white rounded-[5px] border border-[#AB9C95]" style={{ borderWidth: '1px' }}>
            <TableLayoutStep
              tableLayout={wizardState.tableLayout}
              onUpdate={updateTableLayout}
              guestCount={wizardState.guests.length}
              guests={wizardState.guests}
              guestGroups={wizardState.guestGroups}
              onEditGroup={handleEditGroup}
            />
          </div>
        );
      default:
        return null;
    }
  };

  // Get navigation button text
  const getNextButtonText = () => {
    switch (currentStep) {
      case 1:
        return 'Next: Table Layout';
      case 2:
        return 'Create Chart';
      default:
        return 'Next';
    }
  };

  // Check if next button should be disabled
  const isNextButtonDisabled = () => {
    if (currentStep === 1) {
      return false; // Always allow clicking Next on step 1
    }
    if (currentStep === 2) {
      return !canProceedToNext || isLoading;
    }
    return false;
  };

  return (
    <div className="fixed inset-0 bg-white z-50 flex">
      {/* Sidebar */}
      <WizardSidebar
        currentStep={currentStep === 1 ? 'guests' : 'tables'}
        onStepClick={(step) => {
          if (step === 'guests') setCurrentStep(1);
          else if (step === 'tables') setCurrentStep(2);
        }}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col bg-[#F3F2F0] relative">
        {/* Fixed Header */}
        <div className="fixed top-0 right-0 left-[300px] bg-[#F3F2F0] border-b border-[#AB9C95] z-50 flex items-center justify-between px-8" style={{paddingTop: '1rem', paddingBottom: '1rem'}}>
          <h2 className="text-xl font-playfair font-semibold text-[#332B42]">
            {getCurrentStepTitle()}
          </h2>
          <button
            onClick={handleCloseWizard}
            className="text-[#332B42] hover:text-[#A85C36] p-2 rounded-full"
            aria-label="Close wizard"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 flex flex-col h-full overflow-y-auto px-0 pt-24">
          <div className="flex-1 overflow-y-auto p-8 pt-4">
            <div className="w-full">
              {/* Step Content */}
              {renderStepContent()}
            </div>
          </div>
        </div>

        {/* Fixed Footer */}
        <div className="fixed bottom-0 right-0 left-[300px] bg-[#F3F2F0] border-t border-[#AB9C95] z-40 flex justify-end items-center px-8" style={{paddingTop: '1rem', paddingBottom: '1rem'}}>
          {/* Action buttons - grouped together on the right */}
          <div className="flex gap-4">
            {currentStep > 1 && (
              <button
                onClick={goToPreviousStep}
                className="btn-primaryinverse"
              >
                {currentStep === 2 ? 'Back to Guest Information' : 'Back to Table Layout'}
              </button>
            )}
            
            <button
              onClick={handleSaveChart}
              disabled={isLoading || !wizardState.chartName.trim()}
              className="btn-primaryinverse"
            >
              Save
            </button>
            
            {currentStep === 1 ? (
              <button
                onClick={goToNextStep}
                disabled={isNextButtonDisabled()}
                className="btn-primary"
              >
                {getNextButtonText()}
              </button>
            ) : (
              <button
                onClick={handleCreateChart}
                disabled={isNextButtonDisabled()}
                className="btn-primary"
              >
                {isLoading ? 'Creating...' : 'Create Chart'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <OptionsEditModal
        isOpen={modalState.mealOptions}
        onClose={() => closeModal('mealOptions')}
        title="Edit Meal Options"
        placeholder="Beef\nChicken\nFish\nVegetarian\nVegan\nGluten-Free"
        initialOptions={modalData.mealOptions}
        onSave={handleMealOptionsSave}
        rows={6}
      />

      <OptionsEditModal
        isOpen={modalState.relationshipOptions}
        onClose={() => closeModal('relationshipOptions')}
                        title="Edit Relationship to You Options"
                  placeholder="Bride's Family\nGroom's Family\nBride's Friends\nGroom's Friends\nWork Colleagues\nCollege Friends\nChildhood Friends\nNeighbors\nOther"
        initialOptions={modalData.relationshipOptions}
        onSave={handleRelationshipOptionsSave}
        rows={8}
      />

      <OptionsEditModal
        isOpen={modalState.columnOptions}
        onClose={() => closeModal('columnOptions')}
        title="Edit Column Options"
        placeholder="Option 1\nOption 2\nOption 3\nOption 4"
        initialOptions={modalData.columnOptions}
        onSave={handleColumnOptionsSave}
        rows={6}
      />

      <CSVUploadModal
        isOpen={modalState.csvUpload}
        onClose={() => closeModal('csvUpload')}
        onGuestsUploaded={handleGuestsUploaded}
      />

      <AddColumnModal
        isOpen={modalState.addColumn}
        onClose={() => closeModal('addColumn')}
        onAddColumn={addColumn}
        guestColumns={guestColumns}
        onToggleColumnVisibility={toggleColumnVisibility}
      />
      
      {/* Family Grouping Modal */}
      <FamilyGroupingModal
        isOpen={showFamilyGroupingModal}
        onClose={() => setShowFamilyGroupingModal(false)}
        selectedGuests={selectedGuestsForGrouping}
        allGuests={wizardState.guests}
        onCreateFamilyGroup={handleCreateFamilyGroup}
        existingGroups={wizardState.guestGroups || []}
        onAddToExistingGroup={handleAddToExistingGroup}
      />

      {/* Edit Group Modal */}
      <EditGroupModal
        isOpen={showEditGroupModal}
        onClose={() => {
          setShowEditGroupModal(false);
          setEditingGroup(null);
        }}
        group={editingGroup}
        allGuests={wizardState.guests}
        onUpdateGroup={handleUpdateGroup}
        onDeleteGroup={handleDeleteGroup}
      />

      {/* Help Modal */}
      {showHelpModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-[5px] shadow-xl max-w-xl w-full p-6 relative">
            {/* Header row with title and close button */}
            <div className="flex items-center justify-between mb-4">
              <h5 className="h5 text-left">How to use your guest list</h5>
              <button
                onClick={() => setShowHelpModal(false)}
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
                onClick={() => setShowHelpModal(false)}
                className="btn-primary px-6 py-2 text-sm"
              >
                Got it!
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Exit Confirmation Modal */}
      {showExitConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-[5px] border border-[#AB9C95] max-w-md w-full mx-4">
            {/* Header */}
            <div className="p-6 pb-4 border-b border-[#E0DBD7]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#805d93] rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-playfair font-semibold text-[#332B42]">
                    Are you sure?
                  </h3>
                  <p className="text-sm text-[#AB9C95] mt-1">
                    Leaving this page will cause all your work to disappear
                  </p>
                </div>
              </div>
            </div>
            
            {/* Content */}
            <div className="p-6 pt-4">
              <div className="bg-[#F3F2F0] rounded-lg p-4 mb-6">
                <div className="text-xs text-[#332B42] font-medium mb-2">Current Progress:</div>
                <div className="text-xs text-[#AB9C95] space-y-1">
                  <div>• Chart Name: {wizardState.chartName || 'Not set'}</div>
                  <div>• Guests: {wizardState.guests.length}</div>
                  <div>• Tables: {wizardState.tableLayout.tables.length}</div>
                </div>
              </div>
            </div>
            
            {/* Footer */}
            <div className="flex justify-end gap-3 p-6 pt-4 border-t border-[#E0DBD7]">
              <button
                onClick={handleConfirmExit}
                className="btn-primaryinverse text-sm"
              >
                Yes, I'm sure
              </button>
              <button
                onClick={handleSaveAndClose}
                className="btn-primary text-sm"
              >
                Save & Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
