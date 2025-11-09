# Email Response to TAC Security CASA Support Team

**Subject:** Evidence Documentation for SAQ Points 4, 15, and 20 - Attached

---

Dear TAC Security CASA Support Team,

Greetings!

Thank you for your request for evidence regarding SAQ points 4, 15, and 20. We have prepared comprehensive documentation and screenshots as requested. Please find all evidence attached below.

---

## **Attached Documentation**

### **1. Evidence Document** (`CASA_SAQ_EVIDENCE.md`)
This document contains detailed evidence for all three SAQ points, including:
- Complete code references with file paths and line numbers
- Implementation details and security measures
- Code snippets showing actual implementation
- Security configurations and access controls

### **2. Screenshots and Evidence**

#### **SAQ Point 4: Data Classification and Protection Levels**
**Attached Screenshots:**
- OAuth token storage code (`pages/api/oauth/google-callback.ts`) showing secure token storage in Firestore
- Firestore security rules (`firestore.rules`) demonstrating tiered access control:
  - **Low Protection:** Account info (user profile data) - basic authentication required
  - **Medium Protection:** Planning data (todo lists, contacts, messages) - user isolation enforced
  - **Sensitive Protection:** OAuth tokens - restricted access with server-side validation
- Firestore Console screenshot showing deployed security rules
- Server-side token validation code showing authentication checks before token retrieval

**Summary:** Our implementation classifies data into three protection levels (low, medium, sensitive) with appropriate access controls enforced through Firestore security rules and server-side validation.

---

#### **SAQ Point 15: Automated Deployment and Backup/Restore**
**Attached Screenshots:**
- Vercel dashboard showing automated deployment history
- Git repository showing version-controlled configuration files:
  - `firestore.rules` - Security rules
  - `vercel.json` - Deployment configuration
  - `package.json` - Build scripts
  - `firebase.json` - Firebase configuration
- Git commit history demonstrating automated deployments triggered by code changes
- Firestore Console showing automatic backup configuration (Google Cloud Point-in-Time Recovery)
- Configuration files in code editor showing version control

**Deployment Process:**
1. Code changes committed to Git repository
2. Automatic build triggered by Vercel upon push to `main` branch
3. Build validation and testing during compilation
4. Automatic deployment to production upon successful build
5. Instant rollback capability available via Vercel dashboard

**Backup/Restore Capabilities:**
- **Firestore Backups:** Google Cloud Firestore provides automatic point-in-time recovery (PITR)
- **Backup Frequency:** Continuous (Google Cloud native service)
- **Retention:** Configurable retention policies
- **Restore Capability:** Can restore to any point in time within retention period via Google Cloud Console

**Summary:** Our application uses automated deployment via Vercel with Git integration, and Firestore provides automatic backups enabling timely restore capabilities. All configuration files are version-controlled in Git.

---

#### **SAQ Point 20: Secure Random Password/Activation Code Generation**
**Attached Screenshots:**
- Firebase Authentication Console showing password reset template configuration
- Code showing password reset flow (`app/reset-password/page.tsx`) with:
  - Secure code extraction from URL parameters
  - Code validation and expiration handling
  - Error handling for expired/invalid codes
- Code showing email verification flow (`app/verify-email/page.tsx`) with:
  - `applyActionCode` function demonstrating single-use code application
  - Expiration error handling
- Password length enforcement code showing minimum 6-character requirement:
  - Password reset validation (`app/reset-password/page.tsx` lines 47-50)
  - Signup validation (`app/signup/page.tsx` lines 342-347)
- Firebase Authentication error messages showing code expiration handling

**Code Generation Details:**
- **Provider:** Firebase Authentication (Google Cloud)
- **Generation Method:** Cryptographically secure random generation
- **Code Format:** OOB (Out-of-Band) codes
- **Code Length:** Variable (Firebase generated, typically 6+ characters)
- **Character Set:** Alphanumeric (letters and numbers)
- **Expiration:** 
  - Password reset codes: 1 hour (Firebase default)
  - Email verification codes: 3 days (Firebase default)
- **Single Use:** Codes are invalidated after successful use
- **Cannot Become Permanent:** Codes are one-time use only - users must set new password after code validation

**Password Requirements:**
- **Minimum Length:** 6 characters (enforced in code and Firebase)
- **Enforcement:** Validated in both signup and password reset flows
- **Error Handling:** Clear error messages for weak passwords

**Summary:** Our application uses Firebase Authentication for secure random code generation. Codes are cryptographically secure, expire after short periods (1 hour for password reset, 3 days for email verification), are single-use only, and cannot become permanent passwords. Password minimum length (6+ characters) is enforced in both signup and password reset flows.

---

## **Additional Information**

### **Technical Implementation Details**

**Data Classification (Point 4):**
- All data access is controlled through Firestore security rules
- Server-side API endpoints validate user authentication before accessing sensitive data
- OAuth tokens are stored with restricted access and never exposed to client-side code
- Planning data is isolated per user using Firebase Authentication UID matching

**Deployment Automation (Point 15):**
- Deployment platform: Vercel (Next.js hosting)
- Build process: Automated via `npm run build`
- Configuration management: All critical configuration files are version-controlled in Git
- Backup provider: Google Cloud Firestore with automatic point-in-time recovery
- Rollback capability: Available instantly via Vercel dashboard

**Password/Code Security (Point 20):**
- Password reset codes: Generated by Firebase Authentication, expire after 1 hour
- Email verification codes: Generated by Firebase Authentication, expire after 3 days
- Code generation: Cryptographically secure random generation (Firebase/Google Cloud)
- Single-use enforcement: Codes are invalidated immediately after successful use
- Password requirements: Minimum 6 characters, enforced client-side and server-side

---

## **Documentation Structure**

All evidence is organized as follows:

1. **CASA_SAQ_EVIDENCE.md** - Complete evidence document with:
   - Code references with file paths and line numbers
   - Security rule implementations
   - Configuration file contents
   - Implementation details

2. **Screenshots** - Organized by SAQ point:
   - Point 4: Data classification evidence
   - Point 15: Deployment and backup evidence
   - Point 20: Password/code security evidence

3. **Code References** - All code snippets include:
   - File paths
   - Line numbers
   - Context showing implementation

---

## **Verification**

All screenshots and code references have been verified against our production codebase. The implementations shown are:
- Currently deployed in production
- Active and functioning as documented
- Compliant with the security requirements specified in the SAQ

---

## **Next Steps**

If you require any additional information, clarification, or further evidence for any of the SAQ points, please do not hesitate to reach out. We are committed to providing complete transparency and ensuring all security requirements are met.

We are available to:
- Provide additional screenshots or code samples if needed
- Answer any questions about the implementation
- Provide live demonstrations if required
- Submit any additional documentation you may need

---

Thank you for your thorough review process. We appreciate the opportunity to demonstrate our security implementations and are committed to maintaining the highest security standards.

Best Regards,

[Your Name]  
[Your Title]  
[Company Name]  
[Email Address]  
[Phone Number]

---

**Attachments:**
1. `CASA_SAQ_EVIDENCE.md` - Detailed evidence document
2. Screenshots for SAQ Point 4 (Data Classification)
3. Screenshots for SAQ Point 15 (Deployment & Backups)
4. Screenshots for SAQ Point 20 (Password/Code Security)

---

**P.S.** Should you need any clarification on any of the attached evidence or require additional documentation, please feel free to contact us at your convenience.

