/**
 * RAG Service for PAIGE
 * 
 * This service handles communication with N8N workflows for document processing
 * and query processing. It provides a clean interface for the RAG system.
 */

import { shouldUseRAG, isFallbackEnabled } from './ragFeatureFlag';
import { recordRAGMetric } from './ragMonitoring';

export interface DocumentProcessingRequest {
  document_id: string;
  document_content: string;
  source: string;
  user_id: string;
  document_type: 'wedding_guide' | 'vendor_template' | 'user_document';
}

export interface DocumentProcessingResponse {
  success: boolean;
  message: string;
  document_id: string;
  chunks_created: number;
  timestamp: string;
  error?: string;
}

export interface QueryProcessingRequest {
  query: string;
  user_id: string;
  user_document?: string;
  context?: any;
}

export interface QueryProcessingResponse {
  success: boolean;
  answer: string;
  sources: string[];
  confidence_scores: number[];
  query: string;
  timestamp: string;
  model_used: string;
  rag_enabled: boolean;
  error?: string;
}

export interface RAGHealthCheck {
  n8n_webhook: boolean;
  vector_database: boolean;
  openai_api: boolean;
  overall_status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
}

class RAGService {
  private n8nWebhookUrl: string;
  private fallbackEnabled: boolean;

  constructor() {
    this.n8nWebhookUrl = process.env.RAG_N8N_WEBHOOK_URL || '';
    this.fallbackEnabled = isFallbackEnabled();
  }

