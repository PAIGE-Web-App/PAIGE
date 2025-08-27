import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Trash2, Move, Settings, Grid3X3, List } from 'lucide-react';
import { TableType } from '../../types/seatingChart';
import VisualTableLayout from './VisualTableLayout';

interface TableLayoutStepProps {
  tableLayout: {
    tables: TableType[];
    totalCapacity: number;
  };
  onUpdate: (updates: { tables: TableType[]; totalCapacity: number }) => void;
  guestCount: number;
}

const TABLE_TYPES = [
  { id: 'round', name: 'Round', icon: '●', description: 'Traditional round tables' },
  { id: 'long', name: 'Long', icon: '▬', description: 'Rectangular banquet tables' },
  { id: 'oval', name: 'Oval', icon: '⬭', description: 'Elegant oval tables' },
  { id: 'square', name: 'Square', icon: '■', description: 'Modern square tables' }
];

const DEFAULT_CAPACITIES = {
  round: [6, 8, 10, 12],
  long: [6, 8, 10, 12, 14],
  oval: [8, 10, 12],
  square: [4, 6, 8]
};

export default function TableLayoutStep({ 
  tableLayout, 
  onUpdate, 
  guestCount 
}: TableLayoutStepProps) {
  const [showAddTable, setShowAddTable] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'visual'>('visual');
  const [newTable, setNewTable] = useState({
    type: 'round' as const,
    capacity: 8,
    name: '',
    description: ''
  });

  const addTable = () => {
    if (!newTable.name.trim()) return;
    
    const table: TableType = {
      id: `table-${Date.now()}`,
      name: newTable.name.trim(),
      type: newTable.type,
      capacity: newTable.capacity,
      description: newTable.description || `${newTable.type} table seating ${newTable.capacity}`,
      isDefault: false
    };

    const updatedTables = [...tableLayout.tables, table];
    const totalCapacity = updatedTables.reduce((sum, t) => sum + t.capacity, 0);
    
    onUpdate({ tables: updatedTables, totalCapacity });
    
    // Reset form
    setNewTable({ type: 'round', capacity: 8, name: '', description: '' });
    setShowAddTable(false);
  };

  const removeTable = (tableId: string) => {
    const updatedTables = tableLayout.tables.filter(t => t.id !== tableId);
    const totalCapacity = updatedTables.reduce((sum, t) => sum + t.capacity, 0);
    onUpdate({ tables: updatedTables, totalCapacity });
  };

  const updateTable = (tableId: string, updates: Partial<TableType>) => {
    const updatedTables = tableLayout.tables.map(t => 
      t.id === tableId ? { ...t, ...updates } : t
    );
    const totalCapacity = updatedTables.reduce((sum, t) => sum + t.capacity, 0);
    onUpdate({ tables: updatedTables, totalCapacity });
  };

  const getTableIcon = (type: string) => {
    const tableType = TABLE_TYPES.find(t => t.id === type);
    return tableType?.icon || '●';
  };

  const getCapacityColor = (capacity: number) => {
    if (capacity >= 10) return 'text-red-600';
    if (capacity >= 8) return 'text-orange-600';
    return 'text-green-600';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-playfair font-semibold text-[#332B42]">Table Layout</h3>
          <p className="text-sm text-[#AB9C95]">
            Configure your table arrangement and seating capacity
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* View Toggle */}
          <div className="flex bg-[#F3F2F0] rounded-lg p-1">
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-all ${
                viewMode === 'list' 
                  ? 'bg-white text-[#332B42] shadow-sm' 
                  : 'text-[#AB9C95] hover:text-[#332B42]'
              }`}
            >
              <List className="w-4 h-4 inline mr-2" />
              List View
            </button>
            <button
              onClick={() => setViewMode('visual')}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-all ${
                viewMode === 'visual' 
                  ? 'bg-white text-[#332B42] shadow-sm' 
                  : 'text-[#AB9C95] hover:text-[#332B42]'
              }`}
            >
              <Grid3X3 className="w-4 h-4 inline mr-2" />
              Visual View
            </button>
          </div>
          
          <button
            onClick={() => setShowAddTable(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Table
          </button>
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
        <div className="bg-[#F8F6F4] rounded-[5px] p-4 text-center">
          <div className={`text-2xl font-bold ${guestCount > tableLayout.totalCapacity ? 'text-red-600' : 'text-green-600'}`}>
            {guestCount > tableLayout.totalCapacity ? 'Over' : 'Under'}
          </div>
          <div className="text-sm text-[#AB9C95]">
            {Math.abs(guestCount - tableLayout.totalCapacity)} {guestCount > tableLayout.totalCapacity ? 'Over' : 'Under'}
          </div>
        </div>
      </div>

      {/* Add Table Modal */}
      {showAddTable && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="bg-[#F8F6F4] rounded-[5px] p-6 border border-[#E0DBD7]"
        >
          <h4 className="font-medium text-[#332B42] mb-4">Add New Table</h4>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-[#332B42] mb-2">Table Type</label>
              <select
                value={newTable.type}
                onChange={(e) => setNewTable(prev => ({ 
                  ...prev, 
                  type: e.target.value as any,
                  capacity: DEFAULT_CAPACITIES[e.target.value as keyof typeof DEFAULT_CAPACITIES][0]
                }))}
                className="w-full border border-[#AB9C95] px-3 py-2 text-sm rounded-[5px] focus:outline-none focus:ring-2 focus:ring-[#A85C36]"
              >
                {TABLE_TYPES.map(type => (
                  <option key={type.id} value={type.id}>
                    {type.icon} {type.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-xs font-medium text-[#332B42] mb-2">Capacity</label>
              <select
                value={newTable.capacity}
                onChange={(e) => setNewTable(prev => ({ ...prev, capacity: parseInt(e.target.value) }))}
                className="w-full border border-[#AB9C95] px-3 py-2 text-sm rounded-[5px] focus:outline-none focus:ring-2 focus:ring-[#A85C36]"
              >
                {DEFAULT_CAPACITIES[newTable.type].map(cap => (
                  <option key={cap} value={cap}>{cap} guests</option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="mb-4">
            <label className="block text-xs font-medium text-[#332B42] mb-2">Table Name</label>
            <input
              type="text"
              value={newTable.name}
              onChange={(e) => setNewTable(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g., Head Table, Family Table 1"
              className="w-full border border-[#AB9C95] px-3 py-2 text-sm rounded-[5px] focus:outline-none focus:ring-2 focus:ring-[#A85C36]"
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-xs font-medium text-[#332B42] mb-2">Description (Optional)</label>
            <input
              type="text"
              value={newTable.description}
              onChange={(e) => setNewTable(prev => ({ ...prev, description: e.target.value }))}
              placeholder="e.g., Near the dance floor, Close to entrance"
              className="w-full border border-[#AB9C95] px-3 py-2 text-sm rounded-[5px] focus:outline-none focus:ring-2 focus:ring-[#A85C36]"
            />
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={addTable}
              disabled={!newTable.name.trim()}
              className="btn-primary flex-1"
            >
              Add Table
            </button>
            <button
              onClick={() => setShowAddTable(false)}
              className="btn-primaryinverse flex-1"
            >
              Cancel
            </button>
          </div>
        </motion.div>
      )}

      {/* Conditional View Rendering */}
      {viewMode === 'visual' ? (
        <VisualTableLayout
          tableLayout={tableLayout}
          onUpdate={onUpdate}
          guestCount={guestCount}
        />
      ) : (
        /* List View */
        <>
          {/* Table List */}
          {tableLayout.tables.length > 0 ? (
            <div className="space-y-3">
              {tableLayout.tables.map((table, index) => (
                <motion.div
                  key={table.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white border border-[#E0DBD7] rounded-[5px] p-4 flex items-center justify-between"
                >
                  <div className="flex items-center gap-4">
                    <div className="text-2xl text-[#AB9C95]">
                      {getTableIcon(table.type)}
                    </div>
                    
                    <div>
                      <div className="font-medium text-[#332B42]">{table.name}</div>
                      <div className="text-sm text-[#AB9C95]">{table.description}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className={`font-bold text-lg ${getCapacityColor(table.capacity)}`}>
                        {table.capacity}
                      </div>
                      <div className="text-xs text-[#AB9C95]">guests</div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateTable(table.id, { 
                          capacity: Math.max(4, table.capacity - 1) 
                        })}
                        className="p-1 hover:bg-[#F3F2F0] rounded"
                        title="Decrease capacity"
                      >
                        -
                      </button>
                      <button
                        onClick={() => updateTable(table.id, { 
                          capacity: Math.min(14, table.capacity + 1) 
                        })}
                        className="p-1 hover:bg-[#F3F2F0] rounded"
                        title="Increase capacity"
                      >
                        +
                      </button>
                      <button
                        onClick={() => removeTable(table.id)}
                        className="p-1 hover:bg-red-50 rounded text-red-500"
                        title="Remove table"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-4xl mb-4">🪑</div>
              <p className="text-[#AB9C95] mb-2">No tables configured yet</p>
              <p className="text-sm text-[#AB9C95]">
                Add your first table to get started with the seating arrangement
              </p>
            </div>
          )}
        </>
      )}

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
