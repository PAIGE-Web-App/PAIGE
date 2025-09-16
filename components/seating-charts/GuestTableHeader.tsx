import React, { useState, useRef, useCallback } from 'react';
import { Edit2, X, Sparkles } from 'lucide-react';
import { GuestColumn } from './types';

interface GuestTableHeaderProps {
  guestColumns: GuestColumn[];
  onUpdateColumn: (columnId: string, updates: Partial<GuestColumn>) => void;
  onRemoveColumn: (columnId: string) => void;
  onDragStart: (e: React.DragEvent, columnId: string) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, targetColumnId: string) => void;
  onDragEnd: (e: React.DragEvent) => void;
  onGenerateNotes?: () => void;
  onColumnResize?: (columnId: string, newWidth: number) => void;
  fullNameColumnWidth?: number;
  onColumnDragStart?: (e: React.DragEvent, columnId: string) => void;
  onColumnDragOver?: (e: React.DragEvent, targetColumnId: string) => void;
  onColumnDragLeave?: (e: React.DragEvent) => void;
  onColumnDrop?: (e: React.DragEvent, targetColumnId: string) => void;
  onColumnDragEnd?: (e: React.DragEvent) => void;
  // Selection props
  selectedGuests?: Set<string>;
  totalGuests?: number;
  onSelectAll?: () => void;
  onClearSelection?: () => void;
}

