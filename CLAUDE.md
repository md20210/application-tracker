# CLAUDE.md – Job Application Tracking System

## Project Overview

Build a personal job application tracking system with RAG-powered chat interface. The system manages job applications, stores related documents, and provides intelligent analysis through a conversational UI.

**Owner**: Single user (admin), personal use only  
**Deployment Target**: Railway (all services)  
**Language**: All code, comments, and responses in English

---

## Functional Requirements

### System Purpose

This system helps a job seeker (the admin) manage their entire job application process in one place:
- Track which companies they've applied to and the current status
- Store all related documents (CVs, cover letters, job descriptions, emails)
- Get AI-powered insights by asking questions in natural language
- See an overview of their application pipeline at a glance

### User Roles

| Role | Access | Capabilities |
|------|--------|--------------|
| **Admin** | Password protected | Full access: upload, edit, delete, chat, analyze |
| **Guest** | No login required | Read-only: view dashboard stats, use chat (limited) |

### Core Use Cases

#### UC1: Track a New Application
**Actor**: Admin  
**Goal**: Record a new job application in the system

**Flow**:
1. Admin logs in with password
2. Admin navigates to "Applications" or uses chat
3. Admin enters: Company name, Job title, Application method, Date applied
4. System creates company record (if new) and application record
5. System confirms with application ID and current status "applied"

**Alternative**: Admin can say in chat "I just applied to Ciklum for Enterprise Architect via LinkedIn" and the system extracts and stores the data.

---

#### UC2: Update Application Status
**Actor**: Admin  
**Goal**: Change status when application progresses (e.g., got interview invitation)

**Flow**:
1. Admin finds application (via table or chat)
2. Admin changes status from dropdown OR types in chat "Update Ciklum to 1st interview"
3. System logs the change with timestamp in status history
4. System confirms the update

**Status Progression Example**:
```
researching → preparing → applied → screening → phone_interview → 
1st_interview → 2nd_interview → technical_test → final_interview → 
offer → negotiating → accepted/rejected/declined/withdrawn/ghosted
```

---

#### UC3: Upload Application Documents
**Actor**: Admin  
**Goal**: Store CV, cover letter, job description, or other documents for a company

**Flow**:
1. Admin navigates to Upload page
2. Admin selects file(s) via drag-drop or file picker
3. Admin selects company (autocomplete from existing, or create new)
4. Admin selects document type (CV, cover letter, job description, etc.)
5. System extracts text from document
6. System chunks text and generates embeddings
7. System indexes document for search
8. System confirms upload with document ID

**Supported Files**: PDF, DOCX, TXT, MD, EML (emails)

---

#### UC4: Ask Questions via Chat
**Actor**: Admin or Guest  
**Goal**: Get information or insights about applications through natural conversation

**Example Queries and Expected Behavior**:

| User Query | System Should |
|------------|---------------|
| "How many applications do I have?" | Count from database, return number |
| "Show all rejected applications" | Query by status, return list |
| "What's the status at Elastic?" | Find company, return current status |
| "Which jobs match my CV best?" | Vector search CV against job descriptions, rank by similarity |
| "Summarize the Ciklum job description" | Retrieve document, generate summary |
| "What salary ranges have I seen?" | Aggregate salary data, show range/average |
| "Why was I rejected by Company X?" | Find rejection email, extract reasons if stated |
| "Compare the requirements of my top 3 applications" | Retrieve job descriptions, analyze differences |
| "What should I prepare for my Confluent interview?" | Find job description + company info, suggest prep topics |
| "Update JetBrains to technical test scheduled for Monday" | Extract intent, update status, add note |

**Chat Memory**: The system remembers the entire conversation. User can say "As we discussed earlier..." and system will reference previous messages.

---

#### UC5: View Application Dashboard
**Actor**: Admin or Guest  
**Goal**: See overview of all applications at a glance

