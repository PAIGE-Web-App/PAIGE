/**
 * Paige Contextual Assistant
 * Main component that orchestrates all Paige functionality
 * Refactored to use extracted components and hooks for better maintainability
 */

"use client";

import React, { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { MessageCircle, Send, Zap, X } from 'lucide-react';
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
  const [isVisible, setIsVisible] = useState(true);
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

  // Extract insights generation
  const {
    currentInsights,
    dismissInsight
  } = usePaigeInsights({
    context,
    currentData,
    todoComputations,
    userId: user?.uid,
    handleAddDeadlines
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
      className={`bg-white rounded-lg shadow-lg border border-gray-200 font-work ${className}`}
      style={{ width: isChatOpen ? '420px' : '360px' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-pink-50 rounded-t-lg">
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
            <span className="text-white text-xs">✨</span>
          </div>
          <h3 className="text-sm font-semibold text-gray-800">Paige</h3>
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
          <div className="max-h-96 overflow-y-auto space-y-3 mb-3">
            {currentInsights.map((insight, index) => (
              <PaigeInsightCard
                key={insight.id}
                insight={insight}
                index={index}
                onDismiss={dismissInsight}
              />
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
            <div className="max-h-80 overflow-y-auto space-y-2">
              {chatMessages.length === 0 && (
                <div className="text-xs text-gray-500 text-center py-2">
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

            {/* Chat Input */}
            <div className="flex space-x-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Ask Paige..."
                className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-purple-500"
                disabled={isLoading}
              />
              <button
                onClick={handleSendMessage}
                disabled={!chatInput.trim() || isLoading}
                className="px-2 py-1 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50 text-xs"
              >
                <Send className="w-3 h-3" />
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
    prevProps.currentData?.selectedListId === nextProps.currentData?.selectedListId &&
    prevProps.currentData?.todoItems?.length === nextProps.currentData?.todoItems?.length &&
    prevProps.currentData?.daysUntilWedding === nextProps.currentData?.daysUntilWedding &&
    prevProps.currentData?.overdueTasks === nextProps.currentData?.overdueTasks &&
    prevProps.currentData?.upcomingDeadlines === nextProps.currentData?.upcomingDeadlines &&
    prevProps.currentData?.weddingLocation === nextProps.currentData?.weddingLocation
  );
});

// Display name for React DevTools
PaigeContextualAssistant.displayName = 'PaigeContextualAssistant';

export default PaigeContextualAssistant;

