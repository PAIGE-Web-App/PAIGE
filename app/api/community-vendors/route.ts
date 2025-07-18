import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';

// GET - Retrieve community vendor data
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const placeId = searchParams.get('placeId');

    if (!placeId) {
      return NextResponse.json({ error: 'Place ID is required' }, { status: 400 });
    }

    const vendorDoc = await adminDb.collection('communityVendors').doc(placeId).get();
    
    if (!vendorDoc.exists) {
      return NextResponse.json({ vendor: null, placeId });
    }

    const data = vendorDoc.data();
    return NextResponse.json({ vendor: data, placeId });

  } catch (error) {
    console.error('Error fetching community vendor:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Add or update community vendor
export async function POST(req: NextRequest) {
  try {
    const { 
      placeId, 
      vendorName, 
      vendorAddress, 
      vendorCategory, 
      userId,
      selectedAsVenue = false,
      selectedAsVendor = false
    } = await req.json();

    if (!placeId || !vendorName || !userId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const vendorRef = adminDb.collection('communityVendors').doc(placeId);
    const vendorDoc = await vendorRef.get();

    const now = new Date().toISOString();

    if (!vendorDoc.exists) {
      // Create new community vendor record
      const communityVendor = {
        placeId,
        vendorName,
        vendorAddress: vendorAddress || '',
        vendorCategory: vendorCategory || 'Vendor',
        totalSelections: 1,
        venueSelections: selectedAsVenue ? 1 : 0,
        vendorSelections: selectedAsVendor ? 1 : 0,
        selectedBy: [userId],
        lastSelectedAt: now,
        createdAt: now,
        createdBy: userId
      };

      await vendorRef.set(communityVendor);
    } else {
      // Update existing community vendor record
      const existingData = vendorDoc.data();
      if (!existingData) {
        return NextResponse.json({ error: 'Vendor data not found' }, { status: 404 });
      }
      
      const selectedBy = existingData.selectedBy || [];
      
      // Only increment if this user hasn't selected this vendor before
      if (!selectedBy.includes(userId)) {
        const updatedData = {
          totalSelections: (existingData.totalSelections || 0) + 1,
          venueSelections: (existingData.venueSelections || 0) + (selectedAsVenue ? 1 : 0),
          vendorSelections: (existingData.vendorSelections || 0) + (selectedAsVendor ? 1 : 0),
          selectedBy: [...selectedBy, userId],
          lastSelectedAt: now,
          vendorName: vendorName || existingData.vendorName,
          vendorAddress: vendorAddress || existingData.vendorAddress,
          vendorCategory: vendorCategory || existingData.vendorCategory
        };

        await vendorRef.update(updatedData);
      } else {
        // User has already selected this vendor, just update the timestamp
        await vendorRef.update({
          lastSelectedAt: now
        });
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Community vendor updated successfully'
    });

  } catch (error) {
    console.error('Error updating community vendor:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 