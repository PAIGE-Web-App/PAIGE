// HERO SECTION BACKUP - Current Version
// This is a backup of the current hero section from app/landing/page.tsx
// Created to preserve the original while experimenting with new designs

import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { useState, useEffect } from 'react';

export const HeroSectionBackup = () => {
  const [isLoading, setIsLoading] = useState(true);
  
  // Demo data
  const budgetData = { 
    venue: "$8,500", 
    catering: "$12,000", 
    total: "$23,700 / $25,000",
    allocated: "$23,700",
    flexibility: "$1,300"
  };
  const emailData = { 
    subject: "Wedding Photography Inquiry", 
    preview: "Hi Sarah, I'm planning my wedding for June 15th at the Garden Manor. Would love to discuss your photography packages..."
  };
  const todoData = { items: ["✓ Book venue (Due: Jan 15)", "○ Send save-the-dates (Due: Feb 1)", "○ Finalize guest list (Due: Jan 30)"] };

  // Animation cycle
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    const cycle = () => {
      setIsLoading(true);
      timeoutId = setTimeout(() => {
        setIsLoading(false);
        timeoutId = setTimeout(cycle, 4500);
      }, 2500);
    };
    
    cycle();
    
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);
  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden bg-cover bg-center -mt-20 pt-20" style={{ backgroundImage: 'url(/Final.png)' }}>
        <div className="px-4 lg:px-8 mx-auto grid lg:grid-cols-2 gap-10 items-center py-16 lg:py-24 max-w-7xl">
          <div>
            <h1 className="font-playfair text-4xl leading-tight tracking-tight sm:text-5xl font-semibold">
              Your AI‑Powered Wedding <span className="text-[#A85C36]">Planning Partner</span>
            </h1>
            <p className="mt-4 max-w-xl text-[#5A4A42] font-work">
              We built Paige after our own planning stress so that you don't have to repeat it. From managing to-dos to vendor communication and budgets, Paige handles the details while you focus on celebrating.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href="/login" className="btn-primaryinverse no-underline w-32 text-center whitespace-nowrap">
              Login
            </Link>
            <Link href="/signup" className="btn-primary no-underline w-32 text-center whitespace-nowrap">
              Start Planning
            </Link>
            </div>
            <p className="mt-3 text-sm text-[#5A4A42]">No credit card needed • Cancel anytime</p>
          </div>
          {/* Illustration / Mock */}
          <div className="relative">
            <div className="mx-auto w-full max-w-md rounded-2xl border-[0.5px] border-[rgb(236,233,231)] bg-white p-4 shadow-lg shadow-black/5">
              <div className="rounded-xl bg-gray-50 p-4">
                <div className="grid gap-3">
                  {/* Budget Card */}
                  <div className="rounded-lg bg-white p-4 ring-1 ring-[rgb(236,233,231)]">
                    <div className="text-xs font-semibold text-[#5A4A42]">Budget</div>
                    <div className="mt-1 h-16 flex items-center">
                      <AnimatePresence mode="wait">
                        {isLoading ? (
                          <motion.div
                            key="loading"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="space-y-1 w-full"
                          >
                            <div className="text-xs text-[#8B5CF6] font-medium flex items-center gap-1">
                              <Sparkles className="w-3 h-3" />
                              Generating Budget...
                            </div>
                            <div className="h-3 w-2/3 rounded bg-[#A85C36]/20 animate-pulse"></div>
                            <div className="h-3 w-1/2 rounded bg-[#A85C36]/15 animate-pulse"></div>
                            <div className="h-3 w-4/5 rounded bg-[#A85C36]/25 animate-pulse"></div>
                          </motion.div>
                        ) : (
                          <motion.div
                            key="content"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="space-y-1 w-full"
                          >
                            <div className="text-xs text-[#5A4A42]">Venue: {budgetData.venue}</div>
                            <div className="text-xs text-[#5A4A42]">Catering: {budgetData.catering}</div>
                            <div className="text-xs font-semibold text-[#5A4A42]">
                              Tot. Allocated: {budgetData.allocated} | Flexibility: {budgetData.flexibility}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

                  {/* Email Card */}
                  <div className="rounded-lg bg-white p-4 ring-1 ring-[rgb(236,233,231)]">
                    <div className="text-xs font-semibold text-[#5A4A42]">Vendor Email</div>
                    <div className="mt-1 h-16 flex items-center">
                      <AnimatePresence mode="wait">
                        {isLoading ? (
                          <motion.div
                            key="loading"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="space-y-1 w-full"
                          >
                            <div className="text-xs text-[#8B5CF6] font-medium flex items-center gap-1">
                              <Sparkles className="w-3 h-3" />
                              Generating Vendor Email...
                            </div>
                            <div className="h-3 w-3/4 rounded bg-gray-200 animate-pulse"></div>
                            <div className="h-3 w-full rounded bg-gray-100 animate-pulse"></div>
                            <div className="h-3 w-1/2 rounded bg-gray-100 animate-pulse"></div>
                          </motion.div>
                        ) : (
                          <motion.div
                            key="content"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="space-y-1 w-full"
                          >
                            <div className="text-xs font-semibold text-[#5A4A42]">{emailData.subject}</div>
                            <div className="text-xs text-[#5A4A42]">{emailData.preview}</div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

                  {/* To-Dos Card */}
                  <div className="rounded-lg bg-white p-4 ring-1 ring-[rgb(236,233,231)]">
                    <div className="text-xs font-semibold text-[#5A4A42]">To‑Dos</div>
                    <div className="mt-1 h-16 flex items-center">
                      <AnimatePresence mode="wait">
                        {isLoading ? (
                          <motion.div
                            key="loading"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="space-y-1 w-full"
                          >
                            <div className="text-xs text-[#8B5CF6] font-medium flex items-center gap-1">
                              <Sparkles className="w-3 h-3" />
                              Generating To-dos...
                            </div>
                            <div className="h-3 w-4/5 rounded bg-[#A85C36]/25 animate-pulse"></div>
                            <div className="h-3 w-2/3 rounded bg-[#A85C36]/15 animate-pulse"></div>
                            <div className="h-3 w-3/4 rounded bg-[#A85C36]/20 animate-pulse"></div>
                          </motion.div>
                        ) : (
                          <motion.div
                            key="content"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="space-y-1 w-full"
                          >
                            {todoData.items.map((item, index) => (
                              <div key={index} className="text-xs text-[#5A4A42]">{item}</div>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {/* Calm floating element - positioned relative to the main card */}
            <div className="pointer-events-none absolute h-16 w-16 rotate-12 items-center justify-center rounded-xl bg-[#A85C36] text-white shadow-lg shadow-black/5 hidden lg:flex" style={{ right: '24px', top: '-24px' }}>
              <span className="font-playfair text-sm">Calm ✨</span>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

// Required imports for the backup:
// import { motion, AnimatePresence } from "framer-motion";
// import { Sparkles } from "lucide-react";
// import Link from "next/link";

// Required state variables:
// const [isLoading, setIsLoading] = useState(true);
// const budgetData = { venue: "$8,500", catering: "$12,000", allocated: "$20,500", flexibility: "$2,000" };
// const emailData = { subject: "Wedding Venue Inquiry", preview: "Hi! We're planning our wedding..." };
// const todoData = { items: ["✓ Book venue (Due: Jan 15)", "○ Send save-the-dates (Due: Feb 1)", "○ Finalize guest list (Due: Jan 30)"] };

// Required useEffect for animation:
// useEffect(() => {
//   let timeoutId: NodeJS.Timeout;
//   const cycle = () => {
//     setIsLoading(true);
//     timeoutId = setTimeout(() => {
//       setIsLoading(false);
//       timeoutId = setTimeout(cycle, 4500);
//     }, 2500);
//   };
//   cycle();
//   return () => {
//     if (timeoutId) clearTimeout(timeoutId);
//   };
// }, []);
