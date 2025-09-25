'use client';

import { useEffect, useState } from 'react';

interface ClientOnlyProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export default function ClientOnly({ 
  children, 
  fallback = null // No fallback - let LoadingProvider handle all loading states
}: ClientOnlyProps) {
  const [hasMounted, setHasMounted] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    // Add a small delay to ensure proper hydration
    const timer = setTimeout(() => {
      setHasMounted(true);
    }, 100);

    // Listen for hydration errors
    const handleError = (event: ErrorEvent) => {
      if (event.message.includes('hydration') || event.message.includes('Hydration')) {
        console.error('Hydration error in ClientOnly:', event);
        setHasError(true);
      }
    };

    window.addEventListener('error', handleError);
    
    return () => {
      clearTimeout(timer);
      window.removeEventListener('error', handleError);
    };
  }, []);

  // Show fallback during hydration or if there's an error
  if (!hasMounted || hasError) {
    return fallback ? <>{fallback}</> : null;
  }

  return <>{children}</>;
}
