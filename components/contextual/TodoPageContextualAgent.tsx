/**
 * Todo Page Contextual Agent Integration
 * Example of how to integrate the contextual agent into existing pages
 */

'use client';

import React, { useEffect } from 'react';
import { usePageContextualInsights } from '@/hooks/useContextualAgent';
import ContextualInsightWidget, { ProactiveInsightWidget } from './ContextualInsightWidget';
import { CheckCircle, Clock, AlertTriangle } from 'lucide-react';

interface TodoPageContextualAgentProps {
  todoItems: any[];
  selectedList: any;
  userName?: string;
  daysUntilWedding?: number;
}

export default function TodoPageContextualAgent({
  todoItems,
  selectedList,
  userName,
  daysUntilWedding,
}: TodoPageContextualAgentProps) {
  const { insights, loading, generateInsights, dismissInsight, executeAction } = usePageContextualInsights('todo', {
    todoItems,
    selectedList,
    userName,
    daysUntilWedding,
  });

  // Regenerate insights when todo data changes (with debouncing)
  useEffect(() => {
    if (todoItems.length > 0) {
      const timeoutId = setTimeout(() => {
        generateInsights({
          todoItems,
          selectedList,
          userName,
          daysUntilWedding,
        });
      }, 2000); // 2 second delay to prevent rapid calls

      return () => clearTimeout(timeoutId);
    }
  }, [todoItems.length, selectedList?.id]);

  const handleActionClick = async (action: string) => {
    await executeAction(action);
  };

  const handleDismiss = (index: number) => {
    dismissInsight(index);
  };

  // Show proactive insights if there are urgent items
  const urgentInsights = insights.filter(insight => 
    insight.type === 'urgent' || insight.priority === 'high'
  );

  const opportunityInsights = insights.filter(insight => 
    insight.type === 'opportunity' || insight.type === 'optimization'
  );

  return (
    <>
      {/* Proactive urgent insights - appear automatically */}
      {urgentInsights.length > 0 && (
        <ProactiveInsightWidget
          insights={urgentInsights}
          onActionClick={handleActionClick}
          onDismiss={() => handleDismiss(0)}
        />
      )}

      {/* Contextual insights near todo list header */}
      {opportunityInsights.length > 0 && (
        <ContextualInsightWidget
          insights={opportunityInsights}
          triggerElement={
            <div className="inline-flex items-center space-x-2 px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm cursor-pointer hover:bg-purple-200 transition-colors">
              <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" />
              <span>Paige has insights</span>
            </div>
          }
          placement="bottom"
          onActionClick={handleActionClick}
          onDismiss={() => handleDismiss(0)}
        />
      )}

      {/* Loading indicator */}
      {loading && (
        <div className="fixed bottom-4 left-4 bg-white rounded-lg shadow-lg border border-gray-200 p-3 z-40">
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <div className="w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
            <span>Paige is analyzing...</span>
          </div>
        </div>
      )}
    </>
  );
}

/**
 * Contextual trigger for specific todo items
 * Shows insights when hovering over or focusing on specific todos
 */
export function TodoItemContextualTrigger({
  todoItem,
  children,
}: {
  todoItem: any;
  children: React.ReactNode;
}) {
  const [itemInsights, setItemInsights] = React.useState<any[]>([]);

  // Generate item-specific insights
  const generateItemInsights = React.useCallback((item: any) => {
    const insights = [];

    // Check if overdue
    if (item.deadline && new Date(item.deadline) < new Date() && !item.isCompleted) {
      insights.push({
        type: 'urgent',
        title: 'Task Overdue',
        description: `This task was due ${Math.ceil((Date.now() - new Date(item.deadline).getTime()) / (1000 * 60 * 60 * 24))} days ago. Consider updating the deadline or completing it.`,
        actions: [
          { label: 'Mark Complete', action: `complete-todo:${item.id}`, primary: true },
          { label: 'Update Deadline', action: `update-deadline:${item.id}` },
        ],
        priority: 'high',
        context: 'todo',
      });
    }

    // Check if high priority with no deadline
    if (item.priority === 'high' && !item.deadline) {
      insights.push({
        type: 'recommendation',
        title: 'Add Deadline',
        description: 'High priority tasks should have deadlines to ensure timely completion.',
        actions: [
          { label: 'Set Deadline', action: `set-deadline:${item.id}`, primary: true },
        ],
        priority: 'medium',
        context: 'todo',
      });
    }

    setItemInsights(insights);
  }, []);

  if (itemInsights.length === 0) {
    return <>{children}</>;
  }

  return (
    <ContextualInsightWidget
      insights={itemInsights}
      triggerElement={children}
      placement="right"
      onActionClick={async (action) => {
        // Handle item-specific actions
        console.log('Item action:', action);
      }}
    />
  );
}

/**
 * Smart todo suggestions based on current context
 */
export function SmartTodoSuggestions({
  currentTodos,
  weddingDate,
  weddingLocation,
}: {
  currentTodos: any[];
  weddingDate?: Date;
  weddingLocation?: string;
}) {
  const [suggestions, setSuggestions] = React.useState<any[]>([]);

  React.useEffect(() => {
    // Generate smart suggestions based on missing common todos
    const commonTodos = [
      'Book venue',
      'Book photographer',
      'Book caterer',
      'Send save the dates',
      'Order invitations',
      'Book florist',
      'Book DJ/band',
      'Book hair and makeup',
      'Choose wedding dress',
      'Plan bachelor/bachelorette party',
    ];

    const existingTodoNames = currentTodos.map(todo => todo.name.toLowerCase());
    const missingSuggestions = commonTodos.filter(suggestion => 
      !existingTodoNames.some(existing => existing.includes(suggestion.toLowerCase()))
    );

    if (missingSuggestions.length > 0) {
      setSuggestions([{
        type: 'recommendation',
        title: 'Missing Common Tasks',
        description: `Based on typical wedding planning, you might want to add: ${missingSuggestions.slice(0, 3).join(', ')}`,
        actions: [
          { label: 'Add Suggestions', action: 'add-common-todos', primary: true },
          { label: 'See All', action: 'show-all-suggestions' },
        ],
        priority: 'low',
        context: 'todo',
      }]);
    }
  }, [currentTodos]);

  if (suggestions.length === 0) return null;

  return (
    <div className="mb-4">
      <ContextualInsightWidget
        insights={suggestions}
        triggerElement={
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 cursor-pointer hover:bg-blue-100 transition-colors">
            <div className="flex items-center space-x-2 text-blue-700">
              <CheckCircle className="w-4 h-4" />
              <span className="text-sm font-medium">💡 Paige suggests adding common wedding tasks</span>
            </div>
          </div>
        }
        placement="bottom"
        onActionClick={(action) => {
          console.log('Suggestion action:', action);
        }}
      />
    </div>
  );
}
