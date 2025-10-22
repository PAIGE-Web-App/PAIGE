/**
 * Client-Side Google Calendar API Service
 * 
 * This service handles all Google Calendar API operations directly from the browser,
 * bypassing Vercel's restrictions on server-side external API calls.
 * 
 * Benefits:
 * - Faster performance (no server round-trip)
 * - Better reliability (bypasses Vercel restrictions)
 * - More responsive (direct API calls)
 * - Better error handling (direct Google API responses)
 */

// Extend Window interface for Google API
declare global {
  interface Window {
    gapi: any;
  }
}

interface CalendarCreateParams {
  userId: string;
  calendarName: string;
}

interface CalendarCreateResult {
  success: boolean;
  calendarId?: string;
  calendarName?: string;
  isReusingExisting?: boolean;
  message?: string;
  error?: string;
  errorType?: string;
}

interface CalendarStatusResult {
  success: boolean;
  isLinked?: boolean;
  calendarId?: string;
  calendarName?: string;
  lastSyncAt?: string;
  lastSyncCount?: number;
  lastSyncErrors?: string[];
  lastSyncFromAt?: string;
  lastSyncFromCount?: number;
  lastSyncFromErrors?: string[];
  lastWebhookSyncAt?: string;
  lastWebhookEventCount?: number;
  error?: string;
  errorType?: string;
}

interface CalendarSyncParams {
  userId: string;
  direction: 'to' | 'from';
  todos?: any[];
  events?: any[];
}

interface CalendarSyncResult {
  success: boolean;
  syncedCount?: number;
  errors?: string[];
  message?: string;
  error?: string;
  errorType?: string;
}

class GoogleCalendarClientService {
  private static instance: GoogleCalendarClientService;
  private googleApiLoaded = false;
  private gapi: any = null;

  private constructor() {}

  public static getInstance(): GoogleCalendarClientService {
    if (!GoogleCalendarClientService.instance) {
      GoogleCalendarClientService.instance = new GoogleCalendarClientService();
    }
    return GoogleCalendarClientService.instance;
  }

  /**
   * Initialize Google API client
   */
  private async initializeGoogleApi(): Promise<boolean> {
    if (this.googleApiLoaded && this.gapi) {
      return true;
    }

    try {
      // Load Google API script if not already loaded
      if (!window.gapi) {
        await this.loadGoogleApiScript();
      }

      this.gapi = window.gapi;
      
      // Initialize the client
      await this.gapi.load('client', async () => {
        await this.gapi.client.init({
          apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
          discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest'],
        });
      });

      this.googleApiLoaded = true;
      console.log('✅ Google Calendar API initialized successfully');
      return true;
    } catch (error: any) {
      console.error('❌ Failed to initialize Google Calendar API:', error);
      return false;
    }
  }

