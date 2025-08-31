import React, { useState, useRef, useEffect, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
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
  onGuestAssignment?: (guestId: string, tableId: string, seatNumber: number) => void;
  onRotationUpdate?: (tableId: string, rotation: number) => void;
}

export default function VisualTableLayoutSVG({
  tableLayout,
  onUpdate,
  onAddTable,
  guestCount,
  guests,
  onGuestAssignment,
  onRotationUpdate
}: VisualTableLayoutSVGProps) {
  const { profileImageUrl } = useAuth();
  const { userName, partnerName } = useUserProfileData();
  
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [editingTable, setEditingTable] = useState<string | null>(null);
  const [editingValues, setEditingValues] = useState({ name: '', description: '' });
  const [hoveredTable, setHoveredTable] = useState<string | null>(null);
  const [showAddTableModal, setShowAddTableModal] = useState(false);
  
  // Table resize state
  const [tableDimensions, setTableDimensions] = useState<Record<string, { width: number; height: number }>>({});
  
  // Refs for click outside detection
  const canvasRef = useRef<HTMLDivElement>(null);
  
  // Initialize table positions
  const [tablePositions, setTablePositions] = useState<TablePosition[]>(() => {
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

  // Custom hooks
  const { draggedTable, handleTableMouseDown, handleTableMouseUp } = useTableDrag(tablePositions, setTablePositions);
  const {
    canvasTransform,
    isDraggingCanvas,
    handleCanvasMouseDown: hookCanvasMouseDown,
    handleCanvasAltMouseDown,
    handleCanvasMouseMove,
    handleCanvasMouseUp,
    handleCanvasWheel,
    resetCanvas
  } = useCanvasPanZoom(0.9);
  
  const { resizeState, startResize, updateResize, stopResize } = useTableResize();
  
  // Guest management hook
  const {
    guestAssignments,
    setGuestAssignments,
    handleGuestDrop,
    handleGuestSwap,
    handleAvatarClick,
    handleMoveGuest,
    handleRemoveGuest,
    getGuestAvatarColor,
  } = useGuestManagement(guests, onGuestAssignment);

  // Move showingActions state to parent component for stability
  const [showingActions, setShowingActions] = useState<string | null>(null);

  // Override handleAvatarClick to use local state
  const handleAvatarClickLocal = useCallback((tableId: string, seatNumber: number) => {
    const actionKey = `${tableId}-${seatNumber}`;
    const newValue = showingActions === actionKey ? null : actionKey;
    setShowingActions(newValue);
  }, [showingActions]);



  // Update positions when tables change
  useEffect(() => {
    const currentIds = tableLayout.tables.map(t => t.id);
    const existingPositions = tablePositions.filter(p => currentIds.includes(p.id));
    const newPositions = tableLayout.tables
      .filter(t => !tablePositions.find(p => p.id === t.id))
      .map((table, index) => {
        if (table.isDefault) {
          return { id: table.id, x: 600, y: 400, rotation: 0 };
        } else {
          const baseX = (index % 4) * 300 + 100;
          const baseY = Math.floor(index / 4) * 300 + 100;
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
  };

  const handleResizeEnd = () => {
    stopResize();
  };

  const startEditing = (table: TableType) => {
    setEditingTable(table.id);
    setEditingValues({
      name: table.name,
      description: table.description || ''
    });
  };

  const saveEditing = (tableId: string) => {
    const updatedTables = tableLayout.tables.map(table => {
      if (table.id === tableId) {
        return {
          ...table,
          name: editingValues.name,
          description: editingValues.description
        };
      }
      return table;
    });
    
    const totalCapacity = updatedTables.reduce((sum, t) => sum + t.capacity, 0);
    onUpdate({ tables: updatedTables, totalCapacity });
    
    setEditingTable(null);
    setEditingValues({ name: '', description: '' });
  };

  const handleAddTable = (newTable: any) => {
    const tableWithId = {
      ...newTable,
      id: newTable.id || `table-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };
    
    onAddTable(tableWithId);
  };

  // Canvas event handlers
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    hookCanvasMouseDown(e, draggedTable);
    handleCanvasAltMouseDown(e, draggedTable);
  };

  const handleTableMouseDownWithSelection = (tableId: string, e: React.MouseEvent) => {
    handleTableMouseDown(tableId, e);
    setSelectedTable(tableId);
  };

  const handleTableMouseMove = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <div className="flex h-[calc(100vh-14rem)] border border-[#E0DBD7] rounded-[5px] overflow-hidden">
      {/* Guest Assignment Sidebar - Left side like todo page */}
      <GuestSidebar
        guests={guests}
        guestAssignments={guestAssignments}
        onGuestAssignment={onGuestAssignment}
        showingActions={showingActions}
        onAvatarClick={handleAvatarClick}
        onMoveGuest={handleMoveGuest}
        onRemoveGuest={handleRemoveGuest}
        getGuestAvatarColor={getGuestAvatarColor}
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
              if (editingTable) {
                const table = tableLayout.tables.find(t => t.id === editingTable);
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
            onMoveGuest={handleMoveGuest}
            onRemoveGuest={handleRemoveGuest}
            getGuestAvatarColor={getGuestAvatarColor}
          />

          {/* Capacity Warning - Positioned absolutely */}
          {guestCount > tableLayout.totalCapacity && tableLayout.tables.length > 0 && (
            <div className="absolute bottom-4 left-4 bg-red-50 border border-red-200 rounded-[5px] p-4 z-20">
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
          <TableEditModal
            isOpen={!!editingTable}
            tableName={editingValues.name}
            tableDescription={editingValues.description}
            onSave={() => editingTable && saveEditing(editingTable)}
            onCancel={() => setEditingTable(null)}
            onNameChange={(name) => setEditingValues(prev => ({ ...prev, name }))}
            onDescriptionChange={(description) => setEditingValues(prev => ({ ...prev, description }))}
          />
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
