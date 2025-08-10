import React, { useState, useCallback, useMemo } from 'react';
import { UserPlus, User as UserIcon } from 'lucide-react';
import { TodoItem } from '@/types/todo';
import { Contact } from '@/types/contact';
import { User } from 'firebase/auth';
import UserAvatar from '../UserAvatar';
import TodoAssignmentModal from '../TodoAssignmentModal';
import { getAssigneeAvatarColor } from '@/utils/assigneeAvatarColors';

interface TodoItemAssignmentProps {
  todo: TodoItem;
  contacts: Contact[];
  currentUser: User | null;
  onAssign: (assigneeIds: string[], assigneeNames: string[], assigneeTypes: ('user' | 'contact')[]) => Promise<void>;
  disabled?: boolean;
}

const TodoItemAssignment: React.FC<TodoItemAssignmentProps> = ({
  todo,
  contacts,
  currentUser,
  onAssign,
  disabled = false
}) => {
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);

  // Memoized assignment info for performance
  const assignmentInfo = useMemo(() => {
    if (!todo.assignedTo || todo.assignedTo.length === 0) {
      return null;
    }

    const assignees = todo.assignedTo.map(assigneeId => {
      // Check if it's a contact
      const contact = contacts.find(c => c.id === assigneeId);
      if (contact) {
        return {
          id: contact.id,
          name: contact.name,
          type: 'contact' as const,
          avatar: null
        };
      }

      // Check if it's the current user
      if (currentUser && currentUser.uid === assigneeId) {
        return {
          id: currentUser.uid,
          name: currentUser.displayName || currentUser.email || 'You',
          type: 'user' as const,
          avatar: currentUser.photoURL
        };
      }

      // Unknown assignee
      return {
        id: assigneeId,
        name: 'Unknown User',
        type: 'user' as const,
        avatar: null
      };
    });

    return assignees;
  }, [todo.assignedTo, contacts, currentUser]);

  const handleAssignClick = useCallback(() => {
    if (!disabled) {
      setShowAssignmentModal(true);
    }
  }, [disabled]);

  const handleAssignmentComplete = useCallback(async (
    assigneeIds: string[], 
    assigneeNames: string[], 
    assigneeTypes: ('user' | 'contact')[]
  ) => {
    await onAssign(assigneeIds, assigneeNames, assigneeTypes);
    setShowAssignmentModal(false);
  }, [onAssign]);

  const handleCloseModal = useCallback(() => {
    setShowAssignmentModal(false);
  }, []);

  return (
    <>
      <div className="flex items-center gap-1">
        <UserPlus size={12} className="text-[#AB9C95]" />
        
        {assignmentInfo ? (
          <div className="flex items-center gap-1">
            {assignmentInfo.map((assignee, index) => (
              <div key={assignee.id} className="flex items-center gap-1">
                {assignee.avatar ? (
                  <UserAvatar
                    profileImageUrl={assignee.avatar}
                    userName={assignee.name}
                    size="sm"
                  />
                ) : (
                  <UserAvatar
                    userId={assignee.id}
                    userName={assignee.name}
                    size="sm"
                    avatarColor={assignee.id === currentUser?.uid
                      ? getAssigneeAvatarColor('user')
                      : getAssigneeAvatarColor(assignee.id)
                    }
                  />
                )}
                <span className="text-xs text-[#AB9C95]">
                  {assignee.name}
                </span>
                {index < assignmentInfo.length - 1 && (
                  <span className="text-xs text-[#AB9C95]">,</span>
                )}
              </div>
            ))}
            <button
              onClick={handleAssignClick}
              className="text-xs text-[#A85C36] hover:underline"
              disabled={disabled}
            >
              Edit
            </button>
          </div>
        ) : (
          <button
            onClick={handleAssignClick}
            className="text-xs text-[#A85C36] hover:underline"
            disabled={disabled}
          >
            Assign
          </button>
        )}
      </div>

      {/* Assignment Modal */}
      {showAssignmentModal && (
        <TodoAssignmentModal
          isOpen={showAssignmentModal}
          onClose={handleCloseModal}
          onAssign={handleAssignmentComplete}
          currentAssignees={assignmentInfo?.map(assignee => ({
            id: assignee.id,
            name: assignee.name,
            type: assignee.type
          })) || []}
          contacts={contacts}
        />
      )}
    </>
  );
};

export default TodoItemAssignment; 