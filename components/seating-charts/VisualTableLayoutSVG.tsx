import React, { useState, useRef, useEffect, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Trash2 } from 'lucide-react';
import { TableType, Guest } from '../../types/seatingChart';
import { useAuth } from '../../contexts/AuthContext';
import { useUserProfileData } from '../../hooks/useUserProfileData';
import AddTableModal from './AddTableModal';
import { CanvasControls } from './components/CanvasControls';
import { SVGCanvas } from './components/SVGCanvas';
import { TableEditModal } from './components/TableEditModal';
import GuestSidebar from './components/GuestSidebar';
import { useTableDrag, TablePosition } from './hooks/useTableDrag';
import { useCanvasPanZoom } from './hooks/useCanvasPanZoom';
import { useTableResize } from './hooks/useTableResize';
import { useGuestManagement } from './hooks/useGuestManagement';
import { getTableShape } from './utils/seatPositionCalculator';

interface VisualTableLayoutSVGProps {
  tableLayout: {
    tables: TableType[];
    totalCapacity: number;
  };
  onUpdate: (updates: { tables: TableType[]; totalCapacity: number }) => void;
  onAddTable: (table: TableType) => void;
  guestCount: number;
  guests: Guest[];
  onGuestAssignment?: (guestId: string, tableId: string, seatIndex: number) => void;
  onRotationUpdate?: (tableId: string, rotation: number) => void;
  onSeatedGuestClick?: (guestId: string, tableId: string, seatNumber: number) => void;
  guestGroups?: any[];
  onEditGroup?: (groupId: string) => void;
  profileImageUrl?: string;
  userName?: string;
  partnerName?: string;
  guestAssignments?: Record<string, any>;
}

