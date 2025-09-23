import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useCredits } from '@/contexts/CreditContext';
import { creditEventEmitter } from '@/utils/creditEventEmitter';
import { getCreditCosts } from '@/types/credits';

interface RAGBudgetRequest {
  description: string;
  totalBudget: number;
  weddingDate: string;
  budgetType?: 'comprehensive' | 'category_focus' | 'vendor_specific';
  focusCategories?: string[];
  vendorData?: any[];
}

interface RAGBudgetResponse {
  success: boolean;
  budget: {
    categories: Array<{
      name: string;
      percentage: number;
      amount: number;
      subcategories: Array<{
        name: string;
        amount: number;
        priority: string;
        notes: string;
      }>;
    }>;
    totalBudget: number;
    recommendations: string[];
    riskFactors: string[];
  };
  rawResponse: string;
  ragEnabled: boolean;
  ragContext: string;
  credits: {
    required: number;
    remaining: number;
    userId?: string;
  };
  error?: string;
}

export function useRAGBudgetGeneration() {
  const { user } = useAuth();
  const { refreshCredits } = useCredits();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateBudget = useCallback(async (request: RAGBudgetRequest): Promise<RAGBudgetResponse> => {
    // Debug logging (only in development)
    
    if (!user) {
      throw new Error('User not authenticated');
    }

    setIsLoading(true);
    setError(null);

    try {
      
      const response = await fetch('/api/generate-budget-rag', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...request,
          userId: user.uid,
          userEmail: user.email || user.uid
        })
      });

      let data;
      let responseText = '';
      
      
      try {
        responseText = await response.text();
        
        if (responseText.trim()) {
          data = JSON.parse(responseText);
        } else {
          data = { error: 'Empty response' };
        }
      } catch (parseError) {
        data = { error: 'Invalid response format', rawText: responseText };
      }

      if (!response.ok) {
        // Check if it's a credit-related error
        if (response.status === 402) {
          const creditError = new Error(data.error || 'Insufficient credits');
          (creditError as any).isCreditError = true;
          (creditError as any).credits = data.credits || { required: 5, current: 0, remaining: 0 };
          (creditError as any).feature = data.feature || 'budget generation';
          
          throw creditError;
        }
        
        // Log other API errors (non-402) - only in development
        if (process.env.NODE_ENV === 'development') {
          // Silent fail in production
        }
        
        throw new Error(data.error || 'Budget generation failed');
      }

      // Credits are already deducted by the API middleware, no need to refresh

      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Budget generation failed';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [user, refreshCredits]);

  return {
    generateBudget,
    isLoading,
    error
  };
}
