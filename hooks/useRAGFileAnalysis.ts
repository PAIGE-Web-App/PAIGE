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
    if (!user) {
      throw new Error('User not authenticated');
    }

    setIsLoading(true);
    setError(null);

    try {
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

      const data = await response.json();

      if (!response.ok) {
        console.error('RAG API Error:', {
          status: response.status,
          statusText: response.statusText,
          error: data.error,
          message: data.message,
          credits: data.credits
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

