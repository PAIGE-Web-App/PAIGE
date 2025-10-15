// utils/messageAnalysisEngine.ts
// AI-powered message analysis for smart to-do detection

export interface DetectedTodo {
  name: string;
  note?: string;
  deadline?: Date | null;
  category?: string | null; // Categories can be assigned by user
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
  id?: string;
  name: string;
  deadline?: Date | null;
  note?: string;
  category?: string;
  listId?: string;
  completionReason: string;
  sourceText: string;
  matchedTodo?: any;
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
    weddingDate?: Date | null;
    weddingLocation?: string | null;
    guestCount?: number | null;
    maxBudget?: number | null;
    vibe?: string[];
    planningStage?: string;
    daysUntilWedding?: number | null;
  };
  ragContext?: string; // RAG-enhanced context for better analysis
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
   * Perform AI-powered analysis using OpenAI with RAG enhancement
   */
  private async performAIAnalysis(context: AnalysisContext): Promise<MessageAnalysisResult> {
    const prompt = this.buildAnalysisPrompt(context);
    
    try {
      // Get RAG context if available
      let ragContext = '';
      if (context.ragContext) {
        ragContext = context.ragContext;
      } else {
        // Try to get RAG context for better analysis
        try {
          const ragResponse = await fetch('/api/rag/process-query', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              query: context.messageContent,
              userId: context.userId,
              contextType: 'message_analysis'
            }),
          });

          if (ragResponse.ok) {
            const ragResult = await ragResponse.json();
            ragContext = ragResult.context || '';
          }
        } catch (ragError) {
          console.warn('[MessageAnalysisEngine] RAG context failed, proceeding without:', ragError);
        }
      }

      const response = await fetch('/api/analyze-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messageContent: context.messageContent,
          vendorCategory: context.vendorCategory,
          vendorName: context.vendorName,
          existingTodos: context.existingTodos,
          weddingContext: context.weddingContext,
          userId: context.userId,
          ragContext: ragContext
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

CRITICAL ANALYSIS RULES:

1. **ALWAYS CHECK EXISTING TODOS FIRST** - Look through the existing todos list below
2. **MATCH MESSAGE CONTENT TO EXISTING TODOS** - Find similar tasks
3. **DETECT COMPLETIONS** - If message says "done", "finished", "completed" about an existing task, mark it as COMPLETED
4. **DETECT UPDATES** - If message modifies an existing task, mark it as UPDATE
5. **ONLY CREATE NEW TODOS** if no existing todo matches

COMPLETION KEYWORDS: "done", "finished", "completed", "finished creating", "done with"

EXAMPLE ANALYSIS:
Message: "Done with creating the shared planning folder"
Existing todo: "Create a shared email/folder/spreadsheet for planning"
Analysis: MATCH FOUND - "creating shared planning folder" matches "Create shared email/folder/spreadsheet for planning"
Result: Add to completedTodos array, NOT newTodos array

MESSAGE CONTENT:
${context.messageContent}

VENDOR CONTEXT:
- Vendor: ${context.vendorName}
- Category: ${context.vendorCategory}

EXISTING TODOS:
${context.existingTodos?.map((todo: any) => `- ${todo.name} (${todo.category}) - ${todo.isCompleted ? 'Completed' : 'Pending'}`).join('\n') || 'None'}

DEBUG: Total existing todos: ${context.existingTodos?.length || 0}

IMPORTANT: Before creating any new todos, carefully compare the message content with existing todos. Look for:
- Similar task names or descriptions
- Tasks that might be completed by the message content
- Tasks that need updates based on the message
- Avoid creating duplicates of existing tasks

WEDDING CONTEXT:
${context.weddingContext ? `- Wedding Date: ${context.weddingContext.weddingDate ? context.weddingContext.weddingDate.toLocaleDateString() : 'Not set'}
- Wedding Location: ${context.weddingContext.weddingLocation || 'Not set'}
- Guest Count: ${context.weddingContext.guestCount || 'Not set'}
- Budget: ${context.weddingContext.maxBudget ? `$${context.weddingContext.maxBudget.toLocaleString()}` : 'Not set'}
- Planning Stage: ${context.weddingContext.planningStage || 'Unknown'}
- Days Until Wedding: ${context.weddingContext.daysUntilWedding || 'Unknown'}
- Wedding Vibes: ${context.weddingContext.vibe?.join(', ') || 'Not set'}` : 'Not available'}

LIST TRIAGE GUIDELINES:
- "Day-Of Wedding Timeline" - for tasks that must happen on the wedding day
- "Vendor Coordination" - for vendor meetings, consultations, and follow-ups
- "Planning & Logistics" - for general planning tasks, venue visits, etc.
- "Personal Preparation" - for dress fittings, beauty appointments, etc.
- "Budget & Finance" - for financial planning and payment tasks
- "Guest Management" - for RSVPs, guest list, and accommodations

OUTPUT INSTRUCTIONS:
1. **FIRST**: Check if message indicates completion of existing todo → add to "completedTodos" array
2. **SECOND**: Check if message indicates update to existing todo → add to "todoUpdates" array  
3. **LAST**: Only add to "newTodos" if it's truly a new task not already in the existing todos list

**MANDATORY**: Before adding anything to "newTodos", verify it doesn't match any existing todo in the list below!

OUTPUT FORMAT (JSON only, no other text):

**IMPORTANT**: If the message says "done with creating the shared planning folder", it should go in completedTodos, NOT newTodos!

{
  "newTodos": [
    {
      "name": "Task name",
      "note": "Optional note or description",
      "category": null,
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
      // Validate and parse the AI response - access analysis.newTodos, not newTodos directly
      const result: MessageAnalysisResult = {
        newTodos: aiResult.analysis?.newTodos?.map((todo: any) => ({
          ...todo,
          vendorContext: {
            vendorName: context.vendorName,
            vendorCategory: context.vendorCategory,
            contactId: context.contactId
          },
          deadline: todo.deadline ? new Date(todo.deadline) : undefined
        })) || [],
        todoUpdates: aiResult.analysis?.todoUpdates || [],
        completedTodos: aiResult.analysis?.completedTodos || [],
        analysisType: aiResult.analysis?.analysisType || 'new_message'
      };

      // RULE-BASED COMPLETION DETECTION (fallback when AI fails)
      const ruleBasedCompletions = this.detectCompletionsRuleBased(context.messageContent, context.existingTodos || []);
      
      if (ruleBasedCompletions.length > 0) {
        result.completedTodos = [...result.completedTodos, ...ruleBasedCompletions];
        
        // Remove any newTodos that match completed ones
        result.newTodos = result.newTodos.filter(newTodo => {
          return !ruleBasedCompletions.some(completion => 
            this.isSimilarTask(newTodo.name, completion.matchedTodo?.name || completion.matchedTodo?.title || '')
          );
        });
      }

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
   * Rule-based completion detection as fallback
   */
  private detectCompletionsRuleBased(messageContent: string, existingTodos: any[]): any[] {
    const completions: any[] = [];
    const content = messageContent.toLowerCase();
    const matchedTodoIds = new Set<string>(); // Track matched todos to prevent duplicates
    
    // Check for completion keywords
    const completionKeywords = ['done with', 'finished', 'completed', 'done creating', 'finished creating'];
    const hasCompletionKeyword = completionKeywords.some(keyword => content.includes(keyword));
    
    if (!hasCompletionKeyword) {
      return completions;
    }
    
    // Look for matching existing todos
    existingTodos.forEach((todo) => {
      const todoName = todo.name || todo.title;
      const todoId = todo.id || todoName; // Use ID if available, otherwise use name
      
      // Skip if we've already matched this todo
      if (matchedTodoIds.has(todoId)) {
        return;
      }
      
      if (this.isCompletionMatch(content, todoName)) {
        matchedTodoIds.add(todoId);
        
        // Include full todo details in the completion
        completions.push({
          id: todo.id,
          name: todo.name || todo.title,
          deadline: todo.deadline,
          note: todo.note || todo.notes,
          category: todo.category,
          listId: todo.listId,
          completionReason: `Task completed as indicated in message: "${messageContent}"`,
          sourceText: messageContent,
          matchedTodo: todo
        });
      }
    });
    
    return completions;
  }

  /**
   * Check if message content indicates completion of a specific todo
   */
  private isCompletionMatch(messageContent: string, todoName: string): boolean {
    const content = messageContent.toLowerCase();
    const todo = todoName.toLowerCase();
    
    // Extract key words from todo name (remove common words)
    const todoWords = todo.split(/\s+/).filter(word => 
      !['a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'].includes(word)
    );
    
    // Extract key words from message content
    const messageWords = content.split(/\s+/).filter(word => 
      !['done', 'with', 'finished', 'completed', 'creating', 'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'].includes(word)
    );
    
    // Check for significant word overlap
    const overlap = todoWords.filter(word => 
      messageWords.some(msgWord => 
        msgWord.includes(word) || word.includes(msgWord) || this.areSimilarWords(word, msgWord)
      )
    );
    
    // Consider it a match if at least 2 key words overlap
    return overlap.length >= 2;
  }

  /**
   * Check if two words are similar (fuzzy matching)
   */
  private areSimilarWords(word1: string, word2: string): boolean {
    // Simple similarity check
    const longer = word1.length > word2.length ? word1 : word2;
    const shorter = word1.length > word2.length ? word2 : word1;
    
    if (longer.length === 0) return true;
    
    const editDistance = this.levenshteinDistance(longer, shorter);
    return (editDistance / longer.length) < 0.3; // 30% similarity threshold
  }

  /**
   * Check if two task names are similar
   */
  private isSimilarTask(task1: string, task2: string): boolean {
    if (!task1 || !task2) return false;
    return this.areSimilarWords(task1.toLowerCase(), task2.toLowerCase());
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
    
    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
    
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + indicator
        );
      }
    }
    
    return matrix[str2.length][str1.length];
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
