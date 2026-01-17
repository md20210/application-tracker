#!/bin/bash

################################################################################
# GitHub Repository Setup Script for Application Tracker
# Creates GitHub repository and pushes code
################################################################################

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}🚀 GitHub Repository Setup${NC}"
echo "=========================================="

# Configuration
REPO_NAME="applicationtracker-backend"
PROJECT_DIR="/mnt/e/CodelocalLLM/applicationtracker"

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
    echo -e "${RED}❌ GitHub CLI (gh) is not installed${NC}"
    echo ""
    echo "Install it with:"
    echo "  Ubuntu/Debian: sudo apt install gh"
    echo "  macOS: brew install gh"
    echo "  Windows: winget install GitHub.cli"
    echo ""
    echo "Then run: gh auth login"
    exit 1
fi

# Check if authenticated
if ! gh auth status &> /dev/null; then
    echo -e "${YELLOW}⚠️  Not authenticated with GitHub${NC}"
    echo "Running: gh auth login"
    gh auth login
fi

echo -e "\n${YELLOW}Step 1: Initializing Git Repository${NC}"
cd "$PROJECT_DIR"

if [ -d ".git" ]; then
    echo -e "${YELLOW}⚠️  Git repository already exists${NC}"
    echo "Skipping git init..."
else
    git init
    echo -e "${GREEN}✅ Git repository initialized${NC}"
fi

# Create .gitignore if it doesn't exist
if [ ! -f ".gitignore" ]; then
    echo -e "${YELLOW}Creating .gitignore...${NC}"
    cat > .gitignore << 'EOF'
# See existing .gitignore in root
EOF
fi

echo -e "\n${YELLOW}Step 2: Creating GitHub Repository${NC}"

# Check if repo already exists
if gh repo view "$REPO_NAME" &> /dev/null; then
    echo -e "${YELLOW}⚠️  Repository $REPO_NAME already exists${NC}"
    REPO_URL=$(gh repo view "$REPO_NAME" --json url -q .url)
    echo "   URL: $REPO_URL"
else
    echo "Creating repository: $REPO_NAME"
    gh repo create "$REPO_NAME" --public --description "Job Application Tracking System with RAG-powered chat and dynamic reports" --source=. --remote=origin
    echo -e "${GREEN}✅ Repository created${NC}"
    REPO_URL="https://github.com/$(gh api user -q .login)/$REPO_NAME"
    echo "   URL: $REPO_URL"
fi

echo -e "\n${YELLOW}Step 3: Preparing Files for Commit${NC}"

# Add all files
git add .

# Show what will be committed
echo ""
echo "Files to be committed:"
git status --short | head -20
TOTAL_FILES=$(git status --short | wc -l)
if [ $TOTAL_FILES -gt 20 ]; then
    echo "... and $(($TOTAL_FILES - 20)) more files"
fi

echo -e "\n${YELLOW}Step 4: Creating Initial Commit${NC}"

# Check if there are changes to commit
if git diff --cached --quiet; then
    echo -e "${YELLOW}⚠️  No changes to commit${NC}"
else
    git commit -m "Initial commit: Application Tracker Backend

Features:
- FastAPI backend with PostgreSQL + pgvector
- RAG-powered chat with Ollama/Grok/Claude
- Document upload and parsing (PDF, DOCX, TXT)
- Dynamic report generation with custom LLM columns
- Automatic status updates via chat
- Alembic migrations for database schema
- Ready for Railway deployment

Components:
- 4 API routers: applications, upload, chat, reports
- 4 database models: Application, Document, StatusHistory, ChatMessage
- 3 services: DocumentParser, VectorService, LLMService

Deployment:
- Backend: Railway (automatic from GitHub)
- Frontend: Strato SFTP (manual deployment)
- Database: PostgreSQL 16 + pgvector extension

🤖 Generated with Claude Code
https://claude.com/claude-code

Co-Authored-By: Claude <noreply@anthropic.com>"

    echo -e "${GREEN}✅ Initial commit created${NC}"
fi

echo -e "\n${YELLOW}Step 5: Pushing to GitHub${NC}"

# Set default branch to main if needed
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "main" ]; then
    git branch -M main
fi

# Push to GitHub
if git push -u origin main; then
    echo -e "${GREEN}✅ Code pushed to GitHub${NC}"
else
    echo -e "${YELLOW}⚠️  Push failed, trying force push...${NC}"
    git push -u origin main --force
fi

echo ""
echo "=========================================="
echo -e "${GREEN}✅ GitHub Setup Complete!${NC}"
echo "=========================================="
echo ""
echo "Repository URL: $REPO_URL"
echo ""
echo "Next steps:"
echo "  1. Go to railway.app"
echo "  2. New Project → Deploy from GitHub repo"
echo "  3. Select: $REPO_NAME"
echo "  4. Add PostgreSQL database"
echo "  5. Set environment variables (see RAILWAY_SETUP.md)"
echo "  6. Deploy!"
echo ""
echo "For detailed instructions, see:"
echo "  - RAILWAY_SETUP.md"
echo "  - QUICKSTART.md"
echo "=========================================="
