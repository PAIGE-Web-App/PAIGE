import React, { useState, useEffect } from 'react';
import { Mail, Users, Star } from 'lucide-react';
import LoadingSpinner from '@/components/LoadingSpinner';
import type { VendorEmail } from '@/types/contact';

interface VendorEmailBadgeProps {
  placeId: string;
  className?: string;
}

export default function VendorEmailBadge({ placeId, className = '' }: VendorEmailBadgeProps) {
  const [vendorEmails, setVendorEmails] = useState<VendorEmail[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (placeId) {
      fetchVendorEmails();
    }
  }, [placeId]);

  const fetchVendorEmails = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/vendor-emails?placeId=${placeId}`);
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

  if (loading) {
    return (
      <div className={`inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full ${className}`}>
        <LoadingSpinner size="sm" />
        <span>Loading...</span>
      </div>
    );
  }

  if (vendorEmails.length === 0) {
    return null; // Don't show anything if no emails
  }

  const primaryEmail = vendorEmails.find(email => email.isPrimary);
  const totalEmails = vendorEmails.length;

  return (
    <div className={`inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full ${className}`}>
      <Mail className="w-3 h-3" />
      <span className="font-medium">
        {primaryEmail ? primaryEmail.email : `${totalEmails} emails`}
      </span>
      {primaryEmail && totalEmails > 1 && (
        <span className="text-green-600">
          +{totalEmails - 1}
        </span>
      )}
      <Star className="w-3 h-3 text-yellow-500" />
    </div>
  );
} 