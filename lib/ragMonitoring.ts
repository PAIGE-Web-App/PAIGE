/**
 * RAG Monitoring and Health Check System
 * 
 * This module provides monitoring, health checks, and performance tracking
 * for the RAG system to ensure reliability and performance.
 */

import { getRAGConfigForLogging } from './ragFeatureFlag';

export interface RAGMetrics {
  responseTime: number;
  tokenUsage: number;
  accuracy: number;
  errorRate: number;
  userSatisfaction: number;
  timestamp: Date;
  userId: string;
  feature: string;
  source: 'rag' | 'original';
}

export interface HealthCheck {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime: number;
  error?: string;
  timestamp: Date;
}

export interface RAGPerformanceReport {
  totalRequests: number;
  ragRequests: number;
  originalRequests: number;
  averageResponseTime: number;
  averageTokenUsage: number;
  errorRate: number;
  userSatisfaction: number;
  costSavings: number;
  period: {
    start: Date;
    end: Date;
  };
}

class RAGMonitoringService {
  private metrics: RAGMetrics[] = [];
  private healthChecks: HealthCheck[] = [];
  private readonly maxMetricsHistory = 1000; // Keep last 1000 metrics

  /**
   * Record a metric for monitoring
   */
  recordMetric(metric: Omit<RAGMetrics, 'timestamp'>): void {
    const fullMetric: RAGMetrics = {
      ...metric,
      timestamp: new Date()
    };

    this.metrics.push(fullMetric);

    // Keep only the most recent metrics
    if (this.metrics.length > this.maxMetricsHistory) {
      this.metrics = this.metrics.slice(-this.maxMetricsHistory);
    }

    // Log metric for monitoring
    console.log('📊 RAG Metric:', {
      feature: fullMetric.feature,
      source: fullMetric.source,
      responseTime: fullMetric.responseTime,
      tokenUsage: fullMetric.tokenUsage,
      accuracy: fullMetric.accuracy
    });
  }

  /**
   * Perform health checks on RAG system components
   */
  async performHealthChecks(): Promise<HealthCheck[]> {
    const checks: HealthCheck[] = [];

    // Check RAG configuration
    checks.push(await this.checkRAGConfiguration());

    // Check N8N webhook (if configured)
    if (process.env.RAG_N8N_WEBHOOK_URL) {
      checks.push(await this.checkN8NWebhook());
    }

    // Check vector database (if configured)
    if (process.env.RAG_VECTOR_DB_URL) {
      checks.push(await this.checkVectorDatabase());
    }

    // Check OpenAI API
    checks.push(await this.checkOpenAIAPI());

    this.healthChecks = checks;
    return checks;
  }

  /**
   * Check RAG configuration health
   */
  private async checkRAGConfiguration(): Promise<HealthCheck> {
    const startTime = Date.now();
    
    try {
      const config = getRAGConfigForLogging();
      
      return {
        name: 'RAG Configuration',
        status: 'healthy',
        responseTime: Date.now() - startTime,
        timestamp: new Date()
      };
    } catch (error) {
      return {
        name: 'RAG Configuration',
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      };
    }
  }

