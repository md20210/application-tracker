# Application Tracker - Quickstart Guide

Schneller Einstieg in 5 Minuten!

## Option 1: Docker (Empfohlen)

```bash
# 1. Docker Compose starten
docker-compose up -d

# 2. Warten bis alle Services laufen (ca. 30 Sekunden)
docker-compose ps

# 3. Ollama Model herunterladen
docker exec -it apptracker-ollama ollama pull llama3.2:3b

# 4. Fertig! Öffne:
# Frontend: http://localhost:5173
# Backend API: http://localhost:8000/docs
```

## Option 2: Manuell

### 1. Backend Setup (5 Minuten)

```bash
# Terminal 1 - Backend
cd backend

# Virtual Environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Dependencies installieren
pip install -r requirements.txt

# .env erstellen
cp .env.example .env

# Bearbeite .env mit deinen Credentials:
# DATABASE_URL=postgresql://user:pass@localhost:5432/applicationtracker
```

### 2. Datenbank erstellen

```bash
# PostgreSQL Datenbank erstellen
createdb applicationtracker

# Datenbank initialisieren
python init_db.py
```

### 3. Backend starten

```bash
# Im backend/ Verzeichnis
uvicorn main:app --reload --port 8000

# ✅ Backend läuft auf http://localhost:8000
```

### 4. Frontend Setup (2 Minuten)

```bash
# Terminal 2 - Frontend
cd frontend

# Dependencies installieren
npm install

# Frontend starten
npm run dev

# ✅ Frontend läuft auf http://localhost:5173
```

### 5. (Optional) Ollama Setup

```bash
# Ollama installieren: https://ollama.ai

# Model herunterladen
ollama pull llama3.2:3b

# Ollama läuft automatisch auf http://localhost:11434
```

## Erste Schritte

### 1. Bewerbung hochladen

1. Erstelle ein ZIP-Archiv:
   ```
   Allianz.zip
   ├── CV.pdf
   ├── Anschreiben.docx
   └── Zeugnisse/
       └── Zeugnis1.pdf
   ```

2. Gehe zu **Upload** → ZIP hochladen → Fertig!

### 2. Im Chat fragen

```
"Wie viele Bewerbungen habe ich?"
"Status von Allianz auf Interview setzen"
"Zeige mir alle Dokumente für SAP"
```

### 3. Report erstellen

1. **Übersicht** → **Report erstellen**
2. Basis-Spalten wählen
3. (Optional) Custom-Spalte hinzufügen:
   - Name: "Match Score"
   - Prompt: "Bewerte die Passung von 1-10"
4. **Report generieren**

## Troubleshooting

### Backend startet nicht

```bash
# Prüfe DATABASE_URL in .env
echo $DATABASE_URL

# Prüfe ob PostgreSQL läuft
pg_isready

# Prüfe ob Tabellen existieren
python init_db.py
```

### Frontend zeigt Fehler

```bash
# Prüfe ob Backend läuft
curl http://localhost:8000/health

# Neu installieren
rm -rf node_modules
npm install
```

### Ollama funktioniert nicht

```bash
# Prüfe Ollama Status
curl http://localhost:11434/api/tags

# Model herunterladen
ollama pull llama3.2:3b

# Nutze alternativ Grok oder Claude (API Key in .env)
```

## Nächste Schritte

- 📖 Lies [README.md](README.md) für Details
- 📄 Siehe [CLAUDE.md](CLAUDE.md) für vollständige Spezifikation
- 🚀 Deployment auf Railway: Siehe README.md → Deployment

## Tipps

- **Lokal testen**: Nutze Ollama (kostenlos, GDPR-konform)
- **Schnellere Antworten**: Nutze Grok oder Claude (API Keys erforderlich)
- **Custom Reports**: LLM-Provider "grok" oder "anthropic" wählen für bessere Qualität
- **ZIP-Struktur**: Egal! Alle Dateien werden extrahiert, Ordner werden ignoriert

## Support

Bei Problemen:
1. Prüfe Backend Logs: `uvicorn` Output
2. Prüfe Frontend Logs: Browser Console (F12)
3. Teste API direkt: http://localhost:8000/docs

Viel Erfolg! 🚀
