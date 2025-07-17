import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail, Building, User, Star, Plus, Trash2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useCustomToast } from '@/hooks/useCustomToast';
import type { VendorEmail, GlobalVendorEmail } from '@/types/contact';

interface VendorEmailAssociationModalProps {
  isOpen: boolean;
  onClose: () => void;
  contact: any;
  vendor?: any; // Google Places vendor data
  onAssociationComplete?: (contact: any) => void;
}

export default function VendorEmailAssociationModal({ 
  isOpen, 
  onClose, 
  contact, 
  vendor,
  onAssociationComplete 
}: VendorEmailAssociationModalProps) {
  const { user } = useAuth();
  const { showSuccessToast, showErrorToast } = useCustomToast();
  
  const [vendorEmails, setVendorEmails] = useState<VendorEmail[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newEmail, setNewEmail] = useState({
    email: contact?.email || '',
    contactName: contact?.name || '',
    role: ''
  });

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

  const handleAddEmail = async () => {
    if (!user?.uid || !vendor?.place_id || !newEmail.email.trim()) {
      showErrorToast('Please fill in all required fields');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/vendor-emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          placeId: vendor.place_id,
          vendorName: vendor.name,
          vendorAddress: vendor.formatted_address,
          vendorCategory: getVendorCategory(vendor),
          email: newEmail.email.trim(),
          contactName: newEmail.contactName.trim() || null,
          role: newEmail.role.trim() || null,
          userId: user.uid
        })
      });

      const data = await response.json();
      
      if (data.success) {
        showSuccessToast('Email associated with vendor successfully!');
        setNewEmail({ email: '', contactName: '', role: '' });
        setShowAddForm(false);
        await fetchVendorEmails(); // Refresh the list
        
        // Update the contact with vendor association
        if (onAssociationComplete) {
          const updatedContact = {
            ...contact,
            placeId: vendor.place_id,
            isVendorContact: true,
            vendorEmails: [...vendorEmails, data.email]
          };
          onAssociationComplete(updatedContact);
        }
      } else {
        showErrorToast(data.error || 'Failed to associate email');
      }
    } catch (error) {
      console.error('Error adding vendor email:', error);
      showErrorToast('Failed to associate email. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleMarkPrimary = async (email: string) => {
    if (!user?.uid || !vendor?.place_id) return;

    setSaving(true);
    try {
      const response = await fetch('/api/vendor-emails', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          placeId: vendor.place_id,
          email,
          updates: { isPrimary: true },
          userId: user.uid
        })
      });

      const data = await response.json();
      
      if (data.success) {
        showSuccessToast('Primary email updated!');
        await fetchVendorEmails(); // Refresh the list
      } else {
        showErrorToast(data.error || 'Failed to update primary email');
      }
    } catch (error) {
      console.error('Error updating primary email:', error);
      showErrorToast('Failed to update primary email. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveEmail = async (email: string) => {
    if (!user?.uid || !vendor?.place_id) return;

    if (!confirm('Are you sure you want to remove this email association?')) {
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`/api/vendor-emails?placeId=${vendor.place_id}&email=${email}&userId=${user.uid}`, {
        method: 'DELETE'
      });

      const data = await response.json();
      
      if (data.success) {
        showSuccessToast('Email association removed!');
        await fetchVendorEmails(); // Refresh the list
      } else {
        showErrorToast(data.error || 'Failed to remove email association');
      }
    } catch (error) {
      console.error('Error removing email association:', error);
      showErrorToast('Failed to remove email association. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const getVendorCategory = (vendor: any): string => {
    if (vendor.types && Array.isArray(vendor.types)) {
      const typeToCategory: Record<string, string> = {
        'florist': 'Florist',
        'jewelry_store': 'Jewelry',
        'bakery': 'Bakery',
        'restaurant': 'Venue',
        'hair_care': 'Hair & Beauty',
        'photographer': 'Photographer',
        'clothing_store': 'Bridal Salon',
        'beauty_salon': 'Beauty Salon',
        'spa': 'Spa',
        'dj': 'DJ',
        'band': 'Band',
        'wedding_planner': 'Wedding Planner',
        'caterer': 'Catering',
        'car_rental': 'Transportation',
        'travel_agency': 'Travel'
      };
      
      for (const type of vendor.types) {
        if (typeToCategory[type]) {
          return typeToCategory[type];
        }
      }
    }
    return 'Vendor';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Building className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Associate with Vendor
                </h3>
                <p className="text-sm text-gray-600">
                  Link this contact to {vendor?.name || 'vendor'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
            {/* Contact Info */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <h4 className="font-medium text-gray-900 mb-2">Contact Information</h4>
              <div className="flex items-center gap-3">
                <div 
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-medium"
                  style={{ backgroundColor: contact?.avatarColor || '#A85C36' }}
                >
                  {contact?.name?.slice(0, 2).toUpperCase() || 'NA'}
                </div>
                <div>
                  <p className="font-medium text-gray-900">{contact?.name}</p>
                  <p className="text-sm text-gray-600">{contact?.email}</p>
                </div>
              </div>
            </div>

            {/* Vendor Info */}
            {vendor && (
              <div className="bg-blue-50 rounded-lg p-4 mb-6">
                <h4 className="font-medium text-gray-900 mb-2">Vendor Information</h4>
                <p className="font-medium text-gray-900">{vendor.name}</p>
                <p className="text-sm text-gray-600">{vendor.formatted_address}</p>
                <p className="text-sm text-gray-600">{getVendorCategory(vendor)}</p>
              </div>
            )}

            {/* Existing Vendor Emails */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-medium text-gray-900">Associated Emails</h4>
                <button
                  onClick={() => setShowAddForm(true)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Email
                </button>
              </div>

              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
                  <p className="text-sm text-gray-600 mt-2">Loading vendor emails...</p>
                </div>
              ) : vendorEmails.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-lg">
                  <Mail className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">No emails associated with this vendor yet</p>
                  <p className="text-xs text-gray-500 mt-1">Be the first to add a verified email!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {vendorEmails.map((email, index) => (
                    <div key={index} className="bg-white border rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Mail className="w-4 h-4 text-gray-500" />
                            <span className="font-medium text-gray-900">{email.email}</span>
                            {email.isPrimary && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded-full">
                                <Star className="w-3 h-3" />
                                Primary
                              </span>
                            )}
                          </div>
                          {email.contactName && (
                            <div className="flex items-center gap-2 mb-1">
                              <User className="w-3 h-3 text-gray-500" />
                              <span className="text-sm text-gray-600">{email.contactName}</span>
                            </div>
                          )}
                          {email.role && (
                            <p className="text-sm text-gray-600">{email.role}</p>
                          )}
                          <p className="text-xs text-gray-500 mt-2">
                            Verified {formatDate(email.verifiedAt)} • {email.verificationMethod}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          {!email.isPrimary && (
                            <button
                              onClick={() => handleMarkPrimary(email.email)}
                              disabled={saving}
                              className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                              title="Mark as primary"
                            >
                              <Star className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleRemoveEmail(email.email)}
                            disabled={saving}
                            className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Remove email"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Add Email Form */}
            {showAddForm && (
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <h4 className="font-medium text-gray-900 mb-4">Add New Email Association</h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      value={newEmail.email}
                      onChange={(e) => setNewEmail(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="contact@vendor.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Contact Name
                    </label>
                    <input
                      type="text"
                      value={newEmail.contactName}
                      onChange={(e) => setNewEmail(prev => ({ ...prev, contactName: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="John Smith"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Role/Title
                    </label>
                    <input
                      type="text"
                      value={newEmail.role}
                      onChange={(e) => setNewEmail(prev => ({ ...prev, role: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="Event Coordinator"
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleAddEmail}
                      disabled={saving || !newEmail.email.trim()}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {saving ? 'Adding...' : 'Add Email'}
                    </button>
                    <button
                      onClick={() => setShowAddForm(false)}
                      className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Close
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
} 