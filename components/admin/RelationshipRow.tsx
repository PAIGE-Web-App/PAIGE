import React from 'react';
import { Heart, Calendar, UserCheck, UserX, Link, Unlink } from 'lucide-react';
import { AdminUser } from '@/types/user';

interface RelationshipRowProps {
  user: AdminUser;
  isExpanded: boolean;
  onToggle: () => void;
  onLinkPartner: (userId: string) => void;
  onAssignPlanner: (userId: string) => void;
}

export default function RelationshipRow({ 
  user, 
  isExpanded, 
  onToggle, 
  onLinkPartner, 
  onAssignPlanner 
}: RelationshipRowProps) {
  if (!isExpanded) return null;

  return (
    <tr className="bg-gray-50">
      <td colSpan={6} className="px-6 py-4">
        <div className="space-y-4">
          {/* Partner Information */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Heart className="w-5 h-5 text-pink-500" />
              <div>
                <h4 className="font-medium text-gray-900">Partner</h4>
                {user.isLinked ? (
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">{user.partnerName}</span>
                    <span className="mx-2">•</span>
                    <span>{user.partnerEmail}</span>
                  </div>
                ) : (
                  <div className="text-sm text-gray-500 flex items-center gap-2">
                    <UserX className="w-4 h-4" />
                    Not linked to a partner
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={() => onLinkPartner(user.uid)}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors ${
                user.isLinked
                  ? 'text-red-600 border-red-300 hover:bg-red-50'
                  : 'text-green-600 border-green-300 hover:bg-green-50'
              }`}
            >
              {user.isLinked ? (
                <>
                  <Unlink className="w-4 h-4 inline mr-1" />
                  Unlink Partner
                </>
              ) : (
                <>
                  <Link className="w-4 h-4 inline mr-1" />
                  Link Partner
                </>
              )}
            </button>
          </div>

          {/* Wedding Planner Information */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <UserCheck className="w-5 h-5 text-blue-500" />
              <div>
                <h4 className="font-medium text-gray-900">Wedding Planner</h4>
                {user.hasPlanner ? (
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">{user.plannerName}</span>
                    <span className="mx-2">•</span>
                    <span>{user.plannerEmail}</span>
                  </div>
                ) : (
                  <div className="text-sm text-gray-500 flex items-center gap-2">
                    <UserX className="w-4 h-4" />
                    No planner assigned
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={() => onAssignPlanner(user.uid)}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors ${
                user.hasPlanner
                  ? 'text-red-600 border-red-300 hover:bg-red-50'
                  : 'text-blue-600 border-blue-300 hover:bg-blue-50'
              }`}
            >
              {user.hasPlanner ? (
                <>
                  <Unlink className="w-4 h-4 inline mr-1" />
                  Remove Planner
                </>
              ) : (
                <>
                  <Link className="w-4 h-4 inline mr-1" />
                  Assign Planner
                </>
              )}
            </button>
          </div>

          {/* Wedding Date */}
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-purple-500" />
            <div>
              <h4 className="font-medium text-gray-900">Wedding Date</h4>
              <div className="text-sm text-gray-600">
                {user.weddingDate ? (
                  <span>{new Date(user.weddingDate).toLocaleDateString()}</span>
                ) : (
                  <span className="text-gray-500">Not set</span>
                )}
              </div>
            </div>
          </div>

          {/* Relationship Status Summary */}
          <div className="pt-3 border-t border-gray-200">
            <div className="flex items-center gap-4 text-sm">
              <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                user.isLinked 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-gray-100 text-gray-600'
              }`}>
                {user.isLinked ? '✅ Linked' : '❌ Unlinked'}
              </span>
              <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                user.hasPlanner 
                  ? 'bg-blue-100 text-blue-800' 
                  : 'bg-gray-100 text-gray-600'
              }`}>
                {user.hasPlanner ? '👨‍💼 Has Planner' : '❌ No Planner'}
              </span>
              {user.weddingDate && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                  📅 Wedding Set
                </span>
              )}
            </div>
          </div>
        </div>
      </td>
    </tr>
  );
}
