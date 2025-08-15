// utils/messageAnalysisEngine.ts
// AI-powered message analysis for smart to-do detection

export interface MessageAnalysisResult {
  newTodos: DetectedTodo[];
  todoUpdates: TodoUpdate[];
  completedTodos: CompletedTodo[];
  confidence: number;
  analysisType: 'new_message' | 'reply' | 'ongoing_conversation';
}

export interface DetectedTodo {
  title: string;
  description: string;
  category: string;
  priority: 'low' | 'medium' | 'high';
  suggestedDeadline?: Date;
  vendorContext?: {
    vendorName: string;
    vendorCategory: string;
    contactId: string;
  };
  sourceText: string;
  confidence: number;
}

export interface TodoUpdate {
  todoId?: string; // If we can match to existing todo
  todoTitle?: string; // If we can't match but know the title
  updateType: 'note' | 'status_change' | 'deadline_update' | 'category_change';
  content: string;
  sourceText: string;
  confidence: number;
}

export interface CompletedTodo {
  todoId?: string;
  todoTitle?: string;
  completionReason: string;
  sourceText: string;
  confidence: number;
}

export interface AnalysisContext {
  messageContent: string;
  vendorCategory: string;
  vendorName: string;
  contactId: string;
  conversationHistory?: string[];
  existingTodos?: Array<{
    id: string;
    title: string;
    category: string;
    isCompleted: boolean;
  }>;
  weddingContext?: {
    weddingDate: Date;
    planningStage: string;
    daysUntilWedding: number;
  };
}

export class MessageAnalysisEngine {
  private static instance: MessageAnalysisEngine;
  private analysisCache = new Map<string, MessageAnalysisResult>();

  static getInstance(): MessageAnalysisEngine {
    if (!MessageAnalysisEngine.instance) {
      MessageAnalysisEngine.instance = new MessageAnalysisEngine();
    }
    return MessageAnalysisEngine.instance;
  }

  /**
   * Analyze a message for actionable items
   */
  async analyzeMessage(context: AnalysisContext): Promise<MessageAnalysisResult> {
    const cacheKey = this.generateCacheKey(context);
    
    // Check cache first
    if (this.analysisCache.has(cacheKey)) {
      const cached = this.analysisCache.get(cacheKey)!;
      if (this.isCacheValid(cached)) {
        return cached;
      }
    }

    try {
      // Use AI to analyze the message content
      const analysis = await this.performAIAnalysis(context);
      
      // Cache the result
      this.analysisCache.set(cacheKey, analysis);
      
      return analysis;
    } catch (error) {
      console.error('[MessageAnalysisEngine] AI analysis failed:', error);
      // Fallback to rule-based analysis
      return this.performRuleBasedAnalysis(context);
    }
  }

