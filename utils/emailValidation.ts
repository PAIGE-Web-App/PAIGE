/**
 * Email Validation and Safety Utilities
 * Prevents sending emails to invalid/fake addresses that cause Gmail retry loops
 */

// Known fake/test email domains that should be blocked
const FAKE_EMAIL_DOMAINS = [
  'example.com',
  'test.com',
  'invalid.com',
  'fake.com',
  'dummy.com',
  'sample.com',
  'localhost',
  'example.org',
  'test.org',
  'invalid.org',
  'example.net',
  'test.net',
  'faketest.com',
  'faketesdoio1iwo.com', // The specific domain from your test
  'faketest.net',
  'faketest.org',
  'testfake.com',
  'testfake.net',
  'testfake.org',
  'notreal.com',
  'notreal.net',
  'notreal.org',
  'bogus.com',
  'bogus.net',
  'bogus.org'
];

// Known temporary email services
const TEMP_EMAIL_DOMAINS = [
  '10minutemail.com',
  'guerrillamail.com',
  'mailinator.com',
  'tempmail.org',
  'yopmail.com',
  'temp-mail.org',
  'throwaway.email',
  'getnada.com',
  'maildrop.cc',
  'sharklasers.com'
];

export interface EmailValidationResult {
  isValid: boolean;
  isReal: boolean;
  reason?: string;
  suggestions?: string[];
}

/**
 * Comprehensive email validation
 */
export function validateEmail(email: string): EmailValidationResult {
  if (!email || typeof email !== 'string') {
    return { isValid: false, isReal: false, reason: 'Email is required' };
  }

  const trimmedEmail = email.trim().toLowerCase();
  
  // Basic format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmedEmail)) {
    return { isValid: false, isReal: false, reason: 'Invalid email format' };
  }

  const [localPart, domain] = trimmedEmail.split('@');

  // Check for fake/test domains
  if (FAKE_EMAIL_DOMAINS.includes(domain)) {
    return { 
      isValid: false, 
      isReal: false, 
      reason: `${domain} is a test domain and cannot receive emails`,
      suggestions: ['Use a real email address for this contact']
    };
  }

  // Check for temporary email services
  if (TEMP_EMAIL_DOMAINS.includes(domain)) {
    return { 
      isValid: true, 
      isReal: false, 
      reason: `${domain} is a temporary email service`,
      suggestions: ['Consider using a permanent email address for business contacts']
    };
  }

  // Check for suspicious patterns in email address
  if (localPart.includes('test') || localPart.includes('fake') || localPart.includes('dummy') || 
      localPart.includes('bogus') || localPart.includes('notreal')) {
    return { 
      isValid: true, 
      isReal: false, 
      reason: 'Email appears to be for testing purposes',
      suggestions: ['Verify this is a real contact email address']
    };
  }

  // Check for suspicious patterns in domain
  if (domain.includes('fake') || domain.includes('test') || domain.includes('dummy') || 
      domain.includes('bogus') || domain.includes('notreal') || domain.includes('invalid')) {
    return { 
      isValid: false, 
      isReal: false, 
      reason: `${domain} appears to be a fake/test domain`,
      suggestions: ['Use a real email address for this contact']
    };
  }

  // Check domain length (very long domains are often fake)
  if (domain.length > 50) {
    return { 
      isValid: true, 
      isReal: false, 
      reason: 'Domain name is unusually long',
      suggestions: ['Verify this email address is correct']
    };
  }

  // Check for gibberish domains (random character combinations)
  const gibberishPattern = /^[a-z]{8,}\d+[a-z]{8,}\.com$/;
  if (gibberishPattern.test(domain)) {
    return { 
      isValid: false, 
      isReal: false, 
      reason: `${domain} appears to be a randomly generated fake domain`,
      suggestions: ['Use a real business email address']
    };
  }

  // Check for domains with excessive random characters
  const randomCharCount = (domain.match(/[a-z]{5,}/g) || []).length;
  const digitCount = (domain.match(/\d/g) || []).length;
  if (randomCharCount >= 2 && digitCount >= 1 && domain.length > 15) {
    return { 
      isValid: false, 
      isReal: false, 
      reason: `${domain} appears to be a randomly generated domain`,
      suggestions: ['Use a legitimate business email address']
    };
  }

  // Check for multiple dots in domain (often fake)
  const dotCount = (domain.match(/\./g) || []).length;
  if (dotCount > 3) {
    return { 
      isValid: true, 
      isReal: false, 
      reason: 'Domain has too many dots',
      suggestions: ['Check for typos in the email address']
    };
  }

  // Check for suspicious TLDs
  const suspiciousTlds = ['tk', 'ml', 'ga', 'cf', 'click', 'download'];
  const tld = domain.split('.').pop();
  if (suspiciousTlds.includes(tld)) {
    return { 
      isValid: true, 
      isReal: false, 
      reason: `${tld} domains are often used for temporary/fake emails`,
      suggestions: ['Verify this is a legitimate business email']
    };
  }

  return { isValid: true, isReal: true };
}

/**
 * Quick validation for UI feedback
 */
export function quickValidateEmail(email: string): { isValid: boolean; warning?: string } {
  const result = validateEmail(email);
  
  if (!result.isValid) {
    return { isValid: false, warning: result.reason };
  }
  
  if (!result.isReal) {
    return { isValid: true, warning: result.reason };
  }
  
  return { isValid: true };
}

/**
 * Get user-friendly validation message
 */
