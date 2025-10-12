/**
 * Test endpoint to debug redirect issues
 * This helps identify what's causing the 307 redirect
 */

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const url = request.nextUrl;
    const headers = Object.fromEntries(request.headers.entries());
    
    return NextResponse.json({
      success: true,
      message: 'No redirect detected',
      timestamp: new Date().toISOString(),
      url: {
        href: url.href,
        origin: url.origin,
        hostname: url.hostname,
        pathname: url.pathname,
        search: url.search,
      },
      headers: {
        host: headers.host,
        'user-agent': headers['user-agent'],
        'x-forwarded-proto': headers['x-forwarded-proto'],
        'x-forwarded-host': headers['x-forwarded-host'],
        'x-vercel-forwarded-for': headers['x-vercel-forwarded-for'],
      },
      environment: {
        nodeEnv: process.env.NODE_ENV,
        vercelEnv: process.env.VERCEL_ENV,
      }
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const url = request.nextUrl;
    const headers = Object.fromEntries(request.headers.entries());
    const body = await request.text();
    
    return NextResponse.json({
      success: true,
      message: 'POST request successful - no redirect detected',
      timestamp: new Date().toISOString(),
      url: {
        href: url.href,
        origin: url.origin,
        hostname: url.hostname,
        pathname: url.pathname,
        search: url.search,
      },
      headers: {
        host: headers.host,
        'user-agent': headers['user-agent'],
        'x-forwarded-proto': headers['x-forwarded-proto'],
        'x-forwarded-host': headers['x-forwarded-host'],
        'x-vercel-forwarded-for': headers['x-vercel-forwarded-for'],
        'content-type': headers['content-type'],
        'authorization': headers['authorization'] ? '[PRESENT]' : '[MISSING]',
      },
      bodyLength: body.length,
      environment: {
        nodeEnv: process.env.NODE_ENV,
        vercelEnv: process.env.VERCEL_ENV,
      }
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
