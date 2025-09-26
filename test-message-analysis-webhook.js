/**
 * Test script for the PAIGE Message Analysis N8N Webhook
 * 
 * This script tests the webhook endpoint with sample wedding planning messages
 * to verify the workflow is working correctly.
 */

const https = require('https');

// Your n8n webhook URL
const WEBHOOK_URL = 'https://paigewedding.app.n8n.cloud/webhook-test/paige-rag/analyze-message';

// Test data - sample wedding planning messages
const testMessages = [
  {
    name: "Venue Contract Message",
    data: {
      message_content: "Hi Sarah! We're excited to work with you on your wedding. Please find attached the updated venue contract with the new pricing. We need this signed and returned by Friday, January 26th. The deposit of $2,500 is due within 7 days of signing. Let me know if you have any questions about the terms!",
      subject: "Wedding Venue Contract - Updated Pricing",
      vendor_category: "venue",
      vendor_name: "Grand Ballroom Events",
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
    }
  },
  {
    name: "Photographer Follow-up",
    data: {
      message_content: "Hello! Just following up on our conversation about your wedding photography package. We have availability for your June 15th date. The engagement session needs to be scheduled by March 1st, and we'll need the final shot list by May 1st. The balance is due 30 days before the wedding. Can you confirm if you'd like to proceed?",
      subject: "Photography Package Follow-up",
      vendor_category: "photography",
      vendor_name: "Golden Hour Photography",
      existing_todos: [],
      wedding_context: {
        weddingDate: "2024-06-15",
        weddingLocation: "San Francisco, CA",
        guestCount: 150,
        maxBudget: 50000,
        vibe: "Elegant and romantic"
      },
      user_id: "test-user-123",
      message_id: "msg-photography-001"
    }
  },
  {
    name: "Catering Menu Confirmation",
    data: {
      message_content: "Hi! The menu tasting went great. We're ready to finalize your catering order. We need your final guest count by April 15th, and any dietary restrictions by April 20th. The menu includes: 1) Appetizers: passed hors d'oeuvres, 2) Main course: choice of salmon or chicken, 3) Dessert: wedding cake plus dessert bar. Please confirm your selections and let us know about any changes.",
      subject: "Catering Menu Finalization",
      vendor_category: "catering",
      vendor_name: "Elegant Eats Catering",
      existing_todos: [
        {
          id: "todo-3",
          name: "Schedule menu tasting",
          category: "catering",
          isCompleted: true
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
      message_id: "msg-catering-001"
    }
  }
];

// Function to make HTTP request
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

// Function to test a single message
async function testMessage(testCase) {
  console.log(`\n🧪 Testing: ${testCase.name}`);
  console.log('─'.repeat(50));
  
  try {
    const response = await makeRequest(WEBHOOK_URL, testCase.data);
    
    console.log(`✅ Status: ${response.statusCode}`);
    
    if (response.statusCode === 200) {
      console.log('✅ Response received successfully!');
      
      if (response.data.success) {
        console.log('✅ Analysis completed successfully!');
        
        const analysis = response.data.analysis;
        console.log(`📝 New Todos: ${analysis.newTodos?.length || 0}`);
        console.log(`🔄 Todo Updates: ${analysis.todoUpdates?.length || 0}`);
        console.log(`✅ Completed Todos: ${analysis.completedTodos?.length || 0}`);
        console.log(`😊 Sentiment: ${analysis.sentiment || 'unknown'}`);
        console.log(`⚡ Urgency: ${analysis.urgency || 'unknown'}`);
        console.log(`💬 Requires Response: ${analysis.requiresResponse ? 'Yes' : 'No'}`);
        
        // Show new todos if any
        if (analysis.newTodos && analysis.newTodos.length > 0) {
          console.log('\n📋 New Todo Suggestions:');
          analysis.newTodos.forEach((todo, index) => {
            console.log(`  ${index + 1}. ${todo.name}`);
            console.log(`     Priority: ${todo.priority}`);
            console.log(`     Category: ${todo.category}`);
            if (todo.dueDate) console.log(`     Due: ${todo.dueDate}`);
            if (todo.description) console.log(`     Description: ${todo.description}`);
          });
        }
        
        // Show todo updates if any
        if (analysis.todoUpdates && analysis.todoUpdates.length > 0) {
          console.log('\n🔄 Todo Updates:');
          analysis.todoUpdates.forEach((update, index) => {
            console.log(`  ${index + 1}. Todo ID: ${update.todoId}`);
            console.log(`     Updates: ${JSON.stringify(update.updates)}`);
          });
        }
        
        // Show key points
        if (analysis.keyPoints && analysis.keyPoints.length > 0) {
          console.log('\n🔑 Key Points:');
          analysis.keyPoints.forEach((point, index) => {
            console.log(`  ${index + 1}. ${point}`);
          });
        }
        
        // Show next steps
        if (analysis.nextSteps && analysis.nextSteps.length > 0) {
          console.log('\n➡️ Next Steps:');
          analysis.nextSteps.forEach((step, index) => {
            console.log(`  ${index + 1}. ${step}`);
          });
        }
        
      } else {
        console.log('❌ Analysis failed:', response.data.error || 'Unknown error');
      }
      
    } else {
      console.log(`❌ HTTP Error: ${response.statusCode}`);
      console.log('Response:', JSON.stringify(response.data, null, 2));
    }
    
  } catch (error) {
    console.log(`❌ Request failed: ${error.message}`);
  }
}

// Function to run all tests
async function runAllTests() {
  console.log('🚀 Starting PAIGE Message Analysis Webhook Tests');
  console.log('='.repeat(60));
  console.log(`Webhook URL: ${WEBHOOK_URL}`);
  console.log(`Test Cases: ${testMessages.length}`);
  
  for (const testCase of testMessages) {
    await testMessage(testCase);
    
    // Add delay between requests to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n🏁 All tests completed!');
  console.log('='.repeat(60));
}

// Run the tests
runAllTests().catch(console.error);
