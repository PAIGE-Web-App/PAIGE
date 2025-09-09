'use client';

import React, { useState, useEffect } from 'react';
import { useRAGFileIntegration } from '@/hooks/useRAGFileIntegration';
import { useAuth } from '@/contexts/AuthContext';

export default function RAGFileIntegration() {
  const { user } = useAuth();
  const {
    files,
    loading,
    error,
    searchResults,
    searchLoading,
    searchError,
    loadUserFiles,
    processAllFiles,
    searchFiles,
    clearSearch
  } = useRAGFileIntegration();

  const [searchQuery, setSearchQuery] = useState('');
  const [processingResults, setProcessingResults] = useState<{
    processed: number;
    failed: number;
    results: Array<{ fileId: string; success: boolean; error?: string }>;
  } | null>(null);

  useEffect(() => {
    if (user?.uid) {
      loadUserFiles(user.uid);
    }
  }, [user?.uid, loadUserFiles]);

  const handleProcessAllFiles = async () => {
    if (!user?.uid) return;
    
    try {
      const results = await processAllFiles(user.uid);
      setProcessingResults(results);
    } catch (error) {
      console.error('Failed to process files:', error);
    }
  };

  const handleSearch = async () => {
    if (!user?.uid || !searchQuery.trim()) return;
    
    await searchFiles(user.uid, searchQuery.trim());
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    clearSearch();
  };

  if (!user) {
    return (
      <div className="p-6 bg-white rounded-lg shadow">
        <p className="text-gray-600">Please log in to use RAG file integration.</p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow space-y-6">
      <div className="border-b pb-4">
        <h2 className="text-2xl font-bold text-gray-900">RAG File Integration</h2>
        <p className="text-gray-600 mt-2">
          Enhance your existing file storage with AI-powered search and insights.
        </p>
      </div>

      {/* File List */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Your Files ({files.length})</h3>
          <button
            onClick={handleProcessAllFiles}
            disabled={loading || files.length === 0}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Processing...' : 'Process All for RAG'}
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        {processingResults && (
          <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
            <p>Processing complete!</p>
            <p>✅ Processed: {processingResults.processed}</p>
            <p>❌ Failed: {processingResults.failed}</p>
          </div>
        )}

        <div className="space-y-2">
          {files.map((file) => (
            <div key={file.id} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex-1">
                <p className="font-medium">{file.name}</p>
                <p className="text-sm text-gray-500">
                  {file.type} • {(file.size / 1024).toFixed(1)} KB • {file.uploadedAt.toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <a
                  href={file.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 text-sm"
                >
                  View
                </a>
              </div>
            </div>
          ))}
        </div>

        {files.length === 0 && !loading && (
          <p className="text-gray-500 text-center py-8">No files found.</p>
        )}
      </div>

      {/* Search */}
      <div className="border-t pt-6">
        <h3 className="text-lg font-semibold mb-4">Search Your Files with AI</h3>
        
        <div className="flex space-x-2 mb-4">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search your files... (e.g., 'wedding timeline', 'photographer contract')"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          />
          <button
            onClick={handleSearch}
            disabled={searchLoading || !searchQuery.trim()}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {searchLoading ? 'Searching...' : 'Search'}
          </button>
          {searchResults.length > 0 && (
            <button
              onClick={handleClearSearch}
              className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
            >
              Clear
            </button>
          )}
        </div>

        {searchError && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {searchError}
          </div>
        )}

        {searchResults.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium">Search Results ({searchResults.length})</h4>
            {searchResults.map((result, index) => (
              <div key={index} className="p-3 border rounded-lg bg-gray-50">
                <div className="flex justify-between items-start mb-2">
                  <h5 className="font-medium text-blue-600">{result.fileName}</h5>
                  <span className="text-sm text-gray-500">
                    {(result.relevanceScore * 100).toFixed(1)}% match
                  </span>
                </div>
                <p className="text-sm text-gray-700">{result.snippet}</p>
                <a
                  href={result.url}
                  className="text-sm text-blue-600 hover:text-blue-800 mt-2 inline-block"
                >
                  View File →
                </a>
              </div>
            ))}
          </div>
        )}

        {searchResults.length === 0 && searchQuery && !searchLoading && (
          <p className="text-gray-500 text-center py-4">No results found for "{searchQuery}"</p>
        )}
      </div>
    </div>
  );
}

