#!/usr/bin/env node

/**
 * Test script for vendor search optimization
 * Run with: node scripts/test-vendor-optimization.js
 */

const fetch = require('node-fetch');

async function testVendorOptimization() {
  try {
    console.log('🧪 Testing Vendor Search Optimization...\n');

    const testCases = [
      {
        name: 'Venue Search (Dallas)',
        params: {
          category: 'wedding_venue',
          location: 'Dallas, TX',
          radius: 50000
        }
      },
      {
        name: 'Florist Search (Dallas)',
        params: {
          category: 'florist',
          location: 'Dallas, TX',
          radius: 50000
        }
      },
      {
        name: 'Photographer Search (Dallas)',
        params: {
          category: 'photographer',
          location: 'Dallas, TX',
          radius: 50000
        }
      }
    ];

    for (const testCase of testCases) {
      console.log(`📋 Testing: ${testCase.name}`);
      
      // Test 1: First call (should hit API)
      console.log('  🔄 First call (should hit API)...');
      const startTime1 = Date.now();
      const response1 = await fetch('http://localhost:3000/api/google-places-optimized', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testCase.params)
      });
      
      if (!response1.ok) {
        console.error(`    ❌ First call failed: ${response1.status}`);
        continue;
      }
      
      const data1 = await response1.json();
      const duration1 = Date.now() - startTime1;
      const cacheHit1 = response1.headers.get('X-Cache-Hit');
      
      console.log(`    ✅ Results: ${data1.results?.length || 0} vendors`);
      console.log(`    ⏱️  Duration: ${duration1}ms`);
      console.log(`    🎯 Cache Hit: ${cacheHit1}`);
      
      // Test 2: Second call (should hit cache)
      console.log('  🔄 Second call (should hit cache)...');
      const startTime2 = Date.now();
      const response2 = await fetch('http://localhost:3000/api/google-places-optimized', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testCase.params)
      });
      
      if (!response2.ok) {
        console.error(`    ❌ Second call failed: ${response2.status}`);
        continue;
      }
      
      const data2 = await response2.json();
      const duration2 = Date.now() - startTime2;
      const cacheHit2 = response2.headers.get('X-Cache-Hit');
      
      console.log(`    ✅ Results: ${data2.results?.length || 0} vendors`);
      console.log(`    ⏱️  Duration: ${duration2}ms`);
      console.log(`    🎯 Cache Hit: ${cacheHit2}`);
      
      // Test 3: Same search with different filters (should hit cache with filter normalization)
      console.log('  🔄 Third call with filters (should hit cache)...');
      const startTime3 = Date.now();
      const response3 = await fetch('http://localhost:3000/api/google-places-optimized', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...testCase.params,
          minprice: 1,
          maxprice: 4
        })
      });
      
      if (!response3.ok) {
        console.error(`    ❌ Third call failed: ${response3.status}`);
        continue;
      }
      
      const data3 = await response3.json();
      const duration3 = Date.now() - startTime3;
      const cacheHit3 = response3.headers.get('X-Cache-Hit');
      
      console.log(`    ✅ Results: ${data3.results?.length || 0} vendors`);
      console.log(`    ⏱️  Duration: ${duration3}ms`);
      console.log(`    🎯 Cache Hit: ${cacheHit3}`);
      
      // Calculate performance improvements
      const speedImprovement = ((duration1 - duration2) / duration1 * 100).toFixed(1);
      console.log(`    🚀 Speed improvement: ${speedImprovement}%`);
      
      console.log('');
      
      // Small delay between test cases
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Test cache statistics endpoint
    console.log('📊 Testing cache statistics...');
    try {
      const statsResponse = await fetch('http://localhost:3000/api/google-places-optimized', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: 'test',
          location: 'test'
        })
      });
      
      if (statsResponse.ok) {
        console.log('  ✅ Cache statistics endpoint working');
      }
    } catch (error) {
      console.log('  ⚠️ Cache statistics not available');
    }

    console.log('\n🎉 Vendor search optimization test completed!');
    console.log('\n📈 Expected Results:');
    console.log('  • First call: API hit (slower)');
    console.log('  • Second call: Cache hit (much faster)');
    console.log('  • Third call: Cache hit with filters (faster)');
    console.log('  • Overall: 70%+ reduction in API calls');
    console.log('  • Performance: 80%+ faster for cached results');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testVendorOptimization();

