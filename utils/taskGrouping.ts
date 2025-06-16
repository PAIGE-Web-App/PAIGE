import { TodoItem } from '../types/todo';

// Helper to get the group for a given deadline
export function getTaskGroup(deadline?: Date | null): string {
  if (!deadline || !(deadline instanceof Date) || isNaN(deadline.getTime())) {
    return 'No date yet';
  }
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const d = new Date(deadline.getFullYear(), deadline.getMonth(), deadline.getDate());
  // Always compare only the date part (ignore time)
  const diffDays = Math.floor((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return 'Overdue';
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays <= 7) return 'This Week';
  if (diffDays <= 14) return 'Next Week';
  if (diffDays <= 30) return 'This Month';
  if (diffDays <= 60) return 'Next Month';
  return 'Later';
}

// Group tasks by deadline
export function groupTasks(tasks: TodoItem[]): { [key: string]: TodoItem[] } {
  const groups: { [key: string]: TodoItem[] } = {};
  
  tasks.forEach((item) => {
    const group = getTaskGroup(item.deadline);
    if (!groups[group]) groups[group] = [];
    groups[group].push(item);
  });

  // Sort tasks within each group by deadline
  Object.keys(groups).forEach(group => {
    groups[group].sort((a, b) => {
      if (!a.deadline) return 1; // Move items without deadline to the end
      if (!b.deadline) return -1;
      // Compare only the date part
      const aDate = a.deadline ? new Date(a.deadline.getFullYear(), a.deadline.getMonth(), a.deadline.getDate()) : null;
      const bDate = b.deadline ? new Date(b.deadline.getFullYear(), b.deadline.getMonth(), b.deadline.getDate()) : null;
      if (!aDate) return 1;
      if (!bDate) return -1;
      return aDate.getTime() - bDate.getTime();
    });
  });

  // Define the order of groups
  const groupOrder = [
    'Overdue',
    'Today',
    'Tomorrow',
    'This Week',
    'Next Week',
    'This Month',
    'Next Month',
    'Later',
    'No date yet'
  ];

  // Create a new object with ordered groups
  const orderedGroups: { [key: string]: TodoItem[] } = {};
  groupOrder.forEach(group => {
    if (groups[group]) {
      orderedGroups[group] = groups[group];
    }
  });

  return orderedGroups;
}

// Get group description
export function getGroupDescription(group: string): string {
  switch (group) {
    case 'No date yet':
      return 'for tasks without a deadline';
    case 'Overdue':
      return 'for tasks past their deadline';
    case 'Today':
      return 'for tasks due today';
    case 'Tomorrow':
      return 'for tasks due tomorrow';
    case 'This Week':
      return 'for tasks due within the next 7 days';
    case 'Next Week':
      return 'for tasks due within 8-14 days';
    case 'This Month':
      return 'for tasks due within 15-30 days';
    case 'Next Month':
      return 'for tasks due within 31-60 days';
    case 'Later':
      return 'for tasks due beyond 60 days';
    default:
      return '';
  }
}

// Helper to get a representative date for a group
export function getDateForGroup(group: string): Date {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  switch (group) {
    case 'Today':
      return today;
    case 'Tomorrow':
      return new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
    case 'This Week':
      return new Date(today.getFullYear(), today.getMonth(), today.getDate() + 3); // Middle of the week
    case 'Next Week':
      return new Date(today.getFullYear(), today.getMonth(), today.getDate() + 10); // Middle of next week
    case 'This Month':
      return new Date(today.getFullYear(), today.getMonth(), today.getDate() + 20);
    case 'Next Month':
      return new Date(today.getFullYear(), today.getMonth(), today.getDate() + 45);
    case 'Later':
      return new Date(today.getFullYear(), today.getMonth(), today.getDate() + 90);
    default:
      return today;
  }
} 