import { NextRequest, NextResponse } from 'next/server';
import { vendorSearchCache } from '@/utils/vendorSearchCache';

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Triggering predictive caching for popular searches...');
    
    // Start predictive caching in background
    vendorSearchCache.predictAndCachePopularSearches().catch(error => {
      console.warn('⚠️ Predictive caching failed:', error);
    });
    
    // Get current popular search suggestions
    const suggestions = vendorSearchCache.getPopularSearchSuggestions();
    
    return NextResponse.json({
      success: true,
      message: 'Predictive caching started in background',
      suggestions,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error triggering predictive caching:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to trigger predictive caching',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get popular search suggestions
    const suggestions = vendorSearchCache.getPopularSearchSuggestions();
    
    return NextResponse.json({
      success: true,
      suggestions,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error getting popular search suggestions:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to get popular search suggestions',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

