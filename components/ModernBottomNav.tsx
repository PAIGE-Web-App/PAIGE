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
  LogOut,
  User as UserIcon,
  MessageSquare
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';

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
  const { user, profileImageUrl } = useAuth();
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  // Primary navigation items (always visible)
  const primaryNavItems: NavItem[] = [
    { name: 'Dashboard', href: '/', icon: Home },
    { name: 'Messages', href: '/messages', icon: MessageSquare },
    { name: 'To-do', href: '/todo', icon: ClipboardList },
    { name: 'Budget', href: '/budget', icon: DollarSign },
    { name: 'Vendors', href: '/vendors', icon: Users },
  ];

  // User profile menu items
  const userProfileItems: NavItem[] = [
    { name: 'Mood Boards', href: '/moodboards', icon: Heart },
    { name: 'Seating Charts', href: '/seating-charts', icon: Armchair },
    { name: 'Settings', href: '/settings', icon: Settings },
    { name: 'Files', href: '/files', icon: FileText },
  ];

  const isActive = (href: string) => {
    if (href === '/') {
      return pathname === '/';
    }
    return pathname?.startsWith(href) || false;
  };

  const handleNavigation = (href: string) => {
    router.push(href);
    setShowMoreMenu(false);
    setShowUserMenu(false);
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <>
      {/* Bottom Navigation */}
      <nav className={`bg-white border-t border-[#AB9C95]/10 safe-bottom ${className}`}>
        <div className="flex items-center justify-between px-4 py-3">
          {/* Primary Navigation Items */}
          {primaryNavItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            
            return (
              <button
                key={item.href}
                onClick={() => handleNavigation(item.href)}
                className={`flex-1 flex items-center justify-center transition-all duration-200 relative ${
                  active
                    ? 'text-[#A85C36]'
                    : 'text-[#364257] hover:text-[#A85C36]'
                }`}
                title={item.name}
              >
                <div className="relative">
                  <Icon className="w-5 h-5" />
                  {item.badge && item.badge > 0 && (
                    <span className="absolute -top-1 -right-1 bg-[#A85C36] text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                      {item.badge > 99 ? '99+' : item.badge}
                    </span>
                  )}
                </div>
              </button>
            );
          })}

          {/* User Profile Button */}
          <div className="relative flex-1 flex justify-center">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 overflow-hidden ${
                showUserMenu
                  ? 'text-[#A85C36]'
                  : 'text-[#364257] hover:text-[#A85C36]'
              }`}
              style={{
                border: showUserMenu ? '0.5px solid #A85C36' : '0.5px solid #AB9C95'
              }}
              onMouseEnter={(e) => {
                if (!showUserMenu) {
                  e.currentTarget.style.borderColor = '#A85C36';
                }
              }}
              onMouseLeave={(e) => {
                if (!showUserMenu) {
                  e.currentTarget.style.borderColor = '#AB9C95';
                }
              }}
              title="Profile"
            >
              {profileImageUrl ? (
                <img
                  src={profileImageUrl}
                  alt="Profile"
                  className="w-full h-full object-cover rounded-full"
                />
              ) : (
                <UserIcon className="w-4 h-4" />
              )}
            </button>

            {/* User Profile Menu Dropdown */}
            <AnimatePresence>
              {showUserMenu && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="absolute bottom-full right-0 mb-2 w-48 bg-white rounded-lg shadow-lg border border-[#AB9C95] z-60"
                >
                  <div className="py-2">
                    {/* User Profile Items */}
                    {userProfileItems.map((item) => {
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
                    
                    {/* Logout */}
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

      {/* Backdrop for Menus */}
      <AnimatePresence>
        {(showMoreMenu || showUserMenu) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black bg-opacity-25"
            onClick={() => {
              setShowMoreMenu(false);
              setShowUserMenu(false);
            }}
          />
        )}
      </AnimatePresence>
    </>
  );
}
