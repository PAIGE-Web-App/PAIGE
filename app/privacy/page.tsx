import React from 'react';
import Link from 'next/link';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="text-center mb-8">
            <Link href="/" className="text-2xl font-bold text-[#805d93] hover:text-[#6b4c7f] transition-colors">
              Paige
            </Link>
            <h1 className="text-3xl font-bold text-gray-900 mt-4">Privacy Policy</h1>
            <p className="text-gray-600 mt-2">Last updated: {new Date().toLocaleDateString()}</p>
          </div>

          <div className="prose prose-lg max-w-none">
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Introduction</h2>
              <p className="text-gray-700 leading-relaxed">
                Welcome to Paige ("we," "our," or "us"). This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our wedding planning application and services (the "Service"). Please read this Privacy Policy carefully. If you do not agree with the terms of this Privacy Policy, please do not access the Service.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Information We Collect</h2>
              
              <h3 className="text-xl font-medium text-gray-900 mb-3">2.1 Personal Information</h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                We may collect personal information that you voluntarily provide to us when you register for an account, use our Service, or communicate with us, including:
              </p>
              <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2">
                <li>Name and contact information (email address, phone number)</li>
                <li>Wedding planning details (wedding date, location, budget, guest count)</li>
                <li>Partner and family member information</li>
                <li>Vendor preferences and selections</li>
                <li>Photos and documents uploaded to the Service</li>
                <li>Messages and communications with vendors</li>
                <li>Payment information (processed securely through third-party providers)</li>
              </ul>

              <h3 className="text-xl font-medium text-gray-900 mb-3">2.2 Automatically Collected Information</h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                We may automatically collect certain information when you use our Service, including:
              </p>
              <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2">
                <li>Device information (IP address, browser type, operating system)</li>
                <li>Usage data (pages visited, features used, time spent on Service)</li>
                <li>Cookies and similar tracking technologies</li>
                <li>Location data (if you grant permission)</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. How We Use Your Information</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                We use the information we collect to:
              </p>
              <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2">
                <li>Provide, maintain, and improve our wedding planning services</li>
                <li>Generate personalized recommendations for vendors, budgets, and tasks</li>
                <li>Facilitate communication between you and wedding vendors</li>
                <li>Process payments and manage subscriptions</li>
                <li>Send you important updates about your account and the Service</li>
                <li>Provide customer support and respond to your inquiries</li>
                <li>Analyze usage patterns to improve our Service</li>
                <li>Comply with legal obligations and enforce our Terms of Service</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Information Sharing and Disclosure</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                We do not sell, trade, or otherwise transfer your personal information to third parties, except in the following circumstances:
              </p>
              <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2">
                <li><strong>With Your Consent:</strong> We may share information when you explicitly consent to such sharing</li>
                <li><strong>Service Providers:</strong> We may share information with trusted third-party service providers who assist us in operating our Service (e.g., payment processors, email services, cloud storage)</li>
                <li><strong>Legal Requirements:</strong> We may disclose information when required by law or to protect our rights, property, or safety</li>
                <li><strong>Business Transfers:</strong> In the event of a merger, acquisition, or sale of assets, user information may be transferred as part of the transaction</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Data Security</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                We implement appropriate technical and organizational security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. However, no method of transmission over the internet or electronic storage is 100% secure, and we cannot guarantee absolute security.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Third-Party Services</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                Our Service may integrate with third-party services (such as Google Calendar, Gmail, Stripe, etc.). These services have their own privacy policies, and we encourage you to review them. We are not responsible for the privacy practices of these third-party services.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Your Rights and Choices</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                You have certain rights regarding your personal information:
              </p>
              <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2">
                <li><strong>Access:</strong> You can request access to the personal information we hold about you</li>
                <li><strong>Correction:</strong> You can request correction of inaccurate or incomplete information</li>
                <li><strong>Deletion:</strong> You can request deletion of your personal information</li>
                <li><strong>Portability:</strong> You can request a copy of your data in a structured format</li>
                <li><strong>Opt-out:</strong> You can opt-out of certain communications from us</li>
              </ul>
              <p className="text-gray-700 leading-relaxed">
                To exercise these rights, please contact us at the information provided below.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Data Retention</h2>
              <p className="text-gray-700 leading-relaxed">
                We retain your personal information for as long as necessary to provide our Service and fulfill the purposes outlined in this Privacy Policy, unless a longer retention period is required or permitted by law.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. Children's Privacy</h2>
              <p className="text-gray-700 leading-relaxed">
                Our Service is not intended for children under 13 years of age. We do not knowingly collect personal information from children under 13. If we learn that we have collected personal information from a child under 13, we will take steps to delete such information.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. Changes to This Privacy Policy</h2>
              <p className="text-gray-700 leading-relaxed">
                We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date. You are advised to review this Privacy Policy periodically for any changes.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">11. Contact Us</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                If you have any questions about this Privacy Policy or our privacy practices, please contact us at:
              </p>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-gray-700">
                  <strong>Email:</strong> privacy@weddingpaige.com<br />
                  <strong>Website:</strong> <Link href="/" className="text-[#805d93] hover:underline">weddingpaige.com</Link><br />
                  <strong>Address:</strong> [Your Business Address]
                </p>
              </div>
            </section>
          </div>

          <div className="text-center mt-8 pt-8 border-t border-gray-200">
            <Link 
              href="/" 
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-[#805d93] hover:bg-[#6b4c7f] transition-colors"
            >
              Return to Paige
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
