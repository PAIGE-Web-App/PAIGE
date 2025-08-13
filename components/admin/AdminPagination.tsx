import React from 'react';
import LoadingSpinner from '../LoadingSpinner';

interface AdminPaginationProps {
  currentPage: number;
  totalPages: number;
  totalUsers: number;
  hasMore: boolean;
  onPageChange: (page: number) => void;
  onLoadMore: () => void;
  loadingMore: boolean;
  loading: boolean;
}

// Skeleton component for pagination
const PaginationSkeleton = () => (
  <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 animate-pulse">
    <div className="flex items-center justify-between">
      <div className="h-4 bg-gray-200 rounded w-48"></div>
      <div className="flex items-center gap-2">
        <div className="h-8 bg-gray-200 rounded w-20"></div>
        <div className="h-8 bg-gray-200 rounded w-24"></div>
        <div className="h-8 bg-gray-200 rounded w-20"></div>
      </div>
    </div>
  </div>
);

export default function AdminPagination({
  currentPage,
  totalPages,
  totalUsers,
  hasMore,
  onPageChange,
  onLoadMore,
  loadingMore,
  loading
}: AdminPaginationProps) {
  if (loading) {
    return <PaginationSkeleton />;
  }

  if (totalUsers === 0) {
    return null;
  }

  const startUser = ((currentPage - 1) * 20) + 1;
  const endUser = Math.min(currentPage * 20, totalUsers);

  return (
    <>
      {/* Pagination Controls */}
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Showing {startUser} to {endUser} of {totalUsers} users
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            
            <span className="px-3 py-2 text-sm text-gray-700">
              Page {currentPage} of {totalPages}
            </span>
            
            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={!hasMore}
              className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      </div>
      
      {/* Load More Button for Better UX */}
      {hasMore && !loadingMore && (
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
          <button
            onClick={onLoadMore}
            className="w-full py-2 text-sm font-medium text-blue-600 bg-white border border-blue-300 rounded-lg hover:bg-blue-50 transition-colors"
          >
            Load More Users
          </button>
        </div>
      )}
      
      {/* Loading More Indicator */}
      {loadingMore && (
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 text-center">
          <LoadingSpinner size="sm" text="Loading more users..." />
        </div>
      )}
    </>
  );
}
