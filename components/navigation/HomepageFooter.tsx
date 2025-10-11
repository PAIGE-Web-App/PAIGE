'use client';

import React from 'react';
import Link from 'next/link';

interface HomepageFooterProps {
  isLoggedIn?: boolean;
}

const HomepageFooter: React.FC<HomepageFooterProps> = ({ isLoggedIn = false }) => {
  // Only show footer if user is not logged in
  if (isLoggedIn) {
    return null;
  }

  return (
    <footer className="border-t-[0.5px] border-[rgb(236,233,231)] bg-white">
      <div className="px-4 lg:px-8 mx-auto py-6 max-w-7xl">
        <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
          <Link href="/" className="flex items-center no-underline">
            <img 
              src="/PaigeFinal.png" 
              alt="Paige" 
              className="h-[32px] w-auto max-w-none"
            />
          </Link>
          <nav className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
            <a href="#features" className="text-[#332B42] hover:text-[#332B42] no-underline">Features</a>
            <a href="#how" className="text-[#332B42] hover:text-[#332B42] no-underline">How It Works</a>
            <a href="#faq" className="text-[#332B42] hover:text-[#332B42] no-underline">FAQ</a>
            <a href="#pricing" className="text-[#332B42] hover:text-[#332B42] no-underline">Pricing</a>
            <a href="mailto:dave@weddingpaige.com" className="text-[#332B42] hover:text-[#332B42] no-underline">Contact</a>
            <Link href="/privacy" className="text-[#332B42] hover:text-[#332B42] no-underline">Privacy</Link>
            <Link href="/terms" className="text-[#332B42] hover:text-[#332B42] no-underline">Terms</Link>
          </nav>
          <p className="text-sm text-[#5A4A42]">© {new Date().getFullYear()} Paige. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default HomepageFooter;