**Dashboard Shows**:
- **Pipeline Visualization**: How many applications in each status (funnel or kanban)
- **Key Stats**: Total applications, Active (not rejected/closed), Interviews this week
- **Recent Activity**: Last 10 status changes with timestamps
- **Quick Actions**: Buttons to add application, upload document, open chat

---

#### UC6: Search Documents
**Actor**: Admin or Guest  
**Goal**: Find specific information across all stored documents

**Search Capabilities**:
- **Keyword Search**: Find documents containing specific terms
- **Fuzzy Search**: Find documents even with typos ("arcitect" finds "architect")
- **Filtered Search**: By company, document type, date range
- **Semantic Search**: Find conceptually similar content ("remote work policy" finds "work from home options")

---

#### UC7: Analyze Application Patterns
**Actor**: Admin  
**Goal**: Get insights across all applications

**Example Analyses**:
- "What's my application success rate?" → Calculate: offers / total applied
- "How long does it take to hear back on average?" → Analyze time between status changes
- "Which industries respond fastest?" → Group by industry, compare response times
- "What skills appear most in job descriptions?" → Extract and count skill keywords
- "Show my salary expectations vs. what companies offer" → Compare stored data

---

#### UC8: Export Data
**Actor**: Admin  
**Goal**: Get data out of the system for external use

**Export Options**:
- Applications table as CSV
- Full data backup as JSON
- Chat history as text file

---

### Business Rules

1. **One application per job per company**: Cannot create duplicate applications for same position at same company
2. **Company names are normalized**: "Ciklum" and "ciklum" are the same company
3. **Status changes are logged**: Every status change is recorded with timestamp for analytics
4. **Documents belong to companies**: Every document (except general CVs) must be linked to a company
5. **Chat context is session-based**: Each browser session has its own chat history
6. **Admin actions require authentication**: Uploads, edits, deletes always require password
7. **No data leaves the system**: Except for LLM API calls when local model insufficient

---

### Response Behavior

The AI assistant adapts its response format to the query:

| Query Type | Response Format |
|------------|-----------------|
| Single fact ("What's the status at X?") | One sentence |
| List request ("Show all interviews") | Bullet list or table |
| Count/stats ("How many...") | Number with brief context |
| Analysis ("Compare...", "Why...") | 2-3 paragraphs with reasoning |
| Action request ("Update...", "Add...") | Confirmation + what was changed |
| Ambiguous query | Clarifying question (max 1) |

**Never**: Respond with rigid 5-part structure, repeat information unnecessarily, make up data not in the system.

---

### Error Handling

| Situation | System Response |
|-----------|-----------------|
| Company not found | "I don't have any records for [Company]. Would you like to add them?" |
| Document parsing fails | "I couldn't read that file. Please try PDF or DOCX format." |
| No relevant results | "I couldn't find information about [topic]. Try uploading related documents." |
| LLM timeout | Retry with fallback model, then apologize and suggest retry |
| Invalid status | "That's not a valid status. Valid options are: [list]" |
| Unauthorized action | "You need to log in as admin to [action]." |

---

## Technology Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| Database | PostgreSQL 16 + pgvector extension | Structured data, vector embeddings, chat history |
| Search | Elasticsearch 8.x | Full-text search, fuzzy matching, hybrid queries |
| Orchestration | n8n (self-hosted) | Workflows, webhooks, API routing |
| Local LLM | Ollama (CPU mode) | Free inference for simple tasks |
| LLM Router | LiteLLM Proxy | Token counting, model selection, fallbacks |
| Web UI | Streamlit | Login, dashboard, chat interface |
| Containerization | Docker Compose | Local dev and Railway deployment |

