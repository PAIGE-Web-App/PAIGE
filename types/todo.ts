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
  // New assignment fields
  assignedTo?: string[] | null; // array of userIds of assignees
  assignedBy?: string | null; // userId of who assigned it
  assignedAt?: Date | null; // when it was assigned
  notificationRead?: boolean; // for tracking if assignee has seen the notification
}

export interface TodoList {
  id: string;
  name: string;
  order?: number;
  userId: string;
  createdAt: Date;
  orderIndex: number;
} 