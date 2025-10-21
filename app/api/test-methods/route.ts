import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ 
    method: 'GET',
    message: 'GET method working' 
  });
}

export async function POST(req: NextRequest) {
  return NextResponse.json({ 
    method: 'POST',
    message: 'POST method working',
    body: await req.json()
  });
}
