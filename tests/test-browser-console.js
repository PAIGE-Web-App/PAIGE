// Browser Console Test Script
// Copy and paste this into your browser console on the login page

const testGmailAuthCheck = async () => {
  console.log('🧪 Testing Gmail Auth Check...');
  
  // Get the stored user ID
  const userId = localStorage.getItem('lastGoogleUserId');
  console.log('Stored user ID:', userId);
  
  if (!userId) {
    console.log('❌ No user ID found in localStorage');
    console.log('💡 Try logging in with Google first, then log out and test again');
    return;
  }
  
  try {
    const response = await fetch('/api/check-gmail-auth-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
    
    const data = await response.json();
    console.log('📊 API Response:', {
      status: response.status,
      needsReauth: data.needsReauth,
      message: data.message
    });
    
    if (data.needsReauth) {
      console.log('⚠️ Gmail re-authentication is needed!');
      console.log('💡 You should see the re-authentication banner on the login page');
    } else {
      console.log('✅ Gmail authentication is valid');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
};

// Run the test
testGmailAuthCheck(); 