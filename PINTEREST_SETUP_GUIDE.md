# Pinterest API Integration Setup Guide

## 🎯 Overview
This guide will help you set up Pinterest API integration to fetch real wedding inspiration images for your mood board feature.

## 🔑 Pinterest Developer Setup

### 1. Create Pinterest Developer Account
1. Go to [Pinterest Developers](https://developers.pinterest.com/)
2. Sign in with your Pinterest account
3. Click "Create App" to register a new application

### 2. Configure Your App
- **App Name**: "PAIGE Wedding App" (or your preferred name)
- **App Description**: "Wedding planning app with inspiration mood boards"
- **Platform**: Web
- **Redirect URI**: `https://yourdomain.com/api/auth/pinterest/callback`

### 3. Get API Credentials
After app creation, you'll receive:
- **App ID**: Your unique app identifier
- **App Secret**: Keep this secure and private

## 🔐 OAuth Flow Implementation

### 1. Environment Variables
Add these to your `.env.local` file:

```bash
# Pinterest API Configuration
PINTEREST_APP_ID=your_app_id_here
PINTEREST_APP_SECRET=your_app_secret_here
PINTEREST_REDIRECT_URI=https://yourdomain.com/api/auth/pinterest/callback

# For direct API access (alternative approach)
PINTEREST_ACCESS_TOKEN=your_access_token_here
```

### 2. Pinterest OAuth Endpoints
Create these API routes for user authentication:

#### `/api/auth/pinterest/initiate`
```typescript
// Initiates Pinterest OAuth flow
export async function GET() {
  const authUrl = `https://www.pinterest.com/oauth/?client_id=${process.env.PINTEREST_APP_ID}&redirect_uri=${process.env.PINTEREST_REDIRECT_URI}&scope=boards:read,pins:read&response_type=code`;
  
  return NextResponse.redirect(authUrl);
}
```

#### `/api/auth/pinterest/callback`
```typescript
// Handles Pinterest OAuth callback
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  
  if (!code) {
    return NextResponse.redirect('/inspiration?error=oauth_failed');
  }
  
  // Exchange code for access token
  const tokenResponse = await fetch('https://api.pinterest.com/v5/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: process.env.PINTEREST_APP_ID!,
      client_secret: process.env.PINTEREST_APP_SECRET!,
      code: code,
      redirect_uri: process.env.PINTEREST_REDIRECT_URI!
    })
  });
  
  const tokenData = await tokenResponse.json();
  
  // Store token securely (database, encrypted session, etc.)
  // Redirect back to inspiration page with success
  return NextResponse.redirect('/inspiration?pinterest_connected=true');
}
```

## 🚀 API Usage Examples

### Search Pins
```typescript
// Search for wedding inspiration
const response = await fetch('/api/pinterest/search', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    query: 'boho garden wedding',
    limit: 12
  })
});

const { pins } = await response.json();
```

### Get User Boards
```typescript
// Fetch user's Pinterest boards
const response = await fetch('/api/pinterest/boards', {
  headers: { 'Authorization': `Bearer ${userPinterestToken}` }
});

const { boards } = await response.json();
```

### Get Board Pins
```typescript
// Fetch pins from a specific board
const response = await fetch(`/api/pinterest/boards/${boardId}/pins`, {
  headers: { 'Authorization': `Bearer ${userPinterestToken}` }
});

const { pins } = await response.json();
```

## 💰 Cost Considerations

### Pinterest API Pricing (as of 2024)
- **Free Tier**: 1,000 API calls/month
- **Paid Tier**: $0.10 per 1,000 calls
- **Search API**: Included in free tier
- **User Content**: Additional costs may apply

### Cost Optimization Strategies
1. **Cache Results**: Store search results for 24 hours
2. **Limit Searches**: Implement rate limiting per user
3. **Smart Queries**: Use specific search terms to reduce API calls
4. **Batch Requests**: Combine multiple searches when possible

## 🔒 Security Best Practices

### 1. Token Storage
- **Never store tokens in localStorage** (vulnerable to XSS)
- **Use secure HTTP-only cookies** or server-side sessions
- **Implement token refresh** logic for expired tokens

### 2. Rate Limiting
- **User-based limits**: Max 10 searches per minute per user
- **App-wide limits**: Respect Pinterest's API rate limits
- **Caching**: Implement Redis or similar for result caching

### 3. Error Handling
- **Graceful degradation**: Fallback to mock data if API fails
- **User feedback**: Clear error messages for failed searches
- **Retry logic**: Automatic retry for temporary failures

## 🎨 UI/UX Enhancements

### 1. Connection Status
```typescript
// Show connection status in the mood board
{isPinterestConnected ? (
  <div className="text-green-600 text-sm">✓ Connected to Pinterest</div>
) : (
  <button onClick={connectPinterest}>Connect Pinterest</button>
)}
```

### 2. Search History
```typescript
// Store recent searches for quick access
const [searchHistory, setSearchHistory] = useState<string[]>([]);

const addToHistory = (query: string) => {
  setSearchHistory(prev => [query, ...prev.filter(q => q !== query)].slice(0, 5));
};
```

### 3. Smart Suggestions
```typescript
// Pre-populated search suggestions
const weddingSearchSuggestions = [
  'boho garden wedding',
  'modern minimalist ceremony',
  'vintage rustic wedding',
  'luxury glamour wedding',
  'beach destination wedding',
  'winter wonderland wedding'
];
```

## 🧪 Testing & Development

### 1. Development Mode
- Use fallback images when API not configured
- Mock Pinterest responses for testing
- Simulate API errors and edge cases

### 2. Production Testing
- Test with real Pinterest accounts
- Verify rate limiting behavior
- Monitor API usage and costs

### 3. Error Scenarios
- Network failures
- Invalid API responses
- Rate limit exceeded
- Token expiration

## 📱 Mobile Considerations

### 1. Responsive Design
- Ensure Pinterest modal works on mobile
- Optimize image grid for small screens
- Touch-friendly interaction elements

### 2. Performance
- Lazy load Pinterest images
- Implement virtual scrolling for large results
- Optimize image sizes for mobile

## 🔄 Future Enhancements

### 1. Advanced Features
- **Board Import**: Import entire Pinterest boards
- **Smart Categorization**: AI-powered image tagging
- **Collaboration**: Share mood boards with partners
- **Export**: Download mood board as PDF

### 2. Alternative APIs
- **Unsplash**: Free high-quality images
- **Pexels**: Free stock photos
- **Google Images**: Rich search results

## 🚨 Troubleshooting

### Common Issues
1. **OAuth Redirect Errors**: Check redirect URI configuration
2. **API Rate Limits**: Implement proper rate limiting
3. **Image Loading**: Verify image URLs and CORS settings
4. **Token Expiration**: Implement automatic token refresh

### Debug Tools
- Pinterest Developer Console
- Network tab in browser dev tools
- API response logging
- Error monitoring services

## 📚 Additional Resources

- [Pinterest Developer Documentation](https://developers.pinterest.com/docs/)
- [Pinterest API Reference](https://developers.pinterest.com/docs/api/v5/)
- [OAuth 2.0 Guide](https://oauth.net/2/)
- [Next.js API Routes](https://nextjs.org/docs/api-routes/introduction)

---

**Note**: This setup provides a solid foundation for Pinterest integration. Start with the basic search functionality and gradually add more features like board management and user authentication.
