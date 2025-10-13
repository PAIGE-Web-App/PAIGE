/**
 * useVendorInstagram Hook
 * 
 * Efficiently manages Instagram data for vendors with:
 * - Zero additional Firestore reads (uses existing vendor data)
 * - Minimal Firestore writes (only when Instagram found)
 * - Background scraping (doesn't block UI)
 * - Smart caching (prevents re-scraping)
 */

import { useState, useEffect, useRef } from 'react';

interface InstagramData {
  handle: string;
  url: string;
  confidence: 'high' | 'medium' | 'low';
  scrapedAt?: string;
  scrapedFrom?: string;
  addedBy?: string;
  verifiedBy?: string[];
}

interface UseVendorInstagramReturn {
  instagram: InstagramData | null;
  isLoading: boolean;
  error: string | null;
  scrapeInstagram: () => Promise<void>;
}

/**
 * Hook to manage Instagram data for a vendor
 * @param placeId - Google Places ID for the vendor
 * @param website - Vendor's website URL
 * @param existingInstagram - Instagram data from initial vendor load
 * @param autoScrape - Whether to automatically scrape if Instagram missing
 * @returns Instagram data and loading state
 */
export function useVendorInstagram(
  placeId: string | undefined,
  website: string | undefined,
  existingInstagram: InstagramData | null | undefined,
  autoScrape: boolean = true
): UseVendorInstagramReturn {
  const [instagram, setInstagram] = useState<InstagramData | null>(existingInstagram || null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasAttemptedScrape = useRef(false);

  // Update instagram if existingInstagram changes (from parent component)
  useEffect(() => {
    if (existingInstagram) {
      setInstagram(existingInstagram);
    }
  }, [existingInstagram]);

  // Auto-scrape Instagram if missing (only once per component mount)
  useEffect(() => {
    if (
      autoScrape &&
      placeId &&
      website &&
      !instagram &&
      !hasAttemptedScrape.current
    ) {
      hasAttemptedScrape.current = true;
      scrapeInstagram();
    }
  }, [placeId, website, instagram, autoScrape]);

  const scrapeInstagram = async () => {
    if (!placeId || !website) {
      setError('Missing place ID or website');
      return;
    }

    if (isLoading) return; // Prevent concurrent scrapes

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/vendor-instagram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ placeId, website })
      });

      const data = await response.json();

      if (response.ok && data.instagram) {
        setInstagram(data.instagram);
      } else {
        // No Instagram found - this is not an error, just no result
        setInstagram(null);
      }
    } catch (err) {
      console.error('Error scraping Instagram:', err);
      setError('Failed to find Instagram');
    } finally {
      setIsLoading(false);
    }
  };

  return {
    instagram,
    isLoading,
    error,
    scrapeInstagram
  };
}

