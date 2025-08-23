// app/api/analyze-message/route.ts
// AI-powered message analysis for smart to-do detection

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { withCreditValidation } from '../../../lib/creditMiddleware';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Main handler function
async function handleMessageAnalysis(req: NextRequest) {
  try {
    const body = await req.json();
    const { 
      messageContent, 
      vendorCategory, 
      vendorName, 
      existingTodos, 
      weddingContext 
    } = body;

    console.log('[analyze-message] Analyzing message from:', vendorName, 'Category:', vendorCategory);

    // Build the analysis prompt
    const systemPrompt = `You are an AI assistant that analyzes wedding planning messages to detect actionable items. Your job is to identify:

1. NEW to-do items that need to be created
2. UPDATES to existing to-do items  
3. COMPLETED to-do items
4. Relevant notes and context

Be precise and only suggest items that are clearly actionable from the message content.`;

    const userPrompt = `Analyze this message from a ${vendorCategory} vendor for actionable wedding planning items.

MESSAGE CONTENT:
${messageContent}

VENDOR CONTEXT:
- Vendor: ${vendorName}
- Category: ${vendorCategory}

EXISTING TODOS:
${existingTodos?.map((todo: any) => `- ${todo.name} (${todo.category}) - ${todo.isCompleted ? 'Completed' : 'Pending'}`).join('\n') || 'None'}

WEDDING CONTEXT:
${weddingContext ? `- Wedding Date: ${weddingContext.weddingDate}
- Planning Stage: ${weddingContext.planningStage}
- Days Until Wedding: ${weddingContext.daysUntilWedding}` : 'Not available'}

ANALYSIS TASK:
1. Detect NEW to-do items that need to be created
2. Identify UPDATES to existing to-do items
3. Spot COMPLETED to-do items
4. Suggest relevant categories and deadlines

OUTPUT FORMAT (JSON only, no other text):
{
  "newTodos": [
    {
      "name": "Task name",
      "note": "Optional note or description",
      "category": "Category name",
      "deadline": "YYYY-MM-DD",
      "sourceText": "Exact text that triggered this"
    }
  ],
  "todoUpdates": [
    {
      "updateType": "note|status_change|deadline_update|category_change",
      "content": "Update content",
      "sourceText": "Exact text that triggered this"
    }
  ],
  "completedTodos": [
    {
      "completionReason": "Why this is considered complete",
      "sourceText": "Exact text that triggered this"
    }
  ],
  "analysisType": "new_message|reply|ongoing_conversation"
}`;

    console.log('[analyze-message] Sending to OpenAI for analysis...');

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.1, // Very low temperature for consistent analysis
      max_tokens: 1000,
    });

    console.log('[analyze-message] OpenAI response received');

    if (!completion.choices[0]?.message?.content) {
      throw new Error('No content received from OpenAI');
    }

    const aiResponse = completion.choices[0].message.content;
    console.log('[analyze-message] Raw AI response:', aiResponse);

    // Try to extract JSON from the response
    let analysisResult;
    try {
      // Find JSON content in the response
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in AI response');
      }
      
      analysisResult = JSON.parse(jsonMatch[0]);
      console.log('[analyze-message] Parsed analysis result:', analysisResult);
    } catch (parseError) {
      console.error('[analyze-message] Failed to parse AI response:', parseError);
      console.error('[analyze-message] Raw response was:', aiResponse);
      throw new Error('Failed to parse AI analysis result');
    }

    // Validate the result structure
    if (!analysisResult.newTodos || !analysisResult.todoUpdates || !analysisResult.completedTodos) {
      throw new Error('Invalid analysis result structure');
    }

    console.log('[analyze-message] Analysis complete:', {
      newTodos: analysisResult.newTodos.length,
      todoUpdates: analysisResult.todoUpdates.length,
      completedTodos: analysisResult.completedTodos.length,
      analysisType: analysisResult.analysisType
    });

    return NextResponse.json(analysisResult);

  } catch (error: any) {
    console.error('[analyze-message] Error:', error);
    return new NextResponse(
      JSON.stringify({ 
        error: 'Failed to analyze message', 
        details: error.message 
      }), 
      { status: 500 }
    );
  }
}

// Export the POST function wrapped with credit validation
export const POST = withCreditValidation(handleMessageAnalysis, {
  feature: 'message_analysis',
  userIdField: 'userId',
  requireAuth: true,
  errorMessage: 'Insufficient credits for message analysis. Please upgrade your plan to continue using AI features.'
});
