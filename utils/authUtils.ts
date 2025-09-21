import { User, getIdToken } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

/**
 * Refreshes the Firebase authentication token and updates the session
 */
export async function refreshAuthToken(user: User): Promise<string | null> {
  try {
    console.log('🔄 Refreshing auth token for user:', user.uid);
    const newToken = await getIdToken(user, true); // Force refresh
    
    // Update session cookie with new token
    const sessionRes = await fetch("/api/sessionLogin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken: newToken }),
      credentials: "include",
    });
    
    if (sessionRes.ok) {
      console.log('✅ Auth token refreshed successfully');
      return newToken;
    } else {
      console.error('❌ Failed to update session cookie');
      return null;
    }
  } catch (error) {
    console.error('❌ Error refreshing auth token:', error);
    return null;
  }
}

/**
 * Validates the current session by checking the token and session cookie
 */
export async function validateSession(user: User): Promise<boolean> {
  try {
    // Check if current token is still valid
    const token = await getIdToken(user, false);
    if (!token) return false;
    
    // Validate session cookie
    const sessionRes = await fetch("/api/sessionLogin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken: token }),
      credentials: "include",
    });
    
    return sessionRes.ok;
  } catch (error) {
    console.error('Error validating session:', error);
    return false;
  }
}

/**
 * Checks if Google service tokens are valid and refreshes them if needed
 */
export async function checkAndRefreshGoogleTokens(userId: string): Promise<boolean> {
  try {
    const userDoc = await getDoc(doc(db, "users", userId));
    if (!userDoc.exists()) return false;
    
    const userData = userDoc.data();
    const googleTokens = userData.googleTokens;
    
    if (!googleTokens) return false;
    
    // Check if tokens are expired or will expire soon (within 5 minutes)
    const now = Date.now();
    const expiresAt = googleTokens.expiresAt || 0;
    const fiveMinutesFromNow = now + (5 * 60 * 1000);
    
    if (expiresAt < fiveMinutesFromNow) {
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error checking Google tokens:', error);
    return false;
  }
}

/**
 * Updates Google service tokens in Firestore
 */
export async function updateGoogleTokens(
  userId: string, 
  tokens: { 
    accessToken: string; 
    refreshToken: string; 
    expiresAt: number; 
    email?: string; 
  }
): Promise<void> {
  try {
    await updateDoc(doc(db, "users", userId), {
      googleTokens: tokens
    });

  } catch (error) {
    console.error('Error updating Google tokens:', error);
    throw error;
  }
}

/**
 * Clears Google service tokens from Firestore
 */
export async function clearGoogleTokens(userId: string): Promise<void> {
  try {
    await updateDoc(doc(db, "users", userId), {
      googleTokens: null
    });

  } catch (error) {
    console.error('Error clearing Google tokens:', error);
    throw error;
  }
}

/**
 * Gets the current user's Google service tokens
 */
export async function getGoogleTokens(userId: string): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  email?: string;
} | null> {
  try {
    const userDoc = await getDoc(doc(db, "users", userId));
    if (!userDoc.exists()) return null;
    
    const userData = userDoc.data();
    return userData.googleTokens || null;
  } catch (error) {
    console.error('Error getting Google tokens:', error);
    return null;
  }
}
