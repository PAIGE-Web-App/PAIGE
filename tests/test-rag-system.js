/**
 * RAG System Testing Script
 * 
 * This script tests the RAG system components to ensure they're working correctly.
 * Run this after setting up N8N and Pinecone to verify the integration.
 */

const fetch = require('node-fetch');

// Configuration
const BASE_URL = 'http://localhost:3000';
const TEST_USER_ID = 'test-user-123';
const TEST_USER_EMAIL = 'test@example.com';

// Test data
const TEST_DOCUMENT = {
  document_id: 'test-doc-001',
  document_content: `Wedding Planning Timeline Guide

12+ Months Before:
- Set budget and guest list
- Choose wedding date and venue
- Book photographer and videographer
- Start dress shopping
- Hire wedding planner (if desired)

9-11 Months Before:
- Book caterer and florist
- Order wedding dress
- Book DJ or band
- Send save-the-dates
- Plan honeymoon

6-8 Months Before:
- Book transportation
- Order invitations
- Plan ceremony details
- Book hair and makeup artists
- Start premarital counseling`,
  source: 'wedding-guides/timeline.md',
  user_id: TEST_USER_ID,
  document_type: 'wedding_guide'
};

const TEST_QUERY = {
  query: 'What should I do 6 months before my wedding?',
  user_id: TEST_USER_ID,
  user_document: 'I have a wedding planned for next summer and need to know what to do 6 months before.',
  context: {}
};

// Test functions
async function testRAGHealth() {
  console.log('🔍 Testing RAG Health Check...');
  
  try {
    const response = await fetch(`${BASE_URL}/api/rag/health`);
    const data = await response.json();
    
    console.log('✅ Health Check Response:', JSON.stringify(data, null, 2));
    
    if (data.health.overall_status === 'healthy') {
      console.log('✅ RAG system is healthy!');
      return true;
    } else {
      console.log('⚠️ RAG system is degraded or unhealthy');
      return false;
    }
  } catch (error) {
    console.error('❌ Health check failed:', error.message);
    return false;
  }
}

async function testDocumentProcessing() {
  console.log('📄 Testing Document Processing...');
  
  try {
    const response = await fetch(`${BASE_URL}/api/rag/process-document`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(TEST_DOCUMENT)
    });
    
    const data = await response.json();
    console.log('✅ Document Processing Response:', JSON.stringify(data, null, 2));
    
    if (data.success) {
      console.log('✅ Document processed successfully!');
      return true;
    } else {
      console.log('❌ Document processing failed:', data.error);
      return false;
    }
  } catch (error) {
    console.error('❌ Document processing test failed:', error.message);
    return false;
  }
}

async function testQueryProcessing() {
  console.log('❓ Testing Query Processing...');
  
  try {
    const response = await fetch(`${BASE_URL}/api/rag/process-query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(TEST_QUERY)
    });
    
    const data = await response.json();
    console.log('✅ Query Processing Response:', JSON.stringify(data, null, 2));
    
    if (data.success) {
      console.log('✅ Query processed successfully!');
      console.log('📝 Answer:', data.answer);
      console.log('📚 Sources:', data.sources);
      return true;
    } else {
      console.log('❌ Query processing failed:', data.error);
      return false;
    }
  } catch (error) {
    console.error('❌ Query processing test failed:', error.message);
    return false;
  }
}

async function testFeatureFlags() {
  console.log('🚩 Testing Feature Flags...');
  
  try {
    // Test enabling RAG for beta user
    const response = await fetch(`${BASE_URL}/api/rag/health`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'enable_beta',
        user_emails: [TEST_USER_EMAIL]
      })
    });
    
    const data = await response.json();
    console.log('✅ Feature Flag Response:', JSON.stringify(data, null, 2));
    
    if (data.success) {
      console.log('✅ Feature flags updated successfully!');
      return true;
    } else {
      console.log('❌ Feature flag update failed:', data.error);
      return false;
    }
  } catch (error) {
    console.error('❌ Feature flag test failed:', error.message);
    return false;
  }
}

async function testEmergencyDisable() {
  console.log('🚨 Testing Emergency Disable...');
  
  try {
    const response = await fetch(`${BASE_URL}/api/rag/health`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'emergency_disable'
      })
    });
    
    const data = await response.json();
    console.log('✅ Emergency Disable Response:', JSON.stringify(data, null, 2));
    
    if (data.success) {
      console.log('✅ Emergency disable successful!');
      return true;
    } else {
      console.log('❌ Emergency disable failed:', data.error);
      return false;
    }
  } catch (error) {
    console.error('❌ Emergency disable test failed:', error.message);
    return false;
  }
}

// Main test runner
async function runTests() {
  console.log('🚀 Starting RAG System Tests...\n');
  
  const tests = [
    { name: 'Health Check', fn: testRAGHealth },
    { name: 'Feature Flags', fn: testFeatureFlags },
    { name: 'Document Processing', fn: testDocumentProcessing },
    { name: 'Query Processing', fn: testQueryProcessing },
    { name: 'Emergency Disable', fn: testEmergencyDisable }
  ];
  
  const results = [];
  
  for (const test of tests) {
    console.log(`\n--- Running ${test.name} Test ---`);
    try {
      const result = await test.fn();
      results.push({ name: test.name, passed: result });
    } catch (error) {
      console.error(`❌ ${test.name} test crashed:`, error.message);
      results.push({ name: test.name, passed: false });
    }
  }
  
  // Summary
  console.log('\n📊 Test Results Summary:');
  console.log('========================');
  
  let passed = 0;
  let total = results.length;
  
  results.forEach(result => {
    const status = result.passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} - ${result.name}`);
    if (result.passed) passed++;
  });
  
  console.log(`\n🎯 Overall: ${passed}/${total} tests passed`);
  
  if (passed === total) {
    console.log('🎉 All tests passed! RAG system is ready for use.');
  } else {
    console.log('⚠️ Some tests failed. Please check the configuration and try again.');
  }
  
  return passed === total;
}

// Run tests if this script is executed directly
if (require.main === module) {
  runTests().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = {
  runTests,
  testRAGHealth,
  testDocumentProcessing,
  testQueryProcessing,
  testFeatureFlags,
  testEmergencyDisable
};
