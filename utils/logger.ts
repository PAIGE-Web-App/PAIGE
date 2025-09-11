// Production-safe logging utility
const isDev = process.env.NODE_ENV === 'development';
const isTest = process.env.NODE_ENV === 'test';

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
}

class Logger {
  private level: LogLevel;

  constructor() {
    // Set log level based on environment
    if (isDev) {
      this.level = LogLevel.DEBUG;
    } else if (isTest) {
      this.level = LogLevel.ERROR;
    } else {
      this.level = LogLevel.ERROR; // Only errors in production
    }
  }

  private shouldLog(level: LogLevel): boolean {
    return level <= this.level;
  }

  error(message: string, ...args: any[]): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      console.error(`[ERROR] ${message}`, ...args);
    }
  }

  warn(message: string, ...args: any[]): void {
    if (this.shouldLog(LogLevel.WARN)) {
      console.warn(`[WARN] ${message}`, ...args);
    }
  }

  info(message: string, ...args: any[]): void {
    if (this.shouldLog(LogLevel.INFO)) {
      console.info(`[INFO] ${message}`, ...args);
    }
  }

  debug(message: string, ...args: any[]): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.log(`[DEBUG] ${message}`, ...args);
    }
  }

  // Performance logging
  perf(message: string, data?: any): void {
    if (isDev) {
      console.log(`[PERF] ${message}`, data || '');
    }
  }

  // Firestore operation logging
  firestore(operation: string, data?: any): void {
    if (isDev) {
      console.log(`[FIRESTORE] ${operation}`, data || '');
    }
  }

  // API call logging
  api(endpoint: string, method: string, data?: any): void {
    if (isDev) {
      console.log(`[API] ${method} ${endpoint}`, data || '');
    }
  }
}

// Export singleton instance
export const logger = new Logger();

// Export individual methods for convenience
export const { error, warn, info, debug, perf, firestore, api } = logger;
