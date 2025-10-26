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

        // Priority 2: Final countdown (< 30 days)
        if (daysUntilWedding <= 30) {
          insights.push({
            id: 'dashboard-countdown',
            type: 'urgent',
            title: `Final countdown: ${daysUntilWedding} day${daysUntilWedding === 1 ? '' : 's'}!`,
            description: 'Focus on vendor confirmations, final payments, and day-of details.',
            action: {
              label: 'View priority tasks',
              onClick: () => window.location.href = '/todo'
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

        // Priority 6: Wedding planning milestones
        if (daysUntilWedding > 30 && daysUntilWedding <= 90 && totalTasks > 0) {
          insights.push({
            id: 'dashboard-milestone',
            type: 'tip',
            title: '3 months to go - key planning time!',
            description: 'Focus on finalizing vendors and confirming details.',
            action: {
              label: 'Check vendors',
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
          
          if (vendorSuggestion) {
            insights.push({
              id: 'budget-category-focus',
              type: 'suggestion',
              title: `${largestUnspentCategory.name}: $${largestUnspentCategory.allocatedAmount.toLocaleString()} (${categoryPercent}%)`,
              description: `Your largest budget allocation. ${vendorSuggestion.description}`,
              action: {
                label: vendorSuggestion.label,
                onClick: () => window.location.href = vendorSuggestion.url
              },
              dismissible: true
            });
          } else {
            // Generic suggestion if no vendor match
            insights.push({
              id: 'budget-category-focus',
              type: 'tip',
              title: `Focus on ${largestUnspentCategory.name} (${categoryPercent}%)`,
              description: `This is your largest budget allocation at $${largestUnspentCategory.allocatedAmount.toLocaleString()}.`,
              dismissible: true
            });
          }
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
              label: `View ${payment.categoryName}`,
              onClick: () => {
                // Find and click the category in the sidebar to switch to it
                const categoryButtons = document.querySelectorAll('[data-category-name]');
                for (const button of categoryButtons) {
                  if (button.textContent?.includes(payment.categoryName)) {
                    (button as HTMLElement).click();
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

