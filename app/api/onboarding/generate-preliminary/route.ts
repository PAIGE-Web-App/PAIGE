import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface WeddingData {
  userName: string;
  partnerName: string;
  weddingDate: string | null;
  weddingLocation: string;
  selectedVenueMetadata: any | null;
  maxBudget: number;
  guestCount: number;
  vibe: string[];
  additionalContext?: string;
}

export async function POST(req: NextRequest) {
  try {
    console.log('🚀 Starting generate-preliminary API...');
    
    const { userId, weddingData }: { userId: string; weddingData: WeddingData } = await req.json();
    console.log('📝 Received data:', { userId, weddingData: weddingData ? 'present' : 'missing' });

    if (!userId || !weddingData) {
      console.log('❌ Missing required data');
      return NextResponse.json({ error: 'Missing required data' }, { status: 400 });
    }

    console.log('🔧 Getting Firebase Admin DB...');
    const adminDb = getAdminDb();
    if (!adminDb) {
      console.log('❌ Database not available');
      return NextResponse.json({ error: 'Database not available' }, { status: 500 });
    }
    console.log('✅ Firebase Admin DB connected');

    // Prepare the wedding context for AI
    const weddingContext = `
Wedding Planning Details:
- Couple: ${weddingData.userName} & ${weddingData.partnerName}
- Wedding Date: ${weddingData.weddingDate ? new Date(weddingData.weddingDate).toLocaleDateString() : 'TBD'}
- Location: ${weddingData.weddingLocation || 'TBD'}
- Venue: ${weddingData.selectedVenueMetadata?.name || 'TBD'}
- Budget: $${weddingData.maxBudget.toLocaleString()}
- Guest Count: ${weddingData.guestCount}
- Wedding Style/Vibe: ${weddingData.vibe.join(', ') || 'TBD'}
- Additional Context: ${weddingData.additionalContext || 'None provided'}
`;

    console.log('Generating preliminary content for:', weddingData.userName, '&', weddingData.partnerName);

    // Generate todos using OpenAI
    const todoPrompt = `
You are Paige, an AI wedding planning assistant. Based on the following wedding details, create a comprehensive, personalized to-do list for this couple.

${weddingContext}

Create a realistic to-do list with:
1. 15-20 essential wedding planning tasks
2. Realistic deadlines based on their wedding date (if provided)
3. Priority levels (High, Medium, Low)
4. Categories (Planning, Venue, Vendors, Attire, etc.)
5. Specific, actionable tasks

Return ONLY a JSON array with this structure:
[
  {
    "title": "Task name",
    "category": "Category name",
    "deadline": "YYYY-MM-DD or 'TBD'",
    "priority": "High/Medium/Low",
    "description": "Brief description of what needs to be done"
  }
]
`;

    console.log('🤖 Calling OpenAI for todos...');
    const todoResponse = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: todoPrompt }],
      temperature: 0.7,
    });

    console.log('✅ OpenAI todos response received');
    const todoContent = todoResponse.choices[0].message.content || '[]';
    console.log('📝 Todo content:', todoContent.substring(0, 200) + '...');
    
    // Clean the content by removing markdown code blocks
    const cleanTodoContent = todoContent
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();
    
    let todos;
    try {
      todos = JSON.parse(cleanTodoContent);
    } catch (parseError) {
      console.error('❌ Failed to parse todos JSON:', parseError);
      console.log('Raw content:', cleanTodoContent);
      throw new Error('Failed to parse todos from OpenAI response');
    }

    // Generate budget breakdown
    const budgetPrompt = `
You are Paige, an AI wedding planning assistant. Based on the following wedding details, create a realistic budget breakdown.

${weddingContext}

Create a budget breakdown with:
1. 8-12 major expense categories
2. Realistic percentages of total budget for each category
3. Specific amounts based on their $${weddingData.maxBudget.toLocaleString()} budget
4. Categories should include: Venue, Catering, Photography, Flowers, Music, Attire, etc.

Return ONLY a JSON object with this structure:
{
  "total": ${weddingData.maxBudget},
  "categories": [
    {
      "name": "Category name",
      "amount": 0,
      "percentage": 0,
      "description": "What this covers"
    }
  ]
}
`;

    const budgetResponse = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: budgetPrompt }],
      temperature: 0.7,
    });

    // Clean the budget content by removing markdown code blocks
    const budgetContent = budgetResponse.choices[0].message.content || '{}';
    const cleanBudgetContent = budgetContent
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();
    
    const budget = JSON.parse(cleanBudgetContent);

    // Generate vendor recommendations (mock data for now - we'll enhance this later)
    const vendors = {
      venues: [
        { id: 'venue1', name: 'Garden Venue', category: 'Venue', price: '$5,000', rating: 4.8, vicinity: 'Downtown', description: 'Beautiful outdoor garden venue perfect for intimate weddings' },
        { id: 'venue2', name: 'Historic Mansion', category: 'Venue', price: '$8,000', rating: 4.9, vicinity: 'Historic District', description: 'Elegant historic mansion with grand ballroom' },
        { id: 'venue3', name: 'Modern Loft', category: 'Venue', price: '$6,500', rating: 4.7, vicinity: 'Arts District', description: 'Contemporary loft space with city views' },
        { id: 'venue4', name: 'Rustic Barn', category: 'Venue', price: '$4,500', rating: 4.6, vicinity: 'Countryside', description: 'Charming rustic barn with outdoor ceremony space' },
        { id: 'venue5', name: 'Beach Resort', category: 'Venue', price: '$12,000', rating: 4.9, vicinity: 'Coastal', description: 'Luxury beachfront resort with ocean views' }
      ],
      photographers: [
        { id: 'photo1', name: 'Sarah Johnson Photography', category: 'Photography', price: '$2,500', rating: 4.9, vicinity: 'Downtown', description: 'Award-winning photographer specializing in romantic weddings' },
        { id: 'photo2', name: 'Mike & Co. Studios', category: 'Photography', price: '$3,000', rating: 4.7, vicinity: 'Arts District', description: 'Creative photography team with artistic vision' },
        { id: 'photo3', name: 'Golden Hour Photos', category: 'Photography', price: '$2,200', rating: 4.8, vicinity: 'Historic District', description: 'Natural light specialist with candid style' },
        { id: 'photo4', name: 'Elegant Moments', category: 'Photography', price: '$3,500', rating: 4.9, vicinity: 'Uptown', description: 'Luxury wedding photography with editorial style' },
        { id: 'photo5', name: 'Rustic Romance', category: 'Photography', price: '$1,800', rating: 4.6, vicinity: 'Countryside', description: 'Authentic storytelling with rustic charm' }
      ],
      florists: [
        { id: 'florist1', name: 'Bloom & Blossom', category: 'Florist', price: '$1,200', rating: 4.8, vicinity: 'Downtown', description: 'Modern floral designs with seasonal blooms' },
        { id: 'florist2', name: 'Garden Dreams', category: 'Florist', price: '$1,500', rating: 4.9, vicinity: 'Historic District', description: 'Romantic garden-style arrangements' },
        { id: 'florist3', name: 'Wildflower Studio', category: 'Florist', price: '$900', rating: 4.7, vicinity: 'Arts District', description: 'Wildflower and sustainable floral designs' },
        { id: 'florist4', name: 'Elegant Petals', category: 'Florist', price: '$1,800', rating: 4.9, vicinity: 'Uptown', description: 'Luxury floral arrangements and event design' },
        { id: 'florist5', name: 'Rustic Blooms', category: 'Florist', price: '$1,100', rating: 4.6, vicinity: 'Countryside', description: 'Rustic and natural floral arrangements' }
      ],
      caterers: [
        { id: 'caterer1', name: 'Gourmet Events', category: 'Catering', price: '$85/person', rating: 4.8, vicinity: 'Downtown', description: 'Upscale catering with farm-to-table cuisine' },
        { id: 'caterer2', name: 'Classic Catering Co.', category: 'Catering', price: '$75/person', rating: 4.7, vicinity: 'Historic District', description: 'Traditional wedding catering with modern touches' },
        { id: 'caterer3', name: 'Artisan Kitchen', category: 'Catering', price: '$95/person', rating: 4.9, vicinity: 'Arts District', description: 'Creative cuisine with local ingredients' },
        { id: 'caterer4', name: 'Elegant Dining', category: 'Catering', price: '$120/person', rating: 4.9, vicinity: 'Uptown', description: 'Fine dining experience with wine pairings' },
        { id: 'caterer5', name: 'Rustic Feast', category: 'Catering', price: '$65/person', rating: 4.6, vicinity: 'Countryside', description: 'Comfort food with rustic presentation' }
      ],
      music: [
        { id: 'music1', name: 'Harmony Strings', category: 'Music', price: '$1,500', rating: 4.8, vicinity: 'Downtown', description: 'String quartet for ceremony and cocktail hour' },
        { id: 'music2', name: 'DJ Mike', category: 'Music', price: '$800', rating: 4.7, vicinity: 'Historic District', description: 'Professional DJ with wedding experience' },
        { id: 'music3', name: 'Live Band Collective', category: 'Music', price: '$2,500', rating: 4.9, vicinity: 'Arts District', description: 'Live band covering all genres' },
        { id: 'music4', name: 'Elegant Ensemble', category: 'Music', price: '$3,000', rating: 4.9, vicinity: 'Uptown', description: 'Full orchestra for ceremony and reception' },
        { id: 'music5', name: 'Acoustic Duo', category: 'Music', price: '$1,200', rating: 4.6, vicinity: 'Countryside', description: 'Intimate acoustic performance' }
      ]
    };

    // Save generated content to Firestore
    const userRef = adminDb.collection('users').doc(userId);
    
    // Save todos
    const todoListRef = adminDb.collection('users').doc(userId).collection('todoLists').doc('wedding-planning');
    await todoListRef.set({
      name: 'Wedding Planning',
      description: 'Your personalized wedding planning checklist',
      createdAt: new Date(),
      updatedAt: new Date(),
      isDefault: true,
      items: todos.map((todo: any, index: number) => ({
        id: `todo-${index + 1}`,
        title: todo.title,
        description: todo.description,
        category: todo.category,
        deadline: todo.deadline,
        priority: todo.priority,
        completed: false,
        createdAt: new Date(),
        updatedAt: new Date()
      }))
    });

    // Save budget
    const budgetRef = adminDb.collection('users').doc(userId).collection('budgetCategories').doc('wedding-budget');
    await budgetRef.set({
      name: 'Wedding Budget',
      total: budget.total,
      createdAt: new Date(),
      updatedAt: new Date(),
      categories: budget.categories
    });

    // Save vendor recommendations
    const vendorsRef = adminDb.collection('users').doc(userId).collection('onboardingVendors').doc('recommendations');
    await vendorsRef.set({
      createdAt: new Date(),
      updatedAt: new Date(),
      vendors: vendors
    });

    // Update user onboarding status
    await userRef.update({
      onboardingCompleted: true,
      onboardingCompletedAt: new Date(),
      lastUpdated: new Date()
    });

    console.log('Successfully generated and saved preliminary content for user:', userId);

    return NextResponse.json({
      success: true,
      data: {
        todos,
        budget,
        vendors
      }
    });

  } catch (error) {
    console.error('Error generating preliminary content:', error);
    return NextResponse.json(
      { error: 'Failed to generate preliminary content' },
      { status: 500 }
    );
  }
}
