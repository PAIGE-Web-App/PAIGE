# Vendor Instagram Integration Strategy

## Overview
Add Instagram links to vendor profiles, especially for media-heavy vendors (photographers, videographers, florists, DJs, beauty salons).

## Why This Matters
- **Visual Portfolio**: Essential for photographers, videographers, florists
- **Authenticity**: Users want to see real work, not just Google reviews
- **Engagement**: Instagram provides more recent content than website galleries
- **Decision Making**: 80% of users check social media before hiring creative vendors

---

## Recommended 3-Phase Implementation

### Phase 1: Crowdsourced + Manual Entry (Week 1-2)
**Goal**: Build foundation with user contributions

#### Features:
1. **Add Instagram Field to Vendor Data Structure**
   - Add `instagram` field to vendor documents
   - Add `instagramVerifiedBy` array for crowdsourcing
   - Add `instagramLastUpdated` timestamp

2. **User Contribution System**
   - "Add Instagram" button on vendor detail pages
   - Simple modal with validation for Instagram handles
   - Community verification (similar to email system)
   - Users can flag incorrect handles

3. **UI Integration**
   - Instagram icon link on vendor cards
   - "View Instagram" button on vendor detail page
   - Instagram badge for vendors with verified handles
   - Preview first 3-6 posts (using Instagram's oEmbed API - free!)

#### Data Structure:
```typescript
interface VendorInstagramData {
  placeId: string;
  vendorName: string;
  instagram: {
    handle: string; // "@username" or "username"
    url: string; // "https://instagram.com/username"
    verifiedBy: string[]; // Array of user IDs who verified
    lastUpdated: string; // ISO timestamp
    reportedIncorrect: string[]; // User IDs who flagged as incorrect
    addedBy: string; // Original contributor
  };
}
```

#### Firestore Collection:
- **Collection**: `vendorSocialMedia`
- **Document ID**: `{placeId}`
- **Fields**: See above structure

---

### Phase 2: Website Scraping (Week 3-4)
**Goal**: Automatically find Instagram handles from vendor websites

#### Implementation:
1. **Create Scraping Service**
   - Scrape vendor website (if available)
   - Look for Instagram links in:
     - Footer social media icons
     - Header navigation
     - Contact page
     - "Follow us" sections
   
2. **Pattern Matching**
   - Regex patterns for Instagram URLs
   - Extract handle from various formats
   - Validate handle exists (check if profile is public)

3. **Auto-Populate for High-Priority Categories**
   - Run scraper on all photographers
   - Run scraper on all videographers
   - Run scraper on all florists
   - Store results with `verificationMethod: 'auto-scraped'`

#### Scraping Code Example:
```typescript
// utils/instagramScraper.ts
import axios from 'axios';
import * as cheerio from 'cheerio';

export async function findInstagramFromWebsite(websiteUrl: string): Promise<string | null> {
  try {
    // Fetch the website HTML
    const { data } = await axios.get(websiteUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 10000
    });

    const $ = cheerio.load(data);
    
    // Search for Instagram links
    const instagramPatterns = [
      /https?:\/\/(www\.)?instagram\.com\/([a-zA-Z0-9._]+)/gi,
      /instagram\.com\/([a-zA-Z0-9._]+)/gi,
      /@([a-zA-Z0-9._]+)/gi // For "@handle" mentions
    ];

    // Search in common locations
    const searchLocations = [
      'footer',
      'header',
      'nav',
      '.social-media',
      '.social-links',
      '.footer-social',
      'a[href*="instagram"]'
    ];

    for (const location of searchLocations) {
      const elements = $(location);
      elements.each((_, element) => {
        const href = $(element).attr('href');
        const text = $(element).text();
        
        for (const pattern of instagramPatterns) {
          const match = href?.match(pattern) || text?.match(pattern);
          if (match) {
            // Extract handle and validate
            const handle = extractHandle(match[0]);
            if (handle) return handle;
          }
        }
      });
    }

    return null;
  } catch (error) {
    console.error('Error scraping website:', error);
    return null;
  }
}

function extractHandle(matchedString: string): string | null {
  // Clean up and extract the handle
  const handle = matchedString
    .replace(/https?:\/\/(www\.)?instagram\.com\//gi, '')
    .replace(/@/g, '')
    .replace(/\//g, '')
    .trim();
    
  // Validate handle format
  if (/^[a-zA-Z0-9._]{1,30}$/.test(handle)) {
    return handle;
  }
  
  return null;
}
```

---

### Phase 3: AI-Powered Suggestions (Week 5+)
**Goal**: Use AI to suggest Instagram handles when scraping fails

#### Implementation:
1. **AI Search Assistant**
   - Use GPT-4 with web search to find Instagram handles
   - Input: Vendor name + location + category
   - Output: Suggested Instagram handle with confidence score

2. **Smart Caching**
   - Cache all found handles
   - Periodic re-validation (monthly)
   - Flag handles with low engagement as potentially incorrect

3. **User Verification Loop**
   - Show AI suggestions to users
   - Users confirm or reject
   - Build training data for better AI suggestions

#### AI Prompt Example:
```typescript
const prompt = `
Find the Instagram handle for the following wedding vendor:
- Name: ${vendorName}
- Location: ${address}
- Category: ${category}
- Website: ${website || 'N/A'}

Search Instagram and provide:
1. The exact Instagram handle (username only, no @ symbol)
2. Number of followers (if available)
3. Confidence score (0-100%)
4. Brief reasoning

Return ONLY the handle if confident, or "NOT_FOUND" if uncertain.
`;
```

---

## UI Design Recommendations

### Vendor Card (Small)
```
┌─────────────────────────────────┐
│ 📸 Vendor Name                  │
│ ⭐ 4.8 (120 reviews)            │
│ 📍 Brooklyn, NY                 │
│                                 │
│ [Contact] [Instagram 📷]        │
└─────────────────────────────────┘
```

### Vendor Detail Page (Large)
```
┌────────────────────────────────────────┐
│  Vendor Name                           │
│  ⭐ 4.8 • 120 reviews                 │
│                                        │
│  [Website] [Call] [Instagram]          │
│                                        │
│  📷 Instagram Preview (if available)   │
│  ┌────┬────┬────┬────┬────┬────┐      │
│  │ 📸 │ 📸 │ 📸 │ 📸 │ 📸 │ 📸 │      │
│  └────┴────┴────┴────┴────┴────┘      │
│  [View Full Instagram Profile →]       │
│                                        │
│  Missing Instagram?                    │
│  [+ Add Instagram Handle]              │
└────────────────────────────────────────┘
```

---

## Implementation Checklist

### Database Updates
- [ ] Add `instagram` field to vendor schema
- [ ] Create `vendorSocialMedia` Firestore collection
- [ ] Update vendor TypeScript interfaces
- [ ] Add Instagram verification tracking

### Backend
- [ ] Create `/api/vendor-social-media` endpoint (GET/POST/PUT)
- [ ] Implement website scraping function
- [ ] Add Instagram handle validation
- [ ] Create batch scraping script for photographers/videographers
- [ ] Add AI-powered Instagram search (optional)

### Frontend
- [ ] Add Instagram icon to vendor cards
- [ ] Create "Add Instagram" modal component
- [ ] Display Instagram preview on detail page (using oEmbed)
- [ ] Add verification/flagging system
- [ ] Show Instagram badge for verified handles

### Optimization
- [ ] Cache Instagram handles aggressively
- [ ] Rate limit API calls to Instagram
- [ ] Implement background scraping queue
- [ ] Add analytics for Instagram click-through rates

---

## Cost Analysis

### Phase 1 (Crowdsourced)
- **Cost**: $0
- **Time**: 2-3 weeks
- **Coverage**: 10-20% initially, grows over time

### Phase 2 (Website Scraping)
- **Cost**: $0 (self-hosted)
- **Time**: 1-2 weeks
- **Coverage**: 60-80% for vendors with websites

### Phase 3 (AI-Powered)
- **Cost**: ~$20-50/month (GPT-4 API)
- **Time**: 1 week
- **Coverage**: 85-95% overall

---

## Priority Categories (Focus First)

High-priority categories where Instagram is critical:
1. **Photographers** (99% have Instagram)
2. **Videographers** (95% have Instagram)
3. **Florists** (90% have Instagram)
4. **DJs** (80% have Instagram)
5. **Beauty Salons / Hair & Makeup** (85% have Instagram)
6. **Bakers / Cake Designers** (75% have Instagram)

---

## Free Instagram APIs to Consider

### 1. Instagram oEmbed API (FREE)
- **Use**: Display Instagram posts on your site
- **Limit**: No rate limit for oEmbed
- **URL**: `https://api.instagram.com/oembed/?url={instagram_post_url}`

### 2. Instagram Basic Display API (FREE)
- **Use**: Get basic profile info + recent posts
- **Limit**: 200 requests/hour per user
- **Requires**: User authorization (not practical for vendor profiles)

### 3. Web Scraping (FREE but fragile)
- **Use**: Public profile scraping
- **Limit**: Rate limited by Instagram
- **Risk**: May break with Instagram changes

---

## Recommended Tech Stack

### For Website Scraping
- **Library**: `cheerio` (HTML parsing)
- **HTTP Client**: `axios`
- **Rate Limiting**: `bottleneck`

### For Instagram Validation
- **Method**: Check if `instagram.com/{handle}` returns 200 OK
- **Alternative**: Use Instagram's oEmbed API to validate

### For UI
- **Icons**: `lucide-react` (already in use)
- **Modal**: Existing modal components
- **Instagram Preview**: Instagram oEmbed API

---

## Example Code Snippets

### 1. Add Instagram Field to Vendor Interface
```typescript
// types/vendor.ts
export interface Vendor {
  // ... existing fields
  instagram?: {
    handle: string;
    url: string;
    verifiedBy: string[];
    lastUpdated: string;
    addedBy: string;
  };
}
```

### 2. API Endpoint for Adding Instagram
```typescript
// app/api/vendor-social-media/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';

export async function POST(req: NextRequest) {
  try {
    const { placeId, instagramHandle, userId } = await req.json();
    
    // Validate Instagram handle
    const cleanHandle = instagramHandle.replace('@', '').trim();
    if (!/^[a-zA-Z0-9._]{1,30}$/.test(cleanHandle)) {
      return NextResponse.json({ error: 'Invalid Instagram handle' }, { status: 400 });
    }
    
    // Check if handle exists (optional)
    const instagramUrl = `https://www.instagram.com/${cleanHandle}/`;
    const response = await fetch(instagramUrl, { method: 'HEAD' });
    if (!response.ok) {
      return NextResponse.json({ error: 'Instagram profile not found' }, { status: 404 });
    }
    
    // Save to Firestore
    const adminDb = getAdminDb();
    const socialMediaRef = adminDb.collection('vendorSocialMedia').doc(placeId);
    
    await socialMediaRef.set({
      placeId,
      instagram: {
        handle: cleanHandle,
        url: instagramUrl,
        verifiedBy: [userId],
        lastUpdated: new Date().toISOString(),
        addedBy: userId
      }
    }, { merge: true });
    
    return NextResponse.json({ success: true, instagramUrl });
  } catch (error) {
    console.error('Error adding Instagram:', error);
    return NextResponse.json({ error: 'Failed to add Instagram' }, { status: 500 });
  }
}
```

### 3. Instagram Link Component
```typescript
// components/InstagramLink.tsx
import { Instagram } from 'lucide-react';