  /**
   * Perform AI-powered analysis using OpenAI
   */
  private async performAIAnalysis(context: AnalysisContext): Promise<MessageAnalysisResult> {
    const prompt = this.buildAnalysisPrompt(context);
    
    try {
      const response = await fetch('/api/analyze-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messageContent: context.messageContent,
          vendorCategory: context.vendorCategory,
          vendorName: context.vendorName,
          existingTodos: context.existingTodos,
          weddingContext: context.weddingContext
        }),
      });

      if (!response.ok) {
        throw new Error(`API call failed: ${response.status}`);
      }

      const result = await response.json();
      return this.parseAIAnalysisResult(result, context);
    } catch (error) {
      console.error('[MessageAnalysisEngine] AI analysis API failed:', error);
      throw error;
    }
  }

  /**
   * Build the AI analysis prompt
   */
  private buildAnalysisPrompt(context: AnalysisContext): string {
    let prompt = `Analyze this message from a ${context.vendorCategory} vendor for actionable wedding planning items.

MESSAGE CONTENT:
${context.messageContent}

VENDOR CONTEXT:
- Vendor: ${context.vendorName}
- Category: ${context.vendorCategory}

EXISTING TODOS:
${context.existingTodos?.map(todo => `- ${todo.title} (${todo.category}) - ${todo.isCompleted ? 'Completed' : 'Pending'}`).join('\n') || 'None'}

WEDDING CONTEXT:
${context.weddingContext ? `- Wedding Date: ${context.weddingContext.weddingDate.toLocaleDateString()}
- Planning Stage: ${context.weddingContext.planningStage}
- Days Until Wedding: ${context.weddingContext.daysUntilWedding}` : 'Not available'}

ANALYSIS TASK:
1. Detect NEW to-do items that need to be created
2. Identify UPDATES to existing to-do items
3. Spot COMPLETED to-do items
4. Categorize by priority and suggest deadlines

OUTPUT FORMAT (JSON):
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

    return prompt;
  }

  /**
   * Parse AI analysis result
   */
  private parseAIAnalysisResult(aiResult: any, context: AnalysisContext): MessageAnalysisResult {
    try {
      // Validate and parse the AI response
      const result: MessageAnalysisResult = {
        newTodos: aiResult.newTodos?.map((todo: any) => ({
          ...todo,
          vendorContext: {
            vendorName: context.vendorName,
            vendorCategory: context.vendorCategory,
            contactId: context.contactId
          },
          suggestedDeadline: todo.suggestedDeadline ? new Date(todo.suggestedDeadline) : undefined
        })) || [],
        todoUpdates: aiResult.todoUpdates || [],
        completedTodos: aiResult.completedTodos || [],
        confidence: aiResult.confidence || 0.8,
        analysisType: aiResult.analysisType || 'new_message'
      };

      return result;
    } catch (error) {
      console.error('[MessageAnalysisEngine] Failed to parse AI result:', error);
      throw new Error('Invalid AI analysis result format');
    }
  }

  /**
   * Fallback rule-based analysis
   */
  private performRuleBasedAnalysis(context: AnalysisContext): MessageAnalysisResult {
    const result: MessageAnalysisResult = {
      newTodos: [],
      todoUpdates: [],
      completedTodos: [],
      confidence: 0.6,
      analysisType: 'new_message'
    };

    const content = context.messageContent.toLowerCase();
    
    // Simple pattern matching for new todos
    if (content.includes('schedule') || content.includes('book') || content.includes('meeting')) {
      result.newTodos.push({
        title: `Schedule ${context.vendorCategory} consultation`,
        description: `Follow up with ${context.vendorName} about scheduling`,
        category: context.vendorCategory,
        priority: 'medium',
        sourceText: 'Detected scheduling language',
        confidence: 0.7
      });
    }

    if (content.includes('quote') || content.includes('pricing') || content.includes('cost')) {
      result.newTodos.push({
        title: `Get ${context.vendorCategory} pricing`,
        description: `Request quote from ${context.vendorName}`,
        category: context.vendorCategory,
        priority: 'high',
        sourceText: 'Detected pricing inquiry language',
        confidence: 0.8
      });
    }

    return result;
  }

  /**
   * Generate cache key for analysis results
   */
  private generateCacheKey(context: AnalysisContext): string {
    return `${context.contactId}-${context.messageContent.substring(0, 100)}-${context.vendorCategory}`;
  }

  /**
   * Check if cached result is still valid
   */
  private isCacheValid(result: MessageAnalysisResult): boolean {
    const cacheAge = Date.now() - (result as any).timestamp;
    return cacheAge < 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Clear cache for a specific contact
   */
  clearContactCache(contactId: string): void {
    const keysToDelete = Array.from(this.analysisCache.keys())
      .filter(key => key.startsWith(contactId));
    keysToDelete.forEach(key => this.analysisCache.delete(key));
  }

  /**
   * Clear all cache
   */
  clearAllCache(): void {
    this.analysisCache.clear();
  }
}

// Export singleton instance
export const messageAnalysisEngine = MessageAnalysisEngine.getInstance();
