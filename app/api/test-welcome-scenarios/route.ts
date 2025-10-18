import { NextRequest, NextResponse } from 'next/server';
import { sendWelcomeEmail } from '@/lib/emailService';
import { getAdminDb } from '@/lib/firebaseAdmin';

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

      case 'real-data':
        // Scenario 6: Real user data from database
        scenarioName = 'Real User Data';
        try {
          const db = getAdminDb();
          
          // Try to get the current user's email from the request
          const authHeader = request.headers.get('authorization');
          let currentUserEmail = null;
          
          if (authHeader && authHeader.startsWith('Bearer ')) {
            try {
              // This is a simplified approach - in production you'd verify the token
              // For now, we'll use the email from the request body
              const { email: requestEmail } = await request.json();
              currentUserEmail = requestEmail;
            } catch (e) {
              console.log('Could not extract user email from request');
            }
          }
          
          let userDoc;
          let userDataFromDb;
          
          if (currentUserEmail) {
            // Try to find user by email
            const usersByEmail = await db.collection('users').where('email', '==', currentUserEmail).limit(1).get();
            if (!usersByEmail.empty) {
              userDoc = usersByEmail.docs[0];
              userDataFromDb = userDoc.data();
              console.log('🔍 Found user by email:', currentUserEmail);
            }
          }
          
          if (!userDoc) {
            // Try to find dave.yoon92@gmail.com specifically
            const daveUserQuery = await db.collection('users').where('email', '==', 'dave.yoon92@gmail.com').limit(1).get();
            
            if (!daveUserQuery.empty) {
              userDoc = daveUserQuery.docs[0];
              userDataFromDb = userDoc.data();
            } else {
              // Fallback to first user, but show all users for debugging
              const usersRef = db.collection('users');
              const usersSnapshot = await usersRef.get();
              
              if (usersSnapshot.empty) {
                return NextResponse.json(
                  { error: 'No users found in database' },
                  { status: 404 }
                );
              }
              
              userDoc = usersSnapshot.docs[0];
              userDataFromDb = userDoc.data();
            }
          }
          
          // Map database fields to our expected format
          // Handle wedding date conversion
          let weddingDate = null;
          if (userDataFromDb.weddingDate) {
            if (userDataFromDb.weddingDate.toDate) {
              // Firestore Timestamp object
              weddingDate = userDataFromDb.weddingDate.toDate();
            } else if (userDataFromDb.weddingDate.seconds) {
              // Firestore Timestamp-like object with seconds property
              weddingDate = new Date(userDataFromDb.weddingDate.seconds * 1000);
            } else if (typeof userDataFromDb.weddingDate === 'string') {
              weddingDate = new Date(userDataFromDb.weddingDate);
            } else if (userDataFromDb.weddingDate instanceof Date) {
              weddingDate = userDataFromDb.weddingDate;
            }
          }
          
          // Check for venue - look for various venue-related fields
          const hasVenue = userDataFromDb.hasVenue === true || 
                          userDataFromDb.venueSelected === true ||
                          (userDataFromDb.venue && userDataFromDb.venue.name) ||
                          (userDataFromDb.mainVenue && userDataFromDb.mainVenue.name) ||
                          (userDataFromDb.selectedVenueMetadata && userDataFromDb.selectedVenueMetadata.name);
          
          userData = {
            weddingDate: weddingDate,
            weddingDateUndecided: userDataFromDb.weddingDateUndecided || false,
            weddingLocation: userDataFromDb.weddingLocation || userDataFromDb.location,
            // Override location undecided if we have a location
            weddingLocationUndecided: !userDataFromDb.weddingLocation && !userDataFromDb.location,
            hasVenue: hasVenue,
            partnerName: userDataFromDb.partnerName,
            guestCount: userDataFromDb.guestCount,
            maxBudget: userDataFromDb.maxBudget,
          };
        } catch (error) {
          console.error('Error fetching real user data:', error);
          return NextResponse.json(
            { error: 'Failed to fetch user data from database' },
            { status: 500 }
          );
        }
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid scenario. Use: complete, partial, date-only, minimal, no-partner, or real-data' },
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

