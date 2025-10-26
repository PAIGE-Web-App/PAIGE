"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Lightbulb, CheckCircle, AlertTriangle, Clock, Sparkles, X, MessageCircle, Send, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface PaigeInsight {
  id: string;
  type: 'tip' | 'urgent' | 'suggestion' | 'celebration' | 'reminder';
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  dismissible?: boolean;
  context?: string; // Which page/section this applies to
}

interface PaigeContextualAssistantProps {
  context?: 'todo' | 'dashboard' | 'vendors' | 'budget' | 'messages';
  currentData?: {
    overdueTasks?: number;
    upcomingDeadlines?: number;
    completedTasks?: number;
    totalTasks?: number;
    daysUntilWedding?: number;
    selectedList?: string; // Track which list is selected
    selectedListId?: string | null; // Track list ID for filtering
    weddingLocation?: string; // User's wedding location
    todoItems?: Array<{
      id: string;
      name: string;
      category?: string;
      isCompleted: boolean;
      deadline?: any;
      note?: string;
      listId?: string | null; // Track which list each todo belongs to
    }>;
  };
  className?: string;
}

const InsightIcon: React.FC<{ type: PaigeInsight['type'] }> = React.memo(({ type }) => {
  switch (type) {
    case 'urgent': return <AlertTriangle className="w-4 h-4 text-red-500" />;
    case 'tip': return <Lightbulb className="w-4 h-4 text-blue-500" />;
    case 'suggestion': return <Sparkles className="w-4 h-4 text-purple-500" />;
    case 'celebration': return <CheckCircle className="w-4 h-4 text-green-500" />;
    case 'reminder': return <Clock className="w-4 h-4 text-orange-500" />;
    default: return <Lightbulb className="w-4 h-4 text-gray-500" />;
  }
});
InsightIcon.displayName = 'InsightIcon';

