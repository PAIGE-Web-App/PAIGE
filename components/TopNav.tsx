// components/TopNav.tsx
'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { useEffect, useState, useRef } from 'react';
import { User, ContactRound, Settings, LogOut } from 'lucide-react'; // Import new icons

interface TopNavProps {
  userName: string | null;
  userId: string | null;
}

// Simple deterministic color generator based on a string (no longer used for avatar background)
const stringToColor = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  let color = '#';
  for (let i = 0; i < 3; i++) {
    const value = (hash >> (i * 8)) & 0xFF;
    color += ('00' + value.toString(16)).substr(-2);
  }
  return color;
};


const navItems = [
  { name: "Dashboard", href: "/" },
  { name: "To-do Lists", href: "/todo" },
  { name: "Vendors", href: "/vendors" },
  { name: "Files", href: "/files" },
];

export default function TopNav({ userName, userId }: TopNavProps) {
  const pathname = usePathname();
  const [showUserMenu, setShowUserMenu] = useState(false); // State for menu visibility
  const menuRef = useRef<HTMLDivElement>(null); // Ref for the menu div

  // Debugging log to see what userName and userId are received
  useEffect(() => {
    console.log("TopNav received userName:", userName);
    console.log("TopNav received userId:", userId);
  }, [userName, userId]);

  // Handle clicks outside the menu to close it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
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


  // The avatar background color is now fixed as per your request
  const avatarBgColor = '#7D7B7B'; // Changed background color to #7D7B7B

  return (
    <nav className="flex items-center justify-between px-6 py-3 bg-white border-b">
      <div className="font-playfair text-lg text-[#332B42]">Logo</div>
      <ul className="flex items-center gap-6">
        {navItems.map(({ name, href }) => (
          <li key={name}>
            <Link
              href={href}
              className={`no-underline ${ // Added no-underline class
                pathname === href
                  ? "text-[#A85C36] font-medium text-[14px] leading-5"
                  : "text-[#364257] font-normal text-[13px]"
              }`}
            >
              {name}
            </Link>
          </li>
        ))}
      </ul>
      <div className="flex items-center gap-4 relative"> {/* Added relative for positioning the dropdown */}
        <button className="text-xs border border-[#332B42] text-[#332B42] px-3 py-1 rounded-[5px] font-semibold">STARTER</button>
        {/* User Avatar/Icon */}
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-base font-medium text-white cursor-pointer" // Added cursor-pointer
          style={{ backgroundColor: avatarBgColor }}
          onClick={() => setShowUserMenu(!showUserMenu)} // Toggle menu on click
        >
          <User className="w-5 h-5" /> {/* Lucide User icon */}
        </div>

        {/* User Menu Popover */}
        {showUserMenu && (
          <div
            ref={menuRef} // Apply ref to the menu div
            className="absolute top-full right-0 mt-2 w-40 bg-white border border-[#AB9C95] rounded-[5px] shadow-lg z-50 py-1"
          >
            <Link href="/profile" className="block px-4 py-2 text-sm text-[#332B42] hover:bg-[#F3F2F0] flex items-center gap-2 no-underline">
              <ContactRound className="w-4 h-4" /> {/* Profile Icon */}
              Profile
            </Link>
            <Link href="/settings" className="block px-4 py-2 text-sm text-[#332B42] hover:bg-[#F3F2F0] flex items-center gap-2 no-underline">
              <Settings className="w-4 h-4" /> {/* Settings Icon */}
              Settings
            </Link>
            <button
              onClick={() => {
                // Handle logout logic here
                console.log("Logging out...");
                // Example: signOut(auth); router.push('/login');
              }}
              className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-b-[5px] flex items-center gap-2 no-underline"
            >
              <LogOut className="w-4 h-4" /> {/* Logout Icon */}
              Logout
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
