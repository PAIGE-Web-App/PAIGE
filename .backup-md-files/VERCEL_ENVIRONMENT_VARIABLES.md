# Vercel Environment Variables Setup

## Required Environment Variables

Add these to your Vercel project settings:

### **Authentication & Session Management**

```env
# Session timeout in minutes (default: 30 minutes)
NEXT_PUBLIC_IDLE_TIMEOUT_MINUTES=30

# Warning time before logout in minutes (default: 5 minutes)
NEXT_PUBLIC_IDLE_WARNING_MINUTES=5

# Session duration in hours (default: 8 hours)
SESSION_DURATION_HOURS=8

# Token refresh interval in minutes (default: 10 minutes)
TOKEN_REFRESH_INTERVAL_MINUTES=10
```

## How to Add to Vercel

### **Method 1: Vercel Dashboard**

1. Go to your Vercel project dashboard
2. Click on **Settings** tab
3. Click on **Environment Variables** in the left sidebar
4. Add each variable:
   - **Name**: `NEXT_PUBLIC_IDLE_TIMEOUT_MINUTES`
   - **Value**: `30`
   - **Environment**: Production, Preview, Development
5. Repeat for all 4 variables
6. Click **Save**

### **Method 2: Vercel CLI**

```bash
# Install Vercel CLI if you haven't already
npm i -g vercel

# Add environment variables
vercel env add NEXT_PUBLIC_IDLE_TIMEOUT_MINUTES
# Enter value: 30
# Select environments: Production, Preview, Development

vercel env add NEXT_PUBLIC_IDLE_WARNING_MINUTES
# Enter value: 5
# Select environments: Production, Preview, Development

vercel env add SESSION_DURATION_HOURS
# Enter value: 8
# Select environments: Production, Preview, Development

vercel env add TOKEN_REFRESH_INTERVAL_MINUTES
# Enter value: 10
# Select environments: Production, Preview, Development
```

## Recommended Production Values

### **Standard Production (Recommended)**
```env
NEXT_PUBLIC_IDLE_TIMEOUT_MINUTES=30
NEXT_PUBLIC_IDLE_WARNING_MINUTES=5
SESSION_DURATION_HOURS=8
TOKEN_REFRESH_INTERVAL_MINUTES=10
```

### **High Security Production**
```env
NEXT_PUBLIC_IDLE_TIMEOUT_MINUTES=15
NEXT_PUBLIC_IDLE_WARNING_MINUTES=2
SESSION_DURATION_HOURS=4
TOKEN_REFRESH_INTERVAL_MINUTES=5
```

### **Development/Testing**
```env
NEXT_PUBLIC_IDLE_TIMEOUT_MINUTES=1
NEXT_PUBLIC_IDLE_WARNING_MINUTES=0.5
SESSION_DURATION_HOURS=2
TOKEN_REFRESH_INTERVAL_MINUTES=2
```

## Important Notes

### **Environment Selection**
- **Production**: Your live app
- **Preview**: Pull request previews
- **Development**: Local development (optional, since you have .env.local)

### **NEXT_PUBLIC_ Prefix**
- Variables with `NEXT_PUBLIC_` are exposed to the browser
- Variables without this prefix are server-side only
- `SESSION_DURATION_HOURS` and `TOKEN_REFRESH_INTERVAL_MINUTES` are server-side only

### **Deployment**
- After adding environment variables, redeploy your app
- Changes take effect immediately on the next deployment
- No code changes needed - the app will automatically use these values

## Verification

After deployment, you can verify the settings are working:

1. **Check Console Logs**: Look for session creation logs with your configured duration
2. **Test Idle Timeout**: Set a low value (1 minute) for testing
3. **Monitor Token Refresh**: Check browser network tab for token refresh calls

## Rollback Plan

If you need to rollback:
1. Remove the environment variables from Vercel
2. Redeploy - the app will use the hardcoded defaults
3. Or change the values to previous settings

## Security Considerations

- **Session Duration**: 8 hours is enterprise-standard
- **Idle Timeout**: 30 minutes balances security and UX
- **Token Refresh**: 10 minutes ensures fresh tokens
- **Warning Time**: 5 minutes gives users time to stay logged in
