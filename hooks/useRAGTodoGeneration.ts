import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useCredits } from '@/contexts/CreditContext';

interface RAGTodoRequest {
  description: string;
  weddingDate: string;
  todoType?: 'comprehensive' | 'category_focus' | 'timeline_focus';
  focusCategories?: string[];
  existingTodos?: any[];
  vendorData?: any[];
}

interface RAGTodoResponse {
  success: boolean;
  todos: {
    listName: string;
    todos: Array<{
      name: string;
      category: string;
      priority: string;
      deadline: string;
      note: string;
      dependencies: string[];
      estimatedDuration: string;
    }>;
    timeline: {
      totalTasks: number;
      highPriority: number;
      mediumPriority: number;
      lowPriority: number;
    };
    recommendations: string[];
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

export function useRAGTodoGeneration() {
  const { user } = useAuth();
  const { refreshCredits } = useCredits();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateTodos = useCallback(async (request: RAGTodoRequest): Promise<RAGTodoResponse> => {
    // Debug logging (only in development)
    if (process.env.NODE_ENV === 'development') {
      console.log('useRAGTodoGeneration: generateTodos called with request:', request);
    }
    
    if (!user) {
      throw new Error('User not authenticated');
    }

    setIsLoading(true);
    setError(null);

    try {
      if (process.env.NODE_ENV === 'development') {
        console.log('useRAGTodoGeneration: Making fetch request to /api/generate-list-rag');
      }
      
      const response = await fetch('/api/generate-list-rag', {
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
        console.log('RAG Todo API: Response status:', response.status);
        console.log('RAG Todo API: Response ok:', response.ok);
        console.log('RAG Todo API: Response headers:', Object.fromEntries(response.headers.entries()));
      }
      
      try {
        responseText = await response.text();
        if (process.env.NODE_ENV === 'development') {
          console.log('RAG Todo API Raw response text:', responseText);
        }
        
        if (responseText.trim()) {
          data = JSON.parse(responseText);
          if (process.env.NODE_ENV === 'development') {
            console.log('RAG Todo API Parsed data:', data);
          }
        } else {
          if (process.env.NODE_ENV === 'development') {
            console.log('RAG Todo API: Empty response text');
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
            console.log('RAG Todo API: 402 status detected, creating credit error');
            console.log('RAG Todo API: Credit data from response:', data.credits);
          }
          
          const creditError = new Error(data.error || 'Insufficient credits');
          (creditError as any).isCreditError = true;
          (creditError as any).credits = data.credits || { required: 3, current: 0, remaining: 0 };
          (creditError as any).feature = data.feature || 'todo generation';
          
          if (process.env.NODE_ENV === 'development') {
            console.log('RAG Todo API: Created credit error:', {
              message: creditError.message,
              isCreditError: (creditError as any).isCreditError,
              credits: (creditError as any).credits,
              feature: (creditError as any).feature
            });
          }
          
          throw creditError;
        }
        
        // Log other API errors (non-402)
        console.error('RAG Todo API Error:', {
          status: response.status,
          statusText: response.statusText,
          error: data.error,
          message: data.message,
          credits: data.credits,
          rawData: data
        });
        
        throw new Error(data.error || 'Todo generation failed');
      }

      // Refresh credits after successful completion
      try {
        await refreshCredits();
      } catch (refreshError) {
        console.warn('Failed to refresh credits after todo generation:', refreshError);
      }

      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Todo generation failed';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [user, refreshCredits]);

  return {
    generateTodos,
    isLoading,
    error
  };
}
