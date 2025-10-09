// Load environment variables
require('dotenv').config({ path: '.env.local' });

async function testN8nArrayFormat() {
  const webhookUrl = process.env.N8N_WEBHOOK_URL || 'https://paigewedding.app.n8n.cloud/webhook/onboarding-rag';
  
  console.log('🧪 Testing n8n webhook with array format...');
  console.log('URL:', webhookUrl);
  
  // Test with array format (what n8n expects)
  const testData = [{
    userId: "array-test-123",
    weddingContext: {
      couple: "Array & Test",
      weddingDate: "2024-06-15",
      location: "Array City",
      venue: "Array Venue",
      budget: 25000,
      guestCount: 50,
      style: "Array Style",
      additionalContext: "Array test data"
    },
    requestType: "generate_preliminary"
  }];
  
  console.log('📤 Sending array format data...');
  console.log('Data:', JSON.stringify(testData, null, 2));
  
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
    }
    
  } catch (error) {
    console.error('❌ Request failed:', error.message);
  }
}

testN8nArrayFormat();
