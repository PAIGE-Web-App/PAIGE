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

const BudgetSummary = dynamic(() => import('@/components/BudgetSummary'), {
  loading: () => <div className="h-32 bg-white animate-pulse" />
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

  // Handle mobile tab change
  const handleMobileTabChange = (tab: string) => {
    if (tab === 'dashboard') {
      router.push('/');
    } else if (tab === 'todo') {
      router.push('/todo');
    }
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
              {/* Budget Summary Header */}
              <BudgetSummary
                totalBudget={budget.userTotalBudget}
                totalSpent={budget.totalSpent}
                budgetRange={budget.userBudgetRange}
                onShowAIAssistant={() => budget.setShowAIAssistant(true)}
                onShowCSVUpload={() => budget.setShowCSVUpload(true)}
              />

              {/* Budget Items List - Middle Section */}
              <div className="flex-1 flex gap-4 min-h-0">
                <BudgetItemsList
                  selectedCategory={selectedCategory}
                  budgetItems={budget.budgetItems}
                  onAddItem={() => {
                    if (selectedCategory) {
                      // Create a new empty budget item for the modal
                      const newItem: BudgetItem = {
                        id: 'new',
                        userId: user?.uid || '',
                        categoryId: selectedCategory.id!,
                        name: '',
                        amount: 0,
                        notes: '',
                        isCustom: true,
                        isCompleted: false,
                        createdAt: new Date(),
                        updatedAt: new Date(),
                      };
                      budget.setSelectedBudgetItem(newItem);
                      budget.setShowBudgetItemModal(true);
                    } else {
                      toast.error('Please select a category first');
                    }
                  }}
                  onEditItem={(item) => {
                    setSelectedBudgetItem(item);
                    setShowItemSideCard(true);
                  }}
                  onDeleteItem={budget.handleDeleteBudgetItem}
                  onLinkVendor={(item) => {
                    setSelectedBudgetItem(item);
                    budget.setShowVendorIntegrationModal(true);
                  }}
                  onEditCategory={(category) => {
                    setEditingCategory(category);
                    setShowCategoryModal(true);
                  }}
                  onDeleteCategory={(category) => {
                    setDeletingCategory(category);
                    setShowDeleteCategoryModal(true);
                  }}
                />

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
                      budget.setSelectedBudgetItem(selectedBudgetItem);
                      budget.setShowVendorIntegrationModal(true);
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
          onSave={(categoryId, updates) => {
            if (categoryId === 'new') {
              budget.handleAddCategory(updates.name!, updates.allocatedAmount || 0);
            } else {
              budget.handleEditCategory(categoryId, updates);
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