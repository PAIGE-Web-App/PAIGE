import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, XCircle, AlertTriangle, Mail, User, Clock } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useCustomToast } from '@/hooks/useCustomToast';
import LoadingSpinner from '@/components/LoadingSpinner';

interface VendorEmailFlagReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface FlaggedEmail {
  id: string;
  placeId: string;
  email: string;
  reason: string;
  flaggedBy: string;
  flaggedAt: string;
  status: 'pending' | 'reviewed' | 'resolved';
  reviewedBy?: string;
  reviewedAt?: string;
  resolution?: string;
}

export default function VendorEmailFlagReviewModal({ 
  isOpen, 
  onClose 
}: VendorEmailFlagReviewModalProps) {
  const { user } = useAuth();
  const { showSuccessToast, showErrorToast } = useCustomToast();
  
  const [flaggedEmails, setFlaggedEmails] = useState<FlaggedEmail[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedFlag, setSelectedFlag] = useState<FlaggedEmail | null>(null);
  const [resolution, setResolution] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchFlaggedEmails();
    }
  }, [isOpen]);

  const fetchFlaggedEmails = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/vendor-emails/flag?status=pending');
      const data = await response.json();
      
      if (data.flags) {
        setFlaggedEmails(data.flags);
      }
    } catch (error) {
      console.error('Error fetching flagged emails:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReviewFlag = async (flagId: string, action: 'approve' | 'reject' | 'remove', resolutionText?: string) => {
    if (!user?.uid) return;

    setLoading(true);
    try {
      const response = await fetch('/api/vendor-emails/flag/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          flagId,
          action,
          resolution: resolutionText || resolution,
          reviewedBy: user.uid
        })
      });

      const data = await response.json();
      
      if (data.success) {
        showSuccessToast(`Flag ${action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'resolved'} successfully!`);
        setSelectedFlag(null);
        setResolution('');
        await fetchFlaggedEmails();
      } else {
        showErrorToast(data.error || 'Failed to review flag');
      }
    } catch (error) {
      console.error('Error reviewing flag:', error);
      showErrorToast('Failed to review flag. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'reviewed': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'resolved': return <XCircle className="w-4 h-4 text-red-500" />;
      default: return <AlertTriangle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'Pending Review';
      case 'reviewed': return 'Reviewed';
      case 'resolved': return 'Resolved';
      default: return 'Unknown';
    }
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
            className="bg-white rounded-[10px] shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-[#AB9C95]">
              <div>
                <h3 className="text-lg font-playfair font-semibold text-[#332B42]">
                  Review Flagged Vendor Emails
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  {flaggedEmails.length} pending review
                </p>
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
              ) : flaggedEmails.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="w-12 h-12 text-green-300 mx-auto mb-4" />
                  <p className="text-gray-600">No flagged emails pending review!</p>
                  <p className="text-xs text-gray-500 mt-1">All flagged emails have been reviewed.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {flaggedEmails.map((flag) => (
                    <div key={flag.id} className="border border-[#AB9C95] rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Mail className="w-4 h-4 text-gray-500" />
                            <span className="font-medium text-[#332B42]">{flag.email}</span>
                            {getStatusIcon(flag.status)}
                            <span className="text-xs text-gray-500">
                              {getStatusLabel(flag.status)}
                            </span>
                          </div>
                          
                          <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mb-2">
                            <p className="text-sm text-yellow-800">
                              <strong>Flag Reason:</strong> {flag.reason}
                            </p>
                          </div>
                          
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span>Flagged by: {flag.flaggedBy}</span>
                            <span>•</span>
                            <span>{new Date(flag.flaggedAt).toLocaleDateString()}</span>
                            <span>•</span>
                            <span>Vendor ID: {flag.placeId}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 ml-4">
                          <button
                            onClick={() => setSelectedFlag(flag)}
                            className="px-3 py-1 bg-[#A85C36] text-white text-xs rounded hover:bg-[#8B4A2A]"
                          >
                            Review
                          </button>
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
                <p className="mb-2"><strong>Review Guidelines:</strong></p>
                <ul className="space-y-1 text-xs">
                  <li>• <strong>Approve:</strong> Flag is valid, email should be removed</li>
                  <li>• <strong>Reject:</strong> Flag is invalid, email should remain</li>
                  <li>• <strong>Remove:</strong> Immediately remove the email (use for obvious spam)</li>
                </ul>
              </div>
            </div>
          </motion.div>

          {/* Review Modal */}
          <AnimatePresence>
            {selectedFlag && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center p-4 z-[60]"
                onClick={() => setSelectedFlag(null)}
              >
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.95, opacity: 0 }}
                  className="bg-white rounded-lg shadow-xl max-w-md w-full"
                  onClick={e => e.stopPropagation()}
                >
                  <div className="p-6">
                    <h4 className="text-lg font-medium text-[#332B42] mb-4">
                      Review Flagged Email
                    </h4>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Email Address
                        </label>
                        <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                          {selectedFlag.email}
                        </p>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Flag Reason
                        </label>
                        <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                          {selectedFlag.reason}
                        </p>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Resolution Notes (Optional)
                        </label>
                        <textarea
                          value={resolution}
                          onChange={(e) => setResolution(e.target.value)}
                          placeholder="Add notes about your decision..."
                          className="w-full h-20 p-2 border border-[#AB9C95] rounded resize-none focus:outline-none focus:ring-2 focus:ring-[#A85C36] text-sm"
                        />
                      </div>
                      
                      <div className="flex gap-2 pt-4">
                        <button
                          onClick={() => handleReviewFlag(selectedFlag.id, 'approve')}
                          disabled={loading}
                          className="flex-1 px-3 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:opacity-50"
                        >
                          Approve Flag
                        </button>
                        <button
                          onClick={() => handleReviewFlag(selectedFlag.id, 'reject')}
                          disabled={loading}
                          className="flex-1 px-3 py-2 bg-yellow-600 text-white text-sm rounded hover:bg-yellow-700 disabled:opacity-50"
                        >
                          Reject Flag
                        </button>
                        <button
                          onClick={() => handleReviewFlag(selectedFlag.id, 'remove')}
                          disabled={loading}
                          className="flex-1 px-3 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700 disabled:opacity-50"
                        >
                          Remove Email
                        </button>
                      </div>
                      
                      <button
                        onClick={() => setSelectedFlag(null)}
                        className="w-full px-3 py-2 border border-gray-300 text-gray-700 text-sm rounded hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
} 