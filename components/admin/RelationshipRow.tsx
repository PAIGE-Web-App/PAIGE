import React from 'react';
import { Heart, UserCheck, Calendar, UserX } from 'lucide-react';

interface RelationshipRowProps {
  user: {
    uid: string;
    isLinked?: boolean;
    partnerName?: string;
    partnerEmail?: string;
    hasPlanner?: boolean;
    plannerName?: string;
    plannerEmail?: string;
    weddingDate?: string | Date | null;
  };
  isExpanded: boolean;
  onToggle: () => void;
  onLinkPartner: (userId: string) => void;
  onAssignPlanner: (userId: string) => void;
  loading?: boolean;
}

// Partner Card Component
const PartnerCard = ({ user, onLinkPartner }: { user: RelationshipRowProps['user'], onLinkPartner: (userId: string) => void }) => (
  <div className="col-span-4">
    <div className="bg-white rounded-lg border border-gray-200 p-4 h-32 flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <Heart className="w-4 h-4 text-pink-500" />
          <h6 className="text-gray-900">Partner</h6>
        </div>
        <button
          onClick={() => onLinkPartner(user.uid)}
          className="text-xs text-gray-600 hover:text-gray-800 transition-colors"
        >
          {user.isLinked ? 'Unlink' : 'Link'}
        </button>
      </div>
      
      <div className="flex-1">
        {user.isLinked ? (
          <div className="text-sm text-gray-600 mb-3">
            <div className="font-medium">{user.partnerName || 'Partner Name'}</div>
            <div className="text-gray-500">{user.partnerEmail || 'partner@email.com'}</div>
          </div>
        ) : (
          <div className="text-sm text-gray-500 flex items-center gap-2 mb-3">
            <UserX className="w-4 h-4" />
            Not linked to a partner
          </div>
        )}
      </div>
    </div>
  </div>
);

// Wedding Planner Card Component
const WeddingPlannerCard = ({ user, onAssignPlanner }: { user: RelationshipRowProps['user'], onAssignPlanner: (userId: string) => void }) => (
  <div className="col-span-4">
    <div className="bg-white rounded-lg border border-gray-200 p-4 h-32 flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <UserCheck className="w-4 h-4 text-blue-500" />
          <h6 className="text-gray-900">Wedding Planner</h6>
        </div>
        <button
          onClick={() => onAssignPlanner(user.uid)}
          className="text-xs text-gray-600 hover:text-gray-800 transition-colors"
        >
          {user.hasPlanner ? 'Remove' : 'Assign'}
        </button>
      </div>
      
      <div className="flex-1">
        {user.hasPlanner ? (
          <div className="text-sm text-gray-600 mb-3">
            <div className="font-medium">{user.plannerName || 'Planner Name'}</div>
            <div className="text-gray-500">{user.plannerEmail || 'planner@email.com'}</div>
          </div>
        ) : (
          <div className="text-sm text-gray-500 flex items-center gap-2 mb-3">
            <UserX className="w-4 h-4" />
            No planner assigned
          </div>
        )}
      </div>
    </div>
  </div>
);

// Wedding Date Card Component
const WeddingDateCard = ({ weddingDateInfo }: { weddingDateInfo: any }) => (
  <div className="col-span-4">
    <div className="bg-white rounded-lg border border-gray-200 p-4 h-32 flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <Calendar className="w-4 h-4 text-purple-500" />
          <h6 className="text-gray-900">Wedding Date</h6>
        </div>
        <button
          className="text-xs text-gray-600 hover:text-gray-800 transition-colors cursor-not-allowed"
          disabled
        >
          {weddingDateInfo.isValid ? 'Date Set' : 'Set Date'}
        </button>
      </div>
      
      <div className="flex-1">
        <div className="text-sm mb-3">
          {weddingDateInfo.isValid ? (
            <div className="text-gray-600">
              <div className="font-medium">{weddingDateInfo.displayText}</div>
              {weddingDateInfo.formattedDate && (
                <div className="text-xs text-gray-500 mt-1">
                  {weddingDateInfo.isPast 
                    ? `${Math.abs(weddingDateInfo.daysDiff)} days ago`
                    : `${weddingDateInfo.daysDiff} days away`
                  }
                </div>
              )}
            </div>
          ) : (
            <div className="text-gray-500">
              {weddingDateInfo.displayText}
            </div>
          )}
        </div>
      </div>
    </div>
  </div>
);

// Skeleton component for relationship cards
const RelationshipCardSkeleton = () => (
  <div className="col-span-4">
    <div className="bg-white rounded-lg border border-gray-200 p-4 h-32 animate-pulse">
      {/* Icon skeleton */}
      <div className="w-8 h-8 bg-gray-200 rounded-full mb-3" />
      
      {/* Title skeleton */}
      <div className="h-5 bg-gray-200 rounded w-24 mb-2" />
      
      {/* Status skeleton */}
      <div className="h-4 bg-gray-200 rounded w-32 mb-3" />
      
      {/* Button skeleton */}
      <div className="h-8 bg-gray-200 rounded w-24" />
    </div>
  </div>
);

export default function RelationshipRow({ 
  user, 
  isExpanded, 
  onToggle, 
  onLinkPartner, 
  onAssignPlanner,
  loading = false
}: RelationshipRowProps) {
  if (!isExpanded) return null;

  // Helper function to validate and format wedding date
  const getWeddingDateInfo = (date: string | Date | null | any) => {
    if (!date) return { isValid: false, displayText: 'Not set', formattedDate: null };
    
    try {
      let dateObj: Date;
      
      // Handle Firestore Timestamp objects
      if (date && typeof date === 'object' && date._seconds) {
        dateObj = new Date(date._seconds * 1000);
      } else if (date && typeof date === 'object' && date.toDate) {
        // Handle Firestore Timestamp with toDate method
        dateObj = date.toDate();
      } else {
        dateObj = new Date(date);
      }
      
      const isValid = !isNaN(dateObj.getTime());
      
      if (!isValid) {
        return { isValid: false, displayText: 'Invalid date', formattedDate: null };
      }
      
      const now = new Date();
      const daysDiff = Math.ceil((dateObj.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      const isPast = daysDiff < 0;
      
      return { 
        isValid: true, 
        displayText: dateObj.toLocaleDateString('en-US', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        }),
        formattedDate: dateObj,
        daysDiff,
        isPast
      };
    } catch {
      return { isValid: false, displayText: 'Invalid date', formattedDate: null };
    }
  };

  const weddingDateInfo = getWeddingDateInfo(user.weddingDate || null);
  
  // Debug logging for wedding date
  console.log('🔍 Wedding date debug:', {
    rawDate: user.weddingDate,
    type: typeof user.weddingDate,
    hasSeconds: (user.weddingDate as any)?._seconds,
    hasToDate: typeof (user.weddingDate as any)?.toDate === 'function',
    result: weddingDateInfo
  });

  if (loading) {
    return (
      <div className="col-span-12 bg-gray-50 border-t border-gray-200 p-4">
        <div className="grid grid-cols-12 gap-4">
          <RelationshipCardSkeleton />
          <RelationshipCardSkeleton />
          <RelationshipCardSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="col-span-12 bg-gray-50 border-t border-gray-200 p-4">
      <div className="grid grid-cols-12 gap-4">
        <PartnerCard user={user} onLinkPartner={onLinkPartner} />
        <WeddingPlannerCard user={user} onAssignPlanner={onAssignPlanner} />
        <WeddingDateCard weddingDateInfo={weddingDateInfo} />
      </div>
    </div>
  );
}