### External APIs (fallback only)
- Anthropic Claude API (complex analysis)
- xAI Grok API (creative suggestions)
- Google Gemini API (embeddings)

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         RAILWAY                                  │
│  ┌───────────┐    ┌───────────┐    ┌───────────┐               │
│  │ Streamlit │───▶│    n8n    │───▶│  LiteLLM  │               │
│  │    UI     │    │ Workflows │    │   Proxy   │               │
│  └───────────┘    └─────┬─────┘    └─────┬─────┘               │
│                         │                 │                      │
│         ┌───────────────┼─────────────────┤                      │
│         ▼               ▼                 ▼                      │
│  ┌────────────┐  ┌────────────┐    ┌───────────┐               │
│  │ PostgreSQL │  │Elasticsearch│    │  Ollama   │               │
│  │ + pgvector │  │            │    │ (CPU)     │               │
│  └────────────┘  └────────────┘    └───────────┘               │
│                                           │                      │
└───────────────────────────────────────────┼──────────────────────┘
                                            │ fallback
                              ┌─────────────┴─────────────┐
                              ▼             ▼             ▼
                         [Claude]       [Grok]       [Gemini]
```

---

## Database Schema

### PostgreSQL Tables

**Table: `companies`**
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PRIMARY KEY | Auto-increment ID |
| name | VARCHAR(255) | UNIQUE, NOT NULL | Company name |
| website | VARCHAR(500) | | Company website URL |
| industry | VARCHAR(100) | | Industry sector |
| location | VARCHAR(255) | | HQ or job location |
| notes | TEXT | | General notes |
| created_at | TIMESTAMP | DEFAULT NOW() | Record creation |
| updated_at | TIMESTAMP | DEFAULT NOW() | Last modification |

**Table: `applications`**
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PRIMARY KEY | Auto-increment ID |
| company_id | INTEGER | FOREIGN KEY → companies(id) | Link to company |
| job_title | VARCHAR(255) | NOT NULL | Position applied for |
| status | VARCHAR(50) | NOT NULL, DEFAULT 'researching' | Current status |
| application_method | VARCHAR(50) | | How applied |
| applied_date | DATE | | When applied |
| salary_min | INTEGER | | Minimum salary (EUR) |
| salary_max | INTEGER | | Maximum salary (EUR) |
| remote_option | VARCHAR(20) | | 'remote', 'hybrid', 'onsite' |
| contact_person | VARCHAR(255) | | Recruiter/hiring manager |
| contact_email | VARCHAR(255) | | Contact email |
| job_url | VARCHAR(500) | | Original job posting URL |
| notes | TEXT | | Application-specific notes |
| created_at | TIMESTAMP | DEFAULT NOW() | |
| updated_at | TIMESTAMP | DEFAULT NOW() | |

**Valid status values**: 'researching', 'preparing', 'applied', 'screening', 'phone_interview', '1st_interview', '2nd_interview', 'technical_test', 'final_interview', 'offer', 'negotiating', 'accepted', 'rejected', 'declined', 'withdrawn', 'ghosted'

**Valid application_method values**: 'company_portal', 'linkedin', 'email', 'referral', 'recruiter', 'job_board', 'other'

**Table: `documents`**
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PRIMARY KEY | |
| company_id | INTEGER | FOREIGN KEY → companies(id) | Can be NULL for general docs |
| application_id | INTEGER | FOREIGN KEY → applications(id) | Can be NULL |
| doc_type | VARCHAR(50) | NOT NULL | Document category |
| filename | VARCHAR(255) | NOT NULL | Original filename |
| content | TEXT | NOT NULL | Extracted text content |
| embedding | VECTOR(1536) | | Document embedding |
| file_path | VARCHAR(500) | | Storage path if kept |
| created_at | TIMESTAMP | DEFAULT NOW() | |

**Valid doc_type values**: 'cv', 'cover_letter', 'job_description', 'rejection_email', 'offer_letter', 'contract', 'notes', 'correspondence', 'other'

**Table: `document_chunks`**
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PRIMARY KEY | |
| document_id | INTEGER | FOREIGN KEY → documents(id) | Parent document |
| chunk_index | INTEGER | NOT NULL | Position in document |
| content | TEXT | NOT NULL | Chunk text |
| embedding | VECTOR(1536) | | Chunk embedding |
| char_start | INTEGER | | Start position in original |
| char_end | INTEGER | | End position in original |

**Table: `chat_sessions`**
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PRIMARY KEY | |
| session_token | VARCHAR(100) | UNIQUE, NOT NULL | Session identifier |
| is_admin | BOOLEAN | DEFAULT FALSE | Admin privileges |
| created_at | TIMESTAMP | DEFAULT NOW() | |
| last_activity | TIMESTAMP | DEFAULT NOW() | |

**Table: `chat_messages`**
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PRIMARY KEY | |
| session_id | INTEGER | FOREIGN KEY → chat_sessions(id) | |
| role | VARCHAR(20) | NOT NULL | 'user' or 'assistant' |
| content | TEXT | NOT NULL | Message text |
| embedding | VECTOR(1536) | | For semantic search |
| tokens_used | INTEGER | | Token count |
| model_used | VARCHAR(100) | | Which LLM responded |
| created_at | TIMESTAMP | DEFAULT NOW() | |

**Table: `status_history`**
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PRIMARY KEY | |
| application_id | INTEGER | FOREIGN KEY → applications(id) | |
| old_status | VARCHAR(50) | | Previous status |
| new_status | VARCHAR(50) | NOT NULL | New status |
| changed_at | TIMESTAMP | DEFAULT NOW() | |
| notes | TEXT | | Reason for change |

### Elasticsearch Index

**Index: `documents`**
```json
{
  "mappings": {
    "properties": {
      "document_id": { "type": "integer" },
      "company_id": { "type": "integer" },
      "company_name": { "type": "text", "analyzer": "standard" },
      "doc_type": { "type": "keyword" },
      "content": { 
        "type": "text", 
        "analyzer": "english",
        "fields": {
          "keyword": { "type": "keyword", "ignore_above": 256 }
        }
      },
      "filename": { "type": "text" },
      "created_at": { "type": "date" }
    }
  }
}
```

---

## Authentication

**Method**: Simple password authentication (personal use)

**Admin Password**: `admin1002`

**Implementation**:
- Streamlit: Session state with password check on login page
- n8n Webhooks: Check `Authorization` header or `password` field in POST body
- Non-admin users: Read-only access to chat (no uploads, no status changes)

**Session Management**:
- Generate session token on successful login
- Store in `chat_sessions` table with `is_admin` flag
- Session expires after 24 hours of inactivity

---

## n8n Workflows

Create these workflows as importable JSON files:

### Workflow 1: Document Upload
**Trigger**: Webhook POST `/api/upload`  
**Auth**: Required (admin only)  
**Input**: Multipart form with file + metadata (company_name, doc_type)

**Steps**:
1. Validate authentication
2. Extract file from request
3. Parse file content (use appropriate node for PDF/DOCX/TXT)
4. Create or find company in database
5. Store document in `documents` table
6. Chunk content (600-1000 chars, 25% overlap)
7. For each chunk: generate embedding via LiteLLM → Ollama/Gemini
8. Store chunks with embeddings in `document_chunks`
9. Index full document in Elasticsearch
10. Return success response with document ID

### Workflow 2: Chat Query
**Trigger**: Webhook POST `/api/chat`  
**Auth**: Optional (determines capabilities)  
**Input**: JSON with `message`, `session_token`

**Steps**:
1. Validate or create session
2. Store user message in `chat_messages`
3. Generate embedding for user message
4. Retrieve context:
   - Semantic search on `document_chunks` (top 10 relevant)
   - Semantic search on `chat_messages` for this session (all history)
   - Query `applications` table if status-related keywords detected
5. Build prompt with retrieved context
6. Send to LiteLLM (auto-routes to appropriate model)
7. Store assistant response in `chat_messages`
8. Return response

### Workflow 3: Status Update
**Trigger**: Webhook POST `/api/status`  
**Auth**: Required (admin only)  
**Input**: JSON with `application_id` or `company_name`, `new_status`, optional `notes`

**Steps**:
1. Validate authentication
2. Find application record
3. Log change to `status_history`
4. Update `applications` table
5. Return confirmation

### Workflow 4: Application Create/Update
**Trigger**: Webhook POST `/api/application`  
**Auth**: Required (admin only)  
**Input**: JSON with application details

**Steps**:
1. Validate authentication
2. Create company if not exists
3. Upsert application record
4. Return confirmation with IDs

### Workflow 5: Search Documents
**Trigger**: Webhook POST `/api/search`  
**Auth**: Optional  
**Input**: JSON with `query`, `filters` (doc_type, company, date_range)

**Steps**:
1. Build Elasticsearch query with filters
2. Execute search
3. Return results with highlights

### Workflow 6: Get Dashboard Data
**Trigger**: Webhook GET `/api/dashboard`  
**Auth**: Optional  
**Input**: None

**Steps**:
1. Count applications by status
2. Get recent activity (last 10 status changes)
3. Count documents by type
4. Return aggregated stats

---

## LiteLLM Configuration

**File**: `litellm_config.yaml`

Configure these models:

| Model Alias | Provider | Model ID | Use Case |
|-------------|----------|----------|----------|
| `local-fast` | Ollama | llama3.2:3b | Quick responses, simple queries |
| `local-balanced` | Ollama | mistral:7b | Medium complexity |
| `claude-haiku` | Anthropic | claude-3-5-haiku-latest | Fast external fallback |
| `claude-sonnet` | Anthropic | claude-sonnet-4-20250514 | Complex analysis |
| `grok` | xAI | grok-beta | Creative suggestions |
| `gemini-embed` | Google | text-embedding-004 | Embedding generation |

**Routing Rules**:
- Default to `local-fast` for all requests
- If token count > 4000 or complexity keywords detected: use `local-balanced`
- If Ollama fails or times out (>30s): fallback to `claude-haiku`
- If user explicitly requests deep analysis: use `claude-sonnet`
- For embeddings: prefer `local-fast`, fallback to `gemini-embed`

**Environment Variables Required**:
- `ANTHROPIC_API_KEY`
- `XAI_API_KEY`
- `GOOGLE_API_KEY`
- `OLLAMA_HOST` (internal: `http://ollama:11434`)