// Memoized component to prevent unnecessary re-renders
const PaigeContextualAssistant = React.memo(function PaigeContextualAssistant({ 
  context = 'todo', 
  currentData,
  className = ""
}: PaigeContextualAssistantProps) {
  const { user } = useAuth();
  const [currentInsights, setCurrentInsights] = useState<PaigeInsight[]>([]);
  const [dismissedInsights, setDismissedInsights] = useState<Set<string>>(new Set());
  const [isVisible, setIsVisible] = useState(true);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true); // Default to showing suggestions
  const [chatMessages, setChatMessages] = useState<Array<{
    role: 'user' | 'assistant', 
    content: string,
    actions?: Array<{label: string, onClick: () => void}>
  }>>([]);
  const [chatInput, setChatInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatMessagesEndRef = useRef<HTMLDivElement>(null);

  // Memoize expensive todo computations to prevent re-calculations
  const todoComputations = useMemo(() => {
    const allTodoItems = currentData?.todoItems || [];
    const selectedList = currentData?.selectedList;
    const selectedListId = currentData?.selectedListId;
    const isSpecificList = selectedList && selectedList !== 'All To-Do Items' && selectedList !== 'Completed To-Do Items';
    
    // Filter todos based on selected list
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

  // Generate one actionable insight based on current page and data
  useEffect(() => {
    if (!user?.uid) return;

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
        if (currentData?.overdueTasks > 0) {
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
          // We're on a specific list but couldn't match any todos - provide general help
          insights.push({
            id: 'list-help',
            type: 'tip',
            title: `Working on: ${selectedList}`,
            description: 'Focus on completing the tasks in this list. Need help with vendors or planning?',
            action: {
              label: 'Chat with Paige',
              onClick: () => {
                setIsChatOpen(true);
                setShowSuggestions(false);
              }
            },
            dismissible: true
          });
        }
        
        // Priority 3: Specific list focus - provide targeted help
        if (isSpecificList && incompleteTodos.length === 1) {
          const todo = incompleteTodos[0];
          const hasDeadline = !!todo.deadline;
          
          // Get smart action based on todo name
          const getSmartAction = (todoName: string) => {
            const name = todoName.toLowerCase();
            const location = currentData?.weddingLocation || '';
            const locationParam = location ? `?location=${encodeURIComponent(location)}` : '';
            
            if (name.includes('venue')) return { label: 'Browse Venues', url: `/vendors/catalog/wedding_venue${locationParam}` };
            
            // Smart detection: "wedding band" could mean jewelry OR musicians
            if (name.includes('wedding band')) {
              // If mentions jewelry/rings/consultation = jewelry bands
              if (name.includes('jewelry') || name.includes('ring') || name.includes('consultation')) {
                return { label: 'Browse Jewelers', url: `/vendors/catalog/jewelry_store${locationParam}` };
              }
              // Otherwise = music bands
              return { label: 'Find Wedding Bands', url: `/vendors/catalog/band${locationParam}` };
            }
            
            if (name.includes('ring') || name.includes('jewelry')) return { label: 'Browse Jewelers', url: `/vendors/catalog/jewelry_store${locationParam}` };
            if (name.includes('photographer') || name.includes('photo')) return { label: 'Find Photographers', url: `/vendors/catalog/photographer${locationParam}` };
            if (name.includes('caterer') || name.includes('catering')) return { label: 'Find Caterers', url: `/vendors/catalog/caterer${locationParam}` };
            if (name.includes('florist') || name.includes('flower')) return { label: 'Browse Florists', url: `/vendors/catalog/florist${locationParam}` };
            if (name.includes('dress') || name.includes('attire')) return { label: 'Shop Attire', url: `/vendors/catalog/bridal_shop${locationParam}` };
            if (name.includes('dj')) return { label: 'Find DJs', url: `/vendors/catalog/dj${locationParam}` };
            if (name.includes('music') || name.includes('band')) return { label: 'Find Musicians', url: `/vendors/catalog/band${locationParam}` };
            if (name.includes('cake') || name.includes('baker')) return { label: 'Browse Bakeries', url: `/vendors/catalog/bakery${locationParam}` };
            return null;
          };
          
          const smartAction = getSmartAction(todo.name);
          
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
                    todoElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }
                }
              }
            },
            dismissible: true
          });
        }
        
        // Priority 3: Many todos without deadlines
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
                setIsChatOpen(true);
                setShowSuggestions(false);
                setChatMessages(prev => [...prev, {
                  role: 'assistant',
                  content: `I can help you add smart deadlines to your ${todosWithoutDeadlines.length} tasks! Based on your wedding date (${daysUntilWedding} days away), I'll suggest realistic timelines.\n\nHere are my recommendations:\n\n${todosWithoutDeadlines.map((todo, index) => {
                    const urgencyDays = Math.max(7, Math.floor(daysUntilWedding * (0.8 - (index * 0.15))));
                    return `• **${todo.name}** - ${urgencyDays} days from now`;
                  }).join('\n')}\n\nWould you like me to add these deadlines?`,
                  actions: [
                    {
                      label: 'Add Deadlines',
                      onClick: () => handleAddDeadlines(todosWithoutDeadlines, daysUntilWedding)
                    },
                    {
                      label: 'Different Timing',
                      onClick: () => setChatMessages(prev => [...prev, {
                        role: 'assistant',
                        content: 'What timing would work better for you? I can adjust the deadlines based on your preferences! 📅'
                      }])
                    }
                  ]
                }]);
              }
            },
            dismissible: true
          });
        }

        // Priority 3: Workflow optimization suggestions based on todo analysis
        if (incompleteTodos.length > 0) {
          
          // Analyze todo health and suggest optimizations
          
          // Critical: Too many todos with little time
          if (daysUntilWedding < 90 && totalTodos > 15) {
            insights.push({
              id: 'consolidate-todos',
              type: 'urgent',
              title: `${totalTodos} tasks with ${daysUntilWedding} days left`,
              description: 'Consider consolidating or removing non-essential tasks to reduce stress and focus on what matters most.',
              action: {
                label: 'Review & simplify',
                onClick: () => {
                  // Open chat with specific suggestion
                  setIsChatOpen(true);
                  setShowSuggestions(false);
                  setChatMessages(prev => [...prev, {
                    role: 'assistant',
                    content: `I noticed you have ${totalTodos} tasks with only ${daysUntilWedding} days until your wedding! Let's prioritize what's truly essential. Which tasks feel most stressful or could be simplified? I can help you consolidate similar tasks or identify what might be optional. 💜`
                  }]);
                }
              },
              dismissible: true
            });
          }
          // Medium priority: Stress reduction for tight timeline
          else if (daysUntilWedding < 60 && totalTodos > 8) {
            insights.push({
              id: 'stress-reduction',
              type: 'urgent',
              title: `${todosWithoutDeadlines.length} tasks need deadlines`,
              description: 'Adding deadlines helps you stay organized and reduces last-minute stress.',
              action: {
                label: 'Add deadlines',
                onClick: () => {
                  // Open chat with deadline suggestions
                  setIsChatOpen(true);
                  setShowSuggestions(false);
                  setChatMessages(prev => [...prev, {
                    role: 'assistant',
                    content: `I can help you add smart deadlines to your ${todosWithoutDeadlines.length} tasks! Based on your wedding date (${daysUntilWedding} days away), I'll suggest realistic timelines.\n\nHere are my recommendations:\n\n${todosWithoutDeadlines.map((todo, index) => {
                      const urgencyDays = Math.max(7, Math.floor(daysUntilWedding * (0.8 - (index * 0.15))));
                      return `• **${todo.name}** - ${urgencyDays} days from now`;
                    }).join('\n')}\n\nWould you like me to add these deadlines?`,
                    actions: [
                      {
                        label: 'Add Deadlines',
                        onClick: () => handleAddDeadlines(todosWithoutDeadlines, daysUntilWedding)
                      },
                      {
                        label: 'Different Timing',
                        onClick: () => setChatMessages(prev => [...prev, {
                          role: 'assistant',
                          content: 'What timing would work better for you? I can adjust the deadlines based on your preferences! 📅'
                        }])
                      }
                    ]
                  }]);
                }
              },
              dismissible: true
            });
          }
          // Workflow optimization: Similar tasks that could be grouped
          else if (totalTodos > 3) {
            insights.push({
              id: 'stress-reduction',
              type: 'tip',
              title: 'Final stretch - let\'s prioritize!',
              description: 'With 2 months left, focus on must-haves and delegate or simplify the rest.',
              action: {
                label: 'Get help prioritizing',
                onClick: () => {
                  setIsChatOpen(true);
                  setShowSuggestions(false);
                  setChatMessages(prev => [...prev, {
                    role: 'assistant',
                    content: `You're in the final stretch! 🎉 With ${daysUntilWedding} days left, let's focus on what truly matters. I can help you identify:\n\n• Must-have tasks (non-negotiable)\n• Nice-to-have tasks (can be simplified)\n• Tasks you could delegate or skip\n\nWhat feels most overwhelming right now?`
                  }]);
                }
              },
              dismissible: true
            });
          }
        }
        
        // Check for vendor grouping opportunity
        if (incompleteTodos.length > 3) {
          const vendorTasks = incompleteTodos.filter(todo => 
            todo.name.toLowerCase().includes('vendor') || 
            todo.name.toLowerCase().includes('photographer') ||
            todo.name.toLowerCase().includes('caterer') ||
            todo.name.toLowerCase().includes('florist')
          );
          
          if (vendorTasks.length >= 3) {
            insights.push({
                id: 'group-vendor-tasks',
                type: 'suggestion',
                title: 'Group your vendor tasks',
                description: `You have ${vendorTasks.length} vendor-related tasks. Grouping them could streamline your planning.`,
                action: {
                  label: 'Organize vendors',
                  onClick: () => {
                    setIsChatOpen(true);
                    setShowSuggestions(false);
                    setChatMessages(prev => [...prev, {
                      role: 'assistant',
                      content: `I noticed you have several vendor tasks! Here's how we could organize them better:\n\n• Create a "Vendor Outreach Day" to contact multiple vendors\n• Group similar vendor types together\n• Set up a vendor comparison system\n\nWould you like me to help reorganize these tasks? 🤝`
                    }]);
                  }
                },
                dismissible: true
              });
          }
        }

        
        // Celebration: Few tasks remaining
        if (incompleteTodos.length > 0 && incompleteTodos.length <= 3) {
            insights.push({
              id: 'encourage-progress',
              type: 'celebration',
              title: 'You\'re doing great!',
              description: `Only ${totalTodos} ${totalTodos === 1 ? 'task' : 'tasks'} left. You've got this! 🎉`,
              dismissible: true
            });
        }
        
        // Priority 5: Upcoming deadlines this week
        if (currentData?.upcomingDeadlines > 0) {
          insights.push({
            id: 'upcoming-deadlines',
            type: 'reminder',
            title: `${currentData.upcomingDeadlines} deadline${currentData.upcomingDeadlines > 1 ? 's' : ''} this week`,
            description: 'Get ahead of these tasks before they become overdue.',
            action: {
              label: 'View upcoming',
              onClick: () => {
                const filterButton = document.querySelector('[data-filter="upcoming"]') as HTMLElement;
                if (filterButton) filterButton.click();
                else window.location.hash = '#upcoming';
              }
            },
            dismissible: true
          });
        }
        
        // Priority 6: Completed specific list (all tasks in this list are complete)
        if (isSpecificList && relevantTodos.length > 0 && incompleteTodos.length === 0 && relevantTodos.every(todo => todo.isCompleted)) {
          insights.push({
            id: 'empty-list',
            type: 'celebration',
            title: `${selectedList} is complete! 🎉`,
            description: 'All tasks for this category are done. Want to add more or focus on other areas?',
            action: {
              label: 'View all tasks',
              onClick: () => {
                // Click "All To-Do Items" to see all tasks
                const allTodosButton = document.querySelector('[data-list="all"]') as HTMLElement;
                if (allTodosButton) allTodosButton.click();
              }
            },
            dismissible: true
          });
        }
        
        // Priority 7: No tasks yet (global)
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
        
        // Priority 7: Final stretch advice removed - covered by stress reduction insight above
        
        // Priority 8: Celebrate good progress
        if (currentData?.completedTasks > 0 && currentData?.totalTasks > 0) {
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

        // Priority 4: Next priority task (but skip if already shown in Priority 3 single-task focus)
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
            
            // Get smart action based on todo name/category
            const getSmartAction = (todoName: string, category?: string) => {
              const name = todoName.toLowerCase();
              const location = currentData?.weddingLocation || '';
              const locationParam = location ? `?location=${encodeURIComponent(location)}` : '';
              
              // Smart detection: "wedding band" could mean jewelry OR musicians
              if (name.includes('wedding band')) {
                // If mentions jewelry/rings/consultation = jewelry bands
                if (name.includes('jewelry') || name.includes('ring') || name.includes('consultation')) {
                  return { label: 'Browse Jewelers', url: `/vendors/catalog/jewelry_store${locationParam}` };
                }
                // Otherwise = music bands
                return { label: 'Find Wedding Bands', url: `/vendors/catalog/band${locationParam}` };
              }
              
              if (name.includes('ring') || name.includes('jewelry')) {
                return { label: 'Browse Jewelers', url: `/vendors/catalog/jewelry_store${locationParam}` };
              }
              if (name.includes('venue') || name.includes('location')) {
                return { label: 'Browse Venues', url: `/vendors/catalog/wedding_venue${locationParam}` };
              }
              if (name.includes('photographer') || name.includes('photo')) {
                return { label: 'Find Photographers', url: `/vendors/catalog/photographer${locationParam}` };
              }
              if (name.includes('caterer') || name.includes('catering') || name.includes('food')) {
                return { label: 'Find Caterers', url: `/vendors/catalog/caterer${locationParam}` };
              }
              if (name.includes('florist') || name.includes('flower') || name.includes('floral')) {
                return { label: 'Browse Florists', url: `/vendors/catalog/florist${locationParam}` };
              }
              if (name.includes('dress') || name.includes('attire')) {
                return { label: 'Shop Attire', url: `/vendors/catalog/bridal_shop${locationParam}` };
              }
              if (name.includes('suit') || name.includes('tux')) {
                return { label: 'Browse Suits & Tuxes', url: `/vendors/catalog/suit_rental${locationParam}` };
              }
              if (name.includes('dj')) {
                return { label: 'Find DJs', url: `/vendors/catalog/dj${locationParam}` };
              }
              if (name.includes('music') || name.includes('band')) {
                return { label: 'Find Musicians', url: `/vendors/catalog/band${locationParam}` };
              }
              if (name.includes('cake') || name.includes('baker')) {
                return { label: 'Browse Bakeries', url: `/vendors/catalog/bakery${locationParam}` };
              }
              if (name.includes('budget') || name.includes('cost')) {
                return { label: 'View Budget', url: '/budget' };
              }
              if (name.includes('timeline') || name.includes('schedule')) {
                return { label: 'View Timeline', url: '/timeline' };
              }
              
              return { label: 'View task', url: null };
            };
            
            const smartAction = hasDeadline ? getSmartAction(targetTodo.name, targetTodo.category) : null;
            
            insights.push({
              id: 'next-task',
              type: isOverdue ? 'urgent' : 'tip',
              title: `Next up: ${targetTodo.name}`,
              description: hasDeadline 
                ? (isOverdue ? 'This task is overdue!' : `Due in ${daysUntilDeadline} day${daysUntilDeadline === 1 ? '' : 's'}`)
                : 'Consider adding a deadline to stay on track!',
              action: {
                label: hasDeadline ? smartAction.label : 'Add deadline',
                onClick: () => {
                  if (!hasDeadline) {
                    const todoElement = document.querySelector(`[data-todo-id="${targetTodo.id}"]`);
                    if (todoElement) {
                      const deadlineButton = todoElement.querySelector('[data-action="add-deadline"]') as HTMLElement;
                      if (deadlineButton) deadlineButton.click();
                    }
                  } else if (smartAction.url) {
                    window.location.href = smartAction.url;
                  } else {
                    // Scroll to the task
                    const todoElement = document.querySelector(`[data-todo-id="${targetTodo.id}"]`);
                    if (todoElement) {
                      todoElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
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
    // Only re-run when these specific values change (not entire currentData object)
    context,
    todoComputations,
    currentData?.overdueTasks,
    currentData?.upcomingDeadlines,
    currentData?.completedTasks,
    currentData?.totalTasks,
    currentData?.weddingLocation,
    user?.uid,
    dismissedInsights
    // Note: handleAddDeadlines is used inside insight actions but doesn't need to be a dependency
    // because it's defined as a stable useCallback and the actions are created fresh each time
  ]);

  // Auto-scroll chat to bottom when messages change
  useEffect(() => {
    if (chatMessagesEndRef.current) {
      chatMessagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages]);

  // Memoized dismiss function to prevent re-renders
  const dismissInsight = useCallback((insightId: string) => {
    setDismissedInsights(prev => new Set([...prev, insightId]));
  }, []);

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

  // Memoized handle add deadlines function
  const handleAddDeadlines = useCallback((todosWithoutDeadlines: any[], daysUntilWedding: number) => {
    setChatMessages(prev => [...prev, {
      role: 'assistant',
      content: `Perfect! I'll add smart deadlines to your tasks. Here's what I'm setting:\n\n${todosWithoutDeadlines.map((todo, index) => {
        const urgencyDays = Math.max(7, Math.floor(daysUntilWedding * (0.8 - (index * 0.15))));
        const deadline = new Date();
        deadline.setDate(deadline.getDate() + urgencyDays);
        
        // Trigger the deadline addition
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
        
        return `• **${todo.name}** - ${deadline.toLocaleDateString()}`;
      }).join('\n')}\n\nDeadlines added! This should help keep you organized and reduce stress. 📅✨`
    }]);
  }, []);

  // Memoized handle local commands function
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
  }, [chatInput, isLoading, handleLocalCommands, chatMessages, context, currentData]);

  // Memoized handle todo action function
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

       // Show minimized floating button
       if (!user?.uid || !isVisible) {
         const suggestionCount = currentInsights.length;
         
         return (
           <motion.div
             initial={{ scale: 0 }}
             animate={{ scale: 1 }}
             className="fixed bottom-12 right-12 z-30"
           >
             <button
               onClick={() => setIsVisible(true)}
               className="relative w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full shadow-lg hover:shadow-xl transition-shadow flex items-center justify-center group"
             >
               <Sparkles className="w-5 h-5 text-white group-hover:scale-110 transition-transform" />
               
               {/* Badge count for suggestions */}
               {suggestionCount > 0 && (
                 <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium shadow-sm">
                   {suggestionCount > 9 ? '9+' : suggestionCount}
                 </div>
               )}
             </button>
           </motion.div>
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
            <Sparkles className="w-3 h-3 text-white" />
          </div>
          <h3 className="text-sm font-semibold text-gray-800">Paige</h3>
        </div>
        <div className="flex items-center space-x-1">
          <button
            onClick={() => {
              if (!showSuggestions) {
                setShowSuggestions(true);
                setIsChatOpen(false); // Switch to suggestions mode
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
                setShowSuggestions(false); // Switch to chat mode
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
            <div className="space-y-3 mb-3">
              {currentInsights.map((insight, index) => (
                <motion.div
                  key={insight.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <div className="flex items-start space-x-2">
                    <InsightIcon type={insight.type} />
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm text-gray-900 mb-1">
                        {insight.title}
                      </h4>
                      <p className="text-xs text-gray-600 mb-2">
                        {insight.description}
                      </p>
                      {insight.action && (
                        <button
                          onClick={insight.action.onClick}
                          className="text-xs text-purple-600 hover:text-purple-700 font-medium hover:underline"
                        >
                          {insight.action.label}
                        </button>
                      )}
                    </div>
                    {insight.dismissible && (
                      <button
                        onClick={() => dismissInsight(insight.id)}
                        className="p-1 hover:bg-gray-100 rounded transition-colors"
                      >
                        <X className="w-3 h-3 text-gray-400" />
                      </button>
                    )}
                  </div>
                </motion.div>
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
                <div
                  key={index}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-lg px-3 py-2 text-xs leading-relaxed ${
                      message.role === 'user'
                        ? 'bg-purple-500 text-white'
                        : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    <div 
                      className="whitespace-pre-wrap"
                      dangerouslySetInnerHTML={{
                        __html: formatChatMessage(message.content)
                      }}
                    />
                    {/* Action buttons for assistant messages */}
                    {message.role === 'assistant' && message.actions && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {message.actions.map((action, actionIndex) => (
                          <button
                            key={actionIndex}
                            onClick={action.onClick}
                            className="px-3 py-1 bg-purple-500 text-white text-xs rounded hover:bg-purple-600 transition-colors"
                          >
                            {action.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
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
