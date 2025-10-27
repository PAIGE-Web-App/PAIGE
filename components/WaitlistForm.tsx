'use client';

import { useState, useEffect } from 'react';
import { Mail, Loader2, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import OptimizedTooltip from '@/components/ui/OptimizedTooltip';

interface WaitlistFormProps {
  variant?: 'hero' | 'inline';
  className?: string;
}

export default function WaitlistForm({ variant = 'hero', className = '' }: WaitlistFormProps) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error' | 'duplicate'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [waitlistCount, setWaitlistCount] = useState<number | null>(null);
  const [source, setSource] = useState<string>('direct');

  // Capture UTM source on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const utmSource = params.get('utm_source');
      const utmMedium = params.get('utm_medium');
      const utmCampaign = params.get('utm_campaign');
      
      // Build source string from UTM parameters
      if (utmSource) {
        let sourceStr = utmSource;
        if (utmMedium) sourceStr += `-${utmMedium}`;
        if (utmCampaign) sourceStr += `-${utmCampaign}`;
        setSource(sourceStr);
      }
    }
  }, []);

  // Fetch waitlist count on mount
  useEffect(() => {
    const fetchCount = async () => {
      try {
        const response = await fetch('/api/waitlist/count');
        const data = await response.json();
        if (data.success) {
          setWaitlistCount(data.count);
        }
      } catch (error) {
        console.error('Failed to fetch waitlist count:', error);
      }
    };
    fetchCount();
    
    // Refresh count every 30 seconds
    const interval = setInterval(fetchCount, 30000);
    return () => clearInterval(interval);
  }, []);

  // Increment count on successful signup
  useEffect(() => {
    if (status === 'success' && waitlistCount !== null) {
      setWaitlistCount(prev => (prev !== null ? prev + 1 : null));
    }
  }, [status]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setStatus('idle');
    setErrorMessage('');

    try {
      const response = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source })
      });

      const data = await response.json();

      if (response.ok) {
        setStatus('success');
        setEmail('');
        setName('');
      } else if (response.status === 409) {
        setStatus('duplicate');
        setErrorMessage('Email already on waitlist');
      } else {
        setStatus('error');
        setErrorMessage(data.error || 'Something went wrong');
      }
    } catch (error) {
      setStatus('error');
      setErrorMessage('Network error. Please try again.');
    } finally {
      setIsSubmitting(false);
      // Clear status after 5 seconds
      setTimeout(() => setStatus('idle'), 5000);
    }
  };

  const isHero = variant === 'hero';

  return (
    <div className={`w-full max-w-md mx-auto ${className}`}>
      {/* Waitlist counter + bonus credits */}
      <div className="mb-4 text-center space-y-1">
        {waitlistCount === null ? (
          // Loading skeleton
          <div className="animate-pulse space-y-1">
            <div className="h-6 bg-gray-200 rounded w-64 mx-auto"></div>
            <div className="h-5 bg-gray-200 rounded w-56 mx-auto"></div>
          </div>
        ) : (
          <>
            <p className="font-work text-base font-semibold text-[#5A4A42]">
              <span className="text-[#A85C36]">{waitlistCount}+</span> people are already on the waitlist
            </p>
            <div className="flex items-center justify-center gap-1">
              <p className="font-work text-sm text-[#5A4A42]">
                Join for early access + <span className="font-semibold text-[#A85C36]">50 bonus credits</span> 🎁
              </p>
              <OptimizedTooltip
                content={
                  <div className="text-left">
                    <p className="font-semibold mb-1">What are AI credits?</p>
                    <p>Credits power AI features like generating budgets, to-dos, drafting messages, and more. Free Plan gets 15 credits daily!</p>
                  </div>
                }
                position="top"
                maxWidth="max-w-xs"
                tooltipClassName="whitespace-normal"
              >
                <Info className="w-4 h-4 text-gray-400 hover:text-gray-600 transition-colors cursor-help" />
              </OptimizedTooltip>
            </div>
          </>
        )}
      </div>
      
      <AnimatePresence mode="wait">
        {status === 'success' ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-green-50 border border-green-200 rounded-lg p-4 text-center"
          >
            <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-2" />
            <h3 className="font-work text-lg font-semibold text-green-900 mb-1">
              You're in! 🎉
            </h3>
            <p className="font-work text-sm text-green-700">
              Check your email for confirmation. We'll notify you when Paige AI launches!
            </p>
          </motion.div>
        ) : (
          <motion.form
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onSubmit={handleSubmit}
            className="space-y-3"
          >
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Your email"
                required
                disabled={isSubmitting}
                className="flex-1 px-4 py-3 border border-[#AB9C95] rounded-lg font-work text-[#332B42] placeholder:text-[#AB9C95] focus:outline-none focus:ring-2 focus:ring-[#A85C36] transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
              <button
                type="submit"
                disabled={isSubmitting}
                className={`${
                  isHero
                    ? 'bg-[#A85C36] hover:bg-[#784528] text-white font-work px-6 py-3 rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2'
                    : 'btn-primary'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Joining...
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4" />
                    Join Waitlist
                  </>
                )}
              </button>
            </div>
            
            {status === 'error' || status === 'duplicate' ? (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 text-sm text-red-600"
              >
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span className="font-work">{errorMessage}</span>
              </motion.div>
            ) : null}

            <p className="text-xs text-[#5A4A42] font-work text-center">
              No spam. Unsubscribe anytime.
            </p>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}

