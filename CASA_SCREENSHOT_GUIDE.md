# CASA Security Assessment - Screenshot Guide

## Detailed Instructions for Each Required Screenshot

---

## **SAQ Point 4 Evidence Screenshots**

### **1. Code showing OAuth token storage with restricted access**

**What to capture:**
- File: `pages/api/oauth/google-callback.ts`
- Lines: 92-106 (where tokens are stored)

**How to take screenshot:**
1. Open `pages/api/oauth/google-callback.ts` in your code editor
2. Scroll to lines 92-106
3. Highlight the code block that shows:
   ```typescript
   const googleTokens = {
     accessToken: tokens.access_token,
     refreshToken: tokens.refresh_token || null,
     // ... rest of the code
   };
   
   await adminDb.collection('users').doc(userId).set({
     googleTokens,
     gmailConnected: true,
   }, { merge: true });
   ```
4. Take screenshot showing:
   - The file path in the editor
   - The code block showing token storage
   - Line numbers visible

**Alternative/Additional Screenshot:**
- Show server-side validation in `app/api/gmail-reply-native/route.ts` lines 17-34
  - Shows how tokens are retrieved with user authentication check

---

### **2. Planning data isolated per user with authentication requirements**

**What to capture:**
- File: `firestore.rules`
- Lines: 13-32 (user collection rules)

**How to take screenshot:**
1. Open `firestore.rules` in your code editor
2. Show the security rules starting at line 13:
   ```javascript
   match /users/{userId} {
     allow read, write: if request.auth != null && request.auth.uid == userId;
     
     match /{collectionName}/{documentId} {
       allow read: if request.auth != null && request.auth.uid == userId;
       // ... planning data collections
     }
   }
   ```
3. Take screenshot showing:
   - The file path (`firestore.rules`)
   - The security rules enforcing user-based access
   - Line numbers visible

**Additional Screenshot - Firestore Console:**
1. Go to Firebase Console → Firestore Database
2. Navigate to Rules tab
3. Take screenshot showing the deployed security rules
4. Highlight the rules that show:
   - `request.auth != null` (authentication required)
   - `request.auth.uid == userId` (user isolation)

**Alternative Code Screenshot:**
- Show any API route that accesses planning data (e.g., `app/api/todo/route.ts`)
- Show where it checks `userId` and validates authentication before accessing Firestore

---

## **SAQ Point 15 Evidence Screenshots**

### **3. Firestore automatic backups via Google Cloud**

**What to capture:**
- Firebase Console → Firestore Database → Backups

**How to take screenshot:**
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Navigate to: **Firestore Database** → **Backups** tab
4. Take screenshot showing:
   - Backup status (enabled/disabled)
   - Point-in-time recovery settings
   - Backup retention period
   - Any available backup snapshots

**If Backups tab not visible:**
- Take screenshot of Firestore Database main page
- Show the "Backups" option in the left sidebar
- Or show Google Cloud Console → Firestore → Backup & Restore

**Alternative Documentation:**
- Screenshot of Google Cloud Console → Firestore → Backup settings
- Show automatic backup configuration

---

### **4. Version-controlled configuration files**

**What to capture:**
- Git repository showing configuration files

**Screenshot 1 - File Structure:**
1. Open your project in code editor or file explorer
2. Show these files in the root directory:
   - `firestore.rules`
   - `firestore.indexes.json`
   - `firebase.json`
   - `vercel.json`
   - `package.json`
3. Take screenshot showing all these files together

**Screenshot 2 - Git History:**
1. Open GitHub/GitLab/Bitbucket (your Git provider)
2. Navigate to your repository
3. Go to **Commits** or **History**
4. Take screenshot showing recent commits that modified:
   - `firestore.rules`
   - `vercel.json`
   - `package.json`
5. Highlight commits showing configuration changes

