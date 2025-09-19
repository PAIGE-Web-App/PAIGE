/**
 * Enhanced Session Validation API
 * Enterprise-grade session validation with comprehensive security checks
 */

import { NextRequest, NextResponse } from 'next/server';
import { admin } from '@/lib/firebaseAdmin';
import { SessionInfo, SessionValidationResponse } from '@/types/auth';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '') || req.cookies.get('__session')?.value;

    if (!token) {
      return NextResponse.json({
        valid: false,
        error: {
          code: 'NO_TOKEN',
          message: 'No authentication token provided',
          timestamp: Date.now()
        }
      } as SessionValidationResponse, { status: 401 });
    }

    // Verify the token with Firebase Admin
    let decodedToken;
    try {
      decodedToken = await admin.auth().verifyIdToken(token);
    } catch (error) {
      return NextResponse.json({
        valid: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid or expired token',
          timestamp: Date.now()
        }
      } as SessionValidationResponse, { status: 401 });
    }

    // Get client information
    const ipAddress = req.headers.get('x-forwarded-for') || 
                     req.headers.get('x-real-ip') || 
                     'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';

    // Create session info
    const sessionInfo: SessionInfo = {
      id: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId: decodedToken.uid,
      createdAt: decodedToken.iat * 1000,
      expiresAt: decodedToken.exp * 1000,
      lastActivity: Date.now(),
      ipAddress,
      userAgent,
      isActive: true
    };

    // Log security event
    await logSecurityEvent({
      userId: decodedToken.uid,
      type: 'session_validation',
      timestamp: Date.now(),
      ipAddress,
      userAgent,
      details: { sessionId: sessionInfo.id },
      severity: 'low'
    });

    return NextResponse.json({
      valid: true,
      session: sessionInfo
    } as SessionValidationResponse);

  } catch (error) {
    console.error('Session validation error:', error);
    
    return NextResponse.json({
      valid: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Session validation failed',
        timestamp: Date.now(),
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    } as SessionValidationResponse, { status: 500 });
  }
}

async function logSecurityEvent(event: any) {
  try {
    // This would typically be stored in a security events database
    console.log('Security Event:', event);
  } catch (error) {
    console.error('Failed to log security event:', error);
  }
}