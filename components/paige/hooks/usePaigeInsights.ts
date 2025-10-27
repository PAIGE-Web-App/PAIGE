/**
 * usePaigeInsights Hook  
 * Generates smart, context-aware insights for the Paige assistant
 * This is the "brain" of Paige - analyzes user data and suggests actionable next steps
 */

import { useEffect, useState, useCallback, useMemo } from 'react';
import { PaigeInsight, PaigeCurrentData, PaigeContext, PaigeTodoComputations } from '@/types/paige';
import { getSmartVendorRoute } from '../utils/vendorRouting';

/**
 * Helper: Get vendor suggestion based on budget category name
 */
function getVendorSuggestionForCategory(categoryName: string, location?: string) {
  const name = categoryName.toLowerCase();
  const locationParam = location ? `?location=${encodeURIComponent(location)}` : '';

  if (name.includes('venue') || name.includes('catering')) {
    return {
      label: 'Browse Venues & Caterers',
      url: `/vendors/catalog/wedding_venue${locationParam}`,
      description: 'Start by securing your venue and catering.'
    };
  }
  
  if (name.includes('photo')) {
    return {
      label: 'Find Photographers',
      url: `/vendors/catalog/photographer${locationParam}`,
      description: 'Book your photographer early for best availability.'
    };
  }
  
  if (name.includes('music') || name.includes('entertainment') || name.includes('dj') || name.includes('band')) {
    return {
      label: 'Browse Entertainment',
      url: `/vendors/catalog/dj${locationParam}`,
      description: 'Find DJs and musicians for your celebration.'
    };
  }
  
  if (name.includes('floral') || name.includes('flower')) {
    return {
      label: 'Browse Florists',
      url: `/vendors/catalog/florist${locationParam}`,
      description: 'Find florists for your wedding flowers and decor.'
    };
  }
  
  if (name.includes('attire') || name.includes('beauty') || name.includes('dress')) {
    return {
      label: 'Shop Attire',
      url: `/vendors/catalog/bridal_shop${locationParam}`,
      description: 'Find bridal shops for your wedding attire.'
    };
  }
  
  if (name.includes('cake') || name.includes('bakery') || name.includes('dessert')) {
    return {
      label: 'Browse Bakeries',
      url: `/vendors/catalog/bakery${locationParam}`,
      description: 'Find bakeries for your wedding cake.'
    };
  }
  
  if (name.includes('stationery') || name.includes('invitation')) {
    return null; // No vendor category for stationery
  }
  
  if (name.includes('transportation')) {
    return null; // No specific vendor category yet
  }
  
  return null;
}

export interface UsePaigeInsightsProps {
  context: PaigeContext;
  currentData?: PaigeCurrentData;
  todoComputations: PaigeTodoComputations;
  userId?: string;
  handleAddDeadlines: (todos: any[], daysUntilWedding: number) => void;
  openChatWithMessage?: (message: string) => void;
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
  handleAddDeadlines,
  openChatWithMessage
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
              onClick: () => window.location.href = smartAction.url
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
          const days = currentData.daysUntilWedding;
          const timeDescription = days <= 30 
            ? `${days} day${days === 1 ? '' : 's'} to go!`
            : `less than 2 months to go!`;
          
