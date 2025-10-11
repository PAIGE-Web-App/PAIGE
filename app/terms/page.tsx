'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';

export default function TermsOfService() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsLoggedIn(!!user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return null; // or a loading spinner
  }

  return (
    <div className="bg-linen text-[#332B42] antialiased min-h-screen">
      {/* NAVBAR - Only show if not logged in */}
      {!isLoggedIn && (
        <div className="sticky top-0 z-30 pt-4 px-4">
          <header className="mx-auto max-w-7xl rounded-2xl bg-white/80 backdrop-blur border-[0.25px] border-[rgb(236,233,231)] mx-8">
            <div className="px-4 flex h-16 items-center justify-between">
              <Link href="/" className="flex items-center gap-2 no-underline">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[#A85C36] text-white font-semibold">P</span>
                <span className="font-playfair text-xl text-[#332B42]">Paige</span>
              </Link>
                      <nav className="hidden md:flex items-center gap-8 text-sm">
                        <Link href="/#features" className="text-[#332B42] hover:text-[#332B42] no-underline">Features</Link>
                        <Link href="/#how-it-works" className="text-[#332B42] hover:text-[#332B42] no-underline">How It Works</Link>
                        <Link href="/#faq" className="text-[#332B42] hover:text-[#332B42] no-underline">FAQ</Link>
                        <Link href="/#pricing" className="text-[#332B42] hover:text-[#332B42] no-underline">Pricing</Link>
                      </nav>
                      <div className="flex items-center gap-3">
                        <Link href="/login" className="btn-primaryinverse">Login</Link>
                        <Link href="/signup" className="btn-gradient-purple">Start for Free</Link>
                      </div>
            </div>
          </header>
        </div>
      )}

      {/* HERO SECTION */}
      <section 
        className="bg-linen py-12 bg-cover bg-center bg-no-repeat relative"
        style={{ backgroundImage: 'url(/termsandprivacy.png)' }}
      >
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <h1 className="font-playfair text-2xl font-medium text-[#332B42] mb-4">
            Terms of Service
          </h1>
          <p className="text-[#5A4A42] font-work text-base max-w-3xl mx-auto">
            By using Paige, you agree to these simple terms. We built Paige to make wedding planning easier, not more complicated.
          </p>
          <p className="text-[#5A4A42] mt-4 font-work text-sm">
            Last updated: {new Date().toLocaleDateString()}
          </p>
        </div>
      </section>

      {/* CONTENT SECTION */}
      <section className="bg-white py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-12">

            <section className="mb-12">
              <h2 className="text-base font-semibold text-[#332B42] mb-6 font-playfair">Welcome to Paige</h2>
              <p className="text-[#5A4A42] leading-relaxed font-work">
                By using Paige, you agree to these simple terms. We built Paige to make wedding planning easier, not more complicated.
              </p>
            </section>

            <section className="mb-12">
              <h2 className="text-base font-semibold text-[#332B42] mb-6 font-playfair">What Paige Does</h2>
              <div className="bg-[rgb(247,246,245)] rounded-2xl border-[0.5px] border-[rgb(236,233,231)] p-6">
                <p className="text-[#5A4A42] leading-relaxed font-work mb-4">
                  Paige helps you plan your wedding with:
                </p>
                <ul className="text-[#5A4A42] space-y-2 font-work">
                  <li>• AI-powered budget planning and vendor recommendations</li>
                  <li>• Smart to-do lists and timeline management</li>
                  <li>• Automated vendor email drafting</li>
                  <li>• Gmail integration for seamless communication</li>
                  <li>• Mood board generation and seating charts</li>
                  <li>• Document analysis and insights</li>
                </ul>
              </div>
            </section>

            <section className="mb-12">
              <h2 className="text-base font-semibold text-[#332B42] mb-6 font-playfair">Your Account</h2>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="bg-white rounded-2xl border-[0.5px] border-[rgb(236,233,231)] p-4">
                  <h3 className="text-base font-medium text-[#332B42] mb-3 font-playfair">Account Setup</h3>
                  <p className="text-[#5A4A42] text-sm font-work">
                    Create an account with accurate information to get the most out of Paige's personalized features.
                  </p>
                </div>
                <div className="bg-white rounded-2xl border-[0.5px] border-[rgb(236,233,231)] p-4">
                  <h3 className="text-base font-medium text-[#332B42] mb-3 font-playfair">Keep It Secure</h3>
                  <p className="text-[#5A4A42] text-sm font-work">
                    You're responsible for keeping your account safe. Let us know if you notice anything suspicious.
                  </p>
                </div>
              </div>
            </section>

            <section className="mb-12">
              <h2 className="text-base font-semibold text-[#332B42] mb-6 font-playfair">Use Paige Responsibly</h2>
              <div className="bg-[rgb(247,246,245)] rounded-2xl border-[0.5px] border-[rgb(236,233,231)] p-6">
                <p className="text-[#5A4A42] leading-relaxed font-work mb-4">
                  Please don't use Paige to:
                </p>
                <ul className="text-[#5A4A42] space-y-2 font-work">
                  <li>• Break any laws or harass others</li>
                  <li>• Share false information or spam</li>
                  <li>• Try to hack or damage our systems</li>
                  <li>• Violate anyone's intellectual property</li>
                </ul>
              </div>
            </section>

            <section className="mb-12">
              <h2 className="text-base font-semibold text-[#332B42] mb-6 font-playfair">Your Content</h2>
              <p className="text-[#5A4A42] leading-relaxed font-work">
                You own your wedding planning content. We just need permission to use it to make Paige work for you (like generating personalized recommendations).
              </p>
            </section>

            <section className="mb-12">
              <h2 className="text-base font-semibold text-[#332B42] mb-6 font-playfair">Payment & Subscriptions</h2>
              <div className="bg-[rgb(247,246,245)] rounded-2xl border-[0.5px] border-[rgb(236,233,231)] p-6">
                <p className="text-[#5A4A42] leading-relaxed font-work mb-4">
                  Paige Plus subscriptions are billed in advance. We use Stripe for secure payments. Need a refund? Just ask - we'll work with you.
                </p>
              </div>
            </section>

            <section className="mb-12">
              <h2 className="text-base font-semibold text-[#332B42] mb-6 font-playfair">Privacy & Third-Party Services</h2>
              <p className="text-[#5A4A42] leading-relaxed font-work">
                Your privacy matters to us. Check out our <Link href="/privacy" className="text-[#A85C36] hover:underline">Privacy Policy</Link> to see how we protect your data. When you connect Gmail or other services, they have their own terms too.
              </p>
            </section>

            <section className="mb-12">
              <h2 className="text-base font-semibold text-[#332B42] mb-6 font-playfair">Our Commitment to You</h2>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="bg-white rounded-2xl border-[0.5px] border-[rgb(236,233,231)] p-4">
                  <h3 className="text-base font-medium text-[#332B42] mb-3 font-playfair">Service Availability</h3>
                  <p className="text-[#5A4A42] text-sm font-work">
                    We work hard to keep Paige running smoothly, but sometimes things happen. We'll do our best to minimize disruptions.
                  </p>
                </div>
                <div className="bg-white rounded-2xl border-[0.5px] border-[rgb(236,233,231)] p-4">
                  <h3 className="text-base font-medium text-[#332B42] mb-3 font-playfair">Changes to Terms</h3>
                  <p className="text-[#5A4A42] text-sm font-work">
                    If we make important changes, we'll give you 30 days notice. Small updates happen as we improve Paige.
                  </p>
                </div>
              </div>
            </section>

            <section className="mb-12">
              <h2 className="text-base font-semibold text-[#332B42] mb-6 font-playfair">Questions?</h2>
              <div className="bg-white rounded-2xl border-[0.5px] border-[rgb(236,233,231)] p-6">
                <p className="text-[#5A4A42] leading-relaxed font-work mb-4">
                  Need help understanding these terms? We're here to help.
                </p>
                <p className="text-[#5A4A42] font-work">
                  <strong>Email:</strong> <a href="mailto:dave@weddingpaige.com" className="text-[#A85C36] hover:underline">dave@weddingpaige.com</a>
                </p>
              </div>
            </section>
          </div>
        </div>
      </section>

      {/* FOOTER - Only show if not logged in */}
      {!isLoggedIn && (
        <footer className="border-t-[0.5px] border-[rgb(236,233,231)] bg-white">
          <div className="px-4 lg:px-8 mx-auto py-6 max-w-7xl">
            <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[#A85C36] text-white font-semibold">P</span>
                <span className="font-playfair text-xl text-[#332B42]">Paige</span>
              </div>
              <nav className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
                <Link href="/privacy" className="text-[#332B42] hover:text-[#332B42] no-underline">Privacy</Link>
                <Link href="/terms" className="text-[#332B42] hover:text-[#332B42] no-underline">Terms</Link>
                <a href="mailto:dave@weddingpaige.com" className="text-[#332B42] hover:text-[#332B42] no-underline">Contact</a>
              </nav>
              <p className="text-sm text-[#5A4A42]">© {new Date().getFullYear()} Paige. All rights reserved.</p>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}
