/**
 * Debug the exact response from the webhook
 */

const https = require('https');

const WEBHOOK_URL = 'https://paigewedding.app.n8n.cloud/webhook/paige-rag/analyze-message';

// Test with different data to see what triggers the validation
const testCases = [
  {
    name: "Empty data",
    data: {}
  },
  {
    name: "Only message_content",
    data: {
      message_content: "Test message"
    }
  },
  {
    name: "Only user_id",
    data: {
      user_id: "test123"
    }
  },
  {
    name: "Both fields",
    data: {
      message_content: "Test message",
      user_id: "test123"
    }
  },
  {
    name: "Full data",
    data: {
      message_content: "We need to finalize the wedding venue contract by next Friday.",
      subject: "Wedding Venue Contract",
      vendor_category: "venue",
      vendor_name: "Test Venue",
      existing_todos: [],
      wedding_context: {},
      user_id: "test-user-123",
      message_id: "msg-001"
    }
  }
];

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

async function testCase(testCase) {
  console.log(`\n🧪 Testing: ${testCase.name}`);
  console.log('Data:', JSON.stringify(testCase.data, null, 2));
  
  try {
    const response = await makeRequest(WEBHOOK_URL, testCase.data);
    
    console.log(`Status: ${response.statusCode}`);
    console.log('Response:', JSON.stringify(response.data, null, 2));
    
    if (response.statusCode === 200 && response.data.success) {
      console.log('🎉 SUCCESS!');
      return true;
    } else if (response.statusCode === 200 && !response.data.success) {
      console.log('❌ Analysis failed:', response.data.error);
    } else {
      console.log(`❌ HTTP Error: ${response.statusCode}`);
    }
    
  } catch (error) {
    console.log(`❌ Request failed: ${error.message}`);
  }
  
  return false;
}

async function runDebugTests() {
  console.log('🔍 Debugging webhook responses...');
  console.log('Webhook URL:', WEBHOOK_URL);
  
  for (const testCaseData of testCases) {
    const success = await testCase(testCaseData);
    if (success) {
      console.log(`\n🎯 Found working configuration: ${testCaseData.name}`);
      break;
    }
    
    // Add delay between requests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

runDebugTests();
