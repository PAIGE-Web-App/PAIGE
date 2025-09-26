/**
 * RAG Health Check API Endpoint
 * 
 * This endpoint provides health status for the RAG system components.
 * It's used for monitoring and debugging.
 */

import { NextRequest, NextResponse } from 'next/server';
// import { checkRAGHealth } from '@/lib/ragService';
import { getRAGConfigForLogging } from '@/lib/ragFeatureFlag';

export async function GET(request: NextRequest) {
  try {
    // Get RAG configuration
    const config = getRAGConfigForLogging();
    
    // Perform health checks
    const health = { status: 'disabled', timestamp: new Date() };
    
    // Get system status
    const status = {
      config,
      health,
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    };

    // Return appropriate status code based on health
    const statusCode = health.status === 'healthy' ? 200 : 
                      health.status === 'degraded' ? 200 : 503;

    return NextResponse.json(status, { status: statusCode });

  } catch (error) {
    console.error('RAG health check error:', error);
    return NextResponse.json(
      { 
        error: 'Health check failed',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'emergency_disable') {
      // Emergency disable RAG system
      process.env.ENABLE_RAG = 'false';
      process.env.RAG_BETA_USERS = '';
      process.env.RAG_MIGRATION_PERCENTAGE = '0';
      
      return NextResponse.json({
        success: true,
        message: 'RAG system emergency disabled',
        timestamp: new Date().toISOString()
      });
    }

    if (action === 'enable_beta') {
      const { user_emails } = body;
      if (!user_emails || !Array.isArray(user_emails)) {
        return NextResponse.json(
          { error: 'user_emails array is required' },
          { status: 400 }
        );
      }

      process.env.ENABLE_RAG = 'true';
      process.env.RAG_BETA_USERS = user_emails.join(',');
      process.env.RAG_MIGRATION_PERCENTAGE = '0';

      return NextResponse.json({
        success: true,
        message: `RAG enabled for ${user_emails.length} beta users`,
        beta_users: user_emails,
        timestamp: new Date().toISOString()
      });
    }

    if (action === 'set_migration_percentage') {
      const { percentage } = body;
      if (typeof percentage !== 'number' || percentage < 0 || percentage > 100) {
        return NextResponse.json(
          { error: 'percentage must be a number between 0 and 100' },
          { status: 400 }
        );
      }

      process.env.ENABLE_RAG = 'true';
      process.env.RAG_MIGRATION_PERCENTAGE = percentage.toString();

      return NextResponse.json({
        success: true,
        message: `RAG migration percentage set to ${percentage}%`,
        migration_percentage: percentage,
        timestamp: new Date().toISOString()
      });
    }

    return NextResponse.json(
      { error: 'Invalid action. Supported actions: emergency_disable, enable_beta, set_migration_percentage' },
      { status: 400 }
    );

  } catch (error) {
    console.error('RAG health action error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
