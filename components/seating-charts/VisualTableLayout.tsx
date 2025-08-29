import React, { useState, useRef, useCallback } from 'react';
import { Stage, Layer, Group, Rect, Text, Circle, Image } from 'react-konva';
import { Edit2, Trash2, Move, Settings, RotateCw, Plus } from 'lucide-react';
import { TableType } from '../../types/seatingChart';
import { useAuth } from '../../contexts/AuthContext';
import { useUserProfileData } from '../../hooks/useUserProfileData';
import UserAvatar from '../UserAvatar';
import AddTableModal from './AddTableModal';

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
  rotation: number;
}

const TABLE_SHAPES = {
  round: {
    width: 120,
    height: 120,
    radius: 60,
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
    width: 200,
    height: 80,
    radius: 20,
    seatPositions: (capacity: number) => {
      const positions = [];
      const seatsPerSide = Math.ceil(capacity / 2);
      
      // Handle edge case for capacity 2 (sweetheart table)
      if (capacity === 2) {
        positions.push(
          { x: -40, y: -45 }, // Top left
          { x: 40, y: 45 }    // Bottom right
        );
        return positions;
      }
      
      const spacing = 160 / (seatsPerSide - 1);
      
      // Top side
      for (let i = 0; i < seatsPerSide; i++) {
        positions.push({
          x: (i * spacing) - 80,
          y: -45
        });
      }
      
      // Bottom side
      for (let i = 0; i < capacity - seatsPerSide; i++) {
        positions.push({
          x: (i * spacing) - 80,
          y: 45
        });
      }
      
      return positions;
    }
  },
  oval: {
    width: 140,
    height: 100,
    radius: 50,
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
    radius: 12,
    seatPositions: (capacity: number) => {
      const positions: Array<{x: number, y: number}> = [];
      
      // Simple approach: place seats around the perimeter
      for (let i = 0; i < capacity; i++) {
        if (i === 0) {
          // Top
          positions.push({ x: 0, y: -55 });
        } else if (i === 1) {
          // Right
          positions.push({ x: 55, y: 0 });
        } else if (i === 2) {
          // Bottom
          positions.push({ x: 0, y: 55 });
        } else if (i === 3) {
          // Left
          positions.push({ x: -55, y: 0 });
        } else if (i === 4) {
          // Top-right
          positions.push({ x: 30, y: -55 });
        } else if (i === 5) {
          // Bottom-right
          positions.push({ x: 55, y: 30 });
        } else if (i === 6) {
          // Bottom-left
          positions.push({ x: -30, y: 55 });
        } else if (i === 7) {
          // Top-left
          positions.push({ x: -55, y: -30 });
        } else {
          // For higher capacities, add more seats in between
          const side = i % 4;
          const position = Math.floor(i / 4);
          const offset = (position + 1) * 15;
          
          switch (side) {
            case 0: // Top
              positions.push({ x: -30 + offset, y: -55 });
              break;
            case 1: // Right
              positions.push({ x: 55, y: -30 + offset });
              break;
            case 2: // Bottom
              positions.push({ x: 30 - offset, y: 55 });
              break;
            case 3: // Left
              positions.push({ x: -55, y: 30 - offset });
              break;
          }
        }
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
  const { user, profileImageUrl } = useAuth();
  const { userName, partnerName } = useUserProfileData();
  
  const stageRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [stageSize, setStageSize] = useState({ width: 800, height: 500 });
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [editingTable, setEditingTable] = useState<string | null>(null);
  const [editingValues, setEditingValues] = useState({ name: '', description: '' });
  const [hoveredTable, setHoveredTable] = useState<string | null>(null);
  const [showAddTableModal, setShowAddTableModal] = useState(false);
  const [tablePositions, setTablePositions] = useState<TablePosition[]>(() => {
    // Initialize positions for existing tables
    return tableLayout.tables.map((table, index) => {
      if (table.isDefault) {
        // Sweetheart table at center
        return {
          id: table.id,
          x: 400,
          y: 300,
          rotation: 0
        };
      } else {
        // Other tables in a grid layout
        const baseX = (index % 4) * 300 + 100;
        const baseY = Math.floor(index / 4) * 300 + 100;
        return {
          id: table.id,
          x: baseX,
          y: baseY,
          rotation: 0
        };
      }
    });
  });

  // Measure container once on mount
  React.useEffect(() => {
    if (containerRef.current) {
      const { width, height } = containerRef.current.getBoundingClientRect();
      if (width > 0 && height > 0) {
        setStageSize({ width, height });
      }
    }
  }, []);

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
            x: 400,
            y: 300,
            rotation: 0
          };
        } else {
          // Other tables in a grid layout
          const baseX = (index % 4) * 300 + 100;
          const baseY = Math.floor(index / 4) * 300 + 100;
          return {
            id: table.id,
            x: baseX,
            y: baseY,
            rotation: 0
          };
        }
      });
    
    setTablePositions([...existingPositions, ...newPositions]);
  }, [tableLayout.tables.length]);

  const handleTableDragEnd = useCallback((tableId: string, e: any) => {
    const newPositions = tablePositions.map(pos => {
      if (pos.id === tableId) {
        return {
          ...pos,
          x: e.target.x(),
          y: e.target.y()
        };
      }
      return pos;
    });
    setTablePositions(newPositions);
  }, [tablePositions]);

  const handleTableRotate = useCallback((tableId: string, newRotation: number) => {
    const newPositions = tablePositions.map(pos => {
      if (pos.id === tableId) {
        return {
          ...pos,
          rotation: newRotation
        };
      }
      return pos;
    });
    setTablePositions(newPositions);
  }, [tablePositions]);

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
    if (capacity >= 10) return '#dc2626';
    if (capacity >= 8) return '#ea580c';
    return '#16a34a';
  };

  const renderTable = (table: TableType) => {
    const position = tablePositions.find(p => p.id === table.id);
    if (!position) return null;

    const shape = getTableShape(table.type);
    const seatPositions = shape.seatPositions(table.capacity);
    const isSelected = selectedTable === table.id;
    const isHovered = hoveredTable === table.id;

    return (
      <Group
        key={table.id}
        x={position.x}
        y={position.y}
        rotation={position.rotation}
        draggable
        onDragEnd={(e) => handleTableDragEnd(table.id, e)}
        onClick={() => setSelectedTable(table.id)}
        onMouseEnter={() => setHoveredTable(table.id)}
        onMouseLeave={() => setHoveredTable(null)}
        onDblClick={() => startEditing(table)}
      >
        {/* Table Shape */}
        <Rect
          width={shape.width}
          height={shape.height}
          x={-shape.width / 2}
          y={-shape.height / 2}
          fill={table.isDefault ? '#fce7f3' : '#f3f4f6'}
          stroke={isSelected ? '#a855f7' : isHovered ? '#a3a3a3' : '#d1d5db'}
          strokeWidth={isSelected ? 3 : isHovered ? 2 : 1}
          cornerRadius={shape.radius}
          shadowColor="black"
          shadowBlur={5}
          shadowOffset={{ x: 2, y: 2 }}
          shadowOpacity={0.1}
        />

        {/* Table Name - Manual centering with offsetX */}
        <Text
          text={table.name}
          x={0}
          y={0}
          align="left"
          fontSize={16}
          fill="black"
          offsetX={-80}
        />
        
        {/* Debug text to test positioning */}
        <Text
          text="CENTER"
          x={0}
          y={-50}
          fill="red"
          fontSize={12}
        />
        <Text
          text="LEFT"
          x={-100}
          y={-50}
          fill="blue"
          fontSize={12}
        />
        <Text
          text="RIGHT"
          x={100}
          y={-50}
          fill="green"
          fontSize={12}
        />

        {/* Table Type Badge - Only for non-sweetheart tables */}
        {!table.isDefault && (
          <>
            <Rect
              x={-shape.width / 2 + 5}
              y={-shape.height / 2 + 5}
              width={90}
              height={22}
              fill="#6b7280"
              cornerRadius={11}
              shadowColor="black"
              shadowBlur={3}
              shadowOffset={{ x: 1, y: 1 }}
              shadowOpacity={0.1}
            />
            <Text
              text={table.type}
              x={-shape.width / 2 + 5}
              y={-shape.height / 2 + 5}
              width={90}
              height={22}
              align="center"
              fontSize={11}
              fontFamily="var(--font-work-sans)"
              fill="white"
              offsetY={6}
            />
          </>
        )}

        {/* Capacity Badge - Removed for cleaner look */}

        {/* Seat Positions (only for non-sweetheart tables) */}
        {!table.isDefault && seatPositions.map((seat, index) => (
          <Circle
            key={index}
            x={seat.x}
            y={seat.y}
            radius={8}
            fill="#8b4513"
            stroke="#654321"
            strokeWidth={1}
          />
        ))}

        {/* Sweetheart Table Avatars */}
        {table.isDefault && (
          <>
            {/* User Avatar - Using your exact contact avatar styling */}
            <Group x={-50} y={50}>
              <Circle
                x={0}
                y={0}
                radius={16}
                fill="#A85C36"
                shadowColor="black"
                shadowBlur={3}
                shadowOffset={{ x: 1, y: 1 }}
                shadowOpacity={0.2}
              />
              {profileImageUrl ? (
                <Image
                  x={-16}
                  y={-16}
                  width={32}
                  height={32}
                  image={(() => {
                    const img = new window.Image();
                    img.src = profileImageUrl;
                    return img;
                  })()}
                  cornerRadius={16}
                />
              ) : (
                <Text
                  text={userName ? userName.charAt(0).toUpperCase() : 'Y'}
                  x={0}
                  y={0}
                  align="center"
                  fontSize={14}
                  fontFamily="var(--font-work-sans)"
                  fill="white"
                  fontStyle="normal"
                  offsetY={4}
                />
              )}
            </Group>
            
            {/* Partner Avatar - Using your exact contact avatar styling */}
            <Group x={50} y={50}>
              <Circle
                x={0}
                y={0}
                radius={16}
                fill="#364257"
                shadowColor="black"
                shadowBlur={3}
                shadowOffset={{ x: 1, y: 1 }}
                shadowOpacity={0.2}
              />
              <Text
                text={partnerName ? partnerName.charAt(0).toUpperCase() : 'M'}
                x={0}
                y={0}
                align="center"
                fontSize={14}
                fontFamily="var(--font-work-sans)"
                fill="white"
                fontStyle="normal"
                offsetY={4}
              />
            </Group>
            
            {/* Names below avatars - Manual centering with offsetX */}
            <Text
              text={userName || 'You'}
              x={-50}
              y={80}
              align="left"
              fontSize={12}
              fill="black"
              offsetX={-40}
            />
            <Text
              text={partnerName || 'Partner'}
              x={50}
              y={80}
              align="left"
              fontSize={12}
              fill="black"
              offsetX={-40}
            />
          </>
        )}

        {/* Rotation Handle */}
        <Circle
          x={0}
          y={-shape.height / 2 - 20}
          radius={8}
          fill="#6366f1"
          stroke="#4f46e5"
          strokeWidth={2}
          onMouseDown={(e) => {
            e.cancelBubble = true;
            // Start rotation
            const stage = e.target.getStage();
            const startRotation = position.rotation;
            const startAngle = Math.atan2(
              e.evt.clientY - stage.y() - position.y,
              e.evt.clientX - stage.x() - position.x
            );
            
            const handleMouseMove = (e: any) => {
              const angle = Math.atan2(
                e.clientY - stage.y() - position.y,
                e.clientX - stage.x() - position.x
              );
              const newRotation = startRotation + (angle - startAngle);
              handleTableRotate(table.id, newRotation);
            };
            
            const handleMouseUp = () => {
              document.removeEventListener('mousemove', handleMouseMove);
              document.removeEventListener('mouseup', handleMouseUp);
            };
            
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
          }}
        />
        <Text
          text="⟲"
          x={0}
          y={-shape.height / 2 - 20}
          align="center"
          fontSize={12}
          fill="white"
          offsetY={3}
        />
      </Group>
    );
  };

  return (
    <div className="space-y-6">
      {/* Visual Canvas Container */}
      <div className="relative">
        {/* Canvas with edge-to-edge container */}
        <div ref={containerRef} className="relative w-full overflow-hidden" style={{ height: '65vh' }}>
          {/* Fixed Header - Top Left (Fixed over the grid) */}
          <div className="absolute top-4 left-4 text-lg text-[#332B42] font-playfair font-semibold pointer-events-none z-20">
            Configure your Layout
          </div>
          
          {/* Fixed Total Tables Stat - Top Center (Fixed over the grid) */}
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-white/80 backdrop-blur-sm border border-[#E0DBD7] rounded-lg px-3 py-2 text-xs text-[#AB9C95] shadow-sm pointer-events-none z-20">
            <span className="font-medium text-[#332B42]">{tableLayout.tables.length}</span> Total Tables • <span className="font-medium text-[#332B42]">{tableLayout.totalCapacity}</span> Guests
          </div>
          
          {/* Fixed Add Table Button - Top Right (Fixed over the grid) */}
          <div className="absolute top-4 right-4 z-20">
            <button
              onClick={() => setShowAddTableModal(true)}
              className="btn-primary flex items-center gap-2 bg-white/80 backdrop-blur-sm border border-[#E0DBD7] hover:bg-white/90"
            >
              <Plus className="w-4 h-4" />
              Add Table
            </button>
          </div>
          
          {/* Fixed Tip Text - Bottom Left (Fixed over the grid) */}
          <div className="absolute bottom-4 left-4 bg-white/80 backdrop-blur-sm border border-[#E0DBD7] rounded-lg px-3 py-2 text-xs text-[#AB9C95] shadow-sm pointer-events-none z-20">
            💡 <strong>Tip:</strong> Drag tables to rearrange • Drag rotation handle to rotate • Double-click to edit • Ctrl+Scroll to zoom
          </div>
          
          {/* Konva Stage - Dynamic size based on container */}
          <Stage
            ref={stageRef}
            width={stageSize.width}
            height={stageSize.height}
            draggable
            onWheel={(e) => {
              e.evt.preventDefault();
              const scaleBy = 1.02;
              const stage = e.target.getStage();
              const oldScale = stage.scaleX();
              const pointer = stage.getPointerPosition();
              
              if (!pointer) return;
              
              const mousePointTo = {
                x: (pointer.x - stage.x()) / oldScale,
                y: (pointer.y - stage.y()) / oldScale,
              };
              
              const newScale = e.evt.deltaY > 0 ? oldScale * scaleBy : oldScale / scaleBy;
              
              stage.scale({ x: newScale, y: newScale });
              
              const newPos = {
                x: pointer.x - mousePointTo.x * newScale,
                y: pointer.y - mousePointTo.y * newScale,
              };
              stage.position(newPos);
              stage.batchDraw();
            }}
            style={{
              background: '#F8F6F4',
              border: '2px dashed #E0DBD7',
              borderRadius: '5px',
              cursor: 'grab',
              transform: 'none !important',
              direction: 'ltr'
            }}
          >
            <Layer>
              {/* Background Grid - Dynamic sizing */}
              <Group>
                {Array.from({ length: 200 }, (_, i) => (
                  <React.Fragment key={i}>
                    <Rect
                      x={i * 20}
                      y={0}
                      width={1}
                      height={2000}
                      fill="#E0DBD7"
                      opacity={0.3}
                    />
                    <Rect
                      x={0}
                      y={i * 20}
                      width={2000}
                      height={1}
                      fill="#E0DBD7"
                      opacity={0.3}
                    />
                  </React.Fragment>
                ))}
              </Group>
              
              {/* Tables */}
              {tableLayout.tables.length === 0 ? (
                <Group x={600} y={400}>
                  <Text
                    text="🪑"
                    fontSize={48}
                    align="center"
                    offsetX={24}
                    offsetY={24}
                  />
                  <Text
                    text="No tables configured yet"
                    fontSize={16}
                    fill="#AB9C95"
                    align="center"
                    offsetX={-50}
                    offsetY={50}
                  />
                  <Text
                    text="Add tables to see them appear here"
                    fontSize={14}
                    fill="#AB9C95"
                    align="center"
                    offsetX={-60}
                    offsetY={70}
                  />
                </Group>
              ) : (
                tableLayout.tables.map(table => renderTable(table))
              )}
            </Layer>
          </Stage>
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

      {/* Edit Modal */}
      {editingTable && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-semibold mb-4">Edit Table</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Table Name</label>
                <input
                  type="text"
                  value={editingValues.name}
                  onChange={(e) => setEditingValues(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Description (Optional)</label>
                <input
                  type="text"
                  value={editingValues.description}
                  onChange={(e) => setEditingValues(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => saveEditing(editingTable)}
                className="btn-primary flex-1"
              >
                Save
              </button>
              <button
                onClick={cancelEditing}
                className="btn-primaryinverse flex-1"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Table Modal */}
      <AddTableModal
        isOpen={showAddTableModal}
        onClose={() => setShowAddTableModal(false)}
        onAddTable={(tableData) => {
          // Generate a unique ID for the new table
          const newTable: TableType = {
            ...tableData,
            id: `table-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
          };
          
          // Add to table layout
          const updatedTables = [...tableLayout.tables, newTable];
          const totalCapacity = updatedTables.reduce((sum, t) => sum + t.capacity, 0);
          onUpdate({ tables: updatedTables, totalCapacity });
          
          // Add position for the new table
          const newPosition = {
            id: newTable.id,
            x: Math.random() * 400 + 200, // Random position in view
            y: Math.random() * 300 + 150,
            rotation: 0
          };
          setTablePositions(prev => [...prev, newPosition]);
        }}
      />
    </div>
  );
}
