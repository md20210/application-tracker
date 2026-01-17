# Application Tracker - Automatisches Deployment

Komplette Anleitung für automatisches Deployment wie bei den anderen Showcases.

## Übersicht

**Backend**: Railway (automatisch via GitHub Push)
**Frontend**: Strato SFTP (manuell, aber skriptgesteuert)
**Datenbank**: PostgreSQL 16 + pgvector auf Railway
**Migrations**: Alembic (automatisch bei jedem Deploy)

---

## 🚀 Quick Deployment (5 Schritte)

### 1. GitHub Repository erstellen

```bash
cd /mnt/e/CodelocalLLM/applicationtracker
./create_github_repo.sh
```

Das Skript:
- ✅ Initialisiert Git Repository
- ✅ Erstellt GitHub Repository
- ✅ Committed alle Dateien
- ✅ Pushed zu GitHub

### 2. Railway Backend Setup

1. Gehe zu [railway.app](https://railway.app)
2. **New Project** → **Deploy from GitHub repo**
3. Wähle `applicationtracker-backend`
4. **Add Service** → **PostgreSQL**
5. Klicke auf PostgreSQL → **Connect** → psql Terminal:
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   ```

### 3. Environment Variables setzen

Railway Dashboard → Dein Service → **Variables**:

```env
# Automatisch gesetzt:
DATABASE_URL=postgresql://...

# Manuell hinzufügen:
ALLOWED_ORIGINS=https://www.dabrock.info,http://localhost:5173
SECRET_KEY=dein-geheimer-schluessel-hier
ADMIN_PASSWORD=admin1002

# Optional für bessere LLM-Performance:
GROK_API_KEY=dein-grok-api-key
ANTHROPIC_API_KEY=dein-anthropic-api-key
OLLAMA_BASE_URL=http://localhost:11434
```

### 4. Frontend konfigurieren

```bash
cd frontend

# Backend-URL eintragen
echo "VITE_API_URL=https://DEIN-SERVICE.up.railway.app" > .env.production
```

Ersetze `DEIN-SERVICE` mit deiner Railway URL!

### 5. Frontend deployen

```bash
# Erstelle .netrc für SFTP-Zugang (einmalig)
cat > ~/.netrc << EOF
machine 5018735097.ssh.w2.strato.hosting
login su403214
password DEIN_STRATO_PASSWORT
EOF

chmod 600 ~/.netrc

# Deploy
cd /mnt/e/CodelocalLLM/applicationtracker
./deploy_frontend.sh
```

---

## ✅ Deployment Testen

```bash
./test_deployment.sh
```

Das Skript testet:
- ✅ Backend Health Check
- ✅ API Docs erreichbar
- ✅ Datenbank-Verbindung
- ✅ Frontend erreichbar
- ✅ CORS konfiguriert
- ✅ Assets geladen

---

## 🔄 Updates deployen

### Backend Updates (automatisch)

```bash
cd /mnt/e/CodelocalLLM/applicationtracker

# Änderungen machen, dann:
git add .
git commit -m "Neue Feature XYZ"
git push

# ✨ Railway deployt automatisch!
# Dauert ca. 5-10 Minuten
```

### Frontend Updates (manuell)

```bash
cd /mnt/e/CodelocalLLM/applicationtracker

# Änderungen im Frontend gemacht?
./deploy_frontend.sh

# ✨ Frontend in ~30 Sekunden live!
```

---

## 📁 Deployment-Dateien Übersicht

```
applicationtracker/
├── backend/
│   ├── Procfile                    # Railway Startbefehl
│   ├── railway.json                # Railway Konfiguration
│   ├── runtime.txt                 # Python Version
│   ├── alembic.ini                 # Alembic Konfiguration
│   ├── alembic/
│   │   ├── env.py                  # Alembic Environment
│   │   └── versions/
│   │       └── 20260117_initial_tables.py  # Migration
│   └── .env                        # Lokale Entwicklung
│
├── frontend/
│   ├── .env.production             # Produktion Backend-URL
│   └── public/
│       └── .htaccess               # SPA Routing
│
├── create_github_repo.sh           # GitHub Setup (einmalig)
├── deploy_frontend.sh              # Frontend Deployment
├── test_deployment.sh              # Deployment Tests
├── RAILWAY_SETUP.md                # Railway Detailanleitunganleitung
└── DEPLOYMENT.md                   # Diese Datei
```

---

## 🔧 Troubleshooting

### Backend deployt nicht (Railway)

**Symptom**: 502 Error oder Service startet nicht

**Prüfen**:
1. Railway Dashboard → **Logs** Tab
2. Häufige Fehler:
   - Fehlende Dependencies: `pip install xyz` → `requirements.txt` updaten
   - Import Error: Falscher Pfad in Imports
   - Database Error: `DATABASE_URL` nicht gesetzt

**Fix**:
```bash
# Fix code lokal
git add .
git commit -m "Fix deployment issue"
git push  # Railway deployt neu
```

### Migrations schlagen fehl

**Symptom**: `alembic.util.exc.CommandError` in Railway Logs

**Prüfen**:
1. Railway → PostgreSQL → **Connect** → psql Terminal
2. Führe aus:
   ```sql
   \dt  -- Zeige Tabellen
   SELECT version_num FROM alembic_version;  -- Zeige Migration Version
   ```

**Fix**:
```bash
# Lokal testen
cd backend
alembic upgrade head

# Wenn erfolgreich:
git add .
git commit -m "Fix migration"
git push
```

### Frontend lädt nicht (404)

**Symptom**: `https://www.dabrock.info/applicationtracker/` → 404

**Prüfen**:
1. `.htaccess` wurde hochgeladen?
2. Pfad auf Strato korrekt?

**Fix**:
```bash
# Neu deployen
./deploy_frontend.sh

# Oder manuell prüfen:
curl -I https://www.dabrock.info/applicationtracker/
```

### API Calls schlagen fehl (CORS)

**Symptom**: Browser Console: `CORS policy: No 'Access-Control-Allow-Origin' header`

**Prüfen**:
1. Railway → Variables → `ALLOWED_ORIGINS`
2. Muss enthalten: `https://www.dabrock.info`

**Fix**:
```bash
# Railway Dashboard
# Variables → Edit ALLOWED_ORIGINS
# Hinzufügen: https://www.dabrock.info
# Service neu starten (Redeploy)
```

### pgvector Extension fehlt

**Symptom**: `ERROR: type "vector" does not exist`

**Prüfen**:
1. Railway → PostgreSQL → Connect → psql Terminal
2. Führe aus:
   ```sql
   \dx  -- Zeige Extensions
   ```

**Fix**:
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

Oder warte auf automatische Alembic Migration beim nächsten Deploy!

---

## 📊 Monitoring & Logs

### Railway Dashboard

- **Deployments**: Deployment History & Status
- **Logs**: Echtzeit-Logs (stdout/stderr)
- **Metrics**: CPU, RAM, Network Usage
- **Variables**: Environment Variables

### Log-Befehle

```bash
# Railway CLI installieren
npm install -g @railway/cli

# Login
railway login

# Logs anzeigen
railway logs

# Follow logs (live)
railway logs --follow
```

### Health Checks

```bash
# Backend
curl https://DEIN-SERVICE.up.railway.app/health
# Response: {"status":"healthy"}

# Frontend
curl -I https://www.dabrock.info/applicationtracker/
# Response: HTTP/2 200

# API Docs
open https://DEIN-SERVICE.up.railway.app/docs
```

---

## 💡 Best Practices

### Git Workflow

```bash
# Feature Branch erstellen
git checkout -b feature/neue-funktion

# Änderungen committen
git add .
git commit -m "feat: Neue Funktion XYZ"

# Zu main mergen
git checkout main
git merge feature/neue-funktion

# Pushen → Automatisches Deployment
git push
```

### Environment Variables

- ✅ **NIEMALS** Secrets in Git committen
- ✅ `.env` in `.gitignore`
- ✅ Secrets nur in Railway Dashboard setzen
- ✅ `.env.example` als Template committen

### Datenbank Backups

Railway macht automatisch Backups. Manuell:

```bash
# Railway Dashboard → PostgreSQL → Backups Tab
# Oder via CLI:
railway run -- pg_dump $DATABASE_URL > backup.sql
```

### Testing vor Production

```bash
# Lokal testen
cd backend
pytest  # Wenn Tests vorhanden

# Frontend build testen
cd frontend
npm run build
npm run preview  # Lokal preview

# Deployment testen
./test_deployment.sh
```

---

## 🎯 Deployment Checklist

### Vor dem ersten Deployment

- [ ] GitHub Repository erstellt (`./create_github_repo.sh`)
- [ ] Railway Projekt erstellt und mit GitHub verbunden
- [ ] PostgreSQL Service hinzugefügt
- [ ] pgvector Extension aktiviert
- [ ] Environment Variables gesetzt
- [ ] `.netrc` für SFTP erstellt
- [ ] Frontend `.env.production` konfiguriert

### Bei jedem Backend Update

- [ ] Lokal getestet
- [ ] Git committed und gepusht
- [ ] Railway Deployment abgewartet (5-10 min)
- [ ] Health Check erfolgreich
- [ ] API Docs erreichbar
- [ ] Logs geprüft (keine Errors)

### Bei jedem Frontend Update

- [ ] `npm run build` erfolgreich
- [ ] `./deploy_frontend.sh` ausgeführt
- [ ] Deployment verifiziert (HTTP 200)
- [ ] Browser getestet
- [ ] Console ohne Errors (F12)

---

## 🔗 Weiterführende Links

- **Railway Docs**: https://docs.railway.app
- **Alembic Docs**: https://alembic.sqlalchemy.org
- **pgvector**: https://github.com/pgvector/pgvector
- **FastAPI Deployment**: https://fastapi.tiangolo.com/deployment/

---

## 💰 Kosten

**Railway Hobby Plan**: $5/Monat
- 500 Stunden Execution Time
- 8 GB RAM
- 8 GB Disk
- PostgreSQL inklusive

**Strato SFTP**: Im bestehenden Webhosting enthalten

**Gesamt**: ~$5/Monat für komplette Anwendung

---

## ✨ Fertig!

Nach diesem Setup:
- ✅ Backend deployt automatisch bei jedem `git push`
- ✅ Frontend deployt mit einem Befehl: `./deploy_frontend.sh`
- ✅ Alembic Migrations laufen automatisch
- ✅ Keine manuellen psql-Befehle nötig
- ✅ Tests mit einem Befehl: `./test_deployment.sh`

**Live URLs**:
- Backend: `https://DEIN-SERVICE.up.railway.app`
- Frontend: `https://www.dabrock.info/applicationtracker/`
- API Docs: `https://DEIN-SERVICE.up.railway.app/docs`

🎉 **Automatisches Deployment ist aktiv!**
