# Email Response to TAC Security CASA Support Team

**Subject:** Evidence for SAQ Points 4, 15, and 20

---

Dear TAC Security CASA Support Team,

Greetings!

Thank you for your request for evidence regarding SAQ points 4, 15, and 20. Please find the detailed evidence and supporting documentation below.

---

## **SAQ Point 4: Data Classification and Protection Levels**

**Our Answer:** Yes - Data classified: Account info (low), planning data (med), OAuth tokens (sensitive).

**Evidence Provided:**

1. **Firestore Security Rules** (`firestore.rules`):
   - Shows tiered access control based on data sensitivity
   - Low protection: Account info (user profile data) - accessible only to authenticated users
   - Medium protection: Planning data (todo lists, contacts, messages) - isolated per user with authentication
   - Sensitive protection: OAuth tokens - stored with restricted access and server-side validation

2. **Code Implementation:**
   - OAuth token storage in `pages/api/oauth/google-callback.ts` showing secure storage
   - Security rules enforcing user-based access control
   - Server-side validation before token retrieval

**Screenshots/Documentation:**
- Firestore security rules configuration (screenshot attached)
- User document structure showing `googleTokens` field (with sensitive values redacted)
- Code snippets showing data classification implementation

---

## **SAQ Point 15: Automated Deployment and Backup/Restore**

**Our Answer:** Yes - Automated redeploy from runbook; provider backups allow timely restore.

**Evidence Provided:**

1. **Automated Deployment:**
   - **Platform:** Vercel (Next.js hosting)
   - **Process:** Git-based automated deployments
     - Push to `main` branch triggers automatic build and deployment
     - Build process: `npm run build`
     - Production deployment happens automatically after successful build
   - **Configuration:** `vercel.json` and `package.json` showing deployment scripts

2. **Backup/Restore Capabilities:**
   - **Firestore Backups:** Google Cloud Firestore provides automatic point-in-time recovery (PITR)
   - **Backup Frequency:** Continuous (Google Cloud native)
   - **Restore Capability:** Can restore to any point in time within retention period
   - **Version Control:** All configuration files (`firestore.rules`, `firestore.indexes.json`, `firebase.json`) are version-controlled in Git

3. **Deployment Runbook:**
   - Code changes committed to Git
   - Automatic build triggered by Vercel
   - Testing and validation during build process
   - Automatic deployment to production
   - Instant rollback capability via Vercel dashboard

**Screenshots/Documentation:**
- Vercel dashboard showing deployment history (screenshot attached)
- Git repository showing commit history and automated deployments
- Firestore console showing backup/restore options (screenshot attached)
- Configuration files (`firestore.rules`, `vercel.json`, `package.json`) showing version-controlled setup

---

## **SAQ Point 20: Secure Random Password/Activation Code Generation**

**Our Answer:** Yes - System generated initial passwords or activation codes are securely randomly generated, at least 6 characters long, contain letters and numbers, and expire after a short period of time. These initial secrets cannot become the long-term password.

**Evidence Provided:**

1. **Firebase Authentication Implementation:**
   - **Provider:** Firebase Authentication (Google Cloud)
   - **Code Generation:** Cryptographically secure random generation
   - **Code Format:** OOB (Out-of-Band) codes
   - **Code Length:** Variable (Firebase generated, typically 6+ characters)
   - **Character Set:** Alphanumeric (letters and numbers)
   - **Expiration:** 
     - Password reset codes: 1 hour (Firebase default)
     - Email verification codes: 3 days (Firebase default)
   - **Single Use:** Codes are invalidated after successful use

2. **Password Requirements:**
   - **Minimum Length:** 6 characters (enforced in code)
   - **Cannot Become Permanent:** Codes are one-time use only - user must set new password
   - **Code Expiration:** Codes expire automatically after short period

3. **Code Implementation:**
   - Password reset flow in `app/reset-password/page.tsx` showing code validation and password requirements
   - Email verification flow in `app/verify-email/page.tsx` showing code application
   - Password length enforcement in signup and reset flows

**Screenshots/Documentation:**
- Firebase Authentication console showing password reset configuration (screenshot attached)
- Code showing password reset flow with expiration handling (screenshot attached)
- Firebase Authentication email verification template settings (screenshot attached)
- Code enforcement of password minimum length requirements (6+ characters)

---

## **Attached Documentation:**

1. **Detailed Evidence Document** (`CASA_SAQ_EVIDENCE.md`):
   - Complete code references with line numbers
   - File paths and implementation details
   - Security measures and access controls

2. **Screenshots:**
   - Firestore security rules configuration
   - Vercel deployment history
   - Firebase Authentication console configuration
   - Code snippets showing implementation

3. **Configuration Files:**
   - `firestore.rules` - Security rules showing data classification
   - `vercel.json` - Deployment configuration
   - `package.json` - Build and deployment scripts
   - Relevant code files showing password/activation code implementation

---

## **Summary:**

- **Point 4:** ✅ Data classification implemented with tiered security levels (low, medium, sensitive)
- **Point 15:** ✅ Automated deployment via Vercel with Git integration; Firestore automatic backups enable timely restore
- **Point 20:** ✅ Secure random code generation via Firebase Authentication with expiration and single-use enforcement

All evidence is documented in the attached `CASA_SAQ_EVIDENCE.md` file with code references, file paths, and implementation details.

Should you require any additional information or clarification, please do not hesitate to reach out.

Best Regards,
[Your Name]
[Your Title]
[Company Name]

---

**Attachments:**
1. `CASA_SAQ_EVIDENCE.md` - Detailed evidence document
2. Screenshots (as listed above)
3. Configuration files (as listed above)

