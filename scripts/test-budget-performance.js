#!/usr/bin/env node

/**
 * 🚀 Budget Metrics Performance Testing Script
 * 
 * This script tests the performance of budget metrics components
 * with various data sizes and scenarios.
 */

const fs = require('fs');
const path = require('path');

// Performance test scenarios
const testScenarios = [
  {
    name: 'Small Dataset',
    budgetItems: 10,
    categories: 5,
    description: 'Typical user with few budget items'
  },
  {
    name: 'Medium Dataset',
    budgetItems: 50,
    categories: 10,
    description: 'Active user with moderate budget complexity'
  },
  {
    name: 'Large Dataset',
    budgetItems: 200,
    categories: 20,
    description: 'Power user with extensive budget tracking'
  },
  {
    name: 'Extreme Dataset',
    budgetItems: 1000,
    categories: 50,
    description: 'Enterprise-level budget management'
  }
];

// Generate test data
function generateTestData(scenario) {
  const budgetItems = [];
  const categories = [];
  
  // Generate categories
  for (let i = 0; i < scenario.categories; i++) {
    categories.push({
      id: `category-${i}`,
      name: `Category ${i + 1}`,
      allocatedAmount: Math.floor(Math.random() * 10000) + 1000,
      spentAmount: Math.floor(Math.random() * 8000) + 500
    });
  }
  
  // Generate budget items
  for (let i = 0; i < scenario.budgetItems; i++) {
    const categoryIndex = Math.floor(Math.random() * scenario.categories);
    budgetItems.push({
      id: `item-${i}`,
      name: `Budget Item ${i + 1}`,
      amount: Math.floor(Math.random() * 1000) + 100,
      categoryId: categories[categoryIndex].id
    });
  }
  
  return { budgetItems, categories };
}

// Performance metrics
function measurePerformance(operation, iterations = 1000) {
  const start = performance.now();
  
  for (let i = 0; i < iterations; i++) {
    operation();
  }
  
  const end = performance.now();
  const totalTime = end - start;
  const avgTime = totalTime / iterations;
  
  return {
    totalTime: totalTime.toFixed(2),
    avgTime: avgTime.toFixed(4),
    iterations
  };
}

