import { useState, useCallback } from 'react';
import { UserFile, RAGProcessedFile } from '@/lib/ragFileIntegration';

interface UseRAGFileIntegrationReturn {
  files: UserFile[];
  ragFiles: RAGProcessedFile[];
  loading: boolean;
  error: string | null;
  searchResults: Array<{
    fileId: string;
    fileName: string;
    relevanceScore: number;
    snippet: string;
    url: string;
  }>;
  searchLoading: boolean;
  searchError: string | null;
  
  // Actions
  loadUserFiles: (userId: string) => Promise<void>;
  processAllFiles: (userId: string) => Promise<{
    processed: number;
    failed: number;
    results: Array<{ fileId: string; success: boolean; error?: string }>;
  }>;
  searchFiles: (userId: string, query: string) => Promise<void>;
  clearSearch: () => void;
}

export function useRAGFileIntegration(): UseRAGFileIntegrationReturn {
  const [files, setFiles] = useState<UserFile[]>([]);
  const [ragFiles, setRagFiles] = useState<RAGProcessedFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<Array<{
    fileId: string;
    fileName: string;
    relevanceScore: number;
    snippet: string;
    url: string;
  }>>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const loadUserFiles = useCallback(async (userId: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/rag/process-user-files?userId=${userId}&action=list_files`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to load files');
      }
      
      setFiles(data.files);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load files');
    } finally {
      setLoading(false);
    }
  }, []);

  const processAllFiles = useCallback(async (userId: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/rag/process-user-files', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          action: 'process_all'
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to process files');
      }
      
      return data.results;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process files');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const searchFiles = useCallback(async (userId: string, query: string) => {
    setSearchLoading(true);
    setSearchError(null);
    
    try {
      // For now, use the direct RAG query endpoint
      const response = await fetch('/api/rag/process-query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          user_id: userId,
          context: 'user_files'
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        // If the query workflow isn't ready yet, show a helpful message
        if (data.error?.includes('404') || data.error?.includes('webhook')) {
          setSearchError('AI search is being set up. Please use regular search for now.');
          setSearchResults([]);
          return;
        }
        throw new Error(data.error || 'Failed to search files');
      }
      
      // Transform the results to match our expected format
      const transformedResults = data.results?.map((result: any) => ({
        fileId: result.metadata?.document_id || 'unknown',
        fileName: result.metadata?.content?.substring(0, 50) + '...' || 'Unknown File',
        relevanceScore: result.score || 0,
        snippet: result.metadata?.content?.substring(0, 200) + '...' || '',
        url: `#file-${result.metadata?.document_id || 'unknown'}`
      })) || [];
      
      setSearchResults(transformedResults);
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : 'Failed to search files');
    } finally {
      setSearchLoading(false);
    }
  }, []);

  const clearSearch = useCallback(() => {
    setSearchResults([]);
    setSearchError(null);
  }, []);

  return {
    files,
    ragFiles,
    loading,
    error,
    searchResults,
    searchLoading,
    searchError,
    loadUserFiles,
    processAllFiles,
    searchFiles,
    clearSearch
  };
}
