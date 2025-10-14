import React, { useState } from 'react';
import { Plus, RotateCcw, ChevronDown } from 'lucide-react';

interface CanvasControlsProps {
  tableCount: number;
  totalCapacity: number;
  onReset: () => void;
  onAddTable: () => void;
  onAddFromTemplate: () => void;
}

export const CanvasControls: React.FC<CanvasControlsProps> = ({
  tableCount,
  totalCapacity,
  onReset,
  onAddTable,
  onAddFromTemplate
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  return (
    <>
      {/* Fixed Header */}
      <div className="absolute top-4 left-4 text-lg text-[#332B42] font-playfair font-semibold pointer-events-none z-20">
        Configure your Layout
      </div>
      
      {/* Fixed Total Tables Stat */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-white/80 backdrop-blur-sm border border-[#E0DBD7] rounded-lg px-3 py-2 text-xs text-[#AB9C95] shadow-sm pointer-events-none z-20">
        <span className="font-medium text-[#332B42]">{tableCount}</span> Total Tables • <span className="font-medium text-[#332B42]">{totalCapacity}</span> seats
      </div>
      
      {/* Fixed Add Table Button */}
      <div className="absolute top-4 right-4 z-20 flex gap-4">
        <button
          onClick={onReset}
          className="text-[#A85C36] hover:text-[#805d93] text-sm font-medium underline hover:no-underline transition-colors flex items-center gap-2"
          title="Reset View"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reset View
        </button>
        
        {/* Add Table Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add
            <ChevronDown className={`w-4 h-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {isDropdownOpen && (
            <>
              {/* Backdrop */}
              <div 
                className="fixed inset-0 z-10" 
                onClick={() => setIsDropdownOpen(false)}
              />
              
              {/* Dropdown */}
              <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
                <div className="p-1">
                  <button
                    onClick={() => {
                      onAddFromTemplate();
                      setIsDropdownOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                  >
                    <Plus className="w-4 h-4 text-blue-600" />
                    <div className="text-left">
                      <div className="font-medium">Add from Template</div>
                      <div className="text-xs text-gray-500">
                        Choose a pre-designed layout
                      </div>
                    </div>
                  </button>
                  
                  <button
                    onClick={() => {
                      onAddTable();
                      setIsDropdownOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                  >
                    <Plus className="w-4 h-4 text-green-600" />
                    <div className="text-left">
                      <div className="font-medium">Add Single Table</div>
                      <div className="text-xs text-gray-500">
                        Create one custom table
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
      
      {/* Fixed Tip Text */}
      <div className="absolute bottom-4 left-4 right-4 bg-white/80 backdrop-blur-sm border border-[#E0DBD7] rounded-lg px-3 py-2 text-xs text-[#AB9C95] shadow-sm pointer-events-none z-20 text-center">
        💡 <strong>Tip:</strong> Drag tables to rearrange • Drag canvas background to pan • Hold Alt + drag anywhere to pan • Scroll to zoom at cursor • Double-click to edit • Reset button to restore view
      </div>
    </>
  );
};
