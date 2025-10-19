# N8N Setup Guide for PAIGE RAG System

## Option 1: N8N Cloud (Recommended)

### Step 1: Create N8N Cloud Account
1. Go to [n8n.cloud](https://n8n.cloud)
2. Click "Start Free" or "Sign Up"
3. Choose the "Starter" plan (free tier available)
4. Complete the signup process

### Step 2: Access Your N8N Instance
1. After signup, you'll get a URL like: `https://your-instance.n8n.cloud`
2. Bookmark this URL for easy access
3. Note down your instance URL for configuration

### Step 3: Get Webhook URLs
1. In your N8N instance, go to "Workflows"
2. Create a new workflow
3. Add a "Webhook" node
4. Copy the webhook URL (we'll use this later)

## Option 2: Self-hosted N8N (Advanced)

### Prerequisites
- Docker installed on your server
- Domain name (optional but recommended)
- SSL certificate (for production)

### Installation
```bash
# Create N8N directory
mkdir n8n
cd n8n

# Create docker-compose.yml
cat > docker-compose.yml << EOF
version: '3.8'
services:
  n8n:
    image: n8nio/n8n
    restart: always
    ports:
      - "5678:5678"
    environment:
      - N8N_BASIC_AUTH_ACTIVE=true
      - N8N_BASIC_AUTH_USER=admin
      - N8N_BASIC_AUTH_PASSWORD=your-secure-password
      - N8N_HOST=your-domain.com
      - N8N_PORT=5678
      - N8N_PROTOCOL=https
      - WEBHOOK_URL=https://your-domain.com
    volumes:
      - n8n_data:/home/node/.n8n
volumes:
  n8n_data:
EOF

# Start N8N
docker-compose up -d
```

## Configuration for PAIGE

### Environment Variables to Set
After setting up N8N, you'll need to add these to your `.env.local`:

```bash
# N8N Configuration
RAG_N8N_WEBHOOK_URL=https://your-instance.n8n.cloud/webhook/paige-rag
RAG_N8N_API_KEY=your-api-key-here
```

### Webhook Endpoints We'll Create
1. **Document Processing Webhook**: `/webhook/paige-rag/process-document`
2. **Query Processing Webhook**: `/webhook/paige-rag/process-query`
3. **Health Check Webhook**: `/webhook/paige-rag/health-check`

## Next Steps
1. Complete N8N setup
2. Get your webhook URLs
3. Update your `.env.local` file
4. Test the connection

## Security Considerations
- Use HTTPS for all webhook URLs
- Set up authentication for webhooks
- Use environment variables for sensitive data
- Regularly update N8N instance
- Monitor webhook usage and costs

## Troubleshooting
- Check N8N logs if webhooks aren't working
- Verify webhook URLs are correct
- Ensure firewall allows incoming webhook requests
- Test webhook endpoints manually first
