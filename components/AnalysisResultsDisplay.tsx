// components/AnalysisResultsDisplay.tsx
// Beautiful display for AI analysis results with actionable to-do management
// Matches the exact UX style from VibePreviewModal

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit, CheckCircle, X, Calendar, Tag, Flag, Sparkles, Info } from 'lucide-react';
import { DetectedTodo, TodoUpdate, CompletedTodo } from '../utils/messageAnalysisEngine';
import ModalTodoItem from './ModalTodoItem';
import UnifiedTodoItem from './UnifiedTodoItem';
import Banner from './Banner';
import { useTodoLists } from '../hooks/useTodoLists';
import { useAuth } from '../contexts/AuthContext';
import { TodoItem } from '../types/todo';

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
  const [editableCompletions, setEditableCompletions] = useState<{ [key: number]: CompletedTodo }>({});

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

  // Initialize completion state
  React.useEffect(() => {
    if (results?.completedTodos) {
      const newEditableCompletions: { [key: number]: CompletedTodo } = {};
      
      results.completedTodos.forEach((completion, index) => {
        newEditableCompletions[index] = { ...completion }; // Copy for editing
      });
      
      setEditableCompletions(newEditableCompletions);
    }
  }, [results?.completedTodos]);

  if (!results) return null;

  const hasNewTodos = results.newTodos.length > 0;
  const hasUpdates = results.todoUpdates.length > 0;
  const hasCompletions = results.completedTodos.length > 0;
  const totalItems = results.newTodos.length + results.todoUpdates.length + results.completedTodos.length;

  // Check if at least one to-do is enabled for Submit button
  const hasEnabledTodos = Object.values(createEnabledItems).some(enabled => enabled !== false);
  const hasEnabledCompletions = Object.values(editableCompletions).some(completion => 
    (completion as any).isCompleted !== false
  );
  const hasAnyEnabledItems = hasEnabledTodos || hasEnabledCompletions;

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


  const handleUpdateCompletion = (index: number, field: keyof CompletedTodo | 'isCompleted', value: any) => {
    setEditableCompletions(prev => ({
      ...prev,
      [index]: {
        ...prev[index],
        [field]: value
      }
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
      className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -50, opacity: 0 }}
        className="bg-white rounded-[5px] shadow-xl max-w-2xl w-full h-[70vh] flex flex-col relative mx-2 md:mx-0"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Fixed Header */}
        <div className="flex items-center justify-between p-4 md:p-6 border-b border-[#E0DBD7] flex-shrink-0">
          <div className="flex items-center space-x-3">
            <div className="bg-blue-600 bg-opacity-10 rounded-full p-2">
              <Sparkles className="w-6 h-6 text-blue-600" />
            </div>
            <h5 className="h5 text-left text-lg md:text-xl">AI Analysis Complete!</h5>
          </div>
          <button
            onClick={onClose}
            className="text-[#7A7A7A] hover:text-[#332B42] p-1 rounded-full ml-auto"
            title="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
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
                            Updates to To-dos found ({results.completedTodos.length})
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
                    {/* Blue Info Banner - Inside accordion */}
                    <div className="mb-4">
                      <Banner
                        type="info"
                        message={
                          <div className="flex items-start gap-2">
                            <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                            <span>
                              We detected {results.completedTodos.length} to-do item{results.completedTodos.length !== 1 ? 's' : ''} that can be marked as complete!
                            </span>
                          </div>
                        }
                      />
                    </div>
                    
                    {results.completedTodos.map((_, index) => {
                      const completion = editableCompletions[index] || results.completedTodos[index];
                      
                      // Convert CompletedTodo to TodoItem format for UnifiedTodoItem
                      const todoItem: TodoItem = {
                        id: completion.id || `completion-${index}`,
                        name: completion.name,
                        deadline: completion.deadline,
                        note: completion.note,
                        category: completion.category,
                        listId: completion.listId || '',
                        isCompleted: (completion as any).isCompleted !== false, // Default to true, but allow toggling
                        createdAt: new Date(),
                        userId: user?.uid || '',
                        orderIndex: index
                      };

                      // Custom handlers that update our local state
                      const handleUpdateTaskName = async (todoId: string, newName: string | null) => {
                        if (newName) {
                          handleUpdateCompletion(index, 'name', newName);
                        }
                      };

                      const handleUpdateDeadline = (todoId: string, deadline: string | null) => {
                        handleUpdateCompletion(index, 'deadline', deadline ? new Date(deadline) : null);
                      };

                      const handleUpdateNote = (todoId: string, newNote: string | null) => {
                        handleUpdateCompletion(index, 'note', newNote);
                      };

                      const handleUpdateCategory = (todoId: string, newCategory: string | null) => {
                        handleUpdateCompletion(index, 'category', newCategory);
                      };

                      return (
                        <div key={index} className="relative">
                          {/* Use the actual TodoItem component */}
                          <UnifiedTodoItem
                            todo={todoItem}
                            contacts={[]}
                            allCategories={['Photographer', 'Caterer', 'Florist', 'DJ', 'Venue', 'Wedding Planner', 'Jewelry', 'timeline', 'logistics', 'vendor', 'payment', 'other']}
                            sortOption="myOrder"
                            draggedTodoId={null}
                            dragOverTodoId={null}
                            dropIndicatorPosition={{ id: null, position: null }}
                            currentUser={user}
                            handleToggleTodoComplete={() => {
                              // Allow toggling completion state
                              const updatedCompletion = { ...completion, isCompleted: !todoItem.isCompleted };
                              handleUpdateCompletion(index, 'isCompleted', updatedCompletion.isCompleted);
                            }}
                            handleUpdateTaskName={handleUpdateTaskName}
                            handleUpdateDeadline={handleUpdateDeadline}
                            handleUpdateNote={handleUpdateNote}
                            handleUpdateCategory={handleUpdateCategory}
                            handleCloneTodo={() => {}} // Disabled for completion items
                            handleDeleteTodo={() => {}} // Disabled for completion items
                            setTaskToMove={() => {}} // Disabled for completion items
                            setShowMoveTaskModal={() => {}} // Disabled for completion items
                            handleDragStart={() => {}} // Disabled for completion items
                            handleDragEnter={() => {}} // Disabled for completion items
                            handleDragLeave={() => {}} // Disabled for completion items
                            handleItemDragOver={() => {}} // Disabled for completion items
                            handleDragEnd={() => {}} // Disabled for completion items
                            handleDrop={() => {}} // Disabled for completion items
                            mode="page"
                            isJustMoved={false}
                            searchQuery=""
                          />
                          
                          {/* Source text overlay */}
                          <div className="absolute bottom-2 right-2 z-10 bg-white/90 px-2 py-1 rounded text-xs text-[#AB9C95] max-w-xs">
                            Source: {completion.sourceText}
                          </div>
                        </div>
                      );
                    })}
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

        {/* Fixed Footer */}
        <div className="border-t border-[#E0DBD7] p-4 md:p-6 flex-shrink-0">
          <div className="flex justify-end gap-3">
            {results?.aiTodoList && (
              <button
                onClick={() => onGenerateAITodoList(results.aiTodoList!)}
                className="btn-primaryinverse flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                Generate AI To-Do List (2 Credits)
              </button>
            )}
            <button
              onClick={onClose}
              className="btn-primaryinverse"
            >
              Close
            </button>
            <button
              onClick={() => {
                // Create all enabled new to-dos
                results.newTodos.forEach((todo, index) => {
                  if (createEnabledItems[index] !== false) {
                    handleCreateTodo(todo, index);
                  }
                });
                
                        // Mark only completions that are still in completed state
                        Object.values(editableCompletions).forEach((completion) => {
                          // Only process if the completion is still marked as completed (isCompleted !== false)
                          if ((completion as any).isCompleted !== false) {
                            onTodoComplete(completion);
                          }
                        });
              }}
              disabled={!hasAnyEnabledItems}
              className={`btn-primary flex items-center gap-2 ${
                !hasAnyEnabledItems ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              <CheckCircle className="w-4 h-4" />
              Submit
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
