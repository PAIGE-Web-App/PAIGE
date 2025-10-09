// Load environment variables
require('dotenv').config({ path: '.env.local' });

async function testN8nWebhook() {
  const webhookUrl = 'https://paigewedding.app.n8n.cloud/webhook/onboarding-rag';
  
  const testData = {
    userId: 'test-user-123',
    weddingContext: {
      couple: 'John & Jane',
      weddingDate: '2024-06-15',
      location: 'San Francisco, CA',
      venue: 'Garden Manor',
      budget: 25000,
      guestCount: 100,
      style: 'Rustic, Elegant',
      additionalContext: 'We love outdoor ceremonies and local vendors'
    },
    requestType: 'generate_preliminary'
  };

  console.log('Testing n8n webhook...');
  console.log('URL:', webhookUrl);
  console.log('Data:', JSON.stringify(testData, null, 2));

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

    if (response.ok) {
      const result = await response.json();
      console.log('Success! Response:', JSON.stringify(result, null, 2));
    } else {
      const errorText = await response.text();
      console.log('Error response:', errorText);
    }
  } catch (error) {
    console.error('Request failed:', error.message);
  }
}

testN8nWebhook();
