# Navi Backend Database Architecture

## Overview

The Navi backend uses a **simplified SQLite-based architecture** designed for ease of development and deployment. This document explains the database schema, API endpoints, and how the system works.

## Database Technology

- **Database Engine**: SQLite 3
- **Database File**: `navi.db` (stored in the backend directory)
- **Server**: Custom HTTP server built with Python's built-in `http.server`
- **Port**: 8001 (http://localhost:8001)

## Database Schema

### Entity Relationship Diagram
```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  Personas   │    │  Agencies   │    │ Documents   │
├─────────────┤    ├─────────────┤    ├─────────────┤
│ id (PK)     │    │ id (PK)     │    │ id (PK)     │
│ name        │    │ name        │    │ document_id │
│ role        │    │ code (UK)   │    │ title       │
│ interests   │    └─────────────┘    │ text        │
│ created_at  │                       │ agency_id   │
└─────────────┘                       │ doc_type    │
         │                            │ web_links   │
         │                            │ embedding   │
         │                            │ posted_date │
         │                            │ created_at  │
         │                            └─────────────┘
         │                                     │
         │                                     │
         ▼                                     │
┌─────────────┐                               │
│  Comments   │                               │
├─────────────┤                               │
│ id (PK)     │                               │
│ persona_id  │◄──────────────────────────────┘
│ document_id │
│ title       │
│ text        │
│ status      │
│ created_at  │
└─────────────┘
```

### 1. Personas Table
Stores user personas for comment generation and management.

```sql
CREATE TABLE personas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    role TEXT,
    interests TEXT DEFAULT '[]',  -- JSON array stored as TEXT
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Fields:**
- `id`: Auto-incrementing primary key
- `name`: Persona name (required)
- `role`: Persona role/occupation
- `interests`: JSON array of interests (stored as TEXT)
- `created_at`: Timestamp when persona was created

### 2. Agencies Table
Stores government agencies that publish regulations.

```sql
CREATE TABLE agencies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL
);
```

**Fields:**
- `id`: Auto-incrementing primary key
- `name`: Full agency name (e.g., "Federal Communications Commission")
- `code`: Agency code (e.g., "FCC")

**Sample Data:**
- Federal Communications Commission (FCC)
- Environmental Protection Agency (EPA)
- Food and Drug Administration (FDA)

### 3. Documents Table
Stores regulatory documents from regulations.gov with embeddings for semantic search.

```sql
CREATE TABLE documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    document_id TEXT UNIQUE NOT NULL,      -- regulations.gov document ID
    title TEXT NOT NULL,
    text TEXT,                             -- Full document content
    agency_id TEXT,                        -- Agency code (FCC, EPA, etc.)
    document_type TEXT,                    -- Rule, Proposed Rule, Notice, etc.
    web_comment_link TEXT,                 -- Link to submit comments
    web_document_link TEXT,                -- Link to view document
    web_docket_link TEXT,                  -- Link to docket
    docket_id TEXT,                        -- Docket identifier
    embedding TEXT,                        -- JSON array of embedding vectors
    posted_date TIMESTAMP,                 -- When document was posted
    comment_end_date TIMESTAMP,            -- When comment period ends
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Fields:**
- `id`: Auto-incrementing primary key
- `document_id`: Unique identifier from regulations.gov (e.g., "APHIS-2025-0028-0001")
- `title`: Document title
- `text`: Full document text content
- `agency_id`: Agency code (references agencies.code)
- `document_type`: Type of document (Rule, Proposed Rule, Notice, Guidance, etc.)
- `web_comment_link`: URL to submit public comments
- `web_document_link`: URL to view the full document
- `web_docket_link`: URL to view the docket
- `docket_id`: Docket identifier
- `embedding`: JSON array of embedding vectors for semantic search
- `posted_date`: When the document was originally posted to regulations.gov
- `comment_end_date`: When the public comment period ends (if applicable)
- `created_at`: When the document was added to our database

### 4. Comments Table
Stores user-generated comments on regulatory documents.

```sql
CREATE TABLE comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    persona_id INTEGER,                    -- References personas.id
    document_id TEXT NOT NULL,             -- References documents.document_id
    title TEXT,
    content TEXT NOT NULL,
    status TEXT DEFAULT 'draft',           -- draft, submitted, approved, etc.
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (persona_id) REFERENCES personas (id)
);
```

