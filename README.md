# Application Tracker

Ein intelligentes Bewerbungsmanagementsystem mit RAG-unterstütztem Chat und dynamischen Reports.

## Features

✅ **Verzeichnis-Upload**: ZIP-Dateien mit allen Bewerbungsunterlagen hochladen
✅ **Automatische Extraktion**: PDF, DOCX, TXT werden automatisch geparst
✅ **RAG-Chat**: Fragen zu Bewerbungen stellen mit kontextbasierter KI
✅ **Status-Updates via Chat**: "Allianz auf Interview setzen" → automatisch erkannt
✅ **Dynamische Reports**: Custom Spalten via LLM-Prompts generieren
✅ **Übersicht**: Alle Bewerbungen mit Dokumenten und Status-Historie
✅ **Löschfunktion**: Bewerbungen komplett entfernen (DB + Vektor-DB)
✅ **Multi-LLM**: Ollama (lokal), Grok, Claude

## Technologie-Stack

### Backend
- **FastAPI** - Python Web Framework
- **PostgreSQL** + **pgvector** - Datenbank mit Vektor-Suche
- **SQLAlchemy** - ORM
- **sentence-transformers** - Embedding Generation (all-MiniLM-L6-v2)
- **PyPDF2**, **python-docx** - Dokument-Parsing

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

### Voraussetzungen
- Python 3.11+
- Node.js 20+
- PostgreSQL 16+ mit pgvector Extension
- (Optional) Ollama lokal installiert

### 1. Backend Setup

```bash
cd backend

# Virtual Environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Dependencies
pip install -r requirements.txt

# Environment Variables
cp .env.example .env
# Bearbeite .env mit deinen Credentials
```

**Wichtige .env Variablen:**
```env
DATABASE_URL=postgresql://user:pass@localhost:5432/applicationtracker
OLLAMA_BASE_URL=http://localhost:11434
GROK_API_KEY=your_key  # Optional
ANTHROPIC_API_KEY=your_key  # Optional
```

### 2. Datenbank Setup

```bash
# PostgreSQL Datenbank erstellen
createdb applicationtracker

# pgvector Extension aktivieren
psql applicationtracker -c "CREATE EXTENSION IF NOT EXISTS vector;"

# Tabellen erstellen
python -c "from database import Base, engine; Base.metadata.create_all(bind=engine)"
```

### 3. Ollama Setup (optional, aber empfohlen)

```bash
# Ollama installieren: https://ollama.ai

# Modell herunterladen
ollama pull llama3.2:3b
```

### 4. Backend starten

```bash
uvicorn main:app --reload --port 8000
```

Backend läuft auf: http://localhost:8000
API Docs: http://localhost:8000/docs

### 5. Frontend Setup

```bash
cd ../frontend

# Dependencies
npm install

# Frontend starten
npm run dev
```

Frontend läuft auf: http://localhost:5173

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

```
applicationtracker/
├── backend/
│   ├── api/                    # API Endpoints
│   │   ├── applications.py     # CRUD für Bewerbungen
│   │   ├── upload.py          # ZIP/Dokument Upload
│   │   ├── chat.py            # RAG Chat
│   │   └── reports.py         # Report-Generierung
│   ├── models/                # SQLAlchemy Models
│   │   ├── application.py
│   │   ├── document.py
│   │   ├── status_history.py
│   │   └── chat_message.py
│   ├── services/              # Business Logic
│   │   ├── document_parser.py # PDF/DOCX Parsing
│   │   ├── vector_service.py  # Embeddings
│   │   └── llm_service.py     # LLM Integration
│   ├── database.py
│   ├── main.py
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   └── ReportWindow.tsx
│   │   ├── pages/
│   │   │   ├── Overview.tsx    # Übersicht
│   │   │   ├── Chat.tsx        # Chat-Interface
│   │   │   └── Upload.tsx      # Upload-Seite
│   │   ├── utils/
│   │   │   └── api.ts          # API Client
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   └── vite.config.ts
│
└── README.md
```

## API Endpunkte

### Applications
- `GET /api/applications/overview` - Alle Bewerbungen mit Doc-Count
- `GET /api/applications/{id}` - Details einer Bewerbung
- `PATCH /api/applications/{id}/status` - Status aktualisieren
- `DELETE /api/applications/{id}` - Bewerbung löschen

### Upload
- `POST /api/upload/directory` - ZIP-Upload
- `POST /api/upload/single` - Einzeldatei-Upload

### Chat
- `POST /api/chat/message` - Chat-Nachricht senden
- `GET /api/chat/history` - Chat-Historie
- `DELETE /api/chat/history` - Historie löschen

### Reports
- `GET /api/reports/status` - Status-Report
- `POST /api/reports/generate` - Custom Report generieren
- `GET /api/reports/overview` - Übersichts-Report

## Deployment

### Railway (empfohlen)

1. PostgreSQL Datenbank erstellen
2. pgvector Extension aktivieren
3. Backend deployen:
   ```bash
   # Procfile
   web: uvicorn backend.main:app --host 0.0.0.0 --port $PORT
   ```
4. Environment Variables setzen
5. Frontend bauen und zu Strato SFTP hochladen

### Lokal

```bash
# Backend
cd backend && uvicorn main:app --port 8000

# Frontend
cd frontend && npm run dev
```

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

## Lizenz

Privates Projekt - Alle Rechte vorbehalten

## Support

Bei Fragen oder Problemen: Siehe CLAUDE.md für detaillierte Spezifikation
