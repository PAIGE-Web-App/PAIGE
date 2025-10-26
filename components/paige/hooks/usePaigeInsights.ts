/**
 * usePaigeInsights Hook  
 * Generates smart, context-aware insights for the Paige assistant
 * This is the "brain" of Paige - analyzes user data and suggests actionable next steps
 */

import { useEffect, useState, useCallback, useMemo } from 'react';
import { PaigeInsight, PaigeCurrentData, PaigeContext, PaigeTodoComputations } from '@/types/paige';
import { getSmartVendorRoute } from '../utils/vendorRouting';

export interface UsePaigeInsightsProps {
  context: PaigeContext;
  currentData?: PaigeCurrentData;
  todoComputations: PaigeTodoComputations;
  userId?: string;
  handleAddDeadlines: (todos: any[], daysUntilWedding: number) => void;
}

export interface UsePaigeInsightsReturn {
  currentInsights: PaigeInsight[];
  dismissInsight: (insightId: string) => void;
  dismissedInsights: Set<string>;
}

export function usePaigeInsights({
  context,
  currentData,
  todoComputations,
  userId,
  handleAddDeadlines
}: UsePaigeInsightsProps): UsePaigeInsightsReturn {
  const [currentInsights, setCurrentInsights] = useState<PaigeInsight[]>([]);
  const [dismissedInsights, setDismissedInsights] = useState<Set<string>>(new Set());

  // Memoized dismiss function
  const dismissInsight = useCallback((insightId: string) => {
    setDismissedInsights(prev => new Set([...prev, insightId]));
  }, []);

  // Generate smart insights based on context and data
  useEffect(() => {
    if (!userId) return;

    const generateSmartInsights = () => {
      const insights: PaigeInsight[] = [];

      if (context === 'todo') {
        const {
          allTodoItems,
          selectedList,
          selectedListId,
          isSpecificList,
          relevantTodos,
          incompleteTodos,
          todosWithoutDeadlines,
          daysUntilWedding,
          totalTodos
        } = todoComputations;

        // Priority 1: Urgent overdue tasks
        if (currentData?.overdueTasks && currentData.overdueTasks > 0) {
          insights.push({
            id: 'overdue-tasks',
            type: 'urgent',
            title: `${currentData.overdueTasks} overdue task${currentData.overdueTasks > 1 ? 's' : ''}`,
            description: 'Click to filter and tackle these first - they need immediate attention!',
            action: {
              label: 'Show overdue tasks',
              onClick: () => {
                const filterButton = document.querySelector('[data-filter="overdue"]') as HTMLElement;
                if (filterButton) filterButton.click();
                else window.location.hash = '#overdue';
              }
            },
            dismissible: true
          });
        }

        // Priority 2: Specific list fallback (if we can't find the todos)
        if (isSpecificList && relevantTodos.length === 0 && allTodoItems.length > 0) {
          insights.push({
            id: 'list-help',
            type: 'tip',
            title: `Working on: ${selectedList}`,
            description: 'Focus on completing the tasks in this list. Need help with vendors or planning?',
            action: {
              label: 'Chat with Paige',
              onClick: () => {
                // This will be handled by the parent component
                const chatButton = document.querySelector('[title="Chat with Paige"]') as HTMLElement;
                if (chatButton) chatButton.click();
              }
            },
            dismissible: true
          });
        }

        // Priority 3: Specific list focus - provide targeted help
        if (isSpecificList && incompleteTodos.length === 1) {
          const todo = incompleteTodos[0];
          const hasDeadline = !!todo.deadline;
          const smartAction = getSmartVendorRoute(todo.name, currentData?.weddingLocation);

          insights.push({
            id: 'single-task-focus',
            type: 'tip',
            title: `Let's tackle: ${todo.name}`,
            description: hasDeadline 
              ? 'Focus on this task to move forward!'
              : 'Add a deadline to stay on track with this important task.',
            action: smartAction ? {
              label: smartAction.label,
              url: smartAction.url
            } : {
              label: hasDeadline ? 'View task' : 'Add deadline',
              onClick: () => {
                const todoElement = document.querySelector(`[data-todo-id="${todo.id}"]`);
                if (todoElement) {
                  if (!hasDeadline) {
                    const deadlineButton = todoElement.querySelector('[data-action="add-deadline"]') as HTMLElement;
                    if (deadlineButton) deadlineButton.click();
                  } else {
                    todoElement.scrollIntoView({ behavior: 'auto', block: 'center' });
                  }
                }
              }
            },
            dismissible: true
          });
        }

        // Priority 4: Many todos without deadlines
        if (todosWithoutDeadlines.length >= 3) {
          insights.push({
            id: 'add-deadlines',
            type: 'urgent',
            title: `${todosWithoutDeadlines.length} tasks need deadlines`,
            description: 'Adding deadlines helps you stay organized and reduces last-minute stress.',
            action: {
              label: 'Add deadlines',
              onClick: () => {
                // Open chat with deadline suggestions
                const chatButton = document.querySelector('[title="Chat with Paige"]') as HTMLElement;
                if (chatButton) chatButton.click();
              }
            },
            dismissible: true
          });
        }

        // Priority 5: Few tasks remaining
        if (incompleteTodos.length > 0 && incompleteTodos.length <= 3) {
          insights.push({
            id: 'encourage-progress',
            type: 'celebration',
            title: 'You\'re doing great!',
            description: `Only ${totalTodos} ${totalTodos === 1 ? 'task' : 'tasks'} left. You've got this! 🎉`,
            dismissible: true
          });
        }

        // Priority 6: Completed specific list
        if (isSpecificList && relevantTodos.length > 0 && incompleteTodos.length === 0 && relevantTodos.every(todo => todo.isCompleted)) {
          insights.push({
            id: 'empty-list',
            type: 'celebration',
            title: `${selectedList} is complete! 🎉`,
            description: 'All tasks for this category are done. Want to add more or focus on other areas?',
            action: {
              label: 'View all tasks',
              onClick: () => {
                const allTodosButton = document.querySelector('[data-list="all"]') as HTMLElement;
                if (allTodosButton) allTodosButton.click();
              }
            },
            dismissible: true
          });
        }

        // Priority 7: No tasks yet
        if (currentData?.totalTasks === 0) {
          insights.push({
            id: 'no-tasks',
            type: 'tip',
            title: 'Start your wedding planning!',
            description: 'Add your first todo to get organized and track progress.',
            action: {
              label: 'Add a task',
              onClick: () => {
                const addButton = document.querySelector('[data-action="add-todo"]') as HTMLElement;
                if (addButton) addButton.click();
                else {
                  const newTodoButton = document.querySelector('button:contains("New To-do Item")') as HTMLElement;
                  if (newTodoButton) newTodoButton.click();
                }
              }
            },
            dismissible: true
          });
        }

        // Priority 8: Final stretch advice
        if (currentData?.daysUntilWedding && currentData.daysUntilWedding < 60 && currentData.totalTasks > 0 && incompleteTodos.length <= 8) {
          insights.push({
            id: 'final-stretch',
            type: 'tip',
            title: 'Final stretch - 60 days to go!',
            description: 'Focus on vendor confirmations and final details. Create a day-of timeline.',
            action: {
              label: 'View timeline page',
              onClick: () => window.location.href = '/timeline'
            },
            dismissible: true
          });
        }

        // Priority 9: Celebrate good progress
        if (currentData?.completedTasks && currentData?.totalTasks && currentData.completedTasks > 0) {
          const progress = Math.round((currentData.completedTasks / currentData.totalTasks) * 100);
          if (progress >= 50) {
            insights.push({
              id: 'progress-celebration',
              type: 'celebration',
              title: `Amazing! ${progress}% complete`,
              description: 'You\'re making great progress. Consider adding more tasks to stay organized.',
              action: {
                label: 'Add more tasks',
                onClick: () => {
                  const addButton = document.querySelector('[data-action="add-todo"]') as HTMLElement;
                  if (addButton) addButton.click();
                }
              },
              dismissible: true
            });
          }
        }

        // Priority 10: Next priority task
        if (incompleteTodos.length > 1 || (!isSpecificList && incompleteTodos.length > 0)) {
          const todosWithDeadlines = incompleteTodos.filter(todo => todo.deadline);
          const todosWithoutDeadlines = incompleteTodos.filter(todo => !todo.deadline);

          // Sort todos with deadlines by deadline (soonest first)
          const sortedByDeadline = todosWithDeadlines.sort((a, b) => {
            const dateA = new Date(a.deadline);
            const dateB = new Date(b.deadline);
            return dateA.getTime() - dateB.getTime();
          });

          // Prioritize: soonest deadline, then todos without deadlines
          const targetTodo = sortedByDeadline[0] || todosWithoutDeadlines[0];

          if (targetTodo) {
            const hasDeadline = !!targetTodo.deadline;
            const isOverdue = hasDeadline && new Date(targetTodo.deadline) < new Date();
            const daysUntilDeadline = hasDeadline ? Math.ceil((new Date(targetTodo.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : null;

            const smartAction = getSmartVendorRoute(targetTodo.name, currentData?.weddingLocation, targetTodo.category);

            insights.push({
              id: 'next-task',
              type: isOverdue ? 'urgent' : 'tip',
              title: `Next up: ${targetTodo.name}`,
              description: hasDeadline
                ? (isOverdue ? 'This task is overdue!' : `Due in ${daysUntilDeadline} day${daysUntilDeadline === 1 ? '' : 's'}`)
                : 'Consider adding a deadline to stay on track!',
              action: {
                label: hasDeadline && smartAction ? smartAction.label : (hasDeadline ? 'View task' : 'Add deadline'),
                onClick: () => {
                  if (!hasDeadline) {
                    const todoElement = document.querySelector(`[data-todo-id="${targetTodo.id}"]`);
                    if (todoElement) {
                      const deadlineButton = todoElement.querySelector('[data-action="add-deadline"]') as HTMLElement;
                      if (deadlineButton) deadlineButton.click();
                    }
                  } else if (smartAction?.url) {
                    window.location.href = smartAction.url;
                  } else {
                    const todoElement = document.querySelector(`[data-todo-id="${targetTodo.id}"]`);
                    if (todoElement) {
                      todoElement.scrollIntoView({ behavior: 'auto', block: 'center' });
                    }
                  }
                }
              },
              dismissible: true
            });
          }
        }
      }

      // Filter out dismissed insights and set the array
      const visibleInsights = insights.filter(insight => !dismissedInsights.has(insight.id));
      setCurrentInsights(visibleInsights);
    };

    generateSmartInsights();
  }, [
    context,
    todoComputations,
    currentData?.overdueTasks,
    currentData?.upcomingDeadlines,
    currentData?.completedTasks,
    currentData?.totalTasks,
    currentData?.weddingLocation,
    currentData?.daysUntilWedding,
    userId,
    dismissedInsights,
    handleAddDeadlines
  ]);

  return {
    currentInsights,
    dismissInsight,
    dismissedInsights
  };
}

