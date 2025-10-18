import { NextRequest, NextResponse } from 'next/server';
import { sendWelcomeEmail } from '@/lib/emailService';

export async function POST(request: NextRequest) {
  try {
    const { email, scenario } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    let userData;
    let scenarioName;

    switch (scenario) {
      case 'complete':
        // Scenario 1: Complete setup (Date + Location + Venue + Partner)
        scenarioName = 'Complete Setup';
        userData = {
          weddingDate: new Date('2026-06-15'),
          weddingDateUndecided: false,
          weddingLocation: 'San Francisco, CA',
          weddingLocationUndecided: false,
          hasVenue: true,
          partnerName: 'Alex Johnson',
          guestCount: 150,
          maxBudget: 50000,
        };
        break;

      case 'partial':
        // Scenario 2: Partial setup (Date + Location, No Venue)
        scenarioName = 'Partial Setup (Date + Location)';
        userData = {
          weddingDate: new Date('2026-08-20'),
          weddingDateUndecided: false,
          weddingLocation: 'Austin, TX',
          weddingLocationUndecided: false,
          hasVenue: false,
          partnerName: 'Sam Williams',
          guestCount: 100,
          maxBudget: 35000,
        };
        break;

      case 'date-only':
        // Scenario 3: Date only (No Location, No Venue)
        scenarioName = 'Date Only';
        userData = {
          weddingDate: new Date('2025-12-25'),
          weddingDateUndecided: false,
          weddingLocation: null,
          weddingLocationUndecided: false,
          hasVenue: false,
          partnerName: 'Jordan Lee',
          guestCount: null,
          maxBudget: null,
        };
        break;

      case 'minimal':
        // Scenario 4: Minimal setup (No Date, No Location, No Venue)
        scenarioName = 'Minimal Setup';
        userData = {
          weddingDate: null,
          weddingDateUndecided: true,
          weddingLocation: null,
          weddingLocationUndecided: true,
          hasVenue: false,
          partnerName: 'Riley Martinez',
          guestCount: null,
          maxBudget: null,
        };
        break;

      case 'no-partner':
        // Scenario 5: Complete setup but no partner name
        scenarioName = 'Complete Setup (No Partner Name)';
        userData = {
          weddingDate: new Date('2026-09-12'),
          weddingDateUndecided: false,
          weddingLocation: 'Seattle, WA',
          weddingLocationUndecided: false,
          hasVenue: true,
          partnerName: null,
          guestCount: 80,
          maxBudget: 40000,
        };
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid scenario. Use: complete, partial, date-only, minimal, or no-partner' },
          { status: 400 }
        );
    }

    // Send the welcome email with the scenario data
    const success = await sendWelcomeEmail(
      email,
      'Test User',
      userData
    );

    if (success) {
      return NextResponse.json({
        success: true,
        message: `Welcome email sent successfully for scenario: ${scenarioName}`,
        scenario: scenarioName,
        userData: userData,
      });
    } else {
      return NextResponse.json(
        { error: 'Failed to send email' },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Error in test-welcome-scenarios:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