**Screenshot 3 - File Contents:**
1. Open `firestore.rules` in your code editor
2. Take screenshot showing:
   - File path
   - First few lines of the file
   - Line count (showing it's a substantial configuration file)

**Screenshot 4 - Vercel Configuration:**
1. Open `vercel.json` in your code editor
2. Take screenshot showing the entire file content

---

## **SAQ Point 20 Evidence Screenshots**

### **5. Firebase Authentication secure random code generation**

**What to capture:**
- Firebase Console → Authentication settings

**How to take screenshot:**
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Navigate to: **Authentication** → **Templates** tab
4. Click on **Password reset** template
5. Take screenshot showing:
   - Template configuration
   - Action URL settings
   - Code expiration settings (if visible)

**Alternative Screenshot:**
- Firebase Console → Authentication → Settings
- Show "Authorized domains" and "Action URL" configuration
- Highlight where password reset URLs are configured

**Code Screenshot:**
1. Open `app/login/page.tsx`
2. Scroll to line 737: `await sendPasswordResetEmail(auth, email);`
3. Take screenshot showing:
   - The function call to Firebase's password reset
   - Comment that this uses Firebase's secure code generation

---

### **6. Code expiration and single-use enforcement**

**What to capture:**
- Code showing expiration handling

**Screenshot 1 - Password Reset Code Validation:**
1. Open `app/reset-password/page.tsx`
2. Scroll to lines 19-55
3. Take screenshot showing:
   - Code extraction from URL (`oobCode`)
   - Code validation in `handleSubmit`
   - The `confirmPasswordReset` function call
   - Error handling for expired codes (line 60)

**Screenshot 2 - Email Verification Code Application:**
1. Open `app/verify-email/page.tsx`
2. Scroll to lines 23-28
3. Take screenshot showing:
   - `applyActionCode(auth, oobCode)` function call
   - Error handling for expired/invalid codes (lines 93-98)

**Screenshot 3 - Error Messages:**
1. Take screenshot of the code showing error messages:
   - `app/reset-password/page.tsx` line 60: "Failed to reset password. The link may have expired."
   - `app/verify-email/page.tsx` line 96: "Email verification failed. The link may be expired or invalid."

**Firebase Console Screenshot:**
- Firebase Console → Authentication → Templates
- Show password reset template with expiration information
- Or show Firebase documentation about code expiration (1 hour default)

---

### **7. Minimum password length enforcement (6+ characters)**

**What to capture:**
- Code showing password length validation

**Screenshot 1 - Password Reset Validation:**
1. Open `app/reset-password/page.tsx`
2. Scroll to lines 47-50
3. Take screenshot showing:
   ```typescript
   if (password.length < 6) {
     showErrorToast('Password must be at least 6 characters');
     return;
   }
   ```
4. Highlight the validation check

**Screenshot 2 - Signup Password Validation:**
1. Open `app/signup/page.tsx`
2. Scroll to lines 342-347
3. Take screenshot showing:
   ```typescript
   } else if (err.code === "auth/weak-password") {
     message = "Password should be at least 6 characters.";
   }
   ```
4. Show where Firebase enforces minimum length

**Screenshot 3 - Both Validations Together:**
- Open both files side by side
- Take screenshot showing password length enforcement in:
  - Password reset flow
  - Signup flow
- Highlight the "6" character minimum in both places

**Alternative - Firebase Console:**
- Firebase Console → Authentication → Settings
- Show password policy configuration (if available)
- Or show Firebase documentation about password requirements

---

## **Additional Recommended Screenshots**

### **8. Firestore Security Rules in Console (Point 4)**
- Firebase Console → Firestore Database → Rules
- Show the deployed rules matching your `firestore.rules` file
- Highlight the user-based access control rules

### **9. Vercel Deployment History (Point 15)**
- Vercel Dashboard → Your Project → Deployments
- Take screenshot showing:
  - Recent deployment history
  - Automatic deployments triggered by Git pushes
  - Build status and deployment times

### **10. Git Repository Structure (Point 15)**
- Your Git repository (GitHub/GitLab/etc.)
- Show the repository structure with:
  - `firestore.rules`
  - `vercel.json`
  - `package.json`
  - `firebase.json`
- Highlight that these are version-controlled

---

## **Screenshot Checklist**

### **SAQ Point 4:**
- [ ] Code: OAuth token storage (`pages/api/oauth/google-callback.ts` lines 92-106)
- [ ] Code: Server-side token validation (any API route accessing tokens)
- [ ] Firestore Rules: Security rules file (`firestore.rules` lines 13-32)
- [ ] Firestore Console: Deployed security rules showing user isolation

### **SAQ Point 15:**
- [ ] Firestore Console: Backup settings/configuration
- [ ] Git: Configuration files in repository (`firestore.rules`, `vercel.json`, `package.json`)
- [ ] Git: Commit history showing configuration changes
- [ ] Vercel: Deployment history showing automated deployments
- [ ] Code Editor: Configuration files showing version control

### **SAQ Point 20:**
- [ ] Firebase Console: Password reset template configuration
- [ ] Code: Password reset code handling (`app/reset-password/page.tsx`)
- [ ] Code: Email verification code handling (`app/verify-email/page.tsx`)
- [ ] Code: Password length validation (6+ characters) in reset flow
- [ ] Code: Password length validation (6+ characters) in signup flow
- [ ] Code: Error messages showing expiration handling

---

## **Screenshot Tips**

1. **Use annotations:** Add arrows or highlights to point out key features
2. **Show line numbers:** Make sure code editor line numbers are visible
3. **Include file paths:** Show the file path/tab in your editor
4. **Redact sensitive data:** If showing actual tokens or user data, blur/redact them
5. **Multiple angles:** For complex features, take multiple screenshots showing different aspects
6. **Console screenshots:** Use browser developer tools to take clean screenshots of Firebase/Vercel consoles
7. **Label clearly:** Add text labels or use screenshot annotation tools to highlight important parts

---

## **Quick Reference: File Locations**

| Screenshot Need | File Path | Lines |
|----------------|-----------|-------|
| OAuth token storage | `pages/api/oauth/google-callback.ts` | 92-106 |
| Token validation | `app/api/gmail-reply-native/route.ts` | 17-34 |
| Security rules | `firestore.rules` | 13-32 |
| Password reset flow | `app/reset-password/page.tsx` | 19-55, 47-50 |
| Email verification | `app/verify-email/page.tsx` | 23-28, 93-98 |
| Password length check | `app/reset-password/page.tsx` | 47-50 |
| Password length check | `app/signup/page.tsx` | 342-347 |
| Password reset request | `app/login/page.tsx` | 729-755 |

---

**Note:** Take screenshots at a resolution that makes text clearly readable. Use full-screen or windowed mode depending on what looks best. Consider using tools like Snagit, Lightshot, or built-in screenshot tools with annotation capabilities.

