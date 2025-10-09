// Load environment variables
require('dotenv').config({ path: '.env.local' });

async function testN8nDebug() {
  const webhookUrl = process.env.N8N_WEBHOOK_URL || 'https://paigewedding.app.n8n.cloud/webhook/onboarding-rag';
  
  console.log('🔍 Debugging n8n webhook...');
  console.log('URL:', webhookUrl);
  
  const testData = {
    userId: "debug-test-123",
    weddingContext: {
      couple: "Debug & Test",
      weddingDate: "2024-06-15",
      location: "Debug City",
      venue: "Debug Venue",
      budget: 25000,
      guestCount: 50,
      style: "Debug Style",
      additionalContext: "Debug test data"
    },
    requestType: "generate_preliminary"
  };
  
  console.log('📤 Sending data:', JSON.stringify(testData, null, 2));
  
  try {
    const startTime = Date.now();
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData),
    });
    const endTime = Date.now();
    
    console.log('⏱️  Response time:', endTime - startTime, 'ms');
    console.log('📊 Response status:', response.status);
    console.log('📋 Response headers:', Object.fromEntries(response.headers.entries()));
    
    const responseText = await response.text();
    console.log('📏 Response length:', responseText.length);
    console.log('📄 Response content:', responseText);
    
    if (responseText && responseText.trim() !== '') {
      try {
        const jsonResponse = JSON.parse(responseText);
        console.log('✅ Valid JSON response:', JSON.stringify(jsonResponse, null, 2));
      } catch (parseError) {
        console.log('❌ Invalid JSON response:', parseError.message);
        console.log('Raw content:', responseText);
      }
    } else {
      console.log('❌ Empty response from webhook');
      console.log('This suggests the workflow is not properly connected or active');
    }
    
  } catch (error) {
    console.error('❌ Request failed:', error.message);
  }
}

testN8nDebug();