**Fields:**
- `id`: Auto-incrementing primary key
- `persona_id`: Foreign key to personas table
- `document_id`: Document ID (references documents.document_id)
- `title`: Comment title
- `content`: Comment content
- `status`: Comment status (draft, submitted, approved, etc.)
- `created_at`: When the comment was created

## API Endpoints

### Health Check
- **GET** `/health`
- **Response**: `{"status": "healthy", "timestamp": "2025-01-01T00:00:00"}`

### Document Operations

#### Get All Documents
- **GET** `/documents?limit=10&offset=0`
- **Response**: Array of document objects
- **Default limit**: 10 documents

#### Get Specific Document
- **GET** `/documents/{document_id}`
- **Response**: Single document object or 404

#### Search Documents
- **GET** `/documents/search?q=search_term&limit=10`
- **Response**: `{"query": "search_term", "results": [...]}`

#### Upload Documents (Bulk)
- **POST** `/api/upload`
- **Body**: `{"documents": [...]}`
- **Response**: `{"success": true, "inserted": 5, "updated": 2, "total_processed": 7, "errors": []}`

**Document Format Requirements:**
```json
{
  "documentId": "CMS-2025-0834-0001",
  "title": "Document Title",
  "content": "Document content...",
  "agencyId": "CMS",
  "documentType": "Notice",
  "postedDate": "2025-09-09T04:00:00Z",
  "commentEndDate": "2025-11-08T04:59:59Z",
  "webCommentLink": "https://www.regulations.gov/comment/...",
  "webDocumentLink": "https://www.regulations.gov/document/...",
  "webDocketLink": "https://www.regulations.gov/docket/...",
  "docketId": "CMS-2025-0834",
  "embedding": [0.024682991, 0.008533115, ...]
}
```

**Date Format:** ISO 8601 format (e.g., "2025-09-09T04:00:00Z")

#### Clear All Documents
- **POST** `/documents/clear`
- **Body**: `{}`
- **Response**: `{"success": true, "deleted_count": 100, "timestamp": "2025-01-01T00:00:00"}`

### Persona Operations

#### Create Persona
- **POST** `/personas`
- **Body**: `{"name": "John Doe", "role": "Environmental Advocate", "interests": ["clean air", "climate change"]}`
- **Response**: Created persona object

#### Get Persona
- **GET** `/personas/{persona_id}`
- **Response**: Persona object or 404

### Comment Operations

#### Create Comment
- **POST** `/comments?persona_id=1`
- **Body**: `{"document_id": "FCC-2025-001", "title": "My Comment", "content": "Comment text"}`
- **Response**: Created comment object

#### Get Comment
- **GET** `/comments/{comment_id}`
- **Response**: Comment object or 404

## Data Flow

### 1. Document Ingestion
```
Regulations.gov API → Frontend Fetch → Local Storage → Upload to Database
```

1. Frontend fetches documents from regulations.gov API
2. Documents are stored in browser localStorage
3. User clicks "Upload to Database" in Settings page
4. Frontend sends documents to `/api/upload` endpoint
5. Backend processes and stores documents with embeddings

### 2. Comment Generation
```
User Input → Persona Selection → Document Selection → Comment Generation → Database Storage
```

1. User selects a persona and document
2. System generates comment using AI (Ollama)
3. Comment is stored in database linked to persona and document

### 3. Date Field Processing
```
API Data → Frontend Processing → Database Storage
```

1. API returns `postedDate` and `commentEndDate` in ISO 8601 format
2. Frontend calculates `withinCommentPeriod` based on current date vs `commentEndDate`
3. Database stores dates as TIMESTAMP fields for querying and filtering

### 4. Search and Retrieval
```
User Query → Database Search → Results Display
```

1. User searches for documents
2. Backend performs text-based search on title and text
3. Results are returned and displayed

## Key Features

### Embeddings Support
- Documents include embedding vectors for semantic search
- Embeddings are stored as JSON arrays in the `embedding` field
- Enables similarity-based document retrieval

### Comment Period Tracking
- `posted_date`: Tracks when documents were originally published
- `comment_end_date`: Tracks when public comment periods end
- Frontend calculates `withinCommentPeriod` based on current date vs `comment_end_date`
- Enables filtering and highlighting of documents with active comment periods

### Upsert Behavior
- Upload operations use upsert logic (insert or update)
- Prevents duplicate documents based on `document_id`
- Tracks inserted vs updated counts

### CORS Support
- All endpoints include proper CORS headers
- Supports preflight OPTIONS requests
- Allows cross-origin requests from frontend

