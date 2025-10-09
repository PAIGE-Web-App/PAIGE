// Load environment variables
require('dotenv').config({ path: '.env.local' });

async function testN8nTestWebhook() {
  const webhookUrl = 'https://paigewedding.app.n8n.cloud/webhook-test/onboarding-rag';
  
  console.log('🧪 Testing n8n TEST webhook...');
  console.log('URL:', webhookUrl);
  
  // Use the EXACT format that matches the manual test
  const testData = [{
    "userId": "test-user-123",
    "weddingContext": {
      "couple": "John & Jane",
      "weddingDate": "2024-06-15",
      "location": "San Francisco, CA",
      "venue": "Garden Manor",
      "budget": 25000,
      "guestCount": 100,
      "style": "Rustic, Elegant",
      "additionalContext": "We love outdoor ceremonies and local vendors"
    },
    "requestType": "generate_preliminary"
  }];
  
  console.log('📤 Sending data to TEST webhook...');
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
      console.log('🎉 SUCCESS! Got response!');
      console.log('📄 Response content:', responseText);
      
      try {
        const jsonResponse = JSON.parse(responseText);
        console.log('✅ Valid JSON:', JSON.stringify(jsonResponse, null, 2));
        console.log('🎯 RAG WORKFLOW IS WORKING!');
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

testN8nTestWebhook();
