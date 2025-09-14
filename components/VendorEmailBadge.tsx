import React, { useState, useEffect, useRef } from 'react';
import { Mail, Users, Star } from 'lucide-react';
import LoadingSpinner from '@/components/LoadingSpinner';
import type { VendorEmail } from '@/types/contact';
import VendorEmailQueue from '@/utils/vendorEmailQueue';

interface VendorEmailBadgeProps {
  placeId: string;
  className?: string;
  autoFetch?: boolean; // Only fetch automatically if true
  onEmailsLoaded?: (emails: VendorEmail[]) => void; // Callback when emails are loaded
}

const VendorEmailBadge = React.forwardRef<{ fetchEmails: () => Promise<void> }, VendorEmailBadgeProps>(
  ({ placeId, className = '', autoFetch = false, onEmailsLoaded }, ref) => {
    const [vendorEmails, setVendorEmails] = useState<VendorEmail[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(false);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (placeId && autoFetch) {
      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      // Debounce the API call by 1000ms to prevent rate limiting
      timeoutRef.current = setTimeout(() => {
        fetchVendorEmails();
      }, 1000);
    }

    // Cleanup timeout on unmount
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [placeId, autoFetch]);

  const fetchVendorEmails = async () => {
    setLoading(true);
    setError(false);
    
    try {
      const queue = VendorEmailQueue.getInstance();
      const data = await queue.queueRequest(placeId);
      
      if (data.emails) {
        setVendorEmails(data.emails);
        onEmailsLoaded?.(data.emails);
      }
    } catch (error) {
      console.error('Error fetching vendor emails:', error);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  // Expose fetch method for manual triggering
  React.useImperativeHandle(ref, () => ({
    fetchEmails: fetchVendorEmails
  }));

  if (loading) {
    return (
      <div className={`inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full ${className}`}>
        <LoadingSpinner size="sm" />
        <span>Loading...</span>
      </div>
    );
  }

  if (error || vendorEmails.length === 0) {
    return null; // Don't show anything if error or no emails
  }

  const totalEmails = vendorEmails.length;

  return (
    <div className={`inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full ${className}`}>
      <Mail className="w-3 h-3" />
      <span className="font-medium">
        Verified Email Address +{totalEmails}
      </span>
    </div>
  );
});

VendorEmailBadge.displayName = 'VendorEmailBadge';

export default VendorEmailBadge; 