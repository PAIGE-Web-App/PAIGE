// Test script for Gmail authentication check API
const testGmailAuthCheck = async () => {
  try {
    // Test with a non-existent user ID
    const response = await fetch('http://localhost:3000/api/check-gmail-auth-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: 'test-user-id' }),
    });
    
    const data = await response.json();
    console.log('Test response:', {
      status: response.status,
      data: data
    });
    
    if (response.status === 404) {
      console.log('✅ API correctly identified non-existent user');
    } else {
      console.log('❌ Unexpected response for non-existent user');
    }
  } catch (error) {
    console.error('Test failed:', error);
  }
};

// Run the test
testGmailAuthCheck(); 