          insights.push({
            id: 'final-stretch',
            type: 'tip',
            title: `Final stretch - ${timeDescription}`,
            description: 'Focus on vendor confirmations and final details. You\'re almost there!',
            dismissible: true
          });
        }

        // Priority 9: Suggest more todos for small/specific lists
        if (isSpecificList && incompleteTodos.length > 0 && incompleteTodos.length <= 3) {
          const listName = currentData?.selectedList || 'this list';
          insights.push({
            id: 'suggest-more-todos',
            type: 'tip',
            title: `Want more tasks for "${listName}"?`,
            description: `You have ${incompleteTodos.length} task${incompleteTodos.length > 1 ? 's' : ''}. I can suggest related tasks to help you stay organized.`,
            action: {
              label: 'Suggest to-dos',
              onClick: () => {
                // Use callback to open chat and auto-send
                if (openChatWithMessage) {
                  openChatWithMessage('Suggest more to-do items for this list');
                }
              }
            },
            dismissible: true
          });
        }

        // Priority 10: Celebrate good progress
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

        // Priority 10.5: Cross-agent - Budget sync (if budget available)
        if (currentData?.hasBudget && currentData?.totalBudget && currentData.totalBudget > 0) {
          const budget = currentData.totalBudget;
          const highBudgetTodo = incompleteTodos.find(todo => {
            if (!todo.name) return false;
            const name = todo.name.toLowerCase();
            return name.includes('venue') || name.includes('catering') || name.includes('photo') || name.includes('floral');
          });
          
          if (highBudgetTodo) {
            insights.push({
              id: 'todo-budget-sync',
              type: 'tip',
              title: 'Sync with your budget',
              description: `${highBudgetTodo.name} is a major expense. Have you allocated budget for this?`,
              action: {
                label: 'Check budget',
                onClick: () => window.location.href = '/budget'
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

      // Dashboard context - high-level planning overview
      if (context === 'dashboard') {
        const daysUntilWedding = currentData?.daysUntilWedding || 365;
        const overdueTasks = currentData?.overdueTasks || 0;
        const upcomingDeadlines = currentData?.upcomingDeadlines || 0;
        const totalTasks = currentData?.totalTasks || 0;
        const completedTasks = currentData?.completedTasks || 0;

        // Priority 1: Overdue tasks (URGENT)
        if (overdueTasks > 0) {
          insights.push({
            id: 'dashboard-overdue',
            type: 'urgent',
            title: `${overdueTasks} overdue task${overdueTasks > 1 ? 's' : ''}!`,
            description: 'These need your immediate attention to stay on track.',
            action: {
              label: 'View overdue tasks',
              onClick: () => window.location.href = '/todo?filter=overdue'
            },
            dismissible: true
          });
        }

        // Priority 2: Final countdown (≤ 45 days) - NON-DISMISSIBLE
        if (daysUntilWedding && daysUntilWedding <= 45) {
          insights.push({
            id: 'dashboard-countdown',
            type: 'urgent',
            title: `Final countdown: ${daysUntilWedding} day${daysUntilWedding === 1 ? '' : 's'}!`,
            description: 'Focus on vendor confirmations, final payments, and day-of details.',
            action: {
              label: 'View priority tasks',
              onClick: () => window.location.href = '/todo'
            },
            dismissible: false // Always show in final 45 days!
          });
        }

        // Priority 2.5: Timeline review/creation (approaching wedding date)
        // Check if user has actual timeline data from AgentDataProvider
        const hasTimeline = currentData?.timelineData && currentData.timelineData.length > 0;
        console.log('🔍 Dashboard timeline check:', { 
          hasTimelineData: !!currentData?.timelineData, 
          timelineCount: currentData?.timelineData?.length || 0,
          hasTimeline 
        });
        
        if (daysUntilWedding && daysUntilWedding <= 60 && !hasTimeline) {
          // No timeline created, suggest creating one
          insights.push({
            id: 'dashboard-create-timeline',
            type: 'urgent',
            title: 'Create your day-of timeline',
            description: `With ${daysUntilWedding} days left, coordinate vendors, timing, and your wedding flow.`,
            action: {
              label: 'Create timeline',
              onClick: () => window.location.href = '/timeline'
            },
            dismissible: true
          });
        } else if (daysUntilWedding && daysUntilWedding <= 30 && hasTimeline) {
          // Has timeline, suggest reviewing
          insights.push({
            id: 'dashboard-review-timeline',
            type: 'reminder',
            title: 'Review your day-of timeline',
            description: `${daysUntilWedding} days left! Confirm vendor arrival times and event flow.`,
            action: {
              label: 'Review timeline',
              onClick: () => window.location.href = '/timeline'
            },
            dismissible: true
          });
        }

        // Priority 3: Upcoming deadlines
        if (upcomingDeadlines > 0) {
          insights.push({
            id: 'dashboard-upcoming',
            type: 'reminder',
            title: `${upcomingDeadlines} deadline${upcomingDeadlines > 1 ? 's' : ''} this week`,
            description: 'Stay ahead by reviewing your upcoming tasks.',
            action: {
              label: 'View deadlines',
              onClick: () => window.location.href = '/todo'
            },
            dismissible: true
          });
        }

        // Priority 4: No tasks (get started)
        if (totalTasks === 0) {
          insights.push({
            id: 'dashboard-get-started',
            type: 'tip',
            title: 'Start your wedding planning!',
            description: 'Create your first to-do list to organize your big day.',
            action: {
              label: 'Create tasks',
              onClick: () => window.location.href = '/todo'
            },
            dismissible: true
          });
        }

        // Priority 5: Great progress (50%+ complete)
        if (totalTasks > 0 && completedTasks > 0) {
          const progress = Math.round((completedTasks / totalTasks) * 100);
          if (progress >= 50) {
            insights.push({
              id: 'dashboard-progress',
              type: 'celebration',
              title: `${progress}% complete - amazing!`,
              description: `You've completed ${completedTasks} of ${totalTasks} tasks. Keep up the great work!`,
              action: {
                label: 'View all tasks',
                onClick: () => window.location.href = '/todo'
              },
              dismissible: true
            });
          }
        }

        // Priority 6: Timeline-based milestones (dynamic) - only for 45+ days
        if (daysUntilWedding > 45 && daysUntilWedding <= 90) {
          // 45-90 days (1.5-3 months)
          insights.push({
            id: 'dashboard-milestone',
            type: 'tip',
            title: '2-3 months to go - finalize your plans!',
            description: 'Focus on finalizing vendors, confirming details, and booking remaining services.',
            action: {
              label: 'Check vendors',
              onClick: () => window.location.href = '/vendors'
            },
            dismissible: true
          });
        } else if (daysUntilWedding > 90 && daysUntilWedding <= 180) {
          // 3-6 months out
          insights.push({
            id: 'dashboard-6months',
            type: 'tip',
            title: '3-6 months out - build your foundation',
            description: 'Focus on booking key vendors and establishing your budget.',
            action: {
              label: 'View vendors',
              onClick: () => window.location.href = '/vendors'
            },
            dismissible: true
          });
        }

        // Priority 7: Encourage budget creation
        if (!currentData?.hasBudget && daysUntilWedding < 365) {
          insights.push({
            id: 'dashboard-budget',
            type: 'suggestion',
            title: 'Create a budget to track expenses',
            description: 'Stay financially organized throughout your planning journey.',
            action: {
              label: 'Create budget',
              onClick: () => window.location.href = '/budget'
            },
            dismissible: true
          });
        }

        // Priority 8: Completed tasks this week (celebration)
        const completedThisWeek = currentData?.completedThisWeek || 0;
        if (completedThisWeek > 0) {
          insights.push({
            id: 'dashboard-weekly-progress',
            type: 'celebration',
            title: `${completedThisWeek} task${completedThisWeek > 1 ? 's' : ''} completed this week!`,
            description: 'You\'re making great progress. Keep up the momentum!',
            action: {
              label: 'View progress',
              onClick: () => window.location.href = '/todo'
            },
            dismissible: true
          });
        }

        // Priority 9: Budget + Todo sync suggestion
        if (currentData?.hasBudget && totalTasks > 0 && completedTasks < totalTasks) {
          const progress = Math.round((completedTasks / totalTasks) * 100);
          if (progress < 30) {
            insights.push({
              id: 'dashboard-sync-planning',
              type: 'tip',
              title: 'Sync your planning',
              description: 'Review your budget alongside your to-dos to ensure you\'re on track financially.',
              action: {
                label: 'View budget',
                onClick: () => window.location.href = '/budget'
              },
              dismissible: true
            });
          }
        }

        // Priority 10: No budget but has tasks (missing planning element)
        if (!currentData?.hasBudget && totalTasks > 5) {
          insights.push({
            id: 'dashboard-missing-budget',
            type: 'reminder',
            title: 'You have tasks but no budget',
            description: `With ${totalTasks} tasks planned, create a budget to track your spending.`,
            action: {
              label: 'Create budget',
              onClick: () => window.location.href = '/budget'
            },
            dismissible: true
          });
        }

        // Priority 11: Has budget but no tasks (missing planning element)
        if (currentData?.hasBudget && totalTasks === 0) {
          insights.push({
            id: 'dashboard-missing-tasks',
            type: 'reminder',
            title: 'You have a budget but no tasks',
            description: 'Create to-do items to organize your planning timeline.',
            action: {
              label: 'Create tasks',
              onClick: () => window.location.href = '/todo'
            },
            dismissible: true
          });
        }

        // === FROM BUDGET AGENT (SURFACED ON DASHBOARD) ===
        // Pull critical budget insights to show on dashboard
        
        // Budget Agent Insight: Budget exceeded
        if (currentData?.hasBudget) {
          const totalBudget = currentData?.totalBudget || 0;
          const spent = currentData?.spent || 0;
          if (totalBudget > 0 && spent > totalBudget) {
            const overAmount = spent - totalBudget;
            insights.push({
              id: 'dashboard-budget-exceeded',
              type: 'urgent',
              title: `Budget exceeded by $${overAmount.toLocaleString()}!`,
              description: 'Review your spending and adjust categories.',
              action: {
                label: 'Review budget',
                onClick: () => window.location.href = '/budget'
              },
              dismissible: true
            });
          }
        }

        // Budget Agent Insight: Overspending warning (80%+)
        if (currentData?.hasBudget) {
          const totalBudget = currentData?.totalBudget || 0;
          const spent = currentData?.spent || 0;
          const spendingPercent = totalBudget > 0 ? Math.round((spent / totalBudget) * 100) : 0;
          if (spendingPercent >= 80 && spendingPercent < 100) {
            insights.push({
              id: 'dashboard-budget-warning',
              type: 'reminder',
              title: `${spendingPercent}% of budget spent`,
              description: 'You\'re approaching your budget limit. Review remaining expenses.',
              action: {
                label: 'View budget',
                onClick: () => window.location.href = '/budget'
              },
              dismissible: true
            });
          }
        }

        // Budget Agent Insight: $0 spent (no activity)
        if (currentData?.hasBudget && daysUntilWedding < 90) {
          const spent = currentData?.spent || 0;
          if (spent === 0) {
            insights.push({
              id: 'dashboard-no-spending',
              type: 'tip',
              title: '$0 spent with less than 3 months to go',
              description: 'Start booking vendors and making deposits to secure your wedding.',
              action: {
                label: 'Browse vendors',
                onClick: () => window.location.href = '/vendors'
              },
              dismissible: true
            });
          }
        }

      }

      // Budget context - financial planning insights
      if (context === 'budget') {
        const totalBudget = currentData?.totalBudget || 0;
        const allocated = currentData?.allocated || 0;
        const spent = currentData?.spent || 0;
        const remaining = totalBudget - spent;
        const allocationPercent = totalBudget > 0 ? Math.round((allocated / totalBudget) * 100) : 0;
        const spendingPercent = totalBudget > 0 ? Math.round((spent / totalBudget) * 100) : 0;
        const daysUntilWedding = currentData?.daysUntilWedding || 365;
        const categories = currentData?.categories || [];
        const budgetItems = currentData?.budgetItems || [];
        const categoryCount = currentData?.categoryCount || categories.length || 0;

        // Debug logging
        console.log('💰 Paige Budget Data:', {
          totalBudget,
          allocated,
          spent,
          remaining,
          allocationPercent,
          spendingPercent,
          daysUntilWedding,
          categoryCount,
          categoriesCount: categories.length,
          budgetItemsCount: budgetItems.length
        });

        // Priority 1: Over-allocated (URGENT)
        if (allocated > totalBudget) {
          const overage = allocated - totalBudget;
          insights.push({
            id: 'budget-over-allocated',
            type: 'urgent',
            title: `Budget over-allocated by $${overage.toLocaleString()}!`,
            description: 'You\'ve planned to spend more than your total budget. Consider adjusting allocations.',
            action: {
              label: 'Review categories',
              onClick: () => {
                // Scroll to categories section
                const categoriesSection = document.querySelector('[data-section="categories"]');
                if (categoriesSection) {
                  categoriesSection.scrollIntoView({ behavior: 'auto', block: 'start' });
                }
              }
            },
            dismissible: true
          });
        }

        // Priority 2: Overspending warning (spent > 90% of budget)
        if (spendingPercent > 90 && spendingPercent <= 100) {
          insights.push({
            id: 'budget-high-spending',
            type: 'urgent',
            title: `You've spent ${spendingPercent}% of your budget`,
            description: 'Watch your remaining expenses carefully to stay within budget.',
            action: {
              label: 'Review spending',
              onClick: () => {
                const spendingSection = document.querySelector('[data-section="overview"]');
                if (spendingSection) {
                  spendingSection.scrollIntoView({ behavior: 'auto', block: 'start' });
                }
              }
            },
            dismissible: true
          });
        }

        // Priority 3: Over budget (spent > totalBudget)
        if (spent > totalBudget) {
          const overage = spent - totalBudget;
          insights.push({
            id: 'budget-exceeded',
            type: 'urgent',
            title: `Over budget by $${overage.toLocaleString()}!`,
            description: 'You\'ve exceeded your total budget. Review expenses and adjust where possible.',
            action: {
              label: 'View expenses',
              onClick: () => {
                const categoriesSection = document.querySelector('[data-section="categories"]');
                if (categoriesSection) {
                  categoriesSection.scrollIntoView({ behavior: 'auto', block: 'start' });
                }
              }
            },
            dismissible: true
          });
        }

        // Priority 4: Under-allocated (< 80% allocated, wedding < 6 months)
        if (allocationPercent < 80 && daysUntilWedding < 180 && totalBudget > 0) {
          insights.push({
            id: 'budget-under-allocated',
            type: 'suggestion',
            title: `Only ${allocationPercent}% of budget allocated`,
            description: 'Plan for remaining categories to avoid last-minute surprises.',
            action: {
              label: 'Add categories',
              onClick: () => {
                const addButton = document.querySelector('[data-action="add-category"]') as HTMLElement;
                if (addButton) addButton.click();
              }
            },
            dismissible: true
          });
        }

        // Priority 5: No budget set
        if (totalBudget === 0) {
          insights.push({
            id: 'budget-not-set',
            type: 'tip',
            title: 'Set your total wedding budget',
            description: 'Start by setting your overall budget to track expenses effectively.',
            action: {
              label: 'Set budget',
              onClick: () => {
                const budgetInput = document.querySelector('[data-input="total-budget"]') as HTMLElement;
                if (budgetInput) {
                  budgetInput.focus();
                }
              }
            },
            dismissible: true
          });
        }

        // Priority 6: Great budget management (within budget, actively spending)
        if (totalBudget > 0 && spent > 0 && spent < totalBudget * 0.9) {
          const percentRemaining = Math.round(((totalBudget - spent) / totalBudget) * 100);
          insights.push({
            id: 'budget-on-track',
            type: 'celebration',
            title: `Great budgeting! ${percentRemaining}% remaining`,
            description: `You're staying within budget - $${remaining.toLocaleString()} left for remaining expenses.`,
            dismissible: true
          });
        }

        // Priority 6b: Budget planned, ready to start spending
        if (totalBudget > 0 && allocated > 0 && spent === 0 && allocationPercent >= 70) {
          insights.push({
            id: 'budget-planned',
            type: 'tip',
            title: `Budget planned! ${allocationPercent}% allocated`,
            description: `You've allocated $${allocated.toLocaleString()} across ${categoryCount} categories. Ready to start booking vendors?`,
            action: {
              label: 'Browse vendors',
              onClick: () => window.location.href = '/vendors'
            },
            dismissible: true
          });
        }

        // Priority 7: Low category count (< 5 categories)
        // (categoryCount already defined at top of budget context)
        if (categoryCount < 5 && totalBudget > 0) {
          insights.push({
            id: 'budget-few-categories',
            type: 'suggestion',
            title: 'Add more budget categories',
            description: 'Track expenses across all wedding elements (venue, catering, photography, etc.)',
            action: {
              label: 'View common categories',
              onClick: () => {
                const addButton = document.querySelector('[data-action="add-category"]') as HTMLElement;
                if (addButton) addButton.click();
              }
            },
            dismissible: true
          });
        }

        // Priority 8: Category-specific insights (analyze individual categories)
        // (categories already defined at top of budget context)
        
        // Find largest allocated category with $0 spent
        const largestUnspentCategory = categories
          .filter(cat => cat.spentAmount === 0 && cat.allocatedAmount > 0)
          .sort((a, b) => b.allocatedAmount - a.allocatedAmount)[0];
        
        if (largestUnspentCategory && totalBudget > 0) {
          const categoryPercent = Math.round((largestUnspentCategory.allocatedAmount / totalBudget) * 100);
          
          // Suggest vendor browsing for this category
          const vendorSuggestion = getVendorSuggestionForCategory(largestUnspentCategory.name, currentData?.weddingLocation);
          
          insights.push({
            id: 'budget-category-focus',
            type: 'suggestion',
            title: `${largestUnspentCategory.name}: $${largestUnspentCategory.allocatedAmount.toLocaleString()} (${categoryPercent}%)`,
            description: vendorSuggestion 
              ? `Your largest budget allocation. ${vendorSuggestion.description}`
              : `This is your largest budget allocation at $${largestUnspentCategory.allocatedAmount.toLocaleString()}.`,
            action: {
              label: 'View Category',
              onClick: () => {
                // Find and click the category in the sidebar to switch to it
                const categoryButtons = document.querySelectorAll('[data-category-name]');
                for (const button of categoryButtons) {
                  if (button.textContent?.includes(largestUnspentCategory.name)) {
                    (button as HTMLElement).click();
                    break;
                  }
                }
              }
            },
            dismissible: true
          });
        }

        // Priority 9: Categories with high allocation but no spending yet
        const highAllocationCategories = categories.filter(cat => 
          cat.allocatedAmount > totalBudget * 0.15 && cat.spentAmount === 0
        );
        
        if (highAllocationCategories.length >= 2 && daysUntilWedding < 90) {
          insights.push({
            id: 'budget-start-spending',
            type: 'reminder',
            title: `${highAllocationCategories.length} major categories need booking`,
            description: `With ${daysUntilWedding} days left, consider reaching out to vendors for your biggest expenses.`,
            action: {
              label: 'View vendors',
              onClick: () => window.location.href = '/vendors'
            },
            dismissible: true
          });
        }

        // Priority 10: Individual budget items with upcoming due dates
        // (budgetItems already defined at top of budget context)
        const upcomingPayments = budgetItems.filter(item => {
          if (!item.dueDate || item.isPaid) return false;
          try {
            let dueDate = item.dueDate;
            if (typeof dueDate === 'object' && 'toDate' in dueDate) {
              dueDate = dueDate.toDate();
            } else if (typeof dueDate === 'object' && 'seconds' in dueDate) {
              dueDate = new Date(dueDate.seconds * 1000);
            }
            const daysUntilDue = Math.ceil((new Date(dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
            return daysUntilDue > 0 && daysUntilDue <= 30; // Due within 30 days
          } catch {
            return false;
          }
        }).sort((a, b) => {
          // Sort by due date (soonest first)
          const dateA = new Date(a.dueDate);
          const dateB = new Date(b.dueDate);
          return dateA.getTime() - dateB.getTime();
        });

        // Show individual payment insights (max 3 to avoid cluttering)
        upcomingPayments.slice(0, 3).forEach((payment, index) => {
          let daysUntilDue = 0;
          try {
            let dueDate = payment.dueDate;
            if (typeof dueDate === 'object' && 'toDate' in dueDate) {
              dueDate = dueDate.toDate();
            } else if (typeof dueDate === 'object' && 'seconds' in dueDate) {
              dueDate = new Date(dueDate.seconds * 1000);
            }
            daysUntilDue = Math.ceil((new Date(dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
          } catch {
            daysUntilDue = 0;
          }

          insights.push({
            id: `budget-payment-${payment.name}-${index}`,
            type: daysUntilDue <= 7 ? 'urgent' : 'reminder',
            title: `${payment.name} due ${daysUntilDue <= 7 ? 'in ' + daysUntilDue + ' days' : 'soon'}`,
            description: `$${(payment.projectedAmount || 0).toLocaleString()} payment${payment.vendor ? ` to ${payment.vendor}` : ''} in ${payment.categoryName}.`,
            action: {
              label: 'View Item',
              onClick: () => {
                // Step 1: Find and click the category in the sidebar to switch to it
                const categoryButtons = document.querySelectorAll('[data-category-name]');
                for (const button of categoryButtons) {
                  if (button.textContent?.includes(payment.categoryName)) {
                    (button as HTMLElement).click();
                    
                    // Step 2: After switching category, highlight the specific item in green
                    setTimeout(() => {
                      // Find the item row by name
                      const itemRows = document.querySelectorAll('[data-item-name]');
                      for (const row of itemRows) {
                        if (row.getAttribute('data-item-name') === payment.name) {
                          // Flash green highlight effect (same as todo items)
                          row.classList.add('bg-green-100');
                          row.classList.add('transition-colors');
                          row.classList.add('duration-300');
                          
                          // Scroll to the item
                          row.scrollIntoView({ behavior: 'auto', block: 'center' });
                          
                          // Remove flash after animation (same timing as todos: 1.2s)
                          setTimeout(() => {
                            row.classList.remove('bg-green-100');
                          }, 1200);
                          break;
                        }
                      }
                    }, 300); // Wait for category to load
                    break;
                  }
                }
              }
            },
            dismissible: true
          });
        });

        // Priority 11: Large individual items without vendors assigned
        const largestUnassignedItem = budgetItems
          .filter(item => !item.vendor && !item.isPaid && (item.projectedAmount || 0) > 500)
          .sort((a, b) => (b.projectedAmount || 0) - (a.projectedAmount || 0))[0];

        if (largestUnassignedItem && totalBudget > 0) {
          insights.push({
            id: 'budget-assign-vendor',
            type: 'suggestion',
            title: `Assign vendor for ${largestUnassignedItem.name}`,
            description: `Budget: $${(largestUnassignedItem.projectedAmount || 0).toLocaleString()}. Find and assign a vendor to track this expense.`,
            action: {
              label: 'Browse vendors',
              onClick: () => window.location.href = '/vendors'
            },
            dismissible: true
          });
        }

        // Priority 12: Spending pace warning (allocated but not spending)
        if (totalBudget > 0 && allocated > totalBudget * 0.7 && spent === 0 && daysUntilWedding < 60) {
          insights.push({
            id: 'budget-pace-warning',
            type: 'urgent',
            title: `$0 spent with ${daysUntilWedding} days left!`,
            description: `You've allocated $${allocated.toLocaleString()} but haven't started spending. Focus on booking your top vendors now.`,
            action: {
              label: 'Start booking',
              onClick: () => {
                // Navigate to largest category
                if (largestUnspentCategory) {
                  const vendorSuggestion = getVendorSuggestionForCategory(largestUnspentCategory.name, currentData?.weddingLocation);
                  if (vendorSuggestion) {
                    window.location.href = vendorSuggestion.url;
                  } else {
                    window.location.href = '/vendors';
                  }
                }
              }
            },
            dismissible: true
          });
        }

        // Priority 13: Items without payment deadlines
        const itemsWithoutDueDates = budgetItems.filter(item => !item.dueDate && !item.isPaid);
        
        if (itemsWithoutDueDates.length >= 3) {
          insights.push({
            id: 'budget-add-deadlines',
            type: 'suggestion',
            title: `${itemsWithoutDueDates.length} items need payment deadlines`,
            description: 'Add smart deadlines based on industry standards and your wedding timeline.',
            action: {
              label: 'Add Deadlines',
              onClick: () => {
                // Open chat with deadline suggestions
                const chatButton = document.querySelector('[title="Chat with Paige"]') as HTMLElement;
                if (chatButton) {
                  chatButton.click();
                  // Will be handled by chat logic
                }
              }
            },
            dismissible: true
          });
        }

        // Priority 14: Category over-allocation (>45% of budget)
        const oversizedCategories = categories.filter(cat => 
          totalBudget > 0 && (cat.allocatedAmount / totalBudget) > 0.45
        );

        if (oversizedCategories.length > 0) {
          const cat = oversizedCategories[0]; // Show the largest one
          const percent = Math.round((cat.allocatedAmount / totalBudget) * 100);
          
          insights.push({
            id: 'budget-category-oversized',
            type: 'urgent',
            title: `${cat.name} is ${percent}% of budget`,
            description: 'Industry average: 35-40%. Consider rebalancing to leave room for other important vendors.',
            action: {
              label: 'View Category',
              onClick: () => {
                const categoryButton = document.querySelector(`[data-category-name="${cat.name}"]`) as HTMLElement;
                if (categoryButton) categoryButton.click();
              }
            },
            dismissible: true
          });
        }

        // Priority 15: Missing gratuity category
        const hasGratuityCategory = categories.some(cat => 
          cat.name.toLowerCase().includes('gratuity') || 
          cat.name.toLowerCase().includes('tip') ||
          cat.name.toLowerCase().includes('service')
        );

        if (!hasGratuityCategory && totalBudget > 10000 && allocated > 5000) {
          const estimatedGratuities = Math.round(allocated * 0.15); // 15% of vendor costs
          
          insights.push({
            id: 'budget-missing-gratuities',
            type: 'urgent',
            title: 'Missing gratuity budget',
            description: `Vendor gratuities typically run 15-20% (~$${estimatedGratuities.toLocaleString()}). Add this to avoid last-minute surprises.`,
            action: {
              label: 'Add Gratuity Category',
              onClick: () => {
                // Dispatch custom event for budget page to handle
                window.dispatchEvent(new CustomEvent('paige-add-budget-category', {
                  detail: {
                    name: 'Gratuities & Tips',
                    allocatedAmount: estimatedGratuities,
                    color: '#FF6B6B'
                  }
                }));
              }
            },
            dismissible: true
          });
        }

        // Priority 16: Heavy payment month (multiple payments same date/month)
        const paymentsByMonth = budgetItems
          .filter(item => item.dueDate && !item.isPaid)
          .reduce((acc, item) => {
            try {
              let dueDate = item.dueDate;
              if (typeof dueDate === 'object' && 'toDate' in dueDate) {
                dueDate = dueDate.toDate();
              } else if (typeof dueDate === 'object' && 'seconds' in dueDate) {
                dueDate = new Date(dueDate.seconds * 1000);
              }
              const monthKey = `${new Date(dueDate).getFullYear()}-${new Date(dueDate).getMonth()}`;
              if (!acc[monthKey]) {
                acc[monthKey] = { items: [], total: 0, monthName: new Date(dueDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) };
              }
              acc[monthKey].items.push(item);
              acc[monthKey].total += item.projectedAmount || 0;
            } catch (e) {
              // Skip invalid dates
            }
            return acc;
          }, {} as Record<string, { items: any[], total: number, monthName: string }>);

        // Find month with highest payment concentration
        const heaviestMonth = Object.entries(paymentsByMonth)
          .filter(([_, data]) => data.items.length >= 3 || data.total > totalBudget * 0.25)
          .sort((a, b) => b[1].total - a[1].total)[0];

        if (heaviestMonth) {
          const [monthKey, monthData] = heaviestMonth;
          const monthPercent = Math.round((monthData.total / totalBudget) * 100);
          
          insights.push({
            id: 'budget-heavy-month',
            type: 'reminder',
            title: `Heavy spending in ${monthData.monthName}`,
            description: `$${monthData.total.toLocaleString()} due (${monthPercent}% of budget, ${monthData.items.length} payments). Plan your cashflow.`,
            action: {
              label: 'View Payments',
              onClick: () => {
                // Scroll to first item in this month
                const firstItem = monthData.items[0];
                const categoryButton = document.querySelector(`[data-category-name="${firstItem.categoryName}"]`) as HTMLElement;
                if (categoryButton) categoryButton.click();
              }
            },
            dismissible: true
          });
        }

        // Priority 17: Tax awareness (informational, not a category)
        const hasTaxCategory = categories.some(cat => 
          cat.name.toLowerCase().includes('tax') ||
          cat.name.toLowerCase().includes('fee')
        );

        if (!hasTaxCategory && totalBudget > 10000 && allocated > 5000) {
          // Estimate 8% sales tax on taxable items (venue, catering, rentals, etc.)
          const estimatedTax = Math.round(allocated * 0.08);
          
          insights.push({
            id: 'budget-tax-awareness',
            type: 'tip',
            title: 'Budget for tax & service fees',
            description: `Estimated tax: ~$${estimatedTax.toLocaleString()} (8%). Ask vendors if quotes include tax. If not, increase category budgets accordingly.`,
            // No action button - tax should be built into item amounts, not a separate category
            dismissible: true
          });
        }

        // Priority 18: Cross-agent - Budget-Todo sync (if todos available)
        if (currentData?.totalTasks !== undefined && currentData.totalTasks > 0) {
          const unassignedBudgetCategories = categories.filter(cat => {
            if (!cat.name) return false;
            const name = cat.name.toLowerCase();
            return (name.includes('venue') || name.includes('photography') || name.includes('floral') || name.includes('entertainment')) && cat.spentAmount === 0;
          });

          if (unassignedBudgetCategories.length > 0) {
            insights.push({
              id: 'budget-todo-sync',
              type: 'tip',
              title: `${unassignedBudgetCategories.length} major categories not yet booked`,
              description: `Do you have corresponding tasks to book these vendors? Make sure your to-do list matches your budget categories.`,
              action: {
                label: 'View to-dos',
                onClick: () => window.location.href = '/todo'
              },
              dismissible: true
            });
          }
        }
      }

      // ✨ Timeline context - day-of coordination & cross-agent sync
      if (context === 'timeline') {
        const timeline = currentData?.timeline || [];
        const todoItems = currentData?.todoItems || [];
        const budgetCategories = currentData?.budgetCategories || [];
        const budgetItems = currentData?.budgetItems || [];
        const ceremonyTime = currentData?.ceremonyTime;
        const daysUntilWedding = currentData?.daysUntilWedding || 365;

        // Debug: Log timeline data to understand structure
        const vendorEventCheck = timeline.map((e: any) => ({
          title: e.title,
          hasVendorName: !!e.vendorName,
          hasContact: !!(e.vendorContact && e.vendorContact.trim()),
          isVendorKeyword: (e.title?.toLowerCase() || '').includes('photo') || 
                          (e.title?.toLowerCase() || '').includes('makeup') ||
                          (e.title?.toLowerCase() || '').includes('hair')
        }));

        // Priority 1: Missing buffer time between consecutive events
        if (timeline.length >= 2) {
          const sortedEvents = [...timeline].sort((a: any, b: any) => {
            const aTime = a.startTime?.toDate ? a.startTime.toDate() : new Date(a.startTime);
            const bTime = b.startTime?.toDate ? b.startTime.toDate() : new Date(b.startTime);
            return aTime.getTime() - bTime.getTime();
          });

          let eventsNeedingBuffers: any[] = [];
          for (let i = 0; i < sortedEvents.length - 1; i++) {
            const currentEvent = sortedEvents[i];
            const nextEvent = sortedEvents[i + 1];
            
            const currentEnd = currentEvent.endTime?.toDate ? currentEvent.endTime.toDate() : new Date(currentEvent.endTime);
            const nextStart = nextEvent.startTime?.toDate ? nextEvent.startTime.toDate() : new Date(nextEvent.startTime);
            const gap = (nextStart.getTime() - currentEnd.getTime()) / (1000 * 60); // minutes
            
            if (gap < 15 && !currentEvent.title?.toLowerCase().includes('buffer')) {
              eventsNeedingBuffers.push({ current: currentEvent.title, next: nextEvent.title });
            }
          }

          if (eventsNeedingBuffers.length > 0) {
            insights.push({
              id: 'timeline-missing-buffers',
              type: 'urgent',
              title: `${eventsNeedingBuffers.length} event${eventsNeedingBuffers.length > 1 ? 's need' : ' needs'} buffer time`,
              description: `Add 15-30min between ${eventsNeedingBuffers[0].current} and ${eventsNeedingBuffers[0].next} to prevent delays.`,
              action: {
                label: 'Add buffers',
                onClick: () => {
                  if (openChatWithMessage) {
                    openChatWithMessage('Add buffer time between tight events');
                  }
                }
              },
              dismissible: true
            });
          }
        }

        // Priority 2: Events missing vendor contacts
        const eventsWithoutContacts = timeline.filter((event: any) => {
          const title = event.title?.toLowerCase() || '';
          const missingContact = !event.vendorContact || event.vendorContact.trim() === '';
          
          // Check if this is a vendor-related event (should have contact info)
          const isVendorEvent = 
            title.includes('photo') || title.includes('video') || title.includes('videographer') ||
            title.includes('dj') || title.includes('music') || title.includes('band') ||
            title.includes('floral') || title.includes('flower') || title.includes('florist') ||
            title.includes('catering') || title.includes('caterer') || title.includes('food') ||
            title.includes('makeup') || title.includes('hair') || title.includes('beauty') ||
            title.includes('transport') || title.includes('driver') ||
            title.includes('coordinator') || title.includes('planner') ||
            title.includes('officiant') || title.includes('minister') ||
            event.vendorName; // OR if vendorName is explicitly set
          
          return isVendorEvent && missingContact;
        });

        if (eventsWithoutContacts.length > 0) {
          // Check if user has contacts in /messages
          const userContacts = currentData?.contacts || [];
          const hasContacts = userContacts.length > 0;
          
          insights.push({
            id: 'timeline-missing-contacts',
            type: 'reminder',
            title: `${eventsWithoutContacts.length} event${eventsWithoutContacts.length > 1 ? 's' : ''} missing vendor contact`,
            description: hasContacts 
              ? `Add vendor contacts from your ${userContacts.length} saved contact${userContacts.length > 1 ? 's' : ''}.`
              : `Add contact info for ${eventsWithoutContacts[0].title} so they know when to arrive.`,
            action: {
              label: hasContacts ? 'Select contact' : 'Add contacts',
              onClick: () => {
                if (openChatWithMessage) {
                  openChatWithMessage(hasContacts 
                    ? 'Show me my vendor contacts'
                    : 'Help me add vendor contacts to timeline events');
                }
              }
            },
            dismissible: true
          });
        }

        // Priority 3: Missing vendors on timeline (cross-agent with budget)
        const vendorBudgetCategories = budgetCategories.filter(cat => {
          const name = cat.name?.toLowerCase() || '';
          return name.includes('photo') || name.includes('video') || name.includes('music') || 
                 name.includes('dj') || name.includes('band') || name.includes('floral') ||
                 name.includes('entertainment') || name.includes('catering');
        });

        const timelineEventNames = timeline.map((event: any) => event.title?.toLowerCase() || '');
        
        // Check each vendor category individually to provide specific insights
        vendorBudgetCategories.forEach(cat => {
          const catName = cat.name?.toLowerCase() || '';
          const isOnTimeline = timelineEventNames.some(eventName => 
            eventName.includes(catName) || 
            (catName.includes('photo') && eventName.includes('photo')) ||
            (catName.includes('music') && (eventName.includes('music') || eventName.includes('dj'))) ||
            (catName.includes('entertainment') && (eventName.includes('music') || eventName.includes('dj') || eventName.includes('band'))) ||
            (catName.includes('floral') && (eventName.includes('floral') || eventName.includes('flower')))
          );
          
          if (!isOnTimeline) {
            insights.push({
              id: `timeline-missing-vendor-${cat.id || cat.name}`,
              type: 'urgent',
              title: `${cat.name} not on timeline`,
              description: `You budgeted $${cat.allocatedAmount?.toLocaleString() || 0} but they're not scheduled.`,
              action: {
                label: 'View budget item',
                onClick: () => {
                  // Navigate to budget page and highlight this category
                  window.location.href = '/budget';
                  setTimeout(() => {
                    const categoryButton = document.querySelector(`[data-category-name="${cat.name}"]`) as HTMLElement;
                    if (categoryButton) categoryButton.click();
                  }, 500);
                }
              },
              dismissible: true
            });
          }
        });

        // Priority 4: Incomplete vendor todos (cross-agent with todos)
        const vendorTodos = todoItems.filter((todo: any) => {
          if (todo.isCompleted) return false;
          const name = todo.name?.toLowerCase() || '';
          return name.includes('book') || name.includes('confirm') || name.includes('vendor');
        });

        if (vendorTodos.length > 0 && daysUntilWedding < 60) {
          insights.push({
            id: 'timeline-incomplete-vendor-todos',
            type: 'reminder',
            title: `${vendorTodos.length} vendor task${vendorTodos.length > 1 ? 's' : ''} incomplete`,
            description: `Confirm vendors before finalizing your timeline. ${daysUntilWedding} days left!`,
            action: {
              label: 'View tasks',
              onClick: () => window.location.href = '/todo'
            },
            dismissible: true
          });
        }

        // Priority 5: Empty timeline
        if (timeline.length === 0) {
          insights.push({
            id: 'timeline-empty',
            type: 'tip',
            title: 'Start your day-of timeline',
            description: 'Add events like ceremony, cocktail hour, and reception to coordinate your big day.',
            action: {
              label: 'Get suggestions',
              onClick: () => {
                if (openChatWithMessage) {
                  openChatWithMessage('Suggest events for my timeline');
                }
              }
            },
            dismissible: true
          });
        }

        // Priority 6: Timeline complete
        if (timeline.length >= 5 && daysUntilWedding < 30) {
          insights.push({
            id: 'timeline-ready',
            type: 'celebration',
            title: 'Your timeline is ready! 🎉',
            description: `${timeline.length} events scheduled. Share with your wedding party and vendors.`,
            dismissible: true
          });
        }

        // Priority 7: Ceremony event not found
        const hasCeremonyEvent = timeline.some((event: any) => 
          event.title?.toLowerCase().includes('ceremony')
        );
        
        if (!hasCeremonyEvent && daysUntilWedding < 90 && timeline.length > 0) {
          insights.push({
            id: 'timeline-ceremony-event',
            type: 'tip',
            title: 'Add your ceremony event',
            description: 'The ceremony is the most important event! Add it to coordinate the entire day.',
            action: {
              label: 'Add ceremony',
              onClick: () => {
                if (openChatWithMessage) {
                  openChatWithMessage('Help me add ceremony to my timeline');
                }
              }
            },
            dismissible: true
          });
        }

        // Priority 8: Event descriptions missing
        const eventsWithoutDescriptions = timeline.filter((event: any) => 
          !event.description || event.description.trim() === ''
        );

        if (eventsWithoutDescriptions.length > 2) {
          insights.push({
            id: 'timeline-missing-descriptions',
            type: 'tip',
            title: `${eventsWithoutDescriptions.length} events need details`,
            description: 'Add descriptions to help vendors and wedding party know what to expect.',
            action: {
              label: 'Add details',
              onClick: () => {
                if (openChatWithMessage) {
                  openChatWithMessage('Help me add descriptions to my timeline events');
                }
              }
            },
            dismissible: true
          });
        }

        // Priority 9: Timing conflicts (events overlapping)
        if (timeline.length >= 2) {
          const sortedEvents = [...timeline].sort((a: any, b: any) => {
            const aTime = a.startTime?.toDate ? a.startTime.toDate() : new Date(a.startTime);
            const bTime = b.startTime?.toDate ? b.startTime.toDate() : new Date(b.startTime);
            return aTime.getTime() - bTime.getTime();
          });

          let conflicts: any[] = [];
          for (let i = 0; i < sortedEvents.length - 1; i++) {
            const currentEvent = sortedEvents[i];
            const nextEvent = sortedEvents[i + 1];
            
            const currentEnd = currentEvent.endTime?.toDate ? currentEvent.endTime.toDate() : new Date(currentEvent.endTime);
            const nextStart = nextEvent.startTime?.toDate ? nextEvent.startTime.toDate() : new Date(nextEvent.startTime);
            
            if (currentEnd > nextStart) {
              conflicts.push({ event1: currentEvent.title, event2: nextEvent.title });
            }
          }

          if (conflicts.length > 0) {
            insights.push({
              id: 'timeline-conflicts',
              type: 'urgent',
              title: `${conflicts.length} timing conflict${conflicts.length > 1 ? 's' : ''}!`,
              description: `${conflicts[0].event1} overlaps with ${conflicts[0].event2}. Adjust timing.`,
              action: {
                label: 'Fix conflicts',
                onClick: () => {
                  if (openChatWithMessage) {
                    openChatWithMessage('Check for timing conflicts in my timeline');
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

