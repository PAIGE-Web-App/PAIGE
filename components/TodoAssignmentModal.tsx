import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, User, Users, Mail, Heart, Crown, Info } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfileData } from '@/hooks/useUserProfileData';
import UserAvatar from './UserAvatar';
import { Contact } from '@/types/contact';

interface TodoAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAssign: (assigneeIds: string[], assigneeNames: string[], assigneeTypes: ('user' | 'contact')[]) => void;
  currentAssignees?: {
    id: string;
    name: string;
    type: 'user' | 'contact';
    role?: string;
  }[];
  contacts?: Contact[];
}

interface AssigneeOption {
  id: string;
  name: string;
  type: 'user' | 'contact';
  email?: string;
  profileImageUrl?: string;
  avatarColor?: string;
  role?: string; // New field for role labels
  roleType?: 'user' | 'partner' | 'planner'; // New field for role type
}

const TodoAssignmentModal: React.FC<TodoAssignmentModalProps> = ({
  isOpen,
  onClose,
  onAssign,
  currentAssignees = [],
  contacts = [],
}) => {
  const { user, profileImageUrl } = useAuth();
  const { userName, partnerName, partnerEmail, plannerName, plannerEmail } = useUserProfileData();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAssignees, setSelectedAssignees] = useState<AssigneeOption[]>([]);
  const [showInfoBanner, setShowInfoBanner] = useState(true);

  // Build assignee options - only users, no contacts/vendors
  const assigneeOptions: AssigneeOption[] = [
    // Current user
    {
      id: user?.uid || '',
      name: userName || 'You',
      type: 'user',
      profileImageUrl: profileImageUrl || undefined,
      role: 'You',
      roleType: 'user',
      email: user?.email || undefined,
    },
    // Partner (if exists)
    ...(partnerName ? [{
      id: 'partner',
      name: partnerName,
      type: 'user' as const,
      email: partnerEmail || undefined,
      role: 'Partner',
      roleType: 'partner' as const,
    }] : []),
    // Wedding planner (if exists)
    ...(plannerName ? [{
      id: 'planner',
      name: plannerName,
      type: 'user' as const,
      email: plannerEmail || undefined,
      role: 'Wedding Planner',
      roleType: 'planner' as const,
    }] : []),
  ];

  // Filter assignees based on search
  const filteredAssignees = assigneeOptions.filter(option =>
    option.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    option.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    option.role?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Get role icon (consistent with MentionAutocomplete)
  const getRoleIcon = (roleType?: string) => {
    switch (roleType) {
      case 'partner':
        return <Heart className="w-3 h-3 text-pink-500" />;
      case 'planner':
        return <Crown className="w-3 h-3 text-purple-500" />;
      default:
        return <User className="w-3 h-3 text-gray-500" />;
    }
  };

  const handleAddEmailClick = (role: string) => {
    // Open settings page with the appropriate tab
    window.open('/settings?tab=account', '_blank');
  };

  const handleAssign = () => {
    if (selectedAssignees.length > 0) {
      const assigneeIds = selectedAssignees.map(a => a.id);
      const assigneeNames = selectedAssignees.map(a => a.name);
      const assigneeTypes = selectedAssignees.map(a => a.type);
      onAssign(assigneeIds, assigneeNames, assigneeTypes);
      onClose();
    }
  };

  const handleUnassign = () => {
    onAssign([], [], []);
    onClose();
  };

  // Reset selection when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setSelectedAssignees(currentAssignees.map(assignee => ({
        id: assignee.id,
        name: assignee.name,
        type: assignee.type,
        role: assignee.role,
        roleType: assignee.type === 'user' ? 'user' : assignee.role?.includes('Partner') ? 'partner' : 'planner',
      })));
      setSearchQuery('');
    }
  }, [isOpen, currentAssignees]);

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

            {/* Info Banner */}
            {showInfoBanner && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm text-blue-800">
                      Assigned users will receive email notifications about their assignment and any changes to this item. If you add an email address later, they'll receive a summary of all pending tasks.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowInfoBanner(false)}
                    className="text-blue-600 hover:text-blue-800 p-1"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            )}

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
                  {filteredAssignees.map((assignee) => {
                    const isSelected = selectedAssignees.some(a => a.id === assignee.id);
                    return (
                      <button
                        key={assignee.id}
                        onClick={() => {
                          if (isSelected) {
                            setSelectedAssignees(prev => prev.filter(a => a.id !== assignee.id));
                          } else {
                            setSelectedAssignees(prev => [...prev, assignee]);
                          }
                        }}
                        className={`w-full flex items-center gap-3 p-3 rounded-[5px] text-left transition-colors ${
                          isSelected
                            ? 'bg-[#EBE3DD] border border-[#A85C36]'
                            : 'hover:bg-[#F3F2F0] border border-transparent'
                        }`}
                      >
                        {/* Checkbox */}
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}} // Handled by button onClick
                          className="w-4 h-4 text-[#A85C36] bg-white border-[#AB9C95] rounded focus:ring-[#A85C36] focus:ring-2"
                        />

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
                            {getRoleIcon(assignee.roleType)}
                          </div>
                          {assignee.role && (
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-gray-500">
                                {assignee.role}
                              </span>
                              {/* Email section with separator */}
                              {assignee.roleType !== 'user' && (
                                <>
                                  <span className="text-xs text-[#AB9C95]">|</span>
                                  {assignee.email ? (
                                    <span className="text-xs text-gray-500 truncate">
                                      {assignee.email}
                                    </span>
                                  ) : (
                                    <div
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleAddEmailClick(assignee.role || '');
                                      }}
                                      className="text-xs text-[#A85C36] underline hover:text-[#8B4A2A] transition-colors cursor-pointer"
                                    >
                                      Add email address
                                    </div>
                                  )}
                                </>
                              )}
                              {assignee.email && assignee.roleType === 'user' && (
                                <>
                                  <span className="text-xs text-[#AB9C95]">|</span>
                                  <span className="text-xs text-gray-500 truncate">
                                    {assignee.email}
                                  </span>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              {currentAssignees.length > 0 && (
                <button
                  onClick={handleUnassign}
                  className="flex-1 btn-primaryinverse text-sm"
                >
                  Unassign
                </button>
              )}
              <button
                onClick={handleAssign}
                disabled={selectedAssignees.length === 0}
                className="flex-1 btn-primary text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {currentAssignees.length > 0 ? 'Reassign' : 'Assign'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default TodoAssignmentModal; 