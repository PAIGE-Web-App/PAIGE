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
      selectedAsVendor = false,
      isFavorite = false
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
        totalSelections: selectedAsVendor ? 1 : 0,
        venueSelections: selectedAsVenue ? 1 : 0,
        vendorSelections: selectedAsVendor ? 1 : 0,
        totalFavorites: isFavorite ? 1 : 0,
        favoritedBy: isFavorite ? [userId] : [],
        selectedBy: selectedAsVendor ? [userId] : [],
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
      const favoritedBy = existingData.favoritedBy || [];
      
      let updatedData: any = {
        vendorName: vendorName || existingData.vendorName,
        vendorAddress: vendorAddress || existingData.vendorAddress,
        vendorCategory: vendorCategory || existingData.vendorCategory
      };

      // Handle vendor selections
      if (selectedAsVendor && !selectedBy.includes(userId)) {
        updatedData.totalSelections = (existingData.totalSelections || 0) + 1;
        updatedData.vendorSelections = (existingData.vendorSelections || 0) + 1;
        updatedData.selectedBy = [...selectedBy, userId];
        updatedData.lastSelectedAt = now;
      }

      // Handle venue selections
      if (selectedAsVenue) {
        updatedData.venueSelections = (existingData.venueSelections || 0) + 1;
      }

      // Handle favorites
      if (isFavorite && !favoritedBy.includes(userId)) {
        updatedData.totalFavorites = (existingData.totalFavorites || 0) + 1;
        updatedData.favoritedBy = [...favoritedBy, userId];
      } else if (!isFavorite && favoritedBy.includes(userId)) {
        updatedData.totalFavorites = Math.max((existingData.totalFavorites || 0) - 1, 0);
        updatedData.favoritedBy = favoritedBy.filter(id => id !== userId);
      }

      await vendorRef.update(updatedData);
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