# Cron Jobs Setup Guide

## Overview
This system uses cron jobs to automatically send scheduled emails to users. Currently implemented:

- **Weekly Todo Digest**: Every Sunday at 9 AM, sends upcoming todo items to all users

## Environment Variables
Add to your `.env.local` and Vercel environment:

```bash
CRON_SECRET=your-secret-key-here
```

## Setting Up Cron Jobs

### Option 1: Vercel Cron (Recommended)
Vercel supports cron jobs natively. Add to your `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron?job=weekly-todo-digest",
      "schedule": "0 9 * * 0"
    }
  ]
}
```

### Option 2: External Cron Service
Use services like:
- **Cron-job.org** (free)
- **EasyCron** (paid)
- **UptimeRobot** (free tier)

**Weekly Todo Digest Setup:**
- URL: `https://weddingpaige.com/api/cron?job=weekly-todo-digest`
- Schedule: Every Sunday at 9:00 AM
- Headers: `Authorization: Bearer your-secret-key-here`

### Option 3: GitHub Actions (Free)
Create `.github/workflows/cron.yml`:

```yaml
name: Weekly Todo Digest
on:
  schedule:
    - cron: '0 9 * * 0'  # Every Sunday at 9 AM UTC
  workflow_dispatch:  # Allow manual trigger

jobs:
  send-digest:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Weekly Digest
        run: |
          curl -X GET "https://weddingpaige.com/api/cron?job=weekly-todo-digest" \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}"
```

## Testing Cron Jobs

### Manual Testing
```bash
# Test weekly digest
curl -X GET "http://localhost:3000/api/cron?job=weekly-todo-digest" \
  -H "Authorization: Bearer your-secret-key-here"
```

### Production Testing
```bash
# Test on production
curl -X GET "https://weddingpaige.com/api/cron?job=weekly-todo-digest" \
  -H "Authorization: Bearer your-secret-key-here"
```

## Available Cron Jobs

| Job | Schedule | Description |
|-----|----------|-------------|
| `weekly-todo-digest` | Sunday 9 AM | Sends upcoming todo items |
| `daily-credit-check` | Daily 8 AM | Checks for low credits (future) |
| `wedding-reminders` | Daily 10 AM | Wedding milestone reminders (future) |

## Security
- All cron endpoints require `CRON_SECRET` authentication
- Rate limiting prevents abuse
- Logs all activities for monitoring

## Monitoring
Check Vercel function logs or your cron service dashboard to monitor:
- Success/failure rates
- Email delivery status
- User engagement

## Future Enhancements
- Daily credit alerts
- Wedding milestone reminders
- Budget payment overdue alerts
- Venue selection prompts
- Vendor team building reminders
