import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Trash2 } from 'lucide-react';
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
  { id: 'round', name: 'Round Table', icon: '●' },
  { id: 'long', name: 'Long Table', icon: '▭' },
  { id: 'oval', name: 'Oval Table', icon: '⬭' },
  { id: 'square', name: 'Square Table', icon: '■' }
];

const DEFAULT_CAPACITIES = {
  round: [4, 6, 8, 10, 12],
  long: [6, 8, 10, 12, 14],
  oval: [6, 8, 10, 12],
  square: [4, 6, 8, 10]
};

export default function TableLayoutStep({ 
  tableLayout, 
  onUpdate, 
  guestCount 
}: TableLayoutStepProps) {
  const [showAddTable, setShowAddTable] = useState(false);
  const [newTable, setNewTable] = useState({
    type: 'round' as const,
    capacity: 6,
    name: '',
    description: ''
  });

  // Create default sweetheart table when component loads
  useEffect(() => {
    if (tableLayout.tables.length === 0) {
      const sweetheartTable: TableType = {
        id: 'sweetheart-table',
        name: 'Sweetheart Table',
        type: 'long',
        capacity: 2,
        description: 'Special table for the happy couple',
        isDefault: true
      };
      
      onUpdate({
        tables: [sweetheartTable],
        totalCapacity: 2
      });
    }
  }, [tableLayout.tables.length, onUpdate]);

  const addTable = () => {
    if (!newTable.name.trim()) return;
    
    const newTableData: TableType = {
      id: `table-${Date.now()}`,
      name: newTable.name.trim(),
      type: newTable.type,
      capacity: newTable.capacity,
      description: newTable.description.trim() || '',
      isDefault: false
    };
    
    const updatedTables = [...tableLayout.tables, newTableData];
    const totalCapacity = updatedTables.reduce((sum, t) => sum + t.capacity, 0);
    
    onUpdate({ tables: updatedTables, totalCapacity });
    
    // Reset form
    setNewTable({
      type: 'round',
      capacity: 6,
      name: '',
      description: ''
    });
    
    setShowAddTable(false);
  };

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
  };

  return (
    <div className="space-y-6">




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



      {/* Visual Table Layout */}
      <VisualTableLayout
        tableLayout={tableLayout}
        onUpdate={onUpdate}
        guestCount={guestCount}
      />

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
