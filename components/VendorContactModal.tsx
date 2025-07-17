import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { useCustomToast } from '@/hooks/useCustomToast';

interface VendorContactModalProps {
  vendor: any;
  isOpen: boolean;
  onClose: () => void;
}

export default function VendorContactModal({ vendor, isOpen, onClose }: VendorContactModalProps) {
  const [vendorDetails, setVendorDetails] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [emailMessage, setEmailMessage] = useState('');
  const [showEmailForm, setShowEmailForm] = useState(false);
  const { user } = useAuth();
  const { showSuccessToast, showErrorToast } = useCustomToast();

  useEffect(() => {
    if (isOpen && vendor?.id) {
      fetchVendorDetails();
      generateEmailTemplate();
    }
  }, [isOpen, vendor?.id]);

  const fetchVendorDetails = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/google-place-details?placeId=${vendor.id}`);
      const data = await response.json();
      if (data.status === 'OK') {
        setVendorDetails(data.result);
      }
    } catch (error) {
      console.error('Error fetching vendor details:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateEmailTemplate = () => {
    const template = `Hello,

I'm planning my wedding and would love to learn more about your services at ${vendor?.name}.

Could you please provide information about:
- Available dates for [your wedding date]
- Pricing and packages
- Services you offer
- Any special wedding packages or deals

I'm particularly interested in [brief description of what you're looking for].

Thank you for your time!

