// app/api/vendors/batch/route.ts
// Batch endpoint for vendor data to optimize database queries

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';

export async function POST(request: NextRequest) {
  try {
    const { vendorIds } = await request.json();

    if (!vendorIds || !Array.isArray(vendorIds) || vendorIds.length === 0) {
      return NextResponse.json(
        { error: 'vendorIds array is required' },
        { status: 400 }
      );
    }

    if (vendorIds.length > 10) {
      return NextResponse.json(
        { error: 'Maximum 10 vendor IDs allowed per batch request' },
        { status: 400 }
      );
    }

    // Validate vendor IDs
    const validVendorIds = vendorIds.filter(id => 
      typeof id === 'string' && id.trim().length > 0
    );

    if (validVendorIds.length === 0) {
      return NextResponse.json(
        { error: 'No valid vendor IDs provided' },
        { status: 400 }
      );
    }

    // Batch query Firestore for all vendors
    const vendorsRef = collection(db, 'vendors');
    const q = query(vendorsRef, where('place_id', 'in', validVendorIds));
    
    const querySnapshot = await getDocs(q);
    
    // Create a map of results
    const results = new Map();
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      results.set(data.place_id, {
        id: doc.id,
        ...data
      });
    });

    // Ensure all requested IDs have a result (even if null)
    const processedResults = validVendorIds.map(vendorId => {
      const result = results.get(vendorId);
      return {
        vendorId,
        success: !!result,
        data: result || null
      };
    });

    // Add cache headers for better performance
    const response = NextResponse.json(processedResults);
    response.headers.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
    
    return response;

  } catch (error) {
    console.error('Vendor batch API error:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 