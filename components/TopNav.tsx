'use client';

import React, { useEffect, useState, useRef } from 'react';
import { User, ContactRound, Settings, LogOut, ChevronDown, ChevronUp } from 'lucide-react';
import { getAuth, signOut } from "firebase/auth";
import { usePathname } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';

// Helper to add cache-busting parameter
function addCacheBuster(url: string | null): string | null {
  if (!url) return url;
  return url + (url.includes('?') ? '&' : '?') + 't=' + Date.now();
}

function Spinner() {
  return (
    <svg className="animate-spin h-5 w-5 text-gray-400" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
    </svg>
  );
}

export default function TopNav() {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileNavMenu, setShowMobileNavMenu] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const cacheBustedProfileImageUrlRef = useRef<string | null>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const mobileNavMenuRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const { user, profileImageUrl, profileImageLQIP } = useAuth();

  // Only update cache-busted URL when profileImageUrl changes
  useEffect(() => {
    if (profileImageUrl) {
      cacheBustedProfileImageUrlRef.current = profileImageUrl + (profileImageUrl.includes('?') ? '&' : '?') + 't=' + Date.now();
    } else {
      cacheBustedProfileImageUrlRef.current = null;
    }
    setImageLoading(true);
  }, [profileImageUrl]);

  // Get userName and userId from user object
  const userName = user?.displayName || user?.email || null;
  const userId = user?.uid || null;

  // Logout handler
  const handleLogout = async () => {
    const auth = getAuth();
    await signOut(auth);
    // Optionally, redirect or show a toast
  };

  const navItems = [ // Moved outside component
    { name: "Dashboard", href: "/" },
    { name: "To-do Lists", href: "/todo" },
    { name: "Vendors", href: "/vendors" },
    { name: "Files", href: "/files" },
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
    { name: "Profile", href: "/profile", icon: ContactRound },
    { name: "Settings", href: "/settings", icon: Settings },
    { name: "Logout", href: "#", icon: LogOut, onClick: handleLogout }, // Use the onLogout prop here
  ];

  return (
    <nav className="flex items-center justify-between px-6 py-3 bg-white border-b">
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
          <li key={name}>
            <a
              href={href}
              className={`no-underline ${
                pathname === href
                  ? "text-[#A85C36] font-medium text-[14px] leading-5"
                  : "text-[#364257] font-normal text-[13px]"
              }`}
            >
              {name}
            </a>
          </li>
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
    </nav>
  );
}
