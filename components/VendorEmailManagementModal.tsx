import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Flag, Edit, Trash2, CheckCircle, AlertTriangle, Mail, User } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useCustomToast } from '@/hooks/useCustomToast';
import LoadingSpinner from '@/components/LoadingSpinner';
import type { VendorEmail, GlobalVendorEmail } from '@/types/contact';

interface VendorEmailManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  vendor: any; // Google Places vendor object
  onEmailsUpdated?: () => void;
}

export default function VendorEmailManagementModal({ 
  isOpen, 
  onClose, 
  vendor, 
  onEmailsUpdated 
}: VendorEmailManagementModalProps) {
  const { user } = useAuth();
  const { showSuccessToast, showErrorToast } = useCustomToast();
  
  const [vendorEmails, setVendorEmails] = useState<VendorEmail[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingEmail, setEditingEmail] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    contactName: '',
    role: '',
    isPrimary: false
  });
  const [showFlagForm, setShowFlagForm] = useState<string | null>(null);
  const [flagReason, setFlagReason] = useState('');

  useEffect(() => {
    if (isOpen && vendor?.place_id) {
      fetchVendorEmails();
    }
  }, [isOpen, vendor?.place_id]);

  const fetchVendorEmails = async () => {
    if (!vendor?.place_id) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/vendor-emails?placeId=${vendor.place_id}`);
      const data = await response.json();
      
      if (data.emails) {
        setVendorEmails(data.emails);
      }
    } catch (error) {
      console.error('Error fetching vendor emails:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditEmail = async (email: string) => {
    if (!user?.uid || !vendor?.place_id) return;

    setLoading(true);
    try {
      const response = await fetch('/api/vendor-emails', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          placeId: vendor.place_id,
          email,
          updates: editForm,
          userId: user.uid
        })
      });

      const data = await response.json();
      
      if (data.success) {
        showSuccessToast('Email updated successfully!');
        setEditingEmail(null);
        setEditForm({ contactName: '', role: '', isPrimary: false });
        await fetchVendorEmails();
        onEmailsUpdated?.();
      } else {
        showErrorToast(data.error || 'Failed to update email');
      }
    } catch (error) {
      console.error('Error updating email:', error);
      showErrorToast('Failed to update email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleFlagEmail = async (email: string) => {
    if (!user?.uid || !vendor?.place_id || !flagReason.trim()) {
      showErrorToast('Please provide a reason for flagging this email');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/vendor-emails/flag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          placeId: vendor.place_id,
          email,
          reason: flagReason.trim(),
          userId: user.uid
        })
      });

      const data = await response.json();
      
      if (data.success) {
        showSuccessToast('Email flagged for review. Thank you for helping maintain data quality!');
        setShowFlagForm(null);
        setFlagReason('');
        await fetchVendorEmails();
      } else {
        showErrorToast(data.error || 'Failed to flag email');
      }
    } catch (error) {
      console.error('Error flagging email:', error);
      showErrorToast('Failed to flag email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveEmail = async (email: string) => {
    if (!user?.uid || !vendor?.place_id) return;

    if (!confirm(`Are you sure you want to remove "${email}"? This action cannot be undone.`)) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/vendor-emails?placeId=${vendor.place_id}&email=${email}&userId=${user.uid}`, {
        method: 'DELETE'
      });

      const data = await response.json();
      
      if (data.success) {
        showSuccessToast('Email removed successfully!');
        await fetchVendorEmails();
        onEmailsUpdated?.();
      } else {
        showErrorToast(data.error || 'Failed to remove email');
      }
    } catch (error) {
      console.error('Error removing email:', error);
      showErrorToast('Failed to remove email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getVerificationMethodIcon = (method: string) => {
    switch (method) {
      case 'smtp': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'manual': return <User className="w-4 h-4 text-blue-500" />;
      case 'crowdsourced': return <Mail className="w-4 h-4 text-purple-500" />;
      default: return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
    }
  };

  const getVerificationMethodLabel = (method: string) => {
    switch (method) {
      case 'smtp': return 'SMTP Verified';
      case 'manual': return 'Manually Added';
      case 'crowdsourced': return 'Community Verified';
      default: return 'Unknown';
    }
  };

  // Helper function to generate unique keys
  const generateUniqueKey = (item: any, index: number) => {
    const identifier = item?.email || `email-${index}`;
    return `${identifier}-${index}`;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
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
            className="bg-white rounded-[10px] shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-[#AB9C95]">
              <div>
                <h3 className="text-lg font-playfair font-semibold text-[#332B42]">
                  Manage Vendor Emails
                </h3>
                <p className="text-sm text-gray-600 mt-1">{vendor?.name}</p>
              </div>
              <button
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700 p-1"
                title="Close"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <LoadingSpinner size="md" text="Loading..." />
                </div>
              ) : vendorEmails.length === 0 ? (
                <div className="text-center py-8">
                  <Mail className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600">No verified emails found for this vendor.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {vendorEmails.map((emailData, index) => (
                    <div key={generateUniqueKey(emailData, index)} className="border border-[#AB9C95] rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-medium text-[#332B42]">{emailData.email}</span>
                            {emailData.isPrimary && (
                              <span className="bg-[#A85C36] text-white text-xs px-2 py-1 rounded">
                                Primary
                              </span>
                            )}
                            {getVerificationMethodIcon(emailData.verificationMethod)}
                            <span className="text-xs text-gray-500">
                              {getVerificationMethodLabel(emailData.verificationMethod)}
                            </span>
                          </div>
                          
                          {emailData.contactName && (
                            <p className="text-sm text-gray-600 mb-1">
                              Contact: {emailData.contactName}
                              {emailData.role && ` (${emailData.role})`}
                            </p>
                          )}
                          
                          <p className="text-xs text-gray-500">
                            Added by {emailData.verifiedBy} on {new Date(emailData.verifiedAt).toLocaleDateString()}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 ml-4">
                          {editingEmail === emailData.email ? (
                            <div className="space-y-2">
                              <input
                                type="text"
                                placeholder="Contact name"
                                value={editForm.contactName}
                                onChange={(e) => setEditForm(prev => ({ ...prev, contactName: e.target.value }))}
                                className="text-sm border border-[#AB9C95] rounded px-2 py-1 w-full"
                              />
                              <input
                                type="text"
                                placeholder="Role"
                                value={editForm.role}
                                onChange={(e) => setEditForm(prev => ({ ...prev, role: e.target.value }))}
                                className="text-sm border border-[#AB9C95] rounded px-2 py-1 w-full"
                              />
                              <label className="flex items-center gap-1 text-xs">
                                <input
                                  type="checkbox"
                                  checked={editForm.isPrimary}
                                  onChange={(e) => setEditForm(prev => ({ ...prev, isPrimary: e.target.checked }))}
                                  className="w-3 h-3"
                                />
                                Primary email
                              </label>
                              <div className="flex gap-1">
                                <button
                                  onClick={() => handleEditEmail(emailData.email)}
                                  className="text-xs bg-[#A85C36] text-white px-2 py-1 rounded hover:bg-[#8B4A2A]"
                                >
                                  Save
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingEmail(null);
                                    setEditForm({ contactName: '', role: '', isPrimary: false });
                                  }}
                                  className="text-xs bg-gray-300 text-gray-700 px-2 py-1 rounded hover:bg-gray-400"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : showFlagForm === emailData.email ? (
                            <div className="space-y-2">
                              <textarea
                                placeholder="Reason for flagging..."
                                value={flagReason}
                                onChange={(e) => setFlagReason(e.target.value)}
                                className="text-sm border border-[#AB9C95] rounded px-2 py-1 w-full h-16 resize-none"
                              />
                              <div className="flex gap-1">
                                <button
                                  onClick={() => handleFlagEmail(emailData.email)}
                                  className="text-xs bg-yellow-500 text-white px-2 py-1 rounded hover:bg-yellow-600"
                                >
                                  Flag
                                </button>
                                <button
                                  onClick={() => {
                                    setShowFlagForm(null);
                                    setFlagReason('');
                                  }}
                                  className="text-xs bg-gray-300 text-gray-700 px-2 py-1 rounded hover:bg-gray-400"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex gap-1">
                              <button
                                onClick={() => {
                                  setEditingEmail(emailData.email);
                                  setEditForm({
                                    contactName: emailData.contactName || '',
                                    role: emailData.role || '',
                                    isPrimary: emailData.isPrimary
                                  });
                                }}
                                className="text-gray-500 hover:text-blue-600 p-1"
                                title="Edit"
                              >
                                <Edit size={16} />
                              </button>
                              <button
                                onClick={() => setShowFlagForm(emailData.email)}
                                className="text-gray-500 hover:text-yellow-600 p-1"
                                title="Flag for review"
                              >
                                <Flag size={16} />
                              </button>
                              <button
                                onClick={() => handleRemoveEmail(emailData.email)}
                                className="text-gray-500 hover:text-red-600 p-1"
                                title="Remove"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-[#AB9C95] bg-gray-50">
              <div className="text-sm text-gray-600">
                <p className="mb-2"><strong>How to maintain data quality:</strong></p>
                <ul className="space-y-1 text-xs">
                  <li>• <strong>Edit:</strong> Update contact names, roles, or mark as primary</li>
                  <li>• <strong>Flag:</strong> Report incorrect or outdated emails for community review</li>
                  <li>• <strong>Remove:</strong> Delete emails that are clearly wrong (use with caution)</li>
                </ul>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
} 