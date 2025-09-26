/**
 * Test different field name variations to see what the webhook expects
 */

const https = require('https');

const WEBHOOK_URL = 'https://paigewedding.app.n8n.cloud/webhook/paige-rag/analyze-message';

// Test different field name variations
const testVariations = [
  {
    name: "Standard fields",
    data: {
      message_content: "Test message",
      user_id: "test123"
    }
  },
  {
    name: "With userId (camelCase)",
    data: {
      message_content: "Test message",
      userId: "test123"
    }
  },
  {
    name: "With user_id and messageContent",
    data: {
      messageContent: "Test message",
      user_id: "test123"
    }
  },
  {
    name: "With all possible variations",
    data: {
      message_content: "Test message",
      messageContent: "Test message",
      user_id: "test123",
      userId: "test123"
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

async function testVariation(variation) {
  console.log(`\n🧪 Testing: ${variation.name}`);
  console.log('Data:', JSON.stringify(variation.data, null, 2));
  
  try {
    const response = await makeRequest(WEBHOOK_URL, variation.data);
    
    console.log(`Status: ${response.statusCode}`);
    
    if (response.statusCode === 200) {
      if (response.data.success) {
        console.log('🎉 SUCCESS! Found working field combination!');
        console.log('Response:', JSON.stringify(response.data, null, 2));
        return true;
      } else {
        console.log('❌ Still failing:', response.data.error);
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

async function testAllVariations() {
  console.log('🔍 Testing different field name variations...');
  
  for (const variation of testVariations) {
    const success = await testVariation(variation);
    if (success) {
      console.log(`\n🎯 Working combination found: ${variation.name}`);
      break;
    }
    
    // Add delay between requests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

testAllVariations();
