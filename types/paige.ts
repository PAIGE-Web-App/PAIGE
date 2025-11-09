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
  // Todo context
  overdueTasks?: number;
  upcomingDeadlines?: number;
  completedTasks?: number;
  totalTasks?: number;
  daysUntilWedding?: number;
  selectedList?: string; // Track which list is selected
  selectedListId?: string | null; // Track list ID for filtering
  weddingLocation?: string; // User's wedding location
  todoItems?: PaigeTodoItem[];
  
  // Dashboard context
  hasBudget?: boolean;
  completedThisWeek?: number;
  
  // Budget context
  totalBudget?: number;
  allocated?: number;
  spent?: number;
  categoryCount?: number;
  categories?: Array<{
    name: string;
    allocatedAmount: number;
    spentAmount: number;
    items?: Array<{
      name: string;
      projectedAmount: number;
      spentAmount: number;
      dueDate?: any;
      isPaid?: boolean;
      vendor?: string;
    }>;
  }>;
  budgetItems?: Array<{
    name: string;
    categoryName: string;
    projectedAmount: number;
    spentAmount: number;
    dueDate?: any;
    isPaid?: boolean;
    vendor?: string;
  }>;
  budgetCategories?: any[]; // Full budget categories from AgentDataProvider
  categoryBudgets?: {
    photography?: number;
    venue?: number;
    catering?: number;
    // Add more as needed
  };
  
  // Timeline context
  timeline?: any[]; // Timeline events (current page)
  timelineData?: any[]; // All timeline documents from AgentDataProvider
  timelineName?: string;
  ceremonyTime?: string;
  guestCount?: number;
  contacts?: any[]; // ✨ NEW: User contacts for vendor info
  
  // Messages context
  totalContacts?: number;
  selectedContact?: {
    id: string;
    name: string;
    email: string;
    category: string;
  } | null;
  unreadMessages?: number;
  recentMessages?: Array<{
    id: string;
    subject: string;
    body: string;
    from: string;
    date: any;
    direction: 'sent' | 'received';
  }>;
}

export interface PaigeContextualAssistantProps {
  context?: 'todo' | 'dashboard' | 'vendors' | 'budget' | 'messages' | 'timeline'; // ✨ Added timeline
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

export type PaigeContext = 'todo' | 'dashboard' | 'vendors' | 'budget' | 'messages' | 'timeline'; // ✨ Added timeline

export type PaigeInsightType = PaigeInsight['type'];

