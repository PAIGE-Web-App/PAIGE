"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";

// Firebase imports
import { useAuth } from '@/hooks/useAuth';

// UI component imports
import Banner from '@/components/Banner';
import BottomNavBar from '@/components/BottomNavBar';
import WeddingBanner from '@/components/WeddingBanner';

// Context
import { BudgetProvider, useBudgetContext } from '@/contexts/BudgetContext';

// Lazy load heavy components
const BudgetSidebar = dynamic(() => import('@/components/BudgetSidebar'), {
  loading: () => <div className="w-[320px] bg-[#F3F2F0] animate-pulse" />
});

const BudgetItemsListOptimized = dynamic(() => import('@/components/BudgetItemsListOptimized'), {
  loading: () => <div className="flex-1 bg-white animate-pulse" />
});

const BudgetItemSideCard = dynamic(() => import('@/components/BudgetItemSideCard'), {
  loading: () => <div className="w-80 bg-white animate-pulse" />
});

const BudgetTopBar = dynamic(() => import('@/components/BudgetTopBar'), {
  loading: () => <div className="h-16 bg-white border-b border-[#AB9C95] animate-pulse" />
});

const BudgetMetricsOptimized = dynamic(() => import('@/components/BudgetMetricsOptimized'), {
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
import toast from "react-hot-toast";
import type { BudgetItem, BudgetCategory } from "@/types/budget";

// Optimized Budget Content Component
const BudgetContent: React.FC = () => {
  const router = useRouter();
  const { user } = useAuth();
  const { handleSetWeddingDate } = useWeddingBanner(router);
  
  // Use shared user profile data hook
  const { userName, daysLeft, profileLoading, weddingDate } = useUserProfileData();
  
  // Use budget context
  const {
    budgetCategories,
    selectedCategory,
    setSelectedCategory,
    totalSpent,
    totalBudget,
    budgetRange,
    budgetStats,
    handleAddCategory,
    handleEditCategory,
    handleDeleteCategory,
    handleAddBudgetItem,
    handleUpdateBudgetItem,
    handleDeleteBudgetItem,
    handleLinkVendor,
    handleAssignBudgetItem,
    showBudgetItemModal,
    setShowBudgetItemModal,
    selectedBudgetItem,
    setSelectedBudgetItem,
    showAIAssistant,
    setShowAIAssistant,
    isLoading,
  } = useBudgetContext();

  // Local state for UI interactions
  const [selectedBudgetItemLocal, setSelectedBudgetItemLocal] = useState<BudgetItem | null>(null);
  const [showItemSideCard, setShowItemSideCard] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showDeleteCategoryModal, setShowDeleteCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<BudgetCategory | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<BudgetCategory | null>(null);
  const [jiggleAllocatedAmount, setJiggleAllocatedAmount] = useState(false);
  
  // Link Vendor Modal state
  const [showLinkVendorModal, setShowLinkVendorModal] = useState(false);
  const [linkingBudgetItem, setLinkingBudgetItem] = useState<BudgetItem | null>(null);
  
  // State for budget top bar
  const [budgetSearchQuery, setBudgetSearchQuery] = useState('');
  const [triggerAddItem, setTriggerAddItem] = useState(false);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('budgetViewMode') as 'cards' | 'table') || 'table';
    }
    return 'table';
  });

  // Track if we've initialized the category selection
  const hasInitializedSelection = useRef(false);

  // Category persistence and auto-selection
  useEffect(() => {
    if (budgetCategories && budgetCategories.length > 0 && !hasInitializedSelection.current) {
      hasInitializedSelection.current = true;
      
      // Try to restore the previously selected category from localStorage
      const savedCategoryId = localStorage.getItem('selectedBudgetCategoryId');
      
      if (savedCategoryId) {
        const savedCategory = budgetCategories.find(cat => cat.id === savedCategoryId);
        if (savedCategory) {
          setSelectedCategory(savedCategory);
          return;
        }
      }
      
      // If no saved category or saved category doesn't exist, select the first category
      if (budgetCategories[0] && budgetCategories[0].id) {
        setSelectedCategory(budgetCategories[0]);
        localStorage.setItem('selectedBudgetCategoryId', budgetCategories[0].id);
      }
    }
  }, [budgetCategories, setSelectedCategory]);

  // Reset initialization flag when categories change significantly
  useEffect(() => {
    if (budgetCategories && budgetCategories.length === 0) {
      hasInitializedSelection.current = false;
    }
  }, [budgetCategories]);

  // Save selected category to localStorage whenever it changes
  useEffect(() => {
    if (selectedCategory && selectedCategory.id) {
      localStorage.setItem('selectedBudgetCategoryId', selectedCategory.id);
    }
  }, [selectedCategory]);

  // Clear localStorage if selected category is deleted
  useEffect(() => {
    if (budgetCategories && selectedCategory) {
      const categoryStillExists = budgetCategories.some(cat => cat.id === selectedCategory.id);
      if (!categoryStillExists) {
        localStorage.removeItem('selectedBudgetCategoryId');
        setSelectedCategory(null);
      }
    }
  }, [budgetCategories, selectedCategory, setSelectedCategory]);

  // Handle mobile tab change
  const handleMobileTabChange = useCallback((tab: string) => {
    if (tab === 'dashboard') {
      router.push('/');
    } else if (tab === 'todo') {
      router.push('/todo');
    }
  }, [router]);

  // Handle linking vendor to budget item
  const handleLinkVendorLocal = useCallback(async (vendor: any) => {
    if (!linkingBudgetItem || !user?.uid) return;

    try {
      await handleLinkVendor(linkingBudgetItem.id!, {
        vendorId: vendor.place_id,
        vendorName: vendor.name,
        vendorPlaceId: vendor.place_id
      });
      
      setShowLinkVendorModal(false);
      setLinkingBudgetItem(null);
      
    } catch (error) {
      console.error('Error linking vendor:', error);
      throw error;
    }
  }, [linkingBudgetItem, user?.uid, handleLinkVendor]);

  // Handle unlinking vendor from budget item
  const handleUnlinkVendor = useCallback(async () => {
    if (!linkingBudgetItem || !user?.uid) return;

    try {
      await handleLinkVendor(linkingBudgetItem.id!, {
        vendorId: '',
        vendorName: '',
        vendorPlaceId: ''
      });
      
      setShowLinkVendorModal(false);
      setLinkingBudgetItem(null);
      
    } catch (error) {
      console.error('Error unlinking vendor:', error);
      throw error;
    }
  }, [linkingBudgetItem, user?.uid, handleLinkVendor]);

  // Open link vendor modal
  const openLinkVendorModal = useCallback((budgetItem: BudgetItem) => {
    setLinkingBudgetItem(budgetItem);
    setShowLinkVendorModal(true);
  }, []);

  // Memoized category with spent amount
  const selectedCategoryWithSpent = useMemo(() => {
    if (!selectedCategory) return null;
    
    const categoryBreakdown = budgetStats?.categoryBreakdown?.find(
      (cat: any) => cat.categoryId === selectedCategory.id
    );
    
    return {
      ...selectedCategory,
      spentAmount: categoryBreakdown?.spent || 0
    };
  }, [selectedCategory, budgetStats?.categoryBreakdown]);

  // Memoized over budget check
  const isOverBudget = useMemo(() => {
    if (!selectedCategory || !budgetStats?.categoryBreakdown) return false;
    
    const categoryBreakdown = budgetStats.categoryBreakdown.find(
      (cat: any) => cat.categoryId === selectedCategory.id
    );
    
    return categoryBreakdown && categoryBreakdown.spent > selectedCategory.allocatedAmount;
  }, [selectedCategory, budgetStats?.categoryBreakdown]);

  // Only show content when profile loading is complete
  const isLoadingPage = profileLoading || isLoading;

  if (isLoadingPage) {
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
              budgetCategories={budgetCategories}
              selectedCategory={selectedCategory}
              setSelectedCategory={setSelectedCategory}
              onAddCategory={() => {
                const newCategory = {
                  id: 'new',
                  userId: user?.uid || '',
                  name: 'New Category',
                  allocatedAmount: 0,
                  spentAmount: 0,
                  orderIndex: budgetCategories.length,
                  createdAt: new Date(),
                  color: '#A85C36',
                };
                setEditingCategory(newCategory);
                setShowCategoryModal(true);
              }}
              totalSpent={totalSpent}
              totalBudget={totalBudget || 0}
              budgetItems={[]} // This will be handled by context
            />

            {/* Main Content Area */}
            <div className="unified-main-content">
              {/* Budget Top Bar - Category Title and Actions */}
              <BudgetTopBar
                selectedCategory={selectedCategory}
                budgetSearchQuery={budgetSearchQuery}
                setBudgetSearchQuery={setBudgetSearchQuery}
                onShowAIAssistant={() => setShowAIAssistant(true)}
                onShowCSVUpload={() => {}} // TODO: Implement CSV upload
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
              <BudgetMetricsOptimized
                selectedCategory={selectedCategoryWithSpent}
                totalBudget={totalBudget}
                totalSpent={totalSpent}
                budgetRange={budgetRange}
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
                  {isOverBudget && selectedCategory && (
                    <BudgetOverBudgetBanner
                      categoryName={selectedCategory.name}
                      spentAmount={selectedCategoryWithSpent?.spentAmount || 0}
                      allocatedAmount={selectedCategory.allocatedAmount}
                    />
                  )}
                  
                  <BudgetItemsListOptimized
                    searchQuery={budgetSearchQuery}
                    triggerAddItem={triggerAddItem}
                    onTriggerAddItemComplete={() => setTriggerAddItem(false)}
                    viewMode={viewMode}
                  />
                </div>

                {/* Budget Item Side Card - Right Panel */}
                {showItemSideCard && selectedBudgetItemLocal && (
                  <BudgetItemSideCard
                    isOpen={true}
                    onClose={() => {
                      setShowItemSideCard(false);
                      setSelectedBudgetItemLocal(null);
                    }}
                    budgetItem={selectedBudgetItemLocal}
                    category={selectedCategory}
                    onEdit={() => {
                      setSelectedBudgetItem(selectedBudgetItemLocal);
                      setShowBudgetItemModal(true);
                      setShowItemSideCard(false);
                    }}
                    onLinkVendor={() => {
                      openLinkVendorModal(selectedBudgetItemLocal);
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
      <AnimatePresence>
        {showBudgetItemModal && selectedBudgetItem && (
          <BudgetItemModal
            isOpen={showBudgetItemModal}
            onClose={() => setShowBudgetItemModal(false)}
            budgetItem={selectedBudgetItem}
            categories={budgetCategories}
            onSave={(itemId, updates) => {
              if (itemId === 'new') {
                handleAddBudgetItem(updates.categoryId!, updates);
              } else {
                handleUpdateBudgetItem(itemId, updates);
              }
              setShowBudgetItemModal(false);
            }}
            onDelete={(itemId) => {
              if (itemId !== 'new') {
                handleDeleteBudgetItem(itemId);
              }
              setShowBudgetItemModal(false);
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
            onLinkVendor={handleLinkVendorLocal}
            onUnlinkVendor={handleUnlinkVendor}
            budgetItem={linkingBudgetItem}
            userId={user?.uid || ''}
          />
        )}

        {showAIAssistant && (
          <AIBudgetAssistant
            isOpen={showAIAssistant}
            onClose={() => setShowAIAssistant(false)}
            onGenerateBudget={() => {}} // TODO: Implement
            onGenerateTodoList={() => {}} // TODO: Implement
            onGenerateIntegratedPlan={() => {}} // TODO: Implement
            weddingDate={weddingDate ? new Date(weddingDate) : null}
            totalBudget={totalBudget}
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
            budgetCategories={budgetCategories}
            userBudgetRange={budgetRange}
                         onUpdateBudgetRange={async () => {}} // TODO: Implement
            jiggleAllocatedAmount={jiggleAllocatedAmount}
            onSave={(categoryId, updates) => {
              if (categoryId === 'new') {
                handleAddCategory(updates.name!, updates.allocatedAmount || 0);
              } else {
                handleEditCategory(categoryId, updates);
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
              const category = budgetCategories.find(cat => cat.id === categoryId);
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
              handleDeleteCategory(categoryId);
              setShowDeleteCategoryModal(false);
              setDeletingCategory(null);
            }}
          />
        )}
      </AnimatePresence>

      {/* Mobile Navigation */}
      <BottomNavBar
        activeTab="budget"
        onTabChange={handleMobileTabChange}
      />
    </div>
  );
};

// Main Budget Page Component with Context Provider
const BudgetPageOptimized: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<any>(null);

  return (
    <BudgetProvider selectedCategory={selectedCategory} setSelectedCategory={setSelectedCategory}>
      <BudgetContent />
    </BudgetProvider>
  );
};

export default BudgetPageOptimized; 