export function getValidationMessage(email: string): string | null {
  const result = validateEmail(email);
  
  if (!result.isValid) {
    return `❌ ${result.reason}`;
  }
  
  if (!result.isReal) {
    return `⚠️ ${result.reason}`;
  }
  
  return null; // Valid email
}

/**
 * Check if email should be blocked from sending
 */
export function shouldBlockEmail(email: string): boolean {
  const result = validateEmail(email);
  return !result.isValid || 
         result.reason?.includes('test domain') || 
         result.reason?.includes('fake/test domain') ||
         result.reason?.includes('appears to be a fake/test domain') ||
         result.reason?.includes('randomly generated fake domain') ||
         result.reason?.includes('randomly generated domain') || false;
}

/**
 * SMTP verification (lightweight version)
 * Checks if domain has MX records without actually sending email
 */
export async function verifyEmailDomain(email: string): Promise<boolean> {
  try {
    const domain = email.split('@')[1];
    
    // Use a simple DNS lookup to check MX records
    // This is a lightweight check that doesn't actually send emails
    const response = await fetch(`https://dns.google/resolve?name=${domain}&type=MX`);
    const data = await response.json();
    
    return data.Answer && data.Answer.length > 0;
  } catch (error) {
    console.error('Domain verification failed:', error);
    return false; // Assume invalid if we can't verify
  }
}

/**
 * Track failed emails to prevent retry loops
 */
export class FailedEmailTracker {
  private static instance: FailedEmailTracker;
  private failedEmails: Map<string, { count: number; lastAttempt: Date }> = new Map();
  private readonly MAX_ATTEMPTS = 2; // Allow max 2 attempts before blocking
  private readonly BLOCK_DURATION = 24 * 60 * 60 * 1000; // 24 hours

  static getInstance(): FailedEmailTracker {
    if (!FailedEmailTracker.instance) {
      FailedEmailTracker.instance = new FailedEmailTracker();
    }
    return FailedEmailTracker.instance;
  }

  recordFailure(email: string): void {
    const now = new Date();
    const existing = this.failedEmails.get(email);
    
    if (existing) {
      existing.count++;
      existing.lastAttempt = now;
    } else {
      this.failedEmails.set(email, { count: 1, lastAttempt: now });
    }
    
    console.log(`📧 Email failure recorded for ${email}: ${this.failedEmails.get(email)?.count} attempts`);
  }

  recordSuccess(email: string): void {
    this.failedEmails.delete(email);
    console.log(`📧 Email success for ${email}, cleared from failure tracking`);
  }

  isBlocked(email: string): boolean {
    const record = this.failedEmails.get(email);
    if (!record) return false;
    
    // Check if we're within the block duration
    const timeSinceLastAttempt = Date.now() - record.lastAttempt.getTime();
    const isWithinBlockPeriod = timeSinceLastAttempt < this.BLOCK_DURATION;
    
    const isBlocked = record.count >= this.MAX_ATTEMPTS && isWithinBlockPeriod;
    
    if (isBlocked) {
      console.log(`📧 Email ${email} is blocked due to ${record.count} previous failures`);
    }
    
    return isBlocked;
  }

  getFailureInfo(email: string): { count: number; lastAttempt: Date; isBlocked: boolean } | null {
    const record = this.failedEmails.get(email);
    if (!record) return null;
    
    const timeSinceLastAttempt = Date.now() - record.lastAttempt.getTime();
    const isWithinBlockPeriod = timeSinceLastAttempt < this.BLOCK_DURATION;
    
    return {
      count: record.count,
      lastAttempt: record.lastAttempt,
      isBlocked: record.count >= this.MAX_ATTEMPTS && isWithinBlockPeriod
    };
  }

  // Clean up old records
  cleanup(): void {
    const now = Date.now();
    for (const [email, record] of this.failedEmails.entries()) {
      const timeSinceLastAttempt = now - record.lastAttempt.getTime();
      if (timeSinceLastAttempt > this.BLOCK_DURATION) {
        this.failedEmails.delete(email);
      }
    }
  }
}

/**
 * Enhanced email sending with validation and failure tracking
 */
export async function sendEmailWithValidation(
  to: string, 
  subject: string, 
  body: string, 
  userId?: string
): Promise<{ success: boolean; error?: string; blocked?: boolean }> {
  // Step 1: Validate email format and check for fake domains
  const validation = validateEmail(to);
  if (!validation.isValid) {
    return { 
      success: false, 
      error: validation.reason,
      blocked: true 
    };
  }

  // Step 2: Check if email is blocked due to previous failures
  const tracker = FailedEmailTracker.getInstance();
  if (tracker.isBlocked(to)) {
    const failureInfo = tracker.getFailureInfo(to);
    return { 
      success: false, 
      error: `Email blocked due to ${failureInfo?.count} previous delivery failures. Try again in 24 hours.`,
      blocked: true 
    };
  }

  // Step 3: Warn about potentially fake emails
  if (!validation.isReal) {
    console.warn(`⚠️ Sending email to potentially fake address: ${to} - ${validation.reason}`);
  }

  try {
    // Step 4: Send the email
    const response = await fetch('/api/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to, subject, body, userId })
    });

    const result = await response.json();

    if (result.success) {
      // Record success to clear any previous failures
      tracker.recordSuccess(to);
      return { success: true };
    } else {
      // Record failure for tracking
      tracker.recordFailure(to);
      return { 
        success: false, 
        error: result.error || 'Failed to send email',
        blocked: tracker.isBlocked(to)
      };
    }
  } catch (error) {
    // Record failure for tracking
    tracker.recordFailure(to);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      blocked: tracker.isBlocked(to)
    };
  }
}