Best regards,
[Your name]
[Your phone number]`;
    
    setEmailMessage(template);
  };

  const handleWebsiteClick = () => {
    if (vendorDetails?.website) {
      window.open(vendorDetails.website, '_blank');
    }
  };

  const handlePhoneClick = () => {
    if (vendorDetails?.formatted_phone_number) {
      window.open(`tel:${vendorDetails.formatted_phone_number}`, '_self');
    }
  };

  const handleEmailClick = async () => {
    if (!user?.uid) {
      showErrorToast('Please log in to send emails');
      return;
    }

    if (!emailMessage.trim()) {
      showErrorToast('Please enter a message');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/vendor-contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendorDetails: [vendorDetails],
          message: emailMessage,
          userId: user.uid
        }),
      });

      const data = await response.json();
      
              if (data.success) {
          const result = data.results[0];
          if (result.method === 'email') {
            const contactMessage = result.contactSaved ? ' and added to your contacts!' : '';
            const emailSource = result.emailSource === 'crowdsourced' ? ' (Community verified)' : ' (SMTP verified)';
            showSuccessToast(`✅ Email sent successfully to ${vendor.name}!${emailSource}${contactMessage}`);
          } else if (result.method === 'website') {
            const contactMessage = result.contactSaved ? ' and added to your contacts!' : '';
            showSuccessToast(`🌐 No verified email found - opening website for manual contact${contactMessage}`);
            if (vendorDetails?.website) {
              window.open(vendorDetails.website, '_blank');
            }
          }
          onClose();
        } else {
          showErrorToast(data.error || 'Failed to send email');
        }
    } catch (error) {
      console.error('Error sending email:', error);
      showErrorToast('Failed to send email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleWebsiteContactForm = () => {
    if (vendorDetails?.website) {
      // Try to find contact page on website
      const contactUrls = [
        `${vendorDetails.website}/contact`,
        `${vendorDetails.website}/contact-us`,
        `${vendorDetails.website}/get-in-touch`,
        `${vendorDetails.website}/inquiry`,
        `${vendorDetails.website}/request-quote`
      ];
      
      // Open the main website first, user can navigate to contact form
      window.open(vendorDetails.website, '_blank');
      
      // Also try to open common contact page URLs
      setTimeout(() => {
        contactUrls.forEach(url => {
          window.open(url, '_blank');
        });
      }, 1000);
    }
  };

  const handleGoogleMapsClick = () => {
    if (vendorDetails?.place_id) {
      window.open(`https://www.google.com/maps/place/?q=place_id:${vendorDetails.place_id}`, '_blank');
    }
  };

  const copyEmailTemplate = () => {
    navigator.clipboard.writeText(emailMessage);
    // You could add a toast notification here
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-playfair font-medium text-[#332B42]">
                  Contact {vendor?.name}
                </h3>
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-600 text-2xl font-light"
                >
                  ×
                </button>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#A85C36]"></div>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Email Section - Primary Focus */}
                  <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-4 rounded-lg border border-purple-200">
                    <h4 className="text-lg font-medium text-[#332B42] mb-3 flex items-center gap-2">
                      <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      Email Contact (Recommended)
                    </h4>
                    
                    <div className="space-y-3">
                      <textarea
                        value={emailMessage}
                        onChange={(e) => setEmailMessage(e.target.value)}
                        placeholder="Your email message..."
                        className="w-full h-32 p-3 border border-[#AB9C95] rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-[#A85C36] text-sm"
                      />
                      
                      <div className="flex gap-2">
                        <button
                          onClick={handleEmailClick}
                          disabled={loading}
                          className="flex-1 bg-[#A85C36] text-white px-4 py-2 rounded-lg hover:bg-[#784528] transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {loading ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                              Sending...
                            </>
                          ) : (
                            <>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                              </svg>
                              Send Email
                            </>
                          )}
                        </button>
                        <button
                          onClick={copyEmailTemplate}
                          className="px-4 py-2 border border-[#AB9C95] rounded-lg hover:bg-[#F3F2F0] transition-colors"
                        >
                          Copy
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Website Contact Form */}
                  {vendorDetails?.website && (
                    <div className="space-y-3">
                      <h4 className="text-sm font-medium text-[#332B42] flex items-center gap-2">
                        <svg className="w-4 h-4 text-[#A85C36]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9" />
                        </svg>
                        Website Contact Form
                      </h4>
                      <button
                        onClick={handleWebsiteContactForm}
                        className="w-full flex items-center gap-3 p-3 border border-[#AB9C95] rounded-lg hover:bg-[#F3F2F0] transition-colors"
                      >
                        <div className="w-10 h-10 bg-[#A85C36] rounded-full flex items-center justify-center">
                          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9" />
                          </svg>
                        </div>
                        <div className="text-left">
                          <div className="font-medium text-[#332B42]">Use Website Contact Form</div>
                          <div className="text-xs text-[#AB9C95]">Opens website and common contact pages</div>
                        </div>
                      </button>
                    </div>
                  )}

                  {/* Other Contact Methods */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-[#332B42]">Other Contact Methods</h4>
                    
                    {vendorDetails?.formatted_phone_number && (
                      <button
                        onClick={handlePhoneClick}
                        className="w-full flex items-center gap-3 p-3 border border-[#AB9C95] rounded-lg hover:bg-[#F3F2F0] transition-colors"
                      >
                        <div className="w-10 h-10 bg-[#A85C36] rounded-full flex items-center justify-center">
                          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                        </div>
                        <div className="text-left">
                          <div className="text-sm text-[#AB9C95]">Phone</div>
                          <div className="font-medium text-[#332B42]">{vendorDetails.formatted_phone_number}</div>
                        </div>
                      </button>
                    )}

                    <button
                      onClick={handleGoogleMapsClick}
                      className="w-full flex items-center gap-3 p-3 border border-[#AB9C95] rounded-lg hover:bg-[#F3F2F0] transition-colors"
                    >
                      <div className="w-10 h-10 bg-[#A85C36] rounded-full flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </div>
                      <div className="text-left">
                        <div className="text-sm text-[#AB9C95]">Location</div>
                        <div className="font-medium text-[#332B42]">View on Google Maps</div>
                      </div>
                    </button>
                  </div>

                  {/* Note about contact information */}
                  <div className="bg-[#F3F2F0] rounded-lg p-3">
                    <p className="text-xs text-[#AB9C95]">
                      <strong>Note:</strong> Since Google Places doesn't provide email addresses, we recommend using the email template above or visiting the vendor's website contact form for the most direct communication.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
} 