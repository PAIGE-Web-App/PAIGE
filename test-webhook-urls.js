/**
 * Test different webhook URL formats
 */

const https = require('https');

// Different possible URL formats
const possibleUrls = [
  'https://paigewedding.app.n8n.cloud/webhook-test/paige-rag/analyze-message',
  'https://paigewedding.app.n8n.cloud/webhook/paige-rag-analyze-message',
  'https://paigewedding.app.n8n.cloud/webhook/paige-rag/analyze-message',
  'https://paigewedding.app.n8n.cloud/webhook-test/paige-rag-analyze-message'
];

const testData = {
  message_content: "Test message for webhook",
  subject: "Test Subject",
  vendor_category: "venue",
  vendor_name: "Test Vendor",
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
            data: parsedData
          });
        } catch (error) {
          resolve({
            statusCode: res.statusCode,
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

async function testUrl(url) {
  try {
    console.log(`\n🧪 Testing URL: ${url}`);
    const response = await makeRequest(url, testData);
    
    if (response.statusCode === 200) {
      console.log(`✅ SUCCESS! Status: ${response.statusCode}`);
      console.log('Response:', JSON.stringify(response.data, null, 2));
      return true;
    } else if (response.statusCode === 404) {
      console.log(`❌ 404 - Webhook not found`);
    } else {
      console.log(`⚠️  Status: ${response.statusCode}`);
      console.log('Response:', JSON.stringify(response.data, null, 2));
    }
    
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
  }
  
  return false;
}

async function testAllUrls() {
  console.log('🔍 Testing different webhook URL formats...');
  
  for (const url of possibleUrls) {
    const success = await testUrl(url);
    if (success) {
      console.log(`\n🎉 Found working URL: ${url}`);
      break;
    }
    
    // Add delay between requests
    await new Promise(resolve => setTimeout(resolve, 500));
  }
}

testAllUrls();
