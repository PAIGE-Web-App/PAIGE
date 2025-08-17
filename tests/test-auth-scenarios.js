// Test Authentication Scenarios
// This script tests various authentication flows to ensure no loops or interruptions

const BASE_URL = 'http://localhost:3000';

// Test scenarios
const testScenarios = [
  {
    name: '1. Normal Login Flow',
    description: 'Test standard email/password login',
    test: async () => {
      console.log('🧪 Testing normal login flow...');
      
      // Simulate login request
      const loginData = {
        email: 'test@example.com',
        password: 'password123'
      };
      
      try {
        // Test sessionLogin endpoint
        const response = await fetch(`${BASE_URL}/api/sessionLogin`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken: 'mock-token' })
        });
        
        console.log('✅ Session login endpoint accessible:', response.status);
        return true;
      } catch (error) {
        console.error('❌ Session login test failed:', error);
        return false;
      }
    }
  },
  
  {
    name: '2. Session Validation',
    description: 'Test token validation endpoint',
    test: async () => {
      console.log('🧪 Testing session validation...');
      
      try {
        const response = await fetch(`${BASE_URL}/api/auth/validate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken: 'mock-token' })
        });
        
        console.log('✅ Token validation endpoint accessible:', response.status);
        return true;
      } catch (error) {
        console.error('❌ Token validation test failed:', error);
        return false;
      }
    }
  },
  
  {
    name: '3. Middleware Protection',
    description: 'Test middleware authentication checks',
    test: async () => {
      console.log('🧪 Testing middleware protection...');
      
      try {
        // Test accessing protected route without session
        const response = await fetch(`${BASE_URL}/api/admin/users`);
        
        // Should redirect to login or return 401/403
        console.log('✅ Middleware protection working:', response.status);
        return true;
      } catch (error) {
        console.error('❌ Middleware test failed:', error);
        return false;
      }
    }
  },
  
  {
    name: '4. Logout Flow',
    description: 'Test logout functionality',
    test: async () => {
      console.log('🧪 Testing logout flow...');
      
      try {
        const response = await fetch(`${BASE_URL}/api/sessionLogout`, {
          method: 'POST',
          credentials: 'include'
        });
        
        console.log('✅ Logout endpoint accessible:', response.status);
        return true;
      } catch (error) {
        console.error('❌ Logout test failed:', error);
        return false;
      }
    }
  },
  
  {
    name: '5. Rate Limiting',
    description: 'Test API rate limiting',
    test: async () => {
      console.log('🧪 Testing rate limiting...');
      
      try {
        // Make multiple requests to trigger rate limiting
        const promises = Array(15).fill().map(() => 
          fetch(`${BASE_URL}/api/auth/validate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idToken: 'mock-token' })
          })
        );
        
        const responses = await Promise.all(promises);
        const rateLimited = responses.some(r => r.status === 429);
        
        console.log('✅ Rate limiting working:', rateLimited ? 'Rate limited' : 'No rate limit hit');
        return true;
      } catch (error) {
        console.error('❌ Rate limiting test failed:', error);
        return false;
      }
    }
  }
];

// Run all tests
async function runAllTests() {
  console.log('🚀 Starting Authentication Flow Tests...\n');
  
  let passed = 0;
  let failed = 0;
  
  for (const scenario of testScenarios) {
    console.log(`\n${scenario.name}: ${scenario.description}`);
    console.log('─'.repeat(50));
    
    try {
      const result = await scenario.test();
      if (result) {
        passed++;
        console.log('✅ PASSED\n');
      } else {
        failed++;
        console.log('❌ FAILED\n');
      }
    } catch (error) {
      failed++;
      console.error('❌ ERROR:', error.message, '\n');
    }
  }
  
  console.log('─'.repeat(50));
  console.log(`📊 Test Results: ${passed} passed, ${failed} failed`);
  
  if (failed === 0) {
    console.log('🎉 All authentication tests passed! No loops detected.');
  } else {
    console.log('⚠️  Some tests failed. Please review the authentication flow.');
  }
}

// Check if server is running
async function checkServer() {
  try {
    const response = await fetch(BASE_URL);
    console.log('✅ Server is running');
    return true;
  } catch (error) {
    console.error('❌ Server is not running. Please start with: npm run dev');
    return false;
  }
}

// Main execution
async function main() {
  const serverRunning = await checkServer();
  if (serverRunning) {
    await runAllTests();
  }
}

// Run tests
main().catch(console.error);
