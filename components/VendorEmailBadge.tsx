import React, { useState, useEffect, useRef } from 'react';
import { Mail, Users, Star } from 'lucide-react';
import LoadingSpinner from '@/components/LoadingSpinner';
import type { VendorEmail } from '@/types/contact';

// Global rate limiter to prevent too many simultaneous requests
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 2000; // 2 seconds between requests

interface VendorEmailBadgeProps {
  placeId: string;
  className?: string;
}

export default function VendorEmailBadge({ placeId, className = '' }: VendorEmailBadgeProps) {
  const [vendorEmails, setVendorEmails] = useState<VendorEmail[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (placeId) {
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
  }, [placeId]);

  const fetchVendorEmails = async () => {
    const now = Date.now();
    const timeSinceLastRequest = now - lastRequestTime;
    
    // If too soon since last request, skip this one
    if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
      console.log('Skipping vendor email request due to rate limiting');
      setError(true);
      return;
    }
    
    lastRequestTime = now;
    setLoading(true);
    setError(false);
    
    try {
      const response = await fetch(`/api/vendor-emails?placeId=${placeId}`);
      
      if (response.status === 429) {
        // Rate limited - don't retry immediately
        console.warn('Rate limited for vendor emails, skipping');
        setError(true);
        return;
      }
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.emails) {
        setVendorEmails(data.emails);
      }
    } catch (error) {
      console.error('Error fetching vendor emails:', error);
      setError(true);
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

  if (error || vendorEmails.length === 0) {
    return null; // Don't show anything if error or no emails
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