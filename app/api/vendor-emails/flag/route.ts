import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';

export async function POST(req: NextRequest) {
  try {
    const { placeId, email, reason, userId } = await req.json();

    if (!placeId || !email || !reason || !userId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Create a flag record
    const flagData = {
      placeId,
      email,
      reason: reason.trim(),
      flaggedBy: userId,
      flaggedAt: new Date().toISOString(),
      status: 'pending', // pending, reviewed, resolved
      reviewedBy: null,
      reviewedAt: null,
      resolution: null
    };

    // Store the flag in a separate collection for review
    const flagRef = adminDb.collection('vendorEmailFlags').doc();
    await flagRef.set(flagData);

    // Also update the vendor email document to track flag count
    const vendorEmailRef = adminDb.collection('vendorEmails').doc(placeId);
    const vendorEmailDoc = await vendorEmailRef.get();

    if (vendorEmailDoc.exists) {
      const existingData = vendorEmailDoc.data() || {};
      const existingEmails = existingData.emails || [];
      
      // Find and update the specific email to add flag count
      const updatedEmails = existingEmails.map((emailData: any) => {
        if (emailData.email === email) {
          return {
            ...emailData,
            flagCount: (emailData.flagCount || 0) + 1,
            lastFlaggedAt: new Date().toISOString()
          };
        }
        return emailData;
      });

      await vendorEmailRef.update({
        emails: updatedEmails,
        lastUpdated: new Date().toISOString()
      });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Email flagged for review successfully',
      flagId: flagRef.id
    });

  } catch (error) {
    console.error('Error flagging vendor email:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET - Retrieve flags for admin review
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || 'pending';
    const limit = parseInt(searchParams.get('limit') || '50');

    let query: any = adminDb.collection('vendorEmailFlags');
    
    if (status !== 'all') {
      query = query.where('status', '==', status);
    }
    
    query = query.orderBy('flaggedAt', 'desc').limit(limit);
    
    const flagsSnapshot = await query.get();
    const flags = flagsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return NextResponse.json({ 
      flags,
      total: flags.length
    });

  } catch (error) {
    console.error('Error fetching vendor email flags:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 