// components/AnalysisResultsDisplay.tsx
// Beautiful display for AI analysis results with actionable to-do management
// Matches the exact UX style from VibePreviewModal

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit, CheckCircle, X, Calendar, Tag, Flag, Sparkles } from 'lucide-react';
import { DetectedTodo, TodoUpdate, CompletedTodo } from '../utils/messageAnalysisEngine';
import ModalTodoItem from './ModalTodoItem';
import { useTodoLists } from '../hooks/useTodoLists';
import { useAuth } from '../contexts/AuthContext';

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

  // Get user's existing to-do lists for dropdown selection
  const { user } = useAuth();
  const todoListsHook = useTodoLists();
  const [selectedListIds, setSelectedListIds] = useState<{ [key: number]: string }>({});
  const [createEnabledItems, setCreateEnabledItems] = useState<{ [key: number]: boolean }>({});

  // Set default list selection when component mounts or todoLists change
  React.useEffect(() => {
    if (results && todoListsHook.todoLists && todoListsHook.todoLists.length > 0) {
      const defaultListId = todoListsHook.todoLists[0].id;
      const newSelectedListIds: { [key: number]: string } = {};
      const newCreateEnabledItems: { [key: number]: boolean } = {};
      
      results.newTodos.forEach((_, index) => {
        newSelectedListIds[index] = defaultListId;
        newCreateEnabledItems[index] = true; // Default to enabled
      });
      
      setSelectedListIds(newSelectedListIds);
      setCreateEnabledItems(newCreateEnabledItems);
    } else if (results && (!todoListsHook.todoLists || todoListsHook.todoLists.length === 0)) {
      // Disable all to-dos if no lists are available
      const newCreateEnabledItems: { [key: number]: boolean } = {};
      results.newTodos.forEach((_, index) => {
        newCreateEnabledItems[index] = false;
      });
      setCreateEnabledItems(newCreateEnabledItems);
    }
  }, [todoListsHook.todoLists, results?.newTodos]);

  if (!results) return null;

  const hasNewTodos = results.newTodos.length > 0;
  const hasUpdates = results.todoUpdates.length > 0;
  const hasCompletions = results.completedTodos.length > 0;
  const totalItems = results.newTodos.length + results.todoUpdates.length + results.completedTodos.length;

  // Check if at least one to-do is enabled for Create All button
  const hasEnabledTodos = Object.values(createEnabledItems).some(enabled => enabled !== false);

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handleListSelection = (todoIndex: number, listId: string) => {
    setSelectedListIds(prev => ({
      ...prev,
      [todoIndex]: listId
    }));
  };

  const handleToggleCreate = (todoIndex: number, enabled: boolean) => {
    setCreateEnabledItems(prev => ({
      ...prev,
      [todoIndex]: enabled
    }));
  };



  const handleCreateTodo = (todo: DetectedTodo, index: number) => {
    const selectedListId = selectedListIds[index];
    // Pass the selected list ID with the todo object
    const todoWithListId = {
      ...todo,
      selectedListId: selectedListId
    };
    onNewTodo(todoWithListId);
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
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white rounded-[10px] shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - matches VibePreviewModal */}
        <div className="border-b border-[#AB9C95] p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-[#805d93]" />
              <h5 className="text-[#332B42] font-semibold">AI Analysis Complete!</h5>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <p className="text-sm text-gray-600 mt-2">
            Found {totalItems} actionable item{totalItems !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* New To-Do Items */}
          {hasNewTodos && (
            <motion.div
              initial={false}
              animate={{ height: expandedSections.newTodos ? 'auto' : 'auto' }}
              className="mb-6"
            >
              {/* Warning if no to-do lists available */}
              {(!todoListsHook.todoLists || todoListsHook.todoLists.length === 0) && (
                <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center gap-2 text-yellow-800">
                    <Flag className="w-4 h-4" />
                    <span className="text-sm font-medium">
                      No to-do lists available. Please create a to-do list first to add items.
                    </span>
                  </div>
                </div>
              )}
              <button
                onClick={() => toggleSection('newTodos')}
                className="flex items-center justify-between w-full text-left mb-3"
              >
                <div className="flex items-center gap-2">
                  <Plus className="w-4 h-4 text-green-600" />
                  <span className="font-medium text-[#332B42]">
                    New To-Do Items ({results.newTodos.length})
                  </span>
                </div>
                <motion.div
                  animate={{ rotate: expandedSections.newTodos ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </motion.div>
              </button>
              
              <AnimatePresence>
                {expandedSections.newTodos && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    {results.newTodos.map((todo, index) => (
                       <ModalTodoItem
                         key={index}
                         todo={todo}
                         index={index}
                         allCategories={['Photographer', 'Caterer', 'Florist', 'DJ', 'Venue', 'Wedding Planner', 'Jewelry']}
                         onListSelection={handleListSelection}
                         selectedListId={selectedListIds[index] || ''}
                         todoLists={todoListsHook.todoLists || []}
                         onCreateTodo={handleCreateTodo}
                         isCreateEnabled={createEnabledItems[index] !== false} // Default to true
                         onToggleCreate={handleToggleCreate}
                       />
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* To-Do Updates */}
          {hasUpdates && (
            <motion.div
              initial={false}
              animate={{ height: expandedSections.updates ? 'auto' : 'auto' }}
              className="mb-6"
            >
              <button
                onClick={() => toggleSection('updates')}
                className="flex items-center justify-between w-full text-left mb-3"
              >
                <div className="flex items-center gap-2">
                  <Edit className="w-4 h-4 text-blue-600" />
                  <span className="font-medium text-[#332B42]">
                    To-Do Updates ({results.todoUpdates.length})
                  </span>
                </div>
                <motion.div
                  animate={{ rotate: expandedSections.updates ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </motion.div>
              </button>
              
              <AnimatePresence>
                {expandedSections.updates && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
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
            </motion.div>
          )}

          {/* Completed To-Dos */}
          {hasCompletions && (
            <motion.div
              initial={false}
              animate={{ height: expandedSections.completions ? 'auto' : 'auto' }}
              className="mb-6"
            >
              <button
                onClick={() => toggleSection('completions')}
                className="flex items-center justify-between w-full text-left mb-3"
              >
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="font-medium text-[#332B42]">
                    Completed To-Dos ({results.completedTodos.length})
                  </span>
                </div>
                <motion.div
                  animate={{ rotate: expandedSections.completions ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </motion.div>
              </button>
              
              <AnimatePresence>
                {expandedSections.completions && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
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
            </motion.div>
          )}

          {/* No Results */}
          {!hasNewTodos && !hasUpdates && !hasCompletions && (
            <div className="text-center py-8">
              <div className="text-gray-400 mb-4">
                <Flag className="w-12 h-12 mx-auto" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Actionable Items Found</h3>
              <p className="text-gray-600">
                The AI didn't detect any specific to-do items, updates, or completions in this message.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-[#AB9C95] p-6 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Flag className="w-4 h-4" />
              <span>
                {(!todoListsHook.todoLists || todoListsHook.todoLists.length === 0) 
                  ? 'Create a to-do list first to add AI-detected items'
                  : 'AI-detected items can be automatically added to your to-do list'
                }
              </span>
            </div>
            <div className="flex gap-3">
              {results?.aiTodoList && (
                <button
                  onClick={() => onGenerateAITodoList(results.aiTodoList!)}
                  className="btn-primary px-4 py-2 text-sm font-medium flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  Generate AI To-Do List
                </button>
              )}
              <button
                onClick={onClose}
                className="btn-primaryinverse px-4 py-2 text-sm font-medium"
              >
                Close
              </button>
              <button
                onClick={() => {
                  // Create all enabled to-dos
                  results.newTodos.forEach((todo, index) => {
                    if (createEnabledItems[index] !== false) {
                      handleCreateTodo(todo, index);
                    }
                  });
                }}
                disabled={!hasEnabledTodos}
                className={`btn-primary px-4 py-2 text-sm font-medium flex items-center gap-2 ${
                  !hasEnabledTodos ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                Create All
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
