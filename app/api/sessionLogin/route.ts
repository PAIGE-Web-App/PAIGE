import { NextResponse } from "next/server";
import { admin } from "@/lib/firebaseAdmin";

export async function POST(req: Request) {
  try {
    const { idToken } = await req.json();
    if (!idToken) {
      console.error("No idToken in request body");
      return NextResponse.json({ error: "Missing idToken" }, { status: 400 });
    }

    const expiresIn = 60 * 60 * 24 * 5 * 1000; // 5 days
    let sessionCookie;
    try {
      sessionCookie = await admin.auth().createSessionCookie(idToken, { expiresIn });
    } catch (err) {
      console.error("Error creating session cookie:", err);
      return NextResponse.json({ error: "Unauthorized", details: String(err) }, { status: 401 });
    }

    // Set cookie options
    const isProd = process.env.NODE_ENV === "production";
    const cookieOptions = [
      `Path=/`,
      `HttpOnly`,
      `Max-Age=${expiresIn / 1000}`,
      ...(isProd ? ["Secure", "SameSite=Strict"] : ["SameSite=Lax"])
    ].join("; ");

    const response = NextResponse.json({ status: "success" });
    response.headers.append(
      "Set-Cookie",
      `__session=${sessionCookie}; ${cookieOptions}`
    );
    return response;
  } catch (error) {
    console.error("General error in sessionLogin:", error);
    return NextResponse.json({ error: "Unauthorized", details: String(error) }, { status: 401 });
  }
} 