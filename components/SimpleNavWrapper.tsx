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
  const { user } = useAuth();
  const { isMobile, isDesktop } = useMobileDetection();

  // Simplified: Only check if user exists, let middleware handle auth redirects
  // If no user, just render children without nav (middleware will redirect)
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
