import React, { memo } from 'react';
import { ClipboardList, DollarSign, ArrowRight } from 'lucide-react';
import { useUserData, useProgressData, useTodoData, useBudgetData } from '@/hooks/useDashboardData';
import { SkeletonBase, SkeletonText, SkeletonTitle } from '../skeletons/SkeletonBase';

interface OptimizedConditionalDashboardBlocksProps {}

const OptimizedConditionalDashboardBlocks: React.FC<OptimizedConditionalDashboardBlocksProps> = memo(() => {
  const { userData, loading: userDataLoading } = useUserData();
  const { progressData, loading: progressDataLoading } = useProgressData();
  const { todoData, loading: todoDataLoading } = useTodoData();
  const { budgetData, loading: budgetDataLoading } = useBudgetData();
  
  const loading = userDataLoading || progressDataLoading || todoDataLoading || budgetDataLoading;

  // Show skeleton loading state while data is being fetched
  if (loading) {
    return (
      <div className="space-y-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Todo Block Skeleton */}
          <SkeletonBase className="h-48">
            <div className="p-4">
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-200">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-gray-200 rounded"></div>
                  <div className="h-4 w-24 bg-gray-200 rounded"></div>
                </div>
                <div className="w-4 h-4 bg-gray-200 rounded"></div>
              </div>
              
              <div className="space-y-2">
                {[1, 2, 3].map((index) => (
                  <div key={index} className="flex items-center justify-between gap-2">
                    <div className="h-3 w-32 bg-gray-200 rounded flex-1"></div>
                    <div className="h-3 w-16 bg-gray-200 rounded flex-shrink-0 ml-2"></div>
                  </div>
                ))}
              </div>
              
              <div className="mt-auto pt-3 border-t border-gray-100">
                <div className="h-3 w-20 bg-gray-200 rounded"></div>
              </div>
            </div>
          </SkeletonBase>

          {/* Budget Block Skeleton */}
          <SkeletonBase className="h-48">
            <div className="p-4">
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-200">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-gray-200 rounded"></div>
                  <div className="h-4 w-24 bg-gray-200 rounded"></div>
                </div>
                <div className="w-4 h-4 bg-gray-200 rounded"></div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <div className="h-3 w-12 bg-gray-200 rounded"></div>
                  <div className="h-3 w-16 bg-gray-200 rounded"></div>
                </div>
                
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="w-1/3 bg-gray-300 h-2 rounded-full"></div>
                </div>
                
                <div className="flex justify-between items-center">
                  <div className="h-3 w-16 bg-gray-200 rounded"></div>
                  <div className="h-3 w-16 bg-gray-200 rounded"></div>
                </div>
              </div>
              
              <div className="mt-auto pt-3">
                <div className="h-3 w-24 bg-gray-200 rounded"></div>
              </div>
            </div>
          </SkeletonBase>
        </div>
      </div>
    );
  }

  // Check if we should show todos
  const shouldShowTodos = progressData?.hasTodos;

  // Only render if todos exist (budget now shown separately)
  if (!shouldShowTodos) {
    return null;
  }

  return (
    <div className="space-y-4 mb-6">
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
              todoData.slice(0, 3).map((todo, index) => {
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
    </div>
  );
});

OptimizedConditionalDashboardBlocks.displayName = 'OptimizedConditionalDashboardBlocks';

export default OptimizedConditionalDashboardBlocks;
