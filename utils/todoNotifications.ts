// utils/todoNotifications.ts

/**
 * Send notification for todo item updates to assigned users
 */
export const sendTodoUpdateNotification = async (
  userId: string,
  todoId: string,
  todoName: string,
  action: 'assigned' | 'updated' | 'completed',
  assignedBy: string,
  assignedTo: string[]
) => {
  // Don't send notifications if no assignees or only self-assigned
  if (!assignedTo || assignedTo.length === 0) return;

  // Send notifications for each assignee (except self)
  for (const assigneeId of assignedTo) {
    // Skip if assigning to self
    if (assigneeId === userId) continue;

    // Only send notifications for partner or planner
    if (assigneeId === 'partner' || assigneeId === 'planner') {
      try {
        await fetch('/api/notifications/todo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            todoId,
            todoName,
            action,
            assignedBy,
            assignedTo: assigneeId
          })
        });
      } catch (error) {
        console.error('Failed to send todo update notification:', error);
      }
    }
  }
}; 