import React, { useState, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  createColumnHelper,
  flexRender,
  ColumnDef,
  SortingState,
  ColumnFiltersState,
  ColumnResizeMode,
} from '@tanstack/react-table';
import { Guest, GuestColumn, WizardState } from './types';
import { Sparkles } from 'lucide-react';

interface GuestListTableTanStackSimpleProps {
  wizardState: WizardState;
  guestColumns: GuestColumn[];
  onUpdateGuest: (guestId: string, field: keyof Guest | string, value: string) => void;
  onRemoveGuest: (guestId: string) => void;
  onColumnResize?: (columnId: string, newWidth: number) => void;
  onGenerateAllNotes?: () => void;
  onShowMealOptionsModal?: (options: string[]) => void;
  onShowRelationshipOptionsModal?: (options: string[]) => void;
  onColumnDragStart?: (e: React.DragEvent, columnId: string) => void;
  onColumnDragOver?: (e: React.DragEvent) => void;
  onColumnDragLeave?: (e: React.DragEvent) => void;
  onColumnDrop?: (e: React.DragEvent, columnId: string) => void;
  onColumnDragEnd?: (e: React.DragEvent) => void;
}

const columnHelper = createColumnHelper<Guest>();

export default function GuestListTableTanStackSimple({
  wizardState,
  guestColumns,
  onUpdateGuest,
  onRemoveGuest,
  onColumnResize,
  onGenerateAllNotes,
  onShowMealOptionsModal,
  onShowRelationshipOptionsModal,
  onColumnDragStart,
  onColumnDragOver,
  onColumnDragLeave,
  onColumnDrop,
  onColumnDragEnd,
}: GuestListTableTanStackSimpleProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnResizeMode, setColumnResizeMode] = useState<ColumnResizeMode>('onChange');

  // Define columns using TanStack Table
  const columns = useMemo<ColumnDef<Guest>[]>(() => {
    const cols: ColumnDef<Guest>[] = [
      // Full Name Column
      columnHelper.accessor('fullName', {
        id: 'fullName',
        header: () => <span>Full Name*</span>,
        cell: ({ getValue, row }) => (
          <input
            type="text"
            value={getValue() || ''}
            onChange={(e) => onUpdateGuest(row.original.id, 'fullName', e.target.value)}
            className="w-full border-none bg-transparent text-[#332B42] focus:outline-none"
            placeholder="Full Name"
          />
        ),
        size: 200,
        minSize: 120,
        maxSize: 400,
        enableResizing: true,
        enableSorting: true,
      }),
    ];

    // Dynamic columns
    guestColumns.forEach((column) => {
      cols.push(
        columnHelper.accessor(column.key as keyof Guest, {
          id: column.id,
          header: () => (
            <div className="flex items-center justify-between">
              <span>{column.label}</span>
              <div className="flex items-center gap-1">
                {column.id === 'notes' && onGenerateAllNotes && (
                  <button
                    onClick={onGenerateAllNotes}
                    className="flex items-center gap-1 text-xs text-[#A85C36] hover:text-[#8B4513] transition-colors"
                  >
                    <Sparkles className="w-3 h-3" />
                    Generate
                  </button>
                )}
                {column.id === 'mealPreference' && onShowMealOptionsModal && (
                  <button
                    onClick={() => onShowMealOptionsModal(column.options || [])}
                    className="text-xs text-[#AB9C95] hover:text-[#332B42] transition-colors"
                    title="Edit meal options"
                  >
                    ⚙️
                  </button>
                )}
                {column.id === 'relationship' && onShowRelationshipOptionsModal && (
                  <button
                    onClick={() => onShowRelationshipOptionsModal(column.options || [])}
                    className="text-xs text-[#AB9C95] hover:text-[#332B42] transition-colors"
                    title="Edit relationship options"
                  >
                    ⚙️
                  </button>
                )}
              </div>
            </div>
          ),
          cell: ({ getValue, row }) => {
            const value = getValue() as string || '';
            
            if (column.type === 'select' && column.options) {
              return (
                <div className="relative">
                  <select
                    value={value}
                    onChange={(e) => onUpdateGuest(row.original.id, column.key, e.target.value)}
                    className="w-full border border-[#AB9C95] px-2 py-1 text-sm rounded bg-white text-[#332B42] appearance-none focus:outline-none focus:ring-2 focus:ring-[#A85C36] pr-6"
                  >
                    <option value="">Select</option>
                    {column.options.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                  <svg
                    className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-[#AB9C95]"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              );
            }

            return (
              <input
                type={column.type === 'number' ? 'number' : 'text'}
                value={value}
                onChange={(e) => onUpdateGuest(row.original.id, column.key, e.target.value)}
                className="w-full border border-[#AB9C95] px-2 py-1 text-sm rounded bg-white text-[#332B42] focus:outline-none focus:ring-2 focus:ring-[#A85C36]"
                placeholder={column.label}
              />
            );
          },
          size: column.width || 200,
          minSize: 120,
          maxSize: 400,
          enableResizing: true,
          enableSorting: true,
        })
      );
    });

    // Actions Column
    cols.push(
      columnHelper.display({
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => (
          <button
            onClick={() => onRemoveGuest(row.original.id)}
            className="text-red-500 hover:text-red-700 transition-colors"
            title="Remove guest"
          >
            🗑️
          </button>
        ),
        size: 80,
        enableResizing: false,
        enableSorting: false,
      })
    );

    return cols;
  }, [guestColumns, onUpdateGuest, onRemoveGuest, onGenerateAllNotes, onShowMealOptionsModal, onShowRelationshipOptionsModal]);

  const table = useReactTable({
    data: wizardState.guests,
    columns,
    state: {
      sorting,
      columnFilters,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    enableColumnResizing: true,
    columnResizeMode,
    onColumnSizingChange: (updater) => {
      if (typeof updater === 'function' && onColumnResize) {
        const newSizing = updater(table.getState().columnSizing);
        Object.entries(newSizing).forEach(([columnId, size]) => {
          onColumnResize(columnId, size);
        });
      }
    },
  });

  return (
    <div className="bg-white border border-[#E0DBD7] rounded-[5px] overflow-hidden w-full">
      <div className="overflow-x-auto w-full">
        <table 
          className="w-full border-collapse"
          style={{
            width: '100%',
            tableLayout: 'fixed',
            minWidth: Math.max(table.getCenterTotalSize(), 800),
          }}
        >
          {/* Header */}
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="bg-[#F8F6F4]">
                {headerGroup.headers.map((header) => {
                  const isDraggable = header.column.id !== 'fullName' && header.column.id !== 'actions';
                  
                  return (
                    <th
                      key={header.id}
                      className={`p-3 text-left text-sm font-medium text-[#AB9C95] border-r border-[#E0DBD7] last:border-r-0 whitespace-nowrap relative group ${
                        isDraggable ? 'cursor-move' : ''
                      }`}
                      style={{
                        width: `${header.getSize()}px`,
                        minWidth: `${header.getSize()}px`,
                        maxWidth: `${header.getSize()}px`,
                      }}
                      onClick={header.column.getToggleSortingHandler()}
                      draggable={isDraggable}
                      onDragStart={isDraggable ? (e) => onColumnDragStart?.(e, header.column.id) : undefined}
                      onDragOver={isDraggable ? (e) => onColumnDragOver?.(e) : undefined}
                      onDragLeave={isDraggable ? (e) => onColumnDragLeave?.(e) : undefined}
                      onDrop={isDraggable ? (e) => onColumnDrop?.(e, header.column.id) : undefined}
                      onDragEnd={isDraggable ? (e) => onColumnDragEnd?.(e) : undefined}
                    >
                    <div className="flex items-center justify-between">
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                      
                      {/* Sort indicator */}
                      {header.column.getCanSort() && (
                        <div className="ml-2">
                          {{
                            asc: '↑',
                            desc: '↓',
                          }[header.column.getIsSorted() as string] ?? '↕'}
                        </div>
                      )}
                    </div>

                    {/* Resize handle */}
                    {header.column.getCanResize() && (
                      <div
                        onMouseDown={header.getResizeHandler()}
                        onTouchStart={header.getResizeHandler()}
                        className="absolute top-0 right-0 w-1 h-full cursor-col-resize opacity-0 group-hover:opacity-100 hover:bg-[#A85C36] transition-opacity"
                      />
                    )}
                  </th>
                  );
                })}
              </tr>
            ))}
          </thead>

          {/* Body */}
          <tbody>
            {table.getRowModel().rows.map((row, index) => (
              <tr
                key={row.id}
                className={`border-b border-[#E0DBD7] last:border-b-0 hover:bg-[#F8F6F4] ${
                  index % 2 === 0 ? 'bg-white' : 'bg-[#FAF9F8]'
                }`}
              >
                {row.getVisibleCells().map((cell) => (
                  <td
                    key={cell.id}
                    className="p-3 border-r border-[#E0DBD7] last:border-r-0 whitespace-nowrap overflow-hidden"
                    style={{
                      width: `${cell.column.getSize()}px`,
                      minWidth: `${cell.column.getSize()}px`,
                      maxWidth: `${cell.column.getSize()}px`,
                    }}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
