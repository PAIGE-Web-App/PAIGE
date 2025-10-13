import React from 'react';
import { Plus, RotateCcw } from 'lucide-react';

interface CanvasControlsProps {
  tableCount: number;
  totalCapacity: number;
  onReset: () => void;
  onAddTable: () => void;
}

export const CanvasControls: React.FC<CanvasControlsProps> = ({
  tableCount,
  totalCapacity,
  onReset,
  onAddTable
}) => {
  return (
    <>
      {/* Fixed Header */}
      <div className="absolute top-4 left-4 text-lg text-[#332B42] font-playfair font-semibold pointer-events-none z-20">
        Configure your Layout
      </div>
      
      {/* Fixed Total Tables Stat */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-white/80 backdrop-blur-sm border border-[#E0DBD7] rounded-lg px-3 py-2 text-xs text-[#AB9C95] shadow-sm pointer-events-none z-20">
        <span className="font-medium text-[#332B42]">{tableCount}</span> Total Tables • <span className="font-medium text-[#332B42]">{totalCapacity}</span> Guests
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
        <button
          onClick={onAddTable}
          className="btn-primary"
        >
          <Plus className="w-4 h-4" />
          Add Table
        </button>
      </div>
      
      {/* Fixed Tip Text */}
      <div className="absolute bottom-4 left-4 right-4 bg-white/80 backdrop-blur-sm border border-[#E0DBD7] rounded-lg px-3 py-2 text-xs text-[#AB9C95] shadow-sm pointer-events-none z-20 text-center">
        💡 <strong>Tip:</strong> Drag tables to rearrange • Drag canvas background to pan • Hold Alt + drag anywhere to pan • Scroll to zoom at cursor • Double-click to edit • Reset button to restore view
      </div>
    </>
  );
};
