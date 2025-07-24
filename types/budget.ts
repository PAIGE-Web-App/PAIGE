export interface BudgetItem {
  id?: string;
  categoryId: string;
  name: string;
  amount: number;
  notes?: string;
  isCustom: boolean;
  isCompleted: boolean;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  vendorId?: string;
  vendorName?: string;
  vendorPlaceId?: string;
}

export interface BudgetCategory {
  id?: string;
  name: string;
  allocatedAmount: number;
  spentAmount: number;
  orderIndex: number;
  userId: string;
  createdAt: Date;
  color?: string;
}

export interface BudgetRange {
  min: number;
  max: number;
}

// AI Generated Types
export interface AIGeneratedBudgetItem {
  name: string;
  amount: number;
  notes: string;
}

export interface AIGeneratedBudgetCategory {
  name: string;
  allocatedAmount: number;
  items: AIGeneratedBudgetItem[];
}

export interface AIGeneratedBudget {
  categories: AIGeneratedBudgetCategory[];
  totalAllocated: number;
}

export interface AIGeneratedTodoList {
  name: string;
  tasks: Array<{
    name: string;
    note: string;
    deadline: string;
    category: string;
  }>;
}

export interface IntegratedPlan {
  budget: AIGeneratedBudget;
  todoList: AIGeneratedTodoList;
  totalAllocated: number;
}

export interface BudgetRecommendation {
  id: string;
  userId: string;
  type: 'optimization' | 'category' | 'vendor' | 'todo';
  message: string;
  potentialSavings?: number;
  categoryId?: string;
  priority: 'high' | 'medium' | 'low';
  actionable: boolean;
  createdAt: Date;
} 