interface InstagramLinkProps {
  handle: string;
  size?: 'sm' | 'md' | 'lg';
}

export function InstagramLink({ handle, size = 'md' }: InstagramLinkProps) {
  const url = `https://www.instagram.com/${handle.replace('@', '')}`;
  
  const sizeClasses = {
    sm: 'text-sm px-2 py-1',
    md: 'text-base px-3 py-2',
    lg: 'text-lg px-4 py-3'
  };
  
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:opacity-90 transition-opacity ${sizeClasses[size]}`}
    >
      <Instagram size={size === 'sm' ? 16 : size === 'md' ? 20 : 24} />
      <span>@{handle.replace('@', '')}</span>
    </a>
  );
}
```

---

## Analytics to Track

1. **Instagram Availability**
   - % of vendors with Instagram by category
   - Most active categories

2. **User Engagement**
   - Click-through rate on Instagram links
   - Time spent on vendor pages with vs without Instagram

3. **Data Quality**
   - Verification rate
   - Incorrect handle reports
   - Crowdsourced vs scraped accuracy

4. **Business Impact**
   - Correlation between Instagram presence and vendor selection
   - User satisfaction scores

---

## Next Steps

**Immediate (This Week)**:
1. Add `instagram` field to vendor data model
2. Create "Add Instagram" modal component
3. Set up `vendorSocialMedia` Firestore collection

**Short-term (Next 2 Weeks)**:
1. Implement crowdsourced Instagram system
2. Add Instagram links to vendor UI
3. Test with photographers category first

**Medium-term (Next Month)**:
1. Build website scraping service
2. Run batch scraper on high-priority categories
3. Add Instagram preview using oEmbed API

**Long-term (2+ Months)**:
1. Implement AI-powered suggestions
2. Add Instagram post previews
3. Build analytics dashboard

---

## Questions?

Key decisions to make:
1. Do we want to start with just links, or also show Instagram previews?
2. Should we prioritize certain vendor categories first?
3. Do we want to invest in paid APIs, or stick with free scraping?
4. Should Instagram be a required field for certain categories?

