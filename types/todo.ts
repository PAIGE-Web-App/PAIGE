// Shared Todo types for the app

export interface TodoItem {
  id: string;
  name: string;
  deadline?: Date | null;
  startDate?: Date | null;
  endDate?: Date | null;
  note?: string | null;
  category?: string | null;
  contactId?: string | null;
  isCompleted: boolean;
  userId: string;
  createdAt: Date;
  orderIndex: number;
  listId: string;
  completedAt?: Date | null;
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