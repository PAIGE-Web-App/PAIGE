import React, { memo } from 'react';
import { useRouter } from 'next/navigation';
import { SeatingChart } from '../../types/seatingChart';
import { Users, Table, Calendar } from 'lucide-react';
import { getAssigneeAvatarColor } from '../../utils/assigneeAvatarColors';

interface SeatingChartCardProps {
  chart: SeatingChart;
}

const SeatingChartCard: React.FC<SeatingChartCardProps> = memo(({ chart }) => {
  const router = useRouter();

  const handleClick = () => {
    router.push(`/seating-charts/${chart.id}`);
  };

  return (
    <div
      onClick={handleClick}
      className="border border-gray-200 rounded-lg hover:shadow-md transition-shadow cursor-pointer group flex flex-col h-72 overflow-hidden"
    >
      {/* Card Content */}
      <div className="p-4 flex-1 flex flex-col bg-white">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h6 className="group-hover:text-[#A85C36] transition-colors font-medium text-[#332B42] text-sm">
              {chart.name}
            </h6>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 flex items-center gap-1">
              <Users className="w-3 h-3" />
              {chart.guestCount}
            </span>
            <span className="text-xs text-gray-400 flex items-center gap-1">
              <Table className="w-3 h-3" />
              {chart.tableCount}
            </span>
          </div>
        </div>
        
        {chart.guestCount === 0 ? (
          /* No Guests State - Full Height */
          <div className="flex-1 bg-gray-50 rounded flex items-center justify-center">
            <div className="text-center">
              <Users className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <span className="text-sm text-gray-400">No guests yet!</span>
            </div>
          </div>
        ) : (
          /* Content with Guests */
          <div className="space-y-3">
            {/* Guest Preview */}
            <div className="space-y-2">
              <h4 className="text-xs font-medium text-[#332B42]">Recently Added:</h4>
              <div className="space-y-1">
                {chart.guests.slice(0, 3).map((guest, index) => (
                  <div key={guest.id} className="flex items-center gap-2">
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-medium flex-shrink-0"
                      style={{ 
                        backgroundColor: getAssigneeAvatarColor(guest.id)
                      }}
                    >
                      {guest.fullName.split(' ').map(n => n.charAt(0)).join('').substring(0, 2).toUpperCase()}
                    </div>
                    <span className="text-xs text-[#332B42] truncate">{guest.fullName}</span>
                  </div>
                ))}
                {chart.guests.length > 3 && (
                  <div className="text-xs text-gray-400">
                    +{chart.guests.length - 3} more guests
                  </div>
                )}
              </div>
            </div>
            
            {/* Table Preview */}
            {chart.tableCount > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-medium text-[#332B42]">Tables</h4>
                <div className="flex flex-wrap gap-1">
                  {chart.tables.slice(0, 4).map((table, index) => (
                    <div
                      key={table.id}
                      className="px-2 py-1 bg-[#F3F2F0] rounded text-xs text-[#332B42]"
                    >
                      {table.name}
                    </div>
                  ))}
                  {chart.tableCount > 4 && (
                    <div className="px-2 py-1 bg-gray-100 rounded text-xs text-gray-500">
                      +{chart.tableCount - 4} more
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Card Footer */}
      <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 flex-shrink-0">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            <span>
              {chart.updatedAt ? 
                new Date(chart.updatedAt).toLocaleDateString() : 
                'Recently updated'
              }
            </span>
          </div>
          <span className="text-[#A85C36] font-medium group-hover:text-[#8B4A2A] transition-colors">
            View Chart →
          </span>
        </div>
      </div>
    </div>
  );
});

SeatingChartCard.displayName = 'SeatingChartCard';

export default SeatingChartCard;
