import React from 'react';
import { Edit2, X } from 'lucide-react';
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
}

export default function GuestTableHeader({
  guestColumns,
  onUpdateColumn,
  onRemoveColumn,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd
}: GuestTableHeaderProps) {
  return (
    <thead>
      <tr className="bg-[#F8F6F4] border-b border-[#E0DBD7]">
        {/* Fixed Full Name Column */}
        <th 
          className="p-3 text-left text-sm font-medium text-[#AB9C95] border-r border-[#E0DBD7] whitespace-nowrap"
          style={{ width: '200px' }}
        >
          <span className="truncate block w-full cursor-default">
            Full Name<span className="text-[#A85C36]">*</span>
          </span>
        </th>
        
        {/* Dynamic Columns */}
        {guestColumns.map((column) => (
          <th 
            key={column.id} 
            className={`p-3 text-left text-sm font-medium text-[#AB9C95] border-r border-[#E0DBD7] last:border-r-0 whitespace-nowrap transition-all duration-200 ${
              column.key !== 'fullName' ? 'cursor-move hover:bg-[#F0F0F0]' : ''
            }`}
            style={{ width: '150px' }}
            draggable={column.key !== 'fullName'}
            onDragStart={(e) => column.key !== 'fullName' ? onDragStart(e, column.id) : undefined}
            onDragOver={(e) => column.key !== 'fullName' ? onDragOver(e) : undefined}
            onDragLeave={(e) => column.key !== 'fullName' ? onDragLeave(e) : undefined}
            onDrop={(e) => column.key !== 'fullName' ? onDrop(e, column.id) : undefined}
            onDragEnd={(e) => column.key !== 'fullName' ? onDragEnd(e) : undefined}
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
              </div>
            </div>
          </th>
        ))}
        
        {/* Actions Column */}
        <th className="p-3 text-center text-sm font-medium text-[#AB9C95] bg-[#F8F6F4] border-l border-[#E0DBD7] whitespace-nowrap" style={{ width: '100px' }}>
          Actions
        </th>
      </tr>
    </thead>
  );
}
