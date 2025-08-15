// app/api/analyze-message/route.ts
// AI-powered message analysis for smart to-do detection

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
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
${existingTodos?.map((todo: any) => `- ${todo.title} (${todo.category}) - ${todo.isCompleted ? 'Completed' : 'Pending'}`).join('\n') || 'None'}

WEDDING CONTEXT:
${weddingContext ? `- Wedding Date: ${weddingContext.weddingDate}
- Planning Stage: ${weddingContext.planningStage}
- Days Until Wedding: ${weddingContext.daysUntilWedding}` : 'Not available'}

ANALYSIS TASK:
1. Detect NEW to-do items that need to be created
2. Identify UPDATES to existing to-do items
3. Spot COMPLETED to-do items
4. Categorize by priority and suggest deadlines

OUTPUT FORMAT (JSON only, no other text):
{
  "newTodos": [
    {
      "title": "Task title",
      "description": "Detailed description",
      "category": "Category name",
      "priority": "low|medium|high",
      "suggestedDeadline": "YYYY-MM-DD",
      "sourceText": "Exact text that triggered this",
      "confidence": 0.9
    }
  ],
  "todoUpdates": [
    {
      "updateType": "note|status_change|deadline_update|category_change",
      "content": "Update content",
      "sourceText": "Exact text that triggered this",
      "confidence": 0.9
    }
  ],
  "completedTodos": [
    {
      "completionReason": "Why this is considered complete",
      "sourceText": "Exact text that triggered this",
      "confidence": 0.9
    }
  ],
  "confidence": 0.9,
  "analysisType": "new_message|reply|ongoing_conversation"
}`;

    console.log('[analyze-message] Sending to OpenAI for analysis...');

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.3, // Lower temperature for more consistent analysis
      max_tokens: 1000,
    });

    const aiResponse = completion.choices[0].message.content;
    console.log('[analyze-message] OpenAI response received');

    if (!aiResponse) {
      throw new Error('No response from OpenAI');
    }

    // Parse the JSON response
    let analysisResult;
    try {
      // Extract JSON from the response (in case there's extra text)
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysisResult = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('[analyze-message] Failed to parse OpenAI response:', parseError);
      console.error('[analyze-message] Raw response:', aiResponse);
      throw new Error('Invalid JSON response from AI');
    }

    // Validate the result structure
    if (!analysisResult.newTodos || !analysisResult.todoUpdates || !analysisResult.completedTodos) {
      throw new Error('Invalid analysis result structure');
    }

    console.log('[analyze-message] Analysis complete:', {
      newTodos: analysisResult.newTodos.length,
      todoUpdates: analysisResult.todoUpdates.length,
      completedTodos: analysisResult.completedTodos.length,
      confidence: analysisResult.confidence
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
