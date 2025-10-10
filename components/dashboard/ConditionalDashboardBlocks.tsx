import React from 'react';
import { ClipboardList, DollarSign, ArrowRight, Clock, AlertCircle } from 'lucide-react';

interface ConditionalDashboardBlocksProps {
  userData: any;
  progressData: any;
  todoData: any[];
  budgetData: any;
}

const ConditionalDashboardBlocks: React.FC<ConditionalDashboardBlocksProps> = ({ 
  userData, 
  progressData,
  todoData,
  budgetData
}) => {
  // Check if we should show blocks based on your conditions
  const shouldShowTodos = progressData?.hasTodos;
  const shouldShowBudget = progressData?.hasBudget;

  // Only render if at least one condition is met
  if (!shouldShowTodos && !shouldShowBudget) {
    return null;
  }

  // Use real budget data if available, fallback to user's maxBudget
  const getBudgetProgress = () => {
    if (budgetData) {
      return {
        percentage: budgetData.percentage,
        spent: budgetData.totalSpent,
        remaining: budgetData.remaining
      };
    }
    
    // Fallback to user's maxBudget if no budget categories exist
    if (!userData?.maxBudget) return { percentage: 0, spent: 0, remaining: 0 };
    
    const mockSpent = Math.floor(userData.maxBudget * 0.35); // 35% spent example
    const remaining = userData.maxBudget - mockSpent;
    const percentage = Math.round((mockSpent / userData.maxBudget) * 100);
    
    return { percentage, spent: mockSpent, remaining };
  };

  const budgetProgress = getBudgetProgress();

  // Determine if we have both todos and budget blocks
  const hasBothBlocks = shouldShowTodos && shouldShowBudget;
  const gridClass = hasBothBlocks ? "grid grid-cols-1 md:grid-cols-2 gap-4" : "";

  return (
    <div className="space-y-4 mb-6">
      {/* Top row - Todos and Budget */}
      <div className={gridClass}>
      {/* Upcoming To-dos Block */}
      {shouldShowTodos && (
        <a href="/todo" className="block bg-white rounded-lg border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer flex flex-col h-full no-underline">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-gray-500" />
              <h3 className="text-sm font-medium text-[#332B42] font-work">Upcoming To-dos</h3>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-400" />
          </div>
          
          <div className="space-y-2">
            {todoData && todoData.length > 0 ? (
              todoData.map((todo, index) => {
                // Format the due date
                const deadline = todo.deadline?.toDate ? todo.deadline.toDate() : new Date(todo.deadline);
                const formattedDate = deadline.toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: true
                });
                
                const isCompleted = todo.isCompleted === true || todo.completed === true || todo.completed === 'true' || todo.status === 'completed';
                
                
                return (
                  <div key={todo.id} className="flex items-center justify-between gap-2">
                    <span className={`text-xs font-work truncate flex-1 ${
                      isCompleted 
                        ? 'text-gray-400 line-through' 
                        : 'text-[#5A4A42]'
                    }`}>
                      {todo.title || todo.name || todo.text || 'Untitled Todo'}
                    </span>
                    <span className={`text-xs font-work flex-shrink-0 ml-2 ${
                      isCompleted 
                        ? 'text-gray-300' 
                        : 'text-gray-400'
                    }`}>
                      {formattedDate}
                    </span>
                  </div>
                );
              })
            ) : (
              // Fallback sample todos if no real data
              <>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-[#5A4A42] font-work truncate flex-1">Book photographer</span>
                  <span className="text-xs text-gray-400 font-work flex-shrink-0 ml-2">Dec 15, 2:00 PM</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-[#5A4A42] font-work truncate flex-1">Finalize guest list</span>
                  <span className="text-xs text-gray-400 font-work flex-shrink-0 ml-2">Dec 20, 10:00 AM</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-[#5A4A42] font-work truncate flex-1">Order invitations</span>
                  <span className="text-xs text-gray-400 font-work flex-shrink-0 ml-2">Dec 25, 4:00 PM</span>
                </div>
              </>
            )}
          </div>
          
          <div className="mt-auto pt-3 border-t border-gray-100">
            <span className="text-xs text-[#A85C36] font-work">
              View all To-dos →
            </span>
          </div>
        </a>
      )}

      {/* Budget Overview Block */}
      {shouldShowBudget && (
        <a href="/budget" className="block bg-white rounded-lg border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer flex flex-col h-full no-underline">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-gray-500" />
              <h3 className="text-sm font-medium text-[#332B42] font-work">Budget Overview</h3>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-400" />
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs text-[#5A4A42] font-work">Spent</span>
              <span className="text-xs font-medium text-[#332B42] font-work">
                ${budgetProgress.spent.toLocaleString()}
              </span>
            </div>
            
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-[#A85C36] h-2 rounded-full transition-all duration-300"
                style={{ width: `${budgetProgress.percentage}%` }}
              ></div>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-xs text-[#5A4A42] font-work">Remaining</span>
              <span className="text-xs font-medium text-[#332B42] font-work">
                ${budgetProgress.remaining.toLocaleString()}
              </span>
            </div>
          </div>
          
          <div className="mt-auto pt-3">
            <span className="text-xs text-[#A85C36] font-work">
              View budget details →
            </span>
          </div>
        </a>
      )}
      </div>
    </div>
  );
};

export default ConditionalDashboardBlocks;
