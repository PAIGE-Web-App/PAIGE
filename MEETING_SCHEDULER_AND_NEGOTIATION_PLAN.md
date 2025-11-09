# Meeting Scheduler & Vendor Negotiation Feature Plan

## Overview
This plan outlines the implementation of two key features:
1. **Smart Meeting Scheduler** - Automatically suggests optimal meeting times by combining user calendar availability with vendor business hours
2. **Vendor Negotiation Feature** - Allows users to customize their writing tone/style for vendor communications, especially negotiations

## Existing Infrastructure to Leverage

### ✅ Already Available:
- **Google Calendar Integration**: Full sync capability (`app/api/google-calendar/*`)
- **Google Places API**: Business hours fetching (`app/api/google-place-details`)
- **Calendar Event Creation**: `lib/googleCalendarHttp.ts` - `createEvent()` function
- **Draft API**: `app/api/draft/route.ts` - Already has context-aware message generation
- **Settings Structure**: `app/settings/page.tsx` with tab system
- **User Document**: Firestore `users/{userId}` document structure
- **Vendor Contact Flow**: `components/VendorContactModal.tsx` and `app/messages/page.tsx`

---

## Phase 1: Writing Style Preferences (Settings) - **INCREMENTAL WIN #1**

### What We're Adding:
Add a new "Communication" section in Settings where users can set:
- **General Writing Tone**: Friendly, Professional, Casual, Formal
- **Negotiation Style**: Assertive, Collaborative, Diplomatic, Direct
- **Formality Level**: Very Casual, Casual, Professional, Very Formal

### Implementation:
1. **Add to Settings UI** (`app/settings/components/IntegrationsTab.tsx` or new `CommunicationTab.tsx`)
   - Simple dropdowns using existing `SelectField` component
   - Save to existing `users/{userId}` document (no new collections!)

2. **Firestore Structure** (add to existing user document):
```typescript
{
  // ... existing fields
  communicationPreferences: {
    generalTone: 'friendly' | 'professional' | 'casual' | 'formal',
    negotiationStyle: 'assertive' | 'collaborative' | 'diplomatic' | 'direct',
    formalityLevel: 'very-casual' | 'casual' | 'professional' | 'very-formal',
    updatedAt: Timestamp
  }
}
```

3. **Cost Optimization**: 
   - Single Firestore write when saved (same document update)
   - Read as part of existing user data fetch (no extra reads)

### Files to Modify:
- `app/settings/components/IntegrationsTab.tsx` (add communication section)
- `hooks/useUserProfileData.ts` (add communicationPreferences to state)
- `types/user.ts` (add CommunicationPreferences interface)

**Estimated Effort**: 2-3 hours
**Firestore Impact**: +1 write per user (when they update settings), 0 extra reads (uses existing user doc)

---

## Phase 2: Enhanced Draft API with Negotiation Mode - **INCREMENTAL WIN #2**

### What We're Adding:
Extend the existing `/api/draft` endpoint to:
- Accept a `negotiationMode: boolean` parameter
- Use user's communication preferences when generating negotiation messages
- Adjust tone/style based on negotiation context

### Implementation:
1. **Update Draft API** (`app/api/draft/route.ts`):
   - Add `negotiationMode` and `negotiationContext` to request body
   - Read `communicationPreferences` from user document (already fetched in most cases)
   - Enhance system prompt with negotiation tone instructions

2. **New Prompt Logic**:
```typescript
if (negotiationMode) {
  const preferences = userData.communicationPreferences;
  systemPrompt += `\n\nNEGOTIATION MODE:
- Tone: ${preferences.generalTone}
- Style: ${preferences.negotiationStyle}
- Formality: ${preferences.formalityLevel}
- Context: ${negotiationContext || 'Price negotiation'}
Write a negotiation email that is ${preferences.negotiationStyle} while maintaining a ${preferences.generalTone} tone.`;
}
```

3. **Cost Optimization**:
   - Leverages existing user data fetch
   - No new Firestore reads (uses existing draft API pattern)

### Files to Modify:
- `app/api/draft/route.ts` (enhance with negotiation mode)
- `components/VendorContactModal.tsx` (add "Negotiate" button/mode)
- `app/messages/page.tsx` (add negotiation toggle in draft UI)

**Estimated Effort**: 3-4 hours
**Firestore Impact**: 0 extra reads/writes (uses existing patterns)

---

## Phase 3: User Availability Preferences - **INCREMENTAL WIN #3**

### What We're Adding:
Allow users to set their preferred meeting times and availability in Settings.

### Implementation:
1. **Settings UI** (add to IntegrationsTab or new CommunicationTab):
   - Working hours: Start time / End time (time pickers)
   - Preferred meeting days: Checkboxes (Mon-Sun)
   - Buffer time between meetings: Number input (default: 15 min)