---

## Streamlit Application

**Style Reference**: https://www.dabrock.info/cv-matcher/login

### Pages

**1. Login Page** (`/`)
- Clean, centered login form
- Single password field
- "Remember me" checkbox (extends session to 7 days)
- Error message on wrong password
- Link to continue as guest (read-only mode)

**2. Dashboard** (`/dashboard`)
- Application pipeline visualization (kanban-style or funnel)
- Stats cards: Total applications, Active, Interviews scheduled, Offers
- Recent activity feed
- Quick actions: Add application, Upload document

**3. Chat** (`/chat`)
- Full-height chat interface
- Message history with timestamps
- Input field with send button
- Typing indicator while waiting for response
- Admin badge if logged in as admin
- Example prompts for new users

**4. Applications** (`/applications`)
- Filterable table of all applications
- Columns: Company, Position, Status, Applied Date, Salary Range, Actions
- Inline status dropdown for quick updates (admin only)
- Click row to expand details
- Export to CSV button

**5. Upload** (`/upload`) – Admin only
- Drag-and-drop file upload zone
- Company name input (autocomplete from existing)
- Document type dropdown
- Multiple file upload support
- Progress indicator
- Success/error feedback

**6. Settings** (`/settings`) – Admin only
- API key management (masked display)
- Database stats
- Clear chat history button
- Export all data button

