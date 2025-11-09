/**
 * Paige Contextual Assistant
 * Main component that orchestrates all Paige functionality
 * Refactored to use extracted components and hooks for better maintainability
 */

"use client";

import React, { useState, useMemo, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { MessageCircle, Send, Zap, X, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { PaigeContextualAssistantProps } from '@/types/paige';

// Extracted components
import PaigeFloatingButton from './paige/PaigeFloatingButton';
import PaigeInsightCard from './paige/PaigeInsightCard';
import PaigeChatMessage from './paige/PaigeChatMessage';

// Extracted hooks
import { usePaigeActions } from './paige/hooks/usePaigeActions';
import { usePaigeChatLogic } from './paige/hooks/usePaigeChatLogic';
import { usePaigeInsights } from './paige/hooks/usePaigeInsights';

// Memoized component to prevent unnecessary re-renders
const PaigeContextualAssistant = React.memo(function PaigeContextualAssistant({ 
  context = 'todo', 
  currentData,
  className = ""
}: PaigeContextualAssistantProps) {
  const { user } = useAuth();
  // Default to collapsed on mobile, expanded on desktop
  const [isVisible, setIsVisible] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 1024; // lg breakpoint
    }
    return true;
  });
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);

  // Memoize expensive todo computations to prevent re-calculations
  const todoComputations = useMemo(() => {
    const allTodoItems = currentData?.todoItems || [];
    const selectedList = currentData?.selectedList;
    const selectedListId = currentData?.selectedListId;
    const isSpecificList = selectedList && selectedList !== 'All To-Do Items' && selectedList !== 'Completed To-Do Items';
    
    let relevantTodos = allTodoItems;
    if (isSpecificList && selectedListId) {
      relevantTodos = allTodoItems.filter(todo => todo.listId === selectedListId);
    }
    
    const incompleteTodos = relevantTodos.filter(todo => !todo.isCompleted);
    const todosWithoutDeadlines = incompleteTodos.filter(todo => !todo.deadline);
    const totalTodos = incompleteTodos.length;
    
    return {
      allTodoItems,
      selectedList,
      selectedListId,
      isSpecificList,
      relevantTodos,
      incompleteTodos,
      todosWithoutDeadlines,
      totalTodos,
      daysUntilWedding: currentData?.daysUntilWedding || 365
    };
  }, [
    currentData?.todoItems,
    currentData?.selectedList,
    currentData?.selectedListId,
    currentData?.daysUntilWedding
  ]);

  // Extract todo manipulation actions
  const { handleAddDeadlines, handleTodoAction } = usePaigeActions();

  // Extract chat logic
  const {
    chatMessages,
    chatInput,
    setChatInput,
    isLoading,
    chatMessagesEndRef,
    formatChatMessage,
    handleSendMessage
  } = usePaigeChatLogic({
    context,
    currentData,
    handleTodoAction
  });

  // Memoize openChatWithMessage to prevent infinite loops
  const openChatWithMessage = useCallback((message: string) => {
    setIsChatOpen(true);
    setShowSuggestions(false);
    setChatInput(message);
    // Auto-send after state updates
    setTimeout(() => {
      handleSendMessage();
    }, 100);
  }, [setChatInput, handleSendMessage]);

  // Extract insights generation
  const {
    currentInsights,
    dismissInsight
  } = usePaigeInsights({
    context,
    currentData,
    todoComputations,
    userId: user?.uid,
    handleAddDeadlines,
    openChatWithMessage
  });

  // Show minimized floating button
  if (!user?.uid || !isVisible) {
    return (
      <PaigeFloatingButton
        suggestionCount={currentInsights.length}
        onClick={() => setIsVisible(true)}
      />
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`fixed bottom-24 left-4 right-4 lg:bottom-12 lg:right-12 lg:left-auto z-30 bg-white rounded-lg shadow-lg border border-gray-200 font-work lg:w-[360px] ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-pink-50 rounded-t-lg">
        <div className="flex items-center space-x-2">
          <Sparkles className="w-4 h-4 text-purple-500" />
          <h3 className="text-sm font-semibold text-gray-800">Paige</h3>
          <span className="px-2 text-[10px] font-medium bg-gradient-to-br from-purple-500 to-pink-500 text-white rounded-full">
            New
          </span>
        </div>
        <div className="flex items-center space-x-1">
          <button
            onClick={() => {
              if (!showSuggestions) {
                setShowSuggestions(true);
                setIsChatOpen(false);
              }
            }}
            className={`p-1.5 hover:bg-white/50 rounded transition-colors ${showSuggestions ? 'bg-white/30' : ''}`}
            title="Show suggestions"
          >
            <Zap className={`w-4 h-4 ${showSuggestions ? 'text-purple-600' : 'text-gray-600'}`} />
          </button>
          <button
            onClick={() => {
              if (!isChatOpen) {
                setIsChatOpen(true);
                setShowSuggestions(false);
              }
            }}
            className={`p-1.5 hover:bg-white/50 rounded transition-colors ${isChatOpen ? 'bg-white/30' : ''}`}
            title="Chat with Paige"
          >
            <MessageCircle className={`w-4 h-4 ${isChatOpen ? 'text-purple-600' : 'text-gray-600'}`} />
          </button>
          <button
            onClick={() => setIsVisible(false)}
            className="p-1.5 hover:bg-white/50 rounded transition-colors"
            title="Close"
          >
            <X className="w-4 h-4 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-3">
        {/* Show multiple insights if available and suggestions are shown */}
        {showSuggestions && currentInsights.length > 0 && (
          <div className="max-h-96 overflow-y-auto mb-3">
            {currentInsights.map((insight, index) => (
              <div key={insight.id}>
                <PaigeInsightCard
                  insight={insight}
                  index={index}
                  onDismiss={dismissInsight}
                />
                {/* Divider between suggestions (except last) */}
                {index < currentInsights.length - 1 && (
                  <div className="border-b border-gray-100 my-4" />
                )}
              </div>
            ))}
          </div>
        )}

        {/* Show chat interface when open */}
        {isChatOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-3"
          >
            {/* Chat Messages */}
            <div className={`overflow-y-auto space-y-2 ${chatMessages.length === 0 ? 'min-h-60' : 'max-h-80'}`}>
              {chatMessages.length === 0 && (
                <div className="text-[13px] text-gray-500 text-center py-8">
                  Hi! Ask me anything about your wedding planning! 💜
                </div>
              )}
              {chatMessages.map((message, index) => (
                <PaigeChatMessage
                  key={index}
                  message={message}
                  index={index}
                  formatMessage={formatChatMessage}
                />
              ))}
              {/* Scroll target */}
              <div ref={chatMessagesEndRef} />
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 rounded-lg px-2 py-1">
                    <div className="flex space-x-1">
                      <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Contextual Quick Actions - Only show when no messages */}
            {chatMessages.length === 0 && (
              <div className="flex flex-wrap gap-2 mb-2 justify-end">
                {context === 'todo' && (
                  <>
                    <button
                      onClick={() => setChatInput('Suggest more to-do items for this list')}
                      className="px-2 py-1 text-xs bg-purple-50 text-purple-700 rounded-full hover:bg-purple-100 transition-colors border border-purple-200"
                    >
                      Suggest to-dos
                    </button>
                    <button
                      onClick={() => setChatInput('Add deadlines to my tasks')}
                      className="px-2 py-1 text-xs bg-purple-50 text-purple-700 rounded-full hover:bg-purple-100 transition-colors border border-purple-200"
                    >
                      Add deadlines
                    </button>
                    <button
                      onClick={() => setChatInput('Help me prioritize my tasks')}
                      className="px-2 py-1 text-xs bg-purple-50 text-purple-700 rounded-full hover:bg-purple-100 transition-colors border border-purple-200"
                    >
                      Prioritize tasks
                    </button>
                  </>
                )}
                {context === 'budget' && (
                  <>
                    <button
                      onClick={() => setChatInput('Review my budget allocation')}
                      className="px-2 py-1 text-xs bg-purple-50 text-purple-700 rounded-full hover:bg-purple-100 transition-colors border border-purple-200"
                    >
                      Review budget
                    </button>
                    <button
                      onClick={() => setChatInput('Am I overspending anywhere?')}
                      className="px-2 py-1 text-xs bg-purple-50 text-purple-700 rounded-full hover:bg-purple-100 transition-colors border border-purple-200"
                    >
                      Check spending
                    </button>
                  </>
                )}
                {context === 'dashboard' && (
                  <>
                    <button
                      onClick={() => setChatInput('What should I focus on today?')}
                      className="px-2 py-1 text-xs bg-purple-50 text-purple-700 rounded-full hover:bg-purple-100 transition-colors border border-purple-200"
                    >
                      What's next?
                    </button>
                    <button
                      onClick={() => setChatInput('Show my overall progress')}
                      className="px-2 py-1 text-xs bg-purple-50 text-purple-700 rounded-full hover:bg-purple-100 transition-colors border border-purple-200"
                    >
                      My progress
                    </button>
                    {(!currentData?.hasBudget && currentData?.totalTasks > 0) && (
                      <button
                        onClick={() => window.location.href = '/budget'}
                        className="px-2 py-1 text-xs bg-purple-50 text-purple-700 rounded-full hover:bg-purple-100 transition-colors border border-purple-200"
                      >
                        Create budget
                      </button>
                    )}
                    {(currentData?.totalTasks === 0 && currentData?.hasBudget) && (
                      <button
                        onClick={() => window.location.href = '/todo'}
                        className="px-2 py-1 text-xs bg-purple-50 text-purple-700 rounded-full hover:bg-purple-100 transition-colors border border-purple-200"
                      >
                        Create to-dos
                      </button>
                    )}
                    {(currentData?.totalTasks > 0 && currentData?.hasBudget) && (
                      <button
                        onClick={() => setChatInput('Help me sync my budget and to-do list')}
                        className="px-2 py-1 text-xs bg-purple-50 text-purple-700 rounded-full hover:bg-purple-100 transition-colors border border-purple-200"
                      >
                        Sync planning
                      </button>
                    )}
                  </>
                )}
                {context === 'timeline' && (
                  <>
                    <button
                      onClick={() => setChatInput('Check for timing conflicts')}
                      className="px-2 py-1 text-xs bg-purple-50 text-purple-700 rounded-full hover:bg-purple-100 transition-colors border border-purple-200"
                    >
                      Check conflicts
                    </button>
                    <button
                      onClick={() => setChatInput('Suggest vendor arrival times')}
                      className="px-2 py-1 text-xs bg-purple-50 text-purple-700 rounded-full hover:bg-purple-100 transition-colors border border-purple-200"
                    >
                      Vendor timing
                    </button>
                    <button
                      onClick={() => setChatInput('Optimize my timeline flow')}
                      className="px-2 py-1 text-xs bg-purple-50 text-purple-700 rounded-full hover:bg-purple-100 transition-colors border border-purple-200"
                    >
                      Optimize flow
                    </button>
                  </>
                )}
              </div>
            )}

            {/* Chat Input */}
            <div className="flex space-x-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Ask Paige..."
                className="flex-1 px-2 py-1.5 text-[13px] border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-purple-500"
                disabled={isLoading}
              />
              <button
                onClick={handleSendMessage}
                disabled={!chatInput.trim() || isLoading}
                className="px-2 py-1.5 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50"
                aria-label="Send message"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}

        {/* Show hint when appropriate */}
        {!showSuggestions && !isChatOpen && (
          <div className="text-xs text-gray-500 text-center py-2">
            Click ⚡ for suggestions or 💬 to chat with me!
          </div>
        )}
        {showSuggestions && currentInsights.length === 0 && (
          <div className="text-xs text-gray-500 text-center py-2">
            No suggestions right now. Click 💬 to switch to chat!
          </div>
        )}
      </div>
    </motion.div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function - only re-render if these specific values change
  return (
    prevProps.context === nextProps.context &&
    prevProps.className === nextProps.className &&
    // Todo context
    prevProps.currentData?.selectedListId === nextProps.currentData?.selectedListId &&
    prevProps.currentData?.todoItems?.length === nextProps.currentData?.todoItems?.length &&
    // Messages context ✨
    prevProps.currentData?.selectedContact?.id === nextProps.currentData?.selectedContact?.id &&
    prevProps.currentData?.totalContacts === nextProps.currentData?.totalContacts &&
    // Shared context
    prevProps.currentData?.daysUntilWedding === nextProps.currentData?.daysUntilWedding &&
    prevProps.currentData?.overdueTasks === nextProps.currentData?.overdueTasks &&
    prevProps.currentData?.upcomingDeadlines === nextProps.currentData?.upcomingDeadlines &&
    prevProps.currentData?.weddingLocation === nextProps.currentData?.weddingLocation &&
    prevProps.currentData?.todoItems?.length === nextProps.currentData?.todoItems?.length &&
    prevProps.currentData?.budgetItems?.length === nextProps.currentData?.budgetItems?.length &&
    prevProps.currentData?.timelineData?.length === nextProps.currentData?.timelineData?.length
  );
});

// Display name for React DevTools
PaigeContextualAssistant.displayName = 'PaigeContextualAssistant';

export default PaigeContextualAssistant;

