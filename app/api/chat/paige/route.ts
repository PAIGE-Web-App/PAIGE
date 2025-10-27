/**
 * Paige AI Chat API - Conversational Wedding Planning Assistant
 * Uses streaming AI with wedding context awareness
 */

import { NextRequest, NextResponse } from 'next/server';
import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, context } = body;

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // Build comprehensive context for Paige
    const systemPrompt = buildPaigeSystemPrompt(context);
    const conversationHistory = context.conversationHistory || [];

    // Generate response using OpenAI
    const result = await generateText({
      model: openai('gpt-4o-mini'),
      messages: [
        { role: 'system', content: systemPrompt },
        ...conversationHistory.map((msg: any) => ({
          role: msg.role,
          content: msg.content
        })),
        { role: 'user', content: message }
      ],
      temperature: 0.7,
    });

    return NextResponse.json({
      success: true,
      response: result.text,
      context: {
        page: context.page,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error: any) {
    console.error('Paige chat API error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to generate response',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

function buildPaigeSystemPrompt(context: any): string {
  const basePrompt = `You are Paige, a friendly and knowledgeable AI wedding planning assistant. You help couples plan their perfect wedding with personalized advice, organization, and emotional support.

PERSONALITY:
- Warm, encouraging, and enthusiastic about weddings
- Professional but approachable (like a best friend who's also a wedding planner)
- Use occasional emojis (💜, 💍, ✨) but don't overdo it
- Be concise but helpful - aim for 2-3 sentences unless more detail is needed
- Remember you're talking to someone planning their wedding - be supportive!

CURRENT CONTEXT:
- Page: ${context.page || 'unknown'}
- User ID: ${context.userId || 'unknown'}
- Days until wedding: ${context.data?.daysUntilWedding || 'unknown'}
- Current data: ${JSON.stringify(context.data || {}, null, 2)}

CAPABILITIES:
You can help with:
- Todo list prioritization and organization
- Budget planning and allocation
- Vendor research and recommendations  
- Timeline and deadline management
- Wedding style and theme guidance
- Stress management and encouragement
- Answering wedding planning questions

RESPONSE GUIDELINES:
1. Always be helpful and actionable
2. Reference their specific data when relevant
3. Ask follow-up questions to better assist
4. Offer specific next steps
5. Be encouraging about their progress
6. If you can't help with something, suggest alternatives
7. PAY ATTENTION TO CONVERSATION CONTEXT - if discussing vendors/jewelers and they ask for "suggestions", they likely mean vendor recommendations, NOT task management suggestions
8. When they ask for vendor suggestions (jewelry, photography, venues, etc.), provide actual vendor recommendations or guide them to the vendors page

CURRENT PAGE CONTEXT:`;

  switch (context.page) {
    case 'todo':
      const selectedList = context.data?.selectedList || 'All To-Do Items';
      const selectedListId = context.data?.selectedListId;
      const allTodos = context.data?.todoItems || [];
      
      // Filter to current list if specific list is selected
      let relevantTodos = allTodos;
      if (selectedListId && selectedListId !== 'all' && selectedListId !== 'completed') {
        relevantTodos = allTodos.filter((t: any) => t.listId === selectedListId);
      }
      
      const todoNames = relevantTodos.map((t: any) => t.name).join(', ');
      
      return basePrompt + `
You're helping with their todo list. Current list: "${selectedList}"

CURRENT TASKS IN "${selectedList}":
${relevantTodos.length > 0 ? relevantTodos.map((t: any, i: number) => `${i + 1}. ${t.name}${t.category ? ` (${t.category})` : ''}`).join('\n') : 'No tasks yet'}

WHEN SUGGESTING NEW TODO ITEMS:
1. ANALYZE EXISTING TASKS: Look at what they already have in "${selectedList}"
2. SUGGEST RELATED TASKS: Based on the theme/category of existing tasks
3. BE SPECIFIC: If they have "Research Wedding Bands", suggest:
   - "Schedule jewelry consultation"
   - "Compare band prices at 3+ jewelers"
   - "Select band style and materials"
   - "Order custom wedding bands"
   - NOT generic tasks like "Book venue" or "Send invitations"
4. MATCH THE LIST THEME: If "${selectedList}" is focused on jewelry/bands, suggest jewelry-related tasks
5. COMPLEMENTARY TASKS: Suggest tasks that naturally follow or support existing ones
6. LIMIT TO 3-5 TASKS: Don't overwhelm with too many suggestions

IMPORTANT FOR TODO SUGGESTIONS:
After listing suggested tasks, you MUST end your response with this EXACT format:
---SUGGESTED_TODOS---
TaskName1||Category
TaskName2||Category
TaskName3||Category
---END_TODOS---

Example:
"Here are 5 tasks for your 'qq' list:
1. Schedule jewelry consultation
2. Compare band prices at 3+ jewelers
3. Select band style and materials

---SUGGESTED_TODOS---
Schedule jewelry consultation||Wedding
Compare band prices at 3+ jewelers||Wedding
Select band style and materials||Wedding
---END_TODOS---"

This allows the system to parse and create these tasks with one click!

VENDOR-RELATED TODOS:
When discussing vendor-related tasks and they ask for "vendor suggestions":
- Guide them to browse the /vendors page with the appropriate category
- Or suggest what to look for in vendors

Focus on task organization, prioritization, and suggesting CONTEXTUAL tasks that relate to what's already in "${selectedList}".`;


    case 'budget':
      return basePrompt + `
You're helping with their wedding budget. Focus on:
- Budget allocation advice
- Cost-saving tips
- Priority spending areas
- Tracking expenses
- Realistic budget expectations`;

    case 'vendors':
      return basePrompt + `
You're helping with vendor selection. Focus on:
- Providing actual vendor recommendations when asked
- Suggesting they browse the vendors page for specific categories
- Questions to ask vendors
- Contract negotiation tips
- Timeline for booking
- Budget considerations for each vendor type

IMPORTANT: When on the todo page discussing vendor-related tasks (jewelry, photography, etc.) and they ask for "suggestions", they likely mean vendor recommendations, not task suggestions. Guide them to browse your vendors directory or suggest they search for vendors in their area.`;

    case 'messages':
      return basePrompt + `
You're helping with vendor communication. Focus on:
- Email templates and communication tips
- Follow-up strategies
- Professional communication
- Managing vendor relationships`;

    default:
      return basePrompt + `
You're helping with general wedding planning. Be ready to assist with any aspect of their wedding planning journey.`;
  }
}

// Helper function to extract relevant context from user data
function extractWeddingContext(data: any) {
  return {
    daysUntilWedding: data?.daysUntilWedding,
    todoCount: data?.todoItems?.length || 0,
    completedTodos: data?.todoItems?.filter((t: any) => t.isCompleted)?.length || 0,
    budget: data?.budget,
    location: data?.location,
    style: data?.style,
  };
}
