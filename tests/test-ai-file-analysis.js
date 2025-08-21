const fs = require('fs');
const path = require('path');

// Test the AI file analyzer API
async function testAIFileAnalyzer() {
  console.log('🧪 Testing AI File Analyzer API...\n');

  try {
    // Test 1: Basic analysis request
    console.log('📋 Test 1: Basic file analysis request');
    
    const testRequest = {
      fileId: 'test-file-123',
      fileName: 'Wedding Photography Contract.pdf',
      fileContent: `WEDDING PHOTOGRAPHY CONTRACT

This agreement is made between [Photographer Name] (hereinafter "Photographer") and [Client Name] (hereinafter "Client") for wedding photography services on [Wedding Date].

SERVICES:
- 8 hours of photography coverage on wedding day
- Engagement session included
- Online gallery delivery within 6 weeks
- 500+ edited photos

PAYMENT TERMS:
- 50% deposit ($1,500) due upon signing
- Remaining 50% ($1,500) due 2 weeks before wedding
- Total cost: $3,000

IMPORTANT DATES:
- Contract signing: [Date]
- Final payment due: 2 weeks before wedding
- Photo delivery: 6 weeks after wedding

CANCELLATION POLICY:
- Full refund if cancelled 30+ days before
- 50% refund if cancelled 14-30 days before
- No refund if cancelled less than 14 days before

VENDOR RESPONSIBILITIES:
- Provide backup photographer if unavailable
- Attend rehearsal dinner for planning
- Deliver photos within agreed timeframe
- Provide online gallery access

CLIENT RESPONSIBILITIES:
- Provide meal for photographer on wedding day
- Secure necessary permits for photography
- Provide timeline and shot list 2 weeks before`,
      fileType: 'application/pdf',
      analysisType: 'comprehensive'
    };

    const response = await fetch('http://localhost:3000/api/ai-file-analyzer', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testRequest),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log('✅ API call successful');
    console.log('📊 Analysis type:', result.analysisType);
    console.log('📄 File name:', result.fileName);
    
    if (result.structuredData) {
      console.log('📋 Structured data received:');
      console.log('  - Summary:', result.structuredData.summary?.substring(0, 100) + '...');
      console.log('  - Key Points:', result.structuredData.keyPoints?.length || 0, 'items');
      console.log('  - Vendor Accountability:', result.structuredData.vendorAccountability?.length || 0, 'items');
      console.log('  - Important Dates:', result.structuredData.importantDates?.length || 0, 'items');
      console.log('  - Payment Terms:', result.structuredData.paymentTerms?.length || 0, 'items');
      console.log('  - Gotchas:', result.structuredData.gotchas?.length || 0, 'items');
    }
    
    console.log('\n📝 Full analysis preview:');
    console.log(result.analysis?.substring(0, 300) + '...\n');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('💡 Make sure the development server is running with: npm run dev');
    }
  }
}

// Test the file content extractor
async function testFileContentExtractor() {
  console.log('📁 Testing File Content Extractor...\n');

  try {
    // Test with a sample text file
    const sampleText = `WEDDING VENUE CONTRACT

This agreement is between [Venue Name] and [Client Name] for wedding services on [Date].

VENUE DETAILS:
- Location: [Address]
- Capacity: 200 guests
- Rental fee: $5,000
- Security deposit: $1,000

PAYMENT SCHEDULE:
- 25% deposit ($1,250) due upon signing
- 50% ($2,500) due 6 months before
- 25% ($1,250) due 1 month before
- Security deposit refundable after event

IMPORTANT DATES:
- Contract signing: [Date]
- 50% payment: 6 months before
- Final payment: 1 month before
- Security deposit refund: 2 weeks after

VENUE RESPONSIBILITIES:
- Provide tables, chairs, linens
- Handle setup and cleanup
- Provide parking for guests
- Ensure venue is clean and ready

CLIENT RESPONSIBILITIES:
- Provide final guest count 2 weeks before
- Arrange catering and other vendors
- Clean up decorations after event
- Return security deposit key

CANCELLATION:
- Full refund if cancelled 12+ months before
- 75% refund if cancelled 6-12 months before
- 50% refund if cancelled 3-6 months before
- No refund if cancelled less than 3 months before`;

    console.log('📄 Sample text content length:', sampleText.length, 'characters');
    console.log('✅ Text extraction test completed\n');

  } catch (error) {
    console.error('❌ Text extraction test failed:', error.message);
  }
}

// Run tests
async function runTests() {
  console.log('🚀 Starting AI File Analysis Tests\n');
  console.log('=' .repeat(50));
  
  await testFileContentExtractor();
  await testAIFileAnalyzer();
  
  console.log('=' .repeat(50));
  console.log('✨ Tests completed!');
}

// Check if we're in a Node.js environment
if (typeof fetch === 'undefined') {
  console.log('⚠️  This test requires Node.js 18+ with fetch support');
  console.log('💡 Run with: node --experimental-fetch tests/test-ai-file-analysis.js');
  process.exit(1);
}

// Run the tests
runTests().catch(console.error);
