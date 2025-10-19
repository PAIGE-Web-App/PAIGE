# Session Timeout Configuration Guide

## Environment Variables

Add these to your `.env.local` file:

```env
# Authentication & Session Management
# Session timeout in minutes (default: 30 minutes)
NEXT_PUBLIC_IDLE_TIMEOUT_MINUTES=30

# Warning time before logout in minutes (default: 5 minutes)  
NEXT_PUBLIC_IDLE_WARNING_MINUTES=5

# Session duration in hours (default: 8 hours)
SESSION_DURATION_HOURS=8

# Token refresh interval in minutes (default: 10 minutes)
TOKEN_REFRESH_INTERVAL_MINUTES=10
```

## Configuration Values

### Recommended Settings

**Development:**
- Idle Timeout: 30 minutes
- Warning Time: 5 minutes
- Session Duration: 8 hours
- Token Refresh: 10 minutes

**Production:**
- Idle Timeout: 30 minutes
- Warning Time: 5 minutes  
- Session Duration: 8 hours
- Token Refresh: 10 minutes

### Enterprise Settings (High Security)

**Banking/Financial:**
- Idle Timeout: 15 minutes
- Warning Time: 2 minutes
- Session Duration: 4 hours
- Token Refresh: 5 minutes

**Healthcare:**
- Idle Timeout: 20 minutes
- Warning Time: 3 minutes
- Session Duration: 6 hours
- Token Refresh: 8 minutes

## Implementation

The session timeout system has been enhanced with enterprise-grade features:

### ✅ **Implemented Changes:**

1. **Session Duration Reduction**: From 5 days to 8 hours (configurable)
2. **Idle Timeout**: 30 minutes with 5-minute warning (configurable)
3. **Token Refresh**: Every 10 minutes (configurable)
4. **Enhanced Logging**: Comprehensive session monitoring
5. **Session Validation**: Improved middleware validation
6. **Environment Configuration**: All timeouts configurable via environment variables

### 🔧 **Files Modified:**

- `app/api/sessionLogin/route.ts` - Session duration configuration
- `components/IdleTimeoutManager.tsx` - Idle timeout defaults
- `hooks/useIdleTimeout.ts` - Idle timeout logic and logging
- `contexts/AuthContext.tsx` - Token refresh interval
- `middleware.ts` - Enhanced session validation
- `utils/authUtils.ts` - Improved token refresh logging

### 🚀 **Zero Breaking Changes:**

- All existing login/signup flows remain unchanged
- All existing logout mechanisms preserved
- Backward compatible with existing sessions
- No additional Firestore operations required

## Testing

To test the session timeout:

1. Set `NEXT_PUBLIC_IDLE_TIMEOUT_MINUTES=1` for quick testing
2. Login to your app
3. Wait for 1 minute without activity
4. You should see a warning modal
5. Wait for the timeout to complete
6. You should be automatically logged out

## Monitoring

The system includes comprehensive logging for session events:
- Session creation
- Token refresh
- Idle timeout warnings
- Automatic logout
- Session validation failures
