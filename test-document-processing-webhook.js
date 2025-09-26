/**
 * Test script for the PAIGE Document Processing N8N Webhook
 * 
 * This script tests the document processing webhook endpoint with sample wedding documents
 * to verify the workflow is working correctly.
 */

const https = require('https');

// Your n8n webhook URL
const WEBHOOK_URL = 'https://paigewedding.app.n8n.cloud/webhook/paige-rag/process-document';

// Test data - sample wedding planning documents
const testDocuments = [
  {
    name: "Wedding Timeline Guide",
    data: {
      document_id: "timeline-guide-001",
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
- Start premarital counseling

3-5 Months Before:
- Finalize menu and cake
- Order wedding rings
- Plan rehearsal dinner
- Book hotel blocks
- Schedule fittings

1-2 Months Before:
- Send invitations
- Finalize details with vendors
- Plan ceremony and reception timeline
- Get marriage license
- Plan bachelor/bachelorette parties

1-2 Weeks Before:
- Confirm all vendors
- Pack for honeymoon
- Prepare wedding day emergency kit
- Rehearse ceremony
- Relax and enjoy!`,
      source: "wedding-guides/timeline.md",
      user_id: "test-user-123",
      document_type: "wedding_guide"
    }
  },
  {
    name: "Vendor Checklist",
    data: {
      document_id: "vendor-checklist-001",
      document_content: `Wedding Vendor Checklist

VENUE:
□ Venue booked and contract signed
□ Site visit completed
□ Layout and seating plan confirmed
□ Catering options reviewed
□ Alcohol policy confirmed
□ Parking arrangements
□ Backup plan for weather

PHOTOGRAPHY:
□ Photographer booked
□ Engagement photos scheduled
□ Shot list prepared
□ Timeline for wedding day
□ Second shooter (if needed)
□ Photo booth (if desired)

VIDEOGRAPHY:
□ Videographer booked
□ Style preferences discussed
□ Highlight reel requirements
□ Full ceremony recording
□ Reception coverage plan

MUSIC:
□ DJ or band booked
□ Song list prepared
□ Special songs for ceremony
□ Do-not-play list
□ Equipment requirements
□ Sound system check

FLOWERS:
□ Florist booked
□ Bouquet design confirmed
□ Centerpiece design
□ Ceremony decorations
□ Delivery and setup time
□ Backup plan for flowers

CATERING:
□ Caterer booked
□ Menu tasting completed
□ Final guest count
□ Dietary restrictions noted
□ Service style confirmed
□ Cake design and flavor`,
      source: "wedding-guides/vendor-checklist.md",
      user_id: "test-user-123",
      document_type: "wedding_guide"
    }
  },
  {
    name: "Budget Planning Guide",
    data: {
      document_id: "budget-guide-001",
      document_content: `Wedding Budget Planning Guide

TYPICAL WEDDING BUDGET BREAKDOWN:

Venue & Catering (40-50%):
- Reception venue rental
- Food and beverages
- Service charges and gratuities
- Bar service and alcohol

Photography & Videography (10-15%):
- Photography package
- Videography package
- Engagement photos
- Albums and prints

Flowers & Decorations (8-10%):
- Bridal bouquet
- Bridesmaids bouquets
- Boutonnieres and corsages
- Ceremony decorations
- Reception centerpieces

Music & Entertainment (8-10%):
- DJ or live band
- Ceremony music
- Reception entertainment
- Sound system rental

Attire & Beauty (5-8%):
- Wedding dress
- Groom's attire
- Hair and makeup
- Accessories and shoes

Transportation (2-3%):
- Wedding party transportation
- Guest transportation
- Special vehicle rental

Miscellaneous (10-15%):
- Wedding planner
- Invitations and stationery
- Wedding rings
- Marriage license
- Emergency fund

MONEY-SAVING TIPS:
- Consider off-peak season dates
- Choose a non-traditional venue
- Limit guest list
- DIY decorations
- Skip expensive extras
- Negotiate with vendors
- Book early for better rates`,
      source: "wedding-guides/budget-guide.md",
      user_id: "test-user-123",
      document_type: "wedding_guide"
    }
  }
];

// Function to make HTTP request
function makeRequest(url, data) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);
    
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(url, options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsedData = JSON.parse(responseData);
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: parsedData
          });
        } catch (error) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: responseData
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

// Function to test a single document
async function testDocument(testCase) {
  console.log(`\n🧪 Testing: ${testCase.name}`);
  console.log('─'.repeat(50));
  
  try {
    const response = await makeRequest(WEBHOOK_URL, testCase.data);
    
    console.log(`✅ Status: ${response.statusCode}`);
    
    if (response.statusCode === 200) {
      console.log('✅ Document processed successfully!');
      
      if (response.data.success) {
        console.log('✅ Processing completed successfully!');
        
        const result = response.data;
        console.log(`📄 Document ID: ${result.document_id || 'N/A'}`);
        console.log(`📊 Chunks Created: ${result.chunks_created || 'N/A'}`);
        console.log(`🔗 Embeddings Generated: ${result.embeddings_created || 'N/A'}`);
        console.log(`📚 Pinecone Records: ${result.pinecone_records || 'N/A'}`);
        
        if (result.metadata) {
          console.log('\n📋 Processing Metadata:');
          console.log(`- Processing Time: ${result.metadata.processing_time || 'N/A'}`);
          console.log(`- Content Length: ${result.metadata.content_length || 'N/A'}`);
          console.log(`- Chunk Size: ${result.metadata.chunk_size || 'N/A'}`);
          console.log(`- Overlap: ${result.metadata.overlap || 'N/A'}`);
        }
        
        if (result.chunks && result.chunks.length > 0) {
          console.log('\n📝 Sample Chunks:');
          result.chunks.slice(0, 2).forEach((chunk, index) => {
            console.log(`  ${index + 1}. ID: ${chunk.id}`);
            console.log(`     Content: ${chunk.content.substring(0, 100)}...`);
            console.log(`     Index: ${chunk.chunk_index}`);
          });
        }
        
      } else {
        console.log('❌ Processing failed:', result.error || 'Unknown error');
      }
      
    } else {
      console.log(`❌ HTTP Error: ${response.statusCode}`);
      console.log('Response:', JSON.stringify(response.data, null, 2));
    }
    
  } catch (error) {
    console.log(`❌ Request failed: ${error.message}`);
  }
}

// Function to run all tests
async function runAllTests() {
  console.log('🚀 Starting PAIGE Document Processing Webhook Tests');
  console.log('='.repeat(60));
  console.log(`Webhook URL: ${WEBHOOK_URL}`);
  console.log(`Test Documents: ${testDocuments.length}`);
  
  for (const testCase of testDocuments) {
    await testDocument(testCase);
    
    // Add delay between requests to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.log('\n🏁 All tests completed!');
  console.log('='.repeat(60));
}

// Run the tests
runAllTests().catch(console.error);
