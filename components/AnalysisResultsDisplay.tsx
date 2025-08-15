// components/AnalysisResultsDisplay.tsx
// Beautiful display for AI analysis results with actionable to-do management
// Matches the exact UX style from VibePreviewModal

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit, CheckCircle, X, Calendar, Tag, Flag, Sparkles } from 'lucide-react';
import { DetectedTodo, TodoUpdate, CompletedTodo } from '../utils/messageAnalysisEngine';

interface AnalysisResultsDisplayProps {
  results: {
    newTodos: DetectedTodo[];
    todoUpdates: TodoUpdate[];
    completedTodos: CompletedTodo[];
    analysisType: string;
    aiTodoList?: {
      name: string;
      description: string;
      vendorContext: string;
    };
  } | null;
  onClose: () => void;
  onNewTodo: (todo: DetectedTodo) => void;
  onTodoUpdate: (update: TodoUpdate) => void;
  onTodoComplete: (completion: CompletedTodo) => void;
  onGenerateAITodoList: (aiTodoList: { name: string; description: string; vendorContext: string }) => void;
}

export default function AnalysisResultsDisplay({
  results,
  onClose,
  onNewTodo,
  onTodoUpdate,
  onTodoComplete,
  onGenerateAITodoList
}: AnalysisResultsDisplayProps) {
  const [expandedSections, setExpandedSections] = useState<{
    newTodos: boolean;
    updates: boolean;
    completions: boolean;
  }>({
    newTodos: true,
    updates: true,
    completions: true
  });

  if (!results) return null;

  const hasNewTodos = results.newTodos.length > 0;
  const hasUpdates = results.todoUpdates.length > 0;
  const hasCompletions = results.completedTodos.length > 0;
  const totalItems = results.newTodos.length + results.todoUpdates.length + results.completedTodos.length;

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -50, opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="bg-white rounded-[5px] shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Fixed Header - Matching VibePreviewModal style */}
        <div className="flex-shrink-0 bg-white border-b border-[#AB9C95] px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div>
              <h3 className="text-xl font-semibold text-[#332B42] flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#A85C36]" />
                AI Analysis Complete!
              </h3>
              <p className="text-sm text-gray-600">
                Found {totalItems} actionable item{totalItems !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 p-1"
            title="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {/* New To-Dos Section */}
          {hasNewTodos && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h6 className="text-sm font-medium text-[#332B42] flex items-center gap-2">
                  <Plus className="w-4 h-4 text-green-600" />
                  New To-Do Items ({results.newTodos.length})
                </h6>
                <button
                  onClick={() => toggleSection('newTodos')}
                  className="text-[#A85C36] hover:bg-[#A85C36]/10 p-1 rounded transition-colors"
                >
                  <ChevronDown 
                    className={`w-4 h-4 transition-transform ${expandedSections.newTodos ? 'rotate-180' : ''}`} 
                  />
                </button>
              </div>
              
              <AnimatePresence>
                {expandedSections.newTodos && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-3"
                  >
                    {results.newTodos.map((todo, index) => (
                        <div key={index} className="bg-white border border-[#AB9C95] rounded-[3px] p-3 mb-3">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              {/* Task Name - matches your existing style */}
                              <h4 className="font-work text-sm font-medium text-[#332B42] mb-2">
                                {todo.name}
                              </h4>
                              
                              {/* Task Note - matches your existing style */}
                              {todo.note && (
                                <p className="font-work text-xs text-gray-600 mb-3 leading-relaxed">
                                  {todo.note}
                                </p>
                              )}
                              
                              {/* Task Meta - matches your existing style */}
                              <div className="flex flex-wrap gap-2">
                                {todo.category && (
                                  <span className="px-2 py-1 bg-[#F3F2F0] border border-[#AB9C95] rounded-[3px] text-xs text-[#332B42] font-medium">
                                    {todo.category}
                                  </span>
                                )}
                                {todo.deadline && (
                                  <span className="px-2 py-1 bg-[#EBE3DD] border border-[#AB9C95] rounded-[3px] text-xs text-[#332B42] font-medium">
                                    Due: {todo.deadline.toLocaleDateString()}
                                  </span>
                                )}
                                {todo.assignedTo && todo.assignedTo.length > 0 && (
                                  <span className="px-2 py-1 bg-[#F0FDF4] border border-[#16A34A] rounded-[3px] text-xs text-[#16A34A] font-medium">
                                    Assigned
                                  </span>
                                )}
                              </div>
                            </div>
                            
                            {/* Create Button - uses your primary button style */}
                            <button
                              onClick={() => onNewTodo(todo)}
                              className="btn-primary px-4 py-2 text-sm font-medium flex items-center gap-2 flex-shrink-0"
                            >
                              <Plus className="w-4 h-4" />
                              Create To-Do
                            </button>
                          </div>
                        </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* To-Do Updates Section */}
          {hasUpdates && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h6 className="text-sm font-medium text-[#332B42] flex items-center gap-2">
                  <Edit className="w-4 h-4 text-blue-600" />
                  To-Do Updates ({results.todoUpdates.length})
                </h6>
                <button
                  onClick={() => toggleSection('updates')}
                  className="text-[#A85C36] hover:bg-[#A85C36]/10 p-1 rounded transition-colors"
                >
                  <ChevronDown 
                    className={`w-4 h-4 transition-transform ${expandedSections.updates ? 'rotate-180' : ''}`} 
                  />
                </button>
              </div>
              
              <AnimatePresence>
                {expandedSections.updates && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-3"
                  >
                    {results.todoUpdates.map((update, index) => (
                      <div key={index} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <p className="text-sm text-[#332B42] mb-3">{update.content}</p>
                            <span className="px-2 py-1 bg-blue-100 text-blue-700 border border-blue-200 rounded text-xs">
                              {update.updateType}
                            </span>
                          </div>
                          <button
                            onClick={() => onTodoUpdate(update)}
                            className="px-4 py-2 bg-[#3B82F6] text-white rounded-[5px] text-sm font-medium hover:bg-[#3B82F6]/90 transition-colors flex items-center gap-2 flex-shrink-0"
                          >
                            <Edit className="w-4 h-4" />
                            Add Note
                          </button>
                        </div>
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* To-Do Completions Section */}
          {hasCompletions && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h6 className="text-sm font-medium text-[#332B42] flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  To-Do Completions ({results.completedTodos.length})
                </h6>
                <button
                  onClick={() => toggleSection('completions')}
                  className="text-[#A85C36] hover:bg-[#A85C36]/10 p-1 rounded transition-colors"
                >
                  <ChevronDown 
                    className={`w-4 h-4 transition-transform ${expandedSections.completions ? 'rotate-180' : ''}`} 
                  />
                </button>
              </div>
              
              <AnimatePresence>
                {expandedSections.completions && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-3"
                  >
                    {results.completedTodos.map((completion, index) => (
                      <div key={index} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <p className="text-sm text-[#332B42] mb-3">{completion.completionReason}</p>
                          </div>
                          <button
                            onClick={() => onTodoComplete(completion)}
                            className="px-4 py-2 bg-[#10B981] text-white rounded-[5px] text-sm font-medium hover:bg-[#10B981]/90 transition-colors flex items-center gap-2 flex-shrink-0"
                          >
                            <CheckCircle className="w-4 h-4" />
                            Mark Complete
                          </button>
                        </div>
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* No Results */}
          {!hasNewTodos && !hasUpdates && !hasCompletions && (
            <div className="text-center py-12">
              <div className="mb-4">
                <CheckCircle className="w-16 h-16 text-gray-400 mx-auto" />
              </div>
              <h4 className="text-lg font-medium text-[#332B42] mb-2">No Actionable Items Found</h4>
              <p className="text-sm text-gray-600">
                This message doesn't contain any clear to-do items, updates, or completions.
              </p>
            </div>
          )}
        </div>

        {/* Fixed Footer - Matching VibePreviewModal style */}
        <div className="flex-shrink-0 bg-white border-t border-[#AB9C95] px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              <span className="font-medium">💡 Tip:</span> AI-detected items can be automatically added to your to-do list
            </div>
            <div className="flex gap-3">
              {/* Generate AI To-Do List Button - integrates with existing system */}
              {results?.aiTodoList && hasNewTodos && (
                <button
                  onClick={() => onGenerateAITodoList(results.aiTodoList!)}
                  className="px-6 py-2 bg-[#6B46C1] text-white rounded-[5px] text-sm font-medium hover:bg-[#6B46C1]/90 transition-colors flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  Generate AI To-Do List
                </button>
              )}
              <button
                onClick={onClose}
                className="btn-primaryinverse px-6 py-2 text-sm font-medium flex items-center gap-2"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// Missing icon component
const ChevronDown = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
);
