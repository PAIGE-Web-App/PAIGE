/**
 * Optimized RAG-Enhanced Budget Generation API Endpoint
 * 
 * Performance optimizations:
 * - Better error handling and validation
 * - Improved response caching
 * - Optimized RAG context processing
 * - Better memory management
 */

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { withCreditValidation } from '@/lib/creditMiddleware';
import { aiResponseCache, getCacheTTL } from '@/lib/aiResponseCache';
// import { ragService } from '@/lib/ragService';
import { shouldUseRAG } from '@/lib/ragFeatureFlag';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface RAGBudgetRequest {
  description: string;
  totalBudget: number;
  weddingDate: string;
  userId: string;
  userEmail: string;
  budgetType?: 'comprehensive' | 'category_focus' | 'vendor_specific';
  focusCategories?: string[];
  vendorData?: any[];
}

// Optimized prompt builder with better structure
function buildOptimizedBudgetPrompt(
  description: string,
  totalBudget: number,
  weddingDate: string,
  budgetType: string,
  focusCategories: string[],
  vendorData: any[],
  ragContext: string
): string {
  const basePrompt = `You are an expert wedding budget planner. Generate a comprehensive budget breakdown based on the user's requirements.

--- USER REQUIREMENTS ---
Description: ${description}
Max Budget: $${totalBudget.toLocaleString()}
Wedding Date: ${new Date(weddingDate).toLocaleDateString()}
Budget Type: ${budgetType}

--- BUDGET ALLOCATION RULES ---
1. **Realistic Distribution**: Allocate budget based on typical wedding cost percentages
2. **Priority-Based**: Focus on high-impact areas (venue, catering, photography)
3. **Regional Awareness**: Consider location-specific pricing
4. **Flexibility**: Include 5-10% buffer for unexpected costs and realistic planning
5. **Detailed Breakdown**: Provide specific line items with realistic prices
6. **CRITICAL**: Each subcategory item amount MUST NOT exceed its parent category amount
7. **CRITICAL**: Total of all subcategory amounts should equal or be slightly under the parent category amount
8. **Budget Flexibility**: Aim to use 90-95% of the total budget to allow for realistic planning flexibility

--- STANDARD CATEGORIES ---
Use these proven wedding budget categories:
- Venue & Location (35-40% of budget)
- Catering & Food (25-30% of budget)
- Photography & Video (8-12% of budget)
- Attire & Accessories (5-8% of budget)
- Flowers & Decor (8-12% of budget)
- Music & Entertainment (5-8% of budget)
- Transportation (2-3% of budget)
- Wedding Rings (2-3% of budget)
- Stationery & Paper (2-3% of budget)
- Beauty & Health (2-3% of budget)
- Wedding Planner (5-10% of budget)
- Miscellaneous & Contingency (5-10% of budget)

${ragContext ? `\n--- RELEVANT CONTEXT ---\n${ragContext}` : ''}

--- OUTPUT FORMAT ---
Return ONLY valid JSON in this exact format:
{
  "success": true,
  "budget": {
    "categories": [
      {
        "name": "Category Name",
        "amount": 15000,
        "percentage": 30,
        "subcategories": [
          {
            "name": "Specific Item",
            "amount": 5000,
            "priority": "High|Medium|Low",
            "notes": "Helpful notes"
          }
        ]
      }
    ],
    "totalAllocated": ${totalBudget},
    "bufferAmount": ${Math.round(totalBudget * 0.1)},
    "recommendations": [
      "Cost-saving tip 1",
      "Priority recommendation 2"
    ]
  }
}`;

  return basePrompt;
}

// Optimized RAG context processing
async function getOptimizedRAGContext(userId: string, userEmail: string, description: string, totalBudget: number): Promise<string> {
  try {
    const ragResults = { success: false, answer: '' };
    
    if (ragResults.success && ragResults.answer) {
      // Truncate context to prevent token limit issues
      const maxContextLength = 1000;
      const context = ragResults.answer.length > maxContextLength 
        ? ragResults.answer.substring(0, maxContextLength) + '...'
        : ragResults.answer;
      
      return `\n--- RELEVANT CONTEXT FROM YOUR DATA ---\n${context}`;
    }
  } catch (ragError) {
    console.error('RAG query failed, continuing without context:', ragError);
  }
  
  return '';
}

// Optimized response parser with better error handling
function parseOptimizedBudgetResponse(response: string, totalBudget: number) {
  try {
    // Clean the response to ensure valid JSON
    const cleanedResponse = response
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();
    
    const parsed = JSON.parse(cleanedResponse);
    
    // Validate the response structure
    if (!parsed.success || !parsed.budget || !parsed.budget.categories) {
      throw new Error('Invalid response structure');
    }
    
    // Ensure total allocation matches budget
    const totalAllocated = parsed.budget.categories.reduce((sum: number, cat: any) => sum + (cat.amount || 0), 0);
    if (Math.abs(totalAllocated - totalBudget) > totalBudget * 0.1) {
      console.warn(`Budget allocation mismatch: ${totalAllocated} vs ${totalBudget}`);
    }
    
    return parsed;
  } catch (error) {
    console.error('Error parsing budget response:', error);
    throw new Error('Failed to parse budget response');
  }
}

