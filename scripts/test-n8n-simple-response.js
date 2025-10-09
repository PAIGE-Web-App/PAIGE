// Load environment variables
require('dotenv').config({ path: '.env.local' });

async function testN8nSimpleResponse() {
  const webhookUrl = process.env.N8N_WEBHOOK_URL || 'https://paigewedding.app.n8n.cloud/webhook/onboarding-rag';
  
  console.log('🧪 Testing n8n webhook with minimal data...');
  console.log('URL:', webhookUrl);
  
  // Test with minimal data to see if we get any response
  const testData = {
    userId: "minimal-test",
    weddingContext: {
      couple: "Minimal & Test",
      weddingDate: "2024-06-15",
      location: "Test City",
      venue: "Test Venue",
      budget: 10000,
      guestCount: 25,
      style: "Simple",
      additionalContext: "Minimal test"
    },
    requestType: "generate_preliminary"
  };
  
  console.log('📤 Sending minimal data...');
  
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData),
    });
    
    console.log('📊 Response status:', response.status);
    console.log('📋 Response headers:', Object.fromEntries(response.headers.entries()));
    
    const responseText = await response.text();
    console.log('📏 Response length:', responseText.length);
    
    if (responseText && responseText.trim() !== '') {
      console.log('✅ Got response!');
      console.log('📄 Response content:', responseText);
      
      try {
        const jsonResponse = JSON.parse(responseText);
        console.log('✅ Valid JSON:', JSON.stringify(jsonResponse, null, 2));
      } catch (parseError) {
        console.log('❌ Invalid JSON:', parseError.message);
      }
    } else {
      console.log('❌ Still empty response');
      console.log('This confirms the "Respond to Webhook" node is not configured correctly');
    }
    
  } catch (error) {
    console.error('❌ Request failed:', error.message);
  }
}

testN8nSimpleResponse();