### UI Requirements
- Responsive design (mobile-friendly)
- Dark mode default, light mode toggle
- Consistent color scheme (professional, not flashy)
- Loading states for all async operations
- Toast notifications for actions

---

## Document Processing

### Supported Formats
- PDF (extract text via PyPDF2 or pdfplumber)
- DOCX (extract via python-docx)
- TXT (direct read)
- MD (direct read)
- EML (parse email content)

### Chunking Strategy
- Target chunk size: 800 characters
- Overlap: 200 characters (25%)
- Preserve paragraph boundaries where possible
- Include metadata header in each chunk: `[Company: X | Doc: Y | Chunk: Z/N]`

### Embedding Generation
- Dimension: 1536 (compatible with most models)
- Batch processing: Up to 10 chunks per API call
- Retry logic: 3 attempts with exponential backoff

---

## Chat Behavior

### Context Retrieval
For each user message:
1. Generate embedding
2. Vector search `document_chunks`: Top 10 most similar
3. Full-text search Elasticsearch: Top 5 keyword matches
4. Retrieve ALL previous messages from current session
5. Query `applications` if status/company keywords detected

### Prompt Construction
```
System: You are a job application tracking assistant. You have access to the user's 
application data, documents, and conversation history. Be helpful, concise, and 
reference specific data when available.

Context Documents:
{retrieved_chunks}

Application Data:
{relevant_applications}

Conversation History:
{all_session_messages}

Current Query: {user_message}
```

