import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({ status: "success" });
  // Clear the __session cookie (must match path and flags used when setting)
  response.headers.append(
    "Set-Cookie",
    "__session=; Path=/; HttpOnly; Max-Age=0; SameSite=Lax"
  );
  return response;
} 