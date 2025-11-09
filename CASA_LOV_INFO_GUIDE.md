# How to Find Information for CASA LOV Submission

## Quick Reference Guide

---

## **Information You Need to Fill In:**

### **1. Tier**
**What to fill:** This is typically your subscription tier or service level with Google/Firebase
- Options might include: "Standard", "Enterprise", "Blaze", "Spark", etc.
- Check your Firebase Console → Project Settings → Usage and Billing
- Or check your Google Cloud Console → Billing → Account information

**Common values:**
- If using Firebase free tier: "Spark" or "Standard"
- If using Firebase paid tier: "Blaze" or "Enterprise"
- If you're unsure, check your Firebase/Google Cloud billing settings

---

### **2. GCP Project Number**

**How to find it:**

**Method 1 - Firebase Console:**
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Click on the gear icon ⚙️ (Settings) → **Project Settings**
4. In the **General** tab, scroll down to **Your project**
5. You'll see:
   - **Project ID:** (e.g., `paige-ai-db`)
   - **Project Number:** (e.g., `123456789012`) ← **This is what you need**

**Method 2 - Google Cloud Console:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project from the dropdown at the top
3. Click on the project name or go to **IAM & Admin** → **Settings**
4. The **Project Number** will be displayed

**Method 3 - From Code:**
- Check your `firebase.json` or environment variables
- Look for `GOOGLE_CLOUD_PROJECT` or similar

---

### **3. Company Name**

**What to fill:**
- Your registered company name (if you have one)
- Or the business name you use for the application
- Examples: "Paige", "Paige AI", "Paige Technologies", etc.

**If unsure:**
- Check your business registration documents
- Check your domain registration (whois information)
- Check your Firebase/Google Cloud billing account name

---

### **4. Google Program Name**

**What to fill:** 
- **CASA** (Customer Application Security Assessment)
- This is the Google program you're going through for security assessment

---

## **Information Already Filled In:**

Based on your codebase:

✅ **Home Page:** https://weddingpaige.com  
✅ **Application Name:** Paige (or PAIGE App)  
✅ **Application URL:** https://weddingpaige.com  
✅ **Application type:** Web  
✅ **Google Program Name:** CASA

---

## **Screenshot of Google CASA Email**

**What to attach:**
- Take a screenshot of the email you received from Google about the CASA assessment
- Make sure it shows:
  - Sender (Google/Firebase)
  - Subject line
  - Date received
  - Key content about the CASA assessment
  - Any reference numbers or case IDs

**Tips:**
- Include the full email (from header to signature)
- Make sure the email content is clearly visible
- Redact any sensitive personal information if needed (but keep the CASA-related content)

---

## **Quick Checklist Before Sending:**

- [ ] Tier filled in
- [ ] GCP Project Number found and filled in
- [ ] Company Name filled in
- [ ] Screenshot of Google CASA email attached
- [ ] All other fields verified (already filled in)
- [ ] Your contact information added to email signature

---

## **Example Email Response:**

Once you have all the information, copy the template from `CASA_LOV_SUBMISSION_RESPONSE.md` and fill in:

```
Tier: [Your tier - e.g., "Blaze" or "Standard"]
GCP Project Number: [Your project number - e.g., "123456789012"]
Company Name: [Your company name - e.g., "Paige" or "Paige AI"]
```

Then attach the screenshot and send!

---

**Need Help?**

If you're having trouble finding any of this information:
1. **GCP Project Number:** Check Firebase Console → Project Settings → General tab
2. **Tier:** Check Firebase Console → Project Settings → Usage and Billing
3. **Company Name:** Use your registered business name or the name you use for the application

