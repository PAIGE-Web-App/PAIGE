'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { DollarSign, Edit3, Check, X, Sparkles } from 'lucide-react';
import { doc, updateDoc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Script from 'next/script';
import dynamic from 'next/dynamic';

// Components
import WeddingDetailsHeader from '@/components/onboarding/WeddingDetailsHeader';
import EditWeddingDetailsModal from '@/components/onboarding/EditWeddingDetailsModal';
import OnboardingProgressStepper from '@/components/onboarding/OnboardingProgressStepper';
import GoogleMapsLoader from '@/components/GoogleMapsLoader';
import HeaderSkeleton from '@/components/skeletons/HeaderSkeleton';
import { useCustomToast } from '@/hooks/useCustomToast';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfileData } from '@/hooks/useUserProfileData';
import { useBudget } from '@/hooks/useBudget';

// Lazy load budget components to match /budget page structure
const BudgetSidebar = dynamic(() => import('@/components/BudgetSidebar'), {
  loading: () => <div className="w-80 bg-white animate-pulse" />
});

const BudgetItemsList = dynamic(() => import('@/components/BudgetItemsList'), {
  loading: () => <div className="flex-1 bg-white animate-pulse" />
});

const BudgetTopBar = dynamic(() => import('@/components/BudgetTopBar'), {
  loading: () => <div className="h-16 bg-white border-b border-[#AB9C95] animate-pulse" />
});

const MobileBudgetHeader = dynamic(() => import('@/components/budget/MobileBudgetHeader'), {
  loading: () => <div className="h-16 bg-white animate-pulse" />
});

const BudgetOverview = dynamic(() => import('@/components/budget/BudgetOverview'), {
  loading: () => <div className="flex-1 bg-white animate-pulse" />
});

interface BudgetCategory {
  name: string;
  amount: number;
  percentage: number;
}

interface GeneratedData {
  todos: any[];
  budget: {
    total: number;
    categories: BudgetCategory[];
  };
  vendors: any;
  weddingDate?: any;
  weddingDateUndecided?: boolean;
  guestCount?: number;
  maxBudget?: number;
  budgetAmount?: number;
  weddingLocation?: string;
  location?: string;
  additionalContext?: string;
  usedFallbackTodos?: boolean;
}

