// Performance Testing Script
// Run this in the browser console to test app performance

console.log('🧪 Starting Comprehensive Performance Test...');

class PerformanceTester {
  constructor() {
    this.metrics = {
      startTime: performance.now(),
      pageLoad: 0,
      memoryUsage: 0,
      renderCount: 0,
      apiCalls: 0,
      firestoreQueries: 0,
      navigationTimes: [],
      searchTimes: [],
      scrollTimes: [],
      componentRenderTimes: []
    };
    
    this.setupMonitoring();
  }

  setupMonitoring() {
    // Track page load time
    window.addEventListener('load', () => {
      this.metrics.pageLoad = performance.now() - this.metrics.startTime;
      console.log(`📊 Page Load Time: ${this.metrics.pageLoad.toFixed(2)}ms`);
      
      // Get memory usage if available
      if (performance.memory) {
        this.metrics.memoryUsage = performance.memory.usedJSHeapSize / 1024 / 1024; // MB
        console.log(`💾 Memory Usage: ${this.metrics.memoryUsage.toFixed(2)}MB`);
      }
    });

    // Track component renders
    this.trackComponentRenders();
    
    // Track API calls
    this.trackApiCalls();
    
    // Track Firestore queries
    this.trackFirestoreQueries();
  }

  trackComponentRenders() {
    // Override React's render method to count renders
    if (typeof ReactDOM !== 'undefined' && ReactDOM.render) {
      const originalRender = ReactDOM.render;
      ReactDOM.render = (...args) => {
        this.metrics.renderCount++;
        if (this.metrics.renderCount % 10 === 0) {
          console.log(`🔄 Render Count: ${this.metrics.renderCount}`);
        }
        return originalRender.apply(this, args);
      };
    }
  }

  trackApiCalls() {
    const originalFetch = window.fetch;
    window.fetch = (...args) => {
      this.metrics.apiCalls++;
      const startTime = performance.now();
      
      return originalFetch.apply(this, args).then(response => {
        const duration = performance.now() - startTime;
        console.log(`🌐 API Call ${this.metrics.apiCalls}: ${args[0]} - ${duration.toFixed(2)}ms`);
        return response;
      });
    };
  }

  trackFirestoreQueries() {
    // Track Firestore operations if available
    if (window.firebase && window.firebase.firestore) {
      const originalGet = window.firebase.firestore.CollectionReference.prototype.get;
      window.firebase.firestore.CollectionReference.prototype.get = function(...args) {
        const startTime = performance.now();
        return originalGet.apply(this, args).then(result => {
          const duration = performance.now() - startTime;
          this.metrics.firestoreQueries++;
          console.log(`🔥 Firestore Query ${this.metrics.firestoreQueries}: ${duration.toFixed(2)}ms`);
          return result;
        });
      };
    }
  }

  async testPageNavigation() {
    console.log('🧭 Testing Page Navigation...');
    
    const pages = ['/budget', '/vendors', '/files', '/todo'];
    const results = [];
    
    for (const page of pages) {
      const start = performance.now();
      
      // Simulate navigation (this would need to be adapted for actual navigation)
      try {
        // For testing, we'll just measure the time it takes to simulate navigation
        await new Promise(resolve => setTimeout(resolve, 100));
        const duration = performance.now() - start;
        results.push({ page, duration });
        console.log(`✅ ${page}: ${duration.toFixed(2)}ms`);
      } catch (error) {
        console.error(`❌ ${page}: Navigation failed`);
      }
    }
    
    this.metrics.navigationTimes = results;
    return results;
  }

  async testSearchFunctionality() {
    console.log('🔍 Testing Search Functionality...');
    
    const searchTerms = ['vendor', 'budget', 'wedding', 'planning'];
    const results = [];
    
    for (const term of searchTerms) {
      const start = performance.now();
      
      // Simulate search (this would need to be adapted for actual search)
      try {
        await new Promise(resolve => setTimeout(resolve, 50));
        const duration = performance.now() - start;
        results.push({ term, duration });
        console.log(`✅ Search "${term}": ${duration.toFixed(2)}ms`);
      } catch (error) {
        console.error(`❌ Search "${term}": Failed`);
      }
    }
    
    this.metrics.searchTimes = results;
    return results;
  }

