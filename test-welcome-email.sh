#!/bin/bash

# Welcome Email Test Script
# Tests different user scenarios for dynamic email content

echo "🎉 Testing Dynamic Welcome Email System"
echo "========================================="
echo ""

# Get email from user
read -p "Enter your email to receive test emails: " USER_EMAIL

if [ -z "$USER_EMAIL" ]; then
  echo "❌ Email is required"
  exit 1
fi

echo ""
echo "📧 Sending test emails to: $USER_EMAIL"
echo ""

# Test Scenario 1: Complete Setup
echo "1️⃣  Testing: Complete Setup (Date + Location + Venue + Partner)"
curl -X POST http://localhost:3000/api/test-welcome-scenarios \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$USER_EMAIL\",\"scenario\":\"complete\"}" \
  -s | jq -r '.message'
echo ""
sleep 2

# Test Scenario 2: Partial Setup
echo "2️⃣  Testing: Partial Setup (Date + Location, No Venue)"
curl -X POST http://localhost:3000/api/test-welcome-scenarios \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$USER_EMAIL\",\"scenario\":\"partial\"}" \
  -s | jq -r '.message'
echo ""
sleep 2

# Test Scenario 3: Date Only
echo "3️⃣  Testing: Date Only (No Location, No Venue)"
curl -X POST http://localhost:3000/api/test-welcome-scenarios \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$USER_EMAIL\",\"scenario\":\"date-only\"}" \
  -s | jq -r '.message'
echo ""
sleep 2

# Test Scenario 4: Minimal Setup
echo "4️⃣  Testing: Minimal Setup (No Date, No Location, No Venue)"
curl -X POST http://localhost:3000/api/test-welcome-scenarios \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$USER_EMAIL\",\"scenario\":\"minimal\"}" \
  -s | jq -r '.message'
echo ""
sleep 2

# Test Scenario 5: No Partner Name
echo "5️⃣  Testing: Complete Setup (No Partner Name)"
curl -X POST http://localhost:3000/api/test-welcome-scenarios \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$USER_EMAIL\",\"scenario\":\"no-partner\"}" \
  -s | jq -r '.message'
echo ""

echo "========================================="
echo "✅ All test emails sent!"
echo "📬 Check your inbox at: $USER_EMAIL"
echo ""
echo "You should receive 5 emails showing different scenarios:"
echo "  1. Complete Setup (all data provided)"
echo "  2. Partial Setup (date + location only)"
echo "  3. Date Only (wedding date set)"
echo "  4. Minimal Setup (nothing set)"
echo "  5. Complete Setup (no partner name)"
echo ""