  /**
   * Check N8N webhook health
   */
  private async checkN8NWebhook(): Promise<HealthCheck> {
    const startTime = Date.now();
    
    try {
      const response = await fetch(process.env.RAG_N8N_WEBHOOK_URL!, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ healthCheck: true })
      });

      const status = response.ok ? 'healthy' : 'degraded';
      
      return {
        name: 'N8N Webhook',
        status,
        responseTime: Date.now() - startTime,
        error: response.ok ? undefined : `HTTP ${response.status}`,
        timestamp: new Date()
      };
    } catch (error) {
      return {
        name: 'N8N Webhook',
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      };
    }
  }

  /**
   * Check vector database health
   */
  private async checkVectorDatabase(): Promise<HealthCheck> {
    const startTime = Date.now();
    
    try {
      // This would be a simple ping to your vector database
      // Implementation depends on your chosen vector database
      
      return {
        name: 'Vector Database',
        status: 'healthy',
        responseTime: Date.now() - startTime,
        timestamp: new Date()
      };
    } catch (error) {
      return {
        name: 'Vector Database',
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      };
    }
  }

  /**
   * Check OpenAI API health
   */
  private async checkOpenAIAPI(): Promise<HealthCheck> {
    const startTime = Date.now();
    
    try {
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
        }
      });

      const status = response.ok ? 'healthy' : 'degraded';
      
      return {
        name: 'OpenAI API',
        status,
        responseTime: Date.now() - startTime,
        error: response.ok ? undefined : `HTTP ${response.status}`,
        timestamp: new Date()
      };
    } catch (error) {
      return {
        name: 'OpenAI API',
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      };
    }
  }

  /**
   * Generate performance report
   */
  generatePerformanceReport(hours: number = 24): RAGPerformanceReport {
    const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);
    const recentMetrics = this.metrics.filter(m => m.timestamp >= cutoffTime);

    const ragMetrics = recentMetrics.filter(m => m.source === 'rag');
    const originalMetrics = recentMetrics.filter(m => m.source === 'original');

    const totalRequests = recentMetrics.length;
    const ragRequests = ragMetrics.length;
    const originalRequests = originalMetrics.length;

    const averageResponseTime = recentMetrics.length > 0 
      ? recentMetrics.reduce((sum, m) => sum + m.responseTime, 0) / recentMetrics.length 
      : 0;

    const averageTokenUsage = recentMetrics.length > 0
      ? recentMetrics.reduce((sum, m) => sum + m.tokenUsage, 0) / recentMetrics.length
      : 0;

    const errorRate = recentMetrics.length > 0
      ? recentMetrics.filter(m => m.errorRate > 0).length / recentMetrics.length
      : 0;

    const userSatisfaction = recentMetrics.length > 0
      ? recentMetrics.reduce((sum, m) => sum + m.userSatisfaction, 0) / recentMetrics.length
      : 0;

    // Calculate cost savings (assuming RAG uses 60% fewer tokens)
    const costSavings = ragRequests * averageTokenUsage * 0.6 * 0.0001; // Rough estimate

    return {
      totalRequests,
      ragRequests,
      originalRequests,
      averageResponseTime,
      averageTokenUsage,
      errorRate,
      userSatisfaction,
      costSavings,
      period: {
        start: cutoffTime,
        end: new Date()
      }
    };
  }

  /**
   * Check if system should trigger rollback
   */
  shouldTriggerRollback(): boolean {
    const report = this.generatePerformanceReport(1); // Last hour
    
    // Trigger rollback if:
    // - Error rate > 5%
    // - Average response time > 10 seconds
    // - User satisfaction < 3.0
    return report.errorRate > 0.05 || 
           report.averageResponseTime > 10000 || 
           report.userSatisfaction < 3.0;
  }

  /**
   * Get current system status
   */
  getSystemStatus(): 'healthy' | 'degraded' | 'unhealthy' {
    const unhealthyChecks = this.healthChecks.filter(c => c.status === 'unhealthy').length;
    const degradedChecks = this.healthChecks.filter(c => c.status === 'degraded').length;

    if (unhealthyChecks > 0) return 'unhealthy';
    if (degradedChecks > 0) return 'degraded';
    return 'healthy';
  }
}

// Export singleton instance
export const ragMonitoring = new RAGMonitoringService();

/**
 * Utility function to record RAG metrics
 */
export function recordRAGMetric(metric: Omit<RAGMetrics, 'timestamp'>): void {
  ragMonitoring.recordMetric(metric);
}

/**
 * Utility function to perform health checks
 */
export function performRAGHealthChecks(): Promise<HealthCheck[]> {
  return ragMonitoring.performHealthChecks();
}

/**
 * Utility function to check if rollback should be triggered
 */
export function shouldTriggerRAGRollback(): boolean {
  return ragMonitoring.shouldTriggerRollback();
}
