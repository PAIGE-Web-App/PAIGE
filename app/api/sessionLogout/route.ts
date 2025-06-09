import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({ status: "success" });
  
  // Clear the __session cookie with all necessary attributes
  const cookieOptions = [
    'Path=/',
    'HttpOnly',
    'Max-Age=0',
    'SameSite=Lax',
    process.env.NODE_ENV === 'production' ? 'Secure' : '',
    'Domain=' + (process.env.NODE_ENV === 'production' ? '.paige-ai-db.firebaseapp.com' : 'localhost')
  ].filter(Boolean).join('; ');

  // Set multiple cookie clearing headers to ensure it's cleared in all contexts
  response.headers.append(
    "Set-Cookie",
    `__session=; ${cookieOptions}`
  );
  response.headers.append(
    "Set-Cookie",
    `__session=; Path=/; HttpOnly; Max-Age=0; SameSite=Lax`
  );
  // Set a toast message for logout
  response.headers.append(
    "Set-Cookie",
    `show-toast=Log out successful!; Path=/; Max-Age=5; SameSite=Lax`
  );
  
  return response;
} 