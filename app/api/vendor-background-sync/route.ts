import { NextRequest, NextResponse } from 'next/server';
import { vendorBackgroundSync } from '@/utils/vendorBackgroundSync';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, priority, data } = body;

    if (!type || !priority || !data) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing required fields: type, priority, data',
          timestamp: new Date().toISOString()
        },
        { status: 400 }
      );
    }

    // Validate task type
    const validTypes = ['vendor_update', 'cache_refresh', 'popular_search'];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Invalid task type. Must be one of: ${validTypes.join(', ')}`,
          timestamp: new Date().toISOString()
        },
        { status: 400 }
      );
    }

    // Validate priority
    const validPriorities = ['high', 'medium', 'low'];
    if (!validPriorities.includes(priority)) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Invalid priority. Must be one of: ${validPriorities.join(', ')}`,
          timestamp: new Date().toISOString()
        },
        { status: 400 }
      );
    }

    // Add sync task
    vendorBackgroundSync.addSyncTask({
      type: type as any,
      priority: priority as any,
      data
    });

    return NextResponse.json({
      success: true,
      message: 'Sync task added to queue',
      task: { type, priority, data },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error adding sync task:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to add sync task',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get queue status
    const status = vendorBackgroundSync.getQueueStatus();
    
    return NextResponse.json({
      success: true,
      status,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error getting sync queue status:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to get sync queue status',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Clear the sync queue
    vendorBackgroundSync.clearQueue();
    
    return NextResponse.json({
      success: true,
      message: 'Sync queue cleared',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error clearing sync queue:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to clear sync queue',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

