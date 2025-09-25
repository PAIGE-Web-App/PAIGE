import { NextResponse } from "next/server";

export async function POST() {
  try {
    // This API route can be called to clean up stale sessions
    // It's mainly for debugging purposes, but could be useful for users
    
    const response = NextResponse.json({ 
      status: "success",
      message: "Session cleanup instructions sent",
      instructions: [
        "1. Clear your browser cookies for this site",
        "2. Refresh the page",
        "3. Try logging in again"
      ]
    });

    // Clear any existing session cookies
    response.cookies.set('__session', '', { 
      expires: new Date(0),
      path: '/'
    });
    
    response.cookies.set('show-toast', '', { 
      expires: new Date(0),
      path: '/'
    });

    return response;
  } catch (error) {
    return NextResponse.json({ 
      error: "Session cleanup failed",
      details: String(error) 
    }, { status: 500 });
  }
}
