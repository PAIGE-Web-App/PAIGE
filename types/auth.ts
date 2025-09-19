/**
 * Enterprise Authentication Types
 * Comprehensive type definitions for authentication system
 */

import { User } from 'firebase/auth';

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  session: SessionInfo | null;
  profile: UserProfile | null;
  permissions: string[] | null;
  lastActivity: number;
  error: AuthError | null;
}

export interface SessionInfo {
  id: string;
  userId: string;
  createdAt: number;
  expiresAt: number;
  lastActivity: number;
  ipAddress: string;
  userAgent: string;
  isActive: boolean;
}

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  photoURL: string | null;
  role: UserRole;
  userType: UserType;
  permissions: string[];
  subscription: UserSubscription | null;
  preferences: UserPreferences;
  createdAt: number;
  updatedAt: number;
  lastLoginAt: number;
  isActive: boolean;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
}

export interface AuthError {
  code: string;
  message: string;
  timestamp: number;
  details?: any;
}

export interface UserRole {
  id: string;
  name: string;
  permissions: string[];
  isSystem: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface UserType {
  id: string;
  name: string;
  description: string;
  features: string[];
  limits: UserLimits;
  isActive: boolean;
}

export interface UserLimits {
  maxProjects: number;
  maxUsers: number;
  maxStorage: number; // in bytes
  maxApiCalls: number; // per month
  maxConcurrentSessions: number;
}

export interface UserSubscription {
  id: string;
  planId: string;
  planName: string;
  status: 'active' | 'inactive' | 'cancelled' | 'expired';
  currentPeriodStart: number;
  currentPeriodEnd: number;
  cancelAtPeriodEnd: boolean;
  features: string[];
  limits: UserLimits;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  language: string;
  timezone: string;
  notifications: NotificationPreferences;
  privacy: PrivacyPreferences;
}

export interface NotificationPreferences {
  email: boolean;
  push: boolean;
  sms: boolean;
  marketing: boolean;
  security: boolean;
  updates: boolean;
}

export interface PrivacyPreferences {
  profileVisibility: 'public' | 'private' | 'friends';
  dataSharing: boolean;
  analytics: boolean;
  cookies: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
  mfaCode?: string;
}

export interface RegisterCredentials {
  email: string;
  password: string;
  displayName: string;
  acceptTerms: boolean;
  marketingConsent?: boolean;
}

export interface AuthResponse {
  success: boolean;
  user?: UserProfile;
  session?: SessionInfo;
  error?: AuthError;
  requiresMfa?: boolean;
  requiresVerification?: boolean;
}

export interface SessionValidationResponse {
  valid: boolean;
  session?: SessionInfo;
  error?: AuthError;
  requiresRefresh?: boolean;
}

export interface TokenRefreshResponse {
  success: boolean;
  token?: string;
  expiresAt?: number;
  error?: AuthError;
}

export interface LogoutResponse {
  success: boolean;
  error?: AuthError;
}

// Security and Audit Types
export interface SecurityEvent {
  id: string;
  userId: string;
  type: 'login' | 'logout' | 'token_refresh' | 'permission_change' | 'security_violation';
  timestamp: number;
  ipAddress: string;
  userAgent: string;
  details: any;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  resource: string;
  timestamp: number;
  ipAddress: string;
  userAgent: string;
  details: any;
  result: 'success' | 'failure';
}

// Multi-Factor Authentication Types
export interface MfaSetup {
  id: string;
  userId: string;
  type: 'totp' | 'sms' | 'email' | 'backup_codes';
  secret?: string;
  qrCode?: string;
  backupCodes?: string[];
  isActive: boolean;
  createdAt: number;
}

export interface MfaChallenge {
  id: string;
  userId: string;
  type: 'totp' | 'sms' | 'email';
  code: string;
  expiresAt: number;
  attempts: number;
  maxAttempts: number;
}

// Rate Limiting Types
export interface RateLimitInfo {
  limit: number;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
}

export interface RateLimitConfig {
  windowMs: number;
  max: number;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: (req: any) => string;
}

// Session Management Types
export interface SessionConfig {
  timeout: number; // in milliseconds
  refreshThreshold: number; // in milliseconds
  maxConcurrentSessions: number;
  requireReauth: boolean;
  rememberMe: boolean;
}

export interface SessionMetrics {
  activeSessions: number;
  totalSessions: number;
  averageSessionDuration: number;
  sessionTimeoutRate: number;
  refreshSuccessRate: number;
}
