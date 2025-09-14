'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function CatalogPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  useEffect(() => {
    if (!searchParams) return;
    
    // Check if user is on mobile
    const isMobile = window.innerWidth < 768;
    
    if (isMobile) {
      // On mobile, redirect to mobile catalog
      router.replace('/vendors/m-catalog');
    } else {
      // On desktop, redirect to search page
      const category = searchParams.get('category') || 'venue';
      const location = searchParams.get('location') || '';
      
      // Build the search URL with current parameters
      const searchUrl = `/vendors/catalog/search?category=${encodeURIComponent(category)}${location ? `&location=${encodeURIComponent(location)}` : ''}`;
      
      // Redirect to the new search experience
      router.replace(searchUrl);
    }
  }, [router, searchParams]);

  // Show loading while redirecting
  return (
    <div className="app-content-container">
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#A85C36] mx-auto mb-4"></div>
          <p className="text-[#332B42]">Redirecting...</p>
        </div>
      </div>
    </div>
  );
}