  /**
   * Process a document through the RAG system
   */
  async processDocument(request: DocumentProcessingRequest): Promise<DocumentProcessingResponse> {
    const startTime = Date.now();

    try {
      // Check if RAG is enabled for this user
      // Note: RAG user check is already done in the API layer
      // TODO: Pass user_email to this method for proper beta user checking

      // Validate request
      if (!request.document_content || !request.document_id) {
        throw new Error('Document content and ID are required');
      }

      // Call N8N webhook for document processing
      const response = await fetch(this.n8nWebhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`N8N webhook failed: ${response.status} ${response.statusText}`);
      }

      const result: DocumentProcessingResponse = await response.json();

      // Record metrics
      recordRAGMetric({
        responseTime: Date.now() - startTime,
        tokenUsage: 0, // Document processing doesn't use tokens
        accuracy: 1.0, // Document processing is deterministic
        errorRate: 0,
        userSatisfaction: 5.0, // Assume success means satisfaction
        userId: request.user_id,
        feature: 'document_processing',
        source: 'rag'
      });

      return result;

    } catch (error) {
      // Record error metrics
      recordRAGMetric({
        responseTime: Date.now() - startTime,
        tokenUsage: 0,
        accuracy: 0,
        errorRate: 1.0,
        userSatisfaction: 1.0,
        userId: request.user_id,
        feature: 'document_processing',
        source: 'rag'
      });

      // Return error response
      return {
        success: false,
        message: 'Document processing failed',
        document_id: request.document_id,
        chunks_created: 0,
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Process a query through the RAG system
   */
  async processQuery(request: QueryProcessingRequest): Promise<QueryProcessingResponse> {
    const startTime = Date.now();

    try {
      // Check if RAG is enabled for this user
      // Note: RAG user check is already done in the API layer
      // TODO: Pass user_email to this method for proper beta user checking

      // Validate request
      if (!request.query || !request.user_id) {
        throw new Error('Query and user ID are required');
      }

      // Call N8N webhook for query processing
      const response = await fetch(`${this.n8nWebhookUrl}/process-query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`N8N webhook failed: ${response.status} ${response.statusText}`);
      }

      const result: QueryProcessingResponse = await response.json();

      // Record metrics
      recordRAGMetric({
        responseTime: Date.now() - startTime,
        tokenUsage: this.estimateTokenUsage(result.answer),
        accuracy: this.calculateAccuracy(result.confidence_scores),
        errorRate: 0,
        userSatisfaction: 5.0, // Assume success means satisfaction
        userId: request.user_id,
        feature: 'query_processing',
        source: 'rag'
      });

      return result;

    } catch (error) {
      // Record error metrics
      recordRAGMetric({
        responseTime: Date.now() - startTime,
        tokenUsage: 0,
        accuracy: 0,
        errorRate: 1.0,
        userSatisfaction: 1.0,
        userId: request.user_id,
        feature: 'query_processing',
        source: 'rag'
      });

      // Return error response
      return {
        success: false,
        answer: 'I apologize, but I encountered an error processing your query.',
        sources: [],
        confidence_scores: [],
        query: request.query,
        timestamp: new Date().toISOString(),
        model_used: 'gpt-4',
        rag_enabled: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Perform health check on RAG system components
   */
  async performHealthCheck(): Promise<RAGHealthCheck> {
    const startTime = Date.now();
    const healthCheck: RAGHealthCheck = {
      n8n_webhook: false,
      vector_database: false,
      openai_api: false,
      overall_status: 'unhealthy',
      timestamp: new Date().toISOString()
    };

    try {
      // Check N8N webhook
      if (this.n8nWebhookUrl) {
        const response = await fetch(`${this.n8nWebhookUrl}/health-check`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ healthCheck: true })
        });
        healthCheck.n8n_webhook = response.ok;
      }

      // Check OpenAI API
      const openaiResponse = await fetch('https://api.openai.com/v1/models', {
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
        }
      });
      healthCheck.openai_api = openaiResponse.ok;

      // Check vector database (simplified check)
      healthCheck.vector_database = !!(process.env.RAG_VECTOR_DB_URL && process.env.RAG_VECTOR_DB_API_KEY);

      // Determine overall status
      const healthyComponents = Object.values(healthCheck).filter(v => v === true).length;
      const totalComponents = 3;

      if (healthyComponents === totalComponents) {
        healthCheck.overall_status = 'healthy';
      } else if (healthyComponents > 0) {
        healthCheck.overall_status = 'degraded';
      }

    } catch (error) {
      console.error('Health check failed:', error);
    }

    return healthCheck;
  }

  /**
   * Estimate token usage for a response
   */
  private estimateTokenUsage(text: string): number {
    // Rough estimation: 1 token ≈ 4 characters
    return Math.ceil(text.length / 4);
  }

  /**
   * Calculate accuracy based on confidence scores
   */
  private calculateAccuracy(confidenceScores: number[]): number {
    if (confidenceScores.length === 0) return 0;
    return confidenceScores.reduce((sum, score) => sum + score, 0) / confidenceScores.length;
  }

  /**
   * Check if RAG service is available
   */
  isAvailable(): boolean {
    return !!(this.n8nWebhookUrl && process.env.RAG_VECTOR_DB_URL);
  }

  /**
   * Get service status
   */
  async getStatus(): Promise<{
    available: boolean;
    health: RAGHealthCheck;
    config: {
      n8n_webhook_configured: boolean;
      vector_db_configured: boolean;
      fallback_enabled: boolean;
    };
  }> {
    const health = await this.performHealthCheck();
    
    return {
      available: this.isAvailable(),
      health,
      config: {
        n8n_webhook_configured: !!this.n8nWebhookUrl,
        vector_db_configured: !!(process.env.RAG_VECTOR_DB_URL && process.env.RAG_VECTOR_DB_API_KEY),
        fallback_enabled: this.fallbackEnabled
      }
    };
  }
}

// Export singleton instance
export const ragService = new RAGService();

/**
 * Utility function to process a document
 */
export async function processDocumentWithRAG(request: DocumentProcessingRequest): Promise<DocumentProcessingResponse> {
  return ragService.processDocument(request);
}

/**
 * Utility function to process a query
 */
export async function processQueryWithRAG(request: QueryProcessingRequest): Promise<QueryProcessingResponse> {
  return ragService.processQuery(request);
}

/**
 * Utility function to check RAG health
 */
export async function checkRAGHealth(): Promise<RAGHealthCheck> {
  return ragService.performHealthCheck();
}
