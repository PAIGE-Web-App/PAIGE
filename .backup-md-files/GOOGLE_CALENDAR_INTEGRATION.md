# Google Calendar Integration

This document describes the Google Calendar integration features in Paige.

## Features

### 1. **Two-Way Real-Time Sync**
- **Sync to Google Calendar**: Push Paige to-do items to a dedicated Google Calendar
- **Sync from Google Calendar**: Pull events from Google Calendar back to Paige
- **Real-time updates**: Webhook-based sync for instant updates when changes are made in Google Calendar

### 2. **Dedicated Calendar**
- Creates a new Google Calendar specifically for Paige wedding to-dos
- Calendar name: "Paige Wedding To-Dos"
- Events are tagged with Paige metadata for proper sync

### 3. **Smart Filtering**
- Only syncs items from the currently selected list/view
- Preserves category information and completion status
- Handles deadlines and end dates properly

## API Endpoints

### `/api/google-calendar/create`
- **Method**: POST
- **Purpose**: Create and link a new Google Calendar
- **Body**: `{ userId, calendarName }`
- **Response**: `{ success, calendarId, calendarName, message }`

### `/api/google-calendar/sync-to-calendar`
- **Method**: POST
- **Purpose**: Sync Paige to-dos to Google Calendar
- **Body**: `{ userId, todoItems, listId }`
- **Response**: `{ success, syncedCount, errorCount, message }`

### `/api/google-calendar/sync-from-calendar`
- **Method**: POST
- **Purpose**: Sync events from Google Calendar to Paige
- **Body**: `{ userId, listId }`
- **Response**: `{ success, importedCount, updatedCount, errorCount, message }`

### `/api/google-calendar/status`
- **Method**: POST
- **Purpose**: Get calendar sync status
- **Body**: `{ userId }`
- **Response**: `{ isLinked, calendarId, calendarName, lastSyncAt, ... }`

### `/api/google-calendar/webhook`
- **Method**: POST/GET
- **Purpose**: Handle real-time webhook updates from Google Calendar
- **Features**: Webhook verification and event processing

## OAuth Scopes

The following Google OAuth scopes are required:
- `https://www.googleapis.com/auth/calendar` - Manage Google Calendar
- `https://www.googleapis.com/auth/calendar.events` - Manage calendar events
- `https://www.googleapis.com/auth/userinfo.email` - Get user email
- `https://www.googleapis.com/auth/userinfo.profile` - Get user profile
- `https://www.googleapis.com/auth/gmail.readonly` - Read Gmail (existing)
- `https://www.googleapis.com/auth/gmail.send` - Send Gmail (existing)

## UI Components

### GoogleCalendarSync Component
- **Location**: `components/GoogleCalendarSync.tsx`
- **Features**:
  - Create/link Google Calendar
  - Sync to/from Google Calendar
  - Display sync status and history
  - Real-time sync indicator
  - Open Google Calendar in new tab

### Integration Points
- **Todo Page**: Calendar sync panel appears in calendar view
- **Calendar View**: Sync panel shows on the right side
- **Real-time Updates**: Webhook processing for instant sync

## Data Structure

### Firestore User Document
```javascript
{
  googleTokens: {
    accessToken: string,
    refreshToken: string,
    expiresAt: number,
    email: string
  },
  googleCalendar: {
    calendarId: string,
    calendarName: string,
    webhookUrl: string,
    webhookId: string,
    createdAt: Timestamp,
    lastSyncAt: Timestamp,
    lastSyncCount: number,
    lastSyncErrors: number,
    lastSyncFromAt: Timestamp,
    lastSyncFromCount: number,
    lastSyncFromErrors: number,
    lastWebhookSyncAt: Timestamp,
    lastWebhookEventCount: number
  }
}
```

### Google Calendar Event Metadata
```javascript
{
  extendedProperties: {
    private: {
      paigeTodoId: string,
      paigeListId: string,
      paigeCategory: string,
      paigeCompleted: string
    }
  }
}
```

## Usage

1. **Enable Calendar View**: Switch to calendar view in the todo page
2. **Create Calendar**: Click "Create Google Calendar" in the sync panel
3. **Sync To Google**: Click "Sync to Google" to push current to-dos
4. **Sync From Google**: Click "Sync from Google" to pull calendar events
5. **Real-time Updates**: Changes in Google Calendar automatically sync to Paige

## Environment Variables

Ensure these environment variables are set:
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI`
- `NEXT_PUBLIC_APP_URL` (for webhook URL)

## Webhook Setup

For real-time sync to work in production:
1. Deploy to a publicly accessible URL
2. Update Google Cloud Console webhook URL
3. Ensure webhook endpoint is accessible
4. Monitor webhook delivery in Google Cloud Console

## Error Handling

- **Token Refresh**: Automatic OAuth token refresh
- **API Quotas**: Graceful handling of Google API limits
- **Network Errors**: Retry logic and user-friendly error messages
- **Data Validation**: Proper validation of sync data

## Security

- **OAuth 2.0**: Secure authentication flow
- **Token Storage**: Encrypted token storage in Firestore
- **Webhook Verification**: Token-based webhook verification
- **User Isolation**: Calendar data isolated per user 