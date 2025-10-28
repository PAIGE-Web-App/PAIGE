import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  return NextResponse.json({ message: 'Relationships endpoint - to be implemented' }, { status: 200 });
}
