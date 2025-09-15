import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { useCustomToast } from '@/hooks/useCustomToast';

// Function to get vendor category from types
const getVendorCategory = (vendor: any): string => {
  if (vendor.types && Array.isArray(vendor.types)) {
    const typeToCategory: Record<string, string> = {
      'florist': 'Florist',
      'jewelry_store': 'Jewelry',
      'bakery': 'Bakery',
      'restaurant': 'Reception Venue',
      'hair_care': 'Hair & Beauty',
      'photographer': 'Photographer',
      'videographer': 'Videographer',
      'clothing_store': 'Bridal Salon',
      'car_rental': 'Car Rental',
      'travel_agency': 'Travel Agency',
      // ...add more as needed
    };
    
    // Find the first type that has a mapping
    const mainType = vendor.types.find((type: string) => typeToCategory[type]);
    return mainType ? typeToCategory[mainType] : 'Vendor';
  }
  return 'Vendor';
};
import { Mail, Star, User, CheckCircle, Phone, Settings, X, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import type { VendorEmail } from '@/types/contact';
import VendorEmailManagementModal from './VendorEmailManagementModal';
import LoadingSpinner from '@/components/LoadingSpinner';

interface VendorContactModalProps {
  vendor: any;
  isOpen: boolean;
  onClose: () => void;
}

export default function VendorContactModal({ vendor, isOpen, onClose }: VendorContactModalProps) {
  const [vendorDetails, setVendorDetails] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [emailMessage, setEmailMessage] = useState('');
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [verifiedEmails, setVerifiedEmails] = useState<VendorEmail[]>([]);
  const [linkedContactEmails, setLinkedContactEmails] = useState<any[]>([]);
  const [loadingEmails, setLoadingEmails] = useState(false);
  const [showEmailManagement, setShowEmailManagement] = useState(false);
  const [isWarningExpanded, setIsWarningExpanded] = useState(false);
  const [toEmail, setToEmail] = useState('');
  const [showEmailDropdown, setShowEmailDropdown] = useState(false);
  const [showAddEmailInput, setShowAddEmailInput] = useState(false);
  const { user } = useAuth();
  const { showSuccessToast, showErrorToast } = useCustomToast();

  useEffect(() => {
    if (isOpen && vendor?.id) {
      setToEmail('');
      setShowEmailDropdown(false);
      fetchVendorDetails();
      generateEmailTemplate();
    }
  }, [isOpen, vendor?.id]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showEmailDropdown) {
        const target = event.target as Element;
        if (!target.closest('.email-dropdown-container')) {
          setShowEmailDropdown(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showEmailDropdown]);

  // Set default "To:" email when emails are loaded
  useEffect(() => {
    if (verifiedEmails && verifiedEmails.length > 0) {
      setToEmail(verifiedEmails[0].email);
    } else if (linkedContactEmails && linkedContactEmails.length > 0) {
      setToEmail(linkedContactEmails[0].email);
    } else {
      // Don't set a fallback email - let user choose to add one
      setToEmail('');
    }
  }, [verifiedEmails, linkedContactEmails]);

  const fetchVerifiedEmails = async () => {
    if (!vendor?.id) return;
    
    setLoadingEmails(true);
    try {
      
      // Use the vendor email queue to prevent rate limiting
      const VendorEmailQueue = (await import('@/utils/vendorEmailQueue')).default;
      const queue = VendorEmailQueue.getInstance();
      const data = await queue.queueRequest(vendor.place_id || vendor.id);
      
      
      if (data.emails) {
        // Filter out any emails with empty email addresses
        const validEmails = data.emails.filter(email => email && email.email && email.email.trim() !== '');
        setVerifiedEmails(validEmails);
      } else {
        setVerifiedEmails([]);
      }

      // Fetch linked contact emails
      if (user?.uid) {
        const contactsResponse = await fetch(`/api/contacts?userId=${user.uid}&placeId=${vendor.place_id || vendor.id}`);
        const contactsData = await contactsResponse.json();
        
        if (contactsData.contacts) {
          const linkedContacts = contactsData.contacts.filter((contact: any) => {
            const isValid = contact && 
              contact.placeId === (vendor.place_id || vendor.id) && 
              (contact.email || contact.phone) &&
              (contact.id || contact.name); // Ensure we have a valid identifier
            
            if (!isValid) {
            }
            return isValid;
          });
          setLinkedContactEmails(linkedContacts);
        }
      }
    } catch (error) {
      console.error('Error fetching verified emails:', error);
    } finally {
      setLoadingEmails(false);
    }
  };

  const fetchVendorDetails = async () => {
    setLoading(true);
    try {
      // First fetch vendor details
      const response = await fetch(`/api/google-place-details?placeId=${vendor.id}`);
      const data = await response.json();
      if (data.status === 'OK') {
        setVendorDetails(data.result);
      }
      
      // Then fetch verified emails - this is the final step
      await fetchVerifiedEmails();
      
      // Only set loading to false after everything is complete
      setLoading(false);
    } catch (error) {
      console.error('Error fetching vendor details:', error);
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

    // Allow sending without toEmail - system will try common emails

    setLoading(true);
    // Set the appropriate loading message based on whether we have a specific email
    if (!toEmail) {
      console.log('Setting loading message: Trying common email addresses...');
      setLoadingMessage('Trying common email addresses (info@, hello@, contact@, etc.)...');
    } else {
      console.log('Setting loading message: Sending email...');
      setLoadingMessage('Sending email...');
    }
    
    // Force a small delay to ensure state updates are visible
    await new Promise(resolve => setTimeout(resolve, 100));
    
    try {
      
      const response = await fetch('/api/vendor-contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendorDetails: [vendorDetails],
          message: emailMessage,
          userId: user.uid,
          toEmail: toEmail || undefined // Only send toEmail if it exists
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        const result = data.results[0];
        
        // Only create contact if email was successfully sent
        if (result.method === 'email' && result.vendorEmail) {
          // Find the verified email data for the selected email to get the original metadata
          const selectedEmailData = verifiedEmails?.find(email => email.email === toEmail);
          
          // Create contact with the email that actually worked
          const contactData = {
            name: selectedEmailData?.contactName || vendorDetails?.name || vendor.name,
            email: result.vendorEmail, // Use the email that actually worked
            phone: vendorDetails?.formatted_phone_number || '',
            website: vendorDetails?.website || '',
            category: selectedEmailData?.role || getVendorCategory(vendorDetails || vendor),
            address: vendorDetails?.formatted_address || vendor.address || '',
            placeId: vendor.place_id || vendor.id,
            userId: user.uid,
            avatarColor: '#364257',
            orderIndex: -new Date().getTime(),
            isVendorContact: true,
            createdAt: new Date().toISOString()
          };

          // Create contact
          const contactResponse = await fetch('/api/contacts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(contactData),
          });

          const contactResult = await contactResponse.json();
          
          if (contactResponse.ok && contactResult.success) {
            const emailSource = result.emailSource === 'crowdsourced' ? ' (Community verified)' : ' (SMTP verified)';
            showSuccessToast(`✅ Email sent successfully to ${result.vendorEmail}!${emailSource} and added to your contacts!`);
          } else {
            const emailSource = result.emailSource === 'crowdsourced' ? ' (Community verified)' : ' (SMTP verified)';
            showSuccessToast(`✅ Email sent successfully to ${result.vendorEmail}!${emailSource}`);
          }
        } else if (result.method === 'website') {
          showSuccessToast(`🌐 No verified email found - opening website for manual contact`);
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
      setLoadingMessage('');
    }
  };



  const handleAddVerifiedDetails = async () => {
    if (!vendor?.id || !user?.uid) {
      showErrorToast('Unable to add verified details. Please try again.');
      return;
    }

    try {
      // Open the vendor email association modal
      setShowEmailManagement(true);
    } catch (error) {
      console.error('Error opening email management modal:', error);
      showErrorToast('Failed to open email management. Please try again.');
    }
  };

  // Helper function to generate unique keys
  const generateUniqueKey = (prefix: string, item: any, index: number) => {
    const identifier = item?.email || item?.id || item?.name || `item-${index}`;
    return `${prefix}-${identifier}-${index}`;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="vendor-contact-modal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center p-4 z-50"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -50, opacity: 0 }}
            className="bg-white rounded-[5px] shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col relative"
            onClick={(e) => e.stopPropagation()}
          >
                    {/* Fixed Header */}
                    <div className="py-3 px-3 border-b border-gray-200 flex-shrink-0">
                      <div className="flex items-center justify-between mb-4">
                        <h5 className="h5 text-left whitespace-nowrap">Contact Vendor</h5>
                        <button
                          onClick={onClose}
                          className="text-[#7A7A7A] hover:text-[#332B42] p-1 rounded-full"
                          title="Close"
                        >
                          <X size={20} />
                        </button>
                      </div>
                      
                      {/* Vendor Contact Details Header */}
                      <div className="bg-[#F3F2F0] w-full p-3 border border-[#AB9C95] rounded-lg">
                        {/* Top row: Vendor name and category */}
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-2">
                              <span className="text-[12px] text-[#364257] truncate max-w-[150px] lg:max-w-[250px] leading-none">
                                {vendor?.name}
                              </span>
                              {vendorDetails?.name && vendorDetails.name !== vendor?.name && (
                                <>
                                  <span className="text-[#AB9C95] text-[12px] flex-shrink-0">•</span>
                                  <span className="text-[12px] text-[#364257] truncate max-w-[150px] lg:max-w-[250px] leading-none">
                                    {vendorDetails.name}
                                  </span>
                                </>
                              )}
                            </div>
                            {/* Category pill */}
                            <div className="hidden lg:block">
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-[#A85C36] text-white">
                                {vendor?.category || 'Vendor'}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        {/* Bottom row: Contact metadata */}
                        <div className="flex items-center gap-2 flex-wrap">
                          {/* Desktop: Show full text with icons */}
                          <div className="hidden lg:flex items-center gap-2 flex-wrap">
                            {/* Email metadata */}
                            <div className="flex items-center gap-1 flex-shrink-0">
                              {verifiedEmails && verifiedEmails.length > 0 ? (
                                <div className="flex items-center gap-1">
                                  <Mail className="w-3 h-3 text-green-600" />
                                  <span className="text-[11px] font-normal text-green-600">
                                    Verified Email Address +{verifiedEmails.length}
                                  </span>
                                </div>
                              ) : linkedContactEmails && linkedContactEmails.length > 0 ? (
                                <div className="flex items-center gap-1">
                                  <Mail className="w-3 h-3 text-[#364257]" />
                                  <span className="text-[11px] font-normal text-blue-600 truncate max-w-[150px]">
                                    {linkedContactEmails[0].email}
                                  </span>
                                  <span className="text-[11px] font-normal text-blue-600">
                                    (verified)
                                  </span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1">
                                  <Mail className="w-3 h-3 text-[#364257]" />
                                  <span className="text-[11px] font-normal text-[#364257] truncate max-w-[150px]">
                                    info@{vendorDetails?.name?.toLowerCase().replace(/\s+/g, '')}.com
                                  </span>
                                  <AlertTriangle className="w-3 h-3 text-yellow-500 flex-shrink-0" />
                                </div>
                              )}
                            </div>
                            {vendorDetails?.formatted_phone_number && (
                              <button
                                type="button"
                                onClick={handlePhoneClick}
                                className="text-[11px] font-normal text-[#364257] hover:text-[#A85C36] flex items-center gap-1 focus:outline-none flex-shrink-0"
                                style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                              >
                                <Phone className="w-3 h-3 flex-shrink-0" />
                                <span className="truncate max-w-[100px] md:max-w-[120px]">
                                  {vendorDetails.formatted_phone_number}
                                </span>
                              </button>
                            )}
                            {vendorDetails?.website && !vendorDetails.website.includes('maps.google.com') && (
                              <a
                                href={vendorDetails.website}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[11px] font-normal text-[#364257] hover:text-[#A85C36] flex items-center gap-1 flex-shrink-0 no-underline"
                              >
                                <span>🌐</span>
                                <span className="truncate max-w-[200px] md:max-w-[300px]">
                                  {vendorDetails.website}
                                </span>
                              </a>
                            )}
                          </div>
                          
                          {/* Mobile: Show condensed version */}
                          <div className="lg:hidden flex items-center gap-2 flex-wrap">
                            {/* Email metadata */}
                            <div className="flex items-center gap-1 flex-shrink-0">
                              {verifiedEmails && verifiedEmails.length > 0 ? (
                                <div className="flex items-center gap-1">
                                  <Mail className="w-3 h-3 text-green-600" />
                                  <span className="text-[11px] font-normal text-green-600">
                                    Verified Email Address +{verifiedEmails.length}
                                  </span>
                                </div>
                              ) : linkedContactEmails && linkedContactEmails.length > 0 ? (
                                <div className="flex items-center gap-1">
                                  <Mail className="w-3 h-3 text-[#364257]" />
                                  <span className="text-[11px] font-normal text-blue-600 truncate max-w-[80px]">
                                    {linkedContactEmails[0].email}
                                  </span>
                                  <span className="text-[11px] font-normal text-blue-600">
                                    (verified)
                                  </span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1">
                                  <Mail className="w-3 h-3 text-[#364257]" />
                                  <span className="text-[11px] font-normal text-[#364257] truncate max-w-[80px]">
                                    info@{vendorDetails?.name?.toLowerCase().replace(/\s+/g, '')}.com
                                  </span>
                                  <AlertTriangle className="w-3 h-3 text-yellow-500 flex-shrink-0" />
                                </div>
                              )}
                            </div>
                            {vendorDetails?.formatted_phone_number && (
                              <button
                                type="button"
                                onClick={handlePhoneClick}
                                className="text-[11px] font-normal text-[#364257] hover:text-[#A85C36] flex items-center gap-1 focus:outline-none flex-shrink-0"
                                style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                              >
                                <Phone className="w-3 h-3 flex-shrink-0" />
                                <span className="truncate max-w-[80px]">
                                  {vendorDetails.formatted_phone_number}
                                </span>
                              </button>
                            )}
                            {vendorDetails?.website && !vendorDetails.website.includes('maps.google.com') && (
                              <a
                                href={vendorDetails.website}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[11px] font-normal text-[#364257] hover:text-[#A85C36] flex items-center gap-1 flex-shrink-0 no-underline"
                              >
                                <span>🌐</span>
                                <span className="truncate max-w-[120px]">
                                  Website
                                </span>
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto bg-white">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <LoadingSpinner size="md" />
                </div>
              ) : (
                <div className="bg-white border-t border-[#AB9C95]" style={{ borderTopWidth: "0.5px" }}>
                  <div className="px-3 pt-3">
                    <div className="space-y-6">

                  {/* Info banner for linked contacts - Accordion */}
                  {(!verifiedEmails || verifiedEmails.length === 0) && linkedContactEmails && linkedContactEmails.length > 0 && (
                    <div className="bg-blue-100 border-l-4 border-blue-500 rounded-lg overflow-hidden">
                      <button
                        onClick={() => setIsWarningExpanded(!isWarningExpanded)}
                        className="w-full flex items-center justify-between p-3 text-left hover:bg-blue-200 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-blue-600 flex-shrink-0" />
                          <span className="text-sm font-medium text-blue-800">Verified Email(s) Found!</span>
                        </div>
                        {isWarningExpanded ? (
                          <ChevronUp className="w-4 h-4 text-blue-600" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-blue-600" />
                        )}
                      </button>
                      <AnimatePresence>
                        {isWarningExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="px-3 pb-3">
                              <p className="text-xs text-blue-800">
                                Our community has added real contact information to this vendor and made Paige even better. 
                                You can use the verified email below to reach out directly.
                              </p>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}

                  {/* Warning banner for unverified emails - Accordion */}
                  {(!verifiedEmails || verifiedEmails.length === 0) && (!linkedContactEmails || linkedContactEmails.length === 0) && (
                    <div className="bg-yellow-100 border-l-4 border-yellow-500 rounded-lg overflow-hidden">
                      <button
                        onClick={() => setIsWarningExpanded(!isWarningExpanded)}
                        className="w-full flex items-center justify-between p-3 text-left hover:bg-yellow-200 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-yellow-600 flex-shrink-0" />
                          <span className="text-sm font-medium text-yellow-800">No verified emails found</span>
                        </div>
                        {isWarningExpanded ? (
                          <ChevronUp className="w-4 h-4 text-yellow-600" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-yellow-600" />
                        )}
                      </button>
                      <AnimatePresence>
                        {isWarningExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="px-3 pb-3">
                              <p className="text-xs text-yellow-800">
                                Paige will try to reach out to this vendor using common emails like info@, support@, contact@, etc. 
                                If this doesn't work, we'll direct you to the vendor's contact form or website.
                              </p>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}

                  {/* To: Field */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-[#332B42]">To:</label>
                      {(!verifiedEmails || verifiedEmails.length === 0) && !showAddEmailInput && (
                        <button
                          type="button"
                          onClick={() => setShowAddEmailInput(true)}
                          className="text-blue-600 hover:text-blue-800 underline text-sm font-medium"
                        >
                          + Add Email
                        </button>
                      )}
                    </div>
                    
                    {/* Show verified emails dropdown if available */}
                    {verifiedEmails && verifiedEmails.length > 0 ? (
                      <div className="relative email-dropdown-container">
                        <button
                          type="button"
                          onClick={() => setShowEmailDropdown(!showEmailDropdown)}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-left focus:outline-none focus:ring-2 focus:ring-[#805d93] focus:border-transparent flex items-center justify-between"
                        >
                          <span className="truncate">{toEmail}</span>
                          <svg className={`w-4 h-4 text-gray-400 transition-transform ${showEmailDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                        
                        {showEmailDropdown && (
                          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                            {verifiedEmails.map((email, index) => (
                              <button
                                key={index}
                                type="button"
                                onClick={() => {
                                  setToEmail(email.email);
                                  setShowEmailDropdown(false);
                                }}
                                className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center justify-between ${
                                  toEmail === email.email ? 'bg-[#805d93] text-white' : 'text-gray-900'
                                }`}
                              >
                                <div className="flex flex-col">
                                  <span className="font-medium">{email.email}</span>
                                  {email.contactName && (
                                    <span className="text-xs opacity-75">{email.contactName}</span>
                                  )}
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      /* No verified emails - show system message or input */
                      <div className="space-y-2">
                        {!showAddEmailInput ? (
                          <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">
                            <p className="text-sm text-gray-600">
                              If you know a verified contact email for this vendor, click "Add Email" above. Otherwise, we'll try common emails (info@, hello@, etc.).
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <input
                              type="email"
                              value={toEmail}
                              onChange={(e) => setToEmail(e.target.value)}
                              placeholder="Enter email address to verify"
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#805d93] focus:border-transparent"
                            />
                            <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded border border-amber-200">
                              ⚠️ This email will be verified before sending. If valid, it will be added to verified emails.
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Email Template Section */}
                  <div className="border border-gray-200 rounded-lg mb-6">
                    {loading && loadingMessage ? (
                      <div className="flex flex-col items-center justify-center p-8 text-center">
                        <LoadingSpinner size="lg" />
                        <p className="mt-4 text-sm text-gray-600">{loadingMessage}</p>
                      </div>
                    ) : (
                      <textarea
                        value={emailMessage}
                        onChange={(e) => setEmailMessage(e.target.value)}
                        placeholder="Your email message..."
                        className="w-full text-sm resize-none text-[#332B42] bg-transparent border-none focus:outline-none font-work p-4"
                        rows={16}
                        style={{ minHeight: "16rem", maxHeight: "500px", overflowY: "auto", paddingTop: "16px", paddingBottom: "24px" }}
                      />
                    )}
                  </div>


                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Fixed Footer - Action Buttons */}
            <div className="flex items-center justify-end py-3 px-3 border-t border-[#AB9C95] w-full flex-shrink-0" style={{ borderTopWidth: "0.5px" }}>
              <div className="flex items-center gap-3">
                <button
                  onClick={onClose}
                  className="btn-primaryinverse px-4 py-2 text-sm"
                >
                  Close
                </button>
                <button
                  onClick={handleEmailClick}
                  disabled={loading || !emailMessage.trim()}
                  className="btn-primary flex items-center gap-1 px-4 py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Send Email"
                >
                  {loading ? (
                    'Sending...'
                  ) : (
                    <>
                      Send <Mail className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Email Management Modal */}
      <VendorEmailManagementModal
        key="email-management-modal"
        isOpen={showEmailManagement}
        onClose={() => setShowEmailManagement(false)}
        vendor={vendor}
        onEmailsUpdated={fetchVerifiedEmails}
      />
    </AnimatePresence>
  );
} 