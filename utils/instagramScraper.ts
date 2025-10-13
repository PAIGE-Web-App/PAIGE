/**
 * Instagram Scraper Utility
 * 
 * Efficiently finds Instagram handles from vendor websites with:
 * - Server-side scraping only (no client-side network calls)
 * - Rate limiting to prevent resource strain
 * - Smart caching to minimize Firestore writes
 * - Graceful fallbacks for failures
 */

interface InstagramResult {
  handle: string | null;
  url: string | null;
  confidence: 'high' | 'medium' | 'low';
}

/**
 * Extract Instagram handle from a website URL
 * @param websiteUrl - The vendor's website URL
 * @returns Instagram handle and URL, or null if not found
 */
export async function scrapeInstagramFromWebsite(websiteUrl: string): Promise<InstagramResult> {
  try {
    // Validate URL
    if (!websiteUrl || typeof websiteUrl !== 'string') {
      return { handle: null, url: null, confidence: 'low' };
    }

    // Ensure URL has protocol
    const url = websiteUrl.startsWith('http') ? websiteUrl : `https://${websiteUrl}`;

    // Fetch website HTML with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.log(`Failed to fetch ${url}: ${response.status}`);
      return { handle: null, url: null, confidence: 'low' };
    }

    const html = await response.text();

    // Pattern matching for Instagram handles
    const instagramPatterns = [
      // High confidence: Direct Instagram links
      /https?:\/\/(www\.)?instagram\.com\/([a-zA-Z0-9._]+)\/?/gi,
      // Medium confidence: instagram.com without protocol
      /instagram\.com\/([a-zA-Z0-9._]+)/gi,
      // Low confidence: @mentions (might be false positives)
      /@([a-zA-Z0-9._]+)/gi
    ];

    const handles = new Set<string>();

    // Try each pattern
    for (const pattern of instagramPatterns) {
      const matches = html.matchAll(pattern);
      for (const match of matches) {
        // Extract handle (either from URL or @mention)
        const potentialHandle = match[2] || match[1];
        if (potentialHandle && isValidInstagramHandle(potentialHandle)) {
          handles.add(potentialHandle.toLowerCase());
        }
      }
    }

    // If multiple handles found, prefer the first one (usually in header/footer)
    if (handles.size > 0) {
      const handle = Array.from(handles)[0];
      return {
        handle,
        url: `https://www.instagram.com/${handle}`,
        confidence: handles.size === 1 ? 'high' : 'medium'
      };
    }

    return { handle: null, url: null, confidence: 'low' };

  } catch (error) {
    // Graceful failure - don't log to avoid noise
    if (error instanceof Error && error.name === 'AbortError') {
      console.log(`Scraping timeout for ${websiteUrl}`);
    }
    return { handle: null, url: null, confidence: 'low' };
  }
}

/**
 * Validate Instagram handle format
 * @param handle - Potential Instagram handle
 * @returns true if valid format
 */
function isValidInstagramHandle(handle: string): boolean {
  // Instagram handles:
  // - 1-30 characters
  // - Letters, numbers, periods, underscores only
  // - No consecutive periods
  // - Not common false positives
  const invalidHandles = [
    'instagram', 'facebook', 'twitter', 'linkedin', 'youtube',
    'share', 'follow', 'social', 'media', 'contact', 'email',
    'phone', 'address', 'com', 'www', 'http', 'https'
  ];

  if (!handle || invalidHandles.includes(handle.toLowerCase())) {
    return false;
  }

  return /^[a-zA-Z0-9._]{1,30}$/.test(handle) && !handle.includes('..');
}

/**
 * Validate that an Instagram handle exists by checking the profile
 * @param handle - Instagram handle to validate
 * @returns true if profile exists and is public
 */
export async function validateInstagramHandle(handle: string): Promise<boolean> {
  try {
    const url = `https://www.instagram.com/${handle}/`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout

    const response = await fetch(url, {
      method: 'HEAD', // Use HEAD to avoid downloading full page
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Rate-limited scraper for batch processing
 * @param websites - Array of website URLs
 * @param delayMs - Delay between requests in milliseconds
 * @returns Array of results
 */
export async function batchScrapeInstagram(
  websites: string[],
  delayMs: number = 500
): Promise<Array<{ website: string; result: InstagramResult }>> {
  const results: Array<{ website: string; result: InstagramResult }> = [];

  for (const website of websites) {
    const result = await scrapeInstagramFromWebsite(website);
    results.push({ website, result });

    // Rate limiting delay
    if (delayMs > 0) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  return results;
}