export default function GuestTableHeader({
  guestColumns,
  onUpdateColumn,
  onRemoveColumn,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
  onGenerateNotes,
  onColumnResize,
  fullNameColumnWidth = 200,
  onColumnDragStart,
  onColumnDragOver,
  onColumnDragLeave,
  onColumnDrop,
  onColumnDragEnd,
  selectedGuests,
  totalGuests,
  onSelectAll,
  onClearSelection
}: GuestTableHeaderProps) {
  const handleResizeStart = useCallback((e: React.MouseEvent, columnId: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    const startX = e.clientX;
    const column = guestColumns.find(col => col.id === columnId);
    const startWidth = column?.width || (columnId === 'fullName' ? fullNameColumnWidth : 150);
    

    
    const handleMouseMove = (e: MouseEvent) => {
      e.preventDefault();
      if (!onColumnResize) {
        console.log('onColumnResize not available');
        return;
      }
      
      const deltaX = e.clientX - startX;
      const newWidth = Math.max(100, startWidth + deltaX);
      

      onColumnResize(columnId, newWidth);
    };
    
    const handleMouseUp = (e: MouseEvent) => {
      e.preventDefault();

      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove, { passive: false });
    document.addEventListener('mouseup', handleMouseUp, { passive: false });
  }, [guestColumns, onColumnResize, fullNameColumnWidth]);


  const isAllSelected = selectedGuests && totalGuests && selectedGuests.size === totalGuests;
  const isIndeterminate = selectedGuests && totalGuests && selectedGuests.size > 0 && selectedGuests.size < totalGuests;

  return (
    <thead>
      <tr className="bg-[#F8F6F4] border-b border-[#E0DBD7]">
        {/* Selection Column */}
        <th className="p-3 text-center text-sm font-medium text-[#AB9C95] border-r border-[#E0DBD7] whitespace-nowrap" style={{ width: '40px' }}>
          <input
            type="checkbox"
            checked={!!isAllSelected}
            ref={(input) => {
              if (input) input.indeterminate = !!isIndeterminate;
            }}
            onChange={() => {
              if (isAllSelected) {
                onClearSelection?.();
              } else {
                onSelectAll?.();
              }
            }}
            className="rounded border-[#AB9C95] text-[#A85C36] focus:ring-[#A85C36] w-4 h-4"
          />
        </th>
        
        {/* Fixed Full Name Column */}
        <th 
          className="p-3 text-left text-sm font-medium text-[#AB9C95] border-r-2 border-[#AB9C95] whitespace-nowrap relative group bg-[#F8F6F4]"
          style={{ 
            width: `${fullNameColumnWidth}px`,
            minWidth: `${fullNameColumnWidth}px`,
            maxWidth: `${fullNameColumnWidth}px`,
            position: 'sticky',
            left: '40px',
            zIndex: 10,
            boxShadow: '2px 0 4px rgba(0,0,0,0.1)'
          }}
        >
          <span className="truncate block w-full cursor-default">
            Full Name<span className="text-[#A85C36]">*</span>
          </span>
          {/* Resize handle */}
          <div
            className="absolute top-0 right-0 w-1 h-full cursor-col-resize opacity-0 group-hover:opacity-100 hover:bg-[#A85C36] transition-opacity"
            onMouseDown={(e) => {
      
              handleResizeStart(e, 'fullName');
            }}
          />
        </th>
        
        {/* Dynamic Columns */}
        {guestColumns.map((column, index) => (
          <th 
            key={column.id} 
            className={`p-3 text-left text-sm font-medium text-[#AB9C95] border-r border-[#E0DBD7] last:border-r-0 whitespace-nowrap relative group ${
              column.key !== 'fullName' ? 'cursor-move hover:bg-[#F0F0F0]' : ''
            }`}
            style={{ 
              width: `${column.width || 150}px`,
              minWidth: `${column.width || 150}px`,
              maxWidth: `${column.width || 150}px`,
              transform: `translateX(${index * 0}px)`
            }}
            draggable={column.key !== 'fullName'}
            onDragStart={(e) => column.key !== 'fullName' && onColumnDragStart ? onColumnDragStart(e, column.id) : undefined}
            onDragOver={(e) => column.key !== 'fullName' && onColumnDragOver ? onColumnDragOver(e, column.id) : undefined}
            onDragLeave={(e) => column.key !== 'fullName' && onColumnDragLeave ? onColumnDragLeave(e) : undefined}
            onDrop={(e) => column.key !== 'fullName' && onColumnDrop ? onColumnDrop(e, column.id) : undefined}
            onDragEnd={(e) => column.key !== 'fullName' && onColumnDragEnd ? onColumnDragEnd(e) : undefined}
          >
            <div className="flex items-center justify-between group">
              <div className="flex-1 min-w-0 flex items-center gap-2">
                {/* Drag Handle Icon - Left of column name */}
                <div className="text-[#AB9C95] opacity-60 flex-shrink-0">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM8 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM8 18a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM20 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM20 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM20 18a2 2 0 1 1-4 0 2 2 0 0 1 4 0z"/>
                  </svg>
                </div>
                
                {column.isEditing ? (
                  <input
                    type="text"
                    value={column.editingLabel || column.label}
                    onChange={(e) => onUpdateColumn(column.id, { editingLabel: e.target.value })}
                    onBlur={() => {
                      if (column.editingLabel && column.editingLabel.trim()) {
                        onUpdateColumn(column.id, { 
                          label: column.editingLabel.trim(),
                          isEditing: false,
                          editingLabel: undefined
                        });
                      } else {
                        onUpdateColumn(column.id, { 
                          isEditing: false,
                          editingLabel: undefined
                        });
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        if (column.editingLabel && column.editingLabel.trim()) {
                          onUpdateColumn(column.id, { 
                            label: column.editingLabel.trim(),
                            isEditing: false,
                            editingLabel: undefined
                          });
                        }
                      } else if (e.key === 'Escape') {
                        onUpdateColumn(column.id, { 
                          isEditing: false,
                          editingLabel: undefined
                        });
                      }
                    }}
                    className="w-full text-sm font-medium text-[#AB9C95] bg-transparent border-none outline-none focus:ring-0"
                    autoFocus
                  />
                ) : (
                  <span 
                    className="truncate block w-full cursor-default"
                    title={column.label}
                  >
                    {column.label}
                    {column.isRequired && <span className="text-[#A85C36]">*</span>}
                  </span>
                )}
              </div>
              
              <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                {/* For Notes column: Show remove button on hover, then always-visible Generate link */}
                {column.key === 'notes' ? (
                  <>
                    {column.isRemovable && (
                      <button
                        onClick={() => onRemoveColumn(column.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-[#F3F2F0] rounded"
                        title="Remove column"
                      >
                        <X className="w-3 h-3 text-[#AB9C95]" />
                      </button>
                    )}
                    {onGenerateNotes && (
                      <button
                        onClick={onGenerateNotes}
                        className="flex items-center gap-1 text-xs text-[#805d93] hover:text-[#6a4d7a] transition-colors"
                        title="Generate AI notes for all guests"
                      >
                        <Sparkles className="w-3 h-3" />
                        <span>Generate</span>
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    {column.isEditable && !column.isEditing && (
                      <button
                        onClick={() => onUpdateColumn(column.id, { 
                          isEditing: true, 
                          editingLabel: column.label 
                        })}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-[#F3F2F0] rounded"
                        title="Edit column name"
                      >
                        <Edit2 className="w-3 h-3 text-[#AB9C95]" />
                      </button>
                    )}

                    {column.isRemovable && (
                      <button
                        onClick={() => onRemoveColumn(column.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-[#F3F2F0] rounded"
                        title="Remove column"
                      >
                        <X className="w-3 h-3 text-[#AB9C95]" />
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
            {/* Resize handle */}
            <div
              className="absolute top-0 right-0 w-1 h-full cursor-col-resize opacity-0 group-hover:opacity-100 hover:bg-[#A85C36] transition-opacity"
              onMouseDown={(e) => {
    
                handleResizeStart(e, column.id);
              }}
            />
          </th>
        ))}
        
        {/* Actions Column */}
        <th className="p-3 text-center text-sm font-medium text-[#AB9C95] bg-[#F8F6F4] border-l border-[#E0DBD7] whitespace-nowrap" style={{ width: '60px' }}>
          Actions
        </th>
      </tr>
    </thead>
  );
}
