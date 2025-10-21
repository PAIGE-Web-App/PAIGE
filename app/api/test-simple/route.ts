import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ message: 'Simple API route working!' });
}

export async function POST() {
  return NextResponse.json({ message: 'Simple POST route working!' });
}
