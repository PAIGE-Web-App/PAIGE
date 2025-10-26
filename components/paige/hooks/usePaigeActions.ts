/**
 * usePaigeActions Hook
 * Handles todo manipulation actions (add deadlines, reorder, complete, update)
 * Dispatches custom events that the todo page listens for
 */

import { useCallback } from 'react';

export interface UsePaigeActionsReturn {
  handleAddDeadlines: (todosWithoutDeadlines: any[], daysUntilWedding: number) => void;
  handleTodoAction: (action: any) => Promise<void>;
}

export function usePaigeActions(): UsePaigeActionsReturn {
  /**
   * Handle adding deadlines to todos with action button
   * Dispatches custom events with staggered timing
   */
  const handleAddDeadlines = useCallback((todosWithoutDeadlines: any[], daysUntilWedding: number) => {
    todosWithoutDeadlines.forEach((todo, index) => {
      const urgencyDays = Math.max(7, Math.floor(daysUntilWedding * (0.8 - (index * 0.15))));
      const deadline = new Date();
      deadline.setDate(deadline.getDate() + urgencyDays);
      
      // Trigger the deadline addition with staggered timing
      setTimeout(() => {
        // Format as YYYY-MM-DDTHH:MM to avoid default 5pm time
        const formattedDeadline = `${deadline.toISOString().split('T')[0]}T12:00`;
        console.log('🎯 Paige dispatching deadline event:', { todoId: todo.id, deadline: formattedDeadline });
        
        window.dispatchEvent(new CustomEvent('paige-add-deadline', { 
          detail: { 
            todoId: todo.id, 
            deadline: formattedDeadline
          } 
        }));
      }, index * 500); // Stagger the updates
    });
  }, []);

  /**
   * Handle todo actions from AI responses
   * Dispatches appropriate custom events based on action type
   */
  const handleTodoAction = useCallback(async (action: any) => {
    try {
      switch (action.type) {
        case 'reorder':
          // Trigger a custom event that the todo page can listen to
          window.dispatchEvent(new CustomEvent('paige-reorder-todos', { 
            detail: { newOrder: action.todoIds } 
          }));
          break;
          
        case 'complete':
          window.dispatchEvent(new CustomEvent('paige-complete-todo', { 
            detail: { todoId: action.todoId } 
          }));
          break;
          
        case 'update':
          window.dispatchEvent(new CustomEvent('paige-update-todo', { 
            detail: {
              todoId: action.todoId,
              updates: action.updates
            }
          }));
          break;
          
        case 'add-deadline':
          window.dispatchEvent(new CustomEvent('paige-add-deadline', { 
            detail: {
              todoId: action.todoId,
              deadline: action.deadline 
            } 
          }));
          break;
      }
    } catch (error) {
      console.error('Error handling todo action:', error);
    }
  }, []);

  return {
    handleAddDeadlines,
    handleTodoAction
  };
}