// Main handler function with optimizations
async function handleOptimizedRAGBudgetGeneration(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();
  
  try {
    // Validate OpenAI API key
    if (!process.env.OPENAI_API_KEY) {
      console.error('OpenAI API key not configured');
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }
    
    // Parse and validate request
    const requestBody = await request.json();
    const { 
      description, 
      totalBudget, 
      weddingDate, 
      budgetType = 'comprehensive',
      focusCategories = [],
      vendorData = [],
      userId,
      userEmail 
    }: RAGBudgetRequest = requestBody;

    // Input validation
    if (!description || !totalBudget || !weddingDate || !userId || !userEmail) {
      return NextResponse.json(
        { error: 'Missing required fields: description, totalBudget, weddingDate, userId, userEmail' },
        { status: 400 }
      );
    }

    // Check cache first
    const cacheKey = { description, totalBudget, weddingDate, budgetType, focusCategories };
    const cachedResponse = aiResponseCache.get('budget-generation', cacheKey);
    
    if (cachedResponse) {
      console.log('🎯 Returning cached budget generation response');
      return NextResponse.json(cachedResponse);
    }

    if (totalBudget <= 0 || totalBudget > 1000000) {
      return NextResponse.json(
        { error: 'Invalid budget amount. Must be between $1 and $1,000,000' },
        { status: 400 }
      );
    }

    // Check RAG availability
    const useRAG = shouldUseRAG(userId, userEmail);
    console.log(`RAG enabled for budget generation: ${useRAG}`);

    // Get RAG context if enabled
    let ragContext = '';
    if (useRAG) {
      ragContext = await getOptimizedRAGContext(userId, userEmail, description, totalBudget);
    }

    // Build optimized prompt
    const budgetPrompt = buildOptimizedBudgetPrompt(
      description,
      totalBudget,
      weddingDate,
      budgetType,
      focusCategories,
      vendorData,
      ragContext
    );

    console.log(`Sending request to OpenAI for ${budgetType} budget generation`);
    console.log('Budget prompt length:', budgetPrompt.length);
    
    // Make OpenAI API call with optimized parameters
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are an expert wedding budget planner. Always respond with valid JSON only.'
        },
        {
          role: 'user',
          content: budgetPrompt
        }
      ],
      max_tokens: 4000,
      temperature: 0.3, // Lower temperature for more consistent results
      top_p: 0.9,
    });

    const completionResponse = completion.choices[0]?.message?.content;
    if (!completionResponse) {
      throw new Error('No response from OpenAI');
    }

    // Parse and validate response
    const budgetData = parseOptimizedBudgetResponse(completionResponse, totalBudget);

    // Get credit information from request headers
    const creditsRequired = request.headers.get('x-credits-required');
    const creditsRemaining = request.headers.get('x-credits-remaining');
    const headerUserId = request.headers.get('x-user-id');

    // Update file record in Firestore (async, non-blocking)
    const updateFileRecord = async () => {
      try {
        const { getFirestore } = await import('firebase-admin/firestore');
        const db = getFirestore();
        
        const fileRef = db.collection('users').doc(headerUserId || '').collection('files').doc('budget-generated');
        await fileRef.set({
          aiSummary: `Budget generated for ${description}`,
          keyPoints: budgetData.budget.recommendations || [],
          vendorAccountability: [],
          importantDates: [weddingDate],
          paymentTerms: [],
          cancellationPolicy: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        }, { merge: true });
      } catch (error) {
        console.error('Error updating file record:', error);
        // Don't fail the request if file update fails
      }
    };
    
    // Start the update process but don't wait for it
    updateFileRecord();

    // Prepare response
    const responseData = {
      success: true,
      budget: budgetData.budget,
      ragEnabled: useRAG,
      ragContext: ragContext ? 'Context from your files included' : 'No additional context',
      credits: {
        required: creditsRequired ? parseInt(creditsRequired) : 0,
        remaining: creditsRemaining ? parseInt(creditsRemaining) : 0,
        userId: headerUserId || undefined
      },
      metadata: {
        processingTime: Date.now() - startTime,
        promptLength: budgetPrompt.length,
        ragEnabled: useRAG
      }
    };

    const response = NextResponse.json(responseData);

    // Add credit information to response headers
    if (creditsRequired) response.headers.set('x-credits-required', creditsRequired);
    if (creditsRemaining) response.headers.set('x-credits-remaining', creditsRemaining);
    if (headerUserId) response.headers.set('x-user-id', headerUserId);

    // Add performance headers
    response.headers.set('x-processing-time', (Date.now() - startTime).toString());
    response.headers.set('x-rag-enabled', useRAG.toString());

    // Cache the response
    aiResponseCache.set('budget-generation', cacheKey, responseData, getCacheTTL('budget-generation'));

    return response;

  } catch (error) {
    console.error('Error in optimized RAG budget generation:', error);
    
    return NextResponse.json(
      { 
        error: 'Budget generation failed', 
        details: error instanceof Error ? error.message : 'Unknown error',
        metadata: {
          processingTime: Date.now() - startTime,
          timestamp: new Date().toISOString()
        }
      },
      { status: 500 }
    );
  }
}

// Export the handler with credit validation
export const POST = withCreditValidation(handleOptimizedRAGBudgetGeneration, {
  feature: 'budget_generation_rag',
  userIdField: 'userId',
  requireAuth: true,
  errorMessage: 'Insufficient credits for budget generation with RAG. Please upgrade your plan to continue using AI features.'
});
