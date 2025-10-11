'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import HomepageNavbar from '@/components/navigation/HomepageNavbar';
import HomepageFooter from '@/components/navigation/HomepageFooter';

export default function PrivacyPolicy() {
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
      {/* NAVBAR */}
      <HomepageNavbar isLoggedIn={isLoggedIn} />

      {/* HERO SECTION */}
      <section 
        className="bg-linen py-12 bg-cover bg-center bg-no-repeat relative"
        style={{ backgroundImage: 'url(/termsandprivacy.png)' }}
      >
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <h1 className="font-playfair text-2xl font-medium text-[#332B42] mb-4">
            Privacy Policy
          </h1>
          <p className="text-[#5A4A42] font-work text-base max-w-3xl mx-auto">
            We built Paige to help you plan your wedding, not to complicate your life. Here's how we protect your privacy.
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
              <h2 className="text-base font-semibold text-[#332B42] mb-6 font-playfair">How We Handle Your Information</h2>
              <p className="text-[#5A4A42] leading-relaxed font-work">
                We built Paige to help you plan your wedding, not to complicate your life. This policy explains what information we collect and how we keep it safe.
              </p>
            </section>

            <section className="mb-12">
              <h2 className="text-base font-semibold text-[#332B42] mb-6 font-playfair">What We Collect</h2>
              
              <div className="bg-[rgb(247,246,245)] rounded-2xl border-[0.5px] border-[rgb(236,233,231)] p-6 mb-6">
                <h3 className="text-base font-medium text-[#332B42] mb-4 font-playfair">Wedding Planning Information</h3>
                <ul className="text-[#5A4A42] space-y-2 font-work">
                  <li>• Your wedding details (date, location, budget, guest count)</li>
                  <li>• Partner and family information you choose to share</li>
                  <li>• Vendor preferences and selections</li>
                  <li>• Photos and documents you upload</li>
                  <li>• Messages between you and vendors</li>
                </ul>
              </div>

              <div className="bg-[rgb(247,246,245)] rounded-2xl border-[0.5px] border-[rgb(236,233,231)] p-6">
                <h3 className="text-base font-medium text-[#332B42] mb-4 font-playfair">Technical Information</h3>
                <ul className="text-[#5A4A42] space-y-2 font-work">
                  <li>• Basic device info to make Paige work smoothly</li>
                  <li>• How you use Paige (to improve your experience)</li>
                  <li>• Gmail integration data (only if you connect it)</li>
                </ul>
              </div>
            </section>

            <section className="mb-12">
              <h2 className="text-base font-semibold text-[#332B42] mb-6 font-playfair">How We Use Your Information</h2>
              <p className="text-[#5A4A42] leading-relaxed font-work mb-6">
                We use your information to make Paige work better for you:
              </p>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="bg-white rounded-2xl border-[0.5px] border-[rgb(236,233,231)] p-4">
                  <h3 className="text-base font-medium text-[#332B42] mb-3 font-playfair">AI-Powered Features</h3>
                  <ul className="text-[#5A4A42] text-sm space-y-1 font-work">
                    <li>• Generate personalized budgets</li>
                    <li>• Draft vendor emails</li>
                    <li>• Create custom to-do lists</li>
                    <li>• Analyze your wedding documents</li>
                  </ul>
                </div>
                <div className="bg-white rounded-2xl border-[0.5px] border-[rgb(236,233,231)] p-4">
                  <h3 className="text-base font-medium text-[#332B42] mb-3 font-playfair">Service Features</h3>
                  <ul className="text-[#5A4A42] text-sm space-y-1 font-work">
                    <li>• Sync with Gmail (if connected)</li>
                    <li>• Manage your vendor communications</li>
                    <li>• Process payments securely</li>
                    <li>• Send important updates</li>
                  </ul>
                </div>
              </div>
            </section>

            <section className="mb-12">
              <h2 className="text-base font-semibold text-[#332B42] mb-6 font-playfair">We Don't Sell Your Data</h2>
              <div className="bg-[rgb(247,246,245)] rounded-2xl border-[0.5px] border-[rgb(236,233,231)] p-6">
                <p className="text-[#5A4A42] leading-relaxed font-work mb-4">
                  We never sell your personal information. We only share data when:
                </p>
                <ul className="text-[#5A4A42] space-y-2 font-work">
                  <li>• You give us permission</li>
                  <li>• We need to work with trusted partners (like payment processors)</li>
                  <li>• Required by law</li>
                </ul>
              </div>
            </section>

            <section className="mb-12">
              <h2 className="text-base font-semibold text-[#332B42] mb-6 font-playfair">Keeping Your Data Safe</h2>
              <p className="text-[#5A4A42] leading-relaxed font-work">
                We use industry-standard security measures to protect your information. While no system is 100% secure, we work hard to keep your wedding planning data safe and private.
              </p>
            </section>

            <section className="mb-12">
              <h2 className="text-base font-semibold text-[#332B42] mb-6 font-playfair">Third-Party Integrations</h2>
              <p className="text-[#5A4A42] leading-relaxed font-work">
                Paige integrates with Google Calendar, Gmail, and Stripe to make your planning easier. These services have their own privacy policies that you should review when you connect them.
              </p>
            </section>

            <section className="mb-12">
              <h2 className="text-base font-semibold text-[#332B42] mb-6 font-playfair">Your Rights</h2>
              <div className="bg-[rgb(247,246,245)] rounded-2xl border-[0.5px] border-[rgb(236,233,231)] p-6">
                <p className="text-[#5A4A42] leading-relaxed font-work mb-4">
                  You control your data. You can:
                </p>
                <ul className="text-[#5A4A42] space-y-2 font-work">
                  <li>• Access, update, or delete your information anytime</li>
                  <li>• Download your wedding planning data</li>
                  <li>• Unsubscribe from our emails</li>
                  <li>• Disconnect third-party integrations</li>
                </ul>
              </div>
            </section>

            <section className="mb-12">
              <h2 className="text-base font-semibold text-[#332B42] mb-6 font-playfair">Questions?</h2>
              <div className="bg-white rounded-2xl border-[0.5px] border-[rgb(236,233,231)] p-6">
                <p className="text-[#5A4A42] leading-relaxed font-work mb-4">
                  Have questions about your privacy? We're here to help.
                </p>
                <p className="text-[#5A4A42] font-work">
                  <strong>Email:</strong> <a href="mailto:dave@weddingpaige.com" className="text-[#A85C36] hover:underline">dave@weddingpaige.com</a>
                </p>
              </div>
            </section>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <HomepageFooter isLoggedIn={isLoggedIn} />
    </div>
  );
}
