/**
 * Step-by-step test for document processing workflow
 */

const https = require('https');

const WEBHOOK_URL = 'https://paigewedding.app.n8n.cloud/webhook/paige-rag/process-document';

// Very simple test data
const testData = {
  document_id: "simple-test-001",
  document_content: "This is a simple test document for wedding planning.",
  source: "test.md",
  user_id: "test-user-123",
  document_type: "test"
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

async function testStepByStep() {
  console.log('🧪 Testing Document Processing Step by Step...');
  console.log('Webhook URL:', WEBHOOK_URL);
  console.log('\nTest Data:');
  console.log(JSON.stringify(testData, null, 2));
  
  try {
    const response = await makeRequest(WEBHOOK_URL, testData);
    
    console.log(`\n📊 Response Status: ${response.statusCode}`);
    console.log('Response Headers:', JSON.stringify(response.headers, null, 2));
    console.log('Response Length:', response.data.length);
    console.log('Raw Response:', response.data);
    
    if (response.statusCode === 200) {
      if (response.data.length > 0) {
        console.log('\n✅ Got a response!');
        try {
          const parsed = JSON.parse(response.data);
          console.log('Parsed Response:', JSON.stringify(parsed, null, 2));
        } catch (e) {
          console.log('Response is not JSON:', response.data);
        }
      } else {
        console.log('\n⚠️  Empty response - workflow might be failing at some step');
        console.log('This could be due to:');
        console.log('- If condition failing');
        console.log('- JavaScript node error');
        console.log('- API call failure (OpenAI or Pinecone)');
        console.log('- Response formatting issue');
      }
    } else {
      console.log(`\n❌ HTTP Error: ${response.statusCode}`);
    }
    
  } catch (error) {
    console.log(`\n❌ Request failed: ${error.message}`);
  }
}

testStepByStep();
