/**
 * Debug test for the PAIGE Document Processing N8N Webhook
 */

const https = require('https');

const WEBHOOK_URL = 'https://paigewedding.app.n8n.cloud/webhook/paige-rag/process-document';

// Simple test document
const testData = {
  document_id: "test-doc-001",
  document_content: `Wedding Planning Timeline Guide

12+ Months Before:
- Set budget and guest list
- Choose wedding date and venue
- Book photographer and videographer

6-8 Months Before:
- Book transportation
- Order invitations
- Plan ceremony details`,
  source: "wedding-guides/timeline.md",
  user_id: "test-user-123",
  document_type: "wedding_guide"
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

async function testDocumentProcessing() {
  console.log('🧪 Testing Document Processing Webhook...');
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
        console.log('\n🎉 SUCCESS! Document processing completed!');
        console.log(`📄 Document ID: ${response.data.document_id || 'N/A'}`);
        console.log(`📊 Chunks Created: ${response.data.chunks_created || 'N/A'}`);
        console.log(`🔗 Embeddings Generated: ${response.data.embeddings_created || 'N/A'}`);
        console.log(`📚 Pinecone Records: ${response.data.pinecone_records || 'N/A'}`);
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

testDocumentProcessing();
