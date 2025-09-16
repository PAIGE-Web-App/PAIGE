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
  RowSelectionState,
  getExpandedRowModel,
  ExpandedState,
} from '@tanstack/react-table';
import { Guest, GuestColumn, WizardState } from './types';
import { Sparkles } from 'lucide-react';

// Extend the column meta type to include our custom properties
declare module '@tanstack/react-table' {
  interface ColumnMeta<TData, TValue> {
    isPinned?: 'left' | 'right';
  }
}

interface GuestListTableTanStackProps {
  wizardState: WizardState;
  guestColumns: GuestColumn[];
  onUpdateGuest: (guestId: string, field: keyof Guest | string, value: string) => void;
  onRemoveGuest: (guestId: string) => void;
  onColumnResize?: (columnId: string, newWidth: number) => void;
  onGenerateAllNotes?: () => void;
  onColumnDragStart?: (e: React.DragEvent, columnId: string) => void;
  onColumnDragOver?: (e: React.DragEvent) => void;
  onColumnDragLeave?: (e: React.DragEvent) => void;
  onColumnDrop?: (e: React.DragEvent, columnId: string) => void;
  onColumnDragEnd?: (e: React.DragEvent) => void;
}

const columnHelper = createColumnHelper<Guest>();

export default function GuestListTableTanStack({
  wizardState,
  guestColumns,
  onUpdateGuest,
  onRemoveGuest,
  onColumnResize,
  onGenerateAllNotes,
  onColumnDragStart,
  onColumnDragOver,
  onColumnDragLeave,
  onColumnDrop,
  onColumnDragEnd,
}: GuestListTableTanStackProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [expanded, setExpanded] = useState<ExpandedState>({});
  const [columnResizeMode, setColumnResizeMode] = useState<ColumnResizeMode>('onChange');

  // Define columns using TanStack Table
  const columns = useMemo<ColumnDef<Guest>[]>(() => {
    const cols: ColumnDef<Guest>[] = [
      // Full Name Column (Pinned Left)
      columnHelper.accessor('fullName', {
        id: 'fullName',
        header: ({ column }) => (
          <div className="flex items-center justify-between">
            <span>Full Name*</span>
            <div className="w-1 h-full bg-transparent" />
          </div>
        ),
        cell: ({ getValue, row }) => (
          <input
            type="text"
            value={getValue() || ''}
            onChange={(e) => onUpdateGuest(row.original.id, 'fullName', e.target.value)}
            className="w-full border-none bg-transparent text-[#332B42] focus:outline-none"
            placeholder="Full Name"
          />
        ),
        size: wizardState.fullNameColumnWidth || 150,
        minSize: 80,
        maxSize: 300,
        enableResizing: true,
        enableSorting: true,
        enableColumnFilter: true,
        filterFn: 'includesString',
        meta: {
          isPinned: 'left',
        },
      }),
    ];

    // Dynamic columns
    guestColumns.forEach((column) => {
      cols.push(
        columnHelper.accessor(column.key as keyof Guest, {
          id: column.id,
          header: ({ column }) => (
            <div className="flex items-center justify-between">
              <span>{column.id}</span>
              {column.id === 'notes' && onGenerateAllNotes && (
                <button
                  onClick={onGenerateAllNotes}
                  className="flex items-center gap-1 text-xs text-[#A85C36] hover:text-[#8B4513] transition-colors"
                >
                  <Sparkles className="w-3 h-3" />
                  Generate
                </button>
              )}
              <div className="w-1 h-full bg-transparent" />
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
          size: column.width || 150,
          minSize: 80,
          maxSize: 300,
          enableResizing: true,
          enableSorting: true,
          enableColumnFilter: true,
          filterFn: 'includesString',
        })
      );
    });

    // Actions Column (Pinned Right)
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
        size: 60,
        enableResizing: false,
        enableSorting: false,
        enableColumnFilter: false,
        meta: {
          isPinned: 'right',
        },
      })
    );

    return cols;
  }, [guestColumns, wizardState.fullNameColumnWidth, onUpdateGuest, onRemoveGuest, onGenerateAllNotes]);

  const table = useReactTable({
    data: wizardState.guests,
    columns,
    state: {
      sorting,
      columnFilters,
      rowSelection,
      expanded,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onRowSelectionChange: setRowSelection,
    onExpandedChange: setExpanded,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    enableRowSelection: true,
    enableColumnResizing: true,
    columnResizeMode,
    onColumnSizingChange: (updater) => {
      // Handle column resizing
      if (typeof updater === 'function') {
        const newSizing = updater(table.getState().columnSizing);
        Object.entries(newSizing).forEach(([columnId, size]) => {
          if (onColumnResize) {
            onColumnResize(columnId, size);
          }
        });
      }
    },
  });

  return (
    <div className="bg-white border border-[#E0DBD7] rounded-[5px] overflow-hidden">
      {/* Filter Bar */}
      <div className="p-4 bg-[#F8F6F4] border-b border-[#E0DBD7]">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-[#332B42]">Filters:</span>
            <input
              placeholder="Filter by name..."
              value={(table.getColumn('fullName')?.getFilterValue() as string) ?? ''}
              onChange={(e) => table.getColumn('fullName')?.setFilterValue(e.target.value)}
              className="px-3 py-1 text-sm border border-[#AB9C95] rounded focus:outline-none focus:ring-2 focus:ring-[#A85C36]"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-[#AB9C95]">
              {table.getFilteredRowModel().rows.length} of {table.getCoreRowModel().rows.length} guests
            </span>
            {Object.keys(rowSelection).length > 0 && (
              <span className="text-sm text-[#A85C36] font-medium">
                {Object.keys(rowSelection).length} selected
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table 
          className="w-full border-collapse"
          style={{
            width: table.getCenterTotalSize(),
            tableLayout: 'fixed',
            minWidth: table.getCenterTotalSize(),
          }}
        >
          {/* Header */}
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="bg-[#F8F6F4]">
                {headerGroup.headers.map((header) => {
                  const isPinnedLeft = header.column.columnDef.meta?.isPinned === 'left';
                  const isPinnedRight = header.column.columnDef.meta?.isPinned === 'right';
                  const pinnedOffset = isPinnedLeft 
                    ? header.getStart('left') 
                    : isPinnedRight 
                    ? header.getStart('right')
                    : undefined;

                  return (
                    <th
                      key={header.id}
                      className={`p-3 text-left text-sm font-medium text-[#AB9C95] border-r border-[#E0DBD7] last:border-r-0 whitespace-nowrap relative group ${
                        header.column.getCanSort() ? 'cursor-pointer hover:bg-[#F0F0F0]' : ''
                      } ${
                        isPinnedLeft ? 'sticky left-0 z-10 bg-[#F8F6F4] border-r-2 border-[#AB9C95]' : ''
                      } ${
                        isPinnedRight ? 'sticky right-0 z-10 bg-[#F8F6F4] border-l-2 border-[#AB9C95]' : ''
                      }`}
                      style={{
                        width: `${header.getSize()}px`,
                        minWidth: `${header.getSize()}px`,
                        maxWidth: `${header.getSize()}px`,
                        ...(pinnedOffset !== undefined && {
                          [isPinnedLeft ? 'left' : 'right']: `${pinnedOffset}px`,
                        }),
                      }}
                      onClick={header.column.getToggleSortingHandler()}
                      draggable={header.column.getCanSort()}
                      onDragStart={(e) => onColumnDragStart?.(e, header.column.id)}
                      onDragOver={(e) => onColumnDragOver?.(e)}
                      onDragLeave={(e) => onColumnDragLeave?.(e)}
                      onDrop={(e) => onColumnDrop?.(e, header.column.id)}
                      onDragEnd={(e) => onColumnDragEnd?.(e)}
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
                          className={`absolute top-0 right-0 w-1 h-full cursor-col-resize opacity-0 group-hover:opacity-100 hover:bg-[#A85C36] transition-opacity ${
                            header.column.getIsResizing() ? 'bg-[#A85C36] opacity-100' : ''
                          }`}
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
                  row.getIsSelected() ? 'bg-[#FFF8F0]' : (index % 2 === 0 ? 'bg-white' : 'bg-[#FAF9F8]')
                }`}
              >
                {row.getVisibleCells().map((cell) => {
                  const isPinnedLeft = cell.column.columnDef.meta?.isPinned === 'left';
                  const isPinnedRight = cell.column.columnDef.meta?.isPinned === 'right';
                  const pinnedOffset = isPinnedLeft 
                    ? cell.getContext().column.getStart('left') 
                    : isPinnedRight 
                    ? cell.getContext().column.getStart('right')
                    : undefined;

                  return (
                    <td
                      key={cell.id}
                      className={`p-3 border-r border-[#E0DBD7] last:border-r-0 whitespace-nowrap overflow-hidden ${
                        isPinnedLeft ? 'sticky left-0 z-5 border-r-2 border-[#AB9C95]' : ''
                      } ${
                        isPinnedRight ? 'sticky right-0 z-5 border-l-2 border-[#AB9C95]' : ''
                      }`}
                      style={{
                        width: `${cell.column.getSize()}px`,
                        minWidth: `${cell.column.getSize()}px`,
                        maxWidth: `${cell.column.getSize()}px`,
                        backgroundColor: (isPinnedLeft || isPinnedRight)
                          ? (row.getIsSelected() ? '#FFF8F0' : (index % 2 === 0 ? 'white' : '#FAF9F8'))
                          : undefined,
                        boxShadow: (isPinnedLeft || isPinnedRight)
                          ? (isPinnedLeft ? '2px 0 4px rgba(0,0,0,0.1)' : '-2px 0 4px rgba(0,0,0,0.1)')
                          : undefined,
                        ...(pinnedOffset !== undefined && {
                          [isPinnedLeft ? 'left' : 'right']: `${pinnedOffset}px`,
                        }),
                      }}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
