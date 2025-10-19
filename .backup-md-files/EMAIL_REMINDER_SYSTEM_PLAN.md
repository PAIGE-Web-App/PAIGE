# Email Reminder System - Real User Behavior

## 🎯 Overview

All emails based on **real user data and behavior** - no fake triggers!

---

## 📋 Todo Emails

### 1. Weekly Todo Digest (Sunday Morning)
**Trigger**: Automated weekly email every Sunday at 8 AM
**Condition**: User has at least 1 todo list with incomplete items
**Content**: 
- Subject: "📋 Your Weekly To-Dos"
- Show next 5 upcoming todo items (by deadline)
- Use TodoItemComponent styling
- Button: "View All Tasks"

**Data Source**: 
- `users/{userId}/todoItems` where `isCompleted = false`
- Sort by `deadline` ASC
- Limit to 5 items

### 2. Missed Deadline Reminder
**Trigger**: Daily check at 9 AM
**Condition**: Todo item deadline passed and `isCompleted = false`
**Content**:
- Subject: "⏰ Missed Deadline: [Todo Name]"
- Show overdue todo item details
- Options: Mark Complete | Update Deadline | Remove
- Button: "Review Task"

**Data Source**:
- `users/{userId}/todoItems` where `deadline < today` AND `isCompleted = false`

---

## 💰 Budget Emails

### 3. Payment Overdue Reminder
**Trigger**: Daily check at 10 AM
**Condition**: Budget item `dueDate` passed and `isPaid = false`
**Content**:
- Subject: "💳 Payment Due: [Budget Item Name]"
- Show budget item details (amount, vendor, due date)
- Button: "Mark as Paid" | "Update Budget"

**Data Source**:
- `users/{userId}/budgetItems` where `dueDate < today` AND `isPaid = false`

### 4. Budget Creation Prompt
**Trigger**: 1 week after account creation
**Condition**: No budget items exist
**Content**:
- Subject: "💰 Time to Plan Your Wedding Budget"
- Benefits of budget planning
- Button: "Create Budget"

**Data Source**:
- User `createdAt` + 7 days
- Check if `users/{userId}/budgetItems` is empty

---

## 🏢 Vendor Emails

### 5. Venue Selection Prompt
**Trigger**: 3 days after account creation
**Condition**: No venue selected (`hasVenue = false`)
**Content**:
- Subject: "🏛️ Find Your Perfect Wedding Venue"
- Why venue is important
- Button: "Browse Venues"

**Data Source**:
- User `createdAt` + 3 days
- `users/{userId}` where `hasVenue = false`

### 6. Vendor Team Building
**Trigger**: 1 week after venue selection
**Condition**: Has venue but < 3 vendors marked as official
**Content**:
- Subject: "👰 Build Your Dream Vendor Team"
- Suggest vendor categories
- Button: "Explore Vendors"

**Data Source**:
- User `hasVenue = true`
- `users/{userId}/vendors` where `isOfficial = true` count < 3

---

## 💬 Message Emails

### 7. Message Notification (Already Exists ✅)
**Trigger**: Real-time when in-app message received
**Condition**: Message from vendor/contact
**Status**: Already implemented via `/api/notifications/send`

---

## 💺 Seating Chart Email

### 8. Seating Chart Reminder
**Trigger**: Halfway to wedding date
**Condition**: No seating chart created
**Content**:
- Subject: "💺 Time to Plan Your Seating Chart"
- X days until wedding
- Button: "Create Seating Chart"

**Data Source**:
- User `weddingDate` 
- Calculate: `(today - createdAt) >= (weddingDate - createdAt) / 2`
- Check if `users/{userId}/seatingCharts` is empty

---

## 🎨 Moodboard Email

### 9. Moodboard Creation Prompt
**Trigger**: 2 weeks after account creation
**Condition**: No moodboards created
**Content**:
- Subject: "🎨 Visualize Your Wedding Style"
- Benefits of moodboards
- Button: "Create Moodboard"

**Data Source**:
- User `createdAt` + 14 days
- Check if `users/{userId}/moodboards` is empty

---

## 🔄 Implementation Strategy

### Phase 1: Create Email Templates (All use unified design)
- Weekly todo digest template
- Missed deadline template
- Budget overdue template
- Budget creation template
- Venue selection template
- Vendor team building template
- Seating chart reminder template
- Moodboard creation template

### Phase 2: Create Cron Jobs / Scheduled Tasks
- Daily checks (missed deadlines, payment overdue)
- Weekly checks (Sunday todo digest)
- Time-based checks (signup + X days)
- Wedding date-based checks (halfway point)

### Phase 3: Create Test Page
- Extend `/test-welcome-email` page
- Add buttons for each email type
- Use real user data for testing

### Phase 4: Integration
- Add cron job endpoints
- Integrate with existing notification preferences
- Add email tracking/logging

---

## 🧪 Testing Approach

Create `/test-reminder-emails` page with:
- Input: User email
- Buttons for each email type
- Preview of email content
- Send test button

---

## 📊 Technical Requirements

### Firestore Queries Needed:
1. Get incomplete todos by deadline
2. Get overdue todos
3. Get unpaid budget items past due date
4. Count budget items
5. Check venue status
6. Count official vendors
7. Count seating charts
8. Count moodboards
9. Get user signup date
10. Get wedding date

### Cron Jobs Needed:
- Daily at 9 AM: Missed deadlines
- Daily at 10 AM: Payment overdue
- Sunday at 8 AM: Weekly todo digest
- Daily at 11 AM: Check time-based triggers (signup + X days, wedding date milestones)

---

## 🎯 Next Steps

1. Create all email templates in `lib/emailService.ts`
2. Create helper functions in `lib/emailIntegrations.ts`
3. Create API endpoints for each email type
4. Create cron job handlers
5. Create unified test page
6. Test each email with real data
7. Deploy and monitor

All emails will use the same unified template system:
- 80px header logo
- 1rem padding
- Playfair Display + Work Sans fonts
- Accent color buttons (#A85C36)
- 32px footer logo

