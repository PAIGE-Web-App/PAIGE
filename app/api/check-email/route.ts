import { NextRequest, NextResponse } from 'next/server';
import * as admin from 'firebase-admin';

function initializeAdminApp() {
  if (!admin.apps.length) {
    const base64Key = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (base64Key) {
      const serviceAccount = JSON.parse(Buffer.from(base64Key, 'base64').toString());
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    } else {
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
      });
    }
  }
}

initializeAdminApp();
const auth = admin.auth();

export async function POST(req: NextRequest) {
  const { email } = await req.json();
  if (!email) {
    return NextResponse.json({ exists: false, error: 'No email provided' }, { status: 400 });
  }
  try {
    await auth.getUserByEmail(email);
    // If no error, user exists
    return NextResponse.json({ exists: true });
  } catch (error: any) {
    if (error.code === 'auth/user-not-found') {
      return NextResponse.json({ exists: false });
    }
    return NextResponse.json({ exists: false, error: error.message }, { status: 500 });
  }
} 