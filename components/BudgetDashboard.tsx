import React, { useState, useEffect } from 'react';
import { DollarSign, Sparkles, Upload, Plus } from 'lucide-react';
import type { BudgetCategory, BudgetItem } from '@/types/budget';

interface BudgetDashboardProps {
  budgetCategories: BudgetCategory[];
  budgetItems: BudgetItem[];
  totalBudget: number | null;
  budgetRange: { min: number; max: number } | null;
  spentAmount: number;
  remainingAmount: number;
  onAddCategory: (name: string, amount: number) => void;
  onAddMultipleCategories?: (categories: Array<{name: string; amount: number}>) => void;
  onAddBudgetItem: (categoryId: string) => void;
  onUpdateBudgetItem: (itemId: string, updates: Partial<BudgetItem>) => void;
  onDeleteBudgetItem: (itemId: string) => void;
  onLinkVendor: (itemId: string, vendorData: any) => void;
  recommendations: any[];
  showAIAssistant: () => void;
  showCSVUpload: () => void;
}

const BudgetDashboard: React.FC<BudgetDashboardProps> = ({
  budgetCategories,
  budgetItems,
  totalBudget,
  budgetRange,
  spentAmount,
  remainingAmount,
  onAddCategory,
  onAddMultipleCategories,
  onAddBudgetItem,
  onUpdateBudgetItem,
  onDeleteBudgetItem,
  onLinkVendor,
  recommendations,
  showAIAssistant,
  showCSVUpload,
}) => {
  const spentPercentage = totalBudget ? (spentAmount / totalBudget) * 100 : 0;

  // Calculate range-based insights
  const getBudgetInsights = () => {
    if (!budgetRange) return null;
    
    const minRemaining = budgetRange.min - spentAmount;
    const maxRemaining = budgetRange.max - spentAmount;
    const avgRemaining = (budgetRange.min + budgetRange.max) / 2 - spentAmount;
    
    let status = 'on-track';
    let message = '';
    
    if (spentAmount > budgetRange.max) {
      status = 'over-budget';
      message = `You're ${(spentAmount - budgetRange.max).toLocaleString()} over your maximum budget.`;
    } else if (spentAmount > totalBudget!) {
      status = 'above-average';
      message = `You're above your average budget but still within range.`;
    } else if (spentAmount < budgetRange.min) {
      status = 'under-budget';
      message = `You're ${(budgetRange.min - spentAmount).toLocaleString()} under your minimum budget.`;
    } else {
      status = 'on-track';
      message = `You're on track within your budget range.`;
    }
    
    return {
      minRemaining,
      maxRemaining,
      avgRemaining,
      status,
      message
    };
  };

  const insights = getBudgetInsights();

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-6 border-b border-[#AB9C95]">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold text-[#332B42]">Wedding Budget</h1>
          <div className="flex gap-2">
            <button
              onClick={showAIAssistant}
              className="btn-primary flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              AI Assistant
            </button>
            <button
              onClick={showCSVUpload}
              className="btn-secondary flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              IMPORT CSV
            </button>
          </div>
        </div>

        {/* Budget Summary Cards */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-[#F8F6F4] p-4 rounded-[5px] border border-[#AB9C95]">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-5 h-5 text-[#A85C36]" />
              <h3 className="font-medium text-[#332B42]">Max Budget</h3>
            </div>
            {budgetRange ? (
              <p className="text-2xl font-bold text-[#332B42]">
                ${budgetRange.min.toLocaleString()} - ${budgetRange.max.toLocaleString()}
              </p>
            ) : (
              <p className="text-2xl font-bold text-[#332B42]">
                ${totalBudget?.toLocaleString() || '0'}
              </p>
            )}
            {budgetRange && (
              <p className="text-sm text-[#AB9C95]">
                Average: ${totalBudget?.toLocaleString()}
              </p>
            )}
          </div>

          <div className="bg-[#F8F6F4] p-4 rounded-[5px] border border-[#AB9C95]">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-5 h-5 text-[#A85C36]" />
              <h3 className="font-medium text-[#332B42]">Spent</h3>
            </div>
            <p className="text-2xl font-bold text-[#332B42]">
              ${spentAmount.toLocaleString()}
            </p>
            {budgetRange ? (
              <p className="text-sm text-[#AB9C95]">
                {spentPercentage.toFixed(1)}% of average budget
              </p>
            ) : (
              <p className="text-sm text-[#AB9C95]">
                {spentPercentage.toFixed(1)}% of budget
              </p>
            )}
          </div>

          <div className="bg-[#F8F6F4] p-4 rounded-[5px] border border-[#AB9C95]">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-5 h-5 text-[#A85C36]" />
              <h3 className="font-medium text-[#332B42]">Remaining</h3>
            </div>
            <p className="text-2xl font-bold text-[#332B42]">
              ${remainingAmount.toLocaleString()}
            </p>
            {budgetRange && insights ? (
              <p className="text-sm text-[#AB9C95]">
                {insights.status === 'over-budget' ? 'Over budget' :
                 insights.status === 'above-average' ? 'Above average' :
                 insights.status === 'under-budget' ? 'Under budget' :
                 'On track'}
              </p>
            ) : (
              <p className="text-sm text-[#AB9C95]">Available</p>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-[#332B42]">Budget Progress</span>
            <span className="text-sm text-[#AB9C95]">{spentPercentage.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-[#E0D6D0] rounded-full h-2">
            <div
              className="bg-[#A85C36] h-2 rounded-full transition-all duration-300"
              style={{ width: `${Math.min(spentPercentage, 100)}%` }}
            />
          </div>
          {budgetRange && insights && (
            <div className={`mt-2 p-3 border rounded-[5px] ${
              insights.status === 'over-budget' ? 'bg-red-50 border-red-200' :
              insights.status === 'above-average' ? 'bg-yellow-50 border-yellow-200' :
              insights.status === 'under-budget' ? 'bg-green-50 border-green-200' :
              'bg-blue-50 border-blue-200'
            }`}>
              <p className={`text-xs ${
                insights.status === 'over-budget' ? 'text-red-800' :
                insights.status === 'above-average' ? 'text-yellow-800' :
                insights.status === 'under-budget' ? 'text-green-800' :
                'text-blue-800'
              }`}>
                💡 <strong>Budget Status:</strong> {insights.message}
                <br />
                <span className="text-[10px] opacity-75">
                  Range: ${budgetRange.min.toLocaleString()} - ${budgetRange.max.toLocaleString()} | 
                  Average: ${totalBudget?.toLocaleString()} | 
                  Spent Amount: ${spentAmount.toLocaleString()}
                </span>
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6 overflow-y-auto">
        <h2 className="text-xl font-semibold text-[#332B42] mb-4">Budget Categories</h2>
        
        {budgetCategories.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <DollarSign className="w-16 h-16 text-[#AB9C95] mb-4" />
            <h3 className="text-lg font-medium text-[#332B42] mb-2">No budget categories yet</h3>
            <p className="text-[#AB9C95] text-center mb-6 max-w-md">
              Start by adding budget categories or use our AI assistant to generate a complete budget plan.
            </p>
            <button
              onClick={() => onAddCategory('New Category', 0)}
              className="btn-primary flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Category
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {budgetCategories.map((category) => {
              const categoryItems = budgetItems.filter(item => item.categoryId === category.id);
              const categorySpent = categoryItems.reduce((sum, item) => sum + item.amount, 0);
              const categoryPercentage = category.allocatedAmount > 0 ? (categorySpent / category.allocatedAmount) * 100 : 0;

              return (
                <div key={category.id} className="bg-[#F8F6F4] p-4 rounded-[5px] border border-[#AB9C95]">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium text-[#332B42]">{category.name}</h3>
                    <button
                      onClick={() => category.id && onAddBudgetItem(category.id)}
                      className="text-[#A85C36] hover:text-[#8B4513] text-sm"
                    >
                      + Add Item
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-[#AB9C95]">
                      ${categorySpent.toLocaleString()} / ${category.allocatedAmount.toLocaleString()}
                    </span>
                    <span className="text-sm text-[#AB9C95]">{categoryPercentage.toFixed(1)}%</span>
                  </div>
                  
                  <div className="w-full bg-[#E0D6D0] rounded-full h-1 mb-3">
                    <div
                      className="h-1 rounded-full transition-all duration-300"
                      style={{ 
                        width: `${Math.min(categoryPercentage, 100)}%`,
                        backgroundColor: category.color || '#A85C36'
                      }}
                    />
                  </div>

                  {categoryItems.length > 0 && (
                    <div className="space-y-2">
                      {categoryItems.map((item) => (
                        <div key={item.id} className="flex items-center justify-between p-2 bg-white rounded border border-[#AB9C95]">
                          <span className="text-sm text-[#332B42]">{item.name}</span>
                          <span className="text-sm font-medium text-[#332B42]">
                            ${item.amount.toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <div className="mt-8">
            <h3 className="text-lg font-semibold text-[#332B42] mb-4">AI Recommendations</h3>
            <div className="space-y-2">
              {recommendations.map((rec, index) => (
                <div key={index} className="p-3 bg-blue-50 border border-blue-200 rounded-[5px]">
                  <p className="text-sm text-blue-800">{rec.message}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BudgetDashboard; 