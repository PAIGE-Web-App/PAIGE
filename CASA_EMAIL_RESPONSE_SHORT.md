# Email Response to TAC Security CASA Support Team (Concise Version)

**Subject:** Evidence Documentation for SAQ Points 4, 15, and 20 - Attached

---

Dear TAC Security CASA Support Team,

Greetings!

Thank you for your request for evidence regarding SAQ points 4, 15, and 20. We have prepared comprehensive documentation and screenshots, all of which are attached to this email.

---

## **Attached Documentation**

### **1. Evidence Document** (`CASA_SAQ_EVIDENCE.md`)
Complete evidence document with code references, file paths, line numbers, and implementation details for all three SAQ points.

### **2. Screenshots**

#### **SAQ Point 4: Data Classification**
- OAuth token storage code (`pages/api/oauth/google-callback.ts`)
- Firestore security rules (`firestore.rules`) showing tiered access control
- Firestore Console screenshot showing deployed security rules
- Server-side token validation code

**Summary:** Data classified into three protection levels (low, medium, sensitive) with appropriate access controls enforced through Firestore security rules and server-side validation.

#### **SAQ Point 15: Automated Deployment & Backups**
- Vercel dashboard showing automated deployment history
- Git repository showing version-controlled configuration files
- Git commit history demonstrating automated deployments
- Firestore Console showing automatic backup configuration

**Summary:** Automated deployment via Vercel with Git integration. Firestore provides automatic point-in-time recovery backups. All configuration files are version-controlled in Git.

#### **SAQ Point 20: Secure Password/Code Generation**
- Firebase Authentication Console showing password reset configuration
- Code showing password reset flow with expiration handling
- Code showing email verification flow with single-use enforcement
- Code showing password length enforcement (6+ characters minimum)

**Summary:** Firebase Authentication generates cryptographically secure random codes that expire after short periods (1 hour for password reset, 3 days for email verification). Codes are single-use only and cannot become permanent passwords. Password minimum length (6+ characters) is enforced in all flows.

---

## **Technical Summary**

- **Point 4:** Data classification implemented with tiered security (low, medium, sensitive) and appropriate access controls
- **Point 15:** Automated deployments via Vercel with Git integration; Firestore automatic backups enable timely restore
- **Point 20:** Secure random code generation via Firebase Authentication with expiration and single-use enforcement; password minimum length (6+ characters) enforced

---

If you require any additional information or clarification, please do not hesitate to reach out. We are committed to providing complete transparency and ensuring all security requirements are met.

Thank you for your thorough review process.

Best Regards,

[Your Name]  
[Your Title]  
[Company Name]  
[Email]  
[Phone]

---

**Attachments:**
1. `CASA_SAQ_EVIDENCE.md` - Detailed evidence document
2. Screenshots for SAQ Point 4 (Data Classification)
3. Screenshots for SAQ Point 15 (Deployment & Backups)
4. Screenshots for SAQ Point 20 (Password/Code Security)

