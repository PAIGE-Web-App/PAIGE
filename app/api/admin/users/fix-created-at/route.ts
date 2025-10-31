import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  return NextResponse.json({ message: 'Fix created-at endpoint - not implemented' });
}

export async function POST(request: NextRequest) {
  return NextResponse.json({ error: 'Not implemented' }, { status: 501 });
}
