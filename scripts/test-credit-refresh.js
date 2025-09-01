#!/usr/bin/env node

/**
 * Test script for daily credit refresh
 * Run with: node scripts/test-credit-refresh.js
 */

const fetch = require('node-fetch');

async function testCreditRefresh() {
  try {
    console.log('🧪 Testing daily credit refresh...');
    
    const response = await fetch('http://localhost:3000/api/test/credit-refresh', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ Test failed:', errorData);
      return;
    }

    const result = await response.json();
    
    console.log('✅ Test completed successfully!');
    console.log(`📊 Results:`);
    console.log(`   - Refreshed users: ${result.refreshedCount}`);
    console.log(`   - Errors: ${result.errorCount}`);
    console.log(`   - Total users processed: ${result.results?.length || 0}`);
    
    if (result.results && result.results.length > 0) {
      console.log('\n📋 User results:');
      result.results.forEach((user, index) => {
        console.log(`   ${index + 1}. ${user.email || user.userId}`);
        if (user.refreshed) {
          console.log(`      Credits: ${user.oldCredits} → ${user.newCredits}`);
        } else {
          console.log(`      Current credits: ${user.currentCredits} (no refresh needed)`);
        }
      });
    }
    
    if (result.errors && result.errors.length > 0) {
      console.log('\n❌ Errors:');
      result.errors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testCreditRefresh();
