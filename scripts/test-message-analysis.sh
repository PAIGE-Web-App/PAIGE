#!/bin/bash

# Message Analysis Quick Test Script
# This script provides a simple way to verify the message analysis system

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║     PAIGE Message Analysis Quick Test                        ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if server is running
echo -e "${BLUE}🔍 Checking if server is running...${NC}"
if curl -s http://localhost:3000 > /dev/null; then
    echo -e "${GREEN}✓ Server is running${NC}"
else
    echo -e "${RED}✗ Server is not running${NC}"
    echo -e "${YELLOW}Please run: npm run dev${NC}"
    exit 1
fi

# Check environment variables
echo -e "\n${BLUE}🔍 Checking environment configuration...${NC}"

if [ -f .env.local ]; then
    if grep -q "OPENAI_API_KEY=" .env.local; then
        echo -e "${GREEN}✓ OpenAI API key configured${NC}"
    else
        echo -e "${YELLOW}⚠ Warning: OPENAI_API_KEY not found in .env.local${NC}"
    fi
    
    if grep -q "RAG_N8N_WEBHOOK_URL=" .env.local; then
        echo -e "${GREEN}✓ RAG webhook URL configured${NC}"
    else
        echo -e "${YELLOW}⚠ Warning: RAG_N8N_WEBHOOK_URL not found (RAG features disabled)${NC}"
    fi
else
    echo -e "${YELLOW}⚠ Warning: .env.local file not found${NC}"
fi

# Test API endpoint
echo -e "\n${BLUE}🔍 Testing API endpoint...${NC}"
response=$(curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:3000/api/analyze-message \
  -H "Content-Type: application/json" \
  -d '{"messageContent":"test"}')

if [ "$response" -eq 400 ] || [ "$response" -eq 200 ]; then
    echo -e "${GREEN}✓ API endpoint is accessible (HTTP $response)${NC}"
else
    echo -e "${RED}✗ API endpoint error (HTTP $response)${NC}"
fi

# Run automated tests if node is available
echo -e "\n${BLUE}📋 Running automated tests...${NC}"
if command -v node &> /dev/null; then
    if [ -f tests/message-analysis-integration-test.js ]; then
        node tests/message-analysis-integration-test.js
    else
        echo -e "${YELLOW}⚠ Test file not found: tests/message-analysis-integration-test.js${NC}"
    fi
else
    echo -e "${YELLOW}⚠ Node.js not found, skipping automated tests${NC}"
fi

echo ""
echo -e "${BLUE}📖 For detailed testing instructions, see:${NC}"
echo -e "   MESSAGE_ANALYSIS_TESTING_GUIDE.md"
echo ""

