import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCustomToast } from '@/hooks/useCustomToast';
import { useAuth } from '@/hooks/useAuth';
import LoadingSpinner from '@/components/LoadingSpinner';
import VendorSavedNotification from './VendorSavedNotification';

interface BulkContactModalProps {
  vendors: any[];
  isOpen: boolean;
  onClose: () => void;
}

export default function BulkContactModal({ vendors, isOpen, onClose }: BulkContactModalProps) {
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedVendors, setSelectedVendors] = useState<any[]>([]);
  const [vendorDetails, setVendorDetails] = useState<any[]>([]);
  const [showNotification, setShowNotification] = useState(false);
  const [savedCount, setSavedCount] = useState(0);
  const { showSuccessToast, showErrorToast } = useCustomToast();
  const { user } = useAuth();

  useEffect(() => {
    if (isOpen && vendors.length > 0) {
      setSelectedVendors(vendors);
      fetchVendorDetails();
    }
  }, [isOpen, vendors]);

  const fetchVendorDetails = async () => {
    setIsLoading(true);
    try {
      const details = await Promise.all(
        vendors.map(async (vendor) => {
          try {
            const response = await fetch(`/api/google-place-details?placeId=${vendor.id}`);
            const data = await response.json();
            return data.status === 'OK' ? data.result : null;
          } catch (error) {
            console.error('Error fetching vendor details:', error);
            return null;
          }
        })
      );
      setVendorDetails(details.filter(detail => detail !== null));
    } catch (error) {
      console.error('Error fetching vendor details:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!message.trim()) {
      showErrorToast('Please enter a message');
      return;
    }

    if (!user?.uid) {
      showErrorToast('Please log in to contact vendors');
      return;
    }

    setIsLoading(true);
    try {
      // Use the new vendor contact API
      const response = await fetch('/api/vendor-contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendorDetails,
          message,
          userId: user.uid
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        const { summary } = data;
        const contactMessage = summary.contactsSaved > 0 ? ` and added ${summary.contactsSaved} to your contacts!` : '';
        showSuccessToast(`✅ Successfully contacted ${summary.successful} out of ${summary.total} vendors! (${summary.emailsSent} emails sent, ${summary.websitesOpened} websites opened)${contactMessage}`);
        
        // Open websites for vendors that couldn't be emailed
        data.results.forEach((result: any) => {
          if (result.method === 'website' && result.website) {
            window.open(result.website, '_blank');
          }
        });
        
        // Show notification if contacts were saved
        if (summary.contactsSaved > 0) {
          setSavedCount(summary.contactsSaved);
          setShowNotification(true);
        }
        
        onClose();
      } else {
        showErrorToast(data.error || 'Failed to contact vendors');
      }
    } catch (error) {
      console.error('Error in bulk contact:', error);
      showErrorToast('Failed to contact vendors. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const generateAIMessage = () => {
    const aiMessage = `Hello,

I'm planning my wedding and would love to learn more about your services. 

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

    setMessage(aiMessage);
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
                  Bulk Contact with AI
                </h3>
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-600 text-2xl font-light"
                >
                  ×
                </button>
              </div>

              {isLoading && vendorDetails.length === 0 ? (
                <div className="flex items-center justify-center py-8">
                  <LoadingSpinner size="md" />
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Selected Vendors */}
                  <div>
                    <h4 className="text-sm font-medium text-[#332B42] mb-3">
                      Contacting {vendorDetails.length} vendors:
                    </h4>
                    <div className="max-h-32 overflow-y-auto space-y-2">
                      {vendorDetails.map((vendor, index) => (
                        <div key={index} className="flex items-center gap-3 p-2 bg-[#F3F2F0] rounded">
                          <div className="w-8 h-8 bg-[#A85C36] rounded-full flex items-center justify-center">
                            <span className="text-white text-sm font-medium">{index + 1}</span>
                          </div>
                          <div className="flex-1">
                            <div className="font-medium text-[#332B42] text-sm">{vendor.name}</div>
                            <div className="text-xs text-[#AB9C95]">
                              {vendor.formatted_phone_number && `📞 ${vendor.formatted_phone_number}`}
                              {vendor.website && ` 🌐 Website available`}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Message */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium text-[#332B42]">
                        Your Message
                      </label>
                      <button
                        onClick={generateAIMessage}
                        className="text-xs text-[#A85C36] hover:text-[#784528] flex items-center gap-1"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .962 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.582a.5.5 0 0 1 0 .962L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.962 0L9.937 15.5Z" />
                        </svg>
                        Generate AI Message
                      </button>
                    </div>
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Enter your message to vendors..."
                      className="w-full h-32 p-3 border border-[#AB9C95] rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-[#A85C36]"
                    />
                  </div>

                  {/* Contact Methods */}
                  <div>
                    <h4 className="text-sm font-medium text-[#332B42] mb-3">
                      Contact Methods
                    </h4>
                    <div className="space-y-2 text-sm text-[#AB9C95]">
                      <div className="flex items-center gap-2">
                        <span>🌐</span>
                        <span>Website contact forms (will open in new tabs)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span>📧</span>
                        <span>Email templates (will open your email client)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span>📞</span>
                        <span>Phone numbers (for manual calling)</span>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={onClose}
                      className="flex-1 btn-primaryinverse"
                      disabled={isLoading}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSubmit}
                      className="flex-1 btn-gradient-purple flex items-center justify-center gap-2"
                      disabled={isLoading || !message.trim()}
                    >
                      {isLoading ? (
                        <>
                          <LoadingSpinner size="sm" />
                          Contacting...
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .962 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.582a.5.5 0 0 1 0 .962L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.962 0L9.937 15.5Z" />
                          </svg>
                          Contact {vendorDetails.length} Vendors
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
      
      {/* Vendor Saved Notification */}
      <VendorSavedNotification
        isVisible={showNotification}
        onClose={() => setShowNotification(false)}
        count={savedCount}
      />
    </AnimatePresence>
  );
} 