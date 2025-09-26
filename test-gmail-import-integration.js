/**
 * Test the Gmail import integration with n8n todo analysis
 */

const https = require('https');

const API_URL = 'http://localhost:3000/api/start-gmail-import-enhanced';

// Test data for Gmail import with todo analysis
const testData = {
  userId: 'test-user-123',
  contacts: [
    {
      id: 'contact-1',
      name: 'Grand Ballroom Events',
      email: 'venue@grandballroom.com',
      category: 'venue',
      messages: [
        {
          id: 'msg-1',
          subject: 'Wedding Venue Contract - Urgent',
          body: 'We need to finalize the wedding venue contract by next Friday. Please send over the updated terms and we\'ll review them. The deposit of $2,500 is due within 7 days of signing.',
          date: '2024-01-15T10:00:00Z',
          from: 'venue@grandballroom.com',
          to: 'bride@example.com'
        }
      ]
    }
  ],
  config: {
    enableTodoScanning: true,
    maxMessagesPerContact: 10
  },
  enableTodoScanning: true
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

async function testGmailImportIntegration() {
  console.log('🧪 Testing Gmail Import with N8N Todo Analysis...');
  console.log('API URL:', API_URL);
  console.log('\nTest Data:');
  console.log(JSON.stringify(testData, null, 2));
  
  try {
    const response = await makeRequest(API_URL, testData);
    
    console.log(`\n📊 Response Status: ${response.statusCode}`);
    
    if (response.statusCode === 200) {
      if (response.data.success) {
        console.log('🎉 SUCCESS! Gmail import with todo analysis completed!');
        
        console.log('\n📋 Import Results:');
        console.log(`- Contacts Processed: ${response.data.contactsProcessed || 0}`);
        console.log(`- Messages Processed: ${response.data.messagesProcessed || 0}`);
        console.log(`- Todos Suggested: ${response.data.todosSuggested || 0}`);
        console.log(`- Todos Updated: ${response.data.todosUpdated || 0}`);
        
        if (response.data.todoAnalysis) {
          console.log('\n📝 Todo Analysis Results:');
          console.log(`- New Todos: ${response.data.todoAnalysis.newTodos?.length || 0}`);
          console.log(`- Todo Updates: ${response.data.todoAnalysis.todoUpdates?.length || 0}`);
          console.log(`- Completed Todos: ${response.data.todoAnalysis.completedTodos?.length || 0}`);
          
          if (response.data.todoAnalysis.newTodos && response.data.todoAnalysis.newTodos.length > 0) {
            console.log('\n🆕 New Todo Suggestions:');
            response.data.todoAnalysis.newTodos.forEach((todo, index) => {
              console.log(`  ${index + 1}. ${todo.name}`);
              console.log(`     Priority: ${todo.priority}`);
              console.log(`     Category: ${todo.category}`);
              if (todo.dueDate) console.log(`     Due: ${todo.dueDate}`);
            });
          }
        }
        
      } else {
        console.log('❌ Import failed:', response.data.message || 'Unknown error');
      }
      
    } else {
      console.log(`❌ HTTP Error: ${response.statusCode}`);
      console.log('Response:', JSON.stringify(response.data, null, 2));
    }
    
  } catch (error) {
    console.log(`❌ Request failed: ${error.message}`);
    console.log('Note: Make sure your Next.js development server is running on localhost:3000');
  }
}

testGmailImportIntegration();
