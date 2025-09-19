// utils/messageAnalysisEngine.ts
// AI-powered message analysis for smart to-do detection

export interface DetectedTodo {
  name: string;
  note?: string;
  deadline?: Date | null;
  category?: string | null;
  suggestedList?: string | null;
  assignedTo?: string[] | null;
  sourceText: string;
  vendorContext: {
    vendorName: string;
    vendorCategory: string;
    contactId: string;
  };
}

export interface TodoUpdate {
  updateType: 'note' | 'status_change' | 'deadline_update' | 'category_change';
  content: string;
  sourceText: string;
}

export interface CompletedTodo {
  completionReason: string;
  sourceText: string;
}

export interface MessageAnalysisResult {
  newTodos: DetectedTodo[];
  todoUpdates: TodoUpdate[];
  completedTodos: CompletedTodo[];
  analysisType: 'new_message' | 'reply' | 'ongoing_conversation';
  // Integration with existing AI to-do system
  aiTodoList?: {
    name: string;
    description: string;
    vendorContext: string;
  };
}

export interface AnalysisContext {
  messageContent: string;
  vendorCategory: string;
  vendorName: string;
  contactId: string;
  userId: string; // Required for credit validation
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
      
      // Cache the result with timestamp
      this.analysisCache.set(cacheKey, this.addTimestamp(analysis));
      
      return analysis;
    } catch (error) {
      console.error('[MessageAnalysisEngine] AI analysis failed:', error);
      
      // Check if we have a recent cached result even if it's expired
      const cached = this.analysisCache.get(cacheKey);
      if (cached) {
        const cacheAge = Date.now() - (cached as any).timestamp;
        if (cacheAge < 30 * 60 * 1000) { // Use cache up to 30 minutes old
          console.log('[MessageAnalysisEngine] Using expired cache due to AI failure');
          return cached;
        }
      }
      
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
          weddingContext: context.weddingContext,
          userId: context.userId
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
    let prompt = `You are an AI assistant that analyzes wedding planning messages to detect actionable items and prepare them for integration with an existing AI to-do generation system.

ANALYSIS TASK:
1. Detect NEW to-do items that need to be created
2. Identify UPDATES to existing to-do items
3. Spot COMPLETED to-do items
4. Prepare context for AI to-do generation using existing system
5. Suggest appropriate deadlines based on wedding context
6. Recommend the best list category for each item

MESSAGE CONTENT:
${context.messageContent}

VENDOR CONTEXT:
- Vendor: ${context.vendorName}
- Category: ${context.vendorCategory}

EXISTING TODOS:
${context.existingTodos?.map((todo: any) => `- ${todo.name} (${todo.category}) - ${todo.isCompleted ? 'Completed' : 'Pending'}`).join('\n') || 'None'}

WEDDING CONTEXT:
${context.weddingContext ? `- Wedding Date: ${context.weddingContext.weddingDate.toLocaleDateString()}
- Planning Stage: ${context.weddingContext.planningStage}
- Days Until Wedding: ${context.weddingContext.daysUntilWedding}` : 'Not available'}

LIST TRIAGE GUIDELINES:
- "Day-Of Wedding Timeline" - for tasks that must happen on the wedding day
- "Vendor Coordination" - for vendor meetings, consultations, and follow-ups
- "Planning & Logistics" - for general planning tasks, venue visits, etc.
- "Personal Preparation" - for dress fittings, beauty appointments, etc.
- "Budget & Finance" - for financial planning and payment tasks
- "Guest Management" - for RSVPs, guest list, and accommodations

OUTPUT FORMAT (JSON only, no other text):
{
  "newTodos": [
    {
      "name": "Task name",
      "note": "Optional note or description",
      "category": "Category name (use existing categories when possible)",
      "deadline": "YYYY-MM-DD",
      "suggestedList": "Recommended list name from guidelines above",
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
  "analysisType": "new_message|reply|ongoing_conversation",
  "aiTodoList": {
    "name": "AI-Generated To-Do List from ${context.vendorName} Message",
    "description": "To-do items detected from message with ${context.vendorName} (${context.vendorCategory})",
    "vendorContext": "Message from ${context.vendorName} regarding ${context.vendorCategory} services"
  }
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
          deadline: todo.deadline ? new Date(todo.deadline) : undefined
        })) || [],
        todoUpdates: aiResult.todoUpdates || [],
        completedTodos: aiResult.completedTodos || [],
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
      analysisType: 'new_message'
    };

    const content = context.messageContent.toLowerCase();
    
    // Simple pattern matching for new todos
    if (content.includes('schedule') || content.includes('book') || content.includes('meeting')) {
      result.newTodos.push({
        name: `Schedule ${context.vendorCategory} consultation`,
        note: `Follow up with ${context.vendorName} about scheduling`,
        category: context.vendorCategory,
        assignedTo: [context.contactId],
        sourceText: 'Detected scheduling language',
        vendorContext: {
          vendorName: context.vendorName,
          vendorCategory: context.vendorCategory,
          contactId: context.contactId
        }
      });
    }

    if (content.includes('quote') || content.includes('pricing') || content.includes('cost')) {
      result.newTodos.push({
        name: `Get ${context.vendorCategory} pricing`,
        note: `Request quote from ${context.vendorName}`,
        category: context.vendorCategory,
        assignedTo: [context.contactId],
        sourceText: 'Detected pricing inquiry language',
        vendorContext: {
          vendorName: context.vendorName,
          vendorCategory: context.vendorCategory,
          contactId: context.contactId
        }
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
    return cacheAge < 10 * 60 * 1000; // 10 minutes cache validity
  }

  /**
   * Add timestamp to cached results
   */
  private addTimestamp(result: MessageAnalysisResult): MessageAnalysisResult {
    return {
      ...result,
      timestamp: Date.now()
    } as MessageAnalysisResult & { timestamp: number };
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
