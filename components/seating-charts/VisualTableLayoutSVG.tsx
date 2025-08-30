import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ListFilter } from 'lucide-react';
import { TableType, Guest } from '../../types/seatingChart';
import { useAuth } from '../../contexts/AuthContext';
import { useUserProfileData } from '../../hooks/useUserProfileData';
import AddTableModal from './AddTableModal';
import { CanvasControls } from './components/CanvasControls';
import { SVGCanvas } from './components/SVGCanvas';
import { TableEditModal } from './components/TableEditModal';
import { useTableDrag, TablePosition } from './hooks/useTableDrag';
import { useCanvasPanZoom } from './hooks/useCanvasPanZoom';
import { useTableResize } from './hooks/useTableResize';
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
}

export default function VisualTableLayoutSVG({
  tableLayout,
  onUpdate,
  onAddTable,
  guestCount,
  guests,
  onGuestAssignment
}: VisualTableLayoutSVGProps) {
  const { profileImageUrl } = useAuth();
  const { userName, partnerName } = useUserProfileData();
  
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [editingTable, setEditingTable] = useState<string | null>(null);
  const [editingValues, setEditingValues] = useState({ name: '', description: '' });
  const [hoveredTable, setHoveredTable] = useState<string | null>(null);
  const [showAddTableModal, setShowAddTableModal] = useState(false);
  
  // Table resize state
  const [tableDimensions, setTableDimensions] = useState<Record<string, { width: number; height: number }>>({});
  
  // Guest assignment state
  const [guestAssignments, setGuestAssignments] = useState<Record<string, { tableId: string; seatNumber: number }>>({});
  
  // Guest sidebar state
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [sortOption, setSortOption] = useState('name-asc');
  const [selectedRelationshipFilter, setSelectedRelationshipFilter] = useState<string[]>([]);
  
  // Action icons state
  const [showingActions, setShowingActions] = useState<string | null>(null);
  
  // Refs for click outside detection
  const filterButtonRef = useRef<HTMLButtonElement>(null);
  const filtersPopoverRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  
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
  
  const { resizeState, startResize, updateResize, stopResize } = useTableResize();

  // Get unassigned guests (guests not yet assigned to tables)
  const unassignedGuests = guests.filter(guest => !guestAssignments[guest.id]);
  
  // Get assigned guests count for each table
  const getTableAssignedCount = (tableId: string) => {
    return Object.values(guestAssignments).filter(assignment => assignment.tableId === tableId).length;
  };
  
  // Handle guest assignment when dropped on a seat
  const handleGuestDrop = (guestId: string, tableId: string, seatNumber: number) => {
    // Validation: Check if the guest exists
    const guest = guests.find(g => g.id === guestId);
    if (!guest) {
      console.warn('Guest not found:', guestId);
      return;
    }
    
    // Validation: Check if the table exists
    const table = tableLayout.tables.find(t => t.id === tableId);
    if (!table) {
      console.warn('Table not found:', tableId);
      return;
    }
    
    // Validation: Check if seat number is valid (allow -1 for removal)
    if (seatNumber !== -1 && (seatNumber < 0 || seatNumber >= table.capacity)) {
      console.warn('Invalid seat number:', seatNumber, 'for table capacity:', table.capacity);
      return;
    }
    
    // Remove any existing assignment for this guest
    const newAssignments = { ...guestAssignments };
    
    // Remove old assignment if guest was already assigned
    Object.keys(newAssignments).forEach(key => {
      if (newAssignments[key].tableId === tableId && newAssignments[key].seatNumber === seatNumber) {
        delete newAssignments[key];
      }
    });
    
    // Handle seat removal (seatNumber === -1)
    if (seatNumber === -1) {
      // Remove the guest's assignment
      delete newAssignments[guestId];
    } else {
      // Add new assignment
      newAssignments[guestId] = { tableId, seatNumber };
    }
    
    setGuestAssignments(newAssignments);
    
    // Call parent callback if provided
    if (onGuestAssignment) {
      onGuestAssignment(guestId, tableId, seatNumber);
    }
  };
  
  // Handle action icon clicks
  const handleAvatarClick = (tableId: string, seatNumber: number) => {
    const actionKey = `${tableId}-${seatNumber}`;
    console.log('Avatar click detected:', tableId, seatNumber, 'Action key:', actionKey);
    console.log('Current showingActions:', showingActions);
    
    const newValue = showingActions === actionKey ? null : actionKey;
    console.log('Setting showingActions to:', newValue);
    setShowingActions(newValue);
    
    // Force a re-render to see the change
    setTimeout(() => {
      console.log('After setState, showingActions is now:', showingActions);
    }, 0);
  };
  
  // Debug: Log all table IDs and seat numbers (only when needed)
  // console.log('Available action keys:', tableLayout.tables.flatMap(table => 
  //   Array.from({ length: table.capacity }, (_, i) => `${table.id}-${i}`)
  // ));
  
  const handleMoveGuest = (guestId: string, tableId: string, seatNumber: number) => {
    // Remove current assignment and set to "moving" state
    const newAssignments = { ...guestAssignments };
    delete newAssignments[guestId];
    setGuestAssignments(newAssignments);
    setShowingActions(null);
    
    // TODO: Implement move mode - for now just remove
    if (onGuestAssignment) {
      onGuestAssignment(guestId, tableId, -1);
    }
  };
  
  const handleRemoveGuest = (guestId: string, tableId: string, seatNumber: number) => {
    handleGuestDrop(guestId, tableId, -1);
    setShowingActions(null);
  };
  
  // Get unique relationships for filtering
  const allRelationships = useMemo(() => {
    const relationships = guests.map(guest => guest.relationship).filter(Boolean) as string[];
    return [...new Set(relationships)];
  }, [guests]);
  
  // Handle clicking outside action icons to close them
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showingActions && canvasRef.current && !canvasRef.current.contains(event.target as Node)) {
        setShowingActions(null);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showingActions]);
  
  // Filter and sort guests
  const displayGuests = useMemo(() => {
    let filtered = unassignedGuests;
    
    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(guest => 
        `${guest.firstName} ${guest.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
        guest.relationship?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Apply relationship filter
    if (selectedRelationshipFilter.length > 0) {
      filtered = filtered.filter(guest => 
        guest.relationship && selectedRelationshipFilter.includes(guest.relationship)
      );
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      const nameA = `${a.firstName} ${a.lastName}`.toLowerCase();
      const nameB = `${b.firstName} ${b.lastName}`.toLowerCase();
      
      switch (sortOption) {
        case 'name-desc':
          return nameB.localeCompare(nameA);
        case 'name-asc':
        default:
          return nameA.localeCompare(nameB);
      }
    });
    
    return filtered;
  }, [unassignedGuests, searchQuery, selectedRelationshipFilter, sortOption]);
  
  // Generate consistent avatar color for guest
  const getGuestAvatarColor = (guestId: string) => {
    const colors = [
      '#A85C36', '#364257', '#8B5A96', '#2E8B57', '#D2691E',
      '#4682B4', '#CD853F', '#708090', '#20B2AA', '#FF6347'
    ];
    const hash = guestId.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    return colors[Math.abs(hash) % colors.length];
  };
  
  // Handle filter changes
  const handleRelationshipChange = (relationship: string) => {
    setSelectedRelationshipFilter(prev => 
      prev.includes(relationship) 
        ? prev.filter(r => r !== relationship)
        : [...prev, relationship]
    );
  };
  
  const handleClearRelationshipFilter = (relationship: string) => {
    setSelectedRelationshipFilter(prev => prev.filter(r => r !== relationship));
  };
  
  const handleClearSortOption = () => {
    setSortOption('name-asc');
  };
  
  // Close filters when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (showFilters && 
          filterButtonRef.current && !filterButtonRef.current.contains(target) &&
          filtersPopoverRef.current && !filtersPopoverRef.current.contains(target)) {
        setShowFilters(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showFilters]);

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
    const newDimensions = updateResize(mouseX, mouseY, { 
      width: currentDimensions.width, 
      height: currentDimensions.height,
      seatPositions: () => [] // Placeholder, not used in resize calculation
    });
    
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
      <div className="w-[320px] bg-[#F3F2F0] flex-shrink-0 flex flex-col border-r border-[#E0DBD7]">
        {/* Header with search and filters */}
        <div className="p-4 border-b border-[#AB9C95]">
          <div className="flex items-center gap-4 mb-3">
            <div className="relative">
              <button
                ref={filterButtonRef}
                onClick={() => setShowFilters(!showFilters)}
                className="filter-button flex items-center justify-center border border-[#AB9C95] rounded-[5px] text-[#332B42] hover:text-[#A85C36] px-3 py-1 text-xs"
                aria-label="Toggle Filters"
              >
                <ListFilter className="w-4 h-4" />
              </button>
              
              {/* Filters Popover - Positioned absolutely to overlay content */}
              <AnimatePresence>
                {showFilters && (
                  <motion.div
                    ref={filtersPopoverRef}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="absolute top-full left-0 mt-2 p-4 bg-white border border-[#AB9C95] rounded-[5px] shadow-lg z-30 min-w-[250px] space-y-3"
                  >
                    <div>
                      <span className="text-xs font-medium text-[#332B42] block mb-2">Filter by Relationship</span>
                      <div className="flex flex-wrap gap-2">
                        {allRelationships.map((relationship) => (
                          <label key={relationship} className="flex items-center text-xs text-[#332B42] cursor-pointer">
                            <input
                              type="checkbox"
                              value={relationship}
                              checked={selectedRelationshipFilter.includes(relationship)}
                              onChange={() => handleRelationshipChange(relationship)}
                              className="mr-1 rounded text-[#A85C36] focus:ring-[#A85C36]"
                            />
                            {relationship}
                          </label>
                        ))}
                      </div>
                    </div>
                    <div>
                      <span className="text-xs font-medium text-[#332B42] block mb-2">Sort by</span>
                      <select
                        value={sortOption}
                        onChange={(e) => setSortOption(e.target.value)}
                        className="w-full text-xs border border-[#AB9C95] rounded-[5px] px-2 py-1 focus:border-[#A85C36] focus:ring-0"
                      >
                        <option value="name-asc">Name (A-Z)</option>
                        <option value="name-desc">Name (Z-A)</option>
                      </select>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <div className="relative flex-1">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-4 text-[#AB9C95]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 104.5 4.5a7.5 7.5 0 0012.15 12.15z"
                />
              </svg>
              <input
                type="text"
                placeholder="Search guests..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-6 text-xs text-[#332B42] border-0 border-b border-[#AB9C95] focus:border-[#A85C36] focus:ring-0 py-1 placeholder:text-[#AB9C95] focus:outline-none bg-transparent"
              />
            </div>
          </div>
        </div>
        
        {/* Active Filters Display */}
        {(selectedRelationshipFilter.length > 0 || sortOption !== 'name-asc') && (
          <div className="px-4 py-2 border-b border-[#AB9C95] bg-[#F8F6F4]">
            <div className="flex flex-wrap gap-2">
              {selectedRelationshipFilter.map((relationship) => (
                <span key={relationship} className="flex items-center gap-1 bg-[#EBE3DD] border border-[#A85C36] rounded-full px-2 py-0.5 text-xs text-[#332B42]">
                  {relationship}
                  <button onClick={() => handleClearRelationshipFilter(relationship)} className="ml-1 text-[#A85C36] hover:text-[#784528]">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              ))}
              {sortOption !== 'name-asc' && (
                <span className="flex items-center gap-1 bg-[#EBE3DD] border border-[#A85C36] rounded-full px-2 py-0.5 text-xs text-[#332B42]">
                  Sort: {sortOption === 'name-desc' ? 'Name (Z-A)' : 'Name (A-Z)'}
                  <button onClick={handleClearSortOption} className="ml-1 text-[#A85C36] hover:text-[#784528]">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              )}
            </div>
          </div>
        )}
        
        {/* Guest List */}
        <div className="flex-1 overflow-y-auto p-4">
          {displayGuests.length === 0 ? (
            <div className="text-center py-8 text-[#6b7280]">
              {unassignedGuests.length === 0 ? (
                <>
                  <div className="text-2xl mb-2">🎉</div>
                  <p className="font-medium">All guests assigned!</p>
                  <p className="text-sm mt-1">Everyone has a seat at a table</p>
                </>
              ) : (
                <>
                  <div className="text-2xl mb-2">🔍</div>
                  <p className="font-medium">No guests found</p>
                  <p className="text-sm mt-1">Try adjusting your search or filters</p>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {displayGuests.map((guest) => (
                <div 
                  key={guest.id}
                  className="p-3 rounded-[5px] border border-transparent hover:border-[#AB9C95] bg-white shadow-sm cursor-grab active:cursor-grabbing hover:shadow-md transition-all duration-300 ease-in-out"
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('text/plain', guest.id);
                    e.dataTransfer.effectAllowed = 'copy';
                    
                    // Set drag image to show guest being dragged
                    const dragImage = e.currentTarget.cloneNode(true) as HTMLElement;
                    dragImage.style.opacity = '0.8';
                    dragImage.style.transform = 'scale(0.8)';
                    dragImage.style.position = 'absolute';
                    dragImage.style.top = '-1000px';
                    dragImage.style.left = '-1000px';
                    document.body.appendChild(dragImage);
                    e.dataTransfer.setDragImage(dragImage, 20, 20);
                    
                    // Remove the temporary element after drag starts
                    setTimeout(() => {
                      document.body.removeChild(dragImage);
                    }, 0);
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div
                        className="h-8 w-8 min-w-[32px] min-h-[32px] flex items-center justify-center rounded-full text-white text-[14px] font-normal"
                        style={{ backgroundColor: getGuestAvatarColor(guest.id) }}
                      >
                        {guest.firstName.charAt(0)}{guest.lastName.charAt(0)}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-[#332B42] truncate">
                        {guest.firstName} {guest.lastName}
                      </div>
                      <div className="flex items-center gap-2">
                        {guest.relationship && (
                          <div className="text-xs text-[#6b7280] truncate">
                            {guest.relationship}
                          </div>
                        )}
                        {guestAssignments[guest.id] && (
                          <div className="text-xs text-[#A85C36] font-medium">
                            ✓ Assigned to Table {guestAssignments[guest.id].seatNumber + 1}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

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
            profileImageUrl={profileImageUrl || undefined}
            userName={userName || undefined}
            partnerName={partnerName || undefined}
            guestAssignments={guestAssignments}
            onGuestDrop={handleGuestDrop}
            guests={guests}
            showingActions={showingActions}
            onAvatarClick={handleAvatarClick}
            onMoveGuest={handleMoveGuest}
            onRemoveGuest={handleRemoveGuest}
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
    </div>
  );
}
