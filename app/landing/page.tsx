"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import confetti from 'canvas-confetti';
import ScrollingTodoList from "@/components/ScrollingTodoList";
import ScrollingTodoListReversed from "@/components/ScrollingTodoListReversed";
import FeaturesGrid from "@/components/FeaturesCarousel";
import { 
  Sparkles, 
  MessageSquare, 
  DollarSign, 
  ClipboardList, 
  Users, 
  User,
  Heart, 
  FileText, 
  Bot,
  ArrowRight,
  CheckCircle,
  Star,
  Calendar,
  MapPin,
  Wand2,
  Menu,
  X,
  Armchair
} from "lucide-react";
import Link from "next/link";

export default function LandingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [demoStep, setDemoStep] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [openAccordion, setOpenAccordion] = useState<number | null>(0); // First item open by default
  const toggleAccordion = (index: number) => {
    setOpenAccordion(openAccordion === index ? null : index);
  };

  // Demo data - single examples
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

  // Animation cycle - loading (2.5s) then content (4.5s)
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    const cycle = () => {
      // Show loading for 2.5 seconds
      setIsLoading(true);
      timeoutId = setTimeout(() => {
        // Show content for 4.5 seconds
        setIsLoading(false);
        timeoutId = setTimeout(cycle, 4500);
      }, 2500);
    };
    
    cycle();
    
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  // Redirect authenticated users to dashboard
  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  // Confetti effect for hero section
  useEffect(() => {
    if (!isClient) return;

    let confettiInterval: NodeJS.Timeout;
    let heroConfetti: any = null;
    
    const createConfetti = () => {
      // Create a custom canvas for the hero section on both mobile and desktop
      if (!heroConfetti) {
        const heroElement = document.querySelector('section.relative.overflow-hidden.bg-linen');
        if (heroElement) {
          const canvas = document.createElement('canvas');
          canvas.style.position = 'absolute';
          canvas.style.top = '0';
          canvas.style.left = '0';
          canvas.style.width = '100%';
          canvas.style.height = '100%';
          canvas.style.pointerEvents = 'none';
          canvas.style.zIndex = '10';
          heroElement.appendChild(canvas);
          
          heroConfetti = confetti.create(canvas, {
            resize: true,
            useWorker: false
          });
        }
      }
      
      if (heroConfetti) {
        // Create confetti from left side
        heroConfetti({
          particleCount: 5,
          angle: 60,
          spread: 45,
          origin: { x: 0, y: 0.8 },
          colors: ['#A85C36', '#805d93', '#332B42', '#AB9C95', '#F3F2F0']
        });
        
        // Create confetti from right side
        heroConfetti({
          particleCount: 5,
          angle: 120,
          spread: 45,
          origin: { x: 1, y: 0.8 },
          colors: ['#A85C36', '#805d93', '#332B42', '#AB9C95', '#F3F2F0']
        });
      }
    };

    // Start confetti after a short delay
    const startConfetti = () => {
      confettiInterval = setInterval(createConfetti, 4000); // Every 4 seconds
    };

    const timeoutId = setTimeout(startConfetti, 2000); // Start after 2 seconds

    return () => {
      clearTimeout(timeoutId);
      if (confettiInterval) clearInterval(confettiInterval);
      if (heroConfetti) {
        heroConfetti.reset();
      }
    };
  }, [isClient]);

  // Prevent hydration mismatch
  useEffect(() => {
    setIsClient(true);
    
    // Initial celebratory confetti burst
    if (typeof window !== 'undefined') {
      setTimeout(() => {
        confetti({
          particleCount: 60,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#A85C36', '#805d93', '#332B42', '#AB9C95', '#F3F2F0', '#784528']
        });
      }, 1000);
    }
  }, []);

  if (loading || !isClient) {
    return (
      <div className="min-h-screen bg-linen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#A85C36]"></div>
      </div>
    );
  }

  if (user) {
    return null; // Will redirect to dashboard
  }

  return (
    <div className="bg-linen text-[#332B42] antialiased">
      {/* Mobile sticky CTA */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t-[0.5px] border-[rgb(236,233,231)] bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/70 lg:hidden">
        <div className="px-4 mx-auto py-3 flex items-center gap-3 max-w-7xl">
          <Link href="/signup" className="btn-primary flex-1 text-center no-underline">
            Start Planning Free
          </Link>
          <Link href="/login" className="btn-primaryinverse px-4 py-3 no-underline">
            Login
          </Link>
        </div>
      </div>

      {/* NAVBAR */}
      <div className="sticky top-0 z-30 pt-4 px-4">
        <header className="mx-auto max-w-7xl rounded-2xl bg-white/80 backdrop-blur border-[0.25px] border-[rgb(236,233,231)] mx-8">
          <div className="px-4 flex h-16 items-center justify-between">
          <Link href="#" className="flex items-center gap-2 no-underline">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[#A85C36] text-white font-semibold">P</span>
            <span className="font-playfair text-xl text-[#332B42]">Paige</span>
          </Link>
          <nav className="hidden md:flex items-center gap-8 text-sm">
            <a href="#features" className="text-[#332B42] hover:text-[#332B42] no-underline">Features</a>
            <a href="#how" className="text-[#332B42] hover:text-[#332B42] no-underline">How It Works</a>
            <a href="#faq" className="text-[#332B42] hover:text-[#332B42] no-underline">FAQ</a>
            <a href="#pricing" className="text-[#332B42] hover:text-[#332B42] no-underline">Pricing</a>
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
        {/* mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t-[0.5px] border-[rgb(236,233,231)] bg-white">
            <div className="px-4 mx-auto py-3 grid gap-2 text-sm">
              <a href="#features" className="py-2 no-underline">Features</a>
              <a href="#how" className="py-2 no-underline">How It Works</a>
              <a href="#faq" className="py-2 no-underline">FAQ</a>
              <a href="#pricing" className="py-2 no-underline">Pricing</a>
              <div className="flex gap-3 pt-2">
                <Link href="/login" className="btn-primaryinverse flex-1 text-center no-underline">
                  Sign in
                </Link>
                <Link href="/signup" className="btn-primary flex-1 text-center no-underline">
                  Start Free
                </Link>
              </div>
            </div>
          </div>
        )}
        </header>
      </div>

      {/* HERO - JASPER-STYLE LAYOUT */}
      <section className="relative overflow-hidden bg-linen -mt-20 pt-20 h-screen flex flex-col">
        <div className="px-4 lg:px-8 mx-auto max-w-7xl flex-1 flex flex-col">
          {/* Top Section - Text Content */}
          <div className="py-8 lg:py-12 flex-shrink-0">
            <div className="text-center">
              <h1 className="font-playfair text-4xl leading-tight tracking-tight sm:text-5xl lg:text-6xl font-semibold text-[#332B42]">
                <span className="block sm:inline">Your AI-Powered</span> <span className="text-[#A85C36]">Wedding Planner</span>
              </h1>
              <p className="mt-6 max-w-3xl mx-auto text-[#5A4A42] font-work lg:text-xl">
                Created to minimize stress and maximize celebration.<br />
                Easily manage your to-dos, vendor communication, budgets and more with AI.
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
                <Link href="/signup" className="btn-primary no-underline px-8 py-3 text-center whitespace-nowrap">
                  Start Free Trial
                </Link>
                <Link href="/login" className="btn-primaryinverse no-underline px-8 py-3 text-center whitespace-nowrap">
                  Get A Demo
                </Link>
              </div>
              <p className="mt-4 text-sm text-[#5A4A42]">No credit card needed • Cancel anytime</p>
            </div>
          </div>

          {/* Bottom Section - Image with Animated Demo Cards */}
          <div className="relative flex-1 flex items-center">
            <div className="relative w-full h-full">
              {/* Main Image - Full Width and Height */}
              <div className="relative w-full h-full overflow-hidden">
                <img 
                  src="/finalhero.png" 
                  alt="Wedding planning dashboard" 
                  className="w-full h-full object-cover"
                />
                
                {/* Animated Demo Cards - Top Left */}
                <div className="absolute left-1/2 transform -translate-x-1/2 top-1/2 lg:left-4 lg:top-8 lg:transform-none">
                  <div className="bg-white rounded-xl p-4 shadow-lg w-80">
                    <div className="text-sm font-semibold text-[#5A4A42] mb-2">Budget</div>
                    <div className="h-16 flex items-center">
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
                            <div className="h-3 w-3/4 rounded bg-[#A85C36]/20 animate-pulse"></div>
                            <div className="h-3 w-1/2 rounded bg-[#A85C36]/15 animate-pulse"></div>
                            <div className="h-3 w-5/6 rounded bg-[#A85C36]/25 animate-pulse"></div>
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
                </div>

                {/* Animated Demo Cards - Right Side */}
                <div className="absolute right-16 top-16 hidden lg:block">
                  <div className="bg-white rounded-xl p-4 shadow-lg w-80">
                    <div className="text-sm font-semibold text-[#5A4A42] mb-2">Vendor Email</div>
                    <div className="h-16 flex items-center">
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
                            <div className="h-3 w-4/5 rounded bg-gray-200 animate-pulse"></div>
                            <div className="h-3 w-2/3 rounded bg-gray-100 animate-pulse"></div>
                            <div className="h-3 w-3/5 rounded bg-gray-100 animate-pulse"></div>
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
                </div>

                {/* Animated Demo Cards - Under Vendor Email */}
                <div className="absolute right-2 top-64 hidden lg:block">
                  <div className="bg-white rounded-xl p-4 shadow-lg w-80">
                    <div className="text-sm font-semibold text-[#5A4A42] mb-2">To‑Dos</div>
                    <div className="h-16 flex items-center">
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
                            <div className="h-3 w-2/3 rounded bg-[#A85C36]/25 animate-pulse"></div>
                            <div className="h-3 w-4/5 rounded bg-[#A85C36]/15 animate-pulse"></div>
                            <div className="h-3 w-1/2 rounded bg-[#A85C36]/20 animate-pulse"></div>
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
          </div>
        </div>
      </section>

      {/* PROBLEM → PROMISE */}
      <section className="bg-white">
        <div className="px-4 lg:px-8 mx-auto py-12 lg:py-16 max-w-7xl">
          <div className="grid gap-6 rounded-2xl border-[0.5px] border-[rgb(236,233,231)] bg-[rgb(247,246,245)] p-6 lg:grid-cols-2 lg:gap-10 lg:p-10">
            <div>
              <h2 className="h6 font-semibold">Feeling overwhelmed?</h2>
              <p className="mt-2 text-[#5A4A42] font-work">Not sure what to do next, how much to budget, or what to send vendors?</p>
            </div>
            <div>
              <h3 className="h6 font-semibold text-[#8B4A2A]">Paige keeps you on track.</h3>
              <p className="mt-2 text-[#5A4A42] font-work">Clear next steps, smart budgets, and AI‑drafted emails all organized in one place.</p>
            </div>
          </div>
        </div>
      </section>

      {/* TAKE CONTROL OF YOUR TO-DOS */}
      <section className="bg-white">
        <div className="px-4 lg:px-8 mx-auto py-16 max-w-7xl">
          <div className="grid gap-8 lg:grid-cols-2 lg:gap-20 items-center">
            {/* Left side - Visual with scrolling to-dos */}
            <div className="flex justify-start lg:justify-start">
              <ScrollingTodoList />
            </div>
            
            {/* Right side - Text content */}
            <div className="text-center lg:text-left">
              <h2 className="h5 font-semibold mb-4">
                Take control of your To-dos
              </h2>
              <p className="mt-2 text-[#5A4A42] font-work">
                Paige instantly creates and tracks your to-dos. We're built to bring calm, not chaos, to your wedding planning.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* TAKE CONTROL OF YOUR TO-DOS - REVERSED */}
      <section className="bg-white">
        <div className="px-4 lg:px-8 mx-auto py-16 max-w-7xl">
          <div className="grid gap-8 lg:grid-cols-2 lg:gap-20 items-center">
            {/* Left side - Text content */}
            <div className="text-center lg:text-left">
              <h2 className="h5 font-semibold mb-4">
                Personalized AI-Powered Messaging
              </h2>
              <p className="mt-2 text-[#5A4A42] font-work">
                Draft friendly, on-brand vendor emails in seconds.
              </p>
            </div>
            
            {/* Right side - Visual with scrolling to-dos */}
            <div className="flex justify-end lg:justify-end">
              <ScrollingTodoListReversed />
            </div>
          </div>
        </div>
      </section>

      {/* CORE OUTCOMES / FEATURES - CAROUSEL */}
      <section id="features" className="bg-white">
        <div className="px-4 lg:px-8 mx-auto py-16 max-w-7xl">
          <div className="mx-auto max-w-2xl text-center mb-12">
            <h2 className="h5 font-semibold">Everything You Need, All in One Place</h2>
            <p className="mt-2 text-[#5A4A42] font-work">Powerful AI + intuitive design to make planning effortless.</p>
          </div>
          <FeaturesGrid />
        </div>
      </section>

      {/* PAIGE SNEAK PEEK */}
      <section className="bg-[rgb(31,28,26)]">
        <div className="px-4 lg:px-8 mx-auto py-16 max-w-7xl">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="font-playfair text-3xl text-white font-semibold">A Paige Sneak Peek</h2>
            <p className="mt-2 text-gray-200 font-work">See how Paige transforms wedding planning from chaos to calm</p>
          </div>
          <div className="mt-10 grid gap-8 md:grid-cols-3 lg:grid-cols-3">
            <div className="text-center">
              <div className="rounded-2xl border-[0.5px] border-[rgb(236,233,231)] bg-white p-2 shadow-lg shadow-black/10">
                <div className="aspect-video">
                  <img 
                    src="/messages.png" 
                    alt="Paige Messages" 
                    className="w-full h-full object-cover rounded-lg"
                  />
                </div>
              </div>
              <h3 className="mt-4 text-lg font-semibold text-white font-work">AI-Powered Messages</h3>
              <p className="mt-1 text-gray-300 font-work">Draft personalized vendor outreach with AI</p>
            </div>
            <div className="text-center">
              <div className="rounded-2xl border-[0.5px] border-[rgb(236,233,231)] bg-white p-2 shadow-lg shadow-black/10">
                <div className="aspect-video">
                  <img 
                    src="/TodoSC.png" 
                    alt="Paige To-Dos" 
                    className="w-full h-full object-cover rounded-lg"
                  />
                </div>
              </div>
              <h3 className="mt-4 text-lg font-semibold text-white font-work">Smart To-do Management</h3>
              <p className="mt-1 text-gray-300 font-work">AI-powered task management that keeps you organized</p>
            </div>
            <div className="text-center">
              <div className="rounded-2xl border-[0.5px] border-[rgb(236,233,231)] bg-white p-2 shadow-lg shadow-black/10">
                <div className="aspect-video">
                  <img 
                    src="/BudgetTooling.png" 
                    alt="Paige Budget" 
                    className="w-full h-full object-cover rounded-lg"
                  />
                </div>
              </div>
              <h3 className="mt-4 text-lg font-semibold text-white font-work">Budgeting that Works</h3>
              <p className="mt-1 text-gray-300 font-work">Smart budget planning tailored to your wedding</p>
            </div>
            
            {/* Second Row */}
            <div className="text-center">
              <div className="rounded-2xl border-[0.5px] border-[rgb(236,233,231)] bg-white p-2 shadow-lg shadow-black/10">
                <div className="aspect-video">
                  <img 
                    src="/Moods.png" 
                    alt="Paige Mood Boards" 
                    className="w-full h-full object-cover rounded-lg"
                  />
                </div>
              </div>
              <h3 className="mt-4 text-lg font-semibold text-white font-work">Mood Board Generation</h3>
              <p className="mt-1 text-gray-300 font-work">AI extracts moods from your inspiration images</p>
            </div>
            
            <div className="text-center">
              <div className="rounded-2xl border-[0.5px] border-[rgb(236,233,231)] bg-white p-2 shadow-lg shadow-black/10">
                <div className="aspect-video">
                  <img 
                    src="/Seats.png" 
                    alt="Paige Seating Charts" 
                    className="w-full h-full object-cover rounded-lg"
                  />
                </div>
              </div>
              <h3 className="mt-4 text-lg font-semibold text-white font-work">Seating Chart Creator</h3>
              <p className="mt-1 text-gray-300 font-work">Drag-and-drop seating with guest management</p>
            </div>
            
            <div className="text-center">
              <div className="rounded-2xl border-[0.5px] border-[rgb(236,233,231)] bg-white p-2 shadow-lg shadow-black/10">
                <div className="aspect-video">
                  <img 
                    src="/FileManager.png" 
                    alt="Paige File Management" 
                    className="w-full h-full object-cover rounded-lg"
                  />
                </div>
              </div>
              <h3 className="mt-4 text-lg font-semibold text-white font-work">File Management & Insights</h3>
              <p className="mt-1 text-gray-300 font-work">AI extracts key insights from your documents</p>
            </div>
          </div>
        </div>
      </section>

      {/* COLLABORATION SECTION */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Column - Text */}
            <div>
              <h2 className="h5 font-semibold mb-4">
                Plan together without stepping on toes
              </h2>
              <p className="text-[#5A4A42] font-work mb-8">
                Invite your partner, family, or planner. Assign tasks, leave notes, and keep everyone in sync.
              </p>
              
              {/* Collaboration Icons */}
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full border-2 border-dashed border-gray-300 bg-white flex items-center justify-center">
                  <User className="w-4 h-4 text-blue-600" />
                </div>
                <div className="w-10 h-10 rounded-full border-2 border-dashed border-gray-300 bg-white flex items-center justify-center">
                  <Heart className="w-4 h-4 text-pink-600" />
                </div>
                <div className="w-10 h-10 rounded-full border-2 border-dashed border-gray-300 bg-white flex items-center justify-center">
                  <Calendar className="w-4 h-4 text-green-600" />
                </div>
                <div className="w-10 h-10 rounded-full border-2 border-dashed border-gray-300 bg-white flex items-center justify-center">
                  <Users className="w-4 h-4 text-purple-600" />
                </div>
              </div>
            </div>

            {/* Right Column - Collaboration Image */}
            <div className="flex justify-center lg:justify-end">
              <div className="w-full max-w-lg h-80 rounded-2xl border-[0.5px] border-[rgb(236,233,231)] bg-white shadow-lg shadow-black/5 overflow-hidden">
                <img 
                  src="/plannerfin.png" 
                  alt="Paige Collaboration Features" 
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="bg-[rgb(247,246,245)]">
        <div className="px-4 lg:px-8 mx-auto py-16 max-w-7xl">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="h5 font-semibold">How Paige Works</h2>
            <p className="mt-2 text-[#5A4A42] font-work">Get started in minutes and watch the chaos turn into calm.</p>
          </div>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            <div className="rounded-2xl border-[0.5px] border-[rgb(236,233,231)] bg-white p-6 text-center shadow-lg shadow-black/5">
              <div className="mx-auto mb-3 flex h-8 w-8 items-center justify-center rounded-full bg-[#A85C36] text-white text-sm font-semibold font-work">1</div>
              <h3 className="text-sm font-semibold font-work">Tell Paige about your day</h3>
              <p className="mt-1 text-[#5A4A42] font-work">Venue, date, style, and what matters most.</p>
            </div>
            <div className="rounded-2xl border-[0.5px] border-[rgb(236,233,231)] bg-white p-6 text-center shadow-lg shadow-black/5">
              <div className="mx-auto mb-3 flex h-8 w-8 items-center justify-center rounded-full bg-[#A85C36] text-white text-sm font-semibold font-work">2</div>
              <h3 className="text-sm font-semibold font-work">Let Paige handle the details</h3>
              <p className="mt-1 text-[#5A4A42] font-work">Budgets, timelines, vendor emails, and reminders—auto‑organized.</p>
            </div>
            <div className="rounded-2xl border-[0.5px] border-[rgb(236,233,231)] bg-white p-6 text-center shadow-lg shadow-black/5">
              <div className="mx-auto mb-3 flex h-8 w-8 items-center justify-center rounded-full bg-[#A85C36] text-white text-sm font-semibold font-work">3</div>
              <h3 className="text-sm font-semibold font-work">Focus on what matters</h3>
              <p className="mt-1 text-[#5A4A42] font-work">Enjoy planning (and each other) while Paige manages the complexity.</p>
            </div>
          </div>
        </div>
      </section>

      {/* DEEPER CALLOUTS */}
      <section className="bg-white">
        <div className="px-4 lg:px-8 mx-auto py-16 max-w-7xl">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border-[0.5px] border-[rgb(236,233,231)] bg-[rgb(247,246,245)] p-8 shadow-lg shadow-black/5">
              <div className="flex items-center gap-3">
                <MessageSquare className="w-6 h-6 text-[#A85C36]" />
                <h3 className="text-lg font-semibold">Vendor Outreach</h3>
              </div>
              <p className="mt-2 text-[#5A4A42] font-work">One click to draft intros, requests, and follow‑ups. Keep all replies tied to your plan.</p>
            </div>
            <div className="rounded-2xl border-[0.5px] border-[rgb(236,233,231)] bg-[rgb(247,246,245)] p-8 shadow-lg shadow-black/5">
              <div className="flex items-center gap-3">
                <ClipboardList className="w-6 h-6 text-[#A85C36]" />
                <h3 className="text-lg font-semibold">Smart to-do management</h3>
              </div>
              <p className="mt-2 text-[#5A4A42] font-work">Paige reads context from threads (securely) to keep your to‑dos current without extra typing.</p>
            </div>
            <div className="rounded-2xl border-[0.5px] border-[rgb(236,233,231)] bg-[rgb(247,246,245)] p-8 shadow-lg shadow-black/5">
              <div className="flex items-center gap-3">
                <Armchair className="w-6 h-6 text-[#A85C36]" />
                <h3 className="text-lg font-semibold">Seating Chart</h3>
              </div>
              <p className="mt-2 text-[#5A4A42] font-work">Start simple and refine as RSVPs roll in. Drag‑and‑drop your way to a perfect layout.</p>
            </div>
            <div className="rounded-2xl border-[0.5px] border-[rgb(236,233,231)] bg-[rgb(247,246,245)] p-8 shadow-lg shadow-black/5">
              <div className="flex items-center gap-3">
                <Heart className="w-6 h-6 text-[#A85C36]" />
                <h3 className="text-lg font-semibold">Mood & Vision</h3>
              </div>
              <p className="mt-2 text-[#5A4A42] font-work">Pin ideas, notes, and inspiration right next to tasks and budget lines.</p>
            </div>
          </div>
        </div>
      </section>

      {/* FOUNDER NOTE / TRUST */}
      <section className="bg-[rgb(31,28,26)]">
        <div className="px-4 lg:px-8 mx-auto py-16 text-white max-w-7xl">
          <div className="mx-auto max-w-3xl">
            <h2 className="font-playfair text-3xl text-white font-semibold">Made by two people who planned a wedding and said, "There has to be a better way."</h2>
            <p className="mt-4 text-gray-200 font-work">We built Paige after juggling spreadsheets, inboxes, and scattered checklists. If you're feeling the same, Paige is for you. Private by design. Your data stays yours - always.</p>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="bg-white">
        <div className="px-4 lg:px-8 mx-auto py-16 max-w-7xl">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="h5 font-semibold">Simple, fair pricing</h2>
            <p className="mt-2 text-[#5A4A42] font-work">Start free. Upgrade when you're ready for more.</p>
          </div>
          <div className="mt-10 grid items-stretch gap-6 md:grid-cols-2">
            <div className="rounded-2xl border-[0.5px] border-[rgb(236,233,231)] bg-white p-6 shadow-lg shadow-black/5 flex flex-col">
              <h3 className="text-sm font-semibold font-work">Free</h3>
              <p className="mt-1 text-[#5A4A42] font-work">Perfect to get started</p>
              <ul className="mt-4 space-y-2 text-[#5A4A42] font-work flex-grow">
                <li>• Budgets, To‑Dos, Vendor email drafts</li>
                <li>• 1 project (your big day)</li>
                <li>• Export anytime</li>
              </ul>
              <Link href="/signup" className="btn-primaryinverse mt-6 inline-block no-underline">
                Start for Free
              </Link>
            </div>
            <div className="rounded-2xl border-[0.5px] border-[rgb(236,233,231)] bg-white p-6 shadow-lg shadow-black/5 flex flex-col relative">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold font-work">Paige Plus</h3>
                <div className="rounded-full bg-[#A85C36] px-3 py-1 text-xs font-semibold text-white">Most popular</div>
              </div>
              <p className="text-[#5A4A42] font-work">For full‑power planning</p>
              <ul className="mt-4 space-y-2 text-[#5A4A42] font-work flex-grow">
                <li>• Everything in Free</li>
                <li>• Gmail automation & advanced messaging</li>
                <li>• Seating chart & mood board tools</li>
                <li>• Invite your partner or planner</li>
              </ul>
              <Link href="/signup" className="btn-primary mt-6 inline-block no-underline">
                Start Free Trial
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="bg-gray-50">
        <div className="px-4 lg:px-8 mx-auto py-16 max-w-7xl">
          <div className="mx-auto max-w-3xl">
            <h2 className="h5 font-semibold text-center">FAQ</h2>
            <div className="mt-8 divide-y divide-[rgb(236,233,231)] divide-[0.25px] rounded-2xl border-[0.5px] border-[rgb(236,233,231)] bg-white">
              {[
                { question: "Is Paige free to try?", answer: "Yes, start free and explore before upgrading." },
                { question: "Do I have to use Gmail?", answer: "No, but connecting Gmail unlocks automatic to-do updates from vendor emails." },
                { question: "Can Paige write emails in my voice?", answer: "Yes. Share a few notes about your tone and Paige adapts." },
                { question: "Can my partner or planner join?", answer: "Absolutely. Invite collaborators so everyone stays aligned." },
                { question: "Can I export budgets and tasks?", answer: "Yes, export to CSV or PDF anytime." },
                { question: "What makes Paige different from big directories?", answer: "Paige is a pure planning partner built to reduce stress, not distract you." }
              ].map((item, index) => (
                <div key={index} className="p-6">
                  <button
                    onClick={() => toggleAccordion(index)}
                    className="flex w-full cursor-pointer items-center justify-between font-semibold font-work text-left"
                  >
                    <span>{item.question}</span>
                    <svg 
                      className={`h-5 w-5 transition-transform duration-300 ${openAccordion === index ? 'rotate-180' : ''}`} 
                      fill="none" 
                      viewBox="0 0 24 24" 
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7"/>
                    </svg>
                  </button>
                  <AnimatePresence>
                    {openAccordion === index && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                        className="overflow-hidden"
                      >
                        <p className="mt-2 text-[#5A4A42] font-work">{item.answer}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="bg-[rgb(31,28,26)]">
        <div className="px-4 lg:px-8 mx-auto py-16 max-w-7xl">
          <div className="mx-auto max-w-3xl text-center text-white">
            <h2 className="font-playfair text-3xl text-white font-semibold">Ready to plan with less stress?</h2>
            <p className="mt-2 text-gray-200 font-work">Join couples using Paige to turn wedding chaos into calm.</p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Link href="/signup" className="btn-white-outline no-underline px-6">
                Start Free Trial
              </Link>
            </div>
            <p className="mt-3 text-xs text-gray-300">Small team, fast updates, human support.</p>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t-[0.5px] border-[rgb(236,233,231)] bg-white">
        <div className="px-4 lg:px-8 mx-auto py-6 max-w-7xl">
          <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[#A85C36] text-white font-semibold">P</span>
              <span className="font-playfair text-xl text-[#332B42]">Paige</span>
            </div>
            <nav className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
              <a href="#features" className="text-[#332B42] hover:text-[#332B42] no-underline">Features</a>
              <a href="#how" className="text-[#332B42] hover:text-[#332B42] no-underline">How It Works</a>
              <a href="#faq" className="text-[#332B42] hover:text-[#332B42] no-underline">FAQ</a>
              <a href="#pricing" className="text-[#332B42] hover:text-[#332B42] no-underline">Pricing</a>
              <a href="mailto:hello@weddingpage.com" className="text-[#332B42] hover:text-[#332B42] no-underline">Contact</a>
              <a href="/privacy" className="text-[#332B42] hover:text-[#332B42] no-underline">Privacy</a>
              <a href="/terms" className="text-[#332B42] hover:text-[#332B42] no-underline">Terms</a>
            </nav>
            <p className="text-sm text-[#5A4A42]">© {new Date().getFullYear()} Paige. All rights reserved.</p>
          </div>
        </div>
      </footer>

    </div>
  );
}