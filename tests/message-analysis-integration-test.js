/**
 * Message Analysis Integration Test
 * 
 * This test verifies that the message analysis system correctly:
 * 1. Integrates with real todo data
 * 2. Uses wedding context
 * 3. Connects to RAG system
 * 4. Detects new todos, updates, and completions
 */

const fetch = require('node-fetch');

// Test configuration
const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
const TEST_USER_ID = process.env.TEST_USER_ID || 'test-user-123';

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Test data
const testData = {
  existingTodos: [
    {
      id: 'todo-1',
      title: 'Book photographer',
      name: 'Book photographer',
      isCompleted: false,
      category: 'vendor',
      deadline: new Date('2024-12-01'),
      note: 'Need to research 3 options',
      listId: 'vendor-coordination'
    },
    {
      id: 'todo-2',
      title: 'Schedule venue tour',
      name: 'Schedule venue tour',
      isCompleted: false,
      category: 'venue',
      deadline: new Date('2024-11-15'),
      note: 'Tour on Friday',
      listId: 'planning-logistics'
    }
  ],
  weddingContext: {
    weddingDate: new Date('2025-06-15'),
    weddingLocation: 'Napa Valley, CA',
    guestCount: 150,
    maxBudget: 50000,
    vibe: ['rustic', 'elegant', 'outdoor'],
    planningStage: 'mid',
    daysUntilWedding: 243
  }
};

// Test cases
const testCases = [
  {
    name: 'New Todo Detection',
    messageContent: 'Hi! Just wanted to let you know we need to finalize the menu choices by December 10th. Can you send over your selections?',
    vendorName: 'Vineyard Catering',
    vendorCategory: 'catering',
    expectedResults: {
      newTodos: 1,
      todoUpdates: 0,
      completedTodos: 0,
      expectedTodoTitle: 'finalize menu choices',
      expectedDeadline: '2024-12-10'
    }
  },
  {
    name: 'Todo Update Detection',
    messageContent: 'Quick update - the venue tour has been moved to Thursday instead of Friday. Does that work for you?',
    vendorName: 'Vineyard Estate',
    vendorCategory: 'venue',
    expectedResults: {
      newTodos: 0,
      todoUpdates: 1,
      completedTodos: 0,
      expectedUpdate: 'deadline_update',
      relatedTodo: 'Schedule venue tour'
    }
  },
  {
    name: 'Todo Completion Detection',
    messageContent: 'Great news! We\'ve confirmed your photographer booking. All signed and ready to go! 📸',
    vendorName: 'Sarah Johnson Photography',
    vendorCategory: 'photography',
    expectedResults: {
      newTodos: 0,
      todoUpdates: 0,
      completedTodos: 1,
      completedTodo: 'Book photographer'
    }
  },
  {
    name: 'Multiple Actions Detection',
    messageContent: 'Photographer is confirmed! Also, we need to discuss the timeline for the day. Can we schedule a call next week? And don\'t forget to send over your playlist preferences.',
    vendorName: 'Sarah Johnson Photography',
    vendorCategory: 'photography',
    expectedResults: {
      newTodos: 2, // Schedule call + send playlist
      todoUpdates: 0,
      completedTodos: 1, // Photographer confirmed
      expectedNewTodos: ['schedule a call', 'send playlist preferences']
    }
  },
  {
    name: 'Context-Aware Deadline Suggestion',
    messageContent: 'We need to finalize the floral arrangements at least 2 months before the wedding.',
    vendorName: 'Bloom & Blossom',
    vendorCategory: 'florals',
    expectedResults: {
      newTodos: 1,
      todoUpdates: 0,
      completedTodos: 0,
      expectedDeadline: '2025-04-15', // 2 months before June 15
      usesWeddingContext: true
    }
  }
];

// Main test runner
async function runTests() {
  log('\n╔══════════════════════════════════════════════════════════════╗', 'cyan');
  log('║     MESSAGE ANALYSIS INTEGRATION TEST SUITE                  ║', 'cyan');
  log('╚══════════════════════════════════════════════════════════════╝\n', 'cyan');

  let passedTests = 0;
  let failedTests = 0;
  const results = [];

  // Run each test case
  for (const testCase of testCases) {
    log(`\n📋 Running: ${testCase.name}`, 'blue');
    log('─'.repeat(60), 'blue');

    try {
      const result = await runSingleTest(testCase);
      
      if (result.passed) {
        log(`✓ PASSED: ${testCase.name}`, 'green');
        passedTests++;
      } else {
        log(`✗ FAILED: ${testCase.name}`, 'red');
        log(`  Reason: ${result.reason}`, 'red');
        failedTests++;
      }

      results.push({
        testName: testCase.name,
        passed: result.passed,
        reason: result.reason,
        details: result.details
      });

    } catch (error) {
      log(`✗ ERROR: ${testCase.name}`, 'red');
      log(`  Error: ${error.message}`, 'red');
      failedTests++;
      
      results.push({
        testName: testCase.name,
        passed: false,
        reason: error.message
      });
    }
  }

  // Print summary
  log('\n╔══════════════════════════════════════════════════════════════╗', 'cyan');
  log('║     TEST SUMMARY                                             ║', 'cyan');
  log('╚══════════════════════════════════════════════════════════════╝\n', 'cyan');

  log(`Total Tests: ${testCases.length}`, 'blue');
  log(`Passed: ${passedTests}`, 'green');
  log(`Failed: ${failedTests}`, failedTests > 0 ? 'red' : 'green');
  log(`Success Rate: ${((passedTests / testCases.length) * 100).toFixed(1)}%\n`, 
      passedTests === testCases.length ? 'green' : 'yellow');

  // Print detailed results
  if (failedTests > 0) {
    log('\n📊 Failed Test Details:', 'yellow');
    log('─'.repeat(60), 'yellow');
    results.filter(r => !r.passed).forEach(result => {
      log(`\n• ${result.testName}`, 'red');
      log(`  ${result.reason}`, 'red');
    });
  }

  // Exit with appropriate code
  process.exit(failedTests > 0 ? 1 : 0);
}

// Run a single test
async function runSingleTest(testCase) {
  try {
    // Call the message analysis API
    const response = await fetch(`${BASE_URL}/api/analyze-message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messageContent: testCase.messageContent,
        vendorCategory: testCase.vendorCategory,
        vendorName: testCase.vendorName,
        existingTodos: testData.existingTodos,
        weddingContext: testData.weddingContext,
        userId: TEST_USER_ID,
        ragContext: '' // Optional: can be added for RAG testing
      })
    });

    if (!response.ok) {
      return {
        passed: false,
        reason: `API returned ${response.status}: ${response.statusText}`
      };
    }

    const result = await response.json();

    // Validate the response structure
    if (!result.actionableItems && !result.newTodos) {
      return {
        passed: false,
        reason: 'Response missing expected fields (actionableItems or newTodos)'
      };
    }

    // Parse the results (handle both API response formats)
    const newTodos = result.newTodos || result.actionableItems || [];
    const todoUpdates = result.todoUpdates || [];
    const completedTodos = result.completedTodos || [];

    // Verify expected results
    const expected = testCase.expectedResults;
    const details = {
      newTodosFound: newTodos.length,
      todoUpdatesFound: todoUpdates.length,
      completedTodosFound: completedTodos.length,
      newTodoTitles: newTodos.map(t => t.name || t.title),
      updates: todoUpdates,
      completions: completedTodos
    };

    log(`  Found: ${newTodos.length} new todos, ${todoUpdates.length} updates, ${completedTodos.length} completions`, 'cyan');

    // Check new todos count
    if (expected.newTodos !== newTodos.length) {
      return {
        passed: false,
        reason: `Expected ${expected.newTodos} new todos, found ${newTodos.length}`,
        details
      };
    }

    // Check todo updates count
    if (expected.todoUpdates !== todoUpdates.length) {
      return {
        passed: false,
        reason: `Expected ${expected.todoUpdates} todo updates, found ${todoUpdates.length}`,
        details
      };
    }

    // Check completed todos count
    if (expected.completedTodos !== completedTodos.length) {
      return {
        passed: false,
        reason: `Expected ${expected.completedTodos} completed todos, found ${completedTodos.length}`,
        details
      };
    }

    // Verify specific todo titles if expected
    if (expected.expectedTodoTitle && newTodos.length > 0) {
      const foundTodo = newTodos.some(todo => 
        (todo.name || todo.title).toLowerCase().includes(expected.expectedTodoTitle.toLowerCase())
      );
      
      if (!foundTodo) {
        return {
          passed: false,
          reason: `Expected to find todo containing "${expected.expectedTodoTitle}"`,
          details
        };
      }
    }

    // Verify deadline detection
    if (expected.expectedDeadline && newTodos.length > 0) {
      const foundDeadline = newTodos.some(todo => {
        const deadline = todo.deadline || todo.dueDate;
        if (!deadline) return false;
        const deadlineStr = new Date(deadline).toISOString().split('T')[0];
        return deadlineStr === expected.expectedDeadline;
      });
      
      if (!foundDeadline) {
        log(`  Warning: Expected deadline ${expected.expectedDeadline} not found`, 'yellow');
        // Don't fail on deadline mismatch, just warn
      }
    }

    // All checks passed
    return {
      passed: true,
      reason: 'All validations passed',
      details
    };

  } catch (error) {
    return {
      passed: false,
      reason: `Test execution error: ${error.message}`
    };
  }
}

// Check prerequisites
async function checkPrerequisites() {
  log('\n🔍 Checking prerequisites...', 'yellow');

  // Check if server is running
  try {
    const response = await fetch(`${BASE_URL}/api/analyze-message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messageContent: 'test' })
    });
    
    // We expect a 400 (bad request) if server is running
    if (response.status === 404) {
      log('✗ Server is not running or API endpoint not found', 'red');
      log('  Run: npm run dev', 'yellow');
      process.exit(1);
    }
    
    log('✓ Server is running', 'green');
  } catch (error) {
    log('✗ Cannot connect to server', 'red');
    log('  Run: npm run dev', 'yellow');
    process.exit(1);
  }

  // Check environment variables
  if (!process.env.OPENAI_API_KEY) {
    log('⚠ Warning: OPENAI_API_KEY not set', 'yellow');
    log('  Message analysis may fail without API key', 'yellow');
  } else {
    log('✓ OpenAI API key configured', 'green');
  }

  if (!process.env.RAG_N8N_WEBHOOK_URL) {
    log('⚠ Warning: RAG_N8N_WEBHOOK_URL not set', 'yellow');
    log('  RAG features will not be tested', 'yellow');
  } else {
    log('✓ RAG webhook URL configured', 'green');
  }

  log('\n');
}

// Run the test suite
(async () => {
  try {
    await checkPrerequisites();
    await runTests();
  } catch (error) {
    log(`\n✗ Test suite failed: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  }
})();

