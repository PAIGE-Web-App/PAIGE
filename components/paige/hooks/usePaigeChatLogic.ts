/**
 * usePaigeChatLogic Hook
 * Handles chat state, message sending, local commands, and formatting
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { PaigeChatMessage, PaigeCurrentData, PaigeContext } from '@/types/paige';

export interface UsePaigeChatLogicProps {
  context: PaigeContext;
  currentData?: PaigeCurrentData;
  handleTodoAction: (action: any) => Promise<void>;
}

export interface UsePaigeChatLogicReturn {
  chatMessages: PaigeChatMessage[];
  setChatMessages: React.Dispatch<React.SetStateAction<PaigeChatMessage[]>>;
  chatInput: string;
  setChatInput: React.Dispatch<React.SetStateAction<string>>;
  isLoading: boolean;
  chatMessagesEndRef: React.RefObject<HTMLDivElement>;
  formatChatMessage: (content: string) => string;
  handleSendMessage: () => Promise<void>;
}

export function usePaigeChatLogic({
  context,
  currentData,
  handleTodoAction
}: UsePaigeChatLogicProps): UsePaigeChatLogicReturn {
  const [chatMessages, setChatMessages] = useState<PaigeChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatMessagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat to bottom when messages change
  useEffect(() => {
    if (chatMessagesEndRef.current) {
      chatMessagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages]);

  // Memoized format function for chat messages
  const formatChatMessage = useCallback((content: string) => {
    return content
      // Format numbered lists
      .replace(/(\d+\.\s\*\*[^*]+\*\*[^]*?)(?=\d+\.\s\*\*|\n\n|$)/g, '<div class="mb-2">$1</div>')
      // Format bold text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      // Format line breaks
      .replace(/\n/g, '<br>')
      // Format emojis to be slightly larger
      .replace(/([\u{1F300}-\u{1F9FF}])/gu, '<span class="text-sm">$1</span>');
  }, []);

  // Handle local commands without API calls
  const handleLocalCommands = useCallback(async (message: string): Promise<boolean> => {
    const lowerMessage = message.toLowerCase();
    const incompleteTodos = currentData?.todoItems?.filter(todo => !todo.isCompleted) || [];
    const todosWithoutDeadlines = incompleteTodos.filter(todo => !todo.deadline);
    const daysUntilWedding = currentData?.daysUntilWedding || 365;

    // Handle "add deadlines" command
    if (lowerMessage.includes('add deadline') || lowerMessage === 'sure' || lowerMessage === 'yes') {
      if (todosWithoutDeadlines.length > 0) {
        setChatMessages(prev => [...prev, {
          role: 'assistant',
          content: `Perfect! I'll add smart deadlines to your tasks. Here's what I'm setting:\n\n${todosWithoutDeadlines.slice(0, 5).map((todo, index) => {
            const urgencyDays = Math.max(7, Math.floor(daysUntilWedding * (0.8 - (index * 0.15))));
            const deadline = new Date();
            deadline.setDate(deadline.getDate() + urgencyDays);
            
            // Trigger the deadline addition
            setTimeout(() => {
              console.log('🎯 Paige dispatching deadline event:', { todoId: todo.id, deadline: deadline.toISOString().split('T')[0] });
              window.dispatchEvent(new CustomEvent('paige-add-deadline', { 
                detail: { 
                  todoId: todo.id, 
                  deadline: deadline.toISOString().split('T')[0]
                } 
              }));
            }, index * 500); // Stagger the updates
            
            return `• **${todo.name}** - ${deadline.toLocaleDateString()}`;
          }).join('\n')}\n\nDeadlines added! This should help keep you organized and reduce stress. 📅✨`
        }]);
        return true;
      }
    }

    // Handle reorder request
    if (lowerMessage.includes('reorder') || lowerMessage.includes('prioritize') || lowerMessage.includes('organize')) {
      setChatMessages(prev => [...prev, {
        role: 'assistant',
        content: `I'd love to help you reorder your tasks! Based on your wedding timeline (${daysUntilWedding} days away), here's my suggested priority order:\n\n${incompleteTodos.slice(0, 6).map((todo, index) => {
          return `${index + 1}. **${todo.name}**`;
        }).join('\n')}\n\nWould you like me to apply this order? Just say "apply order" and I'll reorganize your list! 🎯`
      }]);
      return true;
    }

    // Handle apply order command
    if (lowerMessage.includes('apply order') || lowerMessage.includes('apply')) {
      const todoIds = incompleteTodos.map(todo => todo.id);
      window.dispatchEvent(new CustomEvent('paige-reorder-todos', { 
        detail: { newOrder: todoIds } 
      }));
      
      setChatMessages(prev => [...prev, {
        role: 'assistant',
        content: `Done! I've reordered your tasks based on priority and your wedding timeline. The most important tasks are now at the top of your list. 🎉\n\nIs there anything else you'd like me to help you organize?`
      }]);
      return true;
    }

    return false; // Not a local command, proceed with API
  }, [currentData?.todoItems, currentData?.daysUntilWedding]);

  // Memoized handle send message function
  const handleSendMessage = useCallback(async () => {
    if (!chatInput.trim() || isLoading) return;

    const userMessage = { role: 'user' as const, content: chatInput.trim() };
    setChatMessages(prev => [...prev, userMessage]);
    const messageContent = chatInput.trim();
    setChatInput('');
    setIsLoading(true);

    // Handle local commands first
    if (await handleLocalCommands(messageContent)) {
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/chat/paige', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage.content,
          context: {
            page: context,
            data: currentData,
            conversationHistory: chatMessages.slice(-6), // Send last 6 messages for context
            capabilities: {
              canManipulateTodos: true,
              canReorderTodos: true,
              canUpdateTodos: true,
              canCompleteTodos: true
            }
          }
        }),
      });

      if (!response.ok) throw new Error('Failed to get response');
      const data = await response.json();
      
      // Handle any todo actions returned by the API
      if (data.actions && Array.isArray(data.actions)) {
        for (const action of data.actions) {
          await handleTodoAction(action);
        }
      }

      const assistantMessage = {
        role: 'assistant' as const,
        content: data.response || "I'm here to help with your wedding planning!"
      };
      setChatMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      setChatMessages(prev => [...prev, { 
        role: 'assistant' as const, 
        content: "Sorry, I'm having trouble right now. Try asking about your todos or wedding planning!"
      }]);
    } finally {
      setIsLoading(false);
    }
  }, [chatInput, isLoading, handleLocalCommands, chatMessages, context, currentData, handleTodoAction]);

  return {
    chatMessages,
    setChatMessages,
    chatInput,
    setChatInput,
    isLoading,
    chatMessagesEndRef,
    formatChatMessage,
    handleSendMessage
  };
}

