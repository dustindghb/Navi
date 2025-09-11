# Database API Test Commands

This document contains curl commands to test the Navi database API endpoints.

## Prerequisites
- Backend server running on `http://localhost:8001`
- SQLite database file `navi.db` in the backend directory

## Health Check
```bash
# Check if the API server is running
curl -s http://localhost:8001/health
```

## Document Operations

### Get All Documents
```bash
# Get all documents (default limit: 10)
curl -s http://localhost:8001/documents

# Get documents with custom limit and offset
curl -s "http://localhost:8001/documents?limit=5&offset=0"
```

### Get Specific Document
```bash
# Get a specific document by ID
curl -s http://localhost:8001/documents/FCC-2025-001
```

### Search Documents
```bash
# Search documents by title or content
curl -s "http://localhost:8001/documents/search?q=broadband&limit=5"
```

### Bulk Insert Documents
```bash
# Insert multiple documents at once
curl -X POST http://localhost:8001/documents/bulk \
  -H "Content-Type: application/json" \
  -d '{
    "documents": [
      {
        "documentId": "TEST-001",
        "title": "Test Document 1",
        "content": "This is a test document for bulk insertion",
        "agencyId": "TEST",
        "documentType": "Test Rule",
        "webCommentLink": "https://test.com/comment/1",
        "webDocumentLink": "https://test.com/doc/1",
        "postedDate": "2025-01-01"
      },
      {
        "documentId": "TEST-002",
        "title": "Test Document 2",
        "content": "Another test document for bulk insertion",
        "agencyId": "TEST",
        "documentType": "Proposed Rule",
        "webCommentLink": "https://test.com/comment/2",
        "webDocumentLink": "https://test.com/doc/2",
        "postedDate": "2025-01-02"
      }
    ]
  }'
```

### Clear All Documents
```bash
# Clear all documents from the database
curl -X POST http://localhost:8001/documents/clear \
  -H "Content-Type: application/json" \
  -d '{}'
```

### Upload API Data with Embeddings
```bash
# Upload API data with embeddings (new endpoint)
curl -X POST http://localhost:8001/api/upload \
  -H "Content-Type: application/json" \
  -d '{
    "documents": [
      {
        "documentId": "APHIS-2025-0028-0001",
        "title": "Agency Information Collection Activities; Proposals, Submissions, and Approvals: Conditions for Payment of Avian Influenza Indemnity Claims",
        "content": "The document includes notices from three different agencies...",
        "docketId": "APHIS-2025-0028",
        "agencyId": "APHIS",
        "documentType": "Notice",
        "webDocumentLink": "https://www.regulations.gov/document/APHIS-2025-0028-0001",
        "webDocketLink": "https://www.regulations.gov/docket/APHIS-2025-0028",
        "webCommentLink": "https://www.regulations.gov/comment/APHIS-2025-0028-0001",
        "embedding": [0.014316704, 0.038578693, 0.044315398, 0.04937572, -0.02403653]
      }
    ]
  }'
```

## Persona Operations

### Create Persona
```bash
# Create a new persona
curl -X POST http://localhost:8001/personas \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "role": "Environmental Advocate",
    "interests": ["clean air", "climate change", "renewable energy"]
  }'
```

### Get Persona
```bash
# Get a specific persona by ID
curl -s http://localhost:8001/personas/1
```

## Comment Operations

### Create Comment
```bash
# Create a new comment for a persona and document
curl -X POST "http://localhost:8001/comments?persona_id=1" \
  -H "Content-Type: application/json" \
  -d '{
    "document_id": "TEST-001",
    "title": "My Comment on Test Document",
    "content": "This is my comment on the test document. I have concerns about..."
  }'
```

### Get Comment
```bash
# Get a specific comment by ID
curl -s http://localhost:8001/comments/1
```

## Database Status Commands

### Check Document Count
```bash
# Count total documents
curl -s http://localhost:8001/documents | jq length
```

### Check Database File
```bash
# Check if database file exists and its size
ls -la backend/navi.db

# Check database schema
sqlite3 backend/navi.db ".schema"
```

### View All Tables
```bash
# List all tables in the database
sqlite3 backend/navi.db ".tables"
```

### View Table Contents
```bash
# View all documents
sqlite3 backend/navi.db "SELECT * FROM documents;"

# View all personas
sqlite3 backend/navi.db "SELECT * FROM personas;"

# View all comments
sqlite3 backend/navi.db "SELECT * FROM comments;"
```

## Testing Workflow

### Complete Test Sequence
```bash
# 1. Check server health
curl -s http://localhost:8001/health

# 2. Clear existing data
curl -X POST http://localhost:8001/documents/clear \
  -H "Content-Type: application/json" -d '{}'

# 3. Insert test documents
curl -X POST http://localhost:8001/documents/bulk \
  -H "Content-Type: application/json" \
  -d '{
    "documents": [
      {
        "documentId": "WORKFLOW-TEST-001",
        "title": "Workflow Test Document",
        "content": "This document is used for testing the complete workflow",
        "agencyId": "WORKFLOW-TEST",
        "documentType": "Test Rule",
        "webCommentLink": "https://workflow-test.com/comment",
        "webDocumentLink": "https://workflow-test.com/doc",
        "postedDate": "2025-01-01"
      }
    ]
  }'

# 4. Verify insertion
curl -s http://localhost:8001/documents

# 5. Search for the document
curl -s "http://localhost:8001/documents/search?q=workflow"

# 6. Get specific document
curl -s http://localhost:8001/documents/WORKFLOW-TEST-001
```

## Error Testing

### Test Invalid Endpoints
```bash
# Test non-existent endpoint
curl -s http://localhost:8001/nonexistent

# Test invalid document ID
curl -s http://localhost:8001/documents/INVALID-ID
```

### Test Invalid Data
```bash
# Test bulk insert with invalid data
curl -X POST http://localhost:8001/documents/bulk \
  -H "Content-Type: application/json" \
  -d '{
    "documents": [
      {
        "documentId": "",
        "title": "",
        "content": "Invalid document with empty required fields"
      }
    ]
  }'
```

## Notes

- The API uses SQLite database stored in `backend/navi.db`
- All endpoints return JSON responses
- CORS is enabled for all origins
- The server runs on port 8001 by default
- Documents are stored with unique `document_id` fields
- Bulk operations support both insert and update (upsert behavior)
- The clear endpoint removes all documents but preserves personas and comments
