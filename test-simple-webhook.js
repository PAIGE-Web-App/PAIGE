/**
 * Simple test for the PAIGE Message Analysis N8N Webhook
 * 
 * This is a minimal test to debug the validation issue
 */

const https = require('https');

const WEBHOOK_URL = 'https://paigewedding.app.n8n.cloud/webhook-test/paige-rag/analyze-message';

// Minimal test data
const testData = {
  message_content: "We need to finalize the wedding venue contract by next Friday.",
  subject: "Wedding Venue Contract",
  vendor_category: "venue",
  vendor_name: "Test Venue",
  existing_todos: [],
  wedding_context: {},
  user_id: "test-user-123"
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
            headers: res.headers,
            data: parsedData
          });
        } catch (error) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: responseData
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

async function testSimple() {
  console.log('🧪 Testing with minimal data...');
  console.log('Data:', JSON.stringify(testData, null, 2));
  
  try {
    const response = await makeRequest(WEBHOOK_URL, testData);
    
    console.log(`\n✅ Status: ${response.statusCode}`);
    console.log('Response:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.log(`❌ Request failed: ${error.message}`);
  }
}

testSimple();
