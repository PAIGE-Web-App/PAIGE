import React, { useState, useRef, useCallback } from 'react';
import { motion, PanInfo } from 'framer-motion';
import { Edit2, Trash2, Move, Settings } from 'lucide-react';
import { TableType } from '../../types/seatingChart';

interface VisualTableLayoutProps {
  tableLayout: {
    tables: TableType[];
    totalCapacity: number;
  };
  onUpdate: (updates: { tables: TableType[]; totalCapacity: number }) => void;
  guestCount: number;
}

interface TablePosition {
  id: string;
  x: number;
  y: number;
}

const TABLE_SHAPES = {
  round: {
    width: 120,
    height: 120,
    borderRadius: '50%',
    seatPositions: (capacity: number) => {
      const positions = [];
      const radius = 70;
      for (let i = 0; i < capacity; i++) {
        const angle = (i * 2 * Math.PI) / capacity - Math.PI / 2;
        positions.push({
          x: Math.cos(angle) * radius,
          y: Math.sin(angle) * radius
        });
      }
      return positions;
    }
  },
  long: {
    width: 160,
    height: 80,
    borderRadius: '20px',
    seatPositions: (capacity: number) => {
      const positions = [];
      const seatsPerSide = Math.ceil(capacity / 2);
      const spacing = 120 / (seatsPerSide - 1);
      
      // Top side
      for (let i = 0; i < seatsPerSide; i++) {
        positions.push({
          x: (i * spacing) - 60,
          y: -45
        });
      }
      
      // Bottom side
      for (let i = 0; i < capacity - seatsPerSide; i++) {
        positions.push({
          x: (i * spacing) - 60,
          y: 45
        });
      }
      
      return positions;
    }
  },
  oval: {
    width: 140,
    height: 100,
    borderRadius: '50px',
    seatPositions: (capacity: number) => {
      const positions = [];
      const radiusX = 75;
      const radiusY = 55;
      for (let i = 0; i < capacity; i++) {
        const angle = (i * 2 * Math.PI) / capacity - Math.PI / 2;
        positions.push({
          x: Math.cos(angle) * radiusX,
          y: Math.sin(angle) * radiusY
        });
      }
      return positions;
    }
  },
  square: {
    width: 100,
    height: 100,
    borderRadius: '12px',
    seatPositions: (capacity: number) => {
      const positions = [];
      const seatsPerSide = Math.ceil(capacity / 4);
      const spacing = 60 / (seatsPerSide - 1);
      
      // Top side
      for (let i = 0; i < Math.min(seatsPerSide, capacity); i++) {
        positions.push({
          x: (i * spacing) - 30,
          y: -55
        });
      }
      
      // Right side
      for (let i = 0; i < Math.min(seatsPerSide, Math.max(0, capacity - seatsPerSide)); i++) {
        positions.push({
          x: 55,
          y: (i * spacing) - 30
        });
      }
      
      // Bottom side
      for (let i = 0; i < Math.min(seatsPerSide, Math.max(0, capacity - 2 * seatsPerSide)); i++) {
        positions.push({
          x: (i * spacing) - 30,
          y: 55
        });
      }
      
      // Left side
      for (let i = 0; i < Math.min(seatsPerSide, Math.max(0, capacity - 3 * seatsPerSide)); i++) {
        positions.push({
          x: -55,
          y: (i * spacing) - 30
        });
      }
      
      return positions;
    }
  }
};

