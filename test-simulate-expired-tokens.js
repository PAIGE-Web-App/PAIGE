// Script to simulate expired Gmail tokens for testing
const { getAdminDb } = require('./lib/firebaseAdmin');

const simulateExpiredTokens = async () => {
  try {
    const adminDb = getAdminDb();
    if (!adminDb) {
      console.error('Admin DB not available');
      return;
    }

    // Replace with an actual user ID from your database
    const testUserId = 'YOUR_TEST_USER_ID'; // You'll need to replace this
    
    console.log('Simulating expired Gmail tokens for user:', testUserId);
    
    // Set tokens with an expired timestamp (1 hour ago)
    const expiredTime = Date.now() - (60 * 60 * 1000); // 1 hour ago
    
    await adminDb.collection('users').doc(testUserId).set({
      googleTokens: {
        accessToken: 'expired_access_token',
        refreshToken: 'expired_refresh_token',
        expiresAt: expiredTime,
        email: 'test@example.com'
      }
    }, { merge: true });
    
    console.log('✅ Successfully set expired tokens for testing');
    console.log('Now you can test the re-authentication flow on the login page');
    
  } catch (error) {
    console.error('Error simulating expired tokens:', error);
  }
};

// Uncomment the line below and replace YOUR_TEST_USER_ID with an actual user ID
// simulateExpiredTokens(); 