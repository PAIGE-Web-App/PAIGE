// components/SmartMessageAnalysis.tsx
// Smart message analysis with intelligent pop-ups for detected items

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, Plus, Edit, AlertCircle, X, Lightbulb, Sparkles } from 'lucide-react';
import { useMessageAnalysis } from '../hooks/useMessageAnalysis';
import { DetectedTodo, TodoUpdate, CompletedTodo } from '../utils/messageAnalysisEngine';

interface SmartMessageAnalysisProps {
  messageContent: string;
  vendorCategory: string;
  vendorName: string;
  contactId: string;
  existingTodos?: Array<{
    id: string;
    title: string;
    category: string;
    isCompleted: boolean;
  }>;
  weddingContext?: {
    weddingDate: Date;
    planningStage: string;
    daysUntilWedding: number;
  };
  onNewTodo?: (todo: DetectedTodo) => void;
  onTodoUpdate?: (update: TodoUpdate) => void;
  onTodoComplete?: (completion: CompletedTodo) => void;
}

export default function SmartMessageAnalysis({
  messageContent,
  vendorCategory,
  vendorName,
  contactId,
  existingTodos,
  weddingContext,
  onNewTodo,
  onTodoUpdate,
  onTodoComplete
}: SmartMessageAnalysisProps) {
  const {
    analyzeMessage,
    lastAnalysis,
    isAnalyzing,
    error,
    getHighlightedRanges,
    hasResults,
    clearAnalysis
  } = useMessageAnalysis();

  const [hoveredRange, setHoveredRange] = useState<number | null>(null);
  const [hasBeenAnalyzed, setHasBeenAnalyzed] = useState(false);
  const messageRef = useRef<HTMLDivElement>(null);

  // Clear analysis when message content changes
  useEffect(() => {
    if (hasBeenAnalyzed) {
      clearAnalysis();
      setHasBeenAnalyzed(false);
    }
  }, [messageContent, hasBeenAnalyzed, clearAnalysis]);

  // Mark as analyzed when we get results
  useEffect(() => {
    if (lastAnalysis) {
      setHasBeenAnalyzed(true);
    }
  }, [lastAnalysis]);

  // Handle manual analysis
  const handleManualAnalysis = async () => {
    if (messageContent && messageContent.length > 20) { // Only analyze substantial messages
      try {
        await analyzeMessage({
          messageContent,
          vendorCategory,
          vendorName,
          contactId,
          existingTodos,
          weddingContext
        });
      } catch (err) {
        console.error('Analysis failed:', err);
      }
    }
  };

  // Handle hover events on highlighted text
  const handleHighlightMouseEnter = (rangeIndex: number) => {
    setHoveredRange(rangeIndex);
  };

  const handleHighlightMouseLeave = () => {
    setHoveredRange(null);
  };

  const handleNewTodo = (todo: DetectedTodo) => {
    onNewTodo?.(todo);
    setHoveredRange(null);
  };

  const handleTodoUpdate = (update: TodoUpdate) => {
    onTodoUpdate?.(update);
    setHoveredRange(null);
  };

  const handleTodoComplete = (completion: CompletedTodo) => {
    onTodoComplete?.(completion);
    setHoveredRange(null);
  };

  // Get the currently hovered item
  const getHoveredItem = () => {
    if (hoveredRange === null || !lastAnalysis) return null;
    
    const ranges = getHighlightedRanges(messageContent);
    if (hoveredRange >= ranges.length) return null;
    
    const range = ranges[hoveredRange];
    
    // Find the corresponding item based on range type
    if (range.type === 'new-todo') {
      return lastAnalysis.newTodos[hoveredRange] || null;
    } else if (range.type === 'update') {
      return lastAnalysis.todoUpdates[hoveredRange] || null;
    } else if (range.type === 'completion') {
      return lastAnalysis.completedTodos[hoveredRange] || null;
    }
    
    return null;
  };

  const hoveredItem = getHoveredItem();

  return (
    <div className="smart-message-analysis" ref={messageRef}>
      {/* Manual Analysis Button - Only show if not analyzed yet */}
      {!hasBeenAnalyzed && !isAnalyzing && (
        <div className="analysis-trigger">
          <hr className="analysis-separator" />
          <button
            onClick={handleManualAnalysis}
            className="analyze-button"
            disabled={isAnalyzing}
          >
            <Sparkles className="w-4 h-4" />
            <span>Analyze Message for To-Dos</span>
          </button>
          <p className="analysis-hint">
            Click to scan this message for actionable items using AI
          </p>
        </div>
      )}

      {/* Hover-based Smart Analysis Pop-up */}
      <AnimatePresence>
        {hoveredItem && (
          <motion.div
            key={`popup-${hoveredRange}`}
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="analysis-popup hover-popup"
            style={{
              position: 'absolute',
              top: '0px',
              left: '100%',
              marginLeft: '10px',
              zIndex: 1000
            }}
          >
            {/* New To-Do Item Pop-up */}
            {hoveredItem && 'title' in hoveredItem && (
              <div className="popup-header">
                <div className="popup-icon">
                  <Plus className="w-4 h-4 text-green-600" />
                </div>
                <div className="popup-title">
                  <h4 className="font-semibold text-gray-900">To-do Item spotted!</h4>
                  <p className="text-sm text-gray-600">Do you want to add this to your To-Do List?</p>
                </div>
                <button
                  onClick={() => setHoveredRange(null)}
                  className="popup-close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* To-Do Update Pop-up */}
            {hoveredItem && 'updateType' in hoveredItem && (
              <div className="popup-header">
                <div className="popup-icon">
                  <Edit className="w-4 h-4 text-blue-600" />
                </div>
                <div className="popup-title">
                  <h4 className="font-semibold text-gray-900">Update spotted!</h4>
                  <p className="text-sm text-gray-600">This might update an existing to-do item</p>
                </div>
                <button
                  onClick={() => setHoveredRange(null)}
                  className="popup-close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Completion Pop-up */}
            {hoveredItem && 'completionReason' in hoveredItem && (
              <div className="popup-header">
                <div className="popup-icon">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                </div>
                <div className="popup-title">
                  <h4 className="font-semibold text-gray-900">Update spotted!</h4>
                  <p className="text-sm text-gray-600">Is this To-do Item completed?</p>
                </div>
                <button
                  onClick={() => setHoveredRange(null)}
                  className="popup-close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            <div className="popup-content">
              <div className="detected-item">
                {/* New To-Do Content */}
                {hoveredItem && 'title' in hoveredItem && (
                  <>
                    <h5 className="font-medium text-gray-800">{hoveredItem.title}</h5>
                    <p className="text-sm text-gray-600">{hoveredItem.description}</p>
                    <div className="item-meta">
                      <span className="category-tag">{hoveredItem.category}</span>
                      <span className={`priority-tag priority-${hoveredItem.priority}`}>
                        {hoveredItem.priority}
                      </span>
                    </div>
                  </>
                )}

                {/* Update Content */}
                {hoveredItem && 'updateType' in hoveredItem && (
                  <>
                    <p className="text-sm text-gray-700">{hoveredItem.content}</p>
                    <div className="item-meta">
                      <span className="update-type-tag">{hoveredItem.updateType}</span>
                    </div>
                  </>
                )}

                {/* Completion Content */}
                {hoveredItem && 'completionReason' in hoveredItem && (
                  <p className="text-sm text-gray-700">{hoveredItem.completionReason}</p>
                )}
              </div>
              
              <div className="popup-actions">
                {/* New To-Do Action */}
                {hoveredItem && 'title' in hoveredItem && (
                  <button
                    onClick={() => handleNewTodo(hoveredItem as DetectedTodo)}
                    className="btn-primary"
                  >
                    + New To-do Item
                  </button>
                )}

                {/* Update Action */}
                {hoveredItem && 'updateType' in hoveredItem && (
                  <button
                    onClick={() => handleTodoUpdate(hoveredItem as TodoUpdate)}
                    className="btn-secondary"
                  >
                    Add Note
                  </button>
                )}

                {/* Completion Action */}
                {hoveredItem && 'completionReason' in hoveredItem && (
                  <button
                    onClick={() => handleTodoComplete(hoveredItem as CompletedTodo)}
                    className="btn-success"
                  >
                    Mark Complete
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Analysis Status Indicator */}
      {isAnalyzing && (
        <div className="analysis-status">
          <Lightbulb className="w-4 h-4 text-yellow-500 animate-pulse" />
          <span className="text-sm text-gray-600">Analyzing message for actionable items...</span>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="analysis-error">
          <AlertCircle className="w-4 h-4 text-red-500" />
          <span className="text-sm text-red-600">Analysis failed: {error}</span>
          <button
            onClick={() => clearAnalysis()}
            className="retry-button"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Re-analyze Button for analyzed messages */}
      {hasBeenAnalyzed && !isAnalyzing && (
        <div className="re-analyze-section">
          <button
            onClick={handleManualAnalysis}
            className="re-analyze-button"
            disabled={isAnalyzing}
          >
            <Sparkles className="w-3 h-3" />
            <span>Re-analyze</span>
          </button>
        </div>
      )}
    </div>
  );
}
