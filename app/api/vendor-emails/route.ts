import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import type { GlobalVendorEmail, VendorEmail } from '@/types/contact';

// GET - Retrieve vendor emails for a specific place
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const placeId = searchParams.get('placeId');

    if (!placeId) {
      return NextResponse.json({ error: 'Place ID is required' }, { status: 400 });
    }

    const vendorEmailDoc = await adminDb.collection('vendorEmails').doc(placeId).get();
    
    if (!vendorEmailDoc.exists) {
      return NextResponse.json({ emails: [], placeId });
    }

    const data = vendorEmailDoc.data() as GlobalVendorEmail;
    return NextResponse.json({ emails: data.emails || [], placeId, vendorData: data });

  } catch (error) {
    console.error('Error fetching vendor emails:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Add or update vendor email
export async function POST(req: NextRequest) {
  try {
    const { placeId, vendorName, vendorAddress, vendorCategory, email, contactName, role, userId } = await req.json();

    if (!placeId || !vendorName || !email || !userId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const vendorEmailRef = adminDb.collection('vendorEmails').doc(placeId);
    const vendorEmailDoc = await vendorEmailRef.get();

    const newVendorEmail: VendorEmail = {
      email,
      verifiedBy: userId,
      verifiedAt: new Date().toISOString(),
      verificationMethod: 'manual',
      isPrimary: false, // Will be set to true if this is the first email
      contactName: contactName || null,
      role: role || null
    };

    if (!vendorEmailDoc.exists) {
      // Create new vendor email record
      newVendorEmail.isPrimary = true;
      
      const globalVendorEmail: GlobalVendorEmail = {
        placeId,
        vendorName,
        vendorAddress: vendorAddress || '',
        vendorCategory: vendorCategory || 'Vendor',
        emails: [newVendorEmail],
        totalVerifications: 1,
        lastUpdated: new Date().toISOString(),
        createdBy: userId
      };

      await vendorEmailRef.set(globalVendorEmail);
    } else {
      // Update existing vendor email record
      const existingData = vendorEmailDoc.data() as GlobalVendorEmail;
      const existingEmails = existingData.emails || [];
      
      // Check if email already exists
      const emailExists = existingEmails.some(e => e.email === email);
      
      if (!emailExists) {
        // If this is the first email, make it primary
        if (existingEmails.length === 0) {
          newVendorEmail.isPrimary = true;
        }
        
        existingEmails.push(newVendorEmail);
        
        await vendorEmailRef.update({
          emails: existingEmails,
          totalVerifications: existingData.totalVerifications + 1,
          lastUpdated: new Date().toISOString(),
          vendorName: vendorName || existingData.vendorName,
          vendorAddress: vendorAddress || existingData.vendorAddress,
          vendorCategory: vendorCategory || existingData.vendorCategory
        });
      } else {
        // Email already exists, just update verification count
        await vendorEmailRef.update({
          totalVerifications: existingData.totalVerifications + 1,
          lastUpdated: new Date().toISOString()
        });
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Vendor email added successfully',
      email: newVendorEmail
    });

  } catch (error) {
    console.error('Error adding vendor email:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT - Update vendor email (e.g., mark as primary, update contact info)
export async function PUT(req: NextRequest) {
  try {
    const { placeId, email, updates, userId } = await req.json();

    if (!placeId || !email || !userId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const vendorEmailRef = adminDb.collection('vendorEmails').doc(placeId);
    const vendorEmailDoc = await vendorEmailRef.get();

    if (!vendorEmailDoc.exists) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });
    }

    const existingData = vendorEmailDoc.data() as GlobalVendorEmail;
    const existingEmails = existingData.emails || [];
    
    const emailIndex = existingEmails.findIndex(e => e.email === email);
    if (emailIndex === -1) {
      return NextResponse.json({ error: 'Email not found for this vendor' }, { status: 404 });
    }

    // Update the specific email
    existingEmails[emailIndex] = {
      ...existingEmails[emailIndex],
      ...updates,
      verifiedBy: userId,
      verifiedAt: new Date().toISOString()
    };

    // If marking as primary, unmark others
    if (updates.isPrimary) {
      existingEmails.forEach((e, index) => {
        if (index !== emailIndex) {
          e.isPrimary = false;
        }
      });
    }

    await vendorEmailRef.update({
      emails: existingEmails,
      lastUpdated: new Date().toISOString()
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Vendor email updated successfully',
      email: existingEmails[emailIndex]
    });

  } catch (error) {
    console.error('Error updating vendor email:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Remove vendor email
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const placeId = searchParams.get('placeId');
    const email = searchParams.get('email');
    const userId = searchParams.get('userId');

    if (!placeId || !email || !userId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const vendorEmailRef = adminDb.collection('vendorEmails').doc(placeId);
    const vendorEmailDoc = await vendorEmailRef.get();

    if (!vendorEmailDoc.exists) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });
    }

    const existingData = vendorEmailDoc.data() as GlobalVendorEmail;
    const existingEmails = existingData.emails || [];
    
    const filteredEmails = existingEmails.filter(e => e.email !== email);
    
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

    return NextResponse.json({ 
      success: true, 
      message: 'Vendor email removed successfully'
    });

  } catch (error) {
    console.error('Error removing vendor email:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 