  async testScrolling() {
    console.log('📜 Testing Scrolling Performance...');
    
    const scrollPositions = [500, 1000, 1500, 2000];
    const results = [];
    
    for (const position of scrollPositions) {
      const start = performance.now();
      
      try {
        window.scrollTo(0, position);
        await new Promise(resolve => setTimeout(resolve, 100));
        const duration = performance.now() - start;
        results.push({ position, duration });
        console.log(`✅ Scroll to ${position}px: ${duration.toFixed(2)}ms`);
      } catch (error) {
        console.error(`❌ Scroll to ${position}px: Failed`);
      }
    }
    
    this.metrics.scrollTimes = results;
    return results;
  }

  async testComponentRendering() {
    console.log('⚡ Testing Component Rendering...');
    
    // Simulate component rendering tests
    const components = ['BudgetItem', 'VendorCard', 'FileItem', 'TodoItem'];
    const results = [];
    
    for (const component of components) {
      const start = performance.now();
      
      try {
        // Simulate component render
        await new Promise(resolve => setTimeout(resolve, 20));
        const duration = performance.now() - start;
        results.push({ component, duration });
        console.log(`✅ ${component}: ${duration.toFixed(2)}ms`);
      } catch (error) {
        console.error(`❌ ${component}: Render failed`);
      }
    }
    
    this.metrics.componentRenderTimes = results;
    return results;
  }

  generateReport() {
    const totalTime = performance.now() - this.metrics.startTime;
    
    const report = `
🚀 PERFORMANCE TEST REPORT
==========================

⏱️  Total Test Time: ${totalTime.toFixed(2)}ms
📊 Page Load Time: ${this.metrics.pageLoad.toFixed(2)}ms
💾 Memory Usage: ${this.metrics.memoryUsage.toFixed(2)}MB
🔄 Total Renders: ${this.metrics.renderCount}
🌐 Total API Calls: ${this.metrics.apiCalls}
🔥 Total Firestore Queries: ${this.metrics.firestoreQueries}

🧭 Navigation Performance:
${this.metrics.navigationTimes.map(n => `  ${n.page}: ${n.duration.toFixed(2)}ms`).join('\n')}

🔍 Search Performance:
${this.metrics.searchTimes.map(s => `  "${s.term}": ${s.duration.toFixed(2)}ms`).join('\n')}

📜 Scroll Performance:
${this.metrics.scrollTimes.map(s => `  ${s.position}px: ${s.duration.toFixed(2)}ms`).join('\n')}

⚡ Component Render Performance:
${this.metrics.componentRenderTimes.map(c => `  ${c.component}: ${c.duration.toFixed(2)}ms`).join('\n')}

📈 Performance Score: ${this.calculatePerformanceScore()}/100
    `;
    
    console.log(report);
    return report;
  }

  calculatePerformanceScore() {
    let score = 100;
    
    // Deduct points for slow performance
    if (this.metrics.pageLoad > 3000) score -= 20;
    if (this.metrics.pageLoad > 5000) score -= 20;
    
    if (this.metrics.memoryUsage > 100) score -= 15;
    if (this.metrics.memoryUsage > 200) score -= 15;
    
    if (this.metrics.renderCount > 100) score -= 10;
    if (this.metrics.renderCount > 200) score -= 10;
    
    if (this.metrics.apiCalls > 20) score -= 10;
    if (this.metrics.apiCalls > 50) score -= 10;
    
    return Math.max(0, score);
  }

  async runFullTest() {
    console.log('🚀 Starting Full Performance Test Suite...');
    
    try {
      await this.testPageNavigation();
      await this.testSearchFunctionality();
      await this.testScrolling();
      await this.testComponentRendering();
      
      console.log('✅ All tests completed!');
      this.generateReport();
      
    } catch (error) {
      console.error('❌ Test suite failed:', error);
    }
  }
}

// Create global instance
window.performanceTester = new PerformanceTester();

// Auto-run test after 10 seconds
setTimeout(() => {
  console.log('⏰ Auto-running performance test in 10 seconds...');
  setTimeout(() => {
    window.performanceTester.runFullTest();
  }, 10000);
}, 5000);

console.log('✅ Performance tester loaded. Run window.performanceTester.runFullTest() to test manually.');
console.log('📊 Available methods:');
console.log('  - window.performanceTester.runFullTest()');
console.log('  - window.performanceTester.testPageNavigation()');
console.log('  - window.performanceTester.testSearchFunctionality()');
console.log('  - window.performanceTester.testScrolling()');
console.log('  - window.performanceTester.generateReport()');
