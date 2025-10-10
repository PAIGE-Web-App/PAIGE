import React from 'react';
import Link from 'next/link';

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="text-center mb-8">
            <Link href="/" className="text-2xl font-bold text-[#805d93] hover:text-[#6b4c7f] transition-colors">
              Paige
            </Link>
            <h1 className="text-3xl font-bold text-gray-900 mt-4">Terms of Service</h1>
            <p className="text-gray-600 mt-2">Last updated: {new Date().toLocaleDateString()}</p>
          </div>

          <div className="prose prose-lg max-w-none">
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Acceptance of Terms</h2>
              <p className="text-gray-700 leading-relaxed">
                Welcome to Paige, a wedding planning application and service ("Service") provided by [Your Company Name] ("Company," "we," "our," or "us"). These Terms of Service ("Terms") govern your use of our Service. By accessing or using our Service, you agree to be bound by these Terms. If you do not agree to these Terms, please do not use our Service.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Description of Service</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                Paige is a comprehensive wedding planning platform that provides:
              </p>
              <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2">
                <li>Personalized wedding planning tools and recommendations</li>
                <li>Vendor discovery and communication features</li>
                <li>Budget planning and tracking capabilities</li>
                <li>Task and timeline management</li>
                <li>Integration with third-party services (Google Calendar, Gmail, etc.)</li>
                <li>AI-powered assistance for wedding planning decisions</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. User Accounts</h2>
              
              <h3 className="text-xl font-medium text-gray-900 mb-3">3.1 Account Creation</h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                To use certain features of our Service, you must create an account. You agree to provide accurate, current, and complete information during registration and to update such information to keep it accurate, current, and complete.
              </p>

              <h3 className="text-xl font-medium text-gray-900 mb-3">3.2 Account Security</h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You agree to notify us immediately of any unauthorized use of your account.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Acceptable Use</h2>
              
              <h3 className="text-xl font-medium text-gray-900 mb-3">4.1 Permitted Use</h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                You may use our Service only for lawful purposes and in accordance with these Terms. You agree to use the Service in a manner that does not violate any applicable laws or regulations.
              </p>

              <h3 className="text-xl font-medium text-gray-900 mb-3">4.2 Prohibited Activities</h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                You agree not to:
              </p>
              <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2">
                <li>Use the Service for any unlawful purpose or to solicit others to perform unlawful acts</li>
                <li>Violate any international, federal, provincial, or state regulations, rules, laws, or local ordinances</li>
                <li>Infringe upon or violate our intellectual property rights or the intellectual property rights of others</li>
                <li>Harass, abuse, insult, harm, defame, slander, disparage, intimidate, or discriminate</li>
                <li>Submit false or misleading information</li>
                <li>Upload or transmit viruses or any other type of malicious code</li>
                <li>Attempt to gain unauthorized access to our Service or related systems</li>
                <li>Interfere with or disrupt the Service or servers connected to the Service</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. User Content</h2>
              
              <h3 className="text-xl font-medium text-gray-900 mb-3">5.1 Content Ownership</h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                You retain ownership of any content you submit, post, or display on or through the Service ("User Content"). By submitting User Content, you grant us a non-exclusive, royalty-free, worldwide license to use, modify, and display such content in connection with providing the Service.
              </p>

              <h3 className="text-xl font-medium text-gray-900 mb-3">5.2 Content Responsibility</h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                You are solely responsible for your User Content and the consequences of posting it. You represent and warrant that you have all necessary rights to your User Content and that it does not violate any third-party rights or applicable laws.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Payment and Billing</h2>
              
              <h3 className="text-xl font-medium text-gray-900 mb-3">6.1 Subscription Services</h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                Some features of our Service may require payment. If you purchase a subscription, you agree to pay all applicable fees and taxes. Subscription fees are billed in advance and are non-refundable except as required by law.
              </p>

              <h3 className="text-xl font-medium text-gray-900 mb-3">6.2 Payment Processing</h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                We use third-party payment processors to handle payment transactions. You agree to comply with the terms and conditions of such payment processors.
              </p>

              <h3 className="text-xl font-medium text-gray-900 mb-3">6.3 Refunds</h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                Refunds are handled on a case-by-case basis and are subject to our refund policy. Contact our support team for refund requests.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Intellectual Property Rights</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                The Service and its original content, features, and functionality are and will remain the exclusive property of [Your Company Name] and its licensors. The Service is protected by copyright, trademark, and other laws. Our trademarks and trade dress may not be used in connection with any product or service without our prior written consent.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Privacy Policy</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                Your privacy is important to us. Please review our Privacy Policy, which also governs your use of the Service, to understand our practices. You can find our Privacy Policy at <Link href="/privacy" className="text-[#805d93] hover:underline">weddingpaige.com/privacy</Link>.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. Third-Party Services</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                Our Service may integrate with third-party services (such as Google Calendar, Gmail, Stripe, etc.). Your use of such third-party services is subject to their respective terms of service and privacy policies. We are not responsible for the content, privacy policies, or practices of any third-party services.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. Disclaimers and Limitation of Liability</h2>
              
              <h3 className="text-xl font-medium text-gray-900 mb-3">10.1 Service Availability</h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                We strive to provide a reliable Service, but we cannot guarantee that the Service will be available at all times. The Service is provided "as is" and "as available" without warranties of any kind.
              </p>

              <h3 className="text-xl font-medium text-gray-900 mb-3">10.2 Limitation of Liability</h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                To the fullest extent permitted by law, [Your Company Name] shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from your use of the Service.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">11. Indemnification</h2>
              <p className="text-gray-700 leading-relaxed">
                You agree to defend, indemnify, and hold harmless [Your Company Name] and its officers, directors, employees, and agents from and against any claims, liabilities, damages, judgments, awards, losses, costs, expenses, or fees arising out of or relating to your violation of these Terms or your use of the Service.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">12. Termination</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                We may terminate or suspend your account and bar access to the Service immediately, without prior notice or liability, under our sole discretion, for any reason whatsoever, including without limitation if you breach the Terms.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">13. Governing Law</h2>
              <p className="text-gray-700 leading-relaxed">
                These Terms shall be interpreted and governed by the laws of [Your Jurisdiction], without regard to its conflict of law provisions. Any disputes arising from these Terms or your use of the Service shall be subject to the exclusive jurisdiction of the courts in [Your Jurisdiction].
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">14. Changes to Terms</h2>
              <p className="text-gray-700 leading-relaxed">
                We reserve the right, at our sole discretion, to modify or replace these Terms at any time. If a revision is material, we will provide at least 30 days notice prior to any new terms taking effect. Your continued use of the Service after any such changes constitutes your acceptance of the new Terms.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">15. Contact Information</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                If you have any questions about these Terms of Service, please contact us at:
              </p>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-gray-700">
                  <strong>Email:</strong> legal@weddingpaige.com<br />
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
