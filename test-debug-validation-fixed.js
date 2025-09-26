/**
 * Debug the validation issue in the n8n workflow
 */

const https = require('https');

const WEBHOOK_URL = 'https://paigewedding.app.n8n.cloud/webhook/paige-rag/analyze-message';

// Test with minimal data to debug validation
const testCases = [
  {
    name: "Minimal valid data",
    data: {
      message_content: "Test message",
      user_id: "test123"
    }
  },
  {
    name: "With all required fields",
    data: {
      message_content: "We need to finalize the wedding venue contract by next Friday.",
      subject: "Wedding Venue Contract",
      vendor_category: "venue",
      vendor_name: "Test Venue",
      existing_todos: [],
      wedding_context: {},
      user_id: "test-user-123"
    }
  },
  {
    name: "With trimmed content",
    data: {
      message_content: "Test message".trim(),
      user_id: "test123".trim()
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

async function testCase(testCaseData) {
  console.log(`\n🧪 Testing: ${testCaseData.name}`);
  console.log('Data:', JSON.stringify(testCaseData.data, null, 2));
  
  try {
    const response = await makeRequest(WEBHOOK_URL, testCaseData.data);
    
    console.log(`Status: ${response.statusCode}`);
    
    if (response.statusCode === 200) {
      if (response.data.success) {
        console.log('✅ SUCCESS! Analysis completed!');
        console.log('Response:', JSON.stringify(response.data, null, 2));
        return true;
      } else {
        console.log('❌ Analysis failed:', response.data.error);
        console.log('Details:', response.data.details);
      }
    } else {
      console.log(`❌ HTTP Error: ${response.statusCode}`);
      console.log('Response:', JSON.stringify(response.data, null, 2));
    }
    
  } catch (error) {
    console.log(`❌ Request failed: ${error.message}`);
  }
  
  return false;
}

async function runDebugTests() {
  console.log('🔍 Debugging validation issue...');
  console.log('Webhook URL:', WEBHOOK_URL);
  
  for (const testCaseData of testCases) {
    const success = await testCase(testCaseData);
    if (success) {
      console.log(`\n🎉 Found working format: ${testCaseData.name}`);
      break;
    }
    
    // Add delay between requests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

runDebugTests();