2. **Firestore Structure** (add to existing user document):
```typescript
{
  // ... existing fields
  availabilityPreferences: {
    workingHours: {
      start: '09:00', // HH:MM format
      end: '17:00'
    },
    preferredDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
    bufferMinutes: 15,
    timezone: 'America/New_York', // from user's browser/system
    updatedAt: Timestamp
  }
}
```

3. **Cost Optimization**:
   - Single Firestore write when saved
   - Read as part of existing user data fetch

### Files to Modify:
- `app/settings/components/IntegrationsTab.tsx` (add availability section)
- `hooks/useUserProfileData.ts` (add availabilityPreferences)
- `types/user.ts` (add AvailabilityPreferences interface)

**Estimated Effort**: 2-3 hours
**Firestore Impact**: +1 write per user (when they update), 0 extra reads

---

## Phase 4: Meeting Scheduler Service - **INCREMENTAL WIN #4**

### What We're Building:
An intelligent service that:
1. Reads user's Google Calendar events (using existing `listEvents`)
2. Fetches vendor business hours (using existing `google-place-details` API)
3. Suggests optimal meeting times that don't conflict
4. Creates calendar events with Google Meet links if virtual

### Implementation:

#### 4.1 Create Meeting Scheduler API (`app/api/meeting-scheduler/suggest-times/route.ts`):
```typescript
// New API endpoint
POST /api/meeting-scheduler/suggest-times
Body: {
  userId: string,
  vendorPlaceId: string,
  meetingDuration: number, // minutes
  isVirtual: boolean,
  dateRange: { start: string, end: string } // ISO dates
}

Response: {
  suggestions: Array<{
    dateTime: string,
    reason: string, // "Available during business hours"
    meetLink?: string // if isVirtual
  }>
}
```

**Logic Flow**:
1. Get user's Google Calendar events (using existing `listEvents` from `lib/googleCalendarHttp.ts`)
2. Get user's availability preferences (from user document)
3. Get vendor business hours (fetch from `/api/google-place-details?placeId=...`)
4. Find overlapping time slots:
   - User's working hours
   - Vendor's business hours (from Google Places)
   - No conflicts with existing calendar events
5. Return top 5-10 suggestions

#### 4.2 Add Google Meet Link Support (`lib/googleCalendarHttp.ts`):
```typescript
// Enhance createEvent to support Google Meet
interface CalendarEvent {
  // ... existing fields
  conferenceData?: {
    createRequest: {
      requestId: string, // UUID
      conferenceSolutionKey: { type: 'hangoutsMeet' }
    }
  };
}

// When creating event with isVirtual=true, add conferenceData
if (isVirtual) {
  event.conferenceData = {
    createRequest: {
      requestId: crypto.randomUUID(),
      conferenceSolutionKey: { type: 'hangoutsMeet' }
    }
  };
}
```

#### 4.3 Cost Optimization:
- **Calendar reads**: Uses existing Google Calendar API (no Firestore)
- **Vendor hours**: Cached Google Places API response (we can cache this)
- **No new Firestore paths**: Uses existing user document for preferences
- **Smart caching**: Cache vendor business hours for 24 hours (reduce API calls)

### Files to Create/Modify:
- **New**: `app/api/meeting-scheduler/suggest-times/route.ts`
- **New**: `lib/meetingSchedulerService.ts` (core logic)
- **Modify**: `lib/googleCalendarHttp.ts` (add Google Meet support)
- **Modify**: `app/api/google-place-details/route.ts` (add caching if needed)

**Estimated Effort**: 6-8 hours
**Firestore Impact**: 0 reads/writes (uses existing user doc read, Google Calendar API, Google Places API)

---

## Phase 5: Meeting Scheduler UI - **INCREMENTAL WIN #5**

### What We're Building:
A UI component that integrates with vendor contact flow to suggest and schedule meetings.

### Implementation:

#### 5.1 Create Meeting Scheduler Component (`components/MeetingScheduler.tsx`):
- Shows suggested times when user clicks "Schedule Meeting" on vendor
- Displays: Date, Time, Duration, Virtual/In-person indicator
- "Schedule" button that creates calendar event via existing API

#### 5.2 Integration Points:
1. **Vendor Contact Modal** (`components/VendorContactModal.tsx`):
   - Add "Schedule Meeting" button next to "Send Email"
   - Opens meeting scheduler component

2. **Messages Page** (`app/messages/page.tsx`):
   - Add "Schedule Meeting" action in contact actions menu
   - Reuses same meeting scheduler component

