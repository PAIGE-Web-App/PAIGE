/**
 * Test with minimal data to see if we can get any response
 */

const https = require('https');

const WEBHOOK_URL = 'https://paigewedding.app.n8n.cloud/webhook/paige-rag/analyze-message';

// Minimal test data
const testData = {
  message_content: "Test message",
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
        resolve({
          statusCode: res.statusCode,
          data: responseData,
          headers: res.headers
        });
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

async function testMinimal() {
  console.log('🧪 Testing with minimal data...');
  console.log('Data:', JSON.stringify(testData, null, 2));
  
  try {
    const response = await makeRequest(WEBHOOK_URL, testData);
    
    console.log(`\n📊 Status: ${response.statusCode}`);
    console.log('Headers:', JSON.stringify(response.headers, null, 2));
    console.log('Response length:', response.data.length);
    console.log('Response:', response.data);
    
    if (response.statusCode === 200) {
      if (response.data.length > 0) {
        console.log('\n✅ Got a response!');
      } else {
        console.log('\n⚠️  Empty response - workflow might be failing');
      }
    } else {
      console.log(`\n❌ HTTP Error: ${response.statusCode}`);
    }
    
  } catch (error) {
    console.log(`\n❌ Request failed: ${error.message}`);
  }
}

testMinimal();
