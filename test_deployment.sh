#!/bin/bash

################################################################################
# Application Tracker Deployment Test Script
# Tests both backend and frontend after deployment
################################################################################

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}🧪 Application Tracker Deployment Tests${NC}"
echo "=========================================="

# Configuration - UPDATE THESE AFTER DEPLOYMENT
BACKEND_URL="https://YOUR-SERVICE.up.railway.app"
FRONTEND_URL="https://www.dabrock.info/applicationtracker/"

# Test 1: Backend Health
echo -e "\n${YELLOW}Test 1: Backend Health Check${NC}"
RESPONSE=$(curl -s -w "\n%{http_code}" "$BACKEND_URL/health" | tail -n 1)

if [ "$RESPONSE" = "200" ]; then
    echo -e "${GREEN}✅ Backend is healthy${NC}"
else
    echo -e "${RED}❌ Backend health check failed (HTTP $RESPONSE)${NC}"
fi

# Test 2: Backend API Docs
echo -e "\n${YELLOW}Test 2: Backend API Documentation${NC}"
RESPONSE=$(curl -s -w "\n%{http_code}" "$BACKEND_URL/docs" | tail -n 1)

if [ "$RESPONSE" = "200" ]; then
    echo -e "${GREEN}✅ API docs accessible${NC}"
    echo "   URL: $BACKEND_URL/docs"
else
    echo -e "${RED}❌ API docs not accessible (HTTP $RESPONSE)${NC}"
fi

# Test 3: Applications Endpoint
echo -e "\n${YELLOW}Test 3: Applications API${NC}"
RESPONSE=$(curl -s "$BACKEND_URL/api/applications/overview")

if echo "$RESPONSE" | grep -q "\["; then
    echo -e "${GREEN}✅ Applications API working${NC}"
    COUNT=$(echo "$RESPONSE" | grep -o "id" | wc -l)
    echo "   Applications in database: $COUNT"
else
    echo -e "${RED}❌ Applications API error${NC}"
    echo "   Response: $RESPONSE"
fi

# Test 4: Frontend Accessibility
echo -e "\n${YELLOW}Test 4: Frontend Accessibility${NC}"
RESPONSE=$(curl -s -w "\n%{http_code}" "$FRONTEND_URL" | tail -n 1)

if [ "$RESPONSE" = "200" ]; then
    echo -e "${GREEN}✅ Frontend is accessible${NC}"
    echo "   URL: $FRONTEND_URL"
else
    echo -e "${RED}❌ Frontend not accessible (HTTP $RESPONSE)${NC}"
fi

# Test 5: Frontend Assets
echo -e "\n${YELLOW}Test 5: Frontend Assets${NC}"

# Check for JS bundle
RESPONSE=$(curl -s -I "$FRONTEND_URL/assets/" | grep "HTTP" | tail -n1)
if echo "$RESPONSE" | grep -q "200"; then
    echo -e "${GREEN}✅ Assets directory accessible${NC}"
else
    echo -e "${YELLOW}⚠️  Assets directory check inconclusive${NC}"
fi

# Test 6: CORS Configuration
echo -e "\n${YELLOW}Test 6: CORS Configuration${NC}"
RESPONSE=$(curl -s -I -H "Origin: https://www.dabrock.info" "$BACKEND_URL/api/applications/overview" | grep -i "access-control")

if [ -n "$RESPONSE" ]; then
    echo -e "${GREEN}✅ CORS headers present${NC}"
    echo "$RESPONSE" | while read line; do echo "   $line"; done
else
    echo -e "${RED}❌ CORS headers missing${NC}"
    echo "   Check ALLOWED_ORIGINS in Railway environment variables"
fi

# Test 7: Database Connection
echo -e "\n${YELLOW}Test 7: Database Connection${NC}"
RESPONSE=$(curl -s "$BACKEND_URL/api/reports/status")

if echo "$RESPONSE" | grep -q "total_applications"; then
    echo -e "${GREEN}✅ Database connection working${NC}"
    TOTAL=$(echo "$RESPONSE" | grep -o '"total_applications":[0-9]*' | cut -d: -f2)
    echo "   Total applications: $TOTAL"
else
    echo -e "${RED}❌ Database connection error${NC}"
fi

# Summary
echo ""
echo "=========================================="
echo -e "${GREEN}📊 Test Summary${NC}"
echo "=========================================="
echo ""
echo "Backend:  $BACKEND_URL"
echo "Frontend: $FRONTEND_URL"
echo ""
echo "Next steps:"
echo "  1. Open frontend in browser"
echo "  2. Try uploading a test application"
echo "  3. Test chat functionality"
echo "  4. Generate a test report"
echo ""
echo "If tests failed:"
echo "  - Check Railway logs for backend errors"
echo "  - Verify environment variables are set"
echo "  - Check .env.production in frontend"
echo "=========================================="