#### 5.3 UX Flow:
1. User clicks "Schedule Meeting" on vendor
2. Component fetches suggestions via `/api/meeting-scheduler/suggest-times`
3. Shows 5-10 time slots with context (e.g., "Available - Vendor open 9am-5pm")
4. User selects time slot
5. Creates calendar event (using existing `/api/google-calendar/sync-to-calendar` or new endpoint)
6. If virtual: Google Meet link automatically added
7. Success toast: "Meeting scheduled! Added to your calendar."

### Files to Create/Modify:
- **New**: `components/MeetingScheduler.tsx`
- **Modify**: `components/VendorContactModal.tsx` (add meeting button)
- **Modify**: `app/messages/page.tsx` (add meeting action)

**Estimated Effort**: 4-5 hours
**Firestore Impact**: 0 extra reads/writes (uses existing calendar sync)

---

## Phase 6: Enhanced Calendar Event Creation with Meet Links - **INCREMENTAL WIN #6**

### What We're Adding:
Enhance existing calendar sync to support Google Meet links when creating events.

### Implementation:
1. **Update `lib/googleCalendarHttp.ts`**:
   - Add `isVirtual` parameter to `createEvent()`
   - Add `conferenceData` when `isVirtual=true`
   - Extract Meet link from response

2. **Update `app/api/google-calendar/sync-to-calendar/route.ts`**:
   - Accept `isVirtual` and `meetLink` in request
   - Pass to `createEvent()` function

3. **Return Meet Link**:
   - Google Calendar API automatically creates Meet link when `conferenceData` is provided
   - Extract from response: `event.conferenceData.entryPoints[0].uri`

### Files to Modify:
- `lib/googleCalendarHttp.ts` (add Meet support)
- `app/api/google-calendar/sync-to-calendar/route.ts` (pass isVirtual flag)

**Estimated Effort**: 2-3 hours
**Firestore Impact**: 0 extra reads/writes

---

## Summary of Incremental Wins

### Win #1: Writing Style Preferences (2-3 hours)
- ✅ Minimal Firestore impact (1 write per user update)
- ✅ Uses existing Settings structure
- ✅ Foundation for negotiation feature

### Win #2: Negotiation Mode in Draft API (3-4 hours)
- ✅ Leverages existing draft API
- ✅ No new Firestore reads
- ✅ Immediate value for users

### Win #3: Availability Preferences (2-3 hours)
- ✅ Minimal Firestore impact
- ✅ Foundation for scheduler
- ✅ Simple UI addition

### Win #4: Meeting Scheduler Service (6-8 hours)
- ✅ Uses existing Google Calendar integration
- ✅ Uses existing Google Places API
- ✅ No new Firestore paths
- ✅ Smart caching reduces API costs

### Win #5: Meeting Scheduler UI (4-5 hours)
- ✅ Reuses existing components
- ✅ Integrates with existing vendor flow
- ✅ No Firestore impact

### Win #6: Google Meet Links (2-3 hours)
- ✅ Enhances existing calendar sync
- ✅ No Firestore impact
- ✅ Uses Google Calendar API feature

---

## Total Estimated Effort: 19-26 hours

## Firestore Impact Summary:
- **New Collections**: 0
- **New Indexes**: 0
- **Additional Reads**: 0 (uses existing user doc reads)
- **Additional Writes**: +1 per user (when they update communication/availability preferences)
- **Leverages Existing**: User document, Google Calendar API, Google Places API

## Cost Optimization Strategies:
1. **Cache vendor business hours** for 24 hours (reduce Google Places API calls)
2. **Batch calendar reads** (existing Google Calendar API handles this efficiently)
3. **Use existing user document** (no new collections or indexes)
4. **Leverage Google Calendar API** for event creation (no Firestore writes for events)
5. **Smart scheduling** - only fetch calendar events for date range needed (existing API supports this)

---

## Technical Notes

### Google Meet Link Generation:
Google Calendar API automatically generates Meet links when you include `conferenceData` in the event creation request. The link is returned in the response and can be extracted for display/email.

### Vendor Business Hours:
Google Places API returns `opening_hours.weekday_text` which gives us the business hours. We can parse this to find available time slots.

### Calendar Conflict Detection:
- Read user's calendar events for the date range
- Check if suggested times overlap with existing events
- Consider user's buffer time preference

### UX Patterns to Follow:
- Use existing dropdown components from Settings
- Use existing toast notifications
- Use existing modal patterns
- Follow existing button styles (purple accent color)
- Use Work Sans font (no inline font styles)

---

## Next Steps:
1. Start with Phase 1 (Writing Style Preferences) - smallest, highest value
2. Then Phase 2 (Negotiation Mode) - builds on Phase 1
3. Then Phase 3 (Availability) - foundation for scheduler
4. Then Phase 4-6 (Scheduler) - most complex but most valuable

Each phase delivers independent value and can be tested separately!

