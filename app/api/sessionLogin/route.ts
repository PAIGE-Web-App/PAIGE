import { NextResponse } from "next/server";
import { admin } from "@/lib/firebaseAdmin";
import { clearRateLimit } from "@/middleware";

export async function POST(req: Request) {
  try {
    const { idToken } = await req.json();
    if (!idToken) {
      console.error("No idToken in request body");
      return NextResponse.json({ error: "Missing idToken" }, { status: 400 });
    }

    // Verify the Firebase ID token first
    let decodedToken;
    try {
      decodedToken = await admin.auth().createSessionCookie(idToken, { expiresIn: 60 * 60 * 24 * 5 * 1000 });
    } catch (err) {
      console.error("Error creating session cookie:", err);
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
      message: "Session established successfully"
    });
    
    response.headers.append(
      "Set-Cookie",
      `__session=${decodedToken}; ${cookieOptions}`
    );
    
    // Add security headers
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-XSS-Protection', '1; mode=block');
    
    // Clear rate limiting for this client on successful authentication
    const clientId = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    clearRateLimit(clientId);
    
    return response;
  } catch (error) {
    console.error("General error in sessionLogin:", error);
    return NextResponse.json({ error: "Internal server error", details: String(error) }, { status: 500 });
  }
} 