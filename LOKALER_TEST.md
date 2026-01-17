# Lokaler Test - Application Tracker

Schnellstart zum lokalen Testen der Anwendung.

## 🚀 In 3 Schritten starten

### Schritt 1: PostgreSQL starten

Öffne ein **neues Terminal** (außerhalb von Claude Code):

```bash
sudo service postgresql start
```

### Schritt 2: Test-Daten erstellen

```bash
cd /mnt/e/CodelocalLLM/applicationtracker
./create_test_data.sh
```

Das erstellt 3 Test-ZIP-Dateien:
- ✅ `Allianz.zip` - Deutsche Bewerbung mit CV, Anschreiben, Zeugnis
- ✅ `SAP.zip` - Englische Bewerbung
- ✅ `Siemens.zip` - IoT-fokussierte Bewerbung

### Schritt 3: Anwendung starten

```bash
./start_local_test.sh
```

Das Skript:
1. ✅ Erstellt PostgreSQL Datenbank
2. ✅ Aktiviert pgvector Extension
3. ✅ Installiert Backend Dependencies
4. ✅ Erstellt Datenbank-Tabellen
5. ✅ Installiert Frontend Dependencies
6. ✅ Startet Backend (http://localhost:8000)
7. ✅ Startet Frontend (http://localhost:5173)

---

## 🎯 Anwendung testen

### 1. Frontend öffnen

Öffne in deinem Browser: **http://localhost:5173**

Du siehst:
- **Navbar** mit 3 Tabs: Übersicht, Chat, Upload
- **Footer**
- Aktuell noch keine Bewerbungen

### 2. Erste Bewerbung hochladen

1. Klicke auf **Upload** Tab
2. Drag & Drop oder klicke "Datei auswählen"
3. Wähle `test_data/Allianz.zip`
4. Firmenname: `Allianz`
5. Position: `Senior Backend Developer` (optional)
6. Klick **Hochladen**

✅ Nach ~5 Sekunden siehst du:
- ✅ 3 Dateien verarbeitet
- ✅ Zeichen extrahiert
- ✅ Document-Types erkannt (cv, cover_letter, other)

### 3. Übersicht anschauen

1. Klicke auf **Übersicht** Tab
2. Du siehst jetzt:
   - 1 Bewerbung: Allianz
   - Status: uploaded
   - 3 Dokumente
   - Erstellungsdatum

3. **Klicke auf die Zeile** um Details zu sehen:
   - Liste aller 3 Dokumente
   - Dateinamen und Typen
   - Status-Historie

### 4. Chat ausprobieren

1. Klicke auf **Chat** Tab
2. Probiere diese Prompts:

**Beispiel 1: Anzahl abfragen**
```
Wie viele Bewerbungen habe ich?
```
Antwort: "Du hast 1 Bewerbung in deinem System."

**Beispiel 2: Status ändern**
```
Status von Allianz auf Interview setzen
```
Antwort: ✅ Status automatisch geändert!

**Beispiel 3: Dokumente abfragen**
```
Welche Dokumente habe ich für Allianz?
```
Antwort: Liste der 3 Dokumente

**Beispiel 4: Inhalt zusammenfassen**
```
Fasse das CV von Allianz zusammen
```
Antwort: KI-generierte Zusammenfassung

### 5. Mehr Bewerbungen hochladen

Upload die anderen Test-ZIPs:
- `SAP.zip` → Position: "Cloud Engineer"
- `Siemens.zip` → Position: "IoT Developer"

Jetzt hast du 3 Bewerbungen zum Testen!

### 6. Report generieren

1. **Übersicht** → **Report erstellen** Button
2. Wähle Basis-Spalten:
   - ✅ Firmenname
   - ✅ Position
   - ✅ Status
   - ✅ Dokumenten-Anzahl
3. (Optional) Custom-Spalte hinzufügen:
   - Name: `match_score`
   - Prompt: "Bewerte die Passung meiner Bewerbung von 1-10"
   - Typ: Zahl
4. LLM Provider: `ollama` (lokal, kostenlos)
5. **Report generieren**

⚠️ **Hinweis**: Ohne Ollama wird ein Error kommen. Alternatives:
- Setze `GROK_API_KEY` oder `ANTHROPIC_API_KEY` in `.env`
- Wähle Provider "grok" oder "anthropic"

---

## 🔍 Was wird getestet?

### Backend (http://localhost:8000)

- ✅ **API Docs**: http://localhost:8000/docs
- ✅ **Health Check**: http://localhost:8000/health
- ✅ **Applications API**: GET /api/applications/overview
- ✅ **Upload API**: POST /api/upload/directory
- ✅ **Chat API**: POST /api/chat/message
- ✅ **Reports API**: POST /api/reports/generate

### Frontend (http://localhost:5173)

- ✅ **Routing**: Übersicht, Chat, Upload Seiten
- ✅ **Styling**: TailwindCSS, dabrock.info Design
- ✅ **Upload**: Drag & Drop, ZIP-Verarbeitung
- ✅ **Übersicht**: Tabelle mit Details
- ✅ **Chat**: Message-Input, Historie, Provider-Auswahl
- ✅ **Report**: Modal mit Custom-Spalten

### Datenbank (PostgreSQL)

- ✅ **Tabellen**: applications, documents, status_history, chat_messages
- ✅ **pgvector**: Embeddings werden gespeichert
- ✅ **CASCADE Delete**: Bewerbung löschen → Dokumente weg

---

## 🐛 Troubleshooting

### Backend startet nicht

**Error**: `ModuleNotFoundError: No module named 'fastapi'`

**Fix**:
```bash
cd backend
source venv/bin/activate
pip install -r requirements.txt
```

### Frontend zeigt leere Seite

**Check**: Browser Console (F12) auf Fehler prüfen

**Häufig**: API-URL falsch
```bash
cd frontend
cat .env  # Sollte leer sein für lokalen Test
```

### Chat antwortet nicht

**Ohne Ollama**: Nutze Grok oder Claude

1. `.env` bearbeiten:
   ```
   GROK_API_KEY=dein-api-key
   ```
2. Backend neustarten
3. Im Chat: Provider auf "grok" stellen

### ZIP-Upload schlägt fehl

**Check**: Sind es wirklich ZIP-Dateien?
```bash
file test_data/Allianz.zip
# Output: Allianz.zip: Zip archive data
```

**Check**: Backend Logs im Terminal

---

## 📸 Screenshots-Tour

### 1. Upload-Seite
- Drag & Drop Zone
- Firmenname & Position Inputs
- Upload-Button
- Success-Message mit verarbeiteten Dateien

### 2. Übersicht-Seite
- **Header**: "Bewerbungs-Übersicht", Report-Button
- **Stats-Cards**: Gesamt, Status-Verteilung
- **Tabelle**: Firma, Position, Status, Dokumente, Erstellt, Aktionen
- **Expandable Rows**: Dokumente-Liste, Status-Historie

### 3. Chat-Seite
- **Header**: "Chat", Provider-Auswahl, Clear-Button
- **Messages**: User (blau), Assistant (grau)
- **Input**: Textarea mit Senden-Button
- **Beispiele**: Bei leerem Chat

### 4. Report-Window
- **Basis-Spalten**: Checkboxen für Standardspalten
- **Custom-Spalten**: Formular zum Hinzufügen
- **Generate-Button**: Erstellt Report
- **Tabelle**: Dynamische Spalten, CSV-Download

---

## ✋ Beenden

Im Terminal wo Backend/Frontend läuft:

```
Ctrl + C
```

Das stoppt beide Services.

PostgreSQL läuft weiter (das ist okay für nächstes Mal).

---

## 🔄 Nächster Test

Beim nächsten Mal:

```bash
# PostgreSQL sollte noch laufen
cd /mnt/e/CodelocalLLM/applicationtracker
./start_local_test.sh
```

Datenbank bleibt erhalten - deine Test-Bewerbungen sind noch da!

---

## 🎉 Fertig getestet?

Wenn alles funktioniert, bist du bereit für:

1. **GitHub Push**: `./create_github_repo.sh`
2. **Railway Deployment**: Siehe `RAILWAY_SETUP.md`
3. **Frontend Deployment**: `./deploy_frontend.sh`

Viel Erfolg! 🚀
