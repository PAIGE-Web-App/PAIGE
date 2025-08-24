"use client";

import React, { useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";

// Firebase imports
import { useAuth } from '@/contexts/AuthContext';

// UI component imports
import Banner from '@/components/Banner';
import BottomNavBar from '@/components/BottomNavBar';
import WeddingBanner from '@/components/WeddingBanner';
import LoadingSpinner from '@/components/LoadingSpinner';

// Lazy load heavy components
const BudgetSidebar = dynamic(() => import('@/components/BudgetSidebar'), {
  loading: () => <div className="w-[320px] bg-[#F3F2F0] animate-pulse" />
});

const BudgetItemsList = dynamic(() => import('@/components/BudgetItemsList'), {
  loading: () => <div className="flex-1 bg-white animate-pulse" />
});

// Mobile responsive components
const MobileBudgetNav = dynamic(() => import('@/components/budget/MobileBudgetNav'), {
  loading: () => <div className="h-16 bg-white animate-pulse" />
});

const BudgetItemsMobile = dynamic(() => import('@/components/budget/BudgetItemsMobile'), {
  loading: () => <div className="flex-1 bg-white animate-pulse" />
});

const FloatingActionButton = dynamic(() => import('@/components/budget/FloatingActionButton'), {
  ssr: false
});

const BudgetItemSideCard = dynamic(() => import('@/components/BudgetItemSideCard'), {
  loading: () => <div className="w-80 bg-white animate-pulse" />
});

const BudgetTopBar = dynamic(() => import('@/components/BudgetTopBar'), {
  loading: () => <div className="h-16 bg-white border-b border-[#AB9C95] animate-pulse" />
});

const BudgetMetrics = dynamic(() => import('@/components/BudgetMetrics'), {
  loading: () => <div className="h-32 bg-white border-b border-[#AB9C95] animate-pulse" />
});

const BudgetOverview = dynamic(() => import('@/components/budget/BudgetOverview'), {
  loading: () => <div className="flex-1 bg-white animate-pulse" />
});

const BudgetOverBudgetBanner = dynamic(() => import('@/components/budget/BudgetOverBudgetBanner'), {
  loading: () => <div className="h-20 bg-red-50 animate-pulse" />
});



// Lazy load modals
const BudgetItemModal = dynamic(() => import('@/components/BudgetItemModal'), {
  ssr: false
});

const VendorIntegrationModal = dynamic(() => import('@/components/VendorIntegrationModal'), {
  ssr: false
});

const AIBudgetAssistant = dynamic(() => import('@/components/AIBudgetAssistant'), {
  ssr: false
});

const BudgetCategoryModal = dynamic(() => import('@/components/BudgetCategoryModal'), {
  ssr: false
});

const DeleteCategoryModal = dynamic(() => import('@/components/DeleteCategoryModal'), {
  ssr: false
});

const LinkVendorModal = dynamic(() => import('@/components/LinkVendorModal'), {
  ssr: false
});

// Custom hooks
import { useUserProfileData } from "@/hooks/useUserProfileData";
import { useWeddingBanner } from "@/hooks/useWeddingBanner";
import { useBudget } from "@/hooks/useBudget";
import toast from "react-hot-toast";
import type { BudgetItem, BudgetCategory } from "@/types/budget";

export default function BudgetPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  // Use shared user profile data hook
  const { userName, daysLeft, profileLoading, weddingDate } = useUserProfileData();

  // Use custom hooks for budget functionality
  const budget = useBudget();
  

  // State for selected category and item
  const [selectedCategory, setSelectedCategory] = React.useState<any>(null);
  const [selectedBudgetItem, setSelectedBudgetItem] = React.useState<any>(null);
  const [showItemSideCard, setShowItemSideCard] = React.useState(false);
  const [showCategoryModal, setShowCategoryModal] = React.useState(false);
  const [showDeleteCategoryModal, setShowDeleteCategoryModal] = React.useState(false);
  const [editingCategory, setEditingCategory] = React.useState<any>(null);
  const [deletingCategory, setDeletingCategory] = React.useState<any>(null);
  const [jiggleAllocatedAmount, setJiggleAllocatedAmount] = React.useState(false);
  
  // Link Vendor Modal state
  const [showLinkVendorModal, setShowLinkVendorModal] = React.useState(false);
  const [linkingBudgetItem, setLinkingBudgetItem] = React.useState<any>(null);
  
  // State for budget top bar
  const [budgetSearchQuery, setBudgetSearchQuery] = React.useState('');
  const [triggerAddItem, setTriggerAddItem] = React.useState(false);
  const [viewMode, setViewMode] = React.useState<'cards' | 'table'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('budgetViewMode') as 'cards' | 'table') || 'table';
    }
    return 'table';
  });
  const [isBudgetOverviewSelected, setIsBudgetOverviewSelected] = React.useState(false);

  // Track if we've initialized the category selection
  const hasInitializedSelection = React.useRef(false);

  // Memoized values for performance
  const isLoading = useMemo(() => profileLoading || loading || budget.budgetCategories === undefined, 
    [profileLoading, loading, budget.budgetCategories]);
  
  const selectedCategoryId = useMemo(() => selectedCategory?.id, [selectedCategory]);
  
  const filteredBudgetItems = useMemo(() => {
    if (!selectedCategory || !budget.budgetItems) return [];
    return budget.budgetItems.filter(item => item.categoryId === selectedCategory.id);
  }, [selectedCategory, budget.budgetItems]);

  // Category persistence and auto-selection
  React.useEffect(() => {
    if (budget.budgetCategories && budget.budgetCategories.length > 0 && !hasInitializedSelection.current) {
      hasInitializedSelection.current = true;
      
      // Try to restore the previously selected view from localStorage
      const savedView = localStorage.getItem('selectedBudgetView');
      const savedCategoryId = localStorage.getItem('selectedBudgetCategoryId');
      
      if (savedView === 'overview') {
        // Restore budget overview view
        setIsBudgetOverviewSelected(true);
        setSelectedCategory(null);
        return;
      } else if (savedCategoryId) {
        // Restore previously selected category
        const savedCategory = budget.budgetCategories.find(cat => cat.id === savedCategoryId);
        if (savedCategory) {
          setSelectedCategory(savedCategory);
          setIsBudgetOverviewSelected(false);
          return;
        }
      }
      
      // If no saved view or saved category doesn't exist, select the first category
      if (budget.budgetCategories[0] && budget.budgetCategories[0].id) {
        setSelectedCategory(budget.budgetCategories[0]);
        setIsBudgetOverviewSelected(false);
        localStorage.setItem('selectedBudgetCategoryId', budget.budgetCategories[0].id);
        localStorage.setItem('selectedBudgetView', 'category');
      }
    }
  }, [budget.budgetCategories]);

  // Reset initialization flag when categories change significantly
  React.useEffect(() => {
    if (budget.budgetCategories && budget.budgetCategories.length === 0) {
      hasInitializedSelection.current = false;
    }
  }, [budget.budgetCategories]);

  // Save selected category to localStorage whenever it changes
  React.useEffect(() => {
    if (selectedCategory && selectedCategory.id) {
      localStorage.setItem('selectedBudgetCategoryId', selectedCategory.id);
      localStorage.setItem('selectedBudgetView', 'category');
    }
  }, [selectedCategory]);

  // Clear localStorage if selected category is deleted
  React.useEffect(() => {
    if (budget.budgetCategories && selectedCategory) {
      const categoryStillExists = budget.budgetCategories.some(cat => cat.id === selectedCategory.id);
      if (!categoryStillExists) {
        localStorage.removeItem('selectedBudgetCategoryId');
        setSelectedCategory(null);
      }
    }
  }, [budget.budgetCategories, selectedCategory]);

  // Handle mobile tab change
  const handleMobileTabChange = useCallback((tab: string) => {
    if (tab === 'dashboard') {
      router.push('/');
    } else if (tab === 'todo') {
      router.push('/todo');
    }
  }, [router]);

  // Handle linking vendor to budget item
  const handleLinkVendor = useCallback(async (vendor: any) => {
    if (!linkingBudgetItem || !user?.uid) return;

    try {
      // Use the budget hook's handleLinkVendor method
      await budget.handleLinkVendor(linkingBudgetItem.id!, {
        vendorId: vendor.place_id,
        vendorName: vendor.name,
        vendorPlaceId: vendor.place_id
      });
      
      // Close the modal
      setShowLinkVendorModal(false);
      setLinkingBudgetItem(null);
      
    } catch (error) {
      console.error('Error linking vendor:', error);
      throw error;
    }
  }, [linkingBudgetItem, user?.uid, budget]);

  // Handle unlinking vendor from budget item
  const handleUnlinkVendor = useCallback(async () => {
    if (!linkingBudgetItem || !user?.uid) return;

    try {
      // Use the budget hook's handleLinkVendor method with null values to unlink
      await budget.handleLinkVendor(linkingBudgetItem.id!, {
        vendorId: '',
        vendorName: '',
        vendorPlaceId: ''
      });
      
      // Close the modal
      setShowLinkVendorModal(false);
      setLinkingBudgetItem(null);
      
    } catch (error) {
      console.error('Error unlinking vendor:', error);
      throw error;
    }
  }, [linkingBudgetItem, user?.uid, budget]);

  // Open link vendor modal
  const openLinkVendorModal = useCallback((budgetItem: any) => {
    setLinkingBudgetItem(budgetItem);
    setShowLinkVendorModal(true);
  }, []);

  // Memoized handlers for better performance
  const handleAddCategory = useCallback(() => {
    const newCategory = {
      id: 'new',
      userId: user?.uid || '',
      name: 'New Category',
      allocatedAmount: 0,
      spentAmount: 0,
      orderIndex: budget.budgetCategories.length,
      createdAt: new Date(),
      color: '#A85C36',
    };
    setEditingCategory(newCategory);
    setShowCategoryModal(true);
  }, [user?.uid, budget.budgetCategories.length]);

  const handleViewModeChange = useCallback((newViewMode: 'cards' | 'table') => {
    setViewMode(newViewMode);
    if (typeof window !== 'undefined') {
      localStorage.setItem('budgetViewMode', newViewMode);
    }
  }, []);

  const handleSearchQueryChange = useCallback((query: string) => {
    setBudgetSearchQuery(query);
  }, []);

  const handleTriggerAddItem = useCallback(() => {
    setTriggerAddItem(true);
  }, []);

  const handleCloseItemSideCard = useCallback(() => {
    setShowItemSideCard(false);
    setSelectedBudgetItem(null);
  }, []);

  const handleShowItemSideCard = useCallback((item: any) => {
    setSelectedBudgetItem(item);
    setShowItemSideCard(true);
  }, []);

  const handleEditCategory = useCallback((category: any) => {
    setEditingCategory(category);
    setShowCategoryModal(true);
  }, []);

  const handleDeleteCategory = useCallback((category: any) => {
    setDeletingCategory(category);
    setShowDeleteCategoryModal(true);
  }, []);

  const handleCloseCategoryModal = useCallback(() => {
    setShowCategoryModal(false);
    setEditingCategory(null);
  }, []);

  const handleCloseDeleteCategoryModal = useCallback(() => {
    setShowDeleteCategoryModal(false);
    setDeletingCategory(null);
  }, []);

  const handleCloseLinkVendorModal = useCallback(() => {
    setShowLinkVendorModal(false);
    setLinkingBudgetItem(null);
  }, []);

  const handleSelectBudgetOverview = useCallback(() => {
    setIsBudgetOverviewSelected(true);
    setSelectedCategory(null);
    // Save the overview view preference
    localStorage.setItem('selectedBudgetView', 'overview');
    localStorage.removeItem('selectedBudgetCategoryId');
  }, []);

  const handleSelectCategory = useCallback((category: BudgetCategory) => {
    setSelectedCategory(category);
    setIsBudgetOverviewSelected(false);
    // Save the category view preference
    localStorage.setItem('selectedBudgetView', 'category');
    localStorage.setItem('selectedBudgetCategoryId', category.id!);
  }, []);

  const weddingBannerData = useWeddingBanner(router);

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen bg-linen">
        <WeddingBanner
          daysLeft={null}
          userName={null}
          isLoading={true}
          onSetWeddingDate={weddingBannerData.handleSetWeddingDate}
        />
        <div className="flex-1 flex items-center justify-center">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    );
  }

  // If not loading and no user, just return null (middleware will redirect)
  if (!user) {
    return null;
  }

  return (
    <div className="flex flex-col h-full bg-linen">
      <WeddingBanner
        daysLeft={daysLeft}
        userName={userName}
        isLoading={profileLoading}
        onSetWeddingDate={weddingBannerData.handleSetWeddingDate}
      />
      
      <div className="app-content-container flex-1 overflow-hidden">
        {/* Mobile Navigation */}
        <MobileBudgetNav
          budgetCategories={budget.budgetCategories}
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
          onAddCategory={handleAddCategory}
          totalSpent={budget.totalSpent}
          totalBudget={budget.userTotalBudget || 0}
          budgetItems={budget.budgetItems}
        />

        <div className="flex h-full gap-4 lg:flex-row flex-col">
          <main className="unified-container">
            {/* Budget Sidebar - Categories (Desktop Only) */}
            <BudgetSidebar
              budgetCategories={budget.budgetCategories}
              selectedCategory={selectedCategory}
              setSelectedCategory={handleSelectCategory}
              onAddCategory={handleAddCategory}
              budgetItems={budget.budgetItems}
              totalSpent={budget.totalSpent}
              totalBudget={budget.userTotalBudget}
              maxBudget={budget.userMaxBudget || 0}
              onSelectBudgetOverview={handleSelectBudgetOverview}
              isBudgetOverviewSelected={isBudgetOverviewSelected}
            />

            {/* Main Content Area */}
            <div className="unified-main-content">
              {/* Show Budget Overview or Category-specific content */}
              {isBudgetOverviewSelected ? (
                                        <BudgetOverview
                          budgetCategories={budget.budgetCategories}
                          budgetItems={budget.budgetItems}
                          totalSpent={budget.totalSpent}
                          totalBudget={budget.userTotalBudget || 0}
                          maxBudget={budget.userMaxBudget || 0}
                          onShowAIAssistant={() => budget.setShowAIAssistant(true)}
                          onAddCategory={handleAddCategory}
                          onSelectCategory={handleSelectCategory}
                        />
              ) : (
                <>
                  {/* Budget Top Bar - Category Title and Actions */}
                  <div className="lg:block">
                    <BudgetTopBar
                      selectedCategory={selectedCategory}
                      budgetSearchQuery={budgetSearchQuery}
                      setBudgetSearchQuery={handleSearchQueryChange}
                      onShowAIAssistant={() => budget.setShowAIAssistant(true)}
                      onShowCSVUpload={() => budget.setShowCSVUpload(true)}
                      onAddItem={handleTriggerAddItem}
                      onEditCategory={handleEditCategory}
                      onDeleteCategory={handleDeleteCategory}
                      viewMode={viewMode}
                      onViewModeChange={handleViewModeChange}
                    />
                  </div>

                  {/* Budget Metrics - After Category Title and Actions */}
                  <BudgetMetrics
                    selectedCategory={selectedCategory ? {
                      ...selectedCategory,
                      spentAmount: budget.budgetStats?.categoryBreakdown?.find(
                        (cat: any) => cat.categoryId === selectedCategory.id
                      )?.spent || 0
                    } : null}
                    totalBudget={budget.userTotalBudget}
                    totalSpent={budget.totalSpent}
                    maxBudget={budget.userMaxBudget}
                    budgetItems={selectedCategory ? budget.budgetItems.filter((item: any) => 
                      item.categoryId === selectedCategory.id
                    ) : []}
                    onEditCategory={(category) => {
                      setEditingCategory(category);
                      setJiggleAllocatedAmount(true);
                      setShowCategoryModal(true);
                      // Reset jiggle after animation
                      setTimeout(() => setJiggleAllocatedAmount(false), 1000);
                    }}
                  />

                  {/* Budget Items List */}
              <div className="flex-1 flex gap-4 min-h-0">
                <div className="flex-1 flex flex-col">
                  {/* Over Budget Warning Banner */}
                  {selectedCategory && budget.budgetStats?.categoryBreakdown && (() => {
                    const categoryBreakdown = budget.budgetStats.categoryBreakdown.find(
                      (cat: any) => cat.categoryId === selectedCategory.id
                    );
                    return categoryBreakdown && categoryBreakdown.spent > selectedCategory.allocatedAmount ? (
                      <BudgetOverBudgetBanner
                        categoryName={selectedCategory.name}
                        spentAmount={categoryBreakdown.spent}
                        allocatedAmount={selectedCategory.allocatedAmount}
                      />
                    ) : null;
                  })()}
                  
                  {/* Mobile Budget Items */}
                  <div className="lg:hidden">
                    <BudgetItemsMobile
                      selectedCategory={selectedCategory}
                      budgetItems={budget.budgetItems}
                      searchQuery={budgetSearchQuery}
                      triggerAddItem={triggerAddItem}
                      onTriggerAddItemComplete={() => setTriggerAddItem(false)}
                      onEditItem={(item) => {
                        // Editing is now handled inline in BudgetItemComponent
                      }}
                      onDeleteItem={budget.handleDeleteBudgetItem}
                      onLinkVendor={(item) => {
                        openLinkVendorModal(item);
                      }}
                      onAssign={async (assigneeIds, assigneeNames, assigneeTypes, itemId) => {
                        // Pass the itemId to the budget handler
                        await budget.handleAssignBudgetItem(assigneeIds, assigneeNames, assigneeTypes, itemId);
                      }}
                    />
                  </div>

                  {/* Desktop Budget Items */}
                  <div className="hidden lg:block flex-1 min-h-0">
                    <BudgetItemsList
                      selectedCategory={selectedCategory}
                      budgetItems={budget.budgetItems}
                      searchQuery={budgetSearchQuery}
                      triggerAddItem={triggerAddItem}
                      onTriggerAddItemComplete={() => setTriggerAddItem(false)}
                      onEditItem={(item) => {
                        // Editing is now handled inline in BudgetItemComponent
                      }}
                      onDeleteItem={budget.handleDeleteBudgetItem}
                      onLinkVendor={(item) => {
                        openLinkVendorModal(item);
                      }}
                      onAssign={async (assigneeIds, assigneeNames, assigneeTypes, itemId) => {
                        // Pass the itemId to the budget handler
                        await budget.handleAssignBudgetItem(assigneeIds, assigneeNames, assigneeTypes, itemId);
                      }}
                      viewMode={viewMode}
                    />
                  </div>
                </div>

                {/* Budget Item Side Card - Right Panel */}
                {showItemSideCard && selectedBudgetItem && (
                  <BudgetItemSideCard
                    isOpen={true}
                    onClose={handleCloseItemSideCard}
                    budgetItem={selectedBudgetItem}
                    category={selectedCategory}
                    onEdit={() => {
                      budget.setSelectedBudgetItem(selectedBudgetItem);
                      budget.setShowBudgetItemModal(true);
                      handleCloseItemSideCard();
                    }}
                    onLinkVendor={() => {
                      openLinkVendorModal(selectedBudgetItem);
                      handleCloseItemSideCard();
                    }}
                  />
                )}
              </div>
                </>
              )}
            </div>
          </main>
        </div>
      </div>

      {/* Floating Action Button (Mobile Only) */}
      <FloatingActionButton
        onAddItem={handleTriggerAddItem}
        onAddCategory={handleAddCategory}
        selectedCategory={selectedCategory}
      />

      {/* MODALS */}
      {budget.showBudgetItemModal && budget.selectedBudgetItem && (
        <BudgetItemModal
          isOpen={budget.showBudgetItemModal}
          onClose={() => budget.setShowBudgetItemModal(false)}
          budgetItem={budget.selectedBudgetItem}
          categories={budget.budgetCategories}
          onSave={(itemId, updates) => {
            if (itemId === 'new') {
              // Create new item
              budget.handleAddBudgetItem(updates.categoryId!, updates);
            } else {
              // Update existing item
              budget.handleUpdateBudgetItem(itemId, updates);
            }
            budget.setShowBudgetItemModal(false);
          }}
          onDelete={(itemId) => {
            if (itemId !== 'new') {
              budget.handleDeleteBudgetItem(itemId);
            }
            budget.setShowBudgetItemModal(false);
          }}
        />
      )}

      {budget.showVendorIntegrationModal && budget.selectedBudgetItem && (
        <VendorIntegrationModal
          isOpen={budget.showVendorIntegrationModal}
          onClose={() => budget.setShowVendorIntegrationModal(false)}
          budgetItem={budget.selectedBudgetItem}
          onLinkVendor={(itemId, vendorData) => {
            budget.handleLinkVendor(itemId, vendorData);
            budget.setShowVendorIntegrationModal(false);
          }}
        />
      )}

      {showLinkVendorModal && linkingBudgetItem && (
        <LinkVendorModal
          isOpen={showLinkVendorModal}
          onClose={handleCloseLinkVendorModal}
          onLinkVendor={handleLinkVendor}
          onUnlinkVendor={handleUnlinkVendor}
          budgetItem={linkingBudgetItem}
          userId={user?.uid || ''}
        />
      )}

      {budget.showAIAssistant && (
        <AIBudgetAssistant
          isOpen={budget.showAIAssistant}
          onClose={() => budget.setShowAIAssistant(false)}
          onGenerateBudget={budget.handleGenerateBudget}
          onGenerateTodoList={budget.handleGenerateTodoList}
          onGenerateIntegratedPlan={budget.handleGenerateIntegratedPlan}
          weddingDate={weddingDate ? new Date(weddingDate) : null}
          totalBudget={budget.userTotalBudget}
        />
      )}

      {showCategoryModal && editingCategory && (
        <BudgetCategoryModal
          isOpen={showCategoryModal}
          onClose={handleCloseCategoryModal}
          category={editingCategory}
          budgetCategories={budget.budgetCategories}
                          userMaxBudget={budget.userMaxBudget}
                onUpdateMaxBudget={budget.updateUserMaxBudget}
          jiggleAllocatedAmount={jiggleAllocatedAmount}
          onSave={(categoryId, updates) => {
            if (categoryId === 'new') {
              budget.handleAddCategory(updates.name!, updates.allocatedAmount || 0);
            } else {
              budget.handleEditCategory(categoryId, updates);
              // Update selectedCategory if it's the one being edited
              if (selectedCategory && selectedCategory.id === categoryId) {
                setSelectedCategory({
                  ...selectedCategory,
                  ...updates
                });
              }
            }
            handleCloseCategoryModal();
            setEditingCategory(null);
          }}
          onDelete={editingCategory.id !== 'new' ? (categoryId) => {
            const category = budget.budgetCategories.find(cat => cat.id === categoryId);
            if (category) {
              setDeletingCategory(category);
              handleCloseCategoryModal();
              setShowDeleteCategoryModal(true);
            }
          } : undefined}
        />
      )}

      {showDeleteCategoryModal && deletingCategory && (
        <DeleteCategoryModal
          isOpen={showDeleteCategoryModal}
          onClose={handleCloseDeleteCategoryModal}
          category={deletingCategory}
          onDelete={(categoryId) => {
            budget.handleDeleteCategory(categoryId);
            handleCloseDeleteCategoryModal();
            setDeletingCategory(null);
          }}
        />
      )}

      {/* Mobile Navigation */}
      <BottomNavBar
        activeTab="budget"
        onTabChange={handleMobileTabChange}
      />
    </div>
  );
} 