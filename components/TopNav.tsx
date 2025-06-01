// components/TopNav.tsx
'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { useEffect, useState, useRef } from 'react';
import { User, ContactRound, Settings, LogOut } from 'lucide-react';

interface TopNavProps {
  userName: string | null;
  userId: string | null;
}

// Removed stringToColor as it's no longer used for avatar background

const navItems = [ // Moved outside component
  { name: "Dashboard", href: "/" },
  { name: "To-do Lists", href: "/todo" },
  { name: "Vendors", href: "/vendors" },
  { name: "Files", href: "/files" },
];

export default function TopNav({ userName, userId }: TopNavProps) {
  const pathname = usePathname();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    console.log("TopNav received userName:", userName);
    console.log("TopNav received userId:", userId);
  }, [userName, userId]);

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

  const avatarBgColor = '#7D7B7B';

  return (
    <nav className="flex items-center justify-between px-6 py-3 bg-white border-b">
      <div className="font-playfair text-lg text-[#332B42]">Logo</div>
      <ul className="hidden md:flex items-center gap-6"> {/* Hidden on mobile */}
        {navItems.map(({ name, href }) => (
          <li key={name}>
            <Link
              href={href}
              className={`no-underline ${
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
      <div className="flex items-center gap-4 relative">
        <button className="text-xs border border-[#332B42] text-[#332B42] px-3 py-1 rounded-[5px] font-semibold">STARTER</button>
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-base font-medium text-white cursor-pointer"
          style={{ backgroundColor: avatarBgColor }}
          onClick={() => setShowUserMenu(!showUserMenu)}
        >
          <User className="w-5 h-5" />
        </div>

        {showUserMenu && (
          <div
            ref={menuRef}
            className="absolute top-full right-0 mt-2 w-40 bg-white border border-[#AB9C95] rounded-[5px] shadow-lg z-50 py-1"
          >
            <Link href="/profile" className="block px-4 py-2 text-sm text-[#332B42] hover:bg-[#F3F2F0] flex items-center gap-2 no-underline">
              <ContactRound className="w-4 h-4" />
              Profile
            </Link>
            <Link href="/settings" className="block px-4 py-2 text-sm text-[#332B42] hover:bg-[#F3F2F0] flex items-center gap-2 no-underline">
              <Settings className="w-4 h-4" />
              Settings
            </Link>
            <button
              onClick={() => {
                console.log("Logging out...");
              }}
              className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-b-[5px] flex items-center gap-2 no-underline"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        )}
      </div>
       {/* Hamburger menu for mobile */}
       <div className="md:hidden">
        <button
          onClick={() => setShowUserMenu(!showUserMenu)} // Reusing showUserMenu for hamburger, might want a separate state
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
        {showUserMenu && (
          <div
            ref={menuRef} // Reusing menuRef
            className="absolute top-full right-0 mt-2 w-40 bg-white border border-[#AB9C95] rounded-[5px] shadow-lg z-50 py-1"
          >
            {navItems.map(({ name, href }) => (
              <Link key={name} href={href} className="block px-4 py-2 text-sm text-[#332B42] hover:bg-[#F3F2F0] no-underline">
                {name}
              </Link>
            ))}
            <Link href="/profile" className="block px-4 py-2 text-sm text-[#332B42] hover:bg-[#F3F2F0] flex items-center gap-2 no-underline">
              <ContactRound className="w-4 h-4" />
              Profile
            </Link>
            <Link href="/settings" className="block px-4 py-2 text-sm text-[#332B42] hover:bg-[#F3F2F0] flex items-center gap-2 no-underline">
              <Settings className="w-4 h-4" />
              Settings
            </Link>
            <button
              onClick={() => {
                console.log("Logging out...");
              }}
              className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-b-[5px] flex items-center gap-2 no-underline"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