const OnboardingBudgetPage: React.FC = () => {
  const { user } = useAuth();
  const router = useRouter();
  const { showSuccessToast, showErrorToast } = useCustomToast();
  const [isLoading, setIsLoading] = useState(true);
  const [generatedData, setGeneratedData] = useState<GeneratedData | null>(null);
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState<string>('');
  const [showRegenerateModal, setShowRegenerateModal] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  
  // State for selected category and mobile view - matching /budget page
  const [selectedCategory, setSelectedCategory] = useState<any>(null);
  const [budgetSearchQuery, setBudgetSearchQuery] = useState('');
  const [triggerAddItem, setTriggerAddItem] = useState(false);
  const [isBudgetOverviewSelected, setIsBudgetOverviewSelected] = useState(true);
  const [mobileViewMode, setMobileViewMode] = useState<'categories' | 'category'>('categories');

  // Get user profile data for header - same as other onboarding pages
  const {
    weddingDate: profileWeddingDate,
    weddingDateUndecided: profileWeddingDateUndecided,
    weddingLocation: profileWeddingLocation,
    maxBudget: profileMaxBudget,
    guestCount: profileGuestCount,
    additionalContext: profileAdditionalContext
  } = useUserProfileData();

  // Use budget hook to get real budget data (same as /budget page)
  const budget = useBudget();

  // Google Maps API loading handler - same as other onboarding pages
  const handleGoogleMapsLoad = () => {
    console.log('✅ Google Maps API loaded successfully');
  };

  // Handle edit modal save - same as other onboarding pages
  const handleEditModalSave = async (editedValues: any) => {
    if (!user) return;

    console.log('💾 Edit modal save called with values:', editedValues);

    try {
      // Update generatedData with edited values
      const updatedData = { ...generatedData, ...editedValues };
      setGeneratedData(updatedData);
      localStorage.setItem('paige_generated_data', JSON.stringify(updatedData));

      // Prepare updated wedding details for Firestore
      const updatedWeddingDetails = {
        weddingDate: editedValues.weddingDate || generatedData?.weddingDate,
        weddingDateUndecided: editedValues.weddingDateUndecided !== undefined ? editedValues.weddingDateUndecided : (generatedData?.weddingDateUndecided || false),
        location: editedValues.location || generatedData?.location,
        budgetAmount: editedValues.budgetAmount || generatedData?.budgetAmount,
        guestCount: editedValues.guestCount || generatedData?.guestCount,
        additionalContext: editedValues.additionalContext || generatedData?.additionalContext || ''
      };

      // Save to Firestore FIRST
      const userRef = doc(db, 'users', user.uid);
      const firestoreUpdates: any = {};
      
      // Only update fields that were actually changed
      if (editedValues.weddingDate !== undefined || editedValues.weddingDateUndecided !== undefined) {
        // If wedding date is undecided, save null; otherwise save the date
        firestoreUpdates.weddingDate = updatedWeddingDetails.weddingDateUndecided 
          ? null 
          : (updatedWeddingDetails.weddingDate ? new Date(updatedWeddingDetails.weddingDate) : null);
        firestoreUpdates.weddingDateUndecided = updatedWeddingDetails.weddingDateUndecided;
      }
      if (editedValues.location !== undefined) {
        firestoreUpdates.weddingLocation = updatedWeddingDetails.location;
      }
      if (editedValues.budgetAmount !== undefined) {
        firestoreUpdates.maxBudget = updatedWeddingDetails.budgetAmount;
      }
      if (editedValues.guestCount !== undefined) {
        firestoreUpdates.guestCount = updatedWeddingDetails.guestCount;
      }
      if (editedValues.additionalContext !== undefined) {
        firestoreUpdates.additionalContext = updatedWeddingDetails.additionalContext;
      }

      // Update Firestore if there are changes
      if (Object.keys(firestoreUpdates).length > 0) {
        console.log('🔄 Saving to Firestore:', firestoreUpdates);
        await updateDoc(userRef, firestoreUpdates);
        console.log('✅ Updated user profile in Firestore:', firestoreUpdates);
      }

      // Save updated wedding details to localStorage for AI generation
      localStorage.setItem('paige_updated_wedding_details', JSON.stringify(updatedWeddingDetails));

      // "Regenerate Plan" should always regenerate the entire plan from the beginning
      // Redirect to dashboard to trigger the AI generation modal
      showSuccessToast('Wedding details updated! Regenerating your entire plan...');
      
      // Clear generated data so the AI generation modal can show
      localStorage.removeItem('paige_generated_data');
      
      // Set the AI generation context to trigger the modal on dashboard
      const contextValue = editedValues.additionalContext || updatedWeddingDetails.additionalContext || 'Regenerating plan with updated details';
      localStorage.setItem('paige_ai_generation_context', contextValue);
      
      // Keep the onboarding flag active so dashboard knows this is part of onboarding
      localStorage.setItem('paige_enhanced_onboarding_active', 'true');
      
      
      // Close modal and redirect to dashboard to trigger the AI generation modal
      setShowEditModal(false);
      router.push('/dashboard');
      
      // IMPORTANT: Return here to prevent any further code execution
      return;
    } catch (error) {
      console.error('❌ Error updating wedding details:', error);
      showErrorToast('Failed to update wedding details. Please try again.');
    }
  };

  // Load generated data from localStorage (from previous step)
  useEffect(() => {
    const loadGeneratedData = () => {
      try {
        const saved = localStorage.getItem('paige_generated_data');
        if (saved) {
          const parsed = JSON.parse(saved);
          console.log('🔧 DEBUG: Loading budget data with', parsed.budget?.categories?.length, 'categories');
          setGeneratedData(parsed);
        } else {
          console.log('❌ No generated data found in localStorage');
          router.push('/onboarding/vendors');
        }
      } catch (error) {
        console.error('Error loading generated data:', error);
        router.push('/onboarding/vendors');
      } finally {
        setIsLoading(false);
      }
    };

    loadGeneratedData();
  }, []); // Remove router dependency to prevent infinite loop

  // Helper function to get category color - matches existing budget system
  const getCategoryColor = (categoryName: string): string => {
    const colorMap: { [key: string]: string } = {
      'Venue & Location': '#A85C36',
      'Venue & Catering': '#A85C36', // RAG API uses this name
      'Catering & Food': '#8B4513',
      'Photography & Video': '#2F4F4F',
      'Photography & Videography': '#2F4F4F', // RAG API uses this name
      'Attire & Accessories': '#8A2BE2',
      'Attire & Beauty': '#8A2BE2', // RAG API uses this name
      'Flowers & Decor': '#FF69B4',
      'Flowers & Decorations': '#FF69B4', // RAG API uses this name
      'Music & Entertainment': '#32CD32',
      'Transportation': '#4169E1',
      'Wedding Rings': '#FFD700',
      'Stationery & Paper': '#DC143C',
      'Stationery & Favors': '#DC143C', // RAG API uses this name
      'Beauty & Health': '#FF1493',
      'Wedding Planner': '#00CED1',
      'Miscellaneous': '#696969'
    };
    
    // Try exact match first
    if (colorMap[categoryName]) {
      return colorMap[categoryName];
    }
    
    // Try partial matches for common variations
    for (const [key, color] of Object.entries(colorMap)) {
      if (categoryName.toLowerCase().includes(key.toLowerCase()) || 
          key.toLowerCase().includes(categoryName.toLowerCase())) {
        return color;
      }
    }
    
    // Default color if no match found
    return '#696969';
  };

  // Convert generated budget data to the format expected by BudgetSidebar and BudgetItemsList
  const budgetCategories = useMemo(() => {
    if (!generatedData?.budget?.categories) return [];
    
    return generatedData.budget.categories.map((cat: any, index: number) => ({
      id: `generated-${index}`,
      userId: user?.uid || '',
      name: cat.name,
      allocatedAmount: cat.amount || 0,
      spentAmount: 0,
      color: getCategoryColor(cat.name),
      orderIndex: index,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
  }, [generatedData, user?.uid]);

  const budgetItems = useMemo(() => {
    if (!generatedData?.budget?.categories) return [];
    
    const items: any[] = [];
    generatedData.budget.categories.forEach((cat: any, categoryIndex: number) => {
      // Use the detailed subcategories from the high-quality API
      if (cat.subcategories && Array.isArray(cat.subcategories)) {
        cat.subcategories.forEach((subcat: any, itemIndex: number) => {
          items.push({
            id: `generated-item-${categoryIndex}-${itemIndex}`,
            name: subcat.name,
            amount: subcat.amount || 0,
            categoryId: `generated-${categoryIndex}`,
            notes: subcat.notes || '',
            dueDate: subcat.dueDate ? new Date(subcat.dueDate) : null,
            priority: subcat.priority || 'medium',
            vendor: subcat.vendor || '',
            paid: false,
            amountSpent: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        });
      } else {
        // Fallback for categories without subcategories (this should not happen with high-quality API)
        items.push({
          id: `generated-item-${categoryIndex}`,
          name: `${cat.name} - Allocated Budget`,
          amount: cat.amount || 0,
          categoryId: `generated-${categoryIndex}`,
          notes: `Budget allocation for ${cat.name}`,
          priority: 'medium',
          vendor: '',
          paid: false,
          amountSpent: null,
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }
    });
    
    return items;
  }, [generatedData]);

  // Calculate budget metrics using generated data (since we're showing the generated budget)
  const totalSpent = 0; // No spending yet in onboarding
  const totalBudget = generatedData?.budget?.total || 0;
  const maxBudget = profileMaxBudget || totalBudget;
  const projectedSpend = budgetCategories.reduce((sum, category) => sum + category.allocatedAmount, 0);
  const budgetFlexibility = maxBudget - projectedSpend;

  // Mobile handlers - matching /budget page
  const handleMobileCategorySelect = useMemo(() => (category: any) => {
    setSelectedCategory(category);
    setIsBudgetOverviewSelected(!category);
    setMobileViewMode('category');
  }, []);

  const handleMobileBackToCategories = useMemo(() => () => {
    setSelectedCategory(null);
    setIsBudgetOverviewSelected(true);
    setMobileViewMode('categories');
  }, []);

  // Memoized mobile detection
  const isMobile = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < 1024;
  }, []);

  // Handlers - matching /budget page
  const handleSelectBudgetOverview = useMemo(() => () => {
    setIsBudgetOverviewSelected(true);
    setSelectedCategory(null);
  }, []);

  const handleSelectCategory = useMemo(() => (category: any) => {
    setSelectedCategory(category);
    setIsBudgetOverviewSelected(false);
  }, []);

  const handleAddCategory = useMemo(() => () => {
    // For onboarding, we'll just show AI assistant
    showSuccessToast('Use the regenerate button to update your budget categories');
  }, [showSuccessToast]);

  const handleCreateBudgetWithAI = useMemo(() => () => {
    setShowRegenerateModal(true);
  }, []);

  const handleSearchQueryChange = useMemo(() => (query: string) => {
    setBudgetSearchQuery(query);
  }, []);

  const handleTriggerAddItem = useMemo(() => () => {
    setTriggerAddItem(true);
  }, []);

  // Memoized filtered budget items for selected category
  const filteredBudgetItems = useMemo(() => {
    if (!selectedCategory) return [];
    return budgetItems.filter((item: any) => item.categoryId === selectedCategory.id);
  }, [budgetItems, selectedCategory]);

  // Budget overview handlers (same as /budget page)
  const handleSelectCategoryFromOverview = useCallback((category: any) => {
    setSelectedCategory(category);
    setIsBudgetOverviewSelected(false);
  }, []);

  // Handle category amount editing
  const handleEditCategory = (categoryName: string, currentAmount: number) => {
    setEditingCategory(categoryName);
    setEditAmount(currentAmount.toString());
  };

  const handleSaveCategory = () => {
    if (!editingCategory || !generatedData) return;

    const newAmount = parseFloat(editAmount);
    if (isNaN(newAmount) || newAmount < 0) {
      showErrorToast('Please enter a valid amount');
      return;
    }

    // Update the budget data
    const updatedCategories = generatedData.budget.categories.map(cat => 
      cat.name === editingCategory 
        ? { ...cat, amount: newAmount, percentage: (newAmount / generatedData.budget.total) * 100 }
        : cat
    );

    // Recalculate total
    const newTotal = updatedCategories.reduce((sum, cat) => sum + cat.amount, 0);

    setGeneratedData({
      ...generatedData,
      budget: {
        total: newTotal,
        categories: updatedCategories
      }
    });

    setEditingCategory(null);
    setEditAmount('');
    showSuccessToast('Budget category updated');
  };

  const handleCancelEdit = () => {
    setEditingCategory(null);
    setEditAmount('');
  };

  // Handle budget regeneration
  const handleRegenerateBudget = async () => {
    if (!user || !generatedData) return;

    setIsRegenerating(true);
    try {
      // Prepare the request data
      const requestData = {
        description: `Budget breakdown for a ${generatedData.weddingLocation || 'your location'} wedding for ${generatedData.guestCount || 120} guests`,
        totalBudget: generatedData.maxBudget || generatedData.budget.total,
        weddingDate: generatedData.weddingDate || new Date().toISOString(),
        budgetType: 'comprehensive',
        userId: user.uid,
        userEmail: user.email
      };
      
      console.log('🔧 DEBUG: Budget regeneration request data:', requestData);
      
      // Use the same high-quality API as "Create Budget with Paige"
      let response = await fetch('/api/generate-budget-rag', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData)
      });
      
      // No fallback - we want consistent high-quality budget generation

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Budget regeneration failed:', response.status, errorText);
        throw new Error(`Failed to regenerate budget: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      
      // Handle response from the high-quality budget API
      let newBudget = null;
      if (result.success && result.budget) {
        newBudget = result.budget;
      }
      
      if (newBudget) {
        // Update the generated data with new budget
        setGeneratedData({
          ...generatedData,
          budget: newBudget
        });
        
        // Update localStorage
        const updatedData = {
          ...generatedData,
          budget: newBudget
        };
        localStorage.setItem('paige_generated_data', JSON.stringify(updatedData));
        
        showSuccessToast('Budget regenerated successfully');
      } else {
        throw new Error('Invalid response format from budget generation API');
      }
    } catch (error) {
      console.error('Error regenerating budget:', error);
      showErrorToast('Failed to regenerate budget. Please try again.');
    } finally {
      setIsRegenerating(false);
      setShowRegenerateModal(false);
    }
  };

  // Handle completion
  const handleComplete = async () => {
    if (!user || !generatedData) return;
    
    // Navigate immediately to prevent double-clicks
    // Clear the onboarding flag so welcome modal can show
    localStorage.removeItem('paige_enhanced_onboarding_active');
    
    // Set flag to force welcome modal to show on dashboard
    localStorage.setItem('paige_show_welcome_modal', 'true');
    
    // Navigate to dashboard immediately (don't wait for Firestore saves)
    router.push('/dashboard');
    
    try {
      // Save budget data to Firestore (using the same format as "Create Budget with Paige")
      if (generatedData.budget?.categories) {
        console.log('💰 Saving budget data to Firestore...');
        
        for (const [categoryIndex, category] of generatedData.budget.categories.entries()) {
          try {
            // Create budget category document
            const categoryData = {
              userId: user.uid,
              name: category.name || 'Untitled Category',
              allocatedAmount: (category as any).amount || (category as any).allocatedAmount || 0,
              spentAmount: 0,
              orderIndex: categoryIndex, // Add orderIndex for proper sorting
              color: getCategoryColor(category.name || ''),
              createdAt: new Date(),
              updatedAt: new Date(),
            };
            
            const categoryRef = doc(collection(db, `users/${user.uid}/budgetCategories`));
            await setDoc(categoryRef, categoryData);
            
            // Save budget items for this category (using subcategories from high-quality API)
            if ((category as any).subcategories && Array.isArray((category as any).subcategories)) {
              for (const item of (category as any).subcategories) {
                try {
                  const itemData = {
                    categoryId: categoryRef.id,
                    name: item.name || 'Untitled Item',
                    amount: item.amount || 0,
                    notes: item.notes || '',
                    dueDate: item.dueDate ? new Date(item.dueDate) : null,
                    priority: item.priority || 'Medium',
                    isPaid: false,
                    amountSpent: null,
                    isCustom: false,
                    isCompleted: false,
                    userId: user.uid,
                    vendorName: item.vendorName || '',
                    vendorPlaceId: item.vendorPlaceId || '',
                    createdAt: new Date(),
                    updatedAt: new Date(),
                  };
                  
                  const itemRef = doc(collection(db, `users/${user.uid}/budgetItems`));
                  await setDoc(itemRef, itemData);
                } catch (itemError) {
                  console.error(`❌ Failed to save budget item: ${item.name}`, itemError);
                }
              }
            }
          } catch (categoryError) {
            console.error(`❌ Failed to save budget category: ${category.name}`, categoryError);
          }
        }
      }
      
      // Save todo data to Firestore
      if (generatedData.todos) {
        console.log('📋 Saving todo data to Firestore...');
        
        const listName = generatedData.todos.length === 19 ? 'Select Main Venue & Set Wedding Date' : 'Full Wedding Checklist';
        
        // Check if a list with this name already exists to prevent duplicates
        const existingListsQuery = query(
          collection(db, `users/${user.uid}/todoLists`),
          where('userId', '==', user.uid),
          where('name', '==', listName)
        );
        const existingListsSnapshot = await getDocs(existingListsQuery);
        
        let todoListRef;
        if (existingListsSnapshot.empty) {
          // Create new todo list document
          const todoListData = {
            name: listName,
            description: generatedData.todos.length === 19 ? 'This is the first step to successful wedding prep!' : '19 tasks to help you stay on track',
            userId: user.uid,
            orderIndex: 0,
            order: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
            isDefault: true
          };
          
          todoListRef = doc(collection(db, `users/${user.uid}/todoLists`));
          await setDoc(todoListRef, todoListData);
          console.log('📋 Created new todo list:', listName);
        } else {
          // Use existing list
          todoListRef = existingListsSnapshot.docs[0].ref;
          console.log('📋 Using existing todo list:', listName);
        }
        
        // Save individual todo items as separate documents
        for (const [index, todo] of generatedData.todos.entries()) {
          try {
            const todoItemData = {
              listId: todoListRef.id,
              name: todo.title || todo.name || 'Untitled Task',
              title: todo.title || todo.name || 'Untitled Task',
              description: todo.description || '',
              // Only set category if the todo has one, otherwise leave it null
              category: todo.category || null,
              deadline: todo.deadline ? new Date(todo.deadline) : null,
              priority: todo.priority || 'Medium',
              isCompleted: false,
              completed: false,
              userId: user.uid,
              orderIndex: index,
              createdAt: new Date(),
              updatedAt: new Date()
            };
            
            const todoItemRef = doc(collection(db, `users/${user.uid}/todoItems`));
            await setDoc(todoItemRef, todoItemData);
          } catch (itemError) {
            console.error(`❌ Failed to save todo item: ${todo.title || todo.name}`, itemError);
          }
        }
      }
      
      // Update user onboarding status
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        onboardingCompleted: true,
        onboardingCompletedAt: new Date(),
        lastUpdated: new Date()
      });
      
      console.log('✅ Onboarding data saved to Firestore successfully');
      
      // Success toasts will be handled by useQuickStartCompletion hook
      
      // Save final budget data to localStorage
      localStorage.setItem('paige_generated_data', JSON.stringify(generatedData));
      
    } catch (error) {
      console.error('❌ Error completing onboarding:', error);
      showErrorToast('Failed to complete setup. Please try again.');
    }
  };

  // Handle back navigation
  const handleBack = () => {
    router.push('/onboarding/todo');
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };


  if (isLoading) {
    return (
      <div className="flex flex-col h-full bg-linen">
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#A85C36] mx-auto mb-4"></div>
            <p className="text-[#6B7280]">Loading your budget...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!generatedData) {
    return null;
  }

  return (
    <div className="flex flex-col h-full bg-linen">
      {/* Google Maps API Loading - same as other onboarding pages */}
      <Script
        src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places&loading=async`}
        strategy="afterInteractive"
        onLoad={handleGoogleMapsLoad}
      />
      <GoogleMapsLoader onLoad={handleGoogleMapsLoad} />

      {/* Header with skeleton loading */}
      {isLoading ? (
        <HeaderSkeleton />
      ) : (
        <WeddingDetailsHeader
          weddingDate={profileWeddingDate ? new Date(profileWeddingDate).toISOString().split('T')[0] : ''}
          guestCount={profileGuestCount || 120}
          budget={profileMaxBudget || 40000}
          location={profileWeddingLocation || ''}
          onEditClick={() => setShowEditModal(true)}
        />
      )}

      {/* Main Content - same structure as /budget page */}
      <div className="app-content-container flex-1 overflow-hidden">
        <div className="flex h-full gap-4 lg:flex-row flex-col">
          <main className="unified-container">
            {/* Budget Sidebar - Categories */}
            <BudgetSidebar
              budgetCategories={budgetCategories}
              selectedCategory={selectedCategory}
              setSelectedCategory={isMobile ? handleMobileCategorySelect : handleSelectCategory}
              onAddCategory={handleAddCategory}
              budgetItems={budgetItems}
              totalSpent={totalSpent}
              totalBudget={totalBudget}
              maxBudget={maxBudget}
              projectedSpend={projectedSpend}
              budgetFlexibility={budgetFlexibility}
              onSelectBudgetOverview={isMobile ? () => handleMobileCategorySelect(null) : handleSelectBudgetOverview}
              isBudgetOverviewSelected={isBudgetOverviewSelected}
              mobileViewMode={isMobile ? mobileViewMode : undefined}
              onMobileBackToCategories={isMobile ? handleMobileBackToCategories : undefined}
              onRemoveAllCategories={() => {}} // Not needed for onboarding
              onCreateBudgetWithAI={handleCreateBudgetWithAI}
              onUpdateMaxBudget={() => {}} // Not needed for onboarding
            />

            {/* Main Content Area */}
            <div className={`unified-main-content ${isMobile ? `mobile-${mobileViewMode}-view` : ''}`}>
              {/* Show Budget Overview or Category-specific content */}
              {!selectedCategory ? (
                <BudgetOverview
                  budgetCategories={budgetCategories}
                  budgetItems={budgetItems}
                  totalSpent={totalSpent}
                  totalBudget={totalBudget}
                  maxBudget={maxBudget}
                  onShowAIAssistant={undefined} // Disabled for onboarding
                  onAddCategory={handleAddCategory}
                  onSelectCategory={handleSelectCategoryFromOverview}
                  onClearAllBudgetData={() => {}} // Not needed for onboarding
                  onUpdateMaxBudget={() => {}} // Not needed for onboarding
                  isLoading={!generatedData}
                />
              ) : (
                <>
                  {/* Mobile Header */}
                  <MobileBudgetHeader
                    selectedCategory={selectedCategory}
                    onMobileBackToCategories={handleMobileBackToCategories}
                    onEditCategory={() => {}} // Not needed for onboarding
                    onDeleteCategory={() => {}} // Not needed for onboarding
                  />

                  {/* Desktop Top Bar - Category Title and Actions */}
                  <BudgetTopBar
                    selectedCategory={selectedCategory}
                    budgetSearchQuery={budgetSearchQuery}
                    setBudgetSearchQuery={handleSearchQueryChange}
                    onAddItem={handleTriggerAddItem}
                    onEditCategory={() => {}} // Not needed for onboarding
                    onDeleteCategory={() => {}} // Not needed for onboarding
                  />

                  {/* Mobile Budget Items Table */}
                  <div className="lg:hidden flex-1 flex flex-col min-h-0 px-4 pb-4">
                    <div className="bg-white overflow-hidden flex-1 flex flex-col">
                      <div className="flex-1 flex flex-col min-h-0">
                        <BudgetItemsList
                          selectedCategory={selectedCategory}
                          budgetItems={budgetItems}
                          searchQuery={budgetSearchQuery}
                          triggerAddItem={false}
                          onTriggerAddItemComplete={() => setTriggerAddItem(false)}
                          onEditItem={() => {}}
                          onDeleteItem={() => {}} // Not needed for onboarding
                          onLinkVendor={() => {}} // Not needed for onboarding
                          onAssign={async () => {}} // Not needed for onboarding
                          isLoading={false}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Desktop Budget Items Table */}
                  <div className="hidden lg:flex flex-1 flex gap-4 min-h-0">
                    <div className="flex-1 flex flex-col">
                      <div className="hidden lg:block flex-1 min-h-0">
                        <BudgetItemsList
                          selectedCategory={selectedCategory}
                          budgetItems={budgetItems}
                          searchQuery={budgetSearchQuery}
                          triggerAddItem={triggerAddItem}
                          onTriggerAddItemComplete={() => setTriggerAddItem(false)}
                          onEditItem={() => {}}
                          onDeleteItem={() => {}} // Not needed for onboarding
                          onLinkVendor={() => {}} // Not needed for onboarding
                          onAssign={async () => {}} // Not needed for onboarding
                          isLoading={false}
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </main>
        </div>
      </div>

      {/* Footer with integrated stepper */}
      <div className="flex-shrink-0 bg-white border-t border-[#E0D6D0] px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Left: Empty space */}
          <div></div>
          
          {/* Center: Progress Stepper */}
          <OnboardingProgressStepper currentStep="budget" />
          
          {/* Right: Action buttons */}
          <div className="flex items-center gap-4">
            <button
              onClick={handleBack}
              className="btn-primaryinverse"
            >
              Back to To-dos
            </button>
            <button
              onClick={handleComplete}
              className="btn-gradient-purple"
            >
              Complete Setup
            </button>
          </div>
        </div>
      </div>

      {/* Regenerate Budget Modal */}
      <AnimatePresence>
        {showRegenerateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center p-4 z-50"
            onClick={() => setShowRegenerateModal(false)}
          >
            <motion.div
              initial={{ y: -50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -50, opacity: 0 }}
              className="bg-white rounded-[5px] shadow-xl max-w-md w-full p-6 relative"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="h6 text-[#332B42] mb-4">Regenerate Budget</h3>
              <p className="text-sm text-[#6B7280] mb-6">
                This will create a new budget breakdown based on your wedding details. Your current budget will be replaced.
              </p>
              
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowRegenerateModal(false)}
                  className="btn-primaryinverse px-4 py-2 text-sm"
                  disabled={isRegenerating}
                >
                  Cancel
                </button>
                <button
                  onClick={handleRegenerateBudget}
                  disabled={isRegenerating}
                  className="btn-primary px-4 py-2 text-sm flex items-center gap-2"
                >
                  {isRegenerating ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Regenerate
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Wedding Details Modal - same as other onboarding pages */}
      <EditWeddingDetailsModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        onSave={handleEditModalSave}
        initialValues={{
          weddingDate: profileWeddingDate ? new Date(profileWeddingDate).toISOString().split('T')[0] : '',
          weddingDateUndecided: profileWeddingDateUndecided !== undefined ? profileWeddingDateUndecided : false,
          guestCount: profileGuestCount || 120,
          budgetAmount: profileMaxBudget || 40000,
          location: profileWeddingLocation || '',
          additionalContext: profileAdditionalContext || ''
        }}
      />
    </div>
  );
};

export default OnboardingBudgetPage;
