# Simple Credit Refresh System Setup Guide

## 🎯 **Problem Solved**
Your complex scheduled task system was failing because it was **completely disabled** (commented out in `lib/initScheduledTasks.ts`). This new simple system provides a reliable alternative.

## 🚀 **New System Architecture**

### **What We Built:**
1. **`lib/simpleCreditRefresh.ts`** - Core logic for refreshing credits
2. **`app/api/cron/credit-refresh/route.ts`** - HTTP endpoint for external cron services
3. **`app/api/test/simple-credit-refresh/route.ts`** - Test endpoint

### **How It Works:**
1. External cron service calls your API endpoint daily at midnight
2. API processes all users in batches of 50
3. Refreshes credits for users who need it (crossed midnight since last refresh)
4. Returns detailed metrics and error reporting

## 🧪 **Testing the System**

### **Step 1: Test Locally**
```bash
# Test the health check
curl http://localhost:3000/api/test/simple-credit-refresh

# Test the full credit refresh
curl -X POST http://localhost:3000/api/test/simple-credit-refresh
```

### **Step 2: Test in Production**
```bash
# Replace with your actual domain
curl -X POST https://your-domain.com/api/test/simple-credit-refresh \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

## 🌐 **Setting Up External Cron Services**

### **Option 1: cron-job.org (Recommended)**

1. **Sign up** at [cron-job.org](https://cron-job.org) (free)
2. **Create new cron job:**
   - **URL**: `https://your-domain.com/api/cron/credit-refresh`
   - **Method**: `POST`
   - **Schedule**: `0 0 * * *` (daily at midnight)
   - **Headers**: `Authorization: Bearer YOUR_CRON_SECRET`
   - **Content-Type**: `application/json`

3. **Set environment variable:**
   ```bash
   CRON_SECRET=your-super-secret-token-here
   ```

### **Option 2: GitHub Actions (Free)**

Create `.github/workflows/credit-refresh.yml`:
```yaml
name: Daily Credit Refresh
on:
  schedule:
    - cron: '0 0 * * *'  # Daily at midnight UTC
jobs:
  refresh-credits:
    runs-on: ubuntu-latest
    steps:
      - name: Refresh Credits
        run: |
          curl -X POST https://your-domain.com/api/cron/credit-refresh \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}" \
            -H "Content-Type: application/json"
```

### **Option 3: Vercel Cron (If Available)**

Add to `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cron/credit-refresh",
      "schedule": "0 0 * * *"
    }
  ]
}
```

## 🔧 **Environment Variables**

Add to your `.env.local`:
```bash
# For external cron services
CRON_SECRET=your-super-secret-token-here

# Or reuse existing
SCHEDULED_TASK_SECRET=your-existing-secret
```

## 📊 **Monitoring & Debugging**

### **Health Check Endpoint:**
```bash
curl https://your-domain.com/api/cron/credit-refresh
```

### **Test Endpoint:**
```bash
curl -X POST https://your-domain.com/api/test/simple-credit-refresh
```

### **Expected Response:**
```json
{
  "success": true,
  "processed": 150,
  "errors": [],
  "metrics": {
    "totalUsers": 150,
    "refreshed": 23,
    "skipped": 127,
    "failed": 0,
    "duration": 15420
  }
}
```

## 🛡️ **Security Features**

1. **Authentication**: Requires `Authorization: Bearer` header
2. **Rate Limiting**: Built-in batch processing (50 users at a time)
3. **Error Handling**: Comprehensive error tracking and reporting
4. **Health Checks**: System health monitoring

## 🔄 **Migration from Old System**

### **Disable Old System:**
The old system is already disabled (commented out), so no action needed.

### **Enable New System:**
1. Deploy the new API endpoints
2. Set up external cron service
3. Test thoroughly
4. Monitor for 24-48 hours

## 📈 **Benefits of New System**

### **✅ Advantages:**
- **Reliable**: External services have 99.9% uptime
- **Simple**: Just HTTP calls, no complex scheduling
- **Scalable**: Handles any number of users
- **Debuggable**: Clear error messages and metrics
- **Free**: No additional costs for small apps

### **🆚 vs Old System:**
- **Old**: Complex, failed due to permissions, hard to debug
- **New**: Simple, reliable, easy to monitor and fix

## 🚨 **Troubleshooting**

### **Common Issues:**

1. **401 Unauthorized**
   - Check `CRON_SECRET` environment variable
   - Verify authorization header format

2. **500 Internal Server Error**
   - Check Firebase permissions
   - Review server logs

3. **No Credits Refreshed**
   - Users may already be refreshed
   - Check `lastCreditRefresh` timestamps

### **Debug Commands:**
```bash
# Check health
curl https://your-domain.com/api/cron/credit-refresh

# Run manual test
curl -X POST https://your-domain.com/api/test/simple-credit-refresh

# Check specific user credits
curl https://your-domain.com/api/admin/users/USER_ID/credits
```

## 🎉 **Next Steps**

1. **Test locally** with the test endpoint
2. **Deploy** the new API endpoints
3. **Set up** external cron service (cron-job.org recommended)
4. **Monitor** for 24-48 hours
5. **Verify** credits are refreshing daily

This system is **much more reliable** than your previous complex setup and follows industry best practices for scheduled tasks.
