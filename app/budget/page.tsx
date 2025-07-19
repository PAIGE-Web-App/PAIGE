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
  loading: () => <div className="w-64 bg-[#F3F2F0] animate-pulse" />
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



// Lazy load modals - TODO: Create these components
// const BudgetItemModal = dynamic(() => import('@/components/BudgetItemModal'), {
//   ssr: false
// });

// const VendorIntegrationModal = dynamic(() => import('@/components/VendorIntegrationModal'), {
//   ssr: false
// });

// const AIBudgetAssistant = dynamic(() => import('@/components/AIBudgetAssistant'), {
//   ssr: false
// });

// Custom hooks
import { useUserProfileData } from "@/hooks/useUserProfileData";
import { useWeddingBanner } from "@/hooks/useWeddingBanner";
import { useBudget } from "@/hooks/useBudget";
import toast from "react-hot-toast";

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
    <div className="flex flex-col h-screen bg-linen">
      <WeddingBanner
        daysLeft={daysLeft}
        userName={userName}
        isLoading={profileLoading}
        onSetWeddingDate={handleSetWeddingDate}
      />
      
      <div className="app-content-container flex-1 flex overflow-hidden min-h-0 relative" style={{ flexDirection: 'row' }}>
        {/* Budget Sidebar - Categories (Full Height) */}
        <div className="w-64 flex-shrink-0 z-10">
          <BudgetSidebar
            budgetCategories={budget.budgetCategories}
            selectedCategory={selectedCategory}
            setSelectedCategory={setSelectedCategory}
            onAddCategory={() => budget.handleAddCategory('New Category', 0)}
            onEditCategory={(category) => budget.handleEditCategory(category.id!, { name: category.name, allocatedAmount: category.allocatedAmount })}
            onDeleteCategory={budget.handleDeleteCategory}
            totalSpent={budget.totalSpent}
            totalBudget={budget.userTotalBudget || 0}
          />
        </div>

        {/* Main Content Area - Right of Sidebar */}
        <div className="flex-1 flex flex-col min-h-0 bg-white relative z-20">

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
                  budget.handleAddBudgetItem(selectedCategory.id!, { name: '', amount: 0 });
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
      </div>

      {/* MODALS - TODO: Add back when components are created */}

      {/* Mobile Navigation */}
      <BottomNavBar
        activeTab="budget"
        onTabChange={handleMobileTabChange}
      />
    </div>
  );
} 