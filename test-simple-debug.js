/**
 * Simple debug test to check webhook response
 */

const https = require('https');

const WEBHOOK_URL = 'https://paigewedding.app.n8n.cloud/webhook/paige-rag/analyze-message';

// Very simple test data
const testData = {
  message_content: "Hello world",
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

async function testSimple() {
  console.log('🧪 Testing with minimal data...');
  console.log('Data:', JSON.stringify(testData, null, 2));
  
  try {
    const response = await makeRequest(WEBHOOK_URL, testData);
    
    console.log(`\n📊 Status: ${response.statusCode}`);
    console.log('Response:', JSON.stringify(response.data, null, 2));
    
    if (response.statusCode === 200 && response.data.success) {
      console.log('🎉 SUCCESS! The webhook is working!');
    } else if (response.statusCode === 200 && !response.data.success) {
      console.log('❌ Validation still failing. Check the n8n workflow configuration.');
    } else {
      console.log('❌ HTTP error or other issue.');
    }
    
  } catch (error) {
    console.log(`❌ Request failed: ${error.message}`);
  }
}

testSimple();
