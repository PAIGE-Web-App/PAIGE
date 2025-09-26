/**
 * Test with corrected field names for message analysis
 */

const https = require('https');

const WEBHOOK_URL = 'https://paigewedding.app.n8n.cloud/webhook/paige-rag/analyze-message';

// Test with corrected field names (camelCase)
const testData = {
  message_content: "We need to finalize the wedding venue contract by next Friday. Please send over the updated terms and we'll review them. The deposit of $2,500 is due within 7 days of signing.",
  subject: "Wedding Venue Contract - Urgent",
  vendorCategory: "venue",
  vendorName: "Grand Ballroom Events",
  existing_todos: [
    {
      id: "todo-1",
      name: "Research wedding venues",
      category: "venue",
      isCompleted: true
    },
    {
      id: "todo-2",
      name: "Schedule venue tours",
      category: "venue",
      isCompleted: false
    }
  ],
  wedding_context: {
    weddingDate: "2024-06-15",
    weddingLocation: "San Francisco, CA",
    guestCount: 150,
    maxBudget: 50000,
    vibe: "Elegant and romantic"
  },
  user_id: "test-user-123",
  message_id: "msg-venue-contract-001"
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

async function testCorrectedData() {
  console.log('🧪 Testing with Corrected Field Names...');
  console.log('Webhook URL:', WEBHOOK_URL);
  console.log('\nTest Data:');
  console.log(JSON.stringify(testData, null, 2));
  
  try {
    const response = await makeRequest(WEBHOOK_URL, testData);
    
    console.log(`\n📊 Response Status: ${response.statusCode}`);
    
    if (response.statusCode === 200) {
      if (response.data.success) {
        console.log('🎉 SUCCESS! Message analysis completed!');
        
        const analysis = response.data.analysis;
        console.log('\n📋 Analysis Results:');
        console.log(`- New Todos: ${analysis.newTodos?.length || 0}`);
        console.log(`- Todo Updates: ${analysis.todoUpdates?.length || 0}`);
        console.log(`- Completed Todos: ${analysis.completedTodos?.length || 0}`);
        console.log(`- Sentiment: ${analysis.sentiment || 'unknown'}`);
        console.log(`- Urgency: ${analysis.urgency || 'unknown'}`);
        console.log(`- Requires Response: ${analysis.requiresResponse ? 'Yes' : 'No'}`);
        
        if (analysis.newTodos && analysis.newTodos.length > 0) {
          console.log('\n📝 New Todo Suggestions:');
          analysis.newTodos.forEach((todo, index) => {
            console.log(`  ${index + 1}. ${todo.name}`);
            console.log(`     Priority: ${todo.priority}`);
            console.log(`     Category: ${todo.category}`);
            if (todo.dueDate) console.log(`     Due: ${todo.dueDate}`);
            if (todo.description) console.log(`     Description: ${todo.description}`);
          });
        }
        
        if (analysis.keyPoints && analysis.keyPoints.length > 0) {
          console.log('\n🔑 Key Points:');
          analysis.keyPoints.forEach((point, index) => {
            console.log(`  ${index + 1}. ${point}`);
          });
        }
        
        if (analysis.nextSteps && analysis.nextSteps.length > 0) {
          console.log('\n➡️ Next Steps:');
          analysis.nextSteps.forEach((step, index) => {
            console.log(`  ${index + 1}. ${step}`);
          });
        }
        
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
}

testCorrectedData();
