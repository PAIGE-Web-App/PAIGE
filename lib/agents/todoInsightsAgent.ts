/**
 * Todo Insights Agent - 2025 Implementation
 * 
 * SAFETY FEATURES:
 * - Only reads existing todo data (no writes)
 * - Uses existing useTodoItems hook patterns
 * - Minimal API calls
 * - Cached results
 * - Graceful degradation
 */

import { BaseWeddingAgent, AgentAnalysisResult, AgentResultBuilder, AgentContext } from './baseAgent';
import { collection, query, where, orderBy, getDocs, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface TodoItem {
  id: string;
  name: string;
  isCompleted: boolean;
  deadline?: Date | null;
  priority?: 'high' | 'medium' | 'low';
  category?: string;
  createdAt: Date;
  listId?: string | null;
}

export class TodoInsightsAgent extends BaseWeddingAgent {
  private todoCache: TodoItem[] | null = null;
  private cacheTimestamp: number = 0;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  getAgentName(): string {
    return 'TodoInsightsAgent';
  }

  /**
   * Main analysis method
   */
  async analyze(): Promise<AgentAnalysisResult> {
    this.log('Starting todo analysis');
    
    const resultBuilder = new AgentResultBuilder();

    try {
      // Get user's todos (cached to minimize Firestore reads)
      const todos = await this.getUserTodos();
      
      if (todos.length === 0) {
        return resultBuilder
          .setSummary('No todos found to analyze')
          .setConfidence(1.0)
          .build(this.getProcessingTime());
      }

      // Analyze different aspects of todos
      const overdueTasks = this.findOverdueTasks(todos);
      const upcomingDeadlines = this.findUpcomingDeadlines(todos);
      const completionStats = this.analyzeCompletionStats(todos);
      const priorityInsights = this.analyzePriorityDistribution(todos);

      // Generate insights based on analysis
      this.generateOverdueInsights(overdueTasks, resultBuilder);
      this.generateDeadlineInsights(upcomingDeadlines, resultBuilder);
      this.generateCompletionInsights(completionStats, resultBuilder);
      this.generatePriorityInsights(priorityInsights, resultBuilder);

      // Generate summary
      const summary = this.generateSummary(todos, overdueTasks, upcomingDeadlines);
      
      this.log('Todo analysis completed', {
        totalTodos: todos.length,
        insights: resultBuilder['insights'].length,
        processingTime: this.getProcessingTime()
      });

      return resultBuilder
        .setSummary(summary)
        .setConfidence(0.9)
        .setCacheHit(this.cacheTimestamp > 0)
        .build(this.getProcessingTime());

    } catch (error) {
      console.error('[TodoInsightsAgent] Analysis failed:', error);
      
      return resultBuilder
        .setSummary('Unable to analyze todos at this time')
        .setConfidence(0.0)
        .build(this.getProcessingTime());
    }
  }

  /**
   * Get user's todos with caching to minimize Firestore reads
   */
  private async getUserTodos(): Promise<TodoItem[]> {
    // Check cache first
    if (this.todoCache && (Date.now() - this.cacheTimestamp) < this.CACHE_TTL) {
      this.log('Using cached todo data');
      return this.todoCache;
    }

    this.log('Fetching fresh todo data from Firestore');

    try {
      const todosRef = collection(db, `users/${this.context.userId}/todoItems`);
      // Simplified query to avoid index requirements
      const q = query(
        todosRef,
        where('userId', '==', this.context.userId),
        limit(100) // Reasonable limit to prevent excessive reads
      );

      const snapshot = await getDocs(q);
      const todos: TodoItem[] = [];

      snapshot.docs.forEach(doc => {
        const data = doc.data();
        todos.push({
          id: doc.id,
          name: data.name || 'Untitled Task',
          isCompleted: data.isCompleted || false,
          deadline: data.deadline?.toDate() || null,
          priority: data.priority || 'medium',
          category: data.category || 'other',
          createdAt: data.createdAt?.toDate() || new Date(),
          listId: data.listId || null
        });
      });

      // Cache the results
      this.todoCache = todos;
      this.cacheTimestamp = Date.now();

      return todos;
    } catch (error) {
      console.error('[TodoInsightsAgent] Failed to fetch todos:', error);
      return [];
    }
  }

  /**
   * Find overdue tasks
   */
  private findOverdueTasks(todos: TodoItem[]): TodoItem[] {
    const now = new Date();
    return todos.filter(todo => 
      !todo.isCompleted && 
      todo.deadline && 
      todo.deadline < now
    );
  }

  /**
   * Find tasks with upcoming deadlines (next 7 days)
   */
  private findUpcomingDeadlines(todos: TodoItem[]): TodoItem[] {
    const now = new Date();
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    return todos.filter(todo => 
      !todo.isCompleted && 
      todo.deadline && 
      todo.deadline >= now && 
      todo.deadline <= nextWeek
    );
  }

  /**
   * Analyze completion statistics
   */
  private analyzeCompletionStats(todos: TodoItem[]) {
    const total = todos.length;
    const completed = todos.filter(t => t.isCompleted).length;
    const pending = total - completed;
    const completionRate = total > 0 ? (completed / total) * 100 : 0;

    return { total, completed, pending, completionRate };
  }

  /**
   * Analyze priority distribution
   */
  private analyzePriorityDistribution(todos: TodoItem[]) {
    const pendingTodos = todos.filter(t => !t.isCompleted);
    const high = pendingTodos.filter(t => t.priority === 'high').length;
    const medium = pendingTodos.filter(t => t.priority === 'medium').length;
    const low = pendingTodos.filter(t => t.priority === 'low').length;

    return { high, medium, low, total: pendingTodos.length };
  }

  /**
   * Generate insights for overdue tasks
   */
  private generateOverdueInsights(overdueTasks: TodoItem[], builder: AgentResultBuilder): void {
    if (overdueTasks.length === 0) return;

    const highPriorityOverdue = overdueTasks.filter(t => t.priority === 'high');
    
    if (highPriorityOverdue.length > 0) {
      builder.addInsight(this.createInsight(
        'urgent',
        `${highPriorityOverdue.length} High-Priority Tasks Overdue`,
        `You have ${highPriorityOverdue.length} high-priority tasks past their deadline. Consider addressing these immediately to stay on track.`,
        'todo',
        'high',
        { overdueTasks: highPriorityOverdue.map(t => ({ id: t.id, name: t.name, deadline: t.deadline })) }
      ));
    }

    if (overdueTasks.length > highPriorityOverdue.length) {
      const otherOverdue = overdueTasks.length - highPriorityOverdue.length;
      builder.addInsight(this.createInsight(
        'alert',
        `${otherOverdue} Additional Tasks Past Deadline`,
        `Review and reschedule these tasks to maintain your wedding planning momentum.`,
        'todo',
        'medium'
      ));
    }
  }

  /**
   * Generate insights for upcoming deadlines
   */
  private generateDeadlineInsights(upcomingTasks: TodoItem[], builder: AgentResultBuilder): void {
    if (upcomingTasks.length === 0) return;

    const sortedByDeadline = upcomingTasks.sort((a, b) => 
      (a.deadline?.getTime() || 0) - (b.deadline?.getTime() || 0)
    );

    const nextTask = sortedByDeadline[0];
    const daysUntilDeadline = nextTask.deadline ? 
      Math.ceil((nextTask.deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 0;

    builder.addInsight(this.createInsight(
      'alert',
      `Next Deadline: ${nextTask.name}`,
      `Due in ${daysUntilDeadline} day${daysUntilDeadline !== 1 ? 's' : ''}. ${upcomingTasks.length > 1 ? `Plus ${upcomingTasks.length - 1} more tasks due this week.` : ''}`,
      'todo',
      daysUntilDeadline <= 2 ? 'high' : 'medium',
      { taskId: nextTask.id, deadline: nextTask.deadline, daysUntil: daysUntilDeadline }
    ));
  }

  /**
   * Generate insights about completion progress
   */
  private generateCompletionInsights(stats: any, builder: AgentResultBuilder): void {
    if (stats.total === 0) return;

    if (stats.completionRate >= 80) {
      builder.addInsight(this.createInsight(
        'opportunity',
        'Great Progress!',
        `You've completed ${stats.completionRate.toFixed(0)}% of your wedding tasks. You're doing amazing!`,
        'todo',
        'low'
      ));
    } else if (stats.completionRate < 30 && stats.total > 5) {
      builder.addInsight(this.createInsight(
        'recommendation',
        'Consider Breaking Down Large Tasks',
        `With ${stats.pending} pending tasks, consider breaking larger items into smaller, manageable steps.`,
        'todo',
        'medium'
      ));
    }
  }

  /**
   * Generate insights about priority distribution
   */
  private generatePriorityInsights(priorities: any, builder: AgentResultBuilder): void {
    if (priorities.total === 0) return;

    if (priorities.high > 5) {
      builder.addInsight(this.createInsight(
        'recommendation',
        'Too Many High-Priority Tasks',
        `You have ${priorities.high} high-priority tasks. Consider if some can be medium priority to reduce overwhelm.`,
        'todo',
        'medium'
      ));
    }

    if (priorities.high === 0 && priorities.total > 3) {
      builder.addInsight(this.createInsight(
        'recommendation',
        'Set Task Priorities',
        'Consider marking your most important tasks as high priority to focus your efforts effectively.',
        'todo',
        'low'
      ));
    }
  }

  /**
   * Generate summary of todo analysis
   */
  private generateSummary(todos: TodoItem[], overdue: TodoItem[], upcoming: TodoItem[]): string {
    const completed = todos.filter(t => t.isCompleted).length;
    const pending = todos.length - completed;

    let summary = `You have ${pending} pending tasks`;
    
    if (completed > 0) {
      summary += ` and ${completed} completed`;
    }
    
    if (overdue.length > 0) {
      summary += `. ${overdue.length} tasks are overdue`;
    }
    
    if (upcoming.length > 0) {
      summary += `. ${upcoming.length} tasks due this week`;
    }
    
    summary += '.';
    
    return summary;
  }
}
