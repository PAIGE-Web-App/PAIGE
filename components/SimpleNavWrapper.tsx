'use client';

import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import VerticalNav from './VerticalNav';
import ModernBottomNav from './ModernBottomNav';
import MobileCreditBar from './MobileCreditBar';
import { useMobileDetection } from '../hooks/useMobileDetection';

interface SimpleNavWrapperProps {
  children: React.ReactNode;
}

export default function SimpleNavWrapper({ children }: SimpleNavWrapperProps) {
  const { user, loading } = useAuth();
  const { isMobile, isDesktop } = useMobileDetection();

  // Show loading state while authentication is being checked
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[#805d93] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // If no user after loading is complete, render children without nav
  // The individual page components will handle the redirect
  if (!user) {
    return <div className="min-h-screen">{children}</div>;
  }

  // Mobile Layout: Bottom Navigation Inside Container
  if (isMobile) {
    return (
      <div className="min-h-screen flex flex-col">
        <div className="flex-1 overflow-hidden">
          {children}
        </div>
        <MobileCreditBar />
        <ModernBottomNav />
      </div>
    );
  }

  // Desktop Layout: Vertical Sidebar
  return (
    <div className="flex min-h-screen">
      <VerticalNav />
      <main className="flex-1 lg:ml-[72px]">
        {children}
      </main>
    </div>
  );
}
