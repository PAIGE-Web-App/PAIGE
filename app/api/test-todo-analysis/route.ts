import { NextResponse } from 'next/server';
import { performTodoAnalysis } from '@/utils/todoAnalysisService';

export async function POST(req: Request) {
  try {
    console.log('🧪 Testing todo analysis without Gmail import...');
    
    const { userId } = await req.json();
    
    if (!userId) {
      return NextResponse.json({ success: false, message: 'userId required' }, { status: 400 });
    }
    
    // Create mock contact data for testing
    const mockContacts = [{
      id: 'test-contact-123',
      name: 'David Yoon',
      email: 'youngjedistudio@gmail.com',
      category: 'DJ'
    }];
    
    console.log('🧪 Running todo analysis with mock data...');
    
    // Run the analysis with mock data
    const analysisResult = await performTodoAnalysis(
      userId, 
      mockContacts, 
      false // Don't store suggestions, just return them
    );
    
    console.log('🧪 Test analysis completed:', analysisResult);
    
    return NextResponse.json({
      success: true,
      message: 'Todo analysis test completed',
      analysisResult
    });
    
  } catch (error: any) {
    console.error('🧪 Test analysis error:', error);
    return NextResponse.json({ 
      success: false, 
      message: error.message || 'Test analysis failed' 
    }, { status: 500 });
  }
}
