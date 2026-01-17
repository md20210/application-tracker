#!/bin/bash

################################################################################
# Application Tracker Frontend Deployment Script
# Deploys to Strato SFTP: https://www.dabrock.info/applicationtracker/
################################################################################

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}📦 Application Tracker Frontend Deployment${NC}"
echo "=========================================="

# Configuration
SFTP_USER="su403214"
SFTP_HOST="5018735097.ssh.w2.strato.hosting"
REMOTE_PATH="/dabrock-info/applicationtracker"
FRONTEND_DIR="/mnt/e/CodelocalLLM/applicationtracker/frontend"
NETRC_FILE="$HOME/.netrc"

# Check if .netrc exists
if [ ! -f "$NETRC_FILE" ]; then
    echo -e "${RED}❌ Error: .netrc file not found at $NETRC_FILE${NC}"
    echo ""
    echo "Create .netrc file with:"
    echo "  machine $SFTP_HOST"
    echo "  login $SFTP_USER"
    echo "  password YOUR_PASSWORD"
    echo ""
    echo "Then run: chmod 600 ~/.netrc"
    exit 1
fi

# Step 1: Build Frontend
echo -e "\n${YELLOW}1. Building Frontend...${NC}"
cd "$FRONTEND_DIR"

if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

echo "Building production bundle..."
npm run build

if [ ! -d "dist" ]; then
    echo -e "${RED}❌ Build failed: dist/ directory not found${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Build complete${NC}"
BUILD_SIZE=$(du -sh dist | cut -f1)
echo "   Build size: $BUILD_SIZE"

# Step 2: Upload Files
echo -e "\n${YELLOW}2. Uploading to Strato SFTP...${NC}"

upload_file() {
    local file="$1"
    local remote_file="$2"

    HOME="$HOME" timeout 60 curl --netrc-file "$NETRC_FILE" \
        -T "$file" \
        "sftp://$SFTP_USER@$SFTP_HOST$REMOTE_PATH/$remote_file" \
        -k --ftp-create-dirs --connect-timeout 30 --max-time 120 \
        2>&1 | grep -v "Warning: Binary output"

    if [ $? -eq 0 ]; then
        echo -e "   ${GREEN}✓${NC} $remote_file"
    else
        echo -e "   ${RED}✗${NC} $remote_file"
        return 1
    fi
}

# Upload index.html
echo "Uploading HTML..."
upload_file "dist/index.html" "index.html"

# Upload .htaccess
echo "Uploading .htaccess..."
upload_file "public/.htaccess" ".htaccess"

# Upload assets
echo "Uploading assets..."
cd dist/assets
for file in *; do
    upload_file "$file" "assets/$file"
done

cd "$FRONTEND_DIR"

echo -e "\n${GREEN}✅ Deployment complete!${NC}"

# Step 3: Verify Deployment
echo -e "\n${YELLOW}3. Verifying Deployment...${NC}"

URL="https://www.dabrock.info/applicationtracker/"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$URL")

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✅ Frontend is live!${NC}"
    echo "   URL: $URL"
else
    echo -e "${YELLOW}⚠️  Warning: Got HTTP $HTTP_CODE${NC}"
    echo "   URL: $URL"
    echo "   Frontend may still be deploying..."
fi

echo ""
echo "=========================================="
echo -e "${GREEN}🚀 Deployment Summary${NC}"
echo "   Frontend: https://www.dabrock.info/applicationtracker/"
echo "   Backend:  Configure in frontend/.env.production"
echo ""
echo "Next steps:"
echo "   1. Test the application in your browser"
echo "   2. Check browser console for errors (F12)"
echo "   3. Verify API connection works"
echo "=========================================="
