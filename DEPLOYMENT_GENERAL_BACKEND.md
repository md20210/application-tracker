# Application Tracker - General Backend Integration Deployment

## Architektur

```
General Backend (Railway)
├── Shared Services (bestehend)
│   ├── Auth/JWT
│   ├── Translations
│   ├── LLM Gateway
│   └── Vector Service
└── Application Tracker (NEU)
    ├── /api/applications/overview
    ├── /api/applications/{id}
    ├── /api/applications/upload/directory
    ├── /api/applications/chat/message
    └── /api/applications/reports/*

Frontend (Strato SFTP)
└── https://www.dabrock.info/applicationtracker/
    → ruft General Backend auf
```

## Deployment Schritte

### 1. Backend (automatisch via Git)

```bash
cd /mnt/e/CodelocalLLM/GeneralBackend

git add backend/api/applications.py
git add backend/models/application.py
git add backend/models/__init__.py
git add backend/schemas/application.py
git add backend/services/application_service.py
git add backend/translations/application.py
git add backend/main.py
git add alembic/versions/20260117_add_application_tracker.py

git commit -m "Add Application Tracker integration

- New API endpoints: /api/applications/*
- Models: Application, ApplicationDocument, StatusHistory, ChatMessage
- RAG chat with auto status updates
- Dynamic report generation
- ZIP upload with PDF/DOCX parsing
- Fixed: Renamed metadata to message_metadata (SQLAlchemy reserved word)

🤖 Generated with Claude Code

Co-Authored-By: Claude <noreply@anthropic.com>"

git push
```

Railway deployt automatisch (~3-5 Minuten):
- Alembic Migration läuft automatisch
- 4 neue Tabellen werden erstellt
- APIs sind live unter `/api/applications/*`

**Deployment Status überprüfen:**
```bash
# Backend Health Check
curl https://general-backend-production-a734.up.railway.app/

# Applications Endpoint (erfordert Auth)
curl https://general-backend-production-a734.up.railway.app/api/applications/overview
# Expected: {"detail":"Unauthorized"} (HTTP 401)
```

### 2. Frontend (manuell via SFTP)

```bash
cd /mnt/e/CodelocalLLM/applicationtracker/frontend

# Build
npm run build

# Deploy
cd ..
./deploy_frontend.sh
```

Frontend ist live: https://www.dabrock.info/applicationtracker/

### 3. Testen

```bash
# Backend API
curl https://general-backend-production-a734.up.railway.app/api/applications/overview

# Frontend
open https://www.dabrock.info/applicationtracker/
```

## Was wurde integriert

### Backend (General Backend - /mnt/e/CodelocalLLM/GeneralBackend)

**⚠️ WICHTIG:** Das Backend liegt NICHT mehr in `/applicationtracker/backend/`!
Alle Backend-Dateien wurden ins General Backend Repository verschoben.

**Neue Dateien in General Backend:**
- `backend/api/applications.py` - 10 Endpoints
- `backend/models/application.py` - 4 Models (SQLAlchemy)
- `backend/models/__init__.py` - Application models importiert
- `backend/schemas/application.py` - Pydantic Schemas
- `backend/services/application_service.py` - DocumentParser
- `backend/translations/application.py` - 20+ UI Strings
- `alembic/versions/20260117_add_application_tracker.py` - Migration

**Geänderte Dateien in General Backend:**
- `backend/main.py` - applications_router registriert
- `backend/models/user.py` - applications relationship hinzugefügt

### Frontend (/mnt/e/CodelocalLLM/applicationtracker/frontend)

**Konfiguration:**
- `.env.production` - General Backend URL
- `.env.local` - Localhost für lokale Entwicklung
- `src/utils/api.ts` - API_BASE_URL zu General Backend
- `src/vite-env.d.ts` - TypeScript Definitionen für Vite

**Fixes:**
- Import-Konflikt behoben (Upload icon vs Upload component)
- Vite env types hinzugefügt
- API paths zu `/api/applications/*` korrigiert

### Bereinigung

**Entfernt:**
- ❌ `/applicationtracker/backend/` - KOMPLETT GELÖSCHT
  - War obsolet da jetzt General Backend genutzt wird
  - Vermeidet Verwirrung und Duplikate

## API Endpoints

Alle unter: `https://general-backend-production-a734.up.railway.app`

```
GET    /api/applications/overview
GET    /api/applications/{id}
PATCH  /api/applications/{id}/status
DELETE /api/applications/{id}
POST   /api/applications/upload/directory
POST   /api/applications/chat/message
GET    /api/applications/reports/status
POST   /api/applications/reports/generate
```

## Authentication

Nutzt fastapi-users vom General Backend:
- JWT Token via `/auth/jwt/login`
- Demo User: bereits vorhanden
- Alle Requests brauchen `Authorization: Bearer <token>`

## Lokaler Test

```bash
# General Backend lokal starten
cd /mnt/e/CodelocalLLM/GeneralBackend
uvicorn backend.main:app --reload

# Frontend lokal
cd /mnt/e/CodelocalLLM/applicationtracker/frontend
npm run dev
```

Frontend ruft localhost:8000 auf (wegen .env.local).

## Vorteile dieser Integration

✅ **Keine separate Datenbank** - nutzt General Backend PostgreSQL
✅ **Keine separate Deployment** - ein git push deployt alles
✅ **Shared Services** - LLM Gateway, Vector Service, Auth
✅ **Konsistente Architektur** - wie Bar Ca l'Elena
✅ **Kostenersparnis** - keine zweite Railway Instanz

## Nächste Schritte

1. ✅ General Backend deployt (git push)
2. ✅ Railway fertig (~3-5 Min)
3. ✅ Frontend deployt (./deploy_frontend.sh)
4. ✅ Integration getestet

## Troubleshooting

### Problem: SQLAlchemy "metadata" is reserved
**Symptom:** Backend crasht beim Start mit `InvalidRequestError: Attribute name 'metadata' is reserved`

**Lösung:**
```python
# FALSCH:
metadata = Column(Text, nullable=True)

# RICHTIG:
message_metadata = Column(Text, nullable=True)
```

SQLAlchemy reserviert den Namen `metadata` für interne Zwecke. Umbenennen in `message_metadata`.

### Problem: Backend returns 404 for /api/applications/*
**Ursache:** Import-Fehler beim Laden des applications_router

**Prüfen:**
1. Alle Dependencies in requirements.txt? (PyPDF2, python-docx)
2. Models in `backend/models/__init__.py` importiert?
3. Router in `backend/main.py` registriert?
4. Keine zirkulären Imports?

**Fix:**
```bash
# Railway Logs checken
railway logs --service generalbackend

# Lokaler Test (wenn Dependencies installiert)
cd /mnt/e/CodelocalLLM/GeneralBackend
python3 -c "from backend.api.applications import router; print('✅ Import OK')"
```

### Problem: TypeScript build errors im Frontend
**Symptom:** `Duplicate identifier 'Upload'` oder `Property 'env' does not exist on type 'ImportMeta'`

**Lösung:**
```typescript
// 1. Icon-Konflikt auflösen
import { Upload as UploadIcon } from 'lucide-react'

// 2. Vite env types hinzufügen (src/vite-env.d.ts)
/// <reference types="vite/client" />
interface ImportMetaEnv {
  readonly VITE_API_URL: string
}
interface ImportMeta {
  readonly env: ImportMetaEnv
}
```

## Deployment Checkliste

- [x] Application models in General Backend integriert
- [x] API endpoints `/api/applications/*` registriert
- [x] Alembic Migration erstellt und deployt
- [x] Frontend API paths auf `/api/applications/*` aktualisiert
- [x] Frontend gebaut und nach Strato deployt
- [x] Backend Health Check erfolgreich
- [x] Applications endpoint erreichbar (401 Unauthorized = OK)
- [x] Frontend lädt erfolgreich
- [x] Dokumentation aktualisiert

## URLs

- **Frontend:** https://www.dabrock.info/applicationtracker/
- **Backend API:** https://general-backend-production-a734.up.railway.app/api/applications/overview
- **API Docs:** https://general-backend-production-a734.up.railway.app/docs

## Status

✅ **DEPLOYMENT ERFOLGREICH**
- Backend: Live on Railway
- Frontend: Live on Strato
- Integration: Funktioniert
- Datum: 2026-01-17