### Response Guidelines
- Match response length to query complexity
- Simple questions → brief answers
- Analysis requests → structured but not rigid
- Always cite which documents/applications referenced
- Suggest next actions when appropriate
- Never invent data not in the system

---

## Deployment

### Docker Compose Structure
Create `docker-compose.yml` with these services:
- `postgres` (with pgvector)
- `elasticsearch`
- `n8n`
- `ollama`
- `litellm`
- `streamlit`

### Railway Configuration
Create `railway.toml` with:
- Service definitions for each container
- Environment variable references
- Health check endpoints
- Volume mounts for persistent data

### Environment Variables Template
Create `.env.example` with all required variables:
- Database credentials
- API keys (placeholder values)
- Service URLs
- Admin password

### Initialization
Create `init.sql` script that:
- Creates all tables
- Enables pgvector extension
- Creates indexes
- Inserts any seed data

---

## File Structure

```
job-tracker/
├── CLAUDE.md                 # This file
├── docker-compose.yml        # All services
├── railway.toml              # Railway deployment config
├── .env.example              # Environment template
├── init.sql                  # Database initialization
├── litellm_config.yaml       # LLM routing config
├── n8n/
│   └── workflows/
│       ├── document-upload.json
│       ├── chat-query.json
│       ├── status-update.json
│       ├── application-crud.json
│       ├── search.json
│       └── dashboard.json
├── streamlit/
│   ├── app.py                # Main entry point
│   ├── pages/
│   │   ├── 1_dashboard.py
│   │   ├── 2_chat.py
│   │   ├── 3_applications.py
│   │   ├── 4_upload.py
│   │   └── 5_settings.py
│   ├── components/
│   │   ├── auth.py
│   │   ├── api_client.py
│   │   └── ui_helpers.py
│   ├── static/
│   │   └── style.css
│   └── requirements.txt
└── README.md                 # Setup instructions
```

---

## Build Order

Execute in this sequence:

1. **Database setup**: Create `init.sql` with all tables, indexes, pgvector extension
2. **Docker Compose**: Define all services with proper networking and volumes
3. **LiteLLM config**: Create `litellm_config.yaml` with all model definitions
4. **n8n workflows**: Create all 6 workflow JSON files
5. **Streamlit app**: Build all pages and components
6. **Railway config**: Create `railway.toml` for deployment
7. **Documentation**: Create `README.md` with setup instructions

---

## Testing Checklist

Before considering complete, verify:

- [ ] PostgreSQL accepts connections and pgvector works
- [ ] Elasticsearch indexes and searches documents
- [ ] Ollama responds to completion requests
- [ ] LiteLLM routes requests correctly
- [ ] n8n workflows execute without errors
- [ ] Streamlit login works with correct password
- [ ] Document upload parses and chunks correctly
- [ ] Chat retrieves relevant context
- [ ] Status updates persist to database
- [ ] Dashboard shows accurate stats

---

## Notes for Claude Code

- Generate complete, production-ready files – not snippets
- Include error handling in all code
- Add comments explaining non-obvious logic
- Use type hints in Python code
- Follow PEP 8 style guidelines
- Test each component before moving to next
- If unsure about a requirement, implement the most practical solution
