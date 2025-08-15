// hooks/useMessageAnalysis.ts
// React hook for smart message analysis and to-do detection

import { useState, useCallback } from 'react';
import { messageAnalysisEngine, MessageAnalysisResult, AnalysisContext } from '../utils/messageAnalysisEngine';

export function useMessageAnalysis() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [lastAnalysis, setLastAnalysis] = useState<MessageAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  /**
   * Analyze a message for actionable items
   */
  const analyzeMessage = useCallback(async (context: AnalysisContext): Promise<MessageAnalysisResult | null> => {
    setIsAnalyzing(true);
    setError(null);

    try {
      console.log('[useMessageAnalysis] Starting analysis for:', context.vendorName);
      
      const result = await messageAnalysisEngine.analyzeMessage(context);
      
      setLastAnalysis(result);
      console.log('[useMessageAnalysis] Analysis complete:', {
        newTodos: result.newTodos.length,
        todoUpdates: result.todoUpdates.length,
        completedTodos: result.completedTodos.length
      });

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Analysis failed';
      setError(errorMessage);
      console.error('[useMessageAnalysis] Analysis error:', err);
      return null;
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  /**
   * Clear analysis results
   */
  const clearAnalysis = useCallback(() => {
    setLastAnalysis(null);
    setError(null);
  }, []);

  /**
   * Clear cache for a specific contact
   */
  const clearContactCache = useCallback((contactId: string) => {
    messageAnalysisEngine.clearContactCache(contactId);
    clearAnalysis();
  }, [clearAnalysis]);

  /**
   * Get analysis summary for UI display
   */
  const getAnalysisSummary = useCallback(() => {
    if (!lastAnalysis) return null;
    
    return {
      hasNewTodos: lastAnalysis.newTodos.length > 0,
      hasUpdates: lastAnalysis.todoUpdates.length > 0,
      hasCompletions: lastAnalysis.completedTodos.length > 0,
      totalItems: lastAnalysis.newTodos.length + lastAnalysis.todoUpdates.length + lastAnalysis.completedTodos.length,
      analysisType: lastAnalysis.analysisType
    };
  }, [lastAnalysis]);

  /**
   * Get highlighted text ranges for message display
   */
  const getHighlightedRanges = useCallback((messageContent: string) => {
    if (!lastAnalysis) return [];

    const ranges: Array<{
      start: number;
      end: number;
      type: 'new-todo' | 'update' | 'completion';
      content: string;
    }> = [];

    // New to-dos
    lastAnalysis.newTodos.forEach(todo => {
      ranges.push({
        start: messageContent.indexOf(todo.sourceText),
        end: messageContent.indexOf(todo.sourceText) + todo.sourceText.length,
        type: 'new-todo',
        content: todo.sourceText
      });
    });

    // Updates
    lastAnalysis.todoUpdates.forEach(update => {
      ranges.push({
        start: messageContent.indexOf(update.sourceText),
        end: messageContent.indexOf(update.sourceText) + update.sourceText.length,
        type: 'update',
        content: update.sourceText
      });
    });

    // Completions
    lastAnalysis.completedTodos.forEach(completion => {
      ranges.push({
        start: messageContent.indexOf(completion.sourceText),
        end: messageContent.indexOf(completion.sourceText) + completion.sourceText.length,
        type: 'completion',
        content: completion.sourceText
      });
    });

    // Sort by start position
    return ranges.sort((a, b) => a.start - b.start);
  }, [lastAnalysis]);

  return {
    // State
    isAnalyzing,
    lastAnalysis,
    error,
    
    // Actions
    analyzeMessage,
    clearAnalysis,
    clearContactCache,
    
    // Computed values
    getAnalysisSummary,
    getHighlightedRanges,
    
    // Utility
    hasResults: lastAnalysis !== null && (
      lastAnalysis.newTodos.length > 0 || 
      lastAnalysis.todoUpdates.length > 0 || 
      lastAnalysis.completedTodos.length > 0
    )
  };
}
