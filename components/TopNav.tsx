'use client';

import React, { useEffect, useState, useRef } from 'react';
import { User, ContactRound, Settings, LogOut, ChevronDown, ChevronUp } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';
import { handleLogout } from '../utils/logout';
import LoadingSpinner from './LoadingSpinner';

// Helper to add cache-busting parameter
function addCacheBuster(url: string | null): string | null {
  if (!url) return url;
  return url + (url.includes('?') ? '&' : '?') + 't=' + Date.now();
}

function Spinner() {
  return <LoadingSpinner size="sm" />;
}

export default function TopNav() {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileNavMenu, setShowMobileNavMenu] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const cacheBustedProfileImageUrlRef = useRef<string | null>(null);
  const timestampRef = useRef<string>(Date.now().toString());  // Create a stable timestamp per mount
  const userMenuRef = useRef<HTMLDivElement>(null);
  const mobileNavMenuRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const router = useRouter();
  const { user, profileImageUrl, profileImageLQIP } = useAuth();
  // Remove showVendorsPopover state

  // Only update cache-busted URL when profileImageUrl changes
  useEffect(() => {
    if (profileImageUrl) {
      cacheBustedProfileImageUrlRef.current = profileImageUrl + (profileImageUrl.includes('?') ? '&' : '?') + 't=' + timestampRef.current;
    } else {
      cacheBustedProfileImageUrlRef.current = null;
    }
    setImageLoading(true);
  }, [profileImageUrl]);

  // Get userName and userId from user object
  const userName = user?.displayName || user?.email || null;
  const userId = user?.uid || null;

  // Logout handler
  const handleLogoutClick = async () => {
    await handleLogout(router);
  };

  const navItems = [ // Moved outside component
    { name: "Dashboard", href: "/dashboard" },
    { name: "Messages", href: "/messages" },
    { name: "To-do Lists", href: "/todo" },
    { name: "Budget", href: "/budget" },
    { name: "Vendors", href: "/vendors" },
    { name: "Seating Charts", href: "/seating-charts" },
    { name: "Files", href: "/files" },
    { name: "Mood Boards", href: "/moodboards" },
  ];

  useEffect(() => {
    console.log("TopNav received userName:", userName);
    console.log("TopNav received userId:", userId);
  }, [userName, userId]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Close user menu if click is outside
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
      // Close mobile nav menu if click is outside
      if (mobileNavMenuRef.current && !mobileNavMenuRef.current.contains(event.target as Node)) {
        setShowMobileNavMenu(false);
      }
    };

    if (showUserMenu || showMobileNavMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showUserMenu, showMobileNavMenu]);

  // User-specific menu items
  const userMenuItems = [
    { name: "Settings", href: "/settings", icon: Settings },
    { name: "Logout", href: "#", icon: LogOut, onClick: handleLogoutClick }, // Use the centralized logout function
  ];

  return (
    <nav className="bg-white border-b">
      <div className="app-container flex items-center justify-between px-6 py-3">
      {/* Left section: Hamburger (mobile) and Logo */}
      <div className="flex items-center">
        {/* Hamburger menu for mobile (visible on md and smaller screens) */}
        <div className="md:hidden relative">
          <button
            onClick={() => setShowMobileNavMenu(!showMobileNavMenu)} // Toggles only the mobile nav menu
            className="p-2 text-[#332B42] hover:bg-[#F3F2F0] rounded-[5px]"
            aria-label="Open navigation menu"
          >
            {/* Hamburger icon */}
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M4 6h16M4 12h16M4 18h16"
              ></path>
            </svg>
          </button>
          {showMobileNavMenu && (
            <div
              ref={mobileNavMenuRef} // This ref is for the mobile nav menu
              className="absolute top-full left-0 mt-2 w-40 bg-white border border-[#AB9C95] rounded-[5px] shadow-lg z-50 py-1"
            >
              {/* Render main navigation items for mobile */}
              {navItems.map((item) => (
                <a key={item.name} href={item.href} className="block px-4 py-2 text-sm text-[#332B42] hover:bg-[#F3F2F0] no-underline">
                  {item.name}
                </a>
              ))}
            </div>
          )}
        </div>
        <div className="font-playfair text-lg text-[#332B42] ml-2 md:ml-0">Logo</div>
      </div>


      {/* Desktop navigation (hidden on mobile) */}
      <ul className="hidden md:flex items-center gap-6">
        {navItems.map(({ name, href }) => (
          name === 'Vendors' ? (
            <li key={name} className="relative group">
              <div
                className={`no-underline cursor-pointer ${
                  (pathname ?? '').startsWith('/vendors')
                    ? "text-[#A85C36] font-medium text-[14px] leading-5"
                    : "text-[#364257] font-normal text-[13px]"
                }`}
              >
                Vendors
              </div>
              {/* Pure CSS hover popover - mt-0 to avoid gap, block instead of flex */}
              <div
                className="absolute left-0 top-full mt-0 w-48 bg-white border border-[#AB9C95] rounded-[5px] shadow-lg z-50 py-2 hidden group-hover:block transition-opacity duration-150 opacity-0 group-hover:opacity-100"
                // If the popover is still clipped, check for overflow: hidden on parent containers
              >
                <a href="/vendors" className="px-4 py-2 text-sm text-[#332B42] hover:bg-[#F3F2F0] no-underline w-full block">Your Vendors</a>
                <a href="/vendors/catalog" className="px-4 py-2 text-sm text-[#332B42] hover:bg-[#F3F2F0] no-underline w-full block">Vendor Catalog</a>
              </div>
            </li>
          ) : (
            <li key={name}>
              <a
                href={href}
                className={`no-underline ${
                  (pathname ?? '') === href
                    ? "text-[#A85C36] font-medium text-[14px] leading-5"
                    : "text-[#364257] font-normal text-[13px]"
                }`}
              >
                {name}
              </a>
            </li>
          )
        ))}
      </ul>

      {/* Right section: STARTER button and User Profile */}
      <div className="flex items-center gap-4 relative">
        <button className="text-xs border border-[#332B42] text-[#332B42] px-3 py-1 rounded-[5px] font-semibold">STARTER</button>
        {/* User Profile Icon and Dropdown (visible on all screen sizes) */}
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-base font-medium text-white cursor-pointer overflow-hidden"
          style={{ 
            backgroundColor: '#7D7B7B',
            backgroundImage: imageLoading && profileImageLQIP ? `url(${profileImageLQIP})` : undefined,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            transition: 'background-image 0.3s',
          }}
          onClick={() => setShowUserMenu(!showUserMenu)}
        >
          {cacheBustedProfileImageUrlRef.current ? (
            <>
              <img
                key={cacheBustedProfileImageUrlRef.current}
                src={cacheBustedProfileImageUrlRef.current}
                alt="Profile"
                className="w-full h-full object-cover"
                onLoad={() => setImageLoading(false)}
                onError={() => setImageLoading(false)}
                style={{ display: imageLoading ? 'none' : 'block' }}
              />
              {imageLoading && <Spinner />}
            </>
          ) : (
            <User className="w-5 h-5" />
          )}
        </div>

        {showUserMenu && (
          <div
            ref={userMenuRef} // This ref is for the user menu
            className="absolute top-full right-0 mt-2 w-40 bg-white border border-[#AB9C95] rounded-[5px] shadow-lg z-50 py-1"
          >
            {userMenuItems.map((item) => (
              item.href === "#" ? ( // Handle logout button
                <button
                  key={item.name}
                  onClick={() => {
                    if (item.onClick) {
                      item.onClick();
                    }
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 no-underline"
                >
                  {item.icon && <item.icon className="w-4 h-4" />}
                  {item.name}
                </button>
              ) : (
                <a
                  key={item.name}
                  href={item.href}
                  className="block px-4 py-2 text-sm text-[#332B42] hover:bg-[#F3F2F0] flex items-center gap-2 no-underline"
                >
                  {item.icon && <item.icon className="w-4 h-4" />}
                  {item.name}
                </a>
              )
            ))}
          </div>
        )}
      </div>
      </div>
    </nav>
  );
}
