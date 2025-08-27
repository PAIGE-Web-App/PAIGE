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
  const [tablePositions, setTablePositions] = useState<TablePosition[]>(() => {
    // Initialize table positions in a grid layout
    return tableLayout.tables.map((table, index) => ({
      id: table.id,
      x: (index % 3) * 200 + 100,
      y: Math.floor(index / 3) * 200 + 100
    }));
  });

  const canvasRef = useRef<HTMLDivElement>(null);

  // Update positions when tables change
  React.useEffect(() => {
    const currentIds = tableLayout.tables.map(t => t.id);
    const existingPositions = tablePositions.filter(p => currentIds.includes(p.id));
    const newPositions = tableLayout.tables
      .filter(t => !tablePositions.find(p => p.id === t.id))
      .map((table, index) => ({
        id: table.id,
        x: (existingPositions.length + index) % 3 * 200 + 100,
        y: Math.floor((existingPositions.length + index) / 3) * 200 + 100
      }));
    
    setTablePositions([...existingPositions, ...newPositions]);
  }, [tableLayout.tables.length]);

  const handleDragEnd = useCallback((tableId: string, info: PanInfo) => {
    setDraggedTable(null);
    
    setTablePositions(prev => prev.map(pos => 
      pos.id === tableId 
        ? { ...pos, x: pos.x + info.offset.x, y: pos.y + info.offset.y }
        : pos
    ));
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
        className="absolute cursor-move"
        style={{
          left: position.x - shape.width / 2,
          top: position.y - shape.height / 2,
          zIndex: draggedTable === table.id ? 10 : 1
        }}
      >
        {/* Table Shape */}
        <motion.div
          className={`bg-white border-2 border-[#AB9C95] shadow-md relative ${
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
            <div className="text-center">
              <div className="font-semibold text-[#332B42] text-sm">{table.name}</div>
              <div className="text-xs text-[#AB9C95]">{table.type}</div>
            </div>
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
              className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-white border border-[#AB9C95] rounded-lg shadow-lg p-2 flex gap-2"
            >
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
              <button
                onClick={() => removeTable(table.id)}
                className="p-1 hover:bg-red-50 rounded text-red-500 hover:text-red-700"
                title="Remove table"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </motion.div>
          )}
        </motion.div>
      </motion.div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-playfair font-semibold text-[#332B42]">Visual Table Layout</h3>
          <p className="text-sm text-[#AB9C95]">
            Drag tables to arrange them, hover to edit capacities
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-[#F8F6F4] rounded-[5px] p-4 text-center">
          <div className="text-2xl font-bold text-[#332B42]">{tableLayout.tables.length}</div>
          <div className="text-sm text-[#AB9C95]">Total Tables</div>
        </div>
        <div className="bg-[#F8F6F4] rounded-[5px] p-4 text-center">
          <div className="text-2xl font-bold text-[#332B42]">{tableLayout.totalCapacity}</div>
          <div className="text-sm text-[#AB9C95]">Total Capacity</div>
        </div>
        <div className={`rounded-[5px] p-4 text-center ${
          guestCount > tableLayout.totalCapacity ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'
        }`}>
          <div className={`text-2xl font-bold ${guestCount > tableLayout.totalCapacity ? 'text-red-600' : 'text-green-600'}`}>
            {guestCount > tableLayout.totalCapacity ? '⚠️' : '✅'}
          </div>
          <div className={`text-sm ${guestCount > tableLayout.totalCapacity ? 'text-red-700' : 'text-green-700'}`}>
            {guestCount > tableLayout.totalCapacity ? `${Math.abs(guestCount - tableLayout.totalCapacity)} Over` : 'Perfect Fit'}
          </div>
        </div>
      </div>

      {/* Visual Canvas */}
      <div className="relative">
        <div 
          ref={canvasRef}
          className="bg-[#F8F6F4] border-2 border-dashed border-[#E0DBD7] rounded-[5px] min-h-[600px] relative overflow-hidden"
          style={{ backgroundImage: 'radial-gradient(circle, #E0DBD7 1px, transparent 1px)', backgroundSize: '20px 20px' }}
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

        {/* Canvas Instructions */}
        <div className="mt-4 text-center text-sm text-[#AB9C95]">
          <p>💡 <strong>Tip:</strong> Drag tables to rearrange • Hover over tables to edit • Each dot represents a seat</p>
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
