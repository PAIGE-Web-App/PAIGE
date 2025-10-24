'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';

interface HomepageNavbarProps {
  isLoggedIn?: boolean;
}

const HomepageNavbar: React.FC<HomepageNavbarProps> = ({ isLoggedIn = false }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Only show navbar if user is not logged in
  if (isLoggedIn) {
    return null;
  }

  return (
    <div className="sticky top-0 z-30 pt-4 px-4">
      <header className="mx-auto max-w-7xl rounded-2xl bg-white/80 backdrop-blur border-[0.25px] border-[rgb(236,233,231)] mx-8">
        <div className="px-4 flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center no-underline">
            <img 
              src="/PaigeFinal.png" 
              alt="Paige" 
              className="h-[32px] w-auto max-w-none"
            />
          </Link>
          <nav className="hidden md:flex items-center gap-8 text-sm">
            <a href="#features" className="text-[#332B42] hover:text-[#332B42] no-underline">Features</a>
            <a href="#how" className="text-[#332B42] hover:text-[#332B42] no-underline">How It Works</a>
            <a href="#faq" className="text-[#332B42] hover:text-[#332B42] no-underline">FAQ</a>
            <a href="#pricing" className="text-[#332B42] hover:text-[#332B42] no-underline">Pricing</a>
            <Link href="/privacy" className="text-[#332B42] hover:text-[#332B42] no-underline">Privacy</Link>
            <Link href="/terms" className="text-[#332B42] hover:text-[#332B42] no-underline">Terms</Link>
          </nav>
          <div className="hidden md:flex items-center gap-3">
            <Link href="/login" className="btn-primaryinverse no-underline w-24 text-center whitespace-nowrap">
              Login
            </Link>
            <Link href="/signup" className="btn-primary no-underline w-24 text-center whitespace-nowrap">
              Start for Free
            </Link>
          </div>
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden inline-flex items-center justify-center rounded-lg p-2 hover:bg-gray-100" 
            aria-label="Open menu"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
        
        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
              <a href="#features" className="block px-3 py-2 text-base font-medium text-[#332B42] hover:text-[#332B42]">Features</a>
              <a href="#how" className="block px-3 py-2 text-base font-medium text-[#332B42] hover:text-[#332B42]">How It Works</a>
              <a href="#faq" className="block px-3 py-2 text-base font-medium text-[#332B42] hover:text-[#332B42]">FAQ</a>
              <a href="#pricing" className="block px-3 py-2 text-base font-medium text-[#332B42] hover:text-[#332B42]">Pricing</a>
              <Link href="/privacy" className="block px-3 py-2 text-base font-medium text-[#332B42] hover:text-[#332B42]">Privacy</Link>
              <Link href="/terms" className="block px-3 py-2 text-base font-medium text-[#332B42] hover:text-[#332B42]">Terms</Link>
              <div className="flex flex-col gap-2 pt-2">
                <Link href="/login" className="block px-3 py-2 text-base font-medium text-[#332B42] hover:text-[#332B42]">Login</Link>
                <Link href="/signup" className="block px-3 py-2 text-base font-medium text-white bg-[#A85C36] rounded-lg hover:bg-[#8B4A2A]">Start for Free</Link>
              </div>
            </div>
          </div>
        )}
      </header>
    </div>
  );
};

export default HomepageNavbar;
