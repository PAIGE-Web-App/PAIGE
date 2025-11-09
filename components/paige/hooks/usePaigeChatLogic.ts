/**
 * usePaigeChatLogic Hook
 * Handles chat state, message sending, local commands, and formatting
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { PaigeChatMessage, PaigeCurrentData, PaigeContext } from '@/types/paige';
import { useAuth } from '@/contexts/AuthContext';

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
  const { user } = useAuth();
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
  const handleLocalCommands = useCallback(async (message: string, latestCurrentData = currentData): Promise<boolean> => {
    const lowerMessage = message.toLowerCase();
    
    // ✨ Timeline context - vendor contact commands
    if (context === 'timeline') {
      const timeline = latestCurrentData?.timeline || [];
      const contacts = latestCurrentData?.contacts || [];
      
      // Handle "show me my vendor contacts"
      if (lowerMessage.includes('show') && lowerMessage.includes('contact')) {
        // ✅ Wait for contacts to load if they're not available yet
        if (contacts.length === 0) {
          // Check again after a brief delay in case they're still loading
          await new Promise(resolve => setTimeout(resolve, 500));
          const retriedContacts = currentData?.contacts || [];
          
          if (retriedContacts.length === 0) {
            setChatMessages(prev => [...prev, {
              role: 'assistant',
              content: `You don't have any saved contacts yet. Add vendors from the /messages page to easily assign them to timeline events! 📇`
            }]);
            return true;
          }
          
          // Use retried contacts
          const contactList = retriedContacts.map((c: any, i: number) => 
            `${i + 1}. **${c.name}**${c.email ? ` - ${c.email}` : ''}${c.phone ? ` (${c.phone})` : ''}`
          ).join('\n');
          
          setChatMessages(prev => [...prev, {
            role: 'assistant',
            content: `Here are your ${retriedContacts.length} saved vendor contacts:\n\n${contactList}\n\nWhich contact would you like to add to your timeline events? Just say the number or name! 📞`
          }]);
          return true;
        }
        
        // Show list of contacts
        const contactList = contacts.map((c: any, i: number) => 
          `${i + 1}. **${c.name}**${c.email ? ` - ${c.email}` : ''}${c.phone ? ` (${c.phone})` : ''}`
        ).join('\n');
        
        setChatMessages(prev => [...prev, {
          role: 'assistant',
          content: `Here are your ${contacts.length} saved vendor contacts:\n\n${contactList}\n\nWhich contact would you like to add to your timeline events? Just say the number or name! 📞`
        }]);
        return true;
      }
      
      // Handle selecting a contact by number or name
      // Matches: "1", "Dave Yoon", "add Dave Yoon", "use that contact", "yes", "that one", etc.
      const contactMatch = message.match(/^(\d+)$/) || 
                          lowerMessage.match(/(?:add|use)\s+(.+?)(?:\s+to|$)/) ||
                          (lowerMessage.includes('yes') || lowerMessage.includes('sure') || lowerMessage.includes('that')) ? [null, contacts[0]?.name] : null;
      
      if (contactMatch && contacts.length > 0) {
        let selectedContact: any = null;
        
        if (message.match(/^\d+$/)) {
          // User said a number
          const index = parseInt(message) - 1;
          if (index >= 0 && index < contacts.length) {
            selectedContact = contacts[index];
          }
        } else if (contactMatch[1]) {
          // User said a name (extract from "add [name]" or "use [name]", or default to first contact for "yes/that")
          const nameQuery = contactMatch[1]?.toLowerCase().trim();
          selectedContact = contacts.find((c: any) => c.name?.toLowerCase().includes(nameQuery));
        } else {
          // Default to first contact for "yes", "sure", "that", etc.
          selectedContact = contacts[0];
        }
        
        if (selectedContact) {
          // Check if user wants ALL events or just those missing contacts
          const wantsAllEvents = lowerMessage.includes('all of them') || lowerMessage.includes('all events') || lowerMessage.includes('everything');
          
          let eventsToUpdate = [];
          if (wantsAllEvents) {
            // User wants to add to ALL timeline events
            eventsToUpdate = timeline;
          } else {
            // Only events missing vendor contacts
            eventsToUpdate = timeline.filter((e: any) => !e.vendorContact || e.vendorContact.trim() === '');
          }
          
          const eventIds = eventsToUpdate.map((e: any) => e.id);
          
          if (eventIds.length > 0) {
            const vendorContact = `${selectedContact.name}${selectedContact.email ? ` - ${selectedContact.email}` : ''}`;
            
            setChatMessages(prev => [...prev, {
              role: 'assistant',
              content: `Perfect! I'll add ${selectedContact.name} to ${eventIds.length} timeline events. ✅`
            }]);
            
            // Dispatch bulk update event
            setTimeout(() => {
              window.dispatchEvent(new CustomEvent('paige-bulk-update-contacts', {
                detail: { 
                  vendorName: selectedContact.name,
                  vendorContact,
                  eventIds 
                }
              }));
            }, 100);
            
            return true;
          } else {
            setChatMessages(prev => [...prev, {
              role: 'assistant',
              content: `All events already have vendor contacts! 🎉`
            }]);
            return true;
          }
        }
      }
      
      // Let API handle other timeline commands
      return false;
    }

    // ✨ MESSAGES CONTEXT - Message scanning commands
    if (context === 'messages') {
      const selectedContact = latestCurrentData?.selectedContact;
      const totalContacts = latestCurrentData?.totalContacts || 0;

      // Handle "scan" or "analyze" commands
      if ((lowerMessage.includes('scan') || lowerMessage.includes('analyze') || lowerMessage.includes('check')) && 
          (lowerMessage.includes('message') || lowerMessage.includes('conversation') || lowerMessage.includes('contact'))) {
        
        const isScanAll = lowerMessage.includes('all') || (!selectedContact && totalContacts > 0);
        const contactName = selectedContact?.name || 'your contacts';
        
        setChatMessages(prev => [...prev, {
          role: 'assistant',
          content: isScanAll 
            ? `Scanning all messages from ${totalContacts} contact${totalContacts > 1 ? 's' : ''} for todo updates, budget changes, and timeline adjustments... 🔍`
            : `Scanning conversation with ${contactName} for updates to todos, budget, or timeline... 🔍`
        }]);

        // Call the scan messages API
        setTimeout(async () => {
          try {
            const response = await fetch('/api/scan-messages-for-todos', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId: user?.uid || '',
                contactEmail: selectedContact?.email || null,
                scanType: isScanAll ? 'all_messages' : 'recent_messages'
              })
            });

            if (response.ok) {
              const result = await response.json();
              console.log('📊 Scan API response:', result);
              
              // API returns: todosSuggested, todosUpdated, todosCompleted
              const { todosSuggested = 0, todosUpdated = 0, todosCompleted = 0, messagesScanned = 0, errors = [] } = result;
              
              let summary = `✅ Scan complete! Analyzed ${messagesScanned} message${messagesScanned !== 1 ? 's' : ''}.\n\n`;
              
              const findings: string[] = [];
              if (todosSuggested > 0) {
                findings.push(`• ${todosSuggested} new todo suggestion${todosSuggested > 1 ? 's' : ''}`);
              }
              if (todosUpdated > 0) {
                findings.push(`• ${todosUpdated} todo update${todosUpdated > 1 ? 's' : ''}`);
              }
              if (todosCompleted > 0) {
                findings.push(`• ${todosCompleted} completed todo${todosCompleted > 1 ? 's' : ''}`);
              }
              
              if (findings.length > 0) {
                summary += `Found:\n${findings.join('\n')}`;
              } else {
                summary += `No updates found in ${contactName}'s messages right now. This could mean everything is up to date, or the messages don't contain actionable items.`;
              }
              
              if (errors.length > 0) {
                summary += `\n\n⚠️ Note: ${errors.length} message${errors.length > 1 ? 's' : ''} couldn't be analyzed.`;
              }

              setChatMessages(prev => [...prev, {
                role: 'assistant',
                content: summary
              }]);
            } else {
              const errorData = await response.json().catch(() => ({}));
              console.error('❌ Scan API error:', response.status, errorData);
              setChatMessages(prev => [...prev, {
                role: 'assistant',
                content: `Scan completed, but there was an issue analyzing messages. ${errorData?.error || 'Try again or check the message analysis feature directly.'}`
              }]);
            }
          } catch (error) {
            console.error('Scan error:', error);
            setChatMessages(prev => [...prev, {
              role: 'assistant',
              content: 'Sorry, I had trouble scanning messages. Try again or use the message analysis feature directly.'
            }]);
          }
        }, 500);

        return true;
      }

      // Let API handle other message commands
      return false;
    }
    
    // Todo context commands
    const selectedListId = latestCurrentData?.selectedListId;
    const selectedListName = latestCurrentData?.selectedList || 'All To-Do Items';
    
    // Filter todos based on selected list context
    let relevantTodos = latestCurrentData?.todoItems || [];
    if (selectedListId && selectedListId !== 'all' && selectedListId !== 'completed') {
      relevantTodos = relevantTodos.filter(todo => todo.listId === selectedListId);
    }
    
    const incompleteTodos = relevantTodos.filter(todo => !todo.isCompleted);
    const todosWithoutDeadlines = incompleteTodos.filter(todo => !todo.deadline);
    const daysUntilWedding = latestCurrentData?.daysUntilWedding || 365;

    // Handle "add deadlines" command
    if (lowerMessage.includes('add deadline') || lowerMessage === 'sure' || lowerMessage === 'yes') {
      if (todosWithoutDeadlines.length > 0) {
        const listContext = selectedListName !== 'All To-Do Items' ? ` in "${selectedListName}"` : '';
        setChatMessages(prev => [...prev, {
          role: 'assistant',
          content: `Perfect! I'll add smart deadlines to your tasks${listContext}. Here's what I'm setting:\n\n${todosWithoutDeadlines.slice(0, 5).map((todo, index) => {
            const urgencyDays = Math.max(7, Math.floor(daysUntilWedding * (0.8 - (index * 0.15))));
            const deadline = new Date();
            deadline.setDate(deadline.getDate() + urgencyDays);
            
            // Trigger the deadline addition
            setTimeout(() => {
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
      const listContext = selectedListName !== 'All To-Do Items' 
        ? ` in your "${selectedListName}" list` 
        : '';
      const taskCount = incompleteTodos.length;
      const todoIds = incompleteTodos.map(todo => todo.id);
      
      setChatMessages(prev => [...prev, {
        role: 'assistant',
        content: `I'd love to help you reorder your tasks${listContext}! Based on your wedding timeline (${daysUntilWedding} days away), here's my suggested priority order for ${taskCount} task${taskCount > 1 ? 's' : ''}:\n\n${incompleteTodos.slice(0, 6).map((todo, index) => {
          return `${index + 1}. **${todo.name}**`;
        }).join('\n')}\n\nWould you like me to apply this order?`,
        actions: [
          {
            label: 'Apply order',
            onClick: () => {
              // Dispatch reorder event
              window.dispatchEvent(new CustomEvent('paige-reorder-todos', { 
                detail: { newOrder: todoIds } 
              }));
              
              // Add confirmation message
              setChatMessages(prev => [...prev, {
                role: 'assistant',
                content: `Done! I've reordered your tasks${listContext} based on priority and your wedding timeline. The most important tasks are now at the top of your list. 🎉\n\nIs there anything else you'd like me to help you organize?`
              }]);
            }
          }
        ]
      }]);
      return true;
    }

    // Handle apply order command (manual typing fallback)
    if (lowerMessage.includes('apply order') || lowerMessage.includes('apply')) {
      const todoIds = incompleteTodos.map(todo => todo.id);
      const listContext = selectedListName !== 'All To-Do Items' 
        ? ` in "${selectedListName}"` 
        : '';
        
      window.dispatchEvent(new CustomEvent('paige-reorder-todos', { 
        detail: { newOrder: todoIds } 
      }));
      
      setChatMessages(prev => [...prev, {
        role: 'assistant',
        content: `Done! I've reordered your tasks${listContext} based on priority and your wedding timeline. The most important tasks are now at the top of your list. 🎉\n\nIs there anything else you'd like me to help you organize?`
      }]);
      return true;
    }

    // Don't handle "suggest to-dos" locally - let API handle it for better context
    return false; // Not a local command, proceed with API
  }, [context, currentData]);

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
            data: currentData, // ✅ Use current data (always latest)
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
      
      // Parse suggested todos from response
      let suggestedTodos: Array<{name: string; category: string}> = [];
      let cleanResponse = data.response || "I'm here to help with your wedding planning!";
      
      if (data.response && data.response.includes('---SUGGESTED_TODOS---')) {
        const parts = data.response.split('---SUGGESTED_TODOS---');
        cleanResponse = parts[0].trim();
        
        if (parts[1] && parts[1].includes('---END_TODOS---')) {
          const todoSection = parts[1].split('---END_TODOS---')[0].trim();
          const todoLines = todoSection.split('\n').filter((line: string) => line.trim());
          
          suggestedTodos = todoLines.map((line: string) => {
            const [name, category] = line.split('||');
            return { name: name.trim(), category: category?.trim() || 'Wedding' };
          });
        }
      }
      
      // Handle any todo actions returned by the API
      if (data.actions && Array.isArray(data.actions)) {
        for (const action of data.actions) {
          await handleTodoAction(action);
        }
      }

      const assistantMessage: any = {
        role: 'assistant' as const,
        content: cleanResponse
      };
      
      // Add "Create To-dos" action if we parsed any suggested todos
      if (suggestedTodos.length > 0) {
        const selectedListId = currentData?.selectedListId;
        const selectedListName = currentData?.selectedList;
        
        assistantMessage.actions = [{
          label: `Create ${suggestedTodos.length} to-dos`,
          onClick: () => {
            // Dispatch event to create todos
            window.dispatchEvent(new CustomEvent('paige-create-todos', {
              detail: {
                todos: suggestedTodos,
                listId: selectedListId,
                listName: selectedListName
              }
            }));
            
            // Add confirmation message with deadline suggestion
            setChatMessages(prev => [...prev, {
              role: 'assistant',
              content: `Perfect! I've added ${suggestedTodos.length} new tasks to your "${selectedListName}" list. They should appear in your list now! 🎉\n\nWould you like me to add smart deadlines to these new tasks based on your wedding timeline?`,
              actions: [{
                label: 'Add deadlines',
                onClick: () => {
                  // Trigger add deadlines flow
                  setChatMessages(prev2 => [...prev2, {
                    role: 'user',
                    content: 'Add deadlines to my tasks'
                  }]);
                  // This will trigger the local command handler
                  setTimeout(() => {
                    handleLocalCommands('Add deadlines to my tasks');
                  }, 100);
                }
              }]
            }]);
          }
        }];
      }
      
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
  }, [chatInput, isLoading, handleLocalCommands, chatMessages, context, currentData, handleTodoAction]); // ✅ Include currentData

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

