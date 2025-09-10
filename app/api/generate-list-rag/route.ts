/**
 * RAG-Enhanced Todo List Generation API Endpoint
 * 
 * This endpoint generates wedding todo lists with RAG context from:
 * - Existing todo patterns and completion rates
 * - Vendor communication requirements
 * - File analysis deadlines and requirements
 * - Wedding planning best practices
 */

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { withCreditValidation } from '@/lib/creditMiddleware';
import { ragService } from '@/lib/ragService';
import { shouldUseRAG } from '@/lib/ragFeatureFlag';
import { getCachedRAGContext, setCachedRAGContext } from '@/lib/ragContextCache';
import { smartPromptOptimizer } from '@/lib/smartPromptOptimizer';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface RAGTodoRequest {
  description: string;
  weddingDate: string;
  userId: string;
  userEmail: string;
  todoType?: 'comprehensive' | 'category_focus' | 'timeline_focus';
  focusCategories?: string[];
  existingTodos?: any[];
  vendorData?: any[];
}

// Main handler function
async function handleRAGTodoGeneration(request: NextRequest): Promise<NextResponse> {
  try {
    console.log('RAG-Enhanced Todo Generation API called');
    
    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY) {
      console.error('OpenAI API key not configured');
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }
    
    const requestBody = await request.json();
    console.log('Todo generation request body keys:', Object.keys(requestBody));
    
    const { 
      description, 
      weddingDate, 
      todoType = 'comprehensive',
      focusCategories = [],
      existingTodos = [],
      vendorData = [],
      userId,
      userEmail 
    }: RAGTodoRequest = requestBody;

    if (!description || !weddingDate) {
      return NextResponse.json(
        { error: 'Description and wedding date are required' },
        { status: 400 }
      );
    }

    // Check if RAG is enabled for this user
    const useRAG = shouldUseRAG(userId, userEmail);
    console.log(`RAG enabled for todo generation: ${useRAG}`);

    // Get RAG context if enabled (with intelligent caching)
    let ragContext = '';
    if (useRAG) {
      try {
        console.log('Getting RAG context for todo generation...');
        
        // Check cache first
        const cachedContext = getCachedRAGContext(userId, description, weddingDate, todoType);
        
        if (cachedContext) {
          console.log('Using cached RAG context for todo generation');
          ragContext = cachedContext;
        } else {
          console.log('Cache miss - fetching fresh RAG context...');
          
          // Get context from existing todos, vendor communications, and file insights
          const ragResults = await ragService.processQuery({
            query: `Generate todo list for: ${description}. Wedding date: ${weddingDate}`,
            user_id: userId,
            context: 'todo_generation'
          });
          
          if (ragResults.success && ragResults.answer) {
            ragContext = '\n\nRelevant context from your files and data:\n' + 
              `- ${ragResults.answer.substring(0, 800)}...`;
            
            // Cache the context for future use
            setCachedRAGContext(userId, description, weddingDate, todoType, ragContext);
            console.log('RAG context cached for future requests');
          }
        }
      } catch (ragError) {
        console.error('RAG query failed, continuing without context:', ragError);
        // Continue without RAG context
      }
    }

    // Build the base todo generation prompt
    const basePrompt = buildTodoPrompt(
      description,
      weddingDate,
      todoType,
      focusCategories,
      existingTodos,
      vendorData,
      '' // Don't include RAG context in base prompt
    );

    // Apply smart prompt optimization
    const { optimizedPrompt, optimization } = await smartPromptOptimizer.optimizePrompt(
      userId,
      basePrompt,
      ragContext || '',
      todoType,
      focusCategories
    );

    const todoPrompt = optimizedPrompt;

    console.log(`Sending request to OpenAI for ${todoType} todo generation`);
    console.log('Todo prompt length:', todoPrompt.length);
    
    let completion;
    try {
      completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are Paige, an expert wedding planning assistant specializing in todo list creation. Create detailed, actionable wedding planning todo lists based on the provided information and context.'
          },
          {
            role: 'user',
            content: todoPrompt
          }
        ],
        temperature: 0.7,
        max_tokens: 3000,
      });
      console.log('OpenAI API call successful');
    } catch (openaiError) {
      console.error('OpenAI API call failed:', openaiError);
      throw new Error(`OpenAI API call failed: ${openaiError instanceof Error ? openaiError.message : 'Unknown error'}`);
    }

    const todoResponse = completion.choices[0]?.message?.content || 'Todo generation failed';

    // Parse the todo response into structured data
    const structuredTodos = parseTodoResponse(todoResponse, weddingDate);

    console.log('Todo generation completed successfully');

    // Track prompt effectiveness for continuous improvement
    try {
      const categoriesGenerated = structuredTodos.todos?.map((todo: any) => todo.category).filter(Boolean) || [];
      await smartPromptOptimizer.trackPromptEffectiveness(
        userId,
        todoType,
        ragContext ? ['rag_context'] : [],
        categoriesGenerated
      );
    } catch (trackingError) {
      console.error('Error tracking prompt effectiveness:', trackingError);
      // Don't fail the request if tracking fails
    }

    // Get credit information from request headers (set by credit middleware)
    const creditsRequired = request.headers.get('x-credits-required');
    const creditsRemaining = request.headers.get('x-credits-remaining');
    const headerUserId = request.headers.get('x-user-id');

    const response = NextResponse.json({
      success: true,
      todos: structuredTodos,
      rawResponse: todoResponse,
      ragEnabled: useRAG,
      ragContext: ragContext ? 'Context from your files included' : 'No additional context',
      cacheInfo: {
        contextCached: !!getCachedRAGContext(userId, description, weddingDate, todoType),
        cacheEnabled: process.env.NODE_ENV === 'production' || process.env.RAG_CACHE_ENABLED === 'true'
      },
      optimizationInfo: {
        personalized: true,
        effectivenessScore: optimization.effectivenessScore,
        categoryEmphasis: optimization.categoryEmphasis,
        timelineAdjustments: optimization.timelineAdjustments
      },
      credits: {
        required: creditsRequired ? parseInt(creditsRequired) : 0,
        remaining: creditsRemaining ? parseInt(creditsRemaining) : 0,
        userId: headerUserId || undefined
      }
    });

    // Add credit information to response headers for frontend
    if (creditsRequired) response.headers.set('x-credits-required', creditsRequired);
    if (creditsRemaining) response.headers.set('x-credits-remaining', creditsRemaining);
    if (headerUserId) response.headers.set('x-user-id', headerUserId);

    return response;

  } catch (error) {
    console.error('Error in RAG todo generation:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    return NextResponse.json(
      { 
        error: 'Todo generation failed', 
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

function buildTodoPrompt(
  description: string,
  weddingDate: string,
  todoType: string,
  focusCategories: string[],
  existingTodos: any[],
  vendorData: any[],
  ragContext?: string
): string {
  const basePrompt = `Create a detailed wedding planning todo list based on the following information:

Wedding Description: ${description}
Wedding Date: ${weddingDate}
Todo Type: ${todoType}
${focusCategories.length > 0 ? `Focus Categories: ${focusCategories.join(', ')}` : ''}
${existingTodos.length > 0 ? `Existing Todos: ${JSON.stringify(existingTodos)}` : ''}
${vendorData.length > 0 ? `Vendor Data: ${JSON.stringify(vendorData)}` : ''}${ragContext || ''}`;

  switch (todoType) {
    case 'comprehensive':
      return `${basePrompt}

Please provide a comprehensive todo list including:
1. **Venue & Catering** (6-12 months before)
2. **Photography & Videography** (6-9 months before)
3. **Flowers & Decorations** (3-6 months before)
4. **Attire & Beauty** (6-9 months before)
5. **Music & Entertainment** (3-6 months before)
6. **Transportation** (2-3 months before)
7. **Stationery & Favors** (2-4 months before)
8. **Final Details** (1-2 months before)

For each todo item, provide:
- Task name
- Category
- Priority (High/Medium/Low)
- Deadline (calculated from wedding date)
- Notes and requirements
- Dependencies (other tasks that must be completed first)

Format your response as JSON with this structure:
{
  "listName": "Wedding Planning Checklist",
  "todos": [
    {
      "name": "Task name",
      "category": "Category name",
      "priority": "High",
      "deadline": "YYYY-MM-DD",
      "note": "Task description and requirements",
      "dependencies": ["Other task names"],
      "estimatedDuration": "2 hours"
    }
  ],
  "timeline": {
    "totalTasks": 50,
    "highPriority": 15,
    "mediumPriority": 25,
    "lowPriority": 10
  },
  "recommendations": ["General recommendations"]
}`;

    case 'category_focus':
      return `${basePrompt}

Please provide a detailed todo list focused on these categories: ${focusCategories.join(', ')}

For each focus category, provide:
- Detailed task breakdown
- Timeline considerations
- Vendor coordination tasks
- Dependencies and prerequisites
- Cost considerations

Format your response as JSON with detailed focus category breakdown.`;

    case 'timeline_focus':
      return `${basePrompt}

Please provide a timeline-focused todo list with tasks organized by time periods:

- 12+ months before
- 9-12 months before
- 6-9 months before
- 3-6 months before
- 1-3 months before
- 1 month before
- Week of wedding

Format your response as JSON with timeline-organized tasks.`;

    default:
      return basePrompt;
  }
}

function parseTodoResponse(response: string, weddingDate: string) {
  try {
    // Try to extract JSON from the response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return parsed;
    }
  } catch (parseError) {
    console.error('Failed to parse todo response as JSON:', parseError);
  }

  // Fallback: create a basic todo structure from text
  const weddingDateObj = new Date(weddingDate);
  const sixMonthsBefore = new Date(weddingDateObj);
  sixMonthsBefore.setMonth(sixMonthsBefore.getMonth() - 6);
  
  return {
    listName: "Wedding Planning Checklist",
    todos: [
      {
        name: "Book venue and catering",
        category: "Venue & Catering",
        priority: "High",
        deadline: sixMonthsBefore.toISOString().split('T')[0],
        note: "Research and book your wedding venue and catering service",
        dependencies: [],
        estimatedDuration: "4 hours"
      },
      {
        name: "Hire photographer and videographer",
        category: "Photography & Videography",
        priority: "High",
        deadline: sixMonthsBefore.toISOString().split('T')[0],
        note: "Research and book photography and videography services",
        dependencies: ["Book venue and catering"],
        estimatedDuration: "3 hours"
      }
    ],
    timeline: {
      totalTasks: 2,
      highPriority: 2,
      mediumPriority: 0,
      lowPriority: 0
    },
    recommendations: ["Start planning early to secure your preferred vendors"]
  };
}

// Export the handler with credit validation
export const POST = withCreditValidation(handleRAGTodoGeneration, {
  feature: 'todo_generation',
  userIdField: 'userId',
  requireAuth: true,
  errorMessage: 'Insufficient credits for todo generation with RAG. Please upgrade your plan to continue using AI features.'
});
