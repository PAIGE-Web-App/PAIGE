'use client';

import { useEffect, useState } from 'react';

interface HydrationErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export default function HydrationErrorBoundary({ 
  children, 
  fallback = (
    <div className="flex items-center justify-center min-h-screen bg-linen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#A85C36] mx-auto mb-4"></div>
        <p className="text-[#6B7280]">Loading your wedding planning experience...</p>
      </div>
    </div>
  )
}: HydrationErrorBoundaryProps) {
  const [hasHydrated, setHasHydrated] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    // Mark as hydrated after first render
    setHasHydrated(true);
    
    // Listen for hydration errors
    const handleError = (event: ErrorEvent) => {
      if (event.message.includes('hydration') || event.message.includes('Hydration')) {
        console.error('Hydration error detected:', event);
        setHasError(true);
      }
    };

    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  // Show fallback during hydration or if there's an error
  if (!hasHydrated || hasError) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
