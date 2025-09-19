import { NextResponse } from "next/server";
import { admin } from "@/lib/firebaseAdmin";
import { clearRateLimit } from "@/middleware";

export async function OPTIONS(req: Request) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': req.headers.get('origin') || 'http://localhost:3000',
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
        try {
          decodedToken = await admin.auth().createSessionCookie(idToken, { expiresIn: 60 * 60 * 24 * 5 * 1000 });
        } catch (err) {
          return NextResponse.json({ error: "Unauthorized", details: String(err) }, { status: 401 });
        }

        // Set cookie options with enhanced security
        const isProd = process.env.NODE_ENV === "production";
        const expiresIn = 60 * 60 * 24 * 5 * 1000; // 5 days
        
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
        
        // Add CORS headers to allow cookies
        response.headers.set('Access-Control-Allow-Credentials', 'true');
        response.headers.set('Access-Control-Allow-Origin', req.headers.get('origin') || 'http://localhost:3000');
        response.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
        response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        
        // Add security headers
        response.headers.set('X-Content-Type-Options', 'nosniff');
        response.headers.set('X-Frame-Options', 'DENY');
        response.headers.set('X-XSS-Protection', '1; mode=block');
        
        // Clear rate limiting for this client on successful authentication
        const clientId = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
        clearRateLimit(clientId);
        
        return response;
      } catch (error) {
        return NextResponse.json({ error: "Internal server error", details: String(error) }, { status: 500 });
      }
    }