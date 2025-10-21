import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    console.log('🧪 Step 1: Testing basic import...');
    
    // Step 1: Test basic firebase-admin import
    console.log('🧪 Step 2: Importing firebase-admin...');
    const admin = await import('firebase-admin');
    console.log('✅ firebase-admin imported successfully');
    
    // Step 2: Test environment variable
    console.log('🧪 Step 3: Checking environment variables...');
    const base64Key = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    console.log('FIREBASE_SERVICE_ACCOUNT_KEY exists:', !!base64Key);
    
    if (!base64Key) {
      return NextResponse.json({ 
        success: false, 
        error: 'FIREBASE_SERVICE_ACCOUNT_KEY not found' 
      }, { status: 500 });
    }
    
    // Step 3: Test service account parsing
    console.log('🧪 Step 4: Parsing service account...');
    const serviceAccount = JSON.parse(Buffer.from(base64Key, 'base64').toString());
    console.log('✅ Service account parsed successfully');
    
    // Step 4: Test Firebase initialization
    console.log('🧪 Step 5: Testing Firebase initialization...');
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      console.log('✅ Firebase initialized successfully');
    } else {
      console.log('✅ Firebase already initialized');
    }
    
    // Step 5: Test Firestore
    console.log('🧪 Step 6: Testing Firestore...');
    const db = admin.firestore();
    console.log('✅ Firestore instance created');
    
    return NextResponse.json({ 
      success: true, 
      message: 'All Firebase Admin SDK steps completed successfully',
      steps: [
        'firebase-admin imported',
        'environment variables checked',
        'service account parsed',
        'Firebase initialized',
        'Firestore instance created'
      ]
    });
    
  } catch (error: any) {
    console.error('❌ Firebase Admin SDK step-by-step test failed:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message,
      stack: error.stack,
      step: 'Failed during step-by-step test'
    }, { status: 500 });
  }
}
