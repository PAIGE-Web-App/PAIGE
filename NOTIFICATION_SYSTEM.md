# Notification System

Paige's notification system sends alerts when users receive new messages from vendors. The system is designed to be non-redundant and user-friendly.

## Smart Notification Logic

**Notifications are only sent for in-app messages**, not Gmail messages. This prevents redundancy since:
- Gmail messages are already in the user's email inbox
- Sending notifications for Gmail messages would create duplicate alerts
- In-app messages are only visible within Paige, so notifications are valuable

## Message Flow

1. **In-App Message**: User sends message through Paige's in-app messaging
2. **Notification Trigger**: System automatically calls notification API
3. **Source Check**: API verifies message source is 'inapp' (not 'gmail')
4. **Preference Check**: System checks user's notification preferences
5. **Notification Send**: SMS and/or email notifications sent based on preferences
6. **Status Update**: Message marked with notification status

## User Data Structure

The notification system extends the user document in Firestore with the following fields:

```typescript
{
  // ... existing user fields
  phoneNumber: string | null;
  notificationPreferences: {
    sms: boolean;
    email: boolean;
    push: boolean;
    inApp: boolean;
  };
}
```

## API Endpoints

### POST `/api/notifications/send`
Sends notifications when a user receives a new in-app message.

**Request Body:**
```json
{
  "userId": "user_id",
  "contactId": "contact_id", 
  "messageId": "message_id",
  "messageBody": "Message content",
  "contactName": "Contact name",
  "messageSource": "inapp" // Required: only 'inapp' messages trigger notifications
}
```

**Response:**
- If `messageSource` is 'gmail': Returns success with `skipped: true`
- If `messageSource` is 'inapp': Processes notifications normally

### POST `/api/notifications/test`
Sends test notifications to verify user settings.

**Request Body:**
```json
{
  "userId": "user_id",
  "testType": "all" | "sms" | "email"
}
```

## User Interface

### Settings Page
Users can configure their notification preferences in the Settings > Notifications tab:

1. **Phone Number**: Enter phone number for SMS notifications
2. **SMS Notifications**: Toggle SMS alerts (for in-app messages only)
3. **Email Notifications**: Toggle email alerts (for in-app messages only)  
4. **Push Notifications**: Toggle browser push notifications (coming soon)
5. **In-App Notifications**: Toggle in-app alerts

### Test Notifications
Users can test their notification settings using the "Test Notifications" button in the settings page.

## Onboarding Integration

During onboarding, users select communication channels which are automatically converted to notification preferences:

- **SMS** → `notificationPreferences.sms = true`
- **Gmail** → `notificationPreferences.email = true` 
- **Push** → `notificationPreferences.push = true`
- **InApp** → `notificationPreferences.inApp = true`

## Cost Management

- **Email notifications**: Very low cost (~$0.01-0.05 per user/month)
- **SMS notifications**: Higher cost (~$0.15-0.30 per user/month for 20-40 messages)
- **Recommendation**: Keep notifications free for better user experience
- **Future optimization**: Add rate limiting or make SMS premium if costs become unsustainable

## Benefits

1. **No Redundancy**: Users don't get duplicate notifications for Gmail messages
2. **Clear Value**: Notifications only for messages they can't see elsewhere
3. **Cost Effective**: Reduces unnecessary notification costs
4. **Better UX**: Notifications feel valuable, not spammy 