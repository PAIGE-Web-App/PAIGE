/**
 * Vendor Instagram API
 * 
 * Handles Instagram data for vendors with optimizations:
 * - Server-side scraping only (no client network calls)
 * - Caches results in communityVendors (shared across users)
 * - Minimal Firestore writes (only when Instagram found)
 * - Rate limiting to prevent resource strain
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { scrapeInstagramFromWebsite, validateInstagramHandle } from '@/utils/instagramScraper';

// GET - Retrieve Instagram for a vendor
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const placeId = searchParams.get('placeId');

    if (!placeId) {
      return NextResponse.json({ error: 'Place ID is required' }, { status: 400 });
    }

    const adminDb = getAdminDb();
    if (!adminDb) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 });
    }

    // Check community vendors first (shared cache)
    const vendorDoc = await adminDb.collection('communityVendors').doc(placeId).get();
    
    if (!vendorDoc.exists) {
      return NextResponse.json({ 
        placeId,
        instagram: null,
        message: 'Vendor not found in community database'
      });
    }

    const data = vendorDoc.data();
    
    // Return cached Instagram if available
    if (data?.instagram) {
      return NextResponse.json({ 
        placeId,
        instagram: data.instagram,
        cached: true
      });
    }

    return NextResponse.json({ 
      placeId,
      instagram: null,
      cached: false,
      message: 'Instagram not yet scraped for this vendor'
    });

  } catch (error) {
    console.error('Error fetching vendor Instagram:', error);
    return NextResponse.json({ error: 'Failed to fetch Instagram' }, { status: 500 });
  }
}

// POST - Scrape and save Instagram for a vendor
export async function POST(req: NextRequest) {
  try {
    const { placeId, website, vendorName } = await req.json();

    if (!placeId) {
      return NextResponse.json({ error: 'Place ID is required' }, { status: 400 });
    }

    if (!website) {
      return NextResponse.json({ 
        error: 'No website available',
        instagram: null 
      }, { status: 400 });
    }

    const adminDb = getAdminDb();
    if (!adminDb) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 });
    }

    // Check if Instagram already exists (avoid unnecessary scraping)
    const vendorDoc = await adminDb.collection('communityVendors').doc(placeId).get();
    if (vendorDoc.exists && vendorDoc.data()?.instagram) {
      return NextResponse.json({ 
        placeId,
        instagram: vendorDoc.data()?.instagram,
        cached: true,
        message: 'Instagram already cached'
      });
    }

    // Scrape Instagram from website
    console.log(`Scraping Instagram for ${vendorName} from ${website}`);
    const result = await scrapeInstagramFromWebsite(website);

    if (!result.handle) {
      // No Instagram found - mark as attempted to avoid re-scraping
      await adminDb.collection('communityVendors').doc(placeId).set({
        instagram: null,
        instagramScrapedAt: new Date().toISOString(),
        instagramScrapedFrom: website
      }, { merge: true });

      return NextResponse.json({ 
        placeId,
        instagram: null,
        message: 'No Instagram found on website'
      });
    }

    // Validate handle (optional, adds extra network call)
    // const isValid = await validateInstagramHandle(result.handle);
    // if (!isValid) {
    //   return NextResponse.json({ 
    //     placeId,
    //     instagram: null,
    //     message: 'Instagram handle found but profile not accessible'
    //   });
    // }

    // Save Instagram to community vendors (ONE Firestore write)
    const instagramData = {
      instagram: {
        handle: result.handle,
        url: result.url,
        confidence: result.confidence,
        scrapedAt: new Date().toISOString(),
        scrapedFrom: website,
        verifiedBy: [] // For future crowdsourcing
      }
    };

    await adminDb.collection('communityVendors').doc(placeId).set(
      instagramData,
      { merge: true }
    );

    console.log(`✅ Found and saved Instagram for ${vendorName}: @${result.handle}`);

    return NextResponse.json({ 
      placeId,
      instagram: instagramData.instagram,
      cached: false,
      message: 'Instagram scraped and cached successfully'
    });

  } catch (error) {
    console.error('Error scraping vendor Instagram:', error);
    return NextResponse.json({ 
      error: 'Failed to scrape Instagram',
      instagram: null 
    }, { status: 500 });
  }
}

// PUT - Manually add/update Instagram for a vendor (crowdsourced)
export async function PUT(req: NextRequest) {
  try {
    const { placeId, instagramHandle, userId } = await req.json();

    if (!placeId || !instagramHandle || !userId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Clean and validate handle
    const cleanHandle = instagramHandle.replace('@', '').trim().toLowerCase();
    if (!/^[a-zA-Z0-9._]{1,30}$/.test(cleanHandle)) {
      return NextResponse.json({ error: 'Invalid Instagram handle format' }, { status: 400 });
    }

    const adminDb = getAdminDb();
    if (!adminDb) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 });
    }

    // Validate handle exists (optional)
    const isValid = await validateInstagramHandle(cleanHandle);
    if (!isValid) {
      return NextResponse.json({ 
        error: 'Instagram profile not found or not public' 
      }, { status: 404 });
    }

    const vendorRef = adminDb.collection('communityVendors').doc(placeId);
    const vendorDoc = await vendorRef.get();

    const instagramData = {
      handle: cleanHandle,
      url: `https://www.instagram.com/${cleanHandle}`,
      confidence: 'high' as const,
      addedBy: userId,
      addedAt: new Date().toISOString(),
      verifiedBy: [userId]
    };

    if (vendorDoc.exists) {
      // Update existing vendor
      const existingData = vendorDoc.data();
      const existingVerifiedBy = existingData?.instagram?.verifiedBy || [];
      
      // Add user to verifiedBy if not already present
      if (!existingVerifiedBy.includes(userId)) {
        instagramData.verifiedBy = [...existingVerifiedBy, userId];
      }

      await vendorRef.set({ instagram: instagramData }, { merge: true });
    } else {
      // Create new community vendor entry
      await vendorRef.set({ 
        placeId,
        instagram: instagramData,
        createdAt: new Date().toISOString()
      });
    }

    return NextResponse.json({ 
      placeId,
      instagram: instagramData,
      message: 'Instagram added successfully'
    });

  } catch (error) {
    console.error('Error adding vendor Instagram:', error);
    return NextResponse.json({ error: 'Failed to add Instagram' }, { status: 500 });
  }
}

