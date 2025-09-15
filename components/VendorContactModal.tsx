import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { useCustomToast } from '@/hooks/useCustomToast';
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
  const [emailMessage, setEmailMessage] = useState('');
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [verifiedEmails, setVerifiedEmails] = useState<VendorEmail[]>([]);
  const [linkedContactEmails, setLinkedContactEmails] = useState<any[]>([]);
  const [loadingEmails, setLoadingEmails] = useState(false);
  const [showEmailManagement, setShowEmailManagement] = useState(false);
  const [isWarningExpanded, setIsWarningExpanded] = useState(false);
  const [toEmail, setToEmail] = useState('');
  const [showEmailDropdown, setShowEmailDropdown] = useState(false);
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
    console.log('🔍 Setting To email - verifiedEmails:', verifiedEmails?.length, 'linkedContactEmails:', linkedContactEmails?.length, 'vendorDetails:', vendorDetails?.name);
    console.log('🔍 verifiedEmails array:', verifiedEmails);
    console.log('🔍 linkedContactEmails array:', linkedContactEmails);
    
    if (verifiedEmails && verifiedEmails.length > 0) {
      console.log('✅ Using verified email:', verifiedEmails[0].email);
      setToEmail(verifiedEmails[0].email);
    } else if (linkedContactEmails && linkedContactEmails.length > 0) {
      console.log('✅ Using linked contact email:', linkedContactEmails[0].email);
      setToEmail(linkedContactEmails[0].email);
    } else if (vendorDetails?.name) {
      const fallbackEmail = `info@${vendorDetails.name.toLowerCase().replace(/\s+/g, '')}.com`;
      console.log('✅ Using fallback email:', fallbackEmail);
      setToEmail(fallbackEmail);
    } else {
      console.log('❌ No email source available yet');
    }
  }, [verifiedEmails, linkedContactEmails, vendorDetails?.name]);

  const fetchVerifiedEmails = async () => {
    if (!vendor?.id) return;
    
    setLoadingEmails(true);
    try {
      console.log('Fetching verified emails for vendor:', vendor.place_id || vendor.id);
      
      // Use the vendor email queue to prevent rate limiting
      const VendorEmailQueue = (await import('@/utils/vendorEmailQueue')).default;
      const queue = VendorEmailQueue.getInstance();
      const data = await queue.queueRequest(vendor.place_id || vendor.id);
      
      console.log('Verified emails response:', data);
      
      if (data.emails) {
        console.log('📧 Raw verified emails data:', data.emails);
        // Filter out any emails with empty email addresses
        const validEmails = data.emails.filter(email => email && email.email && email.email.trim() !== '');
        console.log('📧 Filtered verified emails:', validEmails);
        console.log('📧 Setting verifiedEmails state to:', validEmails);
        setVerifiedEmails(validEmails);
        console.log('📧 verifiedEmails state should now be:', validEmails);
      } else {
        console.log('📧 No verified emails found for this vendor');
        setVerifiedEmails([]);
      }

      // Fetch linked contact emails
      if (user?.uid) {
        const contactsResponse = await fetch(`/api/contacts?userId=${user.uid}&placeId=${vendor.place_id || vendor.id}`);
        const contactsData = await contactsResponse.json();
        
        if (contactsData.contacts) {
          console.log('Raw linked contacts data:', contactsData.contacts);
          const linkedContacts = contactsData.contacts.filter((contact: any) => {
            const isValid = contact && 
              contact.placeId === (vendor.place_id || vendor.id) && 
              (contact.email || contact.phone) &&
              (contact.id || contact.name); // Ensure we have a valid identifier
            
            if (!isValid) {
              console.log('Filtered out contact:', contact, 'reason: missing required fields');
            }
            return isValid;
          });
          console.log('🔗 Filtered linked contacts:', linkedContacts);
          console.log('🔗 Setting linkedContactEmails state to:', linkedContacts);
          setLinkedContactEmails(linkedContacts);
          console.log('🔗 linkedContactEmails state should now be:', linkedContacts);
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
      console.log('About to fetch verified emails for vendor:', vendor.place_id || vendor.id);
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

    if (!toEmail.trim()) {
      showErrorToast('Please select an email address');
      return;
    }

    setLoading(true);
    try {
      // First, create a contact in the dashboard
      const contactData = {
        name: vendorDetails?.name || vendor.name,
        email: toEmail,
        phone: vendorDetails?.formatted_phone_number || '',
        website: vendorDetails?.website || '',
        category: vendorDetails?.types?.[0] || 'Vendor',
        address: vendorDetails?.formatted_address || vendor.address || '',
        placeId: vendor.place_id || vendor.id,
        userId: user.uid
      };

      // Create contact
      console.log('💾 Creating contact with data:', contactData);
      const contactResponse = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contactData),
      });

      const contactResult = await contactResponse.json();
      console.log('📞 Contact creation result:', contactResult);
      
      if (!contactResponse.ok) {
        console.error('❌ Contact creation failed:', contactResult);
        showErrorToast(`Failed to create contact: ${contactResult.error || 'Unknown error'}`);
        return;
      }
      
      if (!contactResult.success) {
        console.error('❌ Contact creation returned success: false:', contactResult);
        showErrorToast('Failed to create contact in dashboard');
        return;
      }
      
      console.log('✅ Contact created successfully:', contactResult.contact);

      // Then send the email using the selected email address
      const response = await fetch('/api/vendor-contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendorDetails: [vendorDetails],
          message: emailMessage,
          userId: user.uid,
          toEmail: toEmail // Use the selected email address
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        const result = data.results[0];
        if (result.method === 'email') {
          const contactMessage = contactResult.success ? ' and added to your contacts!' : '';
          const emailSource = result.emailSource === 'crowdsourced' ? ' (Community verified)' : ' (SMTP verified)';
          showSuccessToast(`✅ Email sent successfully to ${toEmail}!${emailSource}${contactMessage}`);
        } else if (result.method === 'website') {
          const contactMessage = contactResult.success ? ' and added to your contacts!' : '';
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
                    <label className="text-sm font-medium text-[#332B42]">To:</label>
                    
                    {/* Show dropdown if there are multiple verified emails */}
                    {verifiedEmails && verifiedEmails.length > 1 ? (
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
                      <input
                        type="email"
                        value={toEmail}
                        onChange={(e) => setToEmail(e.target.value)}
                        placeholder="Enter email address"
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#805d93] focus:border-transparent"
                      />
                    )}
                  </div>

                  {/* Email Template Section */}
                  <div className="border border-gray-200 rounded-lg mb-6">
                    <textarea
                      value={emailMessage}
                      onChange={(e) => setEmailMessage(e.target.value)}
                      placeholder="Your email message..."
                      className="w-full text-sm resize-none text-[#332B42] bg-transparent border-none focus:outline-none font-work p-4"
                      rows={12}
                      style={{ minHeight: "12rem", maxHeight: "500px", overflowY: "auto", paddingTop: "16px", paddingBottom: "24px" }}
                    />
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
                {!loading && (
                  <button
                    onClick={handleEmailClick}
                    disabled={loading || !emailMessage.trim()}
                    className="btn-primary flex items-center gap-1 px-4 py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Send Email"
                  >
                    {loading ? (
                      <>
                        <LoadingSpinner size="sm" />
                        Sending...
                      </>
                    ) : (
                      <>
                        Send <Mail className="w-4 h-4" />
                      </>
                    )}
                  </button>
                )}
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