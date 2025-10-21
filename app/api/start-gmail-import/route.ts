import { NextResponse } from 'next/server';
import { performGmailImport } from './start-gmail-import-core';

export async function POST(req: Request) {
  try {
    console.log('🟢 START: /api/start-gmail-import route hit');
    
    const requestBody = await req.json();
    const result = await performGmailImport(requestBody);
    
    if (result.success) {
      return NextResponse.json(result, { status: 200 });
    } else {
      return NextResponse.json(result, { status: result.status || 500 });
    }
  } catch (error: any) {
    console.error('🔴 API Error in start-gmail-import:', error);
    return NextResponse.json({
      success: false,
      message: error.message || 'An unexpected server error occurred during Gmail import.'
    }, { status: 500 });
  }
}