export default function VisualTableLayout({ 
  tableLayout, 
  onUpdate, 
  guestCount 
}: VisualTableLayoutProps) {
  const [hoveredTable, setHoveredTable] = useState<string | null>(null);
  const [draggedTable, setDraggedTable] = useState<string | null>(null);
  const [editingTable, setEditingTable] = useState<string | null>(null);
  const [editingValues, setEditingValues] = useState<{ name: string; description: string }>({ name: '', description: '' });
  
  // Pan and zoom state
  const [canvasTransform, setCanvasTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [isPanning, setIsPanning] = useState(false);
  
  const [tablePositions, setTablePositions] = useState<TablePosition[]>(() => {
    // Initialize table positions with sweetheart table at bottom center
    return tableLayout.tables.map((table, index) => {
      if (table.isDefault) {
        // Sweetheart table at bottom center within canvas bounds
        return {
          id: table.id,
          x: 400, // Center of initial view
          y: 250   // Center of initial view
        };
      } else {
        // Other tables in a grid layout - allow wider spacing
        return {
          id: table.id,
          x: (index % 4) * 300 + 100,
          y: Math.floor(index / 4) * 300 + 100
        };
      }
    });
  });

  const canvasRef = useRef<HTMLDivElement>(null);

  // Pan and zoom handlers
  const handleCanvasPan = useCallback((e: React.MouseEvent) => {
    if (e.buttons === 1 && !draggedTable) { // Left mouse button
      setIsPanning(true);
    }
  }, [draggedTable]);

  // Handle mouse move for panning
  const handleCanvasPanMove = useCallback((e: React.MouseEvent) => {
    if (e.buttons === 1 && !draggedTable) { // Left mouse button
      setCanvasTransform(prev => ({
        ...prev,
        x: prev.x + e.movementX,
        y: prev.y + e.movementY
      }));
    }
  }, [draggedTable]);

  const handleCanvasPanEnd = useCallback(() => {
    setIsPanning(false);
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    // Only zoom if Ctrl/Cmd key is pressed (standard zoom behavior)
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
              const newScale = Math.max(0.3, Math.min(2.0, canvasTransform.scale * delta));
      
      setCanvasTransform(prev => ({
        ...prev,
        scale: newScale
      }));
    }
  }, [canvasTransform.scale]);



  // Update positions when tables change
  React.useEffect(() => {
    const currentIds = tableLayout.tables.map(t => t.id);
    const existingPositions = tablePositions.filter(p => currentIds.includes(p.id));
    const newPositions = tableLayout.tables
      .filter(t => !tablePositions.find(p => p.id === t.id))
      .map((table, index) => {
        if (table.isDefault) {
          // Sweetheart table at center
          return {
            id: table.id,
            x: 400, // Center of initial view
            y: 250   // Center of initial view
          };
        } else {
          // Other tables in a grid layout - allow wider spacing
          const baseX = (existingPositions.length + index) % 4 * 300 + 100;
          const baseY = Math.floor((existingPositions.length + index) / 4) * 300 + 100;
          return {
            id: table.id,
            x: baseX,
            y: baseY
          };
        }
      });
    
    setTablePositions([...existingPositions, ...newPositions]);
  }, [tableLayout.tables.length]);



  const handleDragEnd = useCallback((tableId: string, info: PanInfo) => {
    setDraggedTable(null);
    
    setTablePositions(prev => prev.map(pos => {
      if (pos.id === tableId) {
        // Calculate new position
        const newX = pos.x + info.offset.x;
        const newY = pos.y + info.offset.y;
        
        // Allow tables to be placed anywhere on the infinite grid, but with reasonable bounds
        const maxDistance = 2000; // Maximum distance from center
        const constrainedX = Math.max(-maxDistance, Math.min(maxDistance, newX));
        const constrainedY = Math.max(-maxDistance, Math.min(maxDistance, newY));
        
        return { ...pos, x: constrainedX, y: constrainedY };
      }
      return pos;
    }));
  }, []);

  const updateTable = (tableId: string, updates: Partial<TableType>) => {
    const updatedTables = tableLayout.tables.map(t => 
      t.id === tableId ? { ...t, ...updates } : t
    );
    const totalCapacity = updatedTables.reduce((sum, t) => sum + t.capacity, 0);
    onUpdate({ tables: updatedTables, totalCapacity });
  };

  const removeTable = (tableId: string) => {
    const updatedTables = tableLayout.tables.filter(t => t.id !== tableId);
    const totalCapacity = updatedTables.reduce((sum, t) => sum + t.capacity, 0);
    onUpdate({ tables: updatedTables, totalCapacity });
    
    // Remove position
    setTablePositions(prev => prev.filter(p => p.id !== tableId));
  };

  const startEditing = (table: TableType) => {
    setEditingTable(table.id);
    setEditingValues({
      name: table.name,
      description: table.description || ''
    });
  };

  const saveEditing = (tableId: string) => {
    if (editingValues.name.trim()) {
      updateTable(tableId, {
        name: editingValues.name.trim(),
        description: editingValues.description.trim() || undefined
      });
    }
    setEditingTable(null);
    setEditingValues({ name: '', description: '' });
  };

  const cancelEditing = () => {
    setEditingTable(null);
    setEditingValues({ name: '', description: '' });
  };

  const getTableShape = (type: string) => {
    return TABLE_SHAPES[type as keyof typeof TABLE_SHAPES] || TABLE_SHAPES.round;
  };

  const getCapacityColor = (capacity: number) => {
    if (capacity >= 10) return 'text-red-600';
    if (capacity >= 8) return 'text-orange-600';
    return 'text-green-600';
  };

  const renderTable = (table: TableType) => {
    const position = tablePositions.find(p => p.id === table.id);
    if (!position) return null;

    const shape = getTableShape(table.type);
    const seatPositions = shape.seatPositions(table.capacity);

    return (
      <motion.div
        key={table.id}
        drag
        dragMomentum={false}
        dragElastic={0.1}
        onDragStart={() => setDraggedTable(table.id)}
        onDragEnd={(_, info) => handleDragEnd(table.id, info)}
        onHoverStart={() => setHoveredTable(table.id)}
        onHoverEnd={() => setHoveredTable(null)}
        onDoubleClick={() => startEditing(table)}
        className="absolute cursor-move"
        style={{
          left: position.x - shape.width / 2,
          top: position.y - shape.height / 2,
          zIndex: draggedTable === table.id ? 10 : 1,
          transform: `scale(${1 / canvasTransform.scale})`, // Counter-scale tables to maintain size
          maxWidth: `${shape.width}px`,
          maxHeight: `${shape.height}px`
        }}
      >
        {/* Table Shape */}
        <motion.div
          className={`relative shadow-md ${
            table.isDefault 
              ? 'bg-gradient-to-br from-pink-50 to-purple-50 border-2 border-pink-300' 
              : 'bg-white border-2 border-[#AB9C95]'
          } ${
            hoveredTable === table.id ? 'border-[#A85C36] shadow-lg' : ''
          }`}
          style={{
            width: shape.width,
            height: shape.height,
            borderRadius: shape.borderRadius
          }}
          whileHover={{ scale: 1.02 }}
          transition={{ duration: 0.2 }}
        >
          {/* Table Label */}
          <div className="absolute inset-0 flex items-center justify-center">
            {editingTable === table.id ? (
              <div className="text-center w-full px-2">
                <input
                  type="text"
                  value={editingValues.name}
                  onChange={(e) => setEditingValues(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full text-center font-semibold text-[#332B42] text-sm bg-transparent border-none outline-none focus:ring-0"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      saveEditing(table.id);
                    } else if (e.key === 'Escape') {
                      cancelEditing();
                    }
                  }}
                  onBlur={() => saveEditing(table.id)}
                />
                <div className="text-xs text-[#AB9C95] mt-1">{table.type}</div>
              </div>
            ) : (
              <div className="text-center">
                <div className="font-semibold text-[#332B42] text-sm">{table.name}</div>
                <div className="text-xs text-[#AB9C95]">{table.type}</div>
                {table.isDefault && (
                  <div className="text-xs text-pink-600 font-medium mt-1">💕 Sweetheart</div>
                )}
              </div>
            )}
          </div>

          {/* Seat Indicators */}
          {seatPositions.map((seatPos, index) => (
            <motion.div
              key={index}
              className="absolute w-3 h-3 bg-[#A85C36] rounded-full border-2 border-white shadow-sm"
              style={{
                left: seatPos.x + shape.width / 2 - 6,
                top: seatPos.y + shape.height / 2 - 6
              }}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: index * 0.05 }}
            />
          ))}

          {/* Hover Controls */}
          {hoveredTable === table.id && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute -top-16 left-1/2 transform -translate-x-1/2 bg-white border border-[#AB9C95] rounded-lg shadow-lg p-2 flex gap-2"
            >
              <button
                onClick={() => startEditing(table)}
                className="p-1 hover:bg-[#F3F2F0] rounded text-[#AB9C95] hover:text-[#332B42]"
                title="Edit table name"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => updateTable(table.id, { 
                  capacity: Math.max(4, table.capacity - 1) 
                })}
                className="p-1 hover:bg-[#F3F2F0] rounded text-[#AB9C95] hover:text-[#332B42]"
                title="Decrease capacity"
              >
                -
              </button>
              <span className={`px-2 py-1 text-sm font-medium ${getCapacityColor(table.capacity)}`}>
                {table.capacity}
              </span>
              <button
                onClick={() => updateTable(table.id, { 
                  capacity: Math.min(14, table.capacity + 1) 
                })}
                className="p-1 hover:bg-[#F3F2F0] rounded text-[#AB9C95] hover:text-[#332B42]"
                title="Increase capacity"
              >
                +
              </button>
              {!table.isDefault && (
                <button
                  onClick={() => removeTable(table.id)}
                  className="p-1 hover:bg-red-50 rounded text-red-500 hover:text-red-700"
                  title="Remove table"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </motion.div>
          )}
        </motion.div>
      </motion.div>
    );
  };

  return (
    <div className="space-y-6">




      {/* Visual Canvas Container */}
      <div className="relative">
        {/* Canvas Controls */}
        <div className="mb-4">
          <div className="text-sm text-[#AB9C95]">
            💡 <strong>Tip:</strong> Drag tables to rearrange • Hover to edit • Double-click names • Drag background to pan • Ctrl+Scroll to zoom
          </div>
        </div>
        
        {/* Canvas with edge-to-edge container */}
        <div className="relative w-full overflow-hidden" style={{ height: '500px' }}>
          <div 
            ref={canvasRef}
            className="bg-[#F8F6F4] border-2 border-dashed border-[#E0DBD7] rounded-[5px] w-full h-full relative cursor-grab active:cursor-grabbing"
            style={{ 
              backgroundImage: 'radial-gradient(circle, #E0DBD7 1px, transparent 1px)',
              backgroundSize: '20px 20px'
            }}
            onMouseDown={handleCanvasPan}
            onMouseMove={handleCanvasPanMove}
            onMouseUp={handleCanvasPanEnd}
            onMouseLeave={handleCanvasPanEnd}
            onWheel={handleWheel}
          >
            {/* Content container that moves within the grid */}
            <div 
              className="absolute inset-0"
              style={{ 
                transform: `translate(${canvasTransform.x}px, ${canvasTransform.y}px)`,
                transformOrigin: 'center'
              }}
            >
            {tableLayout.tables.length === 0 ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-4xl mb-4">🪑</div>
                  <p className="text-[#AB9C95] mb-2">No tables configured yet</p>
                  <p className="text-sm text-[#AB9C95]">
                    Add tables to see them appear here
                  </p>
                </div>
              </div>
            ) : (
              tableLayout.tables.map(table => renderTable(table))
            )}
            </div>
          </div>
        </div>
      </div>

      {/* Capacity Warning */}
      {guestCount > tableLayout.totalCapacity && tableLayout.tables.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-[5px] p-4">
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
    </div>
  );
}
