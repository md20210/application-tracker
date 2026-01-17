# Railway Deployment Setup

## Schritt 1: GitHub Repository erstellen

```bash
cd /mnt/e/CodelocalLLM/applicationtracker

# Git initialisieren
git init

# Remote hinzufügen (ersetze USERNAME mit deinem GitHub Username)
git remote add origin https://github.com/USERNAME/applicationtracker-backend.git

# Dateien hinzufügen
git add .
git commit -m "Initial commit: Application Tracker Backend"

# Push
git push -u origin main
```

## Schritt 2: Railway Projekt erstellen

1. Gehe zu [railway.app](https://railway.app)
2. Login mit GitHub
3. **New Project** → **Deploy from GitHub repo**
4. Wähle dein `applicationtracker-backend` Repository
5. Railway erkennt automatisch Python/FastAPI

## Schritt 3: PostgreSQL hinzufügen

1. Im Railway Dashboard: **New** → **Database** → **PostgreSQL**
2. Railway erstellt automatisch `DATABASE_URL` Environment Variable
3. Verbindung wird automatisch hergestellt

## Schritt 4: pgvector Extension aktivieren

1. Klicke auf **PostgreSQL** Service
2. **Connect** Tab → **psql** Terminal öffnen
3. Führe aus:
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   ```

Alternativ: Die Alembic Migration `20260117_initial_tables.py` macht das automatisch!

## Schritt 5: Environment Variables setzen

Im Railway Dashboard → Dein Service → **Variables** Tab:

```env
# Diese wird automatisch gesetzt:
DATABASE_URL=postgresql://...

# Diese musst du hinzufügen:
OLLAMA_BASE_URL=http://localhost:11434
ALLOWED_ORIGINS=https://www.dabrock.info,http://localhost:5173
SECRET_KEY=dein-secret-key-hier
ADMIN_PASSWORD=admin1002

# Optional (für bessere LLM-Performance):
GROK_API_KEY=dein-grok-key
ANTHROPIC_API_KEY=dein-anthropic-key
```

## Schritt 6: Deploy

Railway deployt automatisch beim ersten Setup. Bei weiteren Updates:

```bash
git add .
git commit -m "Update feature"
git push
# Railway deployt automatisch!
```

## Schritt 7: Health Check

Nach 5-10 Minuten sollte dein Backend live sein:

```bash
# Prüfe Health Endpoint
curl https://DEIN-SERVICE.up.railway.app/health

# Erwartete Antwort:
{"status":"healthy"}

# Öffne API Docs
https://DEIN-SERVICE.up.railway.app/docs
```

## Schritt 8: (Optional) Ollama Service hinzufügen

Für lokale LLM-Unterstützung:

1. **New** → **Empty Service**
2. **Settings** → **Source** → Docker Image
3. Image: `ollama/ollama:latest`
4. **Service Name**: `ollama`
5. In deinem Backend Service, setze:
   ```
   OLLAMA_BASE_URL=http://ollama.railway.internal:11434
   ```

## Troubleshooting

### Backend startet nicht (502 Error)
- Prüfe **Logs** im Railway Dashboard
- Häufig: Fehlende Dependencies in `requirements.txt`
- Oder: Falscher Import-Pfad

### Database Connection Error
- Prüfe ob `DATABASE_URL` gesetzt ist
- Prüfe ob PostgreSQL Service läuft

### Migrations Failed
- Prüfe **Logs** für Alembic Fehler
- Eventuell: Migration manuell in psql Terminal ausführen

## Monitoring

- **Deployments** Tab: Deployment History
- **Logs** Tab: Echtzeit-Logs
- **Metrics** Tab: CPU/RAM Usage
- **Settings** → **Networking**: Public URL

## Kosten

- **Hobby Plan**: $5/Monat
  - 500h Execution Time
  - 8GB RAM
  - 8GB Disk
- **PostgreSQL**: Im Hobby Plan enthalten

## Weiterführende Links

- [Railway Docs](https://docs.railway.app)
- [FastAPI Deployment](https://docs.railway.app/guides/python/fastapi)
- [Database Backups](https://docs.railway.app/databases/postgresql#backups)
