import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface RAGAnalysisRequest {
  fileId: string;
  fileName: string;
  fileContent: string;
  fileType: string;
  analysisType: 'comprehensive' | 'summary' | 'insights' | 'questions';
  chatHistory?: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
  userQuestion?: string;
}

interface RAGAnalysisResponse {
  success: boolean;
  analysis: string;
  structuredData?: {
    summary: string;
    keyPoints: string[];
    vendorAccountability: string[];
    importantDates: string[];
    paymentTerms: string[];
    cancellationPolicy: string[];
  };
  followUpQuestions?: string[];
  ragEnabled: boolean;
  ragContext: string;
  credits?: {
    required: number;
    remaining: number;
    userId?: string;
  };
  error?: string;
}

export function useRAGFileAnalysis() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyzeFile = useCallback(async (request: RAGAnalysisRequest): Promise<RAGAnalysisResponse> => {
    // Debug logging (only in development)
    if (process.env.NODE_ENV === 'development') {
      console.log('useRAGFileAnalysis: analyzeFile called with request:', request);
    }
    
    if (!user) {
      throw new Error('User not authenticated');
    }

    setIsLoading(true);
    setError(null);

    try {
      if (process.env.NODE_ENV === 'development') {
        console.log('useRAGFileAnalysis: Making fetch request to /api/ai-file-analyzer-rag');
      }
      const response = await fetch('/api/ai-file-analyzer-rag', {
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
        console.log('RAG API: Response status:', response.status);
        console.log('RAG API: Response ok:', response.ok);
        console.log('RAG API: Response headers:', Object.fromEntries(response.headers.entries()));
      }
      
      try {
        responseText = await response.text();
        if (process.env.NODE_ENV === 'development') {
          console.log('RAG API Raw response text:', responseText);
        }
        
        if (responseText.trim()) {
          data = JSON.parse(responseText);
          if (process.env.NODE_ENV === 'development') {
            console.log('RAG API Parsed data:', data);
          }
        } else {
          if (process.env.NODE_ENV === 'development') {
            console.log('RAG API: Empty response text');
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
            console.log('RAG API: 402 status detected, creating credit error');
            console.log('RAG API: Credit data from response:', data.credits);
          }
          
          const creditError = new Error(data.error || 'Insufficient credits');
          (creditError as any).isCreditError = true;
          (creditError as any).credits = data.credits || { required: 3, current: 0, remaining: 0 };
          (creditError as any).feature = data.feature || 'file analysis';
          
          if (process.env.NODE_ENV === 'development') {
            console.log('RAG API: Created credit error:', {
              message: creditError.message,
              isCreditError: (creditError as any).isCreditError,
              credits: (creditError as any).credits,
              feature: (creditError as any).feature
            });
          }
          
          throw creditError;
        }
        
        // Log other API errors (non-402)
        console.error('RAG API Error:', {
          status: response.status,
          statusText: response.statusText,
          error: data.error,
          message: data.message,
          credits: data.credits,
          rawData: data
        });
        
        throw new Error(data.error || 'Analysis failed');
      }

      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Analysis failed';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const askQuestion = useCallback(async (
    fileId: string,
    fileName: string,
    fileContent: string,
    fileType: string,
    question: string,
    chatHistory?: Array<{role: 'user' | 'assistant', content: string}>
  ): Promise<RAGAnalysisResponse> => {
    return analyzeFile({
      fileId,
      fileName,
      fileContent,
      fileType,
      analysisType: 'questions',
      userQuestion: question,
      chatHistory
    });
  }, [analyzeFile]);

  return {
    analyzeFile,
    askQuestion,
    isLoading,
    error
  };
}

