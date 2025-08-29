import React, { useState, useRef, useEffect } from 'react';
import { TableType } from '../../types/seatingChart';
import { useAuth } from '../../contexts/AuthContext';
import { useUserProfileData } from '../../hooks/useUserProfileData';
import AddTableModal from './AddTableModal';
import { CanvasControls } from './components/CanvasControls';
import { SVGCanvas } from './components/SVGCanvas';
import { TableEditModal } from './components/TableEditModal';
import { useTableDrag, TablePosition } from './hooks/useTableDrag';
import { useCanvasPanZoom } from './hooks/useCanvasPanZoom';

interface VisualTableLayoutSVGProps {
  tableLayout: {
    tables: TableType[];
    totalCapacity: number;
  };
  onUpdate: (updates: { tables: TableType[]; totalCapacity: number }) => void;
  onAddTable: (table: TableType) => void;
  guestCount: number;
}

export default function VisualTableLayoutSVG({
  tableLayout,
  onUpdate,
  onAddTable,
  guestCount
}: VisualTableLayoutSVGProps) {
  const { profileImageUrl } = useAuth();
  const { userName, partnerName } = useUserProfileData();
  
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [editingTable, setEditingTable] = useState<string | null>(null);
  const [editingValues, setEditingValues] = useState({ name: '', description: '' });
  const [hoveredTable, setHoveredTable] = useState<string | null>(null);
  const [showAddTableModal, setShowAddTableModal] = useState(false);
  
  // Initialize table positions
  const [tablePositions, setTablePositions] = useState<TablePosition[]>(() => {
    return tableLayout.tables.map((table, index) => {
      if (table.isDefault) {
        return { id: table.id, x: 600, y: 400, rotation: 0 };
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
  } = useCanvasPanZoom(1.2);

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
  }, [tableLayout.tables]);

  // Event handlers
  const handleTableMouseEnter = (e: React.MouseEvent) => {
    const target = e.currentTarget as HTMLElement;
    target.style.cursor = 'grab';
  };

  const handleTableMouseLeave = (e: React.MouseEvent) => {
    const target = e.currentTarget as HTMLElement;
    target.style.cursor = 'default';
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
    <div className="relative w-full h-[calc(100vh-14rem)] overflow-hidden border-0 outline-none m-0 p-0">
      <div ref={containerRef} className="relative w-full h-full border-0 outline-none m-0 p-0">
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
          profileImageUrl={profileImageUrl || undefined}
          userName={userName || undefined}
          partnerName={partnerName || undefined}
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
          onNameChange={(name) => setEditingValues(prev => ({ ...prev, name }))}
          onDescriptionChange={(description) => setEditingValues(prev => ({ ...prev, description }))}
          onSave={() => editingTable && saveEditing(editingTable)}
          onCancel={() => setEditingTable(null)}
        />

        {/* Add Table Modal */}
        {showAddTableModal && (
          <AddTableModal
            isOpen={showAddTableModal}
            onClose={() => setShowAddTableModal(false)}
            onAddTable={handleAddTable}
          />
        )}
      </div>
    </div>
  );
}
