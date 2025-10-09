// Load environment variables
require('dotenv').config({ path: '.env.local' });

async function testN8nCorrectedFormat() {
  const webhookUrl = 'https://paigewedding.app.n8n.cloud/webhook/onboarding-rag';
  
  console.log('🎯 Testing n8n webhook with CORRECTED data format...');
  console.log('URL:', webhookUrl);
  
  // Use the EXACT format that matches the manual test
  const testData = [{
    "userId": "test-user-123",
    "weddingContext": {
      "couple": "John & Jane",
      "weddingDate": "2024-06-15", // Correct date format
      "location": "San Francisco, CA", // Correct location format
      "venue": "Garden Manor", // Correct venue format
      "budget": 25000,
      "guestCount": 100,
      "style": "Rustic, Elegant",
      "additionalContext": "We love outdoor ceremonies and local vendors"
    },
    "requestType": "generate_preliminary"
  }];
  
  console.log('📤 Sending CORRECTED format data...');
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
      console.log('The data format might not be the issue');
    }
    
  } catch (error) {
    console.error('❌ Request failed:', error.message);
  }
}

testN8nCorrectedFormat();