export default function VisualTableLayoutSVG({
  tableLayout,
  onUpdate,
  onAddTable,
  guestCount,
  guests,
  onGuestAssignment,
  onRotationUpdate,
  onSeatedGuestClick,
  guestGroups = [],
  onEditGroup,
  profileImageUrl,
  userName,
  partnerName,
  guestAssignments: propGuestAssignments
}: VisualTableLayoutSVGProps) {
  
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [editingTable, setEditingTable] = useState<string | null>(null);
  const [hoveredTable, setHoveredTable] = useState<string | null>(null);
  const [showAddTableModal, setShowAddTableModal] = useState(false);
  const [highlightedGuest, setHighlightedGuest] = useState<string | null>(null);
  
  // Table resize state with session persistence
  const [tableDimensions, setTableDimensions] = useState<Record<string, { width: number; height: number }>>(() => {
    const savedDimensions = sessionStorage.getItem('seating-chart-table-dimensions');
    if (savedDimensions) {
      try {
        const parsed = JSON.parse(savedDimensions);
        if (parsed && typeof parsed === 'object') {
          return parsed;
        }
      } catch (error) {
        console.warn('Failed to parse saved table dimensions:', error);
      }
    }
    return {};
  });
  
  // Refs for click outside detection
  const canvasRef = useRef<HTMLDivElement>(null);
  
  // Initialize table positions with session persistence
  const [tablePositions, setTablePositions] = useState<TablePosition[]>(() => {
    // Try to load from sessionStorage first
    const savedPositions = sessionStorage.getItem('seating-chart-table-positions');
    if (savedPositions) {
      try {
        const parsed = JSON.parse(savedPositions);
        // Validate that the saved positions match current tables
    if (Array.isArray(parsed) && parsed.length === tableLayout.tables.length) {
      return parsed;
    }
      } catch (error) {
        console.warn('Failed to parse saved table positions:', error);
      }
    }
    
    // Fallback to default positions
    return tableLayout.tables.map((table, index) => {
      if (table.isDefault) {
        return { id: table.id, x: 400, y: 300, rotation: 0 };
      } else {
        const baseX = (index % 4) * 300 + 200;
        const baseY = Math.floor(index / 4) * 300 + 200;
        return { id: table.id, x: baseX, y: baseY, rotation: 0 };
      }
    });
  });

  // Save table positions to sessionStorage whenever they change
  useEffect(() => {
    sessionStorage.setItem('seating-chart-table-positions', JSON.stringify(tablePositions));
  }, [tablePositions]);

  // Save table dimensions to sessionStorage whenever they change
  useEffect(() => {
    sessionStorage.setItem('seating-chart-table-dimensions', JSON.stringify(tableDimensions));
  }, [tableDimensions]);

  // Cleanup session storage when component unmounts (wizard completed)
  useEffect(() => {
    return () => {
      // Only clear if we're actually leaving the wizard (not just navigating between steps)
      // This will be handled by the parent component when the wizard is completed
    };
  }, []);

  // Custom hooks
  const { draggedTable, handleTableMouseDown, handleTableMouseUp } = useTableDrag(
    tablePositions, 
    setTablePositions,
    (tableId, oldPosition, newPosition) => {
      // Update guest positions when table is moved
      const deltaX = newPosition.x - oldPosition.x;
      const deltaY = newPosition.y - oldPosition.y;
      updateGuestPositionsForTable(tableId, deltaX, deltaY);
    }
  );
  const {
    canvasTransform,
    isDraggingCanvas,
    handleCanvasMouseDown: hookCanvasMouseDown,
    handleCanvasAltMouseDown,
    handleCanvasMouseMove,
    handleCanvasMouseUp,
    handleCanvasWheel,
    resetCanvas
  } = useCanvasPanZoom(0.9, draggedTable);
  
  const { resizeState, startResize, updateResize, stopResize } = useTableResize();
  
  // Wrapper function to convert coordinates to seat numbers for backward compatibility
  const onGuestAssignmentWrapper = useCallback((guestId: string, tableId: string, seatIndex: number) => {
    if (onGuestAssignment) {
      onGuestAssignment(guestId, tableId, seatIndex);
    }
  }, [onGuestAssignment]);

  // Guest management hook
  const {
    guestAssignments: hookGuestAssignments,
    setGuestAssignments,
    handleGuestDrop,
    handleGuestSwap,
    handleAvatarClick,
    handleMoveGuest,
    handleRemoveGuest,
    getGuestAvatarColor,
    cleanupStaleAssignments,
    updateGuestPositionsForTable,
    fixOverlappingAssignments,
  } = useGuestManagement(guests, onGuestAssignmentWrapper);

  // Use hook's guestAssignments for display since drag-and-drop updates the hook's state
  const guestAssignments = hookGuestAssignments;
  
  // If we're using prop guestAssignments, we need to sync them to the hook's state
  // so that drag-and-drop functions work properly
  useEffect(() => {
    if (propGuestAssignments && Object.keys(propGuestAssignments).length > 0) {
      setGuestAssignments(propGuestAssignments);
    }
  }, [propGuestAssignments, setGuestAssignments]);




  // Move showingActions state to parent component for stability
  const [showingActions, setShowingActions] = useState<string | null>(null);

  // Clean up stale assignments when component mounts or tables change
  useEffect(() => {
    const existingTableIds = tableLayout.tables.map(t => t.id);
    cleanupStaleAssignments(existingTableIds);
  }, [tableLayout.tables, cleanupStaleAssignments]);

  // Fix overlapping assignments when component loads
  useEffect(() => {
    fixOverlappingAssignments();
  }, [fixOverlappingAssignments]);

  // Override handleAvatarClick to use local state
  const handleAvatarClickLocal = useCallback((tableId: string, seatNumber: number) => {
    const actionKey = `${tableId}-${seatNumber}`;
    const newValue = showingActions === actionKey ? null : actionKey;
    setShowingActions(newValue);
  }, [showingActions]);

  // Wrapper functions to convert between coordinate and seat number systems
  const handleAvatarClickWrapper = useCallback((tableId: string, seatNumber: number) => {
    handleAvatarClickLocal(tableId, seatNumber);
  }, [handleAvatarClickLocal]);

  const handleMoveGuestWrapper = useCallback((guestId: string, tableId: string, position: { x: number; y: number }) => {
    handleMoveGuest(guestId, tableId, position);
  }, [handleMoveGuest]);

  const handleRemoveGuestWrapper = useCallback((guestId: string, tableId: string, position: { x: number; y: number }) => {
    handleRemoveGuest(guestId, tableId, position);
  }, [handleRemoveGuest]);



  // Update positions when tables change
  useEffect(() => {
    const currentIds = tableLayout.tables.map(t => t.id);
    const existingPositions = tablePositions.filter(p => currentIds.includes(p.id));
    const newPositions = tableLayout.tables
      .filter(t => !tablePositions.find(p => p.id === t.id))
      .map((table, index) => {
        if (table.isDefault) {
          return { id: table.id, x: 400, y: 300, rotation: 0 };
        } else {
          // Position new tables very close to the sweetheart table
          const baseX = 400 + (index % 3) * 120 - 60; // Much closer to sweetheart table
          const baseY = 300 + Math.floor(index / 3) * 120 - 60;
          return { id: table.id, x: baseX, y: baseY, rotation: 0 };
        }
      });
    
    if (newPositions.length > 0) {
      setTablePositions([...existingPositions, ...newPositions]);
    }
    
    // Initialize dimensions for new tables
    const newTables = tableLayout.tables.filter(t => !tableDimensions[t.id]);
    if (newTables.length > 0) {
      const newDimensions = { ...tableDimensions };
      newTables.forEach(table => {
        const shape = getTableShape(table.type);
        newDimensions[table.id] = { width: shape.width, height: shape.height };
      });
      setTableDimensions(newDimensions);
    }
  }, [tableLayout.tables, tableDimensions]);

  // Event handlers
  const handleTableMouseEnter = (e: React.MouseEvent) => {
    const target = e.currentTarget as HTMLElement;
    target.style.cursor = 'grab';
  };

  const handleTableMouseLeave = (e: React.MouseEvent) => {
    const target = e.currentTarget as HTMLElement;
    target.style.cursor = 'default';
  };

  const handleResizeStart = (tableId: string, handleType: string, dimensions: { width: number; height: number }, e: React.MouseEvent) => {
    startResize(handleType, dimensions, e.clientX, e.clientY);
  };

  const handleResizeUpdate = (tableId: string, mouseX: number, mouseY: number) => {
    if (!resizeState.isResizing) return;
    
    const currentDimensions = tableDimensions[tableId] || { width: 120, height: 120 };
    const table = tableLayout.tables.find(t => t.id === tableId);
    const tableRotation = table?.rotation || 0;
    
    const newDimensions = updateResize(mouseX, mouseY, { 
      width: currentDimensions.width, 
      height: currentDimensions.height,
      seatPositions: () => [] // Placeholder, not used in resize calculation
    }, tableRotation);
    
    setTableDimensions(prev => ({
      ...prev,
      [tableId]: newDimensions
    }));
    
    // Update guest positions when table is resized
    // This ensures guest avatars stay in the correct relative positions
    const tablePosition = tablePositions.find(p => p.id === tableId);
    if (tablePosition) {
      const scaleX = Math.max(0.1, Math.min(10, newDimensions.width / currentDimensions.width));
      const scaleY = Math.max(0.1, Math.min(10, newDimensions.height / currentDimensions.height));
      
      console.log('🔧 RESIZE DEBUG:', {
        tableId,
        currentDimensions,
        newDimensions,
        scaleX,
        scaleY,
        tablePosition
      });
      
      // Update guest positions relative to the table's new dimensions
      const newAssignments = { ...guestAssignments };
      let hasChanges = false;
      
      Object.keys(newAssignments).forEach(guestId => {
        const assignment = newAssignments[guestId];
        if (assignment.tableId === tableId && assignment.position) {
          // Calculate the guest's position relative to the table center
          const relativeX = assignment.position.x - tablePosition.x;
          const relativeY = assignment.position.y - tablePosition.y;
          
          // Scale the relative position - ensure we don't get NaN or invalid values
          const newRelativeX = isNaN(relativeX * scaleX) ? relativeX : relativeX * scaleX;
          const newRelativeY = isNaN(relativeY * scaleY) ? relativeY : relativeY * scaleY;
          
          // Update the absolute position
          newAssignments[guestId] = {
            ...assignment,
            position: {
              x: tablePosition.x + newRelativeX,
              y: tablePosition.y + newRelativeY
            }
          };
          hasChanges = true;
          
          console.log('🔧 UPDATED GUEST POSITION:', {
            guestId,
            oldPosition: assignment.position,
            newPosition: newAssignments[guestId].position,
            relativeX,
            relativeY,
            newRelativeX,
            newRelativeY,
            scaleX,
            scaleY
          });
        }
      });
      
      if (hasChanges) {
        console.log('🔧 UPDATING ALL ASSIGNMENTS:', newAssignments);
        setGuestAssignments(newAssignments);
      }
    }
  };

  const handleResizeEnd = () => {
    stopResize();
  };

  const startEditing = (table: TableType) => {
    setEditingTable(table.id);
  };

  const saveEditing = (updatedTable: Partial<TableType>) => {
    if (!editingTable) return;
    
    const updatedTables = tableLayout.tables.map(table => {
      if (table.id === editingTable) {
        return {
          ...table,
          ...updatedTable
        };
      }
      return table;
    });
    
    const totalCapacity = updatedTables.reduce((sum, t) => sum + t.capacity, 0);
    onUpdate({ tables: updatedTables, totalCapacity });
    
    setEditingTable(null);
  };

  const handleAddTable = (newTable: any) => {
    console.log('handleAddTable called with:', newTable);
    const tableWithId = {
      ...newTable,
      id: newTable.id || `table-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };
    
    console.log('Adding table to wizard state:', tableWithId);
    onAddTable(tableWithId);
  };

  // Canvas event handlers
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    // Deselect table when clicking on empty canvas area
    setSelectedTable(null);
    hookCanvasMouseDown(e, draggedTable);
    // Only call Alt mouse down when Alt key is actually pressed
    if (e.altKey) {
      handleCanvasAltMouseDown(e, draggedTable);
    }
  };

  const handleTableMouseDownWithSelection = (tableId: string, e: React.MouseEvent) => {
    handleTableMouseDown(tableId, e);
    setSelectedTable(tableId);
  };

  const handleTableMouseMove = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  // Handle seated guest click - scroll to table and highlight guest
  const handleSeatedGuestClick = useCallback((guestId: string, tableId: string, seatNumber: number) => {
    // Set the highlighted guest
    setHighlightedGuest(guestId);
    
    // Select the table
    setSelectedTable(tableId);
    
    // Find the table position
    const tablePosition = tablePositions.find(pos => pos.id === tableId);
    if (tablePosition && canvasRef.current) {
      // Get canvas dimensions
      const canvasRect = canvasRef.current.getBoundingClientRect();
      const canvasCenterX = canvasRect.width / 2;
      const canvasCenterY = canvasRect.height / 2;
      
      // Calculate the offset to center the table
      const offsetX = canvasCenterX - tablePosition.x;
      const offsetY = canvasCenterY - tablePosition.y;
      
      // Apply the transform to center the table
      const newTransform = {
        x: offsetX,
        y: offsetY,
        scale: 1
      };
      
      // Update canvas transform (this would need to be implemented in the canvas hook)
      // For now, we'll just select the table and highlight the guest
      console.log(`Scrolling to table ${tableId} and highlighting guest ${guestId}`);
    }
    
    // Clear highlight after 3 seconds
    setTimeout(() => {
      setHighlightedGuest(null);
    }, 3000);
  }, [tablePositions]);

  return (
    <div 
      className={`flex h-[calc(100vh-14rem)] border border-[#E0DBD7] rounded-[5px] overflow-hidden ${draggedTable ? 'prevent-zoom' : ''}`}
      style={{ 
        borderWidth: '1px',
        touchAction: draggedTable ? 'none' : 'auto' // Prevent zoom gestures during table dragging
      }}
    >
      {/* Guest Assignment Sidebar - Left side like todo page */}
      <GuestSidebar
        guests={guests}
        guestAssignments={guestAssignments}
        onGuestAssignment={onGuestAssignment}
        showingActions={showingActions}
        onAvatarClick={handleAvatarClickWrapper}
        onMoveGuest={handleMoveGuestWrapper}
        onRemoveGuest={handleRemoveGuestWrapper}
        getGuestAvatarColor={getGuestAvatarColor}
        tableLayout={tableLayout}
        onSeatedGuestClick={handleSeatedGuestClick}
        guestGroups={guestGroups}
        onEditGroup={onEditGroup}
      />

      {/* Main Content Area */}
      <div className="flex-1 bg-white flex flex-col min-h-0">
        <div ref={canvasRef} className="relative w-full h-full border-0 outline-none m-0 p-0">
          {/* Canvas Controls */}
          <CanvasControls
            tableCount={tableLayout.tables.length}
            totalCapacity={tableLayout.totalCapacity}
            onReset={resetCanvas}
            onAddTable={() => setShowAddTableModal(true)}
          />
          
          
          {/* SVG Canvas */}
          <SVGCanvas
            tables={tableLayout.tables}
            tablePositions={tablePositions}
            canvasTransform={canvasTransform}
            isDraggingCanvas={isDraggingCanvas}
            selectedTable={selectedTable}
            hoveredTable={hoveredTable}
            tableDimensions={tableDimensions}
            highlightedGuest={highlightedGuest}
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            onWheel={handleCanvasWheel}
            onTableMouseDown={handleTableMouseDownWithSelection}
            onTableMouseMove={handleTableMouseMove}
            onTableMouseUp={handleTableMouseUp}
            onTableMouseEnter={(e) => {
              handleTableMouseEnter(e);
              const target = e.currentTarget as HTMLElement;
              const tableId = target.closest('g')?.getAttribute('data-table-id');
              if (tableId) setHoveredTable(tableId);
            }}
            onTableMouseLeave={(e) => {
              handleTableMouseLeave(e);
              setHoveredTable(null);
            }}
            onTableDoubleClick={() => {
              if (selectedTable) {
                const table = tableLayout.tables.find(t => t.id === selectedTable);
                if (table) startEditing(table);
              }
            }}
            onResizeStart={handleResizeStart}
            onResizeUpdate={handleResizeUpdate}
            onResizeEnd={handleResizeEnd}
            onRotationUpdate={onRotationUpdate}
            profileImageUrl={profileImageUrl || undefined}
            userName={userName || undefined}
            partnerName={partnerName || undefined}
            guestAssignments={guestAssignments}
            onGuestDrop={handleGuestDrop}
            onGuestSwap={handleGuestSwap}
            guests={guests}
            showingActions={showingActions}
            onAvatarClick={handleAvatarClickLocal}
            onMoveGuest={handleMoveGuestWrapper}
            onRemoveGuest={handleRemoveGuestWrapper}
            getGuestAvatarColor={getGuestAvatarColor}
            onRemoveTable={(tableId) => {
              // Remove table first
              const updatedTables = tableLayout.tables.filter(t => t.id !== tableId);
              const totalCapacity = updatedTables.reduce((sum, t) => sum + t.capacity, 0);
              onUpdate({ tables: updatedTables, totalCapacity });
              
              // Clean up any stale assignments for tables that no longer exist
              const existingTableIds = updatedTables.map(t => t.id);
              cleanupStaleAssignments(existingTableIds);
              
              // Clear selection
              setSelectedTable(null);
            }}
            onEditTable={(tableId) => {
              const table = tableLayout.tables.find(t => t.id === tableId);
              if (table) startEditing(table);
            }}
            onCloneTable={(tableId) => {
              // Find the table to clone
              const tableToClone = tableLayout.tables.find(t => t.id === tableId);
              if (!tableToClone) return;
              
              // Create a new table with the same properties but new ID and position
              const clonedTable = {
                ...tableToClone,
                id: `table-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                name: `${tableToClone.name} (Copy)`,
                // Position will be set by the drag system
              };
              
              // Add the cloned table
              const updatedTables = [...tableLayout.tables, clonedTable];
              const totalCapacity = updatedTables.reduce((sum, t) => sum + t.capacity, 0);
              onUpdate({ tables: updatedTables, totalCapacity });
              
              // Select the new table
              setSelectedTable(clonedTable.id);
            }}
          />

          {/* Capacity Warning - Positioned absolutely, full width */}
          {guestCount > tableLayout.totalCapacity && tableLayout.tables.length > 0 && (
            <div className="absolute bottom-4 left-4 right-4 bg-red-50 border border-red-200 rounded-[5px] p-4 z-20">
              <div className="flex items-center gap-2 text-red-800">
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                <span className="font-medium">Capacity Warning</span>
              </div>
              <p className="text-sm text-red-700 mt-1">
                You have {guestCount} guests but only {tableLayout.totalCapacity} seats. 
                Consider adding more tables or increasing table capacities.
              </p>
            </div>
          )}

          {/* Edit Modal */}
          {editingTable && (
            <TableEditModal
              isOpen={!!editingTable}
              table={tableLayout.tables.find(t => t.id === editingTable)!}
              onSave={saveEditing}
              onCancel={() => setEditingTable(null)}
            />
          )}
        </div>
      </div>

      {/* Add Table Modal */}
      <AddTableModal
        isOpen={showAddTableModal}
        onClose={() => setShowAddTableModal(false)}
        onAddTable={handleAddTable}
      />
    </div>
  );
}