  /**
   * Load Google API script dynamically
   */
  private loadGoogleApiScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (window.gapi) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://apis.google.com/js/api.js';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Google API script'));
      document.head.appendChild(script);
    });
  }

  /**
   * Check if Google Calendar API is available and configured
   */
  public async isCalendarAvailable(): Promise<boolean> {
    try {
      const initialized = await this.initializeGoogleApi();
      return initialized && !!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    } catch (error) {
      console.error('❌ Google Calendar API not available:', error);
      return false;
    }
  }

  /**
   * Create or link a Google Calendar
   */
  public async createCalendar(params: CalendarCreateParams): Promise<CalendarCreateResult> {
    try {
      console.log('🚀 Creating Google Calendar via client-side API...');
      
      const initialized = await this.initializeGoogleApi();
      if (!initialized) {
        return {
          success: false,
          error: 'Google Calendar API not available',
          errorType: 'api_unavailable'
        };
      }

      // Get user's Google tokens from localStorage or session
      const googleTokens = this.getGoogleTokens();
      if (!googleTokens?.accessToken) {
        return {
          success: false,
          error: 'Google authentication required',
          errorType: 'auth_required'
        };
      }

      // Set up OAuth2 client
      this.gapi.client.setApiKey(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY);
      
      // Check for existing Paige calendars
      const calendarListResponse = await this.gapi.client.calendar.calendarList.list();
      const existingCalendars = calendarListResponse.result.items || [];
      
      // Look for existing Paige calendars (by name pattern)
      const paigeCalendarPattern = /(paige|wedding.*to.*do)/i;
      const existingPaigeCalendar = existingCalendars.find((cal: any) => 
        cal.summary && paigeCalendarPattern.test(cal.summary) && 
        cal.accessRole === 'owner'
      );
      
      let calendarId: string;
      let isReusingExisting = false;
      
      if (existingPaigeCalendar) {
        console.log('✅ Found existing Paige calendar:', existingPaigeCalendar.id);
        calendarId = existingPaigeCalendar.id;
        isReusingExisting = true;
        
        // Update the existing calendar name if it's different
        if (existingPaigeCalendar.summary !== params.calendarName) {
          try {
            await this.gapi.client.calendar.calendars.update({
              calendarId: calendarId,
              resource: {
                summary: params.calendarName,
                description: 'Wedding to-do items synced from Paige',
              },
            });
            console.log('✅ Updated existing calendar name');
          } catch (updateError) {
            console.warn('⚠️ Failed to update calendar name:', updateError);
          }
        }
      } else {
        // Create a new calendar
        const calendarResource = {
          summary: params.calendarName,
          description: 'Wedding to-do items synced from Paige',
          timeZone: 'UTC',
          colorId: '1', // Blue color
        };

        console.log('🚀 Creating new calendar:', calendarResource);
        
        const calendarResponse = await this.gapi.client.calendar.calendars.insert({
          resource: calendarResource,
        });

        calendarId = calendarResponse.result.id;
        console.log('✅ New calendar created with ID:', calendarId);
      }

      // Store calendar info in localStorage for persistence
      const calendarInfo = {
        calendarId: calendarId,
        calendarName: params.calendarName,
        createdAt: new Date().toISOString(),
        lastSyncAt: new Date().toISOString(),
      };

      localStorage.setItem(`googleCalendar_${params.userId}`, JSON.stringify(calendarInfo));

      return {
        success: true,
        calendarId,
        calendarName: params.calendarName,
        isReusingExisting,
        message: isReusingExisting 
          ? 'Existing Google Calendar found and linked successfully.' 
          : 'Google Calendar created and linked successfully.'
      };

    } catch (error: any) {
      console.error('❌ Google Calendar creation failed:', error);
      
      let errorType = 'unknown';
      if (error.message?.includes('invalid_grant')) {
        errorType = 'auth_expired';
      } else if (error.message?.includes('quota')) {
        errorType = 'quota_exceeded';
      } else if (error.message?.includes('permission')) {
        errorType = 'permission_denied';
      }

      return {
        success: false,
        error: error.message || 'Failed to create Google Calendar',
        errorType
      };
    }
  }

  /**
   * Check calendar status
   */
  public async getCalendarStatus(userId: string): Promise<CalendarStatusResult> {
    try {
      console.log('🔍 Checking Google Calendar status...');
      
      const initialized = await this.initializeGoogleApi();
      if (!initialized) {
        return {
          success: false,
          error: 'Google Calendar API not available',
          errorType: 'api_unavailable'
        };
      }

      // Check localStorage for calendar info
      const calendarInfoStr = localStorage.getItem(`googleCalendar_${userId}`);
      if (!calendarInfoStr) {
        return {
          success: true,
          isLinked: false
        };
      }

      const calendarInfo = JSON.parse(calendarInfoStr);
      
      return {
        success: true,
        isLinked: true,
        calendarId: calendarInfo.calendarId,
        calendarName: calendarInfo.calendarName,
        lastSyncAt: calendarInfo.lastSyncAt,
        lastSyncCount: calendarInfo.lastSyncCount,
        lastSyncErrors: calendarInfo.lastSyncErrors,
        lastSyncFromAt: calendarInfo.lastSyncFromAt,
        lastSyncFromCount: calendarInfo.lastSyncFromCount,
        lastSyncFromErrors: calendarInfo.lastSyncFromErrors,
        lastWebhookSyncAt: calendarInfo.lastWebhookSyncAt,
        lastWebhookEventCount: calendarInfo.lastWebhookEventCount,
      };

    } catch (error: any) {
      console.error('❌ Failed to check calendar status:', error);
      return {
        success: false,
        error: error.message || 'Failed to check calendar status',
        errorType: 'unknown'
      };
    }
  }

  /**
   * Sync todos to Google Calendar
   */
  public async syncTodosToCalendar(params: CalendarSyncParams): Promise<CalendarSyncResult> {
    try {
      console.log('🔄 Syncing todos to Google Calendar...');
      
      const initialized = await this.initializeGoogleApi();
      if (!initialized) {
        return {
          success: false,
          error: 'Google Calendar API not available',
          errorType: 'api_unavailable'
        };
      }

      // Get calendar info
      const calendarInfoStr = localStorage.getItem(`googleCalendar_${params.userId}`);
      if (!calendarInfoStr) {
        return {
          success: false,
          error: 'No Google Calendar linked',
          errorType: 'not_linked'
        };
      }

      const calendarInfo = JSON.parse(calendarInfoStr);
      const calendarId = calendarInfo.calendarId;

      if (!params.todos || params.todos.length === 0) {
        return {
          success: true,
          syncedCount: 0,
          message: 'No todos to sync'
        };
      }

      let syncedCount = 0;
      const errors: string[] = [];

      // Convert todos to calendar events
      for (const todo of params.todos) {
        try {
          const event = this.convertTodoToEvent(todo);
          
          await this.gapi.client.calendar.events.insert({
            calendarId: calendarId,
            resource: event,
          });
          
          syncedCount++;
          console.log(`✅ Synced todo: ${todo.title}`);
        } catch (error: any) {
          const errorMsg = `Failed to sync todo "${todo.title}": ${error.message}`;
          errors.push(errorMsg);
          console.error('❌', errorMsg);
        }
      }

      // Update sync info
      const updatedCalendarInfo = {
        ...calendarInfo,
        lastSyncAt: new Date().toISOString(),
        lastSyncCount: syncedCount,
        lastSyncErrors: errors,
      };
      
      localStorage.setItem(`googleCalendar_${params.userId}`, JSON.stringify(updatedCalendarInfo));

      return {
        success: true,
        syncedCount,
        errors: errors.length > 0 ? errors : undefined,
        message: `Successfully synced ${syncedCount} todos to Google Calendar`
      };

    } catch (error: any) {
      console.error('❌ Failed to sync todos to calendar:', error);
      return {
        success: false,
        error: error.message || 'Failed to sync todos to calendar',
        errorType: 'sync_failed'
      };
    }
  }

  /**
   * Convert todo item to Google Calendar event
   */
  private convertTodoToEvent(todo: any): any {
    const startDate = new Date(todo.dueDate || todo.createdAt);
    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // 1 hour duration

    return {
      summary: todo.title,
      description: todo.description || 'Wedding to-do item from Paige',
      start: {
        dateTime: startDate.toISOString(),
        timeZone: 'UTC',
      },
      end: {
        dateTime: endDate.toISOString(),
        timeZone: 'UTC',
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 24 * 60 }, // 1 day before
          { method: 'popup', minutes: 60 }, // 1 hour before
        ],
      },
    };
  }

  /**
   * Get Google tokens from localStorage
   */
  private getGoogleTokens(): { accessToken: string; refreshToken?: string; expiryDate?: number } | null {
    try {
      const tokensStr = localStorage.getItem('googleTokens');
      if (!tokensStr) return null;
      
      const tokens = JSON.parse(tokensStr);
      return tokens;
    } catch (error) {
      console.error('❌ Failed to get Google tokens:', error);
      return null;
    }
  }

  /**
   * Fallback to server route if client-side fails
   */
  public async createCalendarWithFallback(params: CalendarCreateParams): Promise<CalendarCreateResult> {
    try {
      // Try client-side first
      const clientResult = await this.createCalendar(params);
      if (clientResult.success) {
        console.log('✅ Client-side Google Calendar creation successful');
        return clientResult;
      }

      console.log('⚠️ Client-side failed, falling back to server route...');
      
      // Fallback to server route
      const response = await fetch('/api/google-calendar/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        throw new Error(`Server route failed: ${response.status}`);
      }

      const serverResult = await response.json();
      console.log('✅ Server route Google Calendar creation successful');
      return serverResult;

    } catch (error: any) {
      console.error('❌ Both client-side and server-side Google Calendar creation failed:', error);
      return {
        success: false,
        error: error.message || 'Failed to create Google Calendar',
        errorType: 'both_failed'
      };
    }
  }
}

// Export singleton instance
export const googleCalendarClientService = GoogleCalendarClientService.getInstance();

// Export types
export type {
  CalendarCreateParams,
  CalendarCreateResult,
  CalendarStatusResult,
  CalendarSyncParams,
  CalendarSyncResult,
};
