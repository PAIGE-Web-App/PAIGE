// Test script to check Gmail Watch API setup
// Run this in your browser console on your production site

async function testGmailWatch() {
  const userId = 'YOUR_USER_ID_HERE'; // Replace with your actual user ID
  
  try {
    console.log('🔍 Testing Gmail Watch API setup...');
    
    const response = await fetch('/api/gmail/setup-watch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
    
    const data = await response.json();
    console.log('📊 Response:', data);
    
    if (data.success) {
      console.log('✅ Gmail Watch setup successful!');
      console.log('📝 Watch data:', data.watchData);
    } else {
      console.log('❌ Gmail Watch setup failed:', data.message);
    }
  } catch (error) {
    console.error('🚨 Error:', error);
  }
}

// Call the function
testGmailWatch();
