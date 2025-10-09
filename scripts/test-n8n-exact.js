// Load environment variables
require('dotenv').config({ path: '.env.local' });

async function testN8nExact() {
  const webhookUrl = process.env.N8N_WEBHOOK_URL || 'https://paigewedding.app.n8n.cloud/webhook/onboarding-rag';
  
  console.log('Testing n8n webhook with exact data format...');
  console.log('URL:', webhookUrl);
  
  // Use the exact same data format that worked in your manual test
  const testData = {
    userId: "test-user-123",
    weddingContext: {
      couple: "John & Jane",
      weddingDate: "2024-06-15",
      location: "San Francisco, CA",
      venue: "Garden Manor",
      budget: 25000,
      guestCount: 100,
      style: "Rustic, Elegant",
      additionalContext: "We love outdoor ceremonies and local vendors"
    },
    requestType: "generate_preliminary"
  };
  
  console.log('Sending data:', JSON.stringify(testData, null, 2));
  
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData),
    });
    
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    const responseText = await response.text();
    console.log('Response length:', responseText.length);
    console.log('Response content:', responseText);
    
    if (responseText && responseText.trim() !== '') {
      try {
        const jsonResponse = JSON.parse(responseText);
        console.log('✅ Valid JSON response:', JSON.stringify(jsonResponse, null, 2));
      } catch (parseError) {
        console.log('❌ Invalid JSON response:', parseError.message);
      }
    } else {
      console.log('❌ Empty response from webhook');
    }
    
  } catch (error) {
    console.error('❌ Request failed:', error.message);
  }
}

testN8nExact();
