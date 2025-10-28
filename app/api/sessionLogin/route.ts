import { NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebaseAdmin";

// Whitelist of allowed origins for CORS
const ALLOWED_ORIGINS = [
  'https://weddingpaige.com',
  'https://www.weddingpaige.com',
  'http://localhost:3000', // Development only
];

export async function OPTIONS(req: Request) {
  const origin = req.headers.get('origin') || '';
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': allowedOrigin,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true',
    },
  });
}

export async function POST(req: Request) {
      try {
        const { idToken } = await req.json();
        if (!idToken) {
          return NextResponse.json({ error: "Missing idToken" }, { status: 400 });
        }

        // Verify the Firebase ID token first
        let decodedToken;
        
        // Get session duration from environment (default: 8 hours)
        const sessionDurationHours = parseInt(process.env.SESSION_DURATION_HOURS || '8');
        const expiresIn = sessionDurationHours * 60 * 60 * 1000; // Convert hours to milliseconds
        
        console.log(`🔑 Creating session cookie with ${sessionDurationHours} hour duration`);
        
        try {
          decodedToken = await adminAuth.createSessionCookie(idToken, { expiresIn });
          console.log('✅ Session cookie created successfully');
        } catch (err) {
          console.error('❌ Failed to create session cookie:', err);
          return NextResponse.json({ error: "Unauthorized", details: String(err) }, { status: 401 });
        }

        // Set cookie options with enhanced security
        const isProd = process.env.NODE_ENV === "production";
        
        const cookieOptions = [
          `Path=/`,
          `HttpOnly`,
          `Max-Age=${expiresIn / 1000}`,
          `SameSite=${isProd ? 'Strict' : 'Lax'}`,
          ...(isProd ? ["Secure"] : [])
        ].filter(Boolean).join("; ");

        const response = NextResponse.json({ 
          status: "success",
          message: "Session established successfully",
          sessionToken: decodedToken // Include the session token in the response body
        });
        
        const cookieValue = `__session=${decodedToken}; ${cookieOptions}`;
        response.headers.append("Set-Cookie", cookieValue);
        
        // Add CORS headers to allow cookies (whitelist only allowed origins)
        const origin = req.headers.get('origin') || '';
        const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
        
        response.headers.set('Access-Control-Allow-Credentials', 'true');
        response.headers.set('Access-Control-Allow-Origin', allowedOrigin);
        response.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
        response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        
        // Add security headers
        response.headers.set('X-Content-Type-Options', 'nosniff');
        response.headers.set('X-Frame-Options', 'DENY');
        response.headers.set('X-XSS-Protection', '1; mode=block');
        
        return response;
      } catch (error) {
        return NextResponse.json({ error: "Internal server error", details: String(error) }, { status: 500 });
      }
    }
