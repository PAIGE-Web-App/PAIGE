// Shared Todo types for the app

export interface TodoItem {
  id: string;
  name: string;
  deadline?: Date;
  startDate?: Date;
  endDate?: Date;
  note?: string;
  category?: string;
  contactId?: string;
  isCompleted: boolean;
  userId: string;
  createdAt: Date;
  orderIndex: number;
  listId: string;
  completedAt?: Date;
  justUpdated?: boolean;
}

export interface TodoList {
  id: string;
  name: string;
  order?: number;
  userId: string;
  createdAt: Date;
  orderIndex: number;
} 