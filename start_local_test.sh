#!/bin/bash

################################################################################
# Application Tracker - Lokaler Test-Start
# Startet Backend und Frontend für lokales Testing
################################################################################

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${GREEN}🚀 Application Tracker - Lokaler Test${NC}"
echo "=========================================="

PROJECT_DIR="/mnt/e/CodelocalLLM/applicationtracker"
cd "$PROJECT_DIR"

# Check if PostgreSQL is running
echo -e "\n${YELLOW}1. Checking PostgreSQL...${NC}"
if ! pg_isready -q 2>/dev/null; then
    echo -e "${YELLOW}⚠️  PostgreSQL ist nicht aktiv${NC}"
    echo ""
    echo "Bitte in einem separaten Terminal starten:"
    echo "  sudo service postgresql start"
    echo ""
    read -p "PostgreSQL gestartet? (j/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Jj]$ ]]; then
        echo -e "${RED}Abgebrochen.${NC}"
        exit 1
    fi
fi

# Create database if not exists
echo -e "\n${YELLOW}2. Setting up Database...${NC}"
if ! psql -lqt | cut -d \| -f 1 | grep -qw applicationtracker; then
    echo "Creating database..."
    createdb applicationtracker
    echo -e "${GREEN}✅ Database created${NC}"
else
    echo -e "${GREEN}✅ Database exists${NC}"
fi

# Enable pgvector
echo "Enabling pgvector extension..."
psql -d applicationtracker -c "CREATE EXTENSION IF NOT EXISTS vector;" 2>/dev/null || true
echo -e "${GREEN}✅ pgvector enabled${NC}"

# Setup backend
echo -e "\n${YELLOW}3. Setting up Backend...${NC}"
cd backend

if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

echo "Activating virtual environment..."
source venv/bin/activate

echo "Installing dependencies (this may take a few minutes)..."
pip install -q -r requirements.txt

# Create tables
echo "Creating database tables..."
python3 init_db.py

echo -e "${GREEN}✅ Backend ready${NC}"

# Setup frontend (in background check)
echo -e "\n${YELLOW}4. Checking Frontend...${NC}"
cd ../frontend

if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Installing frontend dependencies (first time only, ~2 minutes)...${NC}"
    npm install
fi

echo -e "${GREEN}✅ Frontend ready${NC}"

# Start services
echo ""
echo "=========================================="
echo -e "${GREEN}🎯 Ready to Start!${NC}"
echo "=========================================="
echo ""
echo "Ich öffne jetzt 2 Terminal-Fenster:"
echo ""
echo -e "${BLUE}Terminal 1:${NC} Backend (http://localhost:8000)"
echo -e "${BLUE}Terminal 2:${NC} Frontend (http://localhost:5173)"
echo ""
echo "Zum Beenden: Ctrl+C in beiden Terminals"
echo ""
read -p "Bereit zum Starten? (j/n) " -n 1 -r
echo

if [[ $REPLY =~ ^[Jj]$ ]]; then
    # Start backend in new terminal
    cd "$PROJECT_DIR/backend"
    gnome-terminal -- bash -c "
        source venv/bin/activate
        echo -e '${GREEN}🚀 Backend Starting...${NC}'
        echo ''
        echo 'Backend läuft auf: http://localhost:8000'
        echo 'API Docs: http://localhost:8000/docs'
        echo ''
        echo 'Zum Beenden: Ctrl+C'
        echo ''
        uvicorn main:app --reload --port 8000
    " 2>/dev/null || {
        echo -e "${YELLOW}Konnte kein neues Terminal öffnen.${NC}"
        echo "Starte Backend hier..."
        cd "$PROJECT_DIR/backend"
        source venv/bin/activate
        uvicorn main:app --reload --port 8000 &
        BACKEND_PID=$!
    }

    sleep 2

    # Start frontend in new terminal
    cd "$PROJECT_DIR/frontend"
    gnome-terminal -- bash -c "
        echo -e '${GREEN}🚀 Frontend Starting...${NC}'
        echo ''
        echo 'Frontend läuft auf: http://localhost:5173'
        echo ''
        echo 'Zum Beenden: Ctrl+C'
        echo ''
        npm run dev
    " 2>/dev/null || {
        echo -e "${YELLOW}Konnte kein zweites Terminal öffnen.${NC}"
        echo "Starte Frontend hier..."
        cd "$PROJECT_DIR/frontend"
        npm run dev &
        FRONTEND_PID=$!
    }

    echo ""
    echo "=========================================="
    echo -e "${GREEN}✨ Services gestartet!${NC}"
    echo "=========================================="
    echo ""
    echo -e "${BLUE}Öffne im Browser:${NC}"
    echo "  Frontend: http://localhost:5173"
    echo "  Backend API Docs: http://localhost:8000/docs"
    echo ""
    echo -e "${BLUE}Erste Schritte:${NC}"
    echo "  1. Öffne http://localhost:5173"
    echo "  2. Gehe zu 'Upload' Tab"
    echo "  3. Erstelle ein Test-ZIP mit Bewerbungsunterlagen"
    echo "  4. Hochladen und testen!"
    echo ""
    echo "Zum Beenden: Ctrl+C in beiden Terminal-Fenstern"
    echo "=========================================="
fi
