# Testing Weekly Todo Digest Email

## 🧪 How to Test

### Step 1: Prerequisites
Make sure you have some incomplete todo items in your account:
1. Go to `http://localhost:3000/todo`
2. Create at least 2-3 todo items with different deadlines
3. Leave them uncompleted (don't check them off)

### Step 2: Go to Test Page
1. Navigate to: `http://localhost:3000/test-welcome-email`
2. You'll see a new section: **"📋 Reminder Emails (Real User Data)"**

### Step 3: Send Test Email
1. Enter your email address in the input field
2. Click **"Send Weekly Todo Digest"** button
3. Check your email inbox!

---

## ✅ What to Look For

The email should have:

### **Design Elements:**
- ✅ 80px Paige logo at top (centered, clickable)
- ✅ "Your Weekly To-Dos 📋" header (Playfair Display, 24px)
- ✅ 1rem padding around all content
- ✅ 32px Paige favicon in footer

### **Content:**
- ✅ "Hello [Your Name],"
- ✅ "Here are your next X upcoming to-do items..."
- ✅ Up to 5 todo items displayed

### **Todo Item Cards:**
Each todo should show:
- ✅ Todo name (bold, 16px)
- ✅ Category (if set)
- ✅ List name (📋 icon + name)
- ✅ Deadline with color coding:
  - **Red**: "Overdue by X days"
  - **Orange**: "Due today" or "Due tomorrow"
  - **Accent (#A85C36)**: "Due in X days" (within 7 days)
  - **Gray**: "Due [date]" (more than 7 days)

### **Action Elements:**
- ✅ "View All Tasks" button (accent color #A85C36)
- ✅ Blue info box with pro tip about Sunday planning

---

## 🔧 Troubleshooting

### "No todos found" or empty email?
- Make sure you're logged in
- Create some incomplete todos at `/todo`
- Try again

### Email not arriving?
- Check spam folder
- Wait 1-2 minutes (email processing)
- Check browser console for errors

### Want to test with different scenarios?
1. Add more todos with various deadlines (past, today, future)
2. Add todos to different lists
3. Set different categories
4. Send test email again to see how it adapts

---

## 📊 What Makes This Email Special

Unlike the welcome email with hardcoded scenarios, this email:
- ✅ Uses **YOUR actual todo data** from Firestore
- ✅ Shows **real deadlines** from your lists
- ✅ Displays **actual categories** you've set
- ✅ Shows **real list names** you've created
- ✅ Adapts based on **what you actually have** in your account

This is a **real, production-ready** email that will help users stay organized! 🚀

---

## 🎯 Next Steps

Once you verify this looks good:
1. We'll continue with the remaining 8 emails
2. All will follow the same unified template
3. All will use real user data from Firestore
4. We'll create automated triggers (cron jobs)