// Test component rendering performance
function testComponentPerformance(scenario) {
  console.log(`\n🔍 Testing: ${scenario.name}`);
  console.log(`   ${scenario.description}`);
  console.log(`   Budget Items: ${scenario.budgetItems}`);
  console.log(`   Categories: ${scenario.categories}`);
  
  const { budgetItems, categories } = generateTestData(scenario);
  
  // Test data processing performance
  const dataProcessing = measurePerformance(() => {
    // Simulate budget calculations
    const totalSpent = budgetItems.reduce((sum, item) => sum + item.amount, 0);
    const categoryTotals = categories.map(cat => {
      const items = budgetItems.filter(item => item.categoryId === cat.id);
      return items.reduce((sum, item) => sum + item.amount, 0);
    });
    
    return { totalSpent, categoryTotals };
  });
  
  // Test SVG path calculations (for doughnut chart)
  const svgCalculations = measurePerformance(() => {
    budgetItems.forEach((item, index) => {
      const percentage = (item.amount / 1000) * 100;
      const startAngle = (index / budgetItems.length) * 360;
      const endAngle = ((index + 1) / budgetItems.length) * 360;
      
      // Simulate SVG path calculations
      const startRadians = (startAngle - 90) * Math.PI / 180;
      const endRadians = (endAngle - 90) * Math.PI / 180;
      
      return { startRadians, endRadians, percentage };
    });
  });
  
  // Test color assignment
  const colorAssignment = measurePerformance(() => {
    const colors = [
      '#2563eb', '#16a34a', '#9333ea', '#ea580c', '#4f46e5',
      '#0d9488', '#db2777', '#84cc16', '#d97706', '#dc2626'
    ];
    
    budgetItems.forEach((item, index) => {
      const color = colors[index % colors.length];
      return { itemId: item.id, color };
    });
  });
  
  console.log(`\n   📊 Performance Results:`);
  console.log(`      Data Processing: ${dataProcessing.avgTime}ms avg (${dataProcessing.totalTime}ms total)`);
  console.log(`      SVG Calculations: ${svgCalculations.avgTime}ms avg (${svgCalculations.totalTime}ms total)`);
  console.log(`      Color Assignment: ${colorAssignment.avgTime}ms avg (${colorAssignment.totalTime}ms total)`);
  
  // Performance thresholds
  const thresholds = {
    dataProcessing: 0.1,    // 0.1ms per operation
    svgCalculations: 0.05,  // 0.05ms per operation
    colorAssignment: 0.01   // 0.01ms per operation
  };
  
  // Check if performance meets thresholds
  const dataProcessingPass = parseFloat(dataProcessing.avgTime) < thresholds.dataProcessing;
  const svgCalculationsPass = parseFloat(svgCalculations.avgTime) < thresholds.svgCalculations;
  const colorAssignmentPass = parseFloat(colorAssignment.avgTime) < thresholds.colorAssignment;
  
  console.log(`\n   ✅ Performance Status:`);
  console.log(`      Data Processing: ${dataProcessingPass ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`      SVG Calculations: ${svgCalculationsPass ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`      Color Assignment: ${colorAssignmentPass ? '✅ PASS' : '❌ FAIL'}`);
  
  return {
    scenario: scenario.name,
    dataProcessing,
    svgCalculations,
    colorAssignment,
    passed: dataProcessingPass && svgCalculationsPass && colorAssignmentPass
  };
}

// Memory usage test
function testMemoryUsage(scenario) {
  const { budgetItems, categories } = generateTestData(scenario);
  
  // Simulate component state
  const componentState = {
    selectedCategory: categories[0],
    totalBudget: categories.reduce((sum, cat) => sum + cat.allocatedAmount, 0),
    totalSpent: budgetItems.reduce((sum, item) => sum + item.amount, 0),
    maxBudget: 50000,
    budgetItems: budgetItems,
    animatingValues: {
      categoryAllocated: false,
      totalBudget: false,
      maxBudget: false
    }
  };
  
  // Estimate memory usage (rough calculation)
  const estimatedMemory = {
    budgetItems: budgetItems.length * 200,        // ~200 bytes per item
    categories: categories.length * 300,          // ~300 bytes per category
    componentState: JSON.stringify(componentState).length * 2, // JSON string + object overhead
    total: 0
  };
  
  estimatedMemory.total = estimatedMemory.budgetItems + estimatedMemory.categories + estimatedMemory.componentState;
  
  console.log(`\n   💾 Memory Usage Estimate:`);
  console.log(`      Budget Items: ${(estimatedMemory.budgetItems / 1024).toFixed(2)} KB`);
  console.log(`      Categories: ${(estimatedMemory.categories / 1024).toFixed(2)} KB`);
  console.log(`      Component State: ${(estimatedMemory.componentState / 1024).toFixed(2)} KB`);
  console.log(`      Total: ${(estimatedMemory.total / 1024).toFixed(2)} KB`);
  
  return estimatedMemory;
}

// Main test execution
async function runPerformanceTests() {
  console.log('🚀 Budget Metrics Performance Testing Suite');
  console.log('==========================================');
  
  const results = [];
  
  for (const scenario of testScenarios) {
    const performanceResult = testComponentPerformance(scenario);
    const memoryResult = testMemoryUsage(scenario);
    
    results.push({
      ...performanceResult,
      memory: memoryResult
    });
  }
  
  // Summary report
  console.log('\n📋 Performance Test Summary');
  console.log('============================');
  
  const passedTests = results.filter(r => r.passed).length;
  const totalTests = results.length;
  
  console.log(`\nOverall Results: ${passedTests}/${totalTests} scenarios passed`);
  
  results.forEach(result => {
    const status = result.passed ? '✅ PASS' : '❌ FAIL';
    console.log(`   ${result.scenario}: ${status}`);
  });
  
  // Recommendations
  console.log('\n💡 Performance Recommendations');
  console.log('==============================');
  
  if (passedTests === totalTests) {
    console.log('   🎉 All performance tests passed! Your budget metrics are optimized.');
    console.log('   🔍 Consider monitoring real-world performance with React DevTools.');
  } else {
    console.log('   ⚠️  Some performance tests failed. Consider:');
    console.log('      • Implementing React.memo for expensive components');
    console.log('      • Using useMemo for complex calculations');
    console.log('      • Optimizing SVG rendering for large datasets');
    console.log('      • Implementing virtual scrolling for 1000+ items');
  }
  
  // Save results to file
  const resultsFile = path.join(__dirname, 'budget-performance-results.json');
  fs.writeFileSync(resultsFile, JSON.stringify(results, null, 2));
  console.log(`\n📁 Detailed results saved to: ${resultsFile}`);
}

// Run tests if script is executed directly
if (require.main === module) {
  runPerformanceTests().catch(console.error);
}

module.exports = {
  testComponentPerformance,
  testMemoryUsage,
  generateTestData,
  runPerformanceTests
};
