'use client';
import React, { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { 
  Home, 
  ClipboardList, 
  DollarSign, 
  Users, 
  Armchair, 
  FileText, 
  Heart,
  MoreHorizontal,
  Settings,
  LogOut
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<any>;
  badge?: number;
}

interface ModernBottomNavProps {
  className?: string;
}

export default function ModernBottomNav({ className = '' }: ModernBottomNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  // Primary navigation items (always visible)
  const primaryNavItems: NavItem[] = [
    { name: 'Dashboard', href: '/', icon: Home },
    { name: 'To-do', href: '/todo', icon: ClipboardList },
    { name: 'Budget', href: '/budget', icon: DollarSign },
    { name: 'Vendors', href: '/vendors', icon: Users },
  ];

  // Secondary navigation items (in "More" menu)
  const secondaryNavItems: NavItem[] = [
    { name: 'Seating Charts', href: '/seating-charts', icon: Armchair },
    { name: 'Files', href: '/files', icon: FileText },
    { name: 'Mood Boards', href: '/moodboards', icon: Heart },
  ];

  const isActive = (href: string) => {
    if (href === '/') {
      return pathname === '/';
    }
    return pathname.startsWith(href);
  };

  const handleNavigation = (href: string) => {
    router.push(href);
    setShowMoreMenu(false);
  };

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <>
      {/* Bottom Navigation */}
      <nav className={`bg-white border-t border-[#AB9C95]/30 safe-bottom ${className}`}>
        <div className="flex items-center px-2 py-1">
          {/* Primary Navigation Items */}
          {primaryNavItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            
            return (
              <button
                key={item.href}
                onClick={() => handleNavigation(item.href)}
                className={`flex flex-col items-center justify-center px-1 py-2 rounded-lg transition-all duration-200 w-full ${
                  active
                    ? 'text-[#A85C36] bg-[#EBE3DD]'
                    : 'text-[#332B42] hover:bg-[#E0DBD7] hover:text-[#A85C36]'
                }`}
              >
                <div className="relative">
                  <Icon className="w-5 h-5 mb-1" />
                  {item.badge && item.badge > 0 && (
                    <span className="absolute -top-1 -right-1 bg-[#A85C36] text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                      {item.badge > 99 ? '99+' : item.badge}
                    </span>
                  )}
                </div>
                <span className="text-xs font-medium truncate w-full text-center">
                  {item.name}
                </span>
              </button>
            );
          })}

          {/* More Menu Button */}
          <div className="relative w-full">
            <button
              onClick={() => setShowMoreMenu(!showMoreMenu)}
              className={`flex flex-col items-center justify-center px-1 py-2 rounded-lg transition-all duration-200 w-full ${
                showMoreMenu
                  ? 'text-[#A85C36] bg-[#EBE3DD]'
                  : 'text-[#332B42] hover:bg-[#E0DBD7] hover:text-[#A85C36]'
              }`}
            >
              <MoreHorizontal className="w-5 h-5 mb-1" />
              <span className="text-xs font-medium">More</span>
            </button>

            {/* More Menu Dropdown */}
            <AnimatePresence>
              {showMoreMenu && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="absolute bottom-full right-0 mb-2 w-48 bg-white rounded-lg shadow-lg border border-[#AB9C95] z-60"
                >
                  <div className="py-2">
                    {/* Secondary Navigation Items */}
                    {secondaryNavItems.map((item) => {
                      const Icon = item.icon;
                      const active = isActive(item.href);
                      
                      return (
                        <button
                          key={item.href}
                          onClick={() => handleNavigation(item.href)}
                          className={`w-full flex items-center px-4 py-3 text-left transition-colors duration-200 ${
                            active
                              ? 'text-[#A85C36] bg-[#EBE3DD]'
                              : 'text-[#332B42] hover:bg-[#E0DBD7] hover:text-[#A85C36]'
                          }`}
                        >
                          <Icon className="w-4 h-4 mr-3" />
                          <span className="text-sm font-medium">{item.name}</span>
                        </button>
                      );
                    })}
                    
                    {/* Divider */}
                    <div className="border-t border-[#AB9C95] my-2"></div>
                    
                    {/* Settings and Logout */}
                    <button
                      onClick={() => handleNavigation('/settings')}
                      className={`w-full flex items-center px-4 py-3 text-left transition-colors duration-200 ${
                        isActive('/settings')
                          ? 'text-[#A85C36] bg-[#EBE3DD]'
                          : 'text-[#332B42] hover:bg-[#E0DBD7] hover:text-[#A85C36]'
                      }`}
                    >
                      <Settings className="w-4 h-4 mr-3" />
                      <span className="text-sm font-medium">Settings</span>
                    </button>
                    
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center px-4 py-3 text-left text-[#332B42] hover:bg-[#E0DBD7] hover:text-[#A85C36] transition-colors duration-200"
                    >
                      <LogOut className="w-4 h-4 mr-3" />
                      <span className="text-sm font-medium">Logout</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </nav>

      {/* Backdrop for More Menu */}
      <AnimatePresence>
        {showMoreMenu && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black bg-opacity-25"
            onClick={() => setShowMoreMenu(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
