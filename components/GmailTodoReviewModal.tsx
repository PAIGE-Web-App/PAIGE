import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit, CheckCircle, X, Calendar, Tag, Flag, Sparkles, Mail, ChevronDown, ChevronRight, FileText } from 'lucide-react';
import UnifiedTodoItem from './UnifiedTodoItem';
import type { TodoItem } from '../types/todo';
import { Contact } from '../types/contact';

interface DetectedTodo {
  id: string;
  name: string;
  note?: string;
  category: string | null; // Categories can be assigned by user
  deadline?: Date | string;
  sourceMessage: string;
  sourceContact: string;
  sourceEmail?: string;
  confidenceScore?: number;
}

interface GmailTodoReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (selectedTodos: {
    newTodos: DetectedTodo[];
    todoUpdates: any[];
    completedTodos: any[];
  }) => void;
  analysisResults: {
    newTodos: DetectedTodo[];
    todoUpdates: any[];
    completedTodos: any[];
    messagesAnalyzed: number;
  } | null;
  isAnalyzing?: boolean;
}

export default function GmailTodoReviewModal({
  isOpen,
  onClose,
  onConfirm,
  analysisResults,
  isAnalyzing = false
}: GmailTodoReviewModalProps) {
  const [selectedTodos, setSelectedTodos] = useState<Set<string>>(new Set());
  const [selectedUpdates, setSelectedUpdates] = useState<Set<string>>(new Set());
  const [selectedCompletions, setSelectedCompletions] = useState<Set<string>>(new Set());

  // Select all by default
  React.useEffect(() => {
    if (isOpen && analysisResults) {
      const allNewTodoIds = new Set(analysisResults.newTodos.map(todo => todo.id || Math.random().toString()));
      const allUpdateIds = new Set(analysisResults.todoUpdates.map(update => update.todoId));
      const allCompletionIds = new Set(analysisResults.completedTodos.map(completed => completed.todoId));
      
      setSelectedTodos(allNewTodoIds);
      setSelectedUpdates(allUpdateIds);
      setSelectedCompletions(allCompletionIds);
    }
  }, [isOpen, analysisResults]);

  const handleTodoToggle = (todoId: string) => {
    const newSelected = new Set(selectedTodos);
    if (newSelected.has(todoId)) {
      newSelected.delete(todoId);
    } else {
      newSelected.add(todoId);
    }
    setSelectedTodos(newSelected);
  };

  const handleUpdateToggle = (todoId: string) => {
    const newSelected = new Set(selectedUpdates);
    if (newSelected.has(todoId)) {
      newSelected.delete(todoId);
    } else {
      newSelected.add(todoId);
    }
    setSelectedUpdates(newSelected);
  };

  const handleCompletionToggle = (todoId: string) => {
    const newSelected = new Set(selectedCompletions);
    if (newSelected.has(todoId)) {
      newSelected.delete(todoId);
    } else {
      newSelected.add(todoId);
    }
    setSelectedCompletions(newSelected);
  };

  const handleConfirm = () => {
    const selectedNewTodos = analysisResults.newTodos.filter(todo => 
      selectedTodos.has(todo.id || Math.random().toString())
    );
    const selectedTodoUpdates = analysisResults.todoUpdates.filter(update => 
      selectedUpdates.has(update.todoId)
    );
    const selectedTodoCompletions = analysisResults.completedTodos.filter(completed => 
      selectedCompletions.has(completed.todoId)
    );

    onConfirm({
      newTodos: selectedNewTodos,
      todoUpdates: selectedTodoUpdates,
      completedTodos: selectedTodoCompletions
    });
  };

  const totalSelected = selectedTodos.size + selectedUpdates.size + selectedCompletions.size;

  // Show loading state while analyzing
  if (isAnalyzing) {
    return (
      <AnimatePresence>
        {isOpen && (
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
              className="bg-white rounded-[5px] shadow-xl max-w-md w-full mx-2 md:mx-0"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Fixed Header */}
              <div className="flex items-center justify-between p-4 md:p-6 border-b border-[#E0DBD7] flex-shrink-0">
                <div className="flex items-center space-x-3">
                  <div className="bg-blue-600 bg-opacity-10 rounded-full p-2">
                    <Mail className="w-6 h-6 text-blue-600" />
                  </div>
                  <h5 className="h5 text-left text-lg md:text-xl">Analyzing Messages</h5>
                </div>
                <button
                  onClick={onClose}
                  className="text-[#7A7A7A] hover:text-[#332B42] p-1 rounded-full ml-auto"
                  title="Close"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Content */}
              <div className="p-8 text-center">
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mb-4"></div>
                  <p className="text-sm text-gray-600 mb-4">AI is scanning your Gmail messages for actionable items...</p>
                  
                  {/* Purple progress bar */}
                  <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                    <div className="h-2 bg-purple-600 rounded-full animate-pulse" style={{ width: '60%' }}></div>
                  </div>
                  <p className="text-xs text-gray-500">This may take a few moments</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  if (!analysisResults) return null;

  return (
    <AnimatePresence>
      {isOpen && (
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
                  <Mail className="w-6 h-6 text-blue-600" />
                </div>
                <h5 className="h5 text-left text-lg md:text-xl">Messages Analyzed</h5>
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
              {/* New Todos Section */}
              {analysisResults.newTodos.length > 0 && (
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Plus className="w-4 h-4 text-green-600" />
                    <h6 className="font-medium text-[#332B42]">New Todo Suggestions ({analysisResults.newTodos.length})</h6>
                  </div>
                  <div className="space-y-3">
                    {analysisResults.newTodos.map((todo, index) => {
                      const todoId = todo.id || `todo-${index}`;
                      const isSelected = selectedTodos.has(todoId);
                      
                      // Convert DetectedTodo to TodoItem format
                      const todoItem: TodoItem = {
                        id: todoId,
                        name: todo.name,
                        note: todo.note || null,
                        category: null, // No category assigned for Gmail-generated todos
                        deadline: todo.deadline ? new Date(todo.deadline) : null,
                        isCompleted: false,
                        userId: 'gmail-import', // Placeholder
                        createdAt: new Date(),
                        orderIndex: index,
                        listId: 'gmail-import', // Placeholder
                      };
                      
                      return (
                        <div key={todoId} className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleTodoToggle(todoId)}
                            className="mt-1 w-3.5 h-3.5 text-[#805d93] border-gray-300 rounded focus:ring-[#805d93] flex-shrink-0 cursor-pointer"
                          />
                          <div className="flex-1">
                            <UnifiedTodoItem
                              todo={todoItem}
                              contacts={[]}
                              allCategories={[]}
                              sortOption="myOrder"
                              draggedTodoId={null}
                              dragOverTodoId={null}
                              dropIndicatorPosition={{ id: null, position: null }}
                              currentUser={null}
                              handleToggleTodoComplete={() => {}}
                              handleUpdateTaskName={async () => {}}
                              handleUpdateDeadline={() => {}}
                              handleUpdateNote={() => {}}
                              handleUpdateCategory={() => {}}
                              handleCloneTodo={() => {}}
                              handleDeleteTodo={() => {}}
                              setTaskToMove={() => {}}
                              setShowMoveTaskModal={() => {}}
                              handleDragStart={() => {}}
                              handleDragEnter={() => {}}
                              handleDragLeave={() => {}}
                              handleItemDragOver={() => {}}
                              handleDragEnd={() => {}}
                              handleDrop={() => {}}
                              mode="editor"
                              // Remove pointer-events-none to allow editing
                            />
                            
                            {/* Reference Accordion */}
                            <div className="mt-3 border-t border-gray-200 pt-3">
                              <ReferenceAccordion
                                sourceMessage={todo.sourceMessage}
                                sourceContact={todo.sourceContact}
                                sourceEmail={todo.sourceEmail}
                                confidenceScore={todo.confidenceScore}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Todo Updates Section */}
              {analysisResults.todoUpdates.length > 0 && (
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Edit className="w-4 h-4 text-blue-600" />
                    <h6 className="font-medium text-[#332B42]">Todo Updates ({analysisResults.todoUpdates.length})</h6>
                  </div>
                  <div className="space-y-3">
                    {analysisResults.todoUpdates.map((update, index) => {
                      const isSelected = selectedUpdates.has(update.todoId);
                      
                      return (
                        <div key={update.todoId} className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleUpdateToggle(update.todoId)}
                            className="mt-1 w-3.5 h-3.5 text-[#805d93] border-gray-300 rounded focus:ring-[#805d93] flex-shrink-0 cursor-pointer"
                          />
                          <div className="flex-1">
                            <div className="font-semibold text-[#332B42] mb-2 flex items-center gap-2">
                              <span>{update.existingTodoName || `Todo ID: ${update.todoId}`}</span>
                              <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">Will update</span>
                            </div>
                            
                            {/* Show what will be updated */}
                            <div className="space-y-2 text-sm">
                              {update.updates.note && (
                                <div className="flex items-start gap-2">
                                  <FileText className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                                  <div className="text-gray-600">{update.updates.note}</div>
                                </div>
                              )}
                              
                              {update.updates.deadline && (
                                <div className="flex items-center gap-2">
                                  <Calendar className="w-4 h-4 text-gray-400" />
                                  <div className="text-gray-600">{new Date(update.updates.deadline).toLocaleDateString()}</div>
                                </div>
                              )}
                            </div>
                            
                            {/* Reference/Confidence */}
                            {update.confidenceScore && (
                              <div className="mt-3 pt-3 border-t border-gray-200">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-medium text-gray-500">Reference</span>
                                  <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full">
                                    {Math.round(update.confidenceScore * 100)}% confidence
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Completed Todos Section */}
              {analysisResults.completedTodos.length > 0 && (
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-4">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <h6 className="font-medium text-[#332B42]">Mark as Completed ({analysisResults.completedTodos.length})</h6>
                  </div>
                  <div className="space-y-3">
                    {analysisResults.completedTodos.map((completed, index) => {
                      const isSelected = selectedCompletions.has(completed.todoId);
                      
                      return (
                        <div key={completed.todoId} className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleCompletionToggle(completed.todoId)}
                            className="mt-1 w-3.5 h-3.5 text-[#805d93] border-gray-300 rounded focus:ring-[#805d93] flex-shrink-0 cursor-pointer"
                          />
                          <div className="flex-1">
                            <div className="font-semibold text-[#332B42] mb-2 flex items-center gap-2">
                              <span>{completed.existingTodoName || `Todo ID: ${completed.todoId}`}</span>
                              <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full">Will complete</span>
                            </div>
                            
                            {/* Completion reason */}
                            <div className="flex items-start gap-2 text-sm">
                              <CheckCircle className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                              <div className="text-gray-600">{completed.completionReason}</div>
                            </div>
                            
                            {/* Reference/Confidence */}
                            {completed.confidenceScore && (
                              <div className="mt-3 pt-3 border-t border-gray-200">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-medium text-gray-500">Reference</span>
                                  <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full">
                                    {Math.round(completed.confidenceScore * 100)}% confidence
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {totalSelected === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Mail className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No items selected for processing</p>
                </div>
              )}
            </div>

            {/* Fixed Footer */}
            <div className="border-t border-[#E0DBD7] p-4 md:p-6 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  {totalSelected} item{totalSelected !== 1 ? 's' : ''} selected
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={onClose}
                    className="btn-primaryinverse"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirm}
                    disabled={totalSelected === 0}
                    className={`btn-primary flex items-center gap-2 ${
                      totalSelected === 0 ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    <Plus className="w-4 h-4" />
                    Apply {totalSelected} Change{totalSelected !== 1 ? 's' : ''}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Reference Accordion Component
interface ReferenceAccordionProps {
  sourceMessage: string;
  sourceContact: string;
  sourceEmail?: string;
  confidenceScore?: number;
}

function ReferenceAccordion({ sourceMessage, sourceContact, sourceEmail, confidenceScore }: ReferenceAccordionProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="bg-gray-50 rounded-lg border border-gray-200">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-3 text-left hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-gray-600" />
          <span className="text-sm font-medium text-gray-700">Reference</span>
          {confidenceScore && (
            <span className={`text-xs px-2 py-1 rounded-full ${
              confidenceScore >= 0.8 ? 'bg-green-100 text-green-800' :
              confidenceScore >= 0.6 ? 'bg-yellow-100 text-yellow-800' :
              'bg-red-100 text-red-800'
            }`}>
              {Math.round(confidenceScore * 100)}% confidence
            </span>
          )}
        </div>
        {isExpanded ? (
          <ChevronDown className="w-4 h-4 text-gray-500" />
        ) : (
          <ChevronRight className="w-4 h-4 text-gray-500" />
        )}
      </button>
      
      {isExpanded && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="border-t border-gray-200"
        >
          <div className="p-3 space-y-3">
            <div>
              <h4 className="text-xs font-medium text-gray-700 mb-1">Source Message</h4>
              <p className="text-xs text-gray-600 bg-white p-2 rounded border font-work">
                {sourceMessage}
              </p>
            </div>
            
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <div className="flex items-center gap-1">
                <Mail className="w-3 h-3" />
                <span>From: {sourceContact}</span>
              </div>
              {sourceEmail && (
                <div className="flex items-center gap-1">
                  <span>Email: {sourceEmail}</span>
                </div>
              )}
            </div>
            
            {confidenceScore && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">AI Confidence:</span>
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-300 ${
                      confidenceScore >= 0.8 ? 'bg-green-500' :
                      confidenceScore >= 0.6 ? 'bg-yellow-500' :
                      'bg-red-500'
                    }`}
                    style={{ width: `${confidenceScore * 100}%` }}
                  />
                </div>
                <span className="text-xs text-gray-500">
                  {Math.round(confidenceScore * 100)}%
                </span>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}
