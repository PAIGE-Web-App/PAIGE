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
  User
} from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';
import { handleLogout } from '../utils/logout';

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

export default function VerticalNav() {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const router = useRouter();
  const { user, profileImageUrl, profileImageLQIP } = useAuth();

  const navItems: NavItem[] = [
    { name: "Dashboard", href: "/", icon: Home },
    { name: "To-do Lists", href: "/todo", icon: ClipboardList },
    { name: "Budget", href: "/budget", icon: DollarSign },
    { name: "Vendors", href: "/vendors", icon: Users },
    { name: "Files", href: "/files", icon: FileText },
    { name: "Inspiration", href: "/inspiration", icon: Heart },
  ];

  const userMenuItems = [
    { name: "Settings", href: "/settings", icon: Settings },
    { name: "Logout", href: "#", icon: LogOut, onClick: () => handleLogout(router) },
  ];

  // Handle click outside for user menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };

    if (showUserMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showUserMenu]);

  const isActive = (href: string) => {
    if (href === '/') {
      return pathname === '/';
    }
    return pathname?.startsWith(href);
  };

  return (
    <nav className="fixed left-0 top-0 h-full w-16 bg-white border-r border-[#AB9C95] z-30 flex flex-col md:block hidden">
      {/* Top Section: Logo and Navigation Items - Centered with padding */}
      <div className="flex flex-col items-center flex-1 justify-center pt-4">
        {/* Logo */}
        <div className="mb-8">
          <h5 className="text-[#332B42]">P</h5>
        </div>

        {/* Main Navigation Items */}
        <div className="flex flex-col items-center space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            
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
                </a>
                
                {/* Hover Tooltip */}
                <div className="absolute left-full ml-2 top-1/2 transform -translate-y-1/2 bg-[#332B42] text-white text-xs px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
                  {item.name}
                  {/* Tooltip arrow */}
                  <div className="absolute right-full top-1/2 transform -translate-y-1/2 w-0 h-0 border-l-4 border-l-transparent border-r-4 border-r-[#332B42] border-t-4 border-t-transparent border-b-4 border-b-transparent"></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Section: User Profile - Absolutely positioned at bottom */}
      <div className="absolute bottom-4 left-0 right-0 flex justify-center">
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
                    className="block px-3 py-2 text-sm text-[#332B42] hover:bg-[#F3F2F0] flex items-center gap-2 no-underline"
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