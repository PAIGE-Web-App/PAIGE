import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';

export async function POST(req: NextRequest) {
  try {
    const { flagId, action, resolution, reviewedBy } = await req.json();

    if (!flagId || !action || !reviewedBy) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get the flag document
    const flagRef = adminDb.collection('vendorEmailFlags').doc(flagId);
    const flagDoc = await flagRef.get();

    if (!flagDoc.exists) {
      return NextResponse.json({ error: 'Flag not found' }, { status: 404 });
    }

    const flagData = flagDoc.data();
    if (!flagData) {
      return NextResponse.json({ error: 'Flag data not found' }, { status: 404 });
    }

    // Update the flag status
    const updateData: any = {
      status: action === 'approve' ? 'resolved' : action === 'reject' ? 'reviewed' : 'resolved',
      reviewedBy,
      reviewedAt: new Date().toISOString(),
      resolution: resolution || null
    };

    await flagRef.update(updateData);

    // If action is 'approve' or 'remove', remove the email from vendor emails
    if (action === 'approve' || action === 'remove') {
      const vendorEmailRef = adminDb.collection('vendorEmails').doc(flagData.placeId);
      const vendorEmailDoc = await vendorEmailRef.get();

      if (vendorEmailDoc.exists) {
        const existingData = vendorEmailDoc.data();
        if (existingData && existingData.emails) {
          const filteredEmails = existingData.emails.filter((emailData: any) => 
            emailData.email !== flagData.email
          );

          if (filteredEmails.length === 0) {
            // If no emails left, delete the entire document
            await vendorEmailRef.delete();
          } else {
            // Update with remaining emails
            await vendorEmailRef.update({
              emails: filteredEmails,
              lastUpdated: new Date().toISOString()
            });
          }
        }
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `Flag ${action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'resolved'} successfully`,
      action,
      emailRemoved: action === 'approve' || action === 'remove'
    });

  } catch (error) {
    console.error('Error reviewing vendor email flag:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 