/**
 * Contextual AI Agent using Vercel AI SDK
 * Optimal 2025 implementation with streaming and tool calling
 */

import { openai } from '@ai-sdk/openai';
import { generateObject, streamText } from 'ai';
import { z } from 'zod';

// Define the context schema
const contextSchema = z.object({
  page: z.enum(['dashboard', 'todo', 'vendors', 'budget', 'messages', 'moodboards']),
  userAction: z.string().optional(),
  currentData: z.record(z.any()).optional(),
  weddingContext: z.object({
    daysUntilWedding: z.number().optional(),
    budget: z.number().optional(),
    location: z.string().optional(),
    style: z.array(z.string()).optional(),
  }).optional(),
});

// Define insight action schema separately to avoid deep nesting issues with zod
const insightActionSchema = z.object({
  label: z.string(),
  action: z.string(),
  primary: z.boolean().optional(),
});

// Define insight types with more flexible schema
const insightSchema = z.object({
  type: z.enum(['urgent', 'opportunity', 'recommendation', 'optimization']),
  title: z.string(),
  description: z.string(),
  actionable: z.boolean().optional(),
  actions: z.array(insightActionSchema).optional(),
  priority: z.enum(['high', 'medium', 'low']).optional(),
  context: z.string().optional(), // Which page/context this applies to
});

export class ContextualWeddingAgent {
  private model = openai('gpt-4o-mini');

  /**
   * Generate contextual insights based on current page and user data
   */
  async generateContextualInsights(context: z.infer<typeof contextSchema>) {
    const prompt = this.buildContextualPrompt(context);

    try {
      const result = await generateObject({
        model: this.model,
        schema: z.object({
          insights: z.array(insightSchema),
          summary: z.string(),
          confidence: z.number().min(0).max(1),
        }),
        prompt,
        temperature: 0.3,
      });

      return result.object;
    } catch (error) {
      console.error('Contextual insight generation failed:', error);
      return {
        insights: [],
        summary: 'Unable to generate insights at this time',
        confidence: 0,
      };
    }
  }

  /**
   * Stream conversational responses for chat interface
   */
  async streamConversationalResponse(
    messages: Array<{ role: 'user' | 'assistant'; content: string }>,
    context: z.infer<typeof contextSchema>
  ) {
    const systemPrompt = `You are Paige, an intelligent wedding planning assistant. You have access to the user's wedding planning data and context.

Current Context:
- Page: ${context.page}
- Days until wedding: ${context.weddingContext?.daysUntilWedding || 'unknown'}
- Budget: $${context.weddingContext?.budget?.toLocaleString() || 'not set'}
- Location: ${context.weddingContext?.location || 'not set'}
- Style: ${context.weddingContext?.style?.join(', ') || 'not defined'}

Be helpful, proactive, and specific. Reference their actual data when possible.`;

    return streamText({
      model: this.model,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages,
      ],
      temperature: 0.7,
    });
  }

  /**
   * Build contextual prompt based on current page and data
   */
  private buildContextualPrompt(context: z.infer<typeof contextSchema>): string {
    const basePrompt = `You are Paige, an intelligent wedding planning assistant. Analyze the current context and provide relevant, actionable insights.

Current Context:
- Page: ${context.page}
- User Action: ${context.userAction || 'browsing'}
- Days until wedding: ${context.weddingContext?.daysUntilWedding || 'unknown'}
- Budget: $${context.weddingContext?.budget?.toLocaleString() || 'not set'}
- Location: ${context.weddingContext?.location || 'not set'}
- Style preferences: ${context.weddingContext?.style?.join(', ') || 'not defined'}

Current Data: ${JSON.stringify(context.currentData || {}, null, 2)}

Generate 1-3 highly relevant insights for this specific context. Each insight MUST include:
- type: one of "urgent", "opportunity", "recommendation", "optimization"
- title: clear, specific title
- description: detailed explanation
- priority: one of "high", "medium", "low"
- context: the page context (e.g., "${context.page}")
- actions: array of actionable steps with label, action, and primary boolean

Focus on:
1. Urgent actions needed (priority: "high")
2. Optimization opportunities (priority: "medium") 
3. Proactive recommendations (priority: "low")
4. Risk prevention (priority: "high")

Make insights specific, actionable, and valuable. Avoid generic advice.

IMPORTANT: Every insight must have priority and context fields filled out.`;

    // Add page-specific context
    switch (context.page) {
      case 'vendors':
        return basePrompt + `\n\nVendor Page Context: Focus on vendor selection, comparison, budget optimization, and booking timing. Look for opportunities to match vendors to their style and budget.`;
      
      case 'todo':
        return basePrompt + `\n\nTodo Page Context: Focus on task prioritization, deadline management, workflow optimization, and progress tracking. Identify overdue items and suggest task breakdown.`;
      
      case 'budget':
        return basePrompt + `\n\nBudget Page Context: Focus on spending analysis, reallocation opportunities, cost optimization, and budget health. Identify overspending or underspending categories.`;
      
      case 'dashboard':
        return basePrompt + `\n\nDashboard Context: Provide high-level planning health overview, critical next actions, and timeline optimization. Focus on the most important items across all categories.`;
      
      default:
        return basePrompt;
    }
  }

  /**
   * Get page-specific context for enhanced insights
   */
  getPageContext(page: string, data?: any) {
    switch (page) {
      case 'vendors':
        return {
          focus: 'vendor selection, comparison, budget optimization, and booking timing',
          opportunities: 'match vendors to style and budget, identify missing vendor categories',
        };
      
      case 'todo':
        return {
          focus: 'task prioritization, deadline management, workflow optimization, and progress tracking',
          opportunities: 'identify overdue items, suggest task breakdown, optimize workflow',
        };
      
      case 'budget':
        return {
          focus: 'spending analysis, reallocation opportunities, cost optimization, and budget health',
          opportunities: 'identify overspending or underspending categories, suggest reallocations',
        };
      
      case 'dashboard':
        return {
          focus: 'high-level planning health overview, critical next actions, and timeline optimization',
          opportunities: 'highlight most important items across all categories',
        };
      
      default:
        return {
          focus: 'general wedding planning guidance',
          opportunities: 'provide helpful suggestions based on current context',
        };
    }
  }
}

export const contextualAgent = new ContextualWeddingAgent();
