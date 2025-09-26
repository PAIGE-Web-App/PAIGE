/**
 * Debug the response format from the webhook
 */

const https = require('https');

const WEBHOOK_URL = 'https://paigewedding.app.n8n.cloud/webhook/paige-rag/analyze-message';

// Simple test data
const testData = {
  message_content: "We need to finalize the wedding venue contract by next Friday.",
  user_id: "test123"
};

function makeRequest(url, data) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);
    
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(url, options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsedData = JSON.parse(responseData);
          resolve({
            statusCode: res.statusCode,
            data: parsedData,
            rawResponse: responseData
          });
        } catch (error) {
          resolve({
            statusCode: res.statusCode,
            data: responseData,
            rawResponse: responseData
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

async function testResponseFormat() {
  console.log('🧪 Testing webhook response format...');
  console.log('Webhook URL:', WEBHOOK_URL);
  console.log('\nTest Data:');
  console.log(JSON.stringify(testData, null, 2));
  
  try {
    const response = await makeRequest(WEBHOOK_URL, testData);
    
    console.log(`\n📊 Response Status: ${response.statusCode}`);
    console.log('\n📋 Raw Response:');
    console.log(response.rawResponse);
    
    console.log('\n📋 Parsed Response:');
    console.log(JSON.stringify(response.data, null, 2));
    
    if (response.statusCode === 200) {
      if (response.data && response.data.success) {
        console.log('\n🎉 SUCCESS! Webhook is working!');
      } else if (response.data && response.data.error) {
        console.log('\n❌ Error in response:', response.data.error);
      } else {
        console.log('\n⚠️  Response received but format unclear');
      }
    } else {
      console.log(`\n❌ HTTP Error: ${response.statusCode}`);
    }
    
  } catch (error) {
    console.log(`\n❌ Request failed: ${error.message}`);
  }
}

testResponseFormat();
