import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, UserPlus, Shield, Crown } from 'lucide-react';
import { UserRole } from '@/types/user';
import { ROLE_CONFIGS } from '@/utils/roleConfig';

interface ChangeUserRoleModalProps {
  user: any;
  onClose: () => void;
  onUpdateRole: (role: UserRole) => void;
  updatingRole: boolean;
}

const ChangeUserRoleModal: React.FC<ChangeUserRoleModalProps> = ({ 
  user, 
  onClose, 
  onUpdateRole,
  updatingRole
}) => {
  const [selectedRole, setSelectedRole] = useState<UserRole>(user.role || 'couple');

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case 'super_admin':
        return <Crown className="w-4 h-4 text-yellow-600" />;
      case 'admin':
        return <Shield className="w-4 h-4 text-blue-600" />;
      case 'couple':
        return <UserPlus className="w-4 h-4 text-green-600" />;
      default:
        return <UserPlus className="w-4 h-4 text-gray-600" />;
    }
  };

  const getRoleColor = (role: UserRole) => {
    switch (role) {
      case 'super_admin':
        return 'border-yellow-500 text-yellow-700 bg-yellow-50';
      case 'admin':
        return 'border-blue-500 text-blue-700 bg-blue-50';
      case 'couple':
        return 'border-green-500 text-green-700 bg-green-50';
      default:
        return 'border-gray-500 text-gray-700 bg-gray-50';
    }
  };

  const handleUpdateRole = () => {
    if (selectedRole && selectedRole !== user.role) {
      onUpdateRole(selectedRole);
    }
  };

  return (
    <AnimatePresence>
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
          className="bg-white rounded-[5px] shadow-xl max-w-xl w-full p-6 relative"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header row with title and close button */}
          <div className="flex items-center justify-between mb-4">
            <h5 className="h5 text-left">Change User Role</h5>
            <button
              onClick={onClose}
              className="text-[#7A7A7A] hover:text-[#332B42] p-1 rounded-full"
              title="Close"
            >
              <X size={20} />
            </button>
          </div>

          {/* Description */}
          <div className="mb-6">
            <p className="text-sm text-gray-600 text-left">
              Changing role for: <strong>{user.email}</strong>
            </p>
            <p className="text-sm text-gray-600 mt-2">
              Current role: <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getRoleColor(user.role)}`}>
                {getRoleIcon(user.role)}
                {user.role.charAt(0).toUpperCase() + user.role.slice(1).replace('_', ' ')}
              </span>
            </p>
          </div>

          {/* Role Selection */}
          <div className="mb-6">
            <h6 className="font-medium text-[#332B42] mb-3">Select new role:</h6>
            <div className="space-y-2">
              {Object.keys(ROLE_CONFIGS).map(role => (
                <label key={role} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                  <input
                    type="radio"
                    name="role"
                    value={role}
                    checked={role === selectedRole}
                    onChange={() => setSelectedRole(role as UserRole)}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <div className="flex items-center gap-2">
                    {getRoleIcon(role as UserRole)}
                    <span className="font-medium">
                      {role.charAt(0).toUpperCase() + role.slice(1).replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 ml-auto">
                    {ROLE_CONFIGS[role as UserRole].description}
                  </p>
                </label>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleUpdateRole}
              disabled={updatingRole || selectedRole === user.role}
              className="btn-primary px-6 py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {updatingRole ? 'Updating...' : 'Update Role'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ChangeUserRoleModal;
