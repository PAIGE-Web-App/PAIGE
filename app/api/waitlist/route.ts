import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { sendWaitlistConfirmationEmail } from '@/lib/emailService';

export async function POST(request: NextRequest) {
  try {
    const { email, name } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existingDoc = await adminDb
      .collection('waitlist')
      .where('email', '==', email.toLowerCase())
      .limit(1)
      .get();

    if (!existingDoc.empty) {
      return NextResponse.json(
        { error: 'Email already on waitlist', alreadyJoined: true },
        { status: 409 }
      );
    }

    // Add to waitlist
    await adminDb.collection('waitlist').add({
      email: email.toLowerCase(),
      joinedAt: new Date(),
      status: 'pending',
      source: 'landing-page'
    });

    // Send confirmation email via SendGrid
    try {
      await sendWaitlistConfirmationEmail(email);
    } catch (emailError) {
      // Log but don't fail the waitlist signup if email fails
      console.error('Failed to send waitlist confirmation email:', emailError);
    }

    return NextResponse.json({
      success: true,
      message: 'You\'ve been added to the waitlist!'
    });

  } catch (error) {
    console.error('Error adding to waitlist:', error);
    return NextResponse.json(
      { error: 'Failed to add to waitlist' },
      { status: 500 }
    );
  }
}