### Error Handling
- Comprehensive error logging
- Detailed error responses
- Graceful fallbacks for network issues

## Database Management

### Initialization
The database is automatically initialized when the server starts:
```python
def init_db():
    # Creates all tables
    # Inserts sample data
    # Sets up foreign key constraints
```

### Sample Data
The system includes sample data for testing:
- 3 sample agencies (FCC, EPA, FDA)
- 3 sample documents
- Ready-to-use test data

### Backup and Recovery
- Database file: `backend/navi.db`
- Simple file-based backup (copy the .db file)
- No complex backup procedures needed

## Development Notes

### Why SQLite?
- **Simplicity**: No external database server required
- **Portability**: Single file database
- **Performance**: Fast for read-heavy workloads
- **Development**: Easy to inspect and debug

### Limitations
- **Concurrency**: Limited concurrent write performance
- **Scalability**: Not suitable for high-traffic production
- **Features**: No advanced features like stored procedures

### Future Considerations
- **PostgreSQL**: For production deployment
- **Vector Database**: For advanced embedding search (ChromaDB, Pinecone)
- **Caching**: Redis for improved performance
- **Full-text Search**: Elasticsearch for advanced search capabilities

## Testing

### Manual Testing
Use the provided curl commands in `database_test_commands.md`:

```bash
# Health check
curl -s http://localhost:8001/health

# Get documents
curl -s http://localhost:8001/documents

# Upload test data
curl -X POST http://localhost:8001/api/upload \
  -H "Content-Type: application/json" \
  -d '{"documents": [{"documentId": "TEST-001", "title": "Test", "text": "Test content"}]}'
```

### Database Inspection
```bash
# View schema
sqlite3 backend/navi.db ".schema"

# View all documents
sqlite3 backend/navi.db "SELECT * FROM documents;"

# Count documents
sqlite3 backend/navi.db "SELECT COUNT(*) FROM documents;"
```

## Troubleshooting

### Common Issues

1. **"Load failed" errors**: Usually CORS issues - check OPTIONS request handling
2. **Wrong document count**: Frontend might be using default limit of 10
3. **Upload failures**: Check network connectivity and data format
4. **Database locked**: Ensure only one server instance is running
5. **Missing date fields**: Ensure `postedDate` and `commentEndDate` are included in document uploads
6. **Comment period not showing**: Check that `commentEndDate` is properly formatted (ISO 8601)

### Debug Commands
```bash
# Check server status
curl -s http://localhost:8001/health

# Test CORS
curl -X OPTIONS http://localhost:8001/api/upload -v

# Check database file
ls -la backend/navi.db

# View recent server logs
# Check terminal where server is running
```

## File Structure

```
backend/
├── README.md                 # This file
├── simple_main.py           # Main server implementation
├── simple_schema.sql        # PostgreSQL schema (reference)
├── main.py                  # FastAPI server (alternative)
├── navi.db                  # SQLite database file
├── requirements.txt         # Python dependencies
└── venv/                    # Python virtual environment
```

## Dependencies

- **Python 3.13+**
- **sqlite3** (built-in)
- **json** (built-in)
- **http.server** (built-in)
- **urllib.parse** (built-in)
- **datetime** (built-in)

No external database dependencies required!

## Quick Reference

### Start Server
```bash
cd backend
python simple_main.py
```

### Common Queries
```sql
-- Count all documents
SELECT COUNT(*) FROM documents;

-- Find documents by agency
SELECT * FROM documents WHERE agency_id = 'FCC';

-- Get recent documents
SELECT * FROM documents ORDER BY posted_date DESC LIMIT 10;

-- Find documents with active comment periods
SELECT * FROM documents 
WHERE comment_end_date > datetime('now') 
ORDER BY comment_end_date ASC;

-- Find documents with comment periods ending soon (within 7 days)
SELECT * FROM documents 
WHERE comment_end_date BETWEEN datetime('now') AND datetime('now', '+7 days')
ORDER BY comment_end_date ASC;

-- Find comments by persona
SELECT c.*, p.name as persona_name 
FROM comments c 
JOIN personas p ON c.persona_id = p.id;
```

### API Quick Test
```bash
# Health check
curl http://localhost:8001/health

# Get 5 documents
curl "http://localhost:8001/documents?limit=5"

# Search for "broadband"
curl "http://localhost:8001/documents/search?q=broadband"
```

### Database File Location
- **Development**: `backend/navi.db`
- **Size**: Typically 1-10MB depending on document count
- **Backup**: Simply copy the `.db` file
