import React, { useState, useEffect } from 'react';
import { X, Heart, UserCheck, Search, UserPlus, UserMinus } from 'lucide-react';
import { AdminUser } from '@/types/user';

interface RelationshipModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: AdminUser | null;
  type: 'partner' | 'planner';
  onSave: (userId: string, targetUserId: string, action: 'link' | 'unlink') => void;
}

export default function RelationshipModal({ 
  isOpen, 
  onClose, 
  user, 
  type, 
  onSave 
}: RelationshipModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<AdminUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);

  const isPartnerModal = type === 'partner';
  const isPlannerModal = type === 'planner';

  useEffect(() => {
    if (isOpen && user) {
      setSearchTerm('');
      setSearchResults([]);
      setSelectedUser(null);
    }
  }, [isOpen, user]);

  const handleSearch = async () => {
    if (!searchTerm.trim()) return;
    
    setSearching(true);
    try {
      // Search for users based on type
      const response = await fetch(`/api/admin/users?search=${searchTerm}&role=${isPartnerModal ? 'couple' : 'planner'}`);
      const data = await response.json();
      
      // Filter out the current user and already linked users
      const filteredUsers = data.users.filter((u: AdminUser) => {
        if (u.uid === user?.uid) return false;
        if (isPartnerModal && user?.partnerId === u.uid) return false;
        if (isPlannerModal && user?.plannerId === u.uid) return false;
        return true;
      });
      
      setSearchResults(filteredUsers);
    } catch (error) {
      console.error('Search failed:', error);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleSave = () => {
    if (!user || !selectedUser) return;
    
    const action = isPartnerModal 
      ? (user.partnerId ? 'unlink' : 'link')
      : (user.plannerId ? 'unlink' : 'link');
    
    onSave(user.uid, selectedUser.uid, action);
    onClose();
  };

  const handleUnlink = () => {
    if (!user) return;
    
    const currentLinkedId = isPartnerModal ? user.partnerId : user.plannerId;
    if (currentLinkedId) {
      onSave(user.uid, currentLinkedId, 'unlink');
      onClose();
    }
  };

  if (!isOpen || !user) return null;

  const currentLinkedUser = isPartnerModal 
    ? { id: user.partnerId, email: user.partnerEmail, name: user.partnerName }
    : { id: user.plannerId, email: user.plannerEmail, name: user.plannerName };

  const isCurrentlyLinked = !!currentLinkedUser.id;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            {isPartnerModal ? (
              <Heart className="w-6 h-6 text-pink-500" />
            ) : (
              <UserCheck className="w-6 h-6 text-blue-500" />
            )}
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {isPartnerModal ? 'Manage Partner' : 'Manage Wedding Planner'}
              </h3>
              <p className="text-sm text-gray-600">
                {user.displayName || user.userName || user.email}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Current Status */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2">Current Status</h4>
            {isCurrentlyLinked ? (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {currentLinkedUser.name || 'Unknown Name'}
                  </p>
                  <p className="text-sm text-gray-600">{currentLinkedUser.email}</p>
                </div>
                <button
                  onClick={handleUnlink}
                  className="px-3 py-1.5 text-sm font-medium text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition-colors"
                >
                  <UserMinus className="w-4 h-4 inline mr-1" />
                  Unlink
                </button>
              </div>
            ) : (
              <p className="text-sm text-gray-500">
                {isPartnerModal ? 'No partner linked' : 'No wedding planner assigned'}
              </p>
            )}
          </div>

          {/* Search Section */}
          {!isCurrentlyLinked && (
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900">
                {isPartnerModal ? 'Link to Partner' : 'Assign Wedding Planner'}
              </h4>
              
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder={`Search ${isPartnerModal ? 'partners' : 'planners'}...`}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <button
                  onClick={handleSearch}
                  disabled={searching || !searchTerm.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {searching ? 'Searching...' : 'Search'}
                </button>
              </div>

              {/* Search Results */}
              {searchResults.length > 0 && (
                <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg">
                  {searchResults.map((result) => (
                    <div
                      key={result.uid}
                      className={`p-3 border-b border-gray-100 last:border-b-0 cursor-pointer hover:bg-gray-50 transition-colors ${
                        selectedUser?.uid === result.uid ? 'bg-blue-50 border-blue-200' : ''
                      }`}
                      onClick={() => setSelectedUser(result)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-gray-600">
                            {(result.displayName || result.userName || result.email).charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {result.displayName || result.userName || 'No Name'}
                          </p>
                          <p className="text-xs text-gray-500">{result.email}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Selected User */}
              {selectedUser && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-200 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-blue-600">
                          {(selectedUser.displayName || selectedUser.userName || selectedUser.email).charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {selectedUser.displayName || selectedUser.userName || 'No Name'}
                        </p>
                        <p className="text-xs text-gray-500">{selectedUser.email}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedUser(null)}
                      className="text-blue-600 hover:text-blue-700"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          {!isCurrentlyLinked && selectedUser && (
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <UserPlus className="w-4 h-4" />
              {isPartnerModal ? 'Link Partner' : 'Assign Planner'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
