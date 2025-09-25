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
  sources?: string[];
  confidence?: number[];
  timestamp?: string;
  ragEnabled?: boolean;
  modelUsed?: string;
  structuredData?: {
    summary: string;
    keyPoints: string[];
    vendorAccountability: string[];
    importantDates: string[];
    paymentTerms: string[];
    cancellationPolicy: string[];
  };
  followUpQuestions?: string[];
  ragContext?: string;
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
        console.log('useRAGFileAnalysis: Making fetch request to /api/analyze-file');
      }
      const response = await fetch('/api/analyze-file', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.uid
        },
        body: JSON.stringify({
          fileName: request.fileName,
          fileContent: request.fileContent,
          fileType: request.fileType
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

      // Transform analyze-file response to match expected format
      let formattedAnalysis = 'Analysis completed';
      
      if (data.analysis) {
        // The API should now return clean JSON, so we can format it directly
        const analysis = data.analysis;
        
        // Format the analysis into readable HTML
        formattedAnalysis = `
          <div class="file-analysis">
            <div class="font-work font-medium text-gray-800 mb-0.5">📄 File Analysis Summary</div>
            <p class="font-work text-gray-700 mb-1">${analysis.summary || 'No summary available'}</p>
            
            ${analysis.keyPoints && analysis.keyPoints.length > 0 ? `
              <div class="font-work font-medium text-gray-800 mb-0.5">🔑 Key Points</div>
              <ul class="font-work list-disc list-inside text-gray-700 mb-1">
                ${analysis.keyPoints.map((point: string) => `<li class="mb-0">${point}</li>`).join('')}
              </ul>
            ` : ''}
            
            ${analysis.importantDates && analysis.importantDates.length > 0 ? `
              <div class="font-work font-medium text-gray-800 mb-0.5">📅 Important Dates</div>
              <ul class="font-work list-disc list-inside text-gray-700 mb-1">
                ${analysis.importantDates.map((date: string) => `<li class="mb-0">${date}</li>`).join('')}
              </ul>
            ` : ''}
            
            ${analysis.paymentTerms && analysis.paymentTerms.length > 0 ? `
              <div class="font-work font-medium text-gray-800 mb-0.5">💰 Payment Terms</div>
              <ul class="font-work list-disc list-inside text-gray-700 mb-1">
                ${analysis.paymentTerms.map((term: string) => `<li class="mb-0">${term}</li>`).join('')}
              </ul>
            ` : ''}
            
            ${analysis.vendorAccountability && analysis.vendorAccountability.length > 0 ? `
              <div class="font-work font-medium text-gray-800 mb-0.5">🏢 Vendor Responsibilities</div>
              <ul class="font-work list-disc list-inside text-gray-700 mb-1">
                ${analysis.vendorAccountability.map((item: string) => `<li class="mb-0">${item}</li>`).join('')}
              </ul>
            ` : ''}
            
            ${analysis.cancellationPolicy && analysis.cancellationPolicy.length > 0 ? `
              <div class="font-work font-medium text-gray-800 mb-0.5">❌ Cancellation Policy</div>
              <ul class="font-work list-disc list-inside text-gray-700 mb-1">
                ${analysis.cancellationPolicy.map((policy: string) => `<li class="mb-0">${policy}</li>`).join('')}
              </ul>
            ` : ''}
            
            ${analysis.riskFactors && analysis.riskFactors.length > 0 ? `
              <div class="font-work font-medium text-gray-800 mb-0.5">⚠️ Risk Factors</div>
              <ul class="font-work list-disc list-inside text-gray-700 mb-1">
                ${analysis.riskFactors.map((risk: string) => `<li class="mb-0">${risk}</li>`).join('')}
              </ul>
            ` : ''}
            
            ${analysis.recommendations && analysis.recommendations.length > 0 ? `
              <div class="font-work font-medium text-gray-800 mb-0.5">💡 Recommendations</div>
              <ul class="font-work list-disc list-inside text-gray-700 mb-1">
                ${analysis.recommendations.map((rec: string) => `<li class="mb-0">${rec}</li>`).join('')}
              </ul>
            ` : ''}
          </div>
        `;
      }
      
      return {
        success: data.success,
        analysis: formattedAnalysis,
        sources: [],
        confidence: [],
        timestamp: new Date().toISOString(),
        ragEnabled: false, // This is OpenAI-based, not RAG
        modelUsed: 'OpenAI GPT-4o-mini',
        structuredData: data.analysis,
        error: data.error
      };
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

