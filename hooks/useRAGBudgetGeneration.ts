import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';

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
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateBudget = useCallback(async (request: RAGBudgetRequest): Promise<RAGBudgetResponse> => {
    // Debug logging (only in development)
    if (process.env.NODE_ENV === 'development') {
      console.log('useRAGBudgetGeneration: generateBudget called with request:', request);
    }
    
    if (!user) {
      throw new Error('User not authenticated');
    }

    setIsLoading(true);
    setError(null);

    try {
      if (process.env.NODE_ENV === 'development') {
        console.log('useRAGBudgetGeneration: Making fetch request to /api/generate-budget-rag');
      }
      
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
      
      if (process.env.NODE_ENV === 'development') {
        console.log('RAG Budget API: Response status:', response.status);
        console.log('RAG Budget API: Response ok:', response.ok);
        console.log('RAG Budget API: Response headers:', Object.fromEntries(response.headers.entries()));
      }
      
      try {
        responseText = await response.text();
        if (process.env.NODE_ENV === 'development') {
          console.log('RAG Budget API Raw response text:', responseText);
        }
        
        if (responseText.trim()) {
          data = JSON.parse(responseText);
          if (process.env.NODE_ENV === 'development') {
            console.log('RAG Budget API Parsed data:', data);
          }
        } else {
          if (process.env.NODE_ENV === 'development') {
            console.log('RAG Budget API: Empty response text');
          }
          data = { error: 'Empty response' };
        }
      } catch (parseError) {
        console.error('Failed to parse response as JSON:', parseError);
        if (process.env.NODE_ENV === 'development') {
          console.log('Raw response text that failed to parse:', responseText);
        }
        data = { error: 'Invalid response format', rawText: responseText };
      }

      if (!response.ok) {
        // Check if it's a credit-related error
        if (response.status === 402) {
          if (process.env.NODE_ENV === 'development') {
            console.log('RAG Budget API: 402 status detected, creating credit error');
            console.log('RAG Budget API: Credit data from response:', data.credits);
          }
          
          const creditError = new Error(data.error || 'Insufficient credits');
          (creditError as any).isCreditError = true;
          (creditError as any).credits = data.credits || { required: 5, current: 0, remaining: 0 };
          (creditError as any).feature = data.feature || 'budget generation';
          
          if (process.env.NODE_ENV === 'development') {
            console.log('RAG Budget API: Created credit error:', {
              message: creditError.message,
              isCreditError: (creditError as any).isCreditError,
              credits: (creditError as any).credits,
              feature: (creditError as any).feature
            });
          }
          
          throw creditError;
        }
        
        // Log other API errors (non-402)
        console.error('RAG Budget API Error:', {
          status: response.status,
          statusText: response.statusText,
          error: data.error,
          message: data.message,
          credits: data.credits,
          rawData: data
        });
        
        throw new Error(data.error || 'Budget generation failed');
      }

      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Budget generation failed';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  return {
    generateBudget,
    isLoading,
    error
  };
}
