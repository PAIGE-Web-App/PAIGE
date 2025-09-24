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

// Group tasks by deadline with hybrid display support
export function groupTasks(tasks: TodoItem[]): { [key: string]: TodoItem[] } {
  const groups: { [key: string]: TodoItem[] } = {};
  
  // Check if this is a template-based list (majority of items have planning phases and no deadlines)
  const itemsWithPlanningPhases = tasks.filter(item => item.planningPhase && item.planningPhase !== 'Planning Phase');
  const itemsWithoutDeadlines = tasks.filter(item => !item.deadline);
  const isTemplateList = tasks.length > 0 && 
    itemsWithPlanningPhases.length > 0 && // Has some planning phases
    itemsWithPlanningPhases.length >= tasks.length * 0.7; // At least 70% have planning phases


  if (isTemplateList) {
    // Hybrid grouping: items with deadlines go to time-based groups, items with planning phases go to planning phase groups
    tasks.forEach((item) => {
      if (item.deadline) {
        // Item has a deadline - use time-based grouping
        const group = getTaskGroup(item.deadline);
        if (!groups[group]) groups[group] = [];
        groups[group].push(item);
      } else if (item.planningPhase && item.planningPhase !== 'Planning Phase') {
        // Item has a planning phase - use planning phase grouping
        const group = item.planningPhase;
        if (!groups[group]) groups[group] = [];
        groups[group].push(item);
      } else {
        // Fallback to "No date yet" or "Planning Phase"
        const group = item.planningPhase || 'No date yet';
        if (!groups[group]) groups[group] = [];
        groups[group].push(item);
      }
    });

    // Define the order of groups (time-based first, then planning phases)
    const timeBasedOrder = [
      'Overdue', 'Today', 'Tomorrow', 'This Week', 'Next Week', 'This Month', 'Next Month', 'Later', 'No date yet'
    ];
            const planningPhaseOrder = [
              // Venue Selection phases (should come first as prerequisite)
              'Discover & Shortlist',
              'Inquire (from your Shortlist)',
              'Tour Like a Pro',
              'Lock It In',
              // Full Wedding Checklist phases
              'Kickoff (ASAP)',
              'Lock Venue + Date (early)',
              'Core Team (9–12 months out)',
              'Looks + Attire (8–10 months out)',
              'Food + Flow (6–8 months out)',
              'Paper + Details (4–6 months out)',
              'Send + Finalize (2–4 months out)',
              'Tighten Up (4–6 weeks out)',
              'Week Of',
              'Day Before',
              'Wedding Day',
              'After',
              'Tiny "Don\'t-Forget" Wins',
              'Planning Phase'
            ];

    // Sort tasks within each group by deadline (for time-based groups) or by original order (for planning phase groups)
    Object.keys(groups).forEach(group => {
      const isTimeBasedGroup = timeBasedOrder.includes(group);
      
      if (isTimeBasedGroup) {
        // Sort time-based groups by deadline (including time)
        groups[group].sort((a, b) => {
          if (!a.deadline) return 1; // Move items without deadline to the end
          if (!b.deadline) return -1;
          // Compare the full datetime (date + time)
          return a.deadline.getTime() - b.deadline.getTime();
        });
      }
      // For planning phase groups, maintain original order (no sorting needed)
    });

    // Create a new object with ordered groups
    const orderedGroups: { [key: string]: TodoItem[] } = {};
    
    // Add time-based groups first
    timeBasedOrder.forEach(group => {
      if (groups[group]) {
        orderedGroups[group] = groups[group];
      }
    });
    
    // Add planning phase groups
    planningPhaseOrder.forEach(group => {
      if (groups[group]) {
        orderedGroups[group] = groups[group];
      }
    });

    return orderedGroups;
  } else {
    // Use regular deadline-based grouping for non-template lists
    tasks.forEach((item) => {
      const group = getTaskGroup(item.deadline);
      if (!groups[group]) groups[group] = [];
      groups[group].push(item);
    });

    // Sort tasks within each group by deadline (including time)
    Object.keys(groups).forEach(group => {
      groups[group].sort((a, b) => {
        if (!a.deadline) return 1; // Move items without deadline to the end
        if (!b.deadline) return -1;
        // Compare the full datetime (date + time)
        return a.deadline.getTime() - b.deadline.getTime();
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
}

// Get hybrid group display name (time-based + planning phase context)
export function getHybridGroupDisplayName(group: string, items: TodoItem[]): string {
  // Only add planning phase context for planning phase groups, not time-based groups
  const isTimeBasedGroup = ['Overdue', 'Today', 'Tomorrow', 'This Week', 'Next Week', 'This Month', 'Next Month', 'Later', 'No date yet'].includes(group);
  
  if (isTimeBasedGroup) {
    // For time-based groups, just return the group name without planning phase context
    return group;
  }
  
  // For planning phase groups, just return the group name (no need to add planning phase context since the group name IS the planning phase)
  return group;
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
    // Venue Selection phase descriptions
    case 'Discover & Shortlist':
      return 'for venue research and shortlisting';
    case 'Inquire (from your Shortlist)':
      return 'for reaching out to shortlisted venues';
    case 'Tour Like a Pro':
      return 'for venue tours and evaluations';
    case 'Lock It In':
      return 'for final venue selection and booking';
            // Planning phase descriptions
            case 'Kickoff (ASAP)':
              return 'for initial planning and foundation setting';
            case 'Lock Venue + Date (early)':
              return 'for venue selection and date confirmation';
            case 'Core Team (9–12 months out)':
              return 'for booking key vendors and building your team';
            case 'Looks + Attire (8–10 months out)':
              return 'for wedding party and attire planning';
            case 'Food + Flow (6–8 months out)':
              return 'for catering, rentals, and timeline planning';
            case 'Paper + Details (4–6 months out)':
              return 'for stationery and final vendor bookings';
            case 'Send + Finalize (2–4 months out)':
              return 'for invitations and final confirmations';
            case 'Tighten Up (4–6 weeks out)':
              return 'for final preparations and coordination';
            case 'Week Of':
              return 'for last-minute details and organization';
            case 'Day Before':
              return 'for rehearsal and final preparations';
            case 'Wedding Day':
              return 'for your special day execution';
            case 'After':
              return 'for post-wedding wrap-up and thank-yous';
            case 'Tiny "Don\'t-Forget" Wins':
              return 'for often-overlooked important details';
    case 'Planning Phase':
      return 'for general planning tasks';
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