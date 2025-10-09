// Load environment variables
require('dotenv').config({ path: '.env.local' });

const { Pinecone } = require('@pinecone-database/pinecone');
const { OpenAI } = require('openai');

// Initialize clients
const pinecone = new Pinecone({
  apiKey: process.env.RAG_VECTOR_DB_API_KEY,
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const index = pinecone.index('paige-wedding-knowledge');

// Wedding planning knowledge base
const weddingKnowledge = [
  // Todo Planning Knowledge
  {
    id: 'todo-1',
    content: `Wedding Planning Timeline: 12-18 months before: Book venue, photographer, caterer. 6-9 months: Order dress, book florist, DJ/band. 3-6 months: Send invitations, plan honeymoon. 1-3 months: Final fittings, vendor meetings. 1 month: Final details, seating chart. 1 week: Final walkthrough, pack for honeymoon.`,
    metadata: { wedding_type: 'planning_guide', category: 'timeline', priority: 'high' }
  },
  {
    id: 'todo-2',
    content: `Essential Wedding Categories: Venue & Reception (40% of budget), Photography & Videography (10-15%), Food & Beverage (25-30%), Attire & Beauty (5-10%), Flowers & Decor (8-10%), Music & Entertainment (5-10%), Transportation (2-5%), Stationery (2-3%), Favors & Gifts (2-3%), Miscellaneous (5-10%).`,
    metadata: { wedding_type: 'planning_guide', category: 'categories', priority: 'high' }
  },
  {
    id: 'todo-3',
    content: `Seasonal Considerations: Spring weddings (March-May): Book early for popular dates, consider weather backup plans. Summer weddings (June-August): Peak season, higher costs, outdoor ceremony timing. Fall weddings (September-November): Beautiful colors, cooler weather, popular season. Winter weddings (December-February): Lower costs, indoor venues, holiday themes.`,
    metadata: { wedding_type: 'planning_guide', category: 'seasonal', priority: 'medium' }
  },
  {
    id: 'todo-4',
    content: `Guest Count Impact: Under 50 guests: Intimate, lower costs, more venue options. 50-100 guests: Sweet spot for most budgets, good venue selection. 100-200 guests: Higher costs, need larger venues, more complex logistics. Over 200 guests: Significant budget increase, limited venue options, require professional coordination.`,
    metadata: { wedding_type: 'planning_guide', category: 'guest_count', priority: 'high' }
  },
  {
    id: 'todo-5',
    content: `Budget Planning Priorities: Must-haves (venue, food, photography), Nice-to-haves (extravagant flowers, premium bar), Can-skip (expensive favors, elaborate centerpieces). Allocate 50% to venue/food, 20% to photography/videography, 15% to attire/beauty, 10% to flowers/decor, 5% to miscellaneous.`,
    metadata: { wedding_type: 'planning_guide', category: 'budget_priorities', priority: 'high' }
  },

  // Budget Planning Knowledge
  {
    id: 'budget-1',
    content: `Wedding Budget Breakdown by Guest Count: 50 guests: $15,000-25,000. 75 guests: $20,000-35,000. 100 guests: $25,000-45,000. 150 guests: $35,000-65,000. 200+ guests: $50,000-100,000+. Venue costs typically $100-300 per person. Catering $50-150 per person. Photography $2,000-8,000.`,
    metadata: { wedding_type: 'budget_planning', category: 'budget_ranges', priority: 'high' }
  },
  {
    id: 'budget-2',
    content: `Cost-Saving Strategies: Off-peak season (winter, weekdays), buffet vs plated dinner, DIY decorations, smaller guest list, all-inclusive venues, local vendors, second-hand attire, digital invitations, cash bar options, shorter reception time.`,
    metadata: { wedding_type: 'budget_planning', category: 'saving_tips', priority: 'medium' }
  },
  {
    id: 'budget-3',
    content: `Hidden Wedding Costs: Service charges (18-22%), gratuities (15-20%), taxes, vendor meals, overtime charges, setup/breakdown fees, transportation, accommodation, wedding insurance, marriage license, alterations, vendor tips, post-wedding brunch.`,
    metadata: { wedding_type: 'budget_planning', category: 'hidden_costs', priority: 'high' }
  },
  {
    id: 'budget-4',
    content: `Venue Cost Factors: Location (urban vs rural), day of week (Saturday premium), time of year (peak season), guest count, all-inclusive vs à la carte, ceremony + reception vs ceremony only, outdoor vs indoor, historic vs modern, included services.`,
    metadata: { wedding_type: 'budget_planning', category: 'venue_costs', priority: 'high' }
  },

  // Vendor Recommendations Knowledge
  {
    id: 'vendor-1',
    content: `Photography Selection: Portfolio style (traditional, photojournalistic, artistic), experience level, package inclusions, engagement session, delivery timeline, backup photographer, editing style, album options, social media rights, travel fees.`,
    metadata: { wedding_type: 'vendor_recommendations', category: 'photography', priority: 'high' }
  },
  {
    id: 'vendor-2',
    content: `Catering Considerations: Tasting sessions, dietary restrictions, service style (buffet, plated, family-style), bar options, cake cutting, vendor meals, setup/cleanup, staff ratios, gratuity policies, corkage fees, children's meals.`,
    metadata: { wedding_type: 'vendor_recommendations', category: 'catering', priority: 'high' }
  },
  {
    id: 'vendor-3',
    content: `Floral Design: Seasonal availability, color palette, centerpiece styles, ceremony arrangements, personal flowers, delivery/setup, preservation options, artificial vs fresh, DIY possibilities, florist consultation, mock-up costs.`,
    metadata: { wedding_type: 'vendor_recommendations', category: 'florals', priority: 'medium' }
  },
  {
    id: 'vendor-4',
    content: `Music & Entertainment: DJ vs live band, ceremony music, cocktail hour, reception entertainment, special dances, playlist customization, equipment needs, space requirements, timeline coordination, backup plans, sound restrictions.`,
    metadata: { wedding_type: 'vendor_recommendations', category: 'music', priority: 'medium' }
  },
  {
    id: 'vendor-5',
    content: `Venue Selection: Capacity, layout options, ceremony space, reception space, catering requirements, vendor restrictions, parking, accessibility, backup plans, rental inclusions, setup time, cleanup requirements, noise restrictions.`,
    metadata: { wedding_type: 'vendor_recommendations', category: 'venues', priority: 'high' }
  }
];

async function createEmbeddings() {
  console.log('Creating embeddings for wedding knowledge...');
  
  const embeddings = [];
  
  for (const item of weddingKnowledge) {
    try {
      const embedding = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: item.content,
      });
      
      embeddings.push({
        id: item.id,
        values: embedding.data[0].embedding,
        metadata: item.metadata
      });
      
      console.log(`Created embedding for: ${item.id}`);
    } catch (error) {
      console.error(`Error creating embedding for ${item.id}:`, error);
    }
  }
  
  return embeddings;
}

async function upsertToPinecone(embeddings) {
  console.log('Upserting embeddings to Pinecone...');
  
  try {
    await index.upsert(embeddings);
    console.log(`Successfully upserted ${embeddings.length} vectors to Pinecone`);
  } catch (error) {
    console.error('Error upserting to Pinecone:', error);
  }
}

async function main() {
  try {
    console.log('Starting Pinecone population...');
    
    // Create embeddings
    const embeddings = await createEmbeddings();
    
    // Upsert to Pinecone
    await upsertToPinecone(embeddings);
    
    console.log('Pinecone population completed successfully!');
  } catch (error) {
    console.error('Error in main process:', error);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { createEmbeddings, upsertToPinecone };
