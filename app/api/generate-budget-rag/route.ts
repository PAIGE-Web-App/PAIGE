/**
 * RAG-Enhanced Budget Generation API Endpoint
 * 
 * This endpoint generates wedding budgets with RAG context from:
 * - Vendor contracts and pricing data
 * - Previous budget iterations
 * - File analysis insights
 * - Vendor communication history
 */

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { withCreditValidation } from '@/lib/creditMiddleware';
import { ragService } from '@/lib/ragService';
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

// Main handler function
async function handleRAGBudgetGeneration(request: NextRequest): Promise<NextResponse> {
  try {
    console.log('RAG-Enhanced Budget Generation API called');
    
    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY) {
      console.error('OpenAI API key not configured');
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }
    
    const requestBody = await request.json();
    console.log('Budget generation request body keys:', Object.keys(requestBody));
    
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

    if (!description || !totalBudget || !weddingDate) {
      return NextResponse.json(
        { error: 'Description, total budget, and wedding date are required' },
        { status: 400 }
      );
    }

    // Check if RAG is enabled for this user
    const useRAG = shouldUseRAG(userId, userEmail);
    console.log(`RAG enabled for budget generation: ${useRAG}`);

    // Get RAG context if enabled
    let ragContext = '';
    if (useRAG) {
      try {
        console.log('Getting RAG context for budget generation...');
        
        // Get context from vendor contracts, pricing data, and budget history
        const ragResults = await ragService.processQuery({
          query: `Generate budget for: ${description}. Total budget: $${totalBudget}. Wedding date: ${weddingDate}`,
          user_id: userId,
          context: 'budget_generation'
        });
        
        if (ragResults.success && ragResults.answer) {
          ragContext = '\n\nRelevant context from your files and data:\n' + 
            `- ${ragResults.answer.substring(0, 800)}...`;
        }
      } catch (ragError) {
        console.error('RAG query failed, continuing without context:', ragError);
        // Continue without RAG context
      }
    }

    // Build the budget generation prompt with RAG context
    const budgetPrompt = buildBudgetPrompt(
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
    
    let completion;
    try {
      completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are Paige, an expert wedding planning assistant specializing in budget creation. Create detailed, realistic wedding budgets based on the provided information and context.'
          },
          {
            role: 'user',
            content: budgetPrompt
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

    const budgetResponse = completion.choices[0]?.message?.content || 'Budget generation failed';

    // Parse the budget response into structured data
    const structuredBudget = parseBudgetResponse(budgetResponse, totalBudget);

    console.log('Budget generation completed successfully');

    // Get credit information from request headers (set by credit middleware)
    const creditsRequired = request.headers.get('x-credits-required');
    const creditsRemaining = request.headers.get('x-credits-remaining');
    const headerUserId = request.headers.get('x-user-id');

    const response = NextResponse.json({
      success: true,
      budget: structuredBudget,
      rawResponse: budgetResponse,
      ragEnabled: useRAG,
      ragContext: ragContext ? 'Context from your files included' : 'No additional context',
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
    console.error('Error in RAG budget generation:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    return NextResponse.json(
      { 
        error: 'Budget generation failed', 
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

function buildBudgetPrompt(
  description: string,
  totalBudget: number,
  weddingDate: string,
  budgetType: string,
  focusCategories: string[],
  vendorData: any[],
  ragContext?: string
): string {
  const basePrompt = `Create a detailed wedding budget based on the following information:

Wedding Description: ${description}
Total Budget: $${totalBudget.toLocaleString()}
Wedding Date: ${weddingDate}
Budget Type: ${budgetType}
${focusCategories.length > 0 ? `Focus Categories: ${focusCategories.join(', ')}` : ''}
${vendorData.length > 0 ? `Vendor Data: ${JSON.stringify(vendorData)}` : ''}${ragContext || ''}`;

  switch (budgetType) {
    case 'comprehensive':
      return `${basePrompt}

Please provide a comprehensive budget breakdown including:
1. **Venue & Catering** (40-50% of total budget)
2. **Photography & Videography** (10-15% of total budget)
3. **Flowers & Decorations** (8-12% of total budget)
4. **Attire & Beauty** (5-10% of total budget)
5. **Music & Entertainment** (8-12% of total budget)
6. **Transportation** (2-5% of total budget)
7. **Stationery & Favors** (2-3% of total budget)
8. **Miscellaneous** (5-10% of total budget)

For each category, provide:
- Subcategory breakdown
- Estimated costs
- Percentage of total budget
- Priority level (High/Medium/Low)
- Notes and recommendations

Format your response as JSON with this structure:
{
  "categories": [
    {
      "name": "Category Name",
      "percentage": 40,
      "amount": 20000,
      "subcategories": [
        {
          "name": "Subcategory",
          "amount": 15000,
          "priority": "High",
          "notes": "Recommendations and notes"
        }
      ]
    }
  ],
  "totalBudget": 50000,
  "recommendations": ["General recommendations"],
  "riskFactors": ["Potential cost overruns or concerns"]
}`;

    case 'category_focus':
      return `${basePrompt}

Please provide a detailed budget focused on these categories: ${focusCategories.join(', ')}

For each focus category, provide:
- Detailed subcategory breakdown
- Estimated costs
- Vendor recommendations
- Timeline considerations
- Cost-saving tips

Format your response as JSON with detailed focus category breakdown.`;

    case 'vendor_specific':
      return `${basePrompt}

Please create a budget that incorporates the provided vendor data and pricing.

Use the vendor information to:
- Set realistic pricing expectations
- Identify potential cost savings
- Highlight vendor-specific considerations
- Create a more accurate budget based on actual quotes

Format your response as JSON with vendor-informed budget breakdown.`;

    default:
      return basePrompt;
  }
}

function parseBudgetResponse(response: string, totalBudget: number) {
  try {
    // Try to extract JSON from the response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return parsed;
    }
  } catch (parseError) {
    console.error('Failed to parse budget response as JSON:', parseError);
  }

  // Fallback: create a basic budget structure from text
  return {
    categories: [
      {
        name: "Venue & Catering",
        percentage: 45,
        amount: totalBudget * 0.45,
        subcategories: [
          {
            name: "Venue Rental",
            amount: totalBudget * 0.25,
            priority: "High",
            notes: "Main reception venue"
          },
          {
            name: "Catering",
            amount: totalBudget * 0.20,
            priority: "High",
            notes: "Food and beverage service"
          }
        ]
      }
    ],
    totalBudget: totalBudget,
    recommendations: ["Review vendor quotes for accuracy"],
    riskFactors: ["Consider 10% buffer for unexpected costs"]
  };
}

// Export the handler with credit validation
export const POST = withCreditValidation(handleRAGBudgetGeneration, {
  feature: 'budget_generation',
  userIdField: 'userId',
  requireAuth: true,
  errorMessage: 'Insufficient credits for budget generation with RAG. Please upgrade your plan to continue using AI features.'
});
