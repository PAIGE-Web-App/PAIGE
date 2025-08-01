import React, { useMemo, useCallback, useState } from 'react';
import { FixedSizeList as List } from 'react-window';
import { useBudgetContext } from '@/contexts/BudgetContext';
import BudgetItemComponent from './BudgetItemComponent';
import BudgetItemsTable from './BudgetItemsTable';
import type { BudgetItem } from '@/types/budget';

interface BudgetItemsListOptimizedProps {
  searchQuery: string;
  triggerAddItem: boolean;
  onTriggerAddItemComplete: () => void;
  viewMode: 'cards' | 'table';
}

// Memoized search filter
const useFilteredItems = (items: BudgetItem[], searchQuery: string) => {
  return useMemo(() => {
    if (!searchQuery.trim()) return items;
    
    const query = searchQuery.toLowerCase();
    return items.filter(item => 
      item.name.toLowerCase().includes(query) ||
      item.notes?.toLowerCase().includes(query) ||
      item.vendorName?.toLowerCase().includes(query) ||
      item.amount.toString().includes(query)
    );
  }, [items, searchQuery]);
};

// Virtualized item renderer for card view
const VirtualizedItem = React.memo<{
  index: number;
  style: React.CSSProperties;
  data: {
    items: BudgetItem[];
    onEditItem: (item: BudgetItem) => void;
    onDeleteItem: (itemId: string) => void;
    onLinkVendor: (item: BudgetItem) => void;
    onAssign: (assigneeIds: string[], assigneeNames: string[], assigneeTypes: ('user' | 'contact')[], itemId: string) => Promise<void>;
    newlyAddedItems: Set<string>;
  };
}>(({ index, style, data }) => {
  const item = data.items[index];
  if (!item) return null;

  return (
    <div style={style} className="px-4 pb-4">
      <BudgetItemComponent
        budgetItem={item}
        onDeleteItem={data.onDeleteItem}
        onLinkVendor={data.onLinkVendor}
        onAssign={data.onAssign}
        isNewlyAdded={data.newlyAddedItems.has(item.id!)}
      />
    </div>
  );
});

VirtualizedItem.displayName = 'VirtualizedItem';

// Memoized empty state component
const EmptyState = React.memo<{
  onAddItem: () => void;
}>(({ onAddItem }) => (
  <div className="flex flex-col items-center justify-center p-8 text-center">
    <div className="w-16 h-16 bg-[#F3F2F0] rounded-full flex items-center justify-center mb-4">
      <svg className="w-8 h-8 text-[#AB9C95]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
      </svg>
    </div>
    <h3 className="text-lg font-medium text-[#332B42] mb-2">No budget items yet</h3>
    <p className="text-sm text-[#AB9C95] mb-4">
      Start tracking your expenses by adding your first budget item
    </p>
    <button
      onClick={onAddItem}
      className="btn-primary flex items-center gap-2"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
      </svg>
      Add First Item
    </button>
  </div>
));

EmptyState.displayName = 'EmptyState';

// Memoized loading state component
const LoadingState = React.memo(() => (
  <div className="flex flex-col items-center justify-center p-8">
    <div className="w-8 h-8 border-4 border-[#A85C36] border-t-transparent rounded-full animate-spin"></div>
    <p className="text-sm text-[#AB9C95] mt-2">Loading budget items...</p>
  </div>
));

LoadingState.displayName = 'LoadingState';

const BudgetItemsListOptimized: React.FC<BudgetItemsListOptimizedProps> = ({
  searchQuery,
  triggerAddItem,
  onTriggerAddItemComplete,
  viewMode,
}) => {
  const {
    filteredBudgetItems,
    selectedCategory,
    handleDeleteBudgetItem,
    handleLinkVendor,
    handleAssignBudgetItem,
    isLoading,
  } = useBudgetContext();

  // Track newly added items for animation
  const [newlyAddedItems, setNewlyAddedItems] = useState<Set<string>>(new Set());

  // Filter items based on search query
  const filteredItems = useFilteredItems(filteredBudgetItems, searchQuery);

  // Handle item editing (now inline)
  const handleEditItem = useCallback((item: BudgetItem) => {
    console.log('Edit item:', item);
  }, []);

  // Handle item deletion
  const handleDeleteItem = useCallback((itemId: string) => {
    handleDeleteBudgetItem(itemId);
  }, [handleDeleteBudgetItem]);

  // Handle vendor linking
  const handleLinkVendorItem = useCallback((item: BudgetItem) => {
    handleLinkVendor(item.id!, {
      vendorId: '',
      vendorName: '',
      vendorPlaceId: ''
    });
  }, [handleLinkVendor]);

  // Handle item assignment
  const handleAssignItem = useCallback(async (
    assigneeIds: string[], 
    assigneeNames: string[], 
    assigneeTypes: ('user' | 'contact')[], 
    itemId: string
  ) => {
    await handleAssignBudgetItem(assigneeIds, assigneeNames, assigneeTypes, itemId);
  }, [handleAssignBudgetItem]);

  // Handle adding new item
  const handleAddItem = useCallback(() => {
    if (!selectedCategory) return;
    
    // This would trigger the add item flow
    console.log('Add new item to category:', selectedCategory.id);
  }, [selectedCategory]);

  // Memoized list data for virtualization
  const listData = useMemo(() => ({
    items: filteredItems,
    onEditItem: handleEditItem,
    onDeleteItem: handleDeleteItem,
    onLinkVendor: handleLinkVendorItem,
    onAssign: handleAssignItem,
    newlyAddedItems,
  }), [filteredItems, handleEditItem, handleDeleteItem, handleLinkVendorItem, handleAssignItem, newlyAddedItems]);

  // Handle trigger add item
  React.useEffect(() => {
    if (triggerAddItem && selectedCategory) {
      handleAddItem();
      onTriggerAddItemComplete();
    }
  }, [triggerAddItem, selectedCategory, handleAddItem, onTriggerAddItemComplete]);

  // Show loading state
  if (isLoading) {
    return <LoadingState />;
  }

  // Show empty state
  if (filteredItems.length === 0) {
    return <EmptyState onAddItem={handleAddItem} />;
  }

  // Table view
  if (viewMode === 'table') {
    return (
      <div className="flex-1 flex flex-col min-h-0">
        <BudgetItemsTable
          budgetItems={filteredItems}
          onDeleteItem={handleDeleteItem}
          onLinkVendor={handleLinkVendorItem}
          onAssign={handleAssignItem}
          onAddItem={handleAddItem}
          newlyAddedItems={newlyAddedItems}
        />
      </div>
    );
  }

  // Card view with virtualization for large lists
  const ITEM_HEIGHT = 200; // Approximate height of each card
  const CONTAINER_HEIGHT = 600; // Fixed container height

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex-1">
        <List
          height={CONTAINER_HEIGHT}
          itemCount={filteredItems.length}
          itemSize={ITEM_HEIGHT}
          itemData={listData}
          overscanCount={3} // Render 3 extra items for smooth scrolling
        >
          {VirtualizedItem}
        </List>
      </div>
    </div>
  );
};

export default React.memo(BudgetItemsListOptimized); 