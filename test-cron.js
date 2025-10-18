// Test script for cron jobs
const CRON_SECRET = 'test-secret-123';

async function testWeeklyDigest() {
  try {
    const response = await fetch('http://localhost:3000/api/cron?job=weekly-todo-digest', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${CRON_SECRET}`,
        'Content-Type': 'application/json'
      }
    });
    
    const result = await response.json();
    console.log('📊 Weekly Digest Test Result:', result);
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testWeeklyDigest();
