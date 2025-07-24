import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, User, Users, Mail } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useUserProfileData } from '@/hooks/useUserProfileData';
import UserAvatar from './UserAvatar';
import { Contact } from '@/types/contact';

interface TodoAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAssign: (assigneeId: string, assigneeName: string, assigneeType: 'user' | 'contact') => void;
  currentAssignee?: {
    id: string;
    name: string;
    type: 'user' | 'contact';
  } | null;
  contacts?: Contact[];
}

interface AssigneeOption {
  id: string;
  name: string;
  type: 'user' | 'contact';
  email?: string;
  profileImageUrl?: string;
  avatarColor?: string;
}

const TodoAssignmentModal: React.FC<TodoAssignmentModalProps> = ({
  isOpen,
  onClose,
  onAssign,
  currentAssignee,
  contacts = [],
}) => {
  const { user } = useAuth();
  const { userName, partnerName, plannerName } = useUserProfileData();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAssignee, setSelectedAssignee] = useState<AssigneeOption | null>(null);

  // Build assignee options - only users, no contacts/vendors
  const assigneeOptions: AssigneeOption[] = [
    // Current user
    {
      id: user?.uid || '',
      name: userName || 'You',
      type: 'user',
      profileImageUrl: user?.photoURL || undefined,
    },
    // Partner (if exists)
    ...(partnerName ? [{
      id: 'partner',
      name: partnerName,
      type: 'user' as const,
      email: '', // Partner email would come from user profile
    }] : []),
    // Wedding planner (if exists)
    ...(plannerName ? [{
      id: 'planner',
      name: plannerName,
      type: 'user' as const,
      email: '', // Planner email would come from user profile
    }] : []),
  ];

  // Filter assignees based on search
  const filteredAssignees = assigneeOptions.filter(option =>
    option.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    option.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAssign = () => {
    if (selectedAssignee) {
      onAssign(selectedAssignee.id, selectedAssignee.name, selectedAssignee.type);
      onClose();
    }
  };

  const handleUnassign = () => {
    onAssign('', '', 'user');
    onClose();
  };

  // Reset selection when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setSelectedAssignee(currentAssignee ? {
        id: currentAssignee.id,
        name: currentAssignee.name,
        type: currentAssignee.type,
      } : null);
      setSearchQuery('');
    }
  }, [isOpen, currentAssignee]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center p-4 z-50"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -50, opacity: 0 }}
            className="bg-white rounded-[10px] shadow-xl max-w-md w-full p-6 relative"
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={onClose}
              className="absolute top-3 right-3 text-[#7A7A7A] hover:text-[#332B42] p-1 rounded-full"
              title="Close"
            >
              <X size={20} />
            </button>

            <h5 className="h5 mb-4">Assign To-Do Item</h5>

            {/* Search */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search people..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-[#AB9C95] rounded-[5px] text-sm focus:outline-none focus:border-[#A85C36]"
              />
            </div>

            {/* Assignee List */}
            <div className="max-h-64 overflow-y-auto mb-4">
              {filteredAssignees.length === 0 ? (
                <div className="text-center py-4 text-gray-500">
                  No people found matching "{searchQuery}"
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredAssignees.map((assignee) => (
                    <button
                      key={assignee.id}
                      onClick={() => setSelectedAssignee(assignee)}
                      className={`w-full flex items-center gap-3 p-3 rounded-[5px] text-left transition-colors ${
                        selectedAssignee?.id === assignee.id
                          ? 'bg-[#EBE3DD] border border-[#A85C36]'
                          : 'hover:bg-[#F3F2F0] border border-transparent'
                      }`}
                    >
                      <UserAvatar
                        userId={assignee.id}
                        userName={assignee.name}
                        profileImageUrl={assignee.profileImageUrl}
                        avatarColor={assignee.avatarColor}
                        size="sm"
                        showTooltip={true}
                      />
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-[#332B42] truncate">
                            {assignee.name}
                          </span>
                          {assignee.type === 'contact' && (
                            <Users className="w-3 h-3 text-[#AB9C95]" />
                          )}
                        </div>
                        {assignee.email && (
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <Mail className="w-3 h-3" />
                            <span className="truncate">{assignee.email}</span>
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              {currentAssignee && (
                <button
                  onClick={handleUnassign}
                  className="flex-1 btn-primaryinverse text-sm"
                >
                  Unassign
                </button>
              )}
              <button
                onClick={handleAssign}
                disabled={!selectedAssignee}
                className="flex-1 btn-primary text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {currentAssignee ? 'Reassign' : 'Assign'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default TodoAssignmentModal; 