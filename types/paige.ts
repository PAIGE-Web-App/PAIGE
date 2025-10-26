/**
 * Paige AI Assistant Types
 * Shared type definitions for the Paige contextual assistant
 */

export interface PaigeInsight {
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

export interface PaigeTodoItem {
  id: string;
  name: string;
  category?: string;
  isCompleted: boolean;
  deadline?: any;
  note?: string;
  listId?: string | null; // Track which list each todo belongs to
}

export interface PaigeCurrentData {
  overdueTasks?: number;
  upcomingDeadlines?: number;
  completedTasks?: number;
  totalTasks?: number;
  daysUntilWedding?: number;
  selectedList?: string; // Track which list is selected
  selectedListId?: string | null; // Track list ID for filtering
  weddingLocation?: string; // User's wedding location
  todoItems?: PaigeTodoItem[];
}

export interface PaigeContextualAssistantProps {
  context?: 'todo' | 'dashboard' | 'vendors' | 'budget' | 'messages';
  currentData?: PaigeCurrentData;
  className?: string;
}

export interface PaigeChatMessage {
  role: 'user' | 'assistant';
  content: string;
  actions?: Array<{
    label: string;
    onClick: () => void;
  }>;
}

export interface PaigeTodoComputations {
  allTodoItems: PaigeTodoItem[];
  selectedList?: string;
  selectedListId?: string | null;
  isSpecificList: boolean;
  relevantTodos: PaigeTodoItem[];
  incompleteTodos: PaigeTodoItem[];
  todosWithoutDeadlines: PaigeTodoItem[];
  totalTodos: number;
  daysUntilWedding: number;
}

export type PaigeContext = 'todo' | 'dashboard' | 'vendors' | 'budget' | 'messages';

export type PaigeInsightType = PaigeInsight['type'];

