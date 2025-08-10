// Performance Test Script
// Run this in the browser console to test current performance

console.log('🧪 Starting Performance Test...');

// Performance metrics
const metrics = {
  startTime: performance.now(),
  pageLoad: 0,
  memoryUsage: 0,
  renderCount: 0,
  apiCalls: 0,
  firestoreQueries: 0
};

// Track page load time
window.addEventListener('load', () => {
  metrics.pageLoad = performance.now() - metrics.startTime;
  console.log(`📊 Page Load Time: ${metrics.pageLoad.toFixed(2)}ms`);
  
  // Get memory usage if available
  if (performance.memory) {
    metrics.memoryUsage = performance.memory.usedJSHeapSize / 1024 / 1024; // MB
    console.log(`💾 Memory Usage: ${metrics.memoryUsage.toFixed(2)}MB`);
  }
});

// Track component renders
let renderCount = 0;
const originalRender = ReactDOM.render;
if (typeof ReactDOM !== 'undefined') {
  ReactDOM.render = function(...args) {
    renderCount++;
    metrics.renderCount = renderCount;
    if (renderCount % 10 === 0) {
      console.log(`🔄 Render Count: ${renderCount}`);
    }
    return originalRender.apply(this, args);
  };
}

// Track API calls
const originalFetch = window.fetch;
window.fetch = function(...args) {
  metrics.apiCalls++;
  const startTime = performance.now();
  
  return originalFetch.apply(this, args).then(response => {
    const duration = performance.now() - startTime;
    console.log(`🌐 API Call ${metrics.apiCalls}: ${args[0]} - ${duration.toFixed(2)}ms`);
    return response;
  });
};

// Performance test functions
window.runPerformanceTest = () => {
  console.log('🚀 Running Performance Test...');
  
  // Test page navigation
  const testNavigation = () => {
    const start = performance.now();
    // Simulate navigation
    setTimeout(() => {
      const duration = performance.now() - start;
      console.log(`🧭 Navigation Test: ${duration.toFixed(2)}ms`);
    }, 100);
  };
  
  // Test search functionality
  const testSearch = () => {
    const start = performance.now();
    // Simulate search
    setTimeout(() => {
      const duration = performance.now() - start;
      console.log(`🔍 Search Test: ${duration.toFixed(2)}ms`);
    }, 100);
  };
  
  // Test scrolling
  const testScrolling = () => {
    const start = performance.now();
    window.scrollTo(0, 1000);
    setTimeout(() => {
      const duration = performance.now() - start;
      console.log(`📜 Scroll Test: ${duration.toFixed(2)}ms`);
    }, 100);
  };
  
  testNavigation();
  testSearch();
  testScrolling();
  
  // Final metrics
  setTimeout(() => {
    console.log('📊 Final Performance Metrics:');
    console.log(`⏱️  Total Time: ${(performance.now() - metrics.startTime).toFixed(2)}ms`);
    console.log(`🔄 Total Renders: ${metrics.renderCount}`);
    console.log(`🌐 Total API Calls: ${metrics.apiCalls}`);
    console.log(`💾 Memory Usage: ${metrics.memoryUsage.toFixed(2)}MB`);
  }, 1000);
};

// Auto-run test after 5 seconds
setTimeout(() => {
  console.log('⏰ Auto-running performance test in 5 seconds...');
  setTimeout(window.runPerformanceTest, 5000);
}, 5000);

console.log('✅ Performance test script loaded. Run window.runPerformanceTest() to test manually.');
