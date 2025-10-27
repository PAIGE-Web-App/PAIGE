import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { sendEmailWithValidation } from '@/utils/emailValidation';

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
      name: name || null,
      joinedAt: new Date(),
      status: 'pending',
      source: 'landing-page'
    });

    // Send confirmation email via SendGrid
    try {
      const subject = 'You\'re on the Paige AI waitlist! 🎉';
      const body = `
        Hi${name ? ` ${name}` : ''},

        Thank you for joining the Paige AI waitlist! We're excited to bring you the most intelligent wedding planning assistant ever created.

        **What happens next?**
        You'll be among the first to know when Paige AI launches. We'll send you exclusive early access as soon as it's ready.

        In the meantime, if you have questions or ideas, just reply to this email — we read every message!

        Happy planning,
        The Paige Team

        ---
        P.S. Know someone planning a wedding? Share the love by forwarding this email!
      `;

      await sendEmailWithValidation(
        email,
        subject,
        body
      );
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

