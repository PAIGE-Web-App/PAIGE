/**
 * AI-Powered Todo Deadline Generation API Endpoint
 * 
 * This endpoint generates intelligent deadlines for todo items based on:
 * - Wedding date and timeline constraints
 * - Planning phase requirements
 * - RAG context from user's wedding planning data
 * - Best practices for wedding planning timelines
 */

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { withCreditValidation } from '@/lib/creditMiddleware';
import { ragService } from '@/lib/ragService';
import { shouldUseRAG } from '@/lib/ragFeatureFlag';
import { ragContextCache } from '@/lib/ragContextCache';
import { AIFeature } from '@/types/credits';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface TodoDeadlineRequest {
  todos: Array<{
    id: string;
    name: string;
    note?: string;
    category?: string;
    planningPhase?: string;
  }>;
  weddingDate: string;
  userId: string;
  userEmail: string;
  listName: string;
}

interface DeadlineValidationResult {
  hasTightDeadlines: boolean;
  warningMessage?: string;
  recommendedAction?: string;
}

// Main handler function
async function handleDeadlineGeneration(request: NextRequest): Promise<NextResponse> {
  try {
    console.log('AI-Powered Todo Deadline Generation API called');
    
    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY) {
      console.error('OpenAI API key not configured');
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }
    
    const requestBody = await request.json();
    console.log('Deadline generation request body keys:', Object.keys(requestBody));
    
    const { 
      todos, 
      weddingDate, 
      userId,
      userEmail,
      listName
    }: TodoDeadlineRequest = requestBody;

    if (!todos || !Array.isArray(todos) || todos.length === 0) {
      return NextResponse.json(
        { error: 'Todos array is required and cannot be empty' },
        { status: 400 }
      );
    }

    if (!weddingDate) {
      return NextResponse.json(
        { error: 'Wedding date is required' },
        { status: 400 }
      );
    }

    // Validate wedding date and check for tight deadline scenarios (for prompt context)
    const deadlineValidation = validateWeddingDateForDeadlines(weddingDate, todos);
    
    // Get RAG context if enabled
    let ragContext = '';
    const useRAG = shouldUseRAG(userId, userEmail);
    console.log(`RAG enabled for deadline generation: ${useRAG}`);

    if (useRAG) {
      try {
        console.log('Getting RAG context for deadline generation...');
        
        // Check cache first
        const queryKey = `Generate deadlines for ${listName} todo list. Wedding date: ${weddingDate}`;
        const cachedContext = await ragContextCache.getCachedContext(userId, queryKey);
        
        if (cachedContext) {
          console.log('Using cached RAG context for deadline generation');
          ragContext = '\n\nRelevant context from your files and data (cached):\n' + 
            `- ${cachedContext.substring(0, 600)}...`;
        } else {
          console.log('Cache miss - fetching fresh RAG context...');
          
          // Get context from existing todos, vendor communications, and file insights
          const ragResults = await ragService.processQuery({
            query: queryKey,
            user_id: userId,
            context: 'deadline_generation'
          });
          
          if (ragResults.success && ragResults.answer) {
            ragContext = '\n\nRelevant context from your files and data:\n' + 
              `- ${ragResults.answer.substring(0, 600)}...`;
            
            // Cache the context for future use
            await ragContextCache.cacheContext(userId, queryKey, ragResults.answer, 0.8);
            console.log('RAG context cached for future requests');
          }
        }
      } catch (ragError) {
        console.error('RAG query failed, continuing without context:', ragError);
        // Continue without RAG context
      }
    }

    // Build the deadline generation prompt
    const deadlinePrompt = buildDeadlinePrompt(
      todos,
      weddingDate,
      listName,
      ragContext,
      deadlineValidation
    );

    console.log(`Sending request to OpenAI for deadline generation`);
    console.log('Deadline prompt length:', deadlinePrompt.length);
    
    let completion;
    try {
      completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are Paige, an expert wedding planning assistant specializing in timeline creation. Generate realistic, achievable deadlines for wedding planning tasks based on the wedding date and planning phases. Consider vendor lead times, seasonal factors, and wedding planning best practices.'
          },
          {
            role: 'user',
            content: deadlinePrompt
          }
        ],
        temperature: 0.3, // Lower temperature for more consistent deadline generation
        max_tokens: 2000,
      });
      console.log('OpenAI API call successful');
    } catch (openaiError) {
      console.error('OpenAI API call failed:', openaiError);
      throw new Error(`OpenAI API call failed: ${openaiError instanceof Error ? openaiError.message : 'Unknown error'}`);
    }

    const deadlineResponse = completion.choices[0]?.message?.content || 'Deadline generation failed';

    // Parse the deadline response into structured data
    const structuredDeadlines = parseDeadlineResponse(deadlineResponse, todos, weddingDate);

    console.log('Deadline generation completed successfully');

    // Get credit information from request headers (set by credit middleware)
    const creditsRequired = request.headers.get('x-credits-required');
    const creditsRemaining = request.headers.get('x-credits-remaining');
    const headerUserId = request.headers.get('x-user-id');

    const response = NextResponse.json({
      success: true,
      todos: structuredDeadlines,
      rawResponse: deadlineResponse,
      ragEnabled: useRAG,
      ragContext: ragContext ? 'Context from your files included' : 'No additional context',
      deadlineValidation,
      cacheInfo: {
        contextCached: !!ragContext,
        cacheEnabled: process.env.NODE_ENV === 'production' || process.env.RAG_CACHE_ENABLED === 'true'
      },
      credits: {
        required: creditsRequired ? parseInt(creditsRequired) : 2,
        remaining: creditsRemaining ? parseInt(creditsRemaining) : 0,
        userId: headerUserId
      }
    });

    // Add credit information to response headers
    if (creditsRequired) response.headers.set('x-credits-required', creditsRequired);
    if (creditsRemaining) response.headers.set('x-credits-remaining', creditsRemaining);
    if (headerUserId) response.headers.set('x-user-id', headerUserId);

    return response;

  } catch (error) {
    console.error('Deadline generation error:', error);
    return NextResponse.json(
      { 
        error: 'Deadline generation failed',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
}

/**
 * Validate wedding date and check for tight deadline scenarios
 */
function validateWeddingDateForDeadlines(weddingDate: string, todos: Array<any>): DeadlineValidationResult {
  const wedding = new Date(weddingDate);
  const now = new Date();
  const daysUntilWedding = Math.ceil((wedding.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  // Check if wedding is too close for proper planning
  if (daysUntilWedding < 90) {
    return {
      hasTightDeadlines: true,
      warningMessage: `Your wedding is only ${daysUntilWedding} days away, which may cause many to-do items to have deadlines that are really tight/hard to achieve.`,
      recommendedAction: 'Do you want to continue? If Yes, the list will still be generated with AI-generated deadlines, but some tasks may need to be prioritized or simplified.'
    };
  }
  
  // Check if wedding is moderately close
  if (daysUntilWedding < 180) {
    return {
      hasTightDeadlines: true,
      warningMessage: `Your wedding is ${daysUntilWedding} days away. Some planning phases may have compressed timelines.`,
      recommendedAction: 'The AI will generate realistic deadlines, but you may need to prioritize certain tasks or work with vendors who can accommodate shorter timelines.'
    };
  }
  
  return {
    hasTightDeadlines: false
  };
}

/**
 * Build the deadline generation prompt
 */
function buildDeadlinePrompt(
  todos: Array<any>,
  weddingDate: string,
  listName: string,
  ragContext: string,
  deadlineValidation: DeadlineValidationResult
): string {
  const wedding = new Date(weddingDate);
  const now = new Date();
  const daysUntilWedding = Math.ceil((wedding.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  const todoList = todos.map((todo, index) => {
    return `${index + 1}. ${todo.name}${todo.planningPhase ? ` (${todo.planningPhase})` : ''}${todo.note ? ` - Note: ${todo.note}` : ''}`;
  }).join('\n');

  // Calculate specific date ranges for the AI
  const weddingDateObj = new Date(weddingDate);
  const currentDateObj = new Date();
  const oneWeekFromNow = new Date(currentDateObj.getTime() + 7 * 24 * 60 * 60 * 1000);
  const twoWeeksFromNow = new Date(currentDateObj.getTime() + 14 * 24 * 60 * 60 * 1000);
  const oneMonthFromNow = new Date(currentDateObj.getTime() + 30 * 24 * 60 * 60 * 1000);
  const twoMonthsFromNow = new Date(currentDateObj.getTime() + 60 * 24 * 60 * 60 * 1000);
  const oneWeekBeforeWedding = new Date(weddingDateObj.getTime() - 7 * 24 * 60 * 60 * 1000);
  const oneDayBeforeWedding = new Date(weddingDateObj.getTime() - 24 * 60 * 60 * 1000);

  let prompt = `Generate realistic deadlines for the following wedding planning todo items.

WEDDING INFORMATION:
- Wedding Date: ${weddingDate} (${daysUntilWedding} days from now)
- Current Date: ${now.toISOString().split('T')[0]}
- List Name: ${listName}

CRITICAL DATE CONSTRAINTS:
- ALL deadlines must be BEFORE the wedding date: ${weddingDate}
- Current date: ${now.toISOString().split('T')[0]}
- Wedding is in ${daysUntilWedding} days - this is a TIGHT timeline!

TODO ITEMS TO ASSIGN DEADLINES:
${todoList}

DEADLINE GENERATION RULES:
1. CRITICAL: The wedding is only ${daysUntilWedding} days away! ALL deadlines must be BEFORE ${weddingDate}
2. IMPORTANT: Preserve the original order of items as listed above. Items should be processed in the exact sequence they appear.
3. Use these specific date ranges (all dates must be BEFORE the wedding):
   - "Kickoff (ASAP)" or "ASAP" items: Between ${now.toISOString().split('T')[0]} and ${oneWeekFromNow.toISOString().split('T')[0]}
   - "Lock Venue + Date (early)" items: Between ${now.toISOString().split('T')[0]} and ${twoWeeksFromNow.toISOString().split('T')[0]}
   - "Core Team (9–12 months out)" items: Between ${oneWeekFromNow.toISOString().split('T')[0]} and ${oneMonthFromNow.toISOString().split('T')[0]}
   - "Looks + Attire (8–10 months out)" items: Between ${twoWeeksFromNow.toISOString().split('T')[0]} and ${twoMonthsFromNow.toISOString().split('T')[0]}
   - "Food + Flow (6–8 months out)" items: Between ${oneMonthFromNow.toISOString().split('T')[0]} and ${twoMonthsFromNow.toISOString().split('T')[0]}
   - "Paper + Details (4–6 months out)" items: Between ${twoMonthsFromNow.toISOString().split('T')[0]} and ${oneWeekBeforeWedding.toISOString().split('T')[0]}
   - "Send + Finalize (2–4 months out)" items: Between ${twoMonthsFromNow.toISOString().split('T')[0]} and ${oneWeekBeforeWedding.toISOString().split('T')[0]}
   - "Tighten Up (4–6 weeks out)" items: Between ${oneWeekBeforeWedding.toISOString().split('T')[0]} and ${oneDayBeforeWedding.toISOString().split('T')[0]}
   - "Week Of" items: Between ${oneWeekBeforeWedding.toISOString().split('T')[0]} and ${oneDayBeforeWedding.toISOString().split('T')[0]}
   - "Day Before" items: ${oneDayBeforeWedding.toISOString().split('T')[0]}
   - "Wedding Day" items: ${weddingDate}
   - "After" items: After ${weddingDate} (but only if absolutely necessary)
   - "Tiny 'Don't-Forget' Wins" items: Between ${twoMonthsFromNow.toISOString().split('T')[0]} and ${oneWeekBeforeWedding.toISOString().split('T')[0]} (LOWEST PRIORITY - these are nice-to-have items that should NEVER be assigned to "This Week" or urgent timeframes)

4. For tight timelines (${daysUntilWedding} days), prioritize:
   - Critical path items first (venue, photographer, officiant)
   - Items that can be done quickly
   - Items that don't require long vendor lead times
   - "Tiny 'Don't-Forget' Wins" items are LOWEST priority - assign them later dates (NEVER assign to "This Week" or urgent timeframes)
5. Ensure deadlines are achievable and realistic for the compressed timeline
6. Account for weekends and holidays
7. Focus on what's absolutely essential vs. nice-to-have
8. NEVER generate dates after ${weddingDate} unless it's an "After" item
9. CRITICAL: Maintain the exact order of items as they appear in the list above. Do not reorder based on deadlines.

${deadlineValidation.hasTightDeadlines ? `
⚠️  WARNING: ${deadlineValidation.warningMessage}
${deadlineValidation.recommendedAction}

Please generate deadlines that are as realistic as possible given the time constraints.
` : ''}

${ragContext}

RESPONSE FORMAT:
Return a JSON array where each object has:
- "id": the todo item id (must match exactly as provided above)
- "deadline": deadline date in YYYY-MM-DD format
- "reasoning": brief explanation of why this deadline was chosen

IMPORTANT: Process items in the exact order they appear in the list above. Do not reorder or skip items.

Example:
[
  {
    "id": "todo-1",
    "deadline": "2024-03-15",
    "reasoning": "Venue booking should be done 12+ months in advance to secure preferred dates"
  }
]`;

  return prompt;
}

/**
 * Parse the AI response into structured deadline data
 */
function parseDeadlineResponse(response: string, todos: Array<any>, weddingDate: string): Array<any> {
  try {
    // Try to extract JSON from the response
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('No JSON array found in response');
    }

    const deadlineData = JSON.parse(jsonMatch[0]);
    
    // Validate and merge with original todos
    const todosWithDeadlines = todos.map(todo => {
      const deadlineInfo = deadlineData.find((d: any) => d.id === todo.id);
      
      if (deadlineInfo && deadlineInfo.deadline) {
        return {
          ...todo,
          deadline: new Date(deadlineInfo.deadline),
          deadlineReasoning: deadlineInfo.reasoning || 'AI-generated deadline'
        };
      }
      
      // Fallback: assign a default deadline based on planning phase
      return {
        ...todo,
        deadline: getDefaultDeadlineForPhase(todo.planningPhase, weddingDate),
        deadlineReasoning: 'Default deadline based on planning phase'
      };
    });

    return todosWithDeadlines;
  } catch (error) {
    console.error('Error parsing deadline response:', error);
    
    // Fallback: assign default deadlines based on planning phases
    return todos.map(todo => ({
      ...todo,
      deadline: getDefaultDeadlineForPhase(todo.planningPhase, weddingDate),
      deadlineReasoning: 'Default deadline due to parsing error'
    }));
  }
}

/**
 * Get default deadline based on planning phase
 */
function getDefaultDeadlineForPhase(planningPhase?: string, weddingDate?: string): Date {
  const now = new Date();
  const wedding = weddingDate ? new Date(weddingDate) : new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000); // Default to 1 year if no wedding date
  const daysUntilWedding = Math.ceil((wedding.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  // For tight timelines, compress all deadlines
  if (daysUntilWedding < 90) {
    if (!planningPhase) {
      return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 1 week from now
    }
    
    const phase = planningPhase.toLowerCase();
    
    if (phase.includes('asap') || phase.includes('kickoff')) {
      return new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000); // 3 days
    } else if (phase.includes('12+') || phase.includes('early')) {
      return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 1 week
    } else if (phase.includes('9-12') || phase.includes('core team')) {
      return new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000); // 2 weeks
    } else if (phase.includes('8-10') || phase.includes('looks')) {
      return new Date(now.getTime() + 21 * 24 * 60 * 60 * 1000); // 3 weeks
    } else if (phase.includes('6-8') || phase.includes('food')) {
      return new Date(now.getTime() + 28 * 24 * 60 * 60 * 1000); // 4 weeks
    } else if (phase.includes('4-6') || phase.includes('paper')) {
      return new Date(now.getTime() + 35 * 24 * 60 * 60 * 1000); // 5 weeks
    } else if (phase.includes('2-4') || phase.includes('send')) {
      return new Date(now.getTime() + 42 * 24 * 60 * 60 * 1000); // 6 weeks
    } else if (phase.includes('4-6 weeks') || phase.includes('tighten')) {
      return new Date(now.getTime() + 49 * 24 * 60 * 60 * 1000); // 7 weeks
    } else if (phase.includes('week of')) {
      return new Date(wedding.getTime() - 7 * 24 * 60 * 60 * 1000); // 1 week before wedding
    } else if (phase.includes('day before')) {
      return new Date(wedding.getTime() - 24 * 60 * 60 * 1000); // 1 day before wedding
    } else if (phase.includes('wedding day')) {
      return wedding; // Wedding day
    } else if (phase.includes('after')) {
      return new Date(wedding.getTime() + 7 * 24 * 60 * 60 * 1000); // 1 week after
    } else if (phase.includes('tiny') || phase.includes('don\'t-forget') || phase.includes('don\'t forget')) {
      // Tiny "Don't-Forget" Wins should be much later - 6-8 weeks out
      return new Date(now.getTime() + 56 * 24 * 60 * 60 * 1000); // 8 weeks from now
    }
    
    // Default fallback for tight timeline
    return new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000); // 2 weeks
  }
  
  // Normal timeline (90+ days) - keep original logic
  if (!planningPhase) {
    return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days from now
  }
  
  const phase = planningPhase.toLowerCase();
  
  if (phase.includes('asap') || phase.includes('kickoff')) {
    return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days
  } else if (phase.includes('12+') || phase.includes('early')) {
    return new Date(now.getTime() + 300 * 24 * 60 * 60 * 1000); // ~10 months
  } else if (phase.includes('9-12') || phase.includes('core team')) {
    return new Date(now.getTime() + 270 * 24 * 60 * 60 * 1000); // ~9 months
  } else if (phase.includes('8-10') || phase.includes('looks')) {
    return new Date(now.getTime() + 240 * 24 * 60 * 60 * 1000); // ~8 months
  } else if (phase.includes('6-8') || phase.includes('food')) {
    return new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000); // ~6 months
  } else if (phase.includes('4-6') || phase.includes('paper')) {
    return new Date(now.getTime() + 120 * 24 * 60 * 60 * 1000); // ~4 months
  } else if (phase.includes('2-4') || phase.includes('send')) {
    return new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000); // ~2 months
  } else if (phase.includes('4-6 weeks') || phase.includes('tighten')) {
    return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // ~1 month
  } else if (phase.includes('week of')) {
    return new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000); // 2 weeks
  } else if (phase.includes('day before')) {
    return new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000); // 3 days
  } else if (phase.includes('wedding day')) {
    return new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000); // 1 day
  } else if (phase.includes('after')) {
    return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 1 week after
  } else if (phase.includes('tiny') || phase.includes('don\'t-forget') || phase.includes('don\'t forget')) {
    // Tiny "Don't-Forget" Wins should be much later - 4-6 months out
    return new Date(now.getTime() + 150 * 24 * 60 * 60 * 1000); // ~5 months from now
  }
  
  return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // Default: 30 days
}

// Export the handler with credit validation
export const POST = withCreditValidation(handleDeadlineGeneration, {
  feature: 'todo_generation' as AIFeature,
  userIdField: 'userId',
  requireAuth: true,
  errorMessage: 'Insufficient credits to generate AI-powered deadlines. Please upgrade your plan or wait for credit refresh.'
});
