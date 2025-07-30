"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";

// Firebase imports
import { useAuth } from '@/hooks/useAuth';

// UI component imports
import Banner from '@/components/Banner';
import BottomNavBar from '@/components/BottomNavBar';
import WeddingBanner from '@/components/WeddingBanner';

// Lazy load heavy components
const BudgetSidebar = dynamic(() => import('@/components/BudgetSidebar'), {
  loading: () => <div className="w-[320px] bg-[#F3F2F0] animate-pulse" />
});

const BudgetItemsList = dynamic(() => import('@/components/BudgetItemsList'), {
  loading: () => <div className="flex-1 bg-white animate-pulse" />
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
import type { BudgetItem } from "@/types/budget";

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

  // Track if we've initialized the category selection
  const hasInitializedSelection = React.useRef(false);

  // Category persistence and auto-selection
  React.useEffect(() => {
    if (budget.budgetCategories && budget.budgetCategories.length > 0 && !hasInitializedSelection.current) {
      hasInitializedSelection.current = true;
      
      // Try to restore the previously selected category from localStorage
      const savedCategoryId = localStorage.getItem('selectedBudgetCategoryId');
      
      if (savedCategoryId) {
        const savedCategory = budget.budgetCategories.find(cat => cat.id === savedCategoryId);
        if (savedCategory) {
          setSelectedCategory(savedCategory);
          return;
        }
      }
      
      // If no saved category or saved category doesn't exist, select the first category
      if (budget.budgetCategories[0] && budget.budgetCategories[0].id) {
        setSelectedCategory(budget.budgetCategories[0]);
        localStorage.setItem('selectedBudgetCategoryId', budget.budgetCategories[0].id);
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
  const handleMobileTabChange = (tab: string) => {
    if (tab === 'dashboard') {
      router.push('/');
    } else if (tab === 'todo') {
      router.push('/todo');
    }
  };

  // Handle linking vendor to budget item
  const handleLinkVendor = async (vendor: any) => {
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
  };

  // Open link vendor modal
  const openLinkVendorModal = (budgetItem: any) => {
    setLinkingBudgetItem(budgetItem);
    setShowLinkVendorModal(true);
  };

  // Only show content when profile loading is complete
  const isLoading = profileLoading || loading || budget.budgetCategories === undefined;

  const { handleSetWeddingDate } = useWeddingBanner(router);

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen bg-linen">
        <WeddingBanner
          daysLeft={null}
          userName={null}
          isLoading={true}
          onSetWeddingDate={handleSetWeddingDate}
        />
        <div className="flex-1 flex items-center justify-center">
          <div className="w-12 h-12 border-4 border-[#A85C36] border-t-transparent rounded-full animate-spin"></div>
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
        onSetWeddingDate={handleSetWeddingDate}
      />
      
      <div className="app-content-container flex-1 overflow-hidden">
        <div className="flex h-full gap-4 md:flex-row flex-col">
          <main className="unified-container">
            {/* Budget Sidebar - Categories */}
            <BudgetSidebar
              budgetCategories={budget.budgetCategories}
              selectedCategory={selectedCategory}
              setSelectedCategory={setSelectedCategory}
              onAddCategory={() => {
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
              }}
              totalSpent={budget.totalSpent}
              totalBudget={budget.userTotalBudget || 0}
              budgetItems={budget.budgetItems}
            />

            {/* Main Content Area */}
            <div className="unified-main-content">
              {/* Budget Top Bar - Category Title and Actions */}
              <BudgetTopBar
                selectedCategory={selectedCategory}
                budgetSearchQuery={budgetSearchQuery}
                setBudgetSearchQuery={setBudgetSearchQuery}
                onShowAIAssistant={() => budget.setShowAIAssistant(true)}
                onShowCSVUpload={() => budget.setShowCSVUpload(true)}
                onAddItem={() => {
                  if (selectedCategory) {
                    setTriggerAddItem(true);
                  }
                }}
                onEditCategory={(category) => {
                  setEditingCategory(category);
                  setShowCategoryModal(true);
                }}
                onDeleteCategory={(category) => {
                  setDeletingCategory(category);
                  setShowDeleteCategoryModal(true);
                }}
                viewMode={viewMode}
                onViewModeChange={(mode) => {
                  setViewMode(mode);
                  localStorage.setItem('budgetViewMode', mode);
                }}
              />

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
                budgetRange={budget.userBudgetRange}
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
                  
                  <BudgetItemsList
                    selectedCategory={selectedCategory}
                    budgetItems={budget.budgetItems}
                    searchQuery={budgetSearchQuery}
                    triggerAddItem={triggerAddItem}
                    onTriggerAddItemComplete={() => setTriggerAddItem(false)}
                    onEditItem={(item) => {
                      // Editing is now handled inline in BudgetItemComponent
                      console.log('Edit item:', item);
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

                {/* Budget Item Side Card - Right Panel */}
                {showItemSideCard && selectedBudgetItem && (
                  <BudgetItemSideCard
                    isOpen={true}
                    onClose={() => {
                      setShowItemSideCard(false);
                      setSelectedBudgetItem(null);
                    }}
                    budgetItem={selectedBudgetItem}
                    category={selectedCategory}
                    onEdit={() => {
                      budget.setSelectedBudgetItem(selectedBudgetItem);
                      budget.setShowBudgetItemModal(true);
                      setShowItemSideCard(false);
                    }}
                    onLinkVendor={() => {
                      openLinkVendorModal(selectedBudgetItem);
                      setShowItemSideCard(false);
                    }}
                  />
                )}
              </div>
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
          onClose={() => {
            setShowLinkVendorModal(false);
            setLinkingBudgetItem(null);
          }}
          onLinkVendor={handleLinkVendor}
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
          onClose={() => {
            setShowCategoryModal(false);
            setEditingCategory(null);
          }}
          category={editingCategory}
          budgetCategories={budget.budgetCategories}
          userBudgetRange={budget.userBudgetRange}
          onUpdateBudgetRange={budget.updateUserBudgetRange}
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
            setShowCategoryModal(false);
            setEditingCategory(null);
          }}
          onDelete={editingCategory.id !== 'new' ? (categoryId) => {
            const category = budget.budgetCategories.find(cat => cat.id === categoryId);
            if (category) {
              setDeletingCategory(category);
              setShowCategoryModal(false);
              setShowDeleteCategoryModal(true);
            }
          } : undefined}
        />
      )}

      {showDeleteCategoryModal && deletingCategory && (
        <DeleteCategoryModal
          isOpen={showDeleteCategoryModal}
          onClose={() => {
            setShowDeleteCategoryModal(false);
            setDeletingCategory(null);
          }}
          category={deletingCategory}
          onDelete={(categoryId) => {
            budget.handleDeleteCategory(categoryId);
            setShowDeleteCategoryModal(false);
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