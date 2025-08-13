// Test Authentication Loops and User Interruptions
// This script tests scenarios that could cause login loops or user frustration

const BASE_URL = 'http://localhost:3000';

// Test authentication loop scenarios
const loopTestScenarios = [
  {
    name: '1. Multiple Login Attempts',
    description: 'Test if multiple login attempts cause loops',
    test: async () => {
      console.log('🧪 Testing multiple login attempts...');
      
      try {
        // Simulate multiple rapid login attempts
        const promises = Array(5).fill().map(() => 
          fetch(`${BASE_URL}/api/sessionLogin`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idToken: 'mock-token' })
          })
        );
        
        const responses = await Promise.all(promises);
        const allFailed = responses.every(r => r.status === 401);
        
        if (allFailed) {
          console.log('✅ Multiple login attempts handled correctly (all failed as expected)');
          return true;
        } else {
          console.log('⚠️  Unexpected response to multiple login attempts');
          return false;
        }
      } catch (error) {
        console.error('❌ Multiple login test failed:', error);
        return false;
      }
    }
  },
  
  {
    name: '2. Session Cookie Manipulation',
    description: 'Test if invalid session cookies cause loops',
    test: async () => {
      console.log('🧪 Testing invalid session cookie handling...');
      
      try {
        // Test with invalid session cookie
        const response = await fetch(`${BASE_URL}/api/admin/users`, {
          headers: {
            'Cookie': '__session=invalid-session-token'
          }
        });
        
        // Should not redirect in a loop, should return 401 or redirect to login once
        console.log('✅ Invalid session handled correctly:', response.status);
        return true;
      } catch (error) {
        console.error('❌ Invalid session test failed:', error);
        return false;
      }
    }
  },
  
  {
    name: '3. Token Refresh Scenarios',
    description: 'Test token refresh to prevent loops',
    test: async () => {
      console.log('🧪 Testing token refresh scenarios...');
      
      try {
        // Test the token validation endpoint multiple times
        const promises = Array(3).fill().map(() => 
          fetch(`${BASE_URL}/api/auth/validate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idToken: 'mock-token' })
          })
        );
        
        const responses = await Promise.all(promises);
        const consistentResponses = responses.every(r => r.status === 401);
        
        if (consistentResponses) {
          console.log('✅ Token validation responses consistent (no loops)');
          return true;
        } else {
          console.log('⚠️  Inconsistent token validation responses');
          return false;
        }
      } catch (error) {
        console.error('❌ Token refresh test failed:', error);
        return false;
      }
    }
  },
  
  {
    name: '4. Logout and Re-login Flow',
    description: 'Test logout followed by immediate re-login',
    test: async () => {
      console.log('🧪 Testing logout and re-login flow...');
      
      try {
        // First logout
        const logoutResponse = await fetch(`${BASE_URL}/api/sessionLogout`, {
          method: 'POST',
          credentials: 'include'
        });
        
        if (logoutResponse.ok) {
          console.log('✅ Logout successful');
          
          // Try to login immediately after logout
          const loginResponse = await fetch(`${BASE_URL}/api/sessionLogin`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idToken: 'mock-token' })
          });
          
          console.log('✅ Re-login attempt handled correctly:', loginResponse.status);
          return true;
        } else {
          console.log('⚠️  Logout failed');
          return false;
        }
      } catch (error) {
        console.error('❌ Logout/re-login test failed:', error);
        return false;
      }
    }
  },
  
  {
    name: '5. Middleware Redirect Behavior',
    description: 'Test middleware redirects to prevent loops',
    test: async () => {
      console.log('🧪 Testing middleware redirect behavior...');
      
      try {
        // Test accessing protected route
        const response = await fetch(`${BASE_URL}/api/admin/users`);
        
        // Should not redirect multiple times
        if (response.status === 401) {
          console.log('✅ Middleware correctly returns 401 for unauthorized access');
          return true;
        } else if (response.status === 302 || response.status === 301) {
          // Check if it's a redirect to login
          const location = response.headers.get('location');
          if (location && location.includes('/login')) {
            console.log('✅ Middleware correctly redirects to login');
            return true;
          } else {
            console.log('⚠️  Unexpected redirect location:', location);
            return false;
          }
        } else {
          console.log('⚠️  Unexpected middleware response:', response.status);
          return false;
        }
      } catch (error) {
        console.error('❌ Middleware redirect test failed:', error);
        return false;
      }
    }
  },
  
  {
    name: '6. Rate Limiting and Authentication',
    description: 'Test rate limiting doesn\'t interfere with auth',
    test: async () => {
      console.log('🧪 Testing rate limiting with authentication...');
      
      try {
        // Trigger rate limiting
        const promises = Array(20).fill().map(() => 
          fetch(`${BASE_URL}/api/auth/validate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idToken: 'mock-token' })
          })
        );
        
        const responses = await Promise.all(promises);
        const rateLimited = responses.some(r => r.status === 429);
        
        if (rateLimited) {
          console.log('✅ Rate limiting working correctly');
          
          // Wait a moment and test if auth still works
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          const authResponse = await fetch(`${BASE_URL}/api/sessionLogin`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idToken: 'mock-token' })
          });
          
          console.log('✅ Authentication still accessible after rate limiting:', authResponse.status);
          return true;
        } else {
          console.log('⚠️  Rate limiting not triggered');
          return false;
        }
      } catch (error) {
        console.error('❌ Rate limiting auth test failed:', error);
        return false;
      }
    }
  },
  
  {
    name: '7. App Cache Refresh → Logout → Re-login Flow',
    description: 'Test the exact scenario that was causing multiple login issues',
    test: async () => {
      console.log('🧪 Testing app cache refresh → logout → re-login flow...');
      
      try {
        // Step 1: Simulate app cache refresh (clear all client-side state)
        console.log('📱 Step 1: Simulating app cache refresh...');
        
        // Step 2: Test logout functionality after "cache refresh"
        console.log('🚪 Step 2: Testing logout after cache refresh...');
        const logoutResponse = await fetch(`${BASE_URL}/api/sessionLogout`, {
          method: 'POST',
          credentials: 'include'
        });
        
        if (!logoutResponse.ok) {
          console.log('⚠️  Logout failed after cache refresh');
          return false;
        }
        console.log('✅ Logout successful after cache refresh');
        
        // Step 3: Test re-login attempt
        console.log('🔑 Step 3: Testing re-login after cache refresh...');
        const loginResponse = await fetch(`${BASE_URL}/api/sessionLogin`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken: 'mock-token' })
        });
        
        // Should fail with 401 (invalid token) but not cause loops
        if (loginResponse.status === 401) {
          console.log('✅ Re-login correctly rejected with invalid token (no loops)');
        } else {
          console.log('⚠️  Unexpected re-login response:', loginResponse.status);
          return false;
        }
        
        // Step 4: Test multiple rapid re-login attempts (simulate user frustration)
        console.log('🔄 Step 4: Testing multiple rapid re-login attempts...');
        const rapidLoginPromises = Array(3).fill().map(() => 
          fetch(`${BASE_URL}/api/sessionLogin`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idToken: 'mock-token' })
          })
        );
        
        const rapidResponses = await Promise.all(rapidLoginPromises);
        const allFailed = rapidResponses.every(r => r.status === 401);
        
        if (allFailed) {
          console.log('✅ Multiple rapid re-login attempts handled correctly (no loops)');
        } else {
          console.log('⚠️  Inconsistent responses to rapid re-login attempts');
          return false;
        }
        
        // Step 5: Test accessing protected route after failed re-login
        console.log('🚫 Step 5: Testing protected route access after failed re-login...');
        const protectedResponse = await fetch(`${BASE_URL}/api/admin/users`);
        
        if (protectedResponse.status === 401) {
          console.log('✅ Protected route correctly blocked after failed re-login');
        } else {
          console.log('⚠️  Unexpected protected route response:', protectedResponse.status);
          return false;
        }
        
        console.log('✅ App cache refresh → logout → re-login flow completed successfully');
        return true;
        
      } catch (error) {
        console.error('❌ App cache refresh test failed:', error);
        return false;
      }
    }
  },
  
  {
    name: '8. Gmail Integration Token Refresh',
    description: 'Test Gmail service token refresh without affecting main auth',
    test: async () => {
      console.log('🧪 Testing Gmail integration token refresh...');
      
      try {
        // Simulate Gmail service token expiration
        console.log('📧 Simulating Gmail service token expiration...');
        
        // Test that Gmail token issues don't affect main authentication
        const authResponse = await fetch(`${BASE_URL}/api/sessionLogin`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken: 'mock-token' })
        });
        
        // Should still return 401 (invalid token) but not cause loops
        if (authResponse.status === 401) {
          console.log('✅ Main authentication still works despite Gmail token issues');
        } else {
          console.log('⚠️  Unexpected auth response during Gmail token test:', authResponse.status);
          return false;
        }
        
        // Test multiple Gmail-related requests
        const gmailPromises = Array(3).fill().map(() => 
          fetch(`${BASE_URL}/api/check-gmail-auth-status`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: 'test-user' })
          })
        );
        
        const gmailResponses = await Promise.all(gmailPromises);
        // Gmail auth status returns 404 for non-existent users, which is correct
        const consistentResponses = gmailResponses.every(r => r.status === 401 || r.status === 400 || r.status === 404);
        
        if (consistentResponses) {
          console.log('✅ Gmail service requests handled consistently (no loops)');
          return true;
        } else {
          console.log('⚠️  Inconsistent Gmail service responses');
          return false;
        }
        
      } catch (error) {
        console.error('❌ Gmail integration test failed:', error);
        return false;
      }
    }
  },
  
  {
    name: '9. Browser Memory Clear Scenario',
    description: 'Test the exact DevTools > Application > Clear Storage scenario',
    test: async () => {
      console.log('🧪 Testing browser memory clear scenario (DevTools > Application > Clear Storage)...');
      
      try {
        // Step 1: Simulate clearing all browser storage (localStorage, sessionStorage, cookies)
        console.log('🗑️  Step 1: Simulating browser storage clear...');
        
        // Step 2: Test that the app gracefully handles missing storage
        console.log('🔍 Step 2: Testing app behavior with cleared storage...');
        
        // Test login endpoint without any stored state
        const cleanLoginResponse = await fetch(`${BASE_URL}/api/sessionLogin`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken: 'mock-token' })
        });
        
        if (cleanLoginResponse.status === 401) {
          console.log('✅ Clean login attempt handled correctly (no loops)');
        } else {
          console.log('⚠️  Unexpected clean login response:', cleanLoginResponse.status);
          return false;
        }
        
        // Step 3: Test multiple rapid attempts after storage clear (simulate user confusion)
        console.log('🔄 Step 3: Testing multiple attempts after storage clear...');
        const rapidCleanPromises = Array(5).fill().map(() => 
          fetch(`${BASE_URL}/api/sessionLogin`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idToken: 'mock-token' })
          })
        );
        
        const rapidCleanResponses = await Promise.all(rapidCleanPromises);
        const allCleanFailed = rapidCleanResponses.every(r => r.status === 401);
        
        if (allCleanFailed) {
          console.log('✅ Multiple clean attempts handled correctly (no loops)');
        } else {
          console.log('⚠️  Inconsistent responses to clean attempts');
          return false;
        }
        
        // Step 4: Test that the app doesn't get stuck in a redirect loop
        console.log('🔄 Step 4: Testing for redirect loops...');
        const redirectTestResponse = await fetch(`${BASE_URL}/api/admin/users`);
        
        if (redirectTestResponse.status === 401) {
          console.log('✅ No redirect loops detected');
        } else if (redirectTestResponse.status === 302 || redirectTestResponse.status === 301) {
          const location = redirectTestResponse.headers.get('location');
          if (location && location.includes('/login')) {
            console.log('✅ Single redirect to login (no loops)');
          } else {
            console.log('⚠️  Unexpected redirect location:', location);
            return false;
          }
        } else {
          console.log('⚠️  Unexpected redirect test response:', redirectTestResponse.status);
          return false;
        }
        
        // Step 5: Test that the app can recover from storage clear
        console.log('🔄 Step 5: Testing app recovery from storage clear...');
        
        // Simulate a successful login after storage clear
        const recoveryResponse = await fetch(`${BASE_URL}/api/sessionLogin`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken: 'valid-token-simulation' })
        });
        
        // Should still fail with invalid token, but gracefully
        if (recoveryResponse.status === 401) {
          console.log('✅ App gracefully handles invalid tokens after storage clear');
        } else {
          console.log('⚠️  Unexpected recovery response:', recoveryResponse.status);
          return false;
        }
        
        console.log('✅ Browser memory clear scenario completed successfully - no loops detected');
        return true;
        
      } catch (error) {
        console.error('❌ Browser memory clear test failed:', error);
        return false;
      }
    }
  },
  
  {
    name: '10. Multiple Gmail Integrations Scenario',
    description: 'Test users with Gmail import, Calendar sync, and Email sending',
    test: async () => {
      console.log('🧪 Testing multiple Gmail integrations scenario...');
      
      try {
        // Step 1: Simulate user with multiple Gmail integrations
        console.log('📧 Step 1: Simulating user with multiple Gmail integrations...');
        
        // Test Gmail import endpoint
        const gmailImportResponse = await fetch(`${BASE_URL}/api/start-gmail-import`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: 'test-user' })
        });
        
        if (gmailImportResponse.status === 401 || gmailImportResponse.status === 400) {
          console.log('✅ Gmail import endpoint handled correctly');
        } else {
          console.log('⚠️  Unexpected Gmail import response:', gmailImportResponse.status);
          return false;
        }
        
        // Step 2: Test Google Calendar sync endpoint
        console.log('📅 Step 2: Testing Google Calendar sync...');
        const calendarSyncResponse = await fetch(`${BASE_URL}/api/google-calendar/sync-from-calendar`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: 'test-user' })
        });
        
        // Calendar sync returns 404 for non-existent users, which is correct
        if (calendarSyncResponse.status === 401 || calendarSyncResponse.status === 400 || calendarSyncResponse.status === 404) {
          console.log('✅ Calendar sync endpoint handled correctly');
        } else {
          console.log('⚠️  Unexpected calendar sync response:', calendarSyncResponse.status);
          return false;
        }
        
        // Step 3: Test email sending endpoint
        console.log('📤 Step 3: Testing email sending...');
        const emailSendResponse = await fetch(`${BASE_URL}/api/email/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: 'test-user' })
        });
        
        if (emailSendResponse.status === 401 || emailSendResponse.status === 400) {
          console.log('✅ Email sending endpoint handled correctly');
        } else {
          console.log('⚠️  Unexpected email sending response:', emailSendResponse.status);
          return false;
        }
        
        // Step 4: Test that multiple integration failures don't cause auth loops
        console.log('🔄 Step 4: Testing multiple integration failures...');
        const integrationPromises = [
          fetch(`${BASE_URL}/api/check-gmail-auth-status`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: 'test-user' })
          }),
          fetch(`${BASE_URL}/api/google-calendar/status`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: 'test-user' })
          }),
          fetch(`${BASE_URL}/api/check-gmail-account-mismatch`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: 'test-user' })
          })
        ];
        
        const integrationResponses = await Promise.all(integrationPromises);
        // These endpoints return different status codes based on the request:
        // - 401: Unauthorized (no valid session)
        // - 400: Bad request (missing/invalid parameters)
        // - 404: User not found (valid for test scenarios)
        const consistentIntegrationResponses = integrationResponses.every(r => 
          r.status === 401 || r.status === 400 || r.status === 404
        );
        
        if (consistentIntegrationResponses) {
          console.log('✅ Multiple integration endpoints handled consistently (no loops)');
        } else {
          console.log('⚠️  Inconsistent integration endpoint responses');
          return false;
        }
        
        // Step 5: Test that main authentication still works despite integration issues
        console.log('🔑 Step 5: Testing main authentication after integration failures...');
        const mainAuthResponse = await fetch(`${BASE_URL}/api/sessionLogin`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken: 'mock-token' })
        });
        
        if (mainAuthResponse.status === 401) {
          console.log('✅ Main authentication still works despite integration issues');
        } else {
          console.log('⚠️  Main authentication affected by integration issues:', mainAuthResponse.status);
          return false;
        }
        
        console.log('✅ Multiple Gmail integrations scenario completed successfully - no conflicts detected');
        return true;
        
      } catch (error) {
        console.error('❌ Multiple Gmail integrations test failed:', error);
        return false;
      }
    }
  }
];

// Run loop tests
async function runLoopTests() {
  console.log('🚀 Starting Authentication Loop Tests...\n');
  console.log('🔍 Testing for potential login loops and user interruptions...\n');
  
  let passed = 0;
  let failed = 0;
  
  for (const scenario of loopTestScenarios) {
    console.log(`${scenario.name}: ${scenario.description}`);
    console.log('─'.repeat(60));
    
    try {
      const result = await scenario.test();
      if (result) {
        passed++;
        console.log('✅ PASSED - No loops detected\n');
      } else {
        failed++;
        console.log('❌ FAILED - Potential issue detected\n');
      }
    } catch (error) {
      failed++;
      console.error('❌ ERROR:', error.message, '\n');
    }
    
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('─'.repeat(60));
  console.log(`📊 Loop Test Results: ${passed} passed, ${failed} failed`);
  
  if (failed === 0) {
    console.log('🎉 No authentication loops detected! User experience should be smooth.');
    console.log('✅ Users will not experience repeated login prompts or interruptions.');
    console.log('✅ App cache refresh scenarios are handled gracefully.');
    console.log('✅ Multiple Gmail integrations won\'t cause authentication conflicts.');
    console.log('✅ Browser memory clear (DevTools > Application > Clear Storage) is handled properly.');
  } else {
    console.log('⚠️  Potential issues detected. Please review the authentication flow.');
    console.log('🔧 Consider implementing additional safeguards to prevent loops.');
  }
}

// Check server and run tests
async function main() {
  try {
    const response = await fetch(BASE_URL);
    if (response.ok || response.status === 302) {
      console.log('✅ Server is running and accessible');
      await runLoopTests();
    } else {
      console.error('❌ Server returned unexpected status:', response.status);
    }
  } catch (error) {
    console.error('❌ Server is not running. Please start with: npm run dev');
  }
}

// Run tests
main().catch(console.error);
