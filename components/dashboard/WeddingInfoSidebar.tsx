import React from 'react';
import { Calendar, MapPin, User, Clock, Heart } from 'lucide-react';

interface WeddingInfoSidebarProps {
  userData: any;
  progressData: any;
}

const WeddingInfoSidebar: React.FC<WeddingInfoSidebarProps> = ({ userData, progressData }) => {
  // Calculate days until wedding - no Firestore calls needed, uses existing userData
  const calculateDaysUntilWedding = () => {
    if (!userData?.weddingDate) return null;
    
    let weddingDate: Date;
    
    try {
      // Handle different date formats from userData
      if (typeof userData.weddingDate === 'string') {
        weddingDate = new Date(userData.weddingDate);
      } else if (userData.weddingDate?.seconds) {
        // Firestore Timestamp
        weddingDate = new Date(userData.weddingDate.seconds * 1000);
      } else if (userData.weddingDate?.toDate) {
        // Firestore Timestamp with toDate method
        weddingDate = userData.weddingDate.toDate();
      } else {
        return null;
      }
      
      const today = new Date();
      const timeDiff = weddingDate.getTime() - today.getTime();
      const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
      
      return daysDiff > 0 ? daysDiff : 0;
    } catch (error) {
      console.error('Error calculating wedding date:', error);
      return null;
    }
  };

  const daysUntilWedding = calculateDaysUntilWedding();

  return (
    <div className="w-80 bg-white rounded-lg border border-gray-200 h-[calc(100vh-8rem)] overflow-y-auto sticky top-8 flex flex-col">
      {/* Content Section */}
      <div className="flex-1">
        {/* Wedding Countdown Header */}
        {daysUntilWedding !== null && (
        <div className="relative overflow-hidden border-b border-gray-200" style={{ background: 'linear-gradient(to right, #805d93, #6b4c7f)' }}>
          <div className="relative z-10 p-4 text-center">
            <div className="text-3xl font-semibold text-white mb-1 font-work">
              {daysUntilWedding}
            </div>
            <div className="flex items-center justify-center gap-2 text-xs text-purple-100 font-work">
              <Calendar className="w-3 h-3" />
              <span>{daysUntilWedding === 1 ? 'day' : 'days'} to go!</span>
            </div>
          </div>
        </div>
      )}

      {/* Wedding Information */}
      <div className="p-4 pt-6 space-y-4">
        {/* Wedding Date */}
        {userData?.weddingDate && (
          <div className="flex items-start gap-3">
            <Calendar className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
            <div>
              <div className="text-xs font-medium text-gray-500 mb-1 font-work">Wedding Date</div>
              <div className="text-sm text-[#332B42] font-work">
                {(() => {
                  try {
                    let weddingDate: Date;
                    if (typeof userData.weddingDate === 'string') {
                      weddingDate = new Date(userData.weddingDate);
                    } else if (userData.weddingDate?.seconds) {
                      weddingDate = new Date(userData.weddingDate.seconds * 1000);
                    } else if (userData.weddingDate?.toDate) {
                      weddingDate = userData.weddingDate.toDate();
                    } else {
                      return 'Date set';
                    }
                    return weddingDate.toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    });
                  } catch (error) {
                    return 'Date set';
                  }
                })()}
              </div>
            </div>
          </div>
        )}

        {/* Wedding Location */}
        {userData?.weddingLocation && (
          <div className="flex items-start gap-3">
            <MapPin className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
            <div>
              <div className="text-xs font-medium text-gray-500 mb-1 font-work">Wedding Location</div>
              <div className="text-sm text-[#332B42] font-work">{userData.weddingLocation}</div>
            </div>
          </div>
        )}

        {/* Partner Name */}
        {userData?.partnerName && (
          <div className="flex items-start gap-3">
            <User className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
            <div>
              <div className="text-xs font-medium text-gray-500 mb-1 font-work">Partner</div>
              <div className="text-sm text-[#332B42] font-work">{userData.partnerName}</div>
            </div>
          </div>
        )}

        {/* Wedding Planner */}
        {userData?.weddingPlanner && (
          <div className="flex items-start gap-3">
            <User className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
            <div>
              <div className="text-xs font-medium text-gray-500 mb-1 font-work">Wedding Planner</div>
              <div className="text-sm text-[#332B42] font-work">{userData.weddingPlanner}</div>
            </div>
          </div>
        )}

        {/* Budget Overview */}
        {userData?.maxBudget && (
          <div className="flex items-start gap-3">
            <div className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0 text-center text-xs font-bold font-work">$</div>
            <div>
              <div className="text-xs font-medium text-gray-500 mb-1 font-work">Total Budget</div>
              <div className="text-sm text-[#332B42] font-work">
                ${userData.maxBudget.toLocaleString()}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Quick Progress Overview */}
      <div className="mt-6 pt-4 border-t border-gray-100 p-4 pt-6">
        <div className="flex items-center gap-2 mb-3">
          <Clock className="w-4 h-4 text-gray-500" />
          <span className="text-xs font-medium text-gray-500 font-work">Planning Progress</span>
        </div>
        
        {/* Progress items using existing progressData - no additional Firestore calls */}
        <div className="space-y-2">
          {[
            { label: 'Profile Complete', completed: !!userData?.partnerName },
            { label: 'Wedding Style Set', completed: progressData?.hasMoodboards },
            { label: 'Contacts Added', completed: progressData?.hasContacts },
            { label: 'Budget Created', completed: progressData?.hasBudget },
            { label: 'Todos Started', completed: progressData?.hasTodos }
          ].map((item, index) => (
            <div key={index} className="flex items-center justify-between">
              <span className="text-xs text-[#332B42] font-work">{item.label}</span>
              <div className={`w-2 h-2 rounded-full ${item.completed ? 'bg-green-500' : 'bg-gray-300'}`} />
            </div>
          ))}
        </div>
      </div>
      </div>

      {/* Update Settings Link */}
      <div className="mt-auto pt-4 border-t border-gray-100 p-4 pt-6">
        <div className="text-center">
          <a href="/settings" className="text-xs text-gray-500 hover:text-gray-700 font-work underline">
            Update Settings
          </a>
        </div>
      </div>
    </div>
  );
};

export default WeddingInfoSidebar;
