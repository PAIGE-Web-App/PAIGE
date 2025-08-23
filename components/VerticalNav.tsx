'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  Home, 
  ClipboardList, 
  DollarSign, 
  Users, 
  FileText, 
  Heart, 
  Settings, 
  LogOut,
  User,
  Bell,
  Sparkles
} from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';
import { handleLogout } from '../utils/logout';
import { useNotifications, NotificationCounts } from '../hooks/useNotifications';
import NotificationPopover from './NotificationPopover';
import NotificationBadge from './NotificationBadge';
import { CreditDisplay } from './CreditDisplay';

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  notificationKey?: string;
}

export default function VerticalNav() {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const router = useRouter();
  const { user, profileImageUrl, profileImageLQIP } = useAuth();
  const { notificationCounts, markNotificationAsRead } = useNotifications();

  const navItems: NavItem[] = [
    { name: "Dashboard", href: "/", icon: Home, notificationKey: "messages" },
    { name: "To-do Lists", href: "/todo", icon: ClipboardList, notificationKey: "todo" },
    { name: "Budget", href: "/budget", icon: DollarSign, notificationKey: "budget" },
    { name: "Vendors", href: "/vendors", icon: Users, notificationKey: "vendors" },
    { name: "Files", href: "/files", icon: FileText },
    { name: "Mood Boards", href: "/moodboards", icon: Heart },
    { name: "Credits", href: "/credits", icon: Sparkles },
  ];

  const userMenuItems = [
    { name: "Settings", href: "/settings", icon: Settings },
    { name: "Logout", href: "#", icon: LogOut, onClick: () => handleLogout(router) },
  ];

  // Handle click outside for user menu and notifications
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };

    if (showUserMenu || showNotifications) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showUserMenu, showNotifications]);

  const isActive = (href: string) => {
    if (href === '/') {
      return pathname === '/';
    }
    return pathname?.startsWith(href);
  };

  const getNotificationCount = (notificationKey?: string) => {
    if (!notificationKey) return 0;
    return notificationCounts[notificationKey as keyof NotificationCounts] || 0;
  };

  return (
    <nav className="fixed left-0 top-0 h-full w-[72px] bg-white border-r border-[#AB9C95] z-30 flex flex-col md:block hidden">
      {/* Top Section: Logo and Navigation Items - Centered with padding */}
      <div className="flex flex-col items-center flex-1 justify-center pt-4">
        {/* Logo */}
        <div className="mb-8">
          <h5 className="text-[#332B42]">P</h5>
        </div>

        {/* Main Navigation Items */}
        <div className="flex flex-col items-center space-y-6">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            const notificationCount = getNotificationCount(item.notificationKey);
            
            return (
              <div key={item.name} className="relative group">
                <a
                  href={item.href}
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 group-hover:bg-[#F3F2F0] ${
                    active 
                      ? 'bg-[#EBE3DD] text-[#A85C36]' 
                      : 'text-[#364257] hover:text-[#A85C36]'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {notificationCount > 0 && (
                    <div className={`absolute -top-1 -right-1 w-5 h-4 rounded-full flex items-center justify-center px-1 ${
                      item.notificationKey === 'todo' ? 'bg-blue-500' : 'bg-red-500'
                    }`}>
                      <span className="text-[10px] text-white font-medium">
                        {notificationCount > 9 ? '9+' : notificationCount}
                      </span>
                    </div>
                  )}
                </a>
                
                {/* Hover Tooltip */}
                <div className="absolute left-full ml-2 top-1/2 transform -translate-y-1/2 bg-[#332B42] text-white text-xs px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
                  {item.name}
                  {notificationCount > 0 && (
                    <span className="ml-1 text-gray-300">
                      ({notificationCount})
                    </span>
                  )}
                  {/* Tooltip arrow */}
                  <div className="absolute right-full top-1/2 transform -translate-y-1/2 w-0 h-0 border-l-4 border-l-transparent border-r-4 border-r-[#332B42] border-t-4 border-t-transparent border-b-4 border-b-transparent"></div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Notifications Bell */}
        <div className="relative group mt-6" ref={notificationsRef}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 group-hover:bg-[#F3F2F0] ${
              showNotifications 
                ? 'bg-[#EBE3DD] text-[#A85C36]' 
                : 'text-[#364257] hover:text-[#A85C36]'
            }`}
          >
            <Bell className="w-5 h-5" />
            <NotificationBadge 
              count={notificationCounts.messages + notificationCounts.budget + notificationCounts.vendors + notificationCounts.todoAssigned} 
              size="md" 
              color="red"
            />
          </button>

          {/* Notifications Popover */}
          <NotificationPopover
            isOpen={showNotifications}
            notificationCounts={notificationCounts}
            onClose={() => setShowNotifications(false)}
            onNotificationClick={(type) => {
              setShowNotifications(false);
              // Navigate to appropriate section based on notification type
              switch (type) {
                case 'messages':
                  router.push('/');
                  break;
                case 'todo':
                  router.push('/todo');
                  break;
                case 'budget':
                  router.push('/budget');
                  break;
                case 'vendors':
                  router.push('/vendors');
                  break;
                default:
                  break;
              }
            }}
            onMarkAsRead={markNotificationAsRead}
          />

          {/* Hover Tooltip for Notifications - Only show when popover is closed */}
          {!showNotifications && (
            <div className="absolute left-full ml-2 top-1/2 transform -translate-y-1/2 bg-[#332B42] text-white text-xs px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
              <div className="text-center">
                <div className="font-medium">Notifications</div>
                <div className="text-[10px] text-gray-200 mt-1">
                  {notificationCounts.messages > 0 && `${notificationCounts.messages} unread messages`}
                  {notificationCounts.todoAssigned > 0 && `${notificationCounts.todoAssigned} assigned tasks`}
                  {notificationCounts.budget > 0 && `${notificationCounts.budget} budget alerts`}
                  {notificationCounts.vendors > 0 && `${notificationCounts.vendors} vendor updates`}
                </div>
              </div>
              <div className="absolute right-full top-1/2 transform -translate-y-1/2 w-0 h-0 border-l-4 border-l-transparent border-r-4 border-r-[#332B42] border-t-4 border-l-transparent border-b-4 border-b-transparent"></div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Section: User Profile - Absolutely positioned at bottom */}
      <div className="absolute bottom-4 left-0 right-0 flex justify-center">
        {/* Credit Display */}
        <div className="mb-4 flex justify-center">
          <CreditDisplay variant="compact" showUpgradePrompt={false} />
        </div>
        
        <div className="relative group">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center cursor-pointer overflow-hidden transition-all duration-200 group-hover:bg-[#F3F2F0]"
            style={{ 
              backgroundColor: '#7D7B7B',
              backgroundImage: imageLoading && profileImageLQIP ? `url(${profileImageLQIP})` : undefined,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
            onClick={() => setShowUserMenu(!showUserMenu)}
          >
            {profileImageUrl ? (
              <img
                src={profileImageUrl}
                alt="Profile"
                className="w-full h-full object-cover"
                onLoad={() => setImageLoading(false)}
                onError={() => setImageLoading(false)}
                style={{ display: imageLoading ? 'none' : 'block' }}
              />
            ) : (
              <User className="w-5 h-5 text-white" />
            )}
            {imageLoading && profileImageUrl && (
              <div className="absolute inset-0 bg-gray-200 animate-pulse" />
            )}
          </div>

          {/* User Menu */}
          {showUserMenu && (
            <div
              ref={userMenuRef}
              className="absolute left-full ml-2 bottom-0 bg-white border border-[#AB9C95] rounded-[5px] shadow-lg z-50 py-1 min-w-[140px]"
            >
              {userMenuItems.map((item) => (
                item.href === "#" ? (
                  <button
                    key={item.name}
                    onClick={() => {
                      if (item.onClick) {
                        item.onClick();
                      }
                    }}
                    className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 no-underline"
                  >
                    {item.icon && <item.icon className="w-4 h-4" />}
                    {item.name}
                  </button>
                ) : (
                  <a
                    key={item.name}
                    href={item.href}
                    className="block px-3 py-2 text-sm text-[#332B42] hover:bg-[#F8F6F4] flex items-center gap-2 no-underline"
                  >
                    {item.icon && <item.icon className="w-4 h-4" />}
                    {item.name}
                  </a>
                )
              ))}
            </div>
          )}

          {/* Hover Tooltip for Profile */}
          <div className="absolute left-full ml-2 top-1/2 transform -translate-y-1/2 bg-[#332B42] text-white text-xs px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
            Profile
            <div className="absolute right-full top-1/2 transform -translate-y-1/2 w-0 h-0 border-l-4 border-l-transparent border-r-4 border-r-[#332B42] border-t-4 border-t-transparent border-b-4 border-b-transparent"></div>
          </div>
        </div>
      </div>
    </nav>
  );
} 