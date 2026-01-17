# Application Tracker

Ein intelligentes Bewerbungsmanagementsystem mit RAG-unterstütztem Chat und dynamischen Reports.

**🌐 Live Demo:** https://www.dabrock.info/applicationtracker/
**📦 GitHub:** https://github.com/md20210/application-tracker
**🔧 Backend:** https://github.com/md20210/general-backend (integriert)

## Features

✅ **Verzeichnis-Upload**: ZIP-Dateien mit allen Bewerbungsunterlagen hochladen
✅ **Automatische Extraktion**: PDF, DOCX, TXT werden automatisch geparst
✅ **RAG-Chat**: Fragen zu Bewerbungen stellen mit kontextbasierter KI
✅ **Status-Updates via Chat**: "Allianz auf Interview setzen" → automatisch erkannt
✅ **Dynamische Reports**: Custom Spalten via LLM-Prompts generieren
✅ **Übersicht**: Alle Bewerbungen mit Dokumenten und Status-Historie
✅ **Löschfunktion**: Bewerbungen komplett entfernen (DB + Vektor-DB)
✅ **Multi-LLM**: Ollama (lokal), Grok, Claude

## Architektur

⚠️ **WICHTIG:** Das Backend ist im [General Backend](https://github.com/md20210/general-backend) integriert, NICHT in diesem Repository!

```
┌─────────────────────────────────┐
│  Frontend (dieses Repo)         │
│  https://www.dabrock.info/      │
│  /applicationtracker/           │
└────────────┬────────────────────┘
             │ HTTPS
             ↓
┌─────────────────────────────────┐
│  General Backend (Railway)      │
│  /api/applications/*            │
│  Shared Services:               │
│  • Auth, LLM, Translations      │
└─────────────────────────────────┘
```

## Technologie-Stack

### Backend (General Backend Repository)
- **FastAPI** - Python Web Framework
- **PostgreSQL** + **pgvector** - Datenbank mit Vektor-Suche
- **SQLAlchemy** - ORM
- **sentence-transformers** - Embedding Generation (all-MiniLM-L6-v2)
- **PyPDF2**, **python-docx** - Dokument-Parsing
- **Railway** - Hosting & Auto-Deploy

### Frontend
- **React** + **TypeScript** + **Vite**
- **TailwindCSS** - Styling (dabrock.info Design)
- **React Router** - Navigation
- **axios** - API Client

### LLMs
- **Ollama** (lokal, GDPR-konform)
- **Grok** (xAI, schnell)
- **Claude** (Anthropic, beste Qualität)

## Installation

### Frontend Setup (Production)

```bash
# Frontend Dependencies
cd frontend
npm install

# Production Build
npm run build

# Deploy to Strato (siehe DEPLOYMENT_GENERAL_BACKEND.md)
cd ..
./deploy_frontend.sh
```

### Backend Setup (Development)

⚠️ **Das Backend liegt im separaten Repository:** https://github.com/md20210/general-backend

Für lokale Entwicklung:
```bash
# Clone General Backend
git clone https://github.com/md20210/general-backend.git
cd general-backend

# Setup (siehe General Backend README)
# ...

# Frontend local entwickeln
cd /path/to/application-tracker/frontend
npm run dev  # Nutzt .env.local (localhost:8000)
```

## Nutzung

### 1. Bewerbung hochladen

1. Erstelle ein ZIP-Archiv mit allen Unterlagen einer Firma:
   ```
   Allianz.zip
   ├── CV.pdf
   ├── Anschreiben.docx
   ├── Zeugnisse/
   │   ├── Zeugnis_Firma1.pdf
   │   └── Zeugnis_Firma2.pdf
   ```

2. Gehe zu **Upload**
3. ZIP-Datei hochladen
4. Firmenname eingeben (z.B. "Allianz")
5. Optional: Position angeben
6. **Hochladen** klicken

→ Alle Dateien werden extrahiert, geparst und in der Datenbank gespeichert

### 2. Übersicht nutzen

- Siehst alle Bewerbungen mit Status und Anzahl Dokumente
- Klicke auf eine Zeile um Details zu sehen (Dokumente, Status-Historie)
- Lösche Bewerbungen mit dem Papierkorb-Icon
- **Report erstellen** Button öffnet den dynamischen Report-Generator

### 3. Chat nutzen

**Beispiel-Prompts:**
```
- "Wie viele Bewerbungen habe ich?"
- "Zeige alle Bewerbungen mit Status Interview"
- "Status von Allianz auf Zusage setzen"
- "Welche Dokumente habe ich für SAP hochgeladen?"
- "Fasse die Dokumente von Siemens zusammen"
```

**Status-Updates via Chat:**
```
"Allianz auf Interview setzen"
"Update SAP to rejected"
"Status von Siemens auf Zusage ändern"
```

→ System erkennt automatisch und aktualisiert den Status!

### 4. Dynamische Reports erstellen

1. Klicke **Report erstellen** in der Übersicht
2. Wähle Basis-Spalten (Firma, Position, Status, etc.)
3. (Optional) Füge Custom-Spalten hinzu:
   - Name: z.B. "Match Score"
   - Typ: Text oder Zahl
   - Prompt: "Bewerte die Passung dieser Bewerbung zu meinen Skills von 1-10"
4. Wähle LLM-Provider
5. **Report generieren**
6. Ergebnis als Tabelle oder CSV-Download

**Custom-Spalten Beispiele:**
```
Name: "Nächster Schritt"
Prompt: "Was sollte als nächstes bei dieser Bewerbung gemacht werden?"

Name: "Gehalt Einschätzung"
Prompt: "Schätze das wahrscheinliche Gehalt basierend auf Position und Firma"

Name: "Interview Vorbereitung"
Prompt: "Nenne 3 wichtige Punkte für die Interview-Vorbereitung"
```

## Projekt-Struktur

**Dieses Repository (Frontend + Docs):**
```
application-tracker/
├── frontend/                   # React Frontend
│   ├── src/
│   │   ├── components/
│   │   │   └── ReportWindow.tsx
│   │   ├── pages/
│   │   │   ├── Overview.tsx   # Übersicht
│   │   │   ├── Chat.tsx       # Chat-Interface
│   │   │   └── Upload.tsx     # Upload-Seite
│   │   ├── utils/
│   │   │   └── api.ts         # API Client
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   └── vite.config.ts
│
├── deploy_frontend.sh         # Deployment Script
├── DEPLOYMENT_GENERAL_BACKEND.md
└── README.md
```

**General Backend Repository (Backend Code):**
```
general-backend/
├── backend/
│   ├── api/
│   │   └── applications.py    # Application Tracker Endpoints
│   ├── models/
│   │   └── application.py     # SQLAlchemy Models
│   ├── schemas/
│   │   └── application.py     # Pydantic Schemas
│   ├── services/
│   │   └── application_service.py  # Document Parser
│   └── translations/
│       └── application.py     # UI Strings
│
└── alembic/versions/
    └── 20260117_add_application_tracker.py
```

## API Endpunkte

**Base URL:** `https://general-backend-production-a734.up.railway.app`

### Applications
- `GET /api/applications/overview` - Alle Bewerbungen mit Doc-Count
- `GET /api/applications/{id}` - Details einer Bewerbung
- `PATCH /api/applications/{id}/status` - Status aktualisieren
- `DELETE /api/applications/{id}` - Bewerbung löschen

### Upload & Chat
- `POST /api/applications/upload/directory` - ZIP-Upload
- `POST /api/applications/chat/message` - RAG Chat mit Status-Update

### Reports
- `GET /api/applications/reports/status` - Status-Report
- `POST /api/applications/reports/generate` - Custom Report generieren

**API Dokumentation:** https://general-backend-production-a734.up.railway.app/docs

## Deployment

**Vollständige Anleitung:** [DEPLOYMENT_GENERAL_BACKEND.md](./DEPLOYMENT_GENERAL_BACKEND.md)

### Quick Deploy

**Backend (im General Backend Repository):**
```bash
cd /path/to/general-backend
git add .
git commit -m "Update Application Tracker"
git push  # Railway deployt automatisch
```

**Frontend:**
```bash
cd /path/to/application-tracker
./deploy_frontend.sh
```

### Live URLs

- **Frontend:** https://www.dabrock.info/applicationtracker/
- **Backend API:** https://general-backend-production-a734.up.railway.app/api/applications/*
- **API Docs:** https://general-backend-production-a734.up.railway.app/docs

## Verwendete Showcase-Patterns

Dieses Projekt nutzt bewährte Patterns aus:
- **bar-ca-l-elena**: RAG Chat, pgvector, Multi-LLM
- **cv-matcher**: Document Parsing, Frontend Design
- **general-backend**: API Structure, LLM Gateway
- **elasticsearch**: Hybrid Search (für zukünftige Erweiterung)

## Roadmap

- [ ] Elasticsearch Integration für bessere Suche
- [ ] Email-Parsing (.eml Dateien)
- [ ] Automatische Job-Matching
- [ ] Kalender-Integration für Interview-Termine
- [ ] Statistik-Dashboard mit Charts
- [ ] Mobile App

## Security

⚠️ **Demo Credentials:** Die Spezifikation (CLAUDE.md) enthält Demo-Passwörter für lokale Tests.
Diese sind **NUR für lokale Entwicklung** gedacht.

**Bei Production Deployment:**
1. Ändere alle Passwörter in Umgebungsvariablen
2. Nutze Railway Secrets für API Keys
3. Aktiviere HTTPS und sichere Cookies
4. Setze starke, zufällige Passwörter

**Passwort-Änderung:**
Die aktuelle Implementation (General Backend) nutzt `fastapi-users` mit JWT Authentication.
Demo-Passwörter aus CLAUDE.md sind veraltet und gelten nur für die ursprüngliche Streamlit-Version.

## Lizenz

Privates Projekt - Alle Rechte vorbehalten

## Dokumentation

- **Deployment Guide:** [DEPLOYMENT_GENERAL_BACKEND.md](./DEPLOYMENT_GENERAL_BACKEND.md)
- **Vollständige Doku:** [/docs/APPLICATION_TRACKER.md](https://github.com/md20210/CodelocalLLM/blob/master/docs/APPLICATION_TRACKER.md)
- **API Reference:** https://general-backend-production-a734.up.railway.app/docs
- **Spezifikation:** [CLAUDE.md](./CLAUDE.md)

## Repositories

- **Frontend:** https://github.com/md20210/application-tracker
- **Backend:** https://github.com/md20210/general-backend (integriert)

## Support

Bei Fragen oder Problemen, siehe Dokumentation oder öffne ein Issue auf GitHub.
