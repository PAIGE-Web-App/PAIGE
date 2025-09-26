"use client";

import React, { useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";

// Firebase imports
import { useAuth } from '@/contexts/AuthContext';
import { useQuickStartCompletion } from '@/hooks/useQuickStartCompletion';

// UI component imports
import Banner from '@/components/Banner';
import WeddingBanner from '@/components/WeddingBanner';
import GlobalGmailBanner from '@/components/GlobalGmailBanner';
import LoadingSpinner from '@/components/LoadingSpinner';
import Breadcrumb from '@/components/Breadcrumb';
import SearchBar from '@/components/SearchBar';
import ConfirmationModal from '@/components/ConfirmationModal';

// Import skeleton components
import BudgetSidebarSkeleton from '@/components/skeletons/BudgetSidebarSkeleton';
import BudgetItemsListSkeleton from '@/components/skeletons/BudgetItemsListSkeleton';
import MobileBudgetHeaderSkeleton from '@/components/skeletons/MobileBudgetHeaderSkeleton';
import BudgetMetricsSkeleton from '@/components/skeletons/BudgetMetricsSkeleton';

// Lazy load heavy components
const BudgetSidebar = dynamic(() => import('@/components/BudgetSidebar'), {
  loading: () => <BudgetSidebarSkeleton />
});

const BudgetItemsList = dynamic(() => import('@/components/BudgetItemsList'), {
  loading: () => <BudgetItemsListSkeleton />
});




const BudgetItemSideCard = dynamic(() => import('@/components/BudgetItemSideCard'), {
  loading: () => <div className="w-80 bg-white animate-pulse" />
});

const BudgetTopBar = dynamic(() => import('@/components/BudgetTopBar'), {
  loading: () => <div className="h-16 bg-white border-b border-[#AB9C95] animate-pulse" />
});

const MobileBudgetHeader = dynamic(() => import('@/components/budget/MobileBudgetHeader'), {
  loading: () => <MobileBudgetHeaderSkeleton />
});

const BudgetMetrics = dynamic(() => import('@/components/BudgetMetrics'), {
  loading: () => <BudgetMetricsSkeleton />
});

const BudgetOverview = dynamic(() => import('@/components/budget/BudgetOverview'), {
  loading: () => <div className="flex-1 bg-white animate-pulse" />
});

const BudgetGenerationProgress = dynamic(() => import('@/components/budget/BudgetGenerationProgress'), {
  ssr: false
});

const PrePopulatedBudgetCategoriesModal = dynamic(() => import('@/components/budget/PrePopulatedBudgetCategoriesModal'), {
  ssr: false
});

const BudgetCategoryViewSkeleton = dynamic(() => import('@/components/budget/BudgetCategoryViewSkeleton'), {
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

const AIBudgetAssistant = dynamic(() => import('@/components/AIBudgetAssistantRAG'), {
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
import { useBudget } from "@/hooks/useBudget";
import toast from "react-hot-toast";
import type { BudgetItem, BudgetCategory } from "@/types/budget";

export default function BudgetPage() {
  const { user } = useAuth();
  const router = useRouter();

  // Use shared user profile data hook
  const { userName, daysLeft, profileLoading, weddingDate } = useUserProfileData();

  // Use custom hooks for budget functionality
  const budget = useBudget();
  
  // Track Quick Start Guide completion
  useQuickStartCompletion();
  
  // Calculate projected spend and budget flexibility
  const projectedSpend = React.useMemo(() => 
    budget.budgetCategories.reduce((sum, category) => sum + category.allocatedAmount, 0),
    [budget.budgetCategories]
  );

  const budgetFlexibility = React.useMemo(() => 
    (budget.userMaxBudget || 0) - projectedSpend,
    [budget.userMaxBudget, projectedSpend]
  );

  // State for selected category and item
  const [selectedCategory, setSelectedCategory] = React.useState<any>(null);
  const [selectedBudgetItem, setSelectedBudgetItem] = React.useState<any>(null);
  const [showItemSideCard, setShowItemSideCard] = React.useState(false);
  const [showCategoryModal, setShowCategoryModal] = React.useState(false);
  const [showDeleteCategoryModal, setShowDeleteCategoryModal] = React.useState(false);
  const [editingCategory, setEditingCategory] = React.useState<any>(null);
  const [deletingCategory, setDeletingCategory] = React.useState<any>(null);
  const [jiggleAllocatedAmount, setJiggleAllocatedAmount] = React.useState(false);
  
  // Quick Start modal state
  const [showQuickStartModal, setShowQuickStartModal] = React.useState(false);
  
  // Link Vendor Modal state
  const [showLinkVendorModal, setShowLinkVendorModal] = React.useState(false);
  const [linkingBudgetItem, setLinkingBudgetItem] = React.useState<any>(null);
  
  // State for budget top bar
  const [budgetSearchQuery, setBudgetSearchQuery] = React.useState('');
  const [triggerAddItem, setTriggerAddItem] = React.useState(false);
  const [isBudgetOverviewSelected, setIsBudgetOverviewSelected] = React.useState(false);
  
  // Confirmation modal state for AI budget creation
  const [showCreateBudgetModal, setShowCreateBudgetModal] = React.useState(false);
  
  // Track if we've initialized the category selection
  const hasInitializedSelection = React.useRef(false);
  
  // Mobile state - following main dashboard pattern
  const [mobileViewMode, setMobileViewMode] = React.useState<'categories' | 'category'>('categories');

  // Mobile handlers - following main dashboard pattern
  const handleMobileCategorySelect = React.useCallback((category: BudgetCategory | null) => {
    setSelectedCategory(category);
    setIsBudgetOverviewSelected(!category);
    setMobileViewMode('category');
  }, []);

  const handleMobileBackToCategories = React.useCallback(() => {
    setSelectedCategory(null);
    setIsBudgetOverviewSelected(true);
    setMobileViewMode('categories');
  }, []);

  // AI Budget Creation handlers
  const handleCreateBudgetWithAI = React.useCallback(() => {
    setShowCreateBudgetModal(true);
  }, []);

  const handleCreateBudgetWithAIDirect = React.useCallback(() => {
    budget.setShowAIAssistant(true);
  }, [budget]);

  const handleConfirmCreateBudget = React.useCallback(() => {
    budget.setShowAIAssistant(true);
    setShowCreateBudgetModal(false);
  }, [budget]);

  // Memoized values for performance
  const isLoading = useMemo(() => profileLoading || budget.budgetCategories === undefined, 
    [profileLoading, budget.budgetCategories]);
  
  const selectedCategoryId = useMemo(() => selectedCategory?.id, [selectedCategory]);
  
  // Memoized filtered budget items for selected category
  const filteredBudgetItems = useMemo(() => {
    if (!selectedCategory) return [];
    return budget.budgetItems.filter((item: any) => item.categoryId === selectedCategory.id);
  }, [budget.budgetItems, selectedCategory]);
  
  // Memoized mobile detection to avoid repeated window.innerWidth checks
  const isMobile = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < 1024;
  }, []);

  // Category persistence and auto-selection - Desktop only
  React.useEffect(() => {
    if (!isMobile && budget.budgetCategories && budget.budgetCategories.length > 0 && !hasInitializedSelection.current) {
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

  // Mobile navigation is now handled by VerticalNavWrapper

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
    setShowQuickStartModal(true);
  }, []);

  // Handle adding multiple categories at once
  const handleAddMultipleCategories = useCallback((categories: Array<{name: string; amount: number; items?: Array<{name: string; amount: number; notes?: string}>}>) => {
    budget.handleAddMultipleCategories(categories);
  }, [budget]);


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


  // Loading is now handled by LoadingProvider in layout.tsx

  // If not loading and no user, just return null (middleware will redirect)
  if (!user) {
    return null;
  }

  return (
    <div className="flex flex-col h-full bg-linen">
      <WeddingBanner />
      <GlobalGmailBanner />
      
      <div className="app-content-container flex-1 overflow-hidden">

        <div className="flex h-full gap-4 lg:flex-row flex-col">
          <main className="unified-container">
            {/* Budget Sidebar - Categories */}
            <BudgetSidebar
              budgetCategories={budget.budgetCategories}
              selectedCategory={selectedCategory}
              setSelectedCategory={isMobile ? handleMobileCategorySelect : handleSelectCategory}
              onAddCategory={handleAddCategory}
              budgetItems={budget.budgetItems}
              totalSpent={budget.totalSpent}
              totalBudget={budget.userTotalBudget}
              maxBudget={budget.userMaxBudget || 0}
              projectedSpend={projectedSpend}
              budgetFlexibility={budgetFlexibility}
              onSelectBudgetOverview={isMobile ? () => handleMobileCategorySelect(null) : handleSelectBudgetOverview}
              isBudgetOverviewSelected={isBudgetOverviewSelected}
              mobileViewMode={isMobile ? mobileViewMode : undefined}
              onMobileBackToCategories={isMobile ? handleMobileBackToCategories : undefined}
              onRemoveAllCategories={budget.handleDeleteAllCategories}
              onCreateBudgetWithAI={handleCreateBudgetWithAI}
              onUpdateMaxBudget={budget.updateUserMaxBudget}
            />

            {/* Main Content Area */}
            <div className={`unified-main-content ${isMobile ? `mobile-${mobileViewMode}-view` : ''}`}>
              {/* Show Budget Overview or Category-specific content */}
              {!selectedCategory ? (
                <BudgetOverview
                  budgetCategories={budget.budgetCategories}
                  budgetItems={budget.budgetItems}
                  totalSpent={budget.totalSpent}
                  totalBudget={budget.userTotalBudget || 0}
                  maxBudget={budget.userMaxBudget || 0}
                  onShowAIAssistant={handleCreateBudgetWithAI}
                  onShowAIAssistantDirect={handleCreateBudgetWithAIDirect}
                  onAddCategory={handleAddCategory}
                  onAddMultipleCategories={handleAddMultipleCategories}
                  onSelectCategory={handleSelectCategory}
                  onClearAllBudgetData={budget.handleClearAllBudgetData}
                  onUpdateMaxBudget={budget.updateUserMaxBudget}
                  isLoading={budget.budgetCategories === undefined}
                />
              ) : (!budget.budgetCategories || !budget.budgetStats || !budget.budgetItems) ? (
                <BudgetCategoryViewSkeleton />
              ) : (
                <>
                  
                  {/* Mobile Header */}
                  <MobileBudgetHeader
                    selectedCategory={selectedCategory}
                    onMobileBackToCategories={handleMobileBackToCategories}
                    onEditCategory={handleEditCategory}
                    onDeleteCategory={handleDeleteCategory}
                  />

                  {/* Desktop Top Bar - Category Title and Actions */}
                  <BudgetTopBar
                    selectedCategory={selectedCategory}
                    budgetSearchQuery={budgetSearchQuery}
                    setBudgetSearchQuery={handleSearchQueryChange}
                    onAddItem={handleTriggerAddItem}
                    onEditCategory={handleEditCategory}
                    onDeleteCategory={handleDeleteCategory}
                  />

                  {/* Breadcrumb Navigation - Desktop only */}
                  {selectedCategory && (
                    <div className="hidden lg:block px-6 py-3 border-b border-[#E0DBD7] bg-white">
                      <Breadcrumb
                        items={[
                          {
                            label: 'Overall Budget',
                            onClick: handleSelectBudgetOverview,
                            isCurrent: false
                          },
                          {
                            label: selectedCategory.name,
                            isCurrent: true
                          }
                        ]}
                        className="my-0"
                      />
                    </div>
                  )}

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
                    budgetItems={filteredBudgetItems}
                    onEditCategory={(category) => {
                      setEditingCategory(category);
                      setJiggleAllocatedAmount(true);
                      setShowCategoryModal(true);
                      // Reset jiggle after animation
                      setTimeout(() => setJiggleAllocatedAmount(false), 1000);
                    }}
                    onUpdateMaxBudget={budget.updateUserMaxBudget}
                    isLoading={!budget.budgetCategories || !budget.budgetStats || !budget.budgetItems}
                  />


                   {/* Mobile Budget Items Table - Show after metrics */}
                   <div className="lg:hidden flex-1 flex flex-col min-h-0 px-4 pb-4">
                     <div className="bg-white overflow-hidden flex-1 flex flex-col">
                        {/* Mobile Header with Search and Add Button */}
                        <div className="flex items-center gap-3 mb-3">
                          <div className="flex-1">
                            <SearchBar
                              value={budgetSearchQuery}
                              onChange={setBudgetSearchQuery}
                              placeholder="Search budget items..."
                              isOpen={true}
                              setIsOpen={() => {}}
                            />
                          </div>
                         <button
                           onClick={() => setTriggerAddItem(true)}
                           className="btn-primary"
                         >
                           <span>+</span>
                           <span>Add Item</span>
                         </button>
                       </div>
                       <div className="flex-1 flex flex-col min-h-0">
                         <BudgetItemsList
                           selectedCategory={selectedCategory}
                           budgetItems={budget.budgetItems}
                           searchQuery={budgetSearchQuery}
                           triggerAddItem={false}
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
                           isLoading={!budget.budgetCategories || !budget.budgetStats || !budget.budgetItems}
                         />
                       </div>
                     </div>
                   </div>

                  {/* Budget Items List - Desktop Only */}
              <div className="hidden lg:flex flex-1 flex gap-4 min-h-0">
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
                  
                  {/* Desktop Budget Items Table */}
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
                      isLoading={!budget.budgetCategories || !budget.budgetStats || !budget.budgetItems}
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

      {/* Create Budget with AI Confirmation Modal */}
      <ConfirmationModal
        isOpen={showCreateBudgetModal}
        onClose={() => setShowCreateBudgetModal(false)}
        onConfirm={handleConfirmCreateBudget}
        title="Create Budget with Paige"
        message="Are you sure? Clicking generate will add new budget categories to your existing ones."
        warningMessage="This will create additional categories alongside your current budget. Your existing categories will remain unchanged."
        confirmButtonText="Generate Budget"
        confirmButtonVariant="warning"
      />

      {budget.showAIAssistant && (
        <AIBudgetAssistant
          isOpen={budget.showAIAssistant}
          onClose={() => budget.setShowAIAssistant(false)}
          onGenerateBudget={budget.handleGenerateBudget}
          onGenerateTodoList={budget.handleGenerateTodoList}
          onGenerateIntegratedPlan={budget.handleGenerateIntegratedPlan}
          weddingDate={weddingDate ? new Date(weddingDate) : null}
          totalBudget={budget.userTotalBudget}
          setIsCreatingBudget={budget.setIsCreatingBudget}
          setBudgetCreationProgress={budget.setBudgetCreationProgress}
        />
      )}

      {/* Budget Generation Progress */}
      {budget.budgetCreationProgress && (
        <BudgetGenerationProgress
          isVisible={budget.isCreatingBudget}
          current={budget.budgetCreationProgress.current}
          total={budget.budgetCreationProgress.total}
          currentItem={budget.budgetCreationProgress.currentItem}
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
            
            // If the deleted category was the currently selected one, navigate appropriately
            if (selectedCategory && selectedCategory.id === categoryId) {
              // Check if we're on mobile
              if (isMobile) {
                // On mobile, go back to categories list
                handleMobileBackToCategories();
              } else {
                // On desktop, go to budget overview
                handleSelectBudgetOverview();
              }
            }
          }}
        />
      )}

      {/* Quick Start with Common Categories Modal */}
      {showQuickStartModal && (
        <PrePopulatedBudgetCategoriesModal
          isOpen={showQuickStartModal}
          onClose={() => setShowQuickStartModal(false)}
          onAddCategories={handleAddMultipleCategories}
          onShowAIAssistant={() => {
            setShowQuickStartModal(false);
            setShowCreateBudgetModal(true);
          }}
          maxBudget={budget.userMaxBudget}
        />
      )}

      {/* Mobile Navigation is handled by VerticalNavWrapper */}
    </div>
  );
} 