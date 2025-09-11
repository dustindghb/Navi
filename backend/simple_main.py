import sqlite3
import json
from datetime import datetime
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
import os

# Database setup
DB_FILE = "navi.db"

def init_db():
    """Initialize SQLite database with tables"""
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    
    # Create tables
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS personas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            role TEXT,
            location TEXT,
            age_range TEXT,
            employment_status TEXT,
            industry TEXT,
            policy_interests TEXT DEFAULT '[]',
            preferred_agencies TEXT DEFAULT '[]',
            impact_level TEXT DEFAULT '[]',
            additional_context TEXT,
            embedding TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS agencies (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            code TEXT UNIQUE NOT NULL
        )
    """)
    
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS documents (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            document_id TEXT UNIQUE NOT NULL,
            title TEXT NOT NULL,
            text TEXT,
            agency_id TEXT,
            document_type TEXT,
            web_comment_link TEXT,
            web_document_link TEXT,
            web_docket_link TEXT,
            docket_id TEXT,
            embedding TEXT,
            chunk_embeddings TEXT,
            posted_date TIMESTAMP,
            comment_end_date TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    # Migration: Add text column if it doesn't exist and migrate data from content
    cursor.execute("PRAGMA table_info(documents)")
    columns = [column[1] for column in cursor.fetchall()]
    
    if 'text' not in columns and 'content' in columns:
        print("Migrating content column to text column...")
        cursor.execute("ALTER TABLE documents ADD COLUMN text TEXT")
        cursor.execute("UPDATE documents SET text = content WHERE content IS NOT NULL")
        print("Migration completed.")
    
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS comments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            persona_id INTEGER,
            document_id TEXT NOT NULL,
            title TEXT,
            content TEXT NOT NULL,
            status TEXT DEFAULT 'draft',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (persona_id) REFERENCES personas (id)
        )
    """)
    
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS matched_documents (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            persona_id INTEGER NOT NULL,
            document_id TEXT NOT NULL,
            similarity_score REAL NOT NULL,
            gpt_relevance_score INTEGER NOT NULL,
            relevance_reason TEXT,
            gpt_reasoning TEXT,
            gpt_thought_process TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (persona_id) REFERENCES personas (id),
            FOREIGN KEY (document_id) REFERENCES documents (document_id),
            UNIQUE(persona_id, document_id)
        )
    """)
    
    # Add comment_end_date column if it doesn't exist (migration)
    try:
        cursor.execute("ALTER TABLE documents ADD COLUMN comment_end_date TIMESTAMP")
        conn.commit()
    except sqlite3.OperationalError:
        # Column already exists, ignore
        pass
    
    # Add embedding column to personas if it doesn't exist (migration)
    try:
        cursor.execute("ALTER TABLE personas ADD COLUMN embedding TEXT")
        conn.commit()
    except sqlite3.OperationalError:
        # Column already exists, ignore
        pass
    
    # Add chunk_embeddings column to documents if it doesn't exist (migration)
    try:
        cursor.execute("ALTER TABLE documents ADD COLUMN chunk_embeddings TEXT")
        conn.commit()
    except sqlite3.OperationalError:
        # Column already exists, ignore
        pass
    
    # Insert sample data
    cursor.execute("""
        INSERT OR IGNORE INTO agencies (name, code) VALUES 
        ('Federal Communications Commission', 'FCC'),
        ('Environmental Protection Agency', 'EPA'),
        ('Food and Drug Administration', 'FDA')
    """)
    
    # No sample personas - users will create their own
    
    cursor.execute("""
        INSERT OR IGNORE INTO documents (document_id, title, text, agency_id, document_type, web_comment_link, web_document_link, posted_date) VALUES 
        ('FCC-2025-001', 'Broadband Infrastructure Rules', 'New rules for broadband infrastructure deployment across rural areas...', 'FCC', 'Rule', 'https://example.com/comment', 'https://example.com/doc', '2025-01-15'),
        ('EPA-2025-001', 'Clean Air Act Amendments', 'Proposed amendments to clean air regulations affecting industrial emissions...', 'EPA', 'Proposed Rule', 'https://example.com/comment', 'https://example.com/doc', '2025-01-10'),
        ('FDA-2025-001', 'Food Safety Standards', 'Updated food safety standards for imports and domestic production...', 'FDA', 'Guidance', 'https://example.com/comment', 'https://example.com/doc', '2025-01-05')
    """)
    
    conn.commit()
    conn.close()

class APIHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        """Handle GET requests"""
        parsed_path = urlparse(self.path)
        path = parsed_path.path
        query_params = parse_qs(parsed_path.query)
        
        if path == '/health':
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            response = {"status": "healthy", "timestamp": datetime.now().isoformat()}
            self.wfile.write(json.dumps(response).encode())
            
        elif path == '/documents':
            self.get_documents(query_params)
            
        elif path.startswith('/documents/'):
            document_id = path.split('/')[-1]
            if document_id == 'search':
                self.search_documents(query_params)
            else:
                self.get_document(document_id)
                
        elif path == '/personas':
            self.get_all_personas()
            
        elif path.startswith('/personas/'):
            persona_id = int(path.split('/')[-1])
            self.get_persona(persona_id)
            
        elif path.startswith('/comments/'):
            comment_id = int(path.split('/')[-1])
            self.get_comment(comment_id)
            
        elif path == '/matched-documents':
            self.get_matched_documents(query_params)
            
        else:
            self.send_response(404)
            self.end_headers()
    
    def do_PUT(self):
        """Handle PUT requests"""
        parsed_path = urlparse(self.path)
        path = parsed_path.path
        query_params = parse_qs(parsed_path.query)
        
        # Handle requests without Content-Length header
        content_length = self.headers.get('Content-Length')
        if content_length:
            content_length = int(content_length)
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))
        else:
            data = {}
        
        if path.startswith('/personas/'):
            persona_id = int(path.split('/')[-1])
            self.update_persona(persona_id, data)
        else:
            self.send_response(404)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({"error": "Endpoint not found"}).encode())
    
    def do_OPTIONS(self):
        """Handle CORS preflight requests"""
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.send_header('Access-Control-Max-Age', '86400')
        self.end_headers()
    
    def do_POST(self):
        """Handle POST requests"""
        parsed_path = urlparse(self.path)
        path = parsed_path.path
        query_params = parse_qs(parsed_path.query)
        
        # Handle requests without Content-Length header
        content_length = self.headers.get('Content-Length')
        if content_length:
            content_length = int(content_length)
            post_data = self.rfile.read(content_length)
            # Special case for clear-embeddings endpoint that doesn't need JSON data
            if path == '/documents/clear-embeddings':
                data = {}
            else:
                data = json.loads(post_data.decode('utf-8'))
        else:
            data = {}
        
        if path == '/personas':
            self.create_persona(data)
            
        elif path == '/comments':
            persona_id = int(query_params.get('persona_id', [0])[0])
            self.create_comment(persona_id, data)
            
        elif path == '/documents/bulk':
            self.bulk_insert_documents(data)
            
        elif path == '/documents/clear':
            self.clear_documents()
            
        elif path == '/documents/clear-embeddings':
            self.clear_document_embeddings()
            
        elif path == '/api/upload':
            self.upload_api_data(data)
            
        elif path == '/personas/embedding':
            self.update_persona_embedding(data)
            
        elif path == '/documents/embedding':
            self.update_document_embedding(data)
            
        elif path == '/documents/chunk-embeddings':
            self.update_document_chunk_embeddings(data)
            
        elif path == '/matched-documents':
            self.save_matched_documents(data)
            
        else:
            self.send_response(404)
            self.end_headers()
    
    def get_documents(self, query_params):
        """Get all documents"""
        conn = sqlite3.connect(DB_FILE)
        cursor = conn.cursor()
        
        limit = int(query_params.get('limit', [10])[0])
        offset = int(query_params.get('offset', [0])[0])
        
        cursor.execute("""
            SELECT id, document_id, title, text, agency_id, 
                   document_type, web_comment_link, web_document_link, web_docket_link,
                   docket_id, embedding, chunk_embeddings, posted_date, comment_end_date
            FROM documents
            ORDER BY posted_date DESC
            LIMIT ? OFFSET ?
        """, (limit, offset))
        
        results = []
        for row in cursor.fetchall():
            # Parse embedding JSON if it exists
            embedding = None
            if row[10]:  # embedding field
                try:
                    embedding = json.loads(row[10])
                except (json.JSONDecodeError, TypeError):
                    embedding = None
            
            # Parse chunk_embeddings JSON if it exists
            chunk_embeddings = None
            if row[11]:  # chunk_embeddings field
                try:
                    chunk_embeddings = json.loads(row[11])
                except (json.JSONDecodeError, TypeError):
                    chunk_embeddings = None
            
            results.append({
                'id': row[0],
                'document_id': row[1],
                'title': row[2],
                'text': row[3],
                'agency_id': row[4],
                'document_type': row[5],
                'web_comment_link': row[6],
                'web_document_link': row[7],
                'web_docket_link': row[8],
                'docket_id': row[9],
                'embedding': embedding,
                'chunk_embeddings': chunk_embeddings,
                'posted_date': row[12],
                'comment_end_date': row[13]
            })
        
        conn.close()
        
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(results).encode())
    
    def get_document(self, document_id):
        """Get specific document"""
        conn = sqlite3.connect(DB_FILE)
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT id, document_id, title, text, agency_id, 
                   document_type, web_comment_link, web_document_link, web_docket_link,
                   docket_id, embedding, chunk_embeddings, posted_date, comment_end_date
            FROM documents WHERE document_id = ?
        """, (document_id,))
        
        row = cursor.fetchone()
        conn.close()
        
        if row:
            # Parse embedding JSON if it exists
            embedding = None
            if row[10]:  # embedding field
                try:
                    embedding = json.loads(row[10])
                except (json.JSONDecodeError, TypeError):
                    embedding = None
            
            # Parse chunk_embeddings JSON if it exists
            chunk_embeddings = None
            if row[11]:  # chunk_embeddings field
                try:
                    chunk_embeddings = json.loads(row[11])
                except (json.JSONDecodeError, TypeError):
                    chunk_embeddings = None
            
            result = {
                'id': row[0],
                'document_id': row[1],
                'title': row[2],
                'text': row[3],
                'agency_id': row[4],
                'document_type': row[5],
                'web_comment_link': row[6],
                'web_document_link': row[7],
                'web_docket_link': row[8],
                'docket_id': row[9],
                'embedding': embedding,
                'chunk_embeddings': chunk_embeddings,
                'posted_date': row[12],
                'comment_end_date': row[13]
            }
            
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(result).encode())
        else:
            self.send_response(404)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({"error": "Document not found"}).encode())
    
    def search_documents(self, query_params):
        """Search documents"""
        query = query_params.get('q', [''])[0]
        limit = int(query_params.get('limit', [10])[0])
        
        conn = sqlite3.connect(DB_FILE)
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT id, document_id, title, text, agency_id, 
                   document_type, web_comment_link, web_document_link, web_docket_link,
                   docket_id, embedding, chunk_embeddings, posted_date, comment_end_date
            FROM documents
            WHERE title LIKE ? OR text LIKE ?
            ORDER BY posted_date DESC
            LIMIT ?
        """, (f'%{query}%', f'%{query}%', limit))
        
        results = []
        for row in cursor.fetchall():
            # Parse embedding JSON if it exists
            embedding = None
            if row[10]:  # embedding field
                try:
                    embedding = json.loads(row[10])
                except (json.JSONDecodeError, TypeError):
                    embedding = None
            
            # Parse chunk_embeddings JSON if it exists
            chunk_embeddings = None
            if row[11]:  # chunk_embeddings field
                try:
                    chunk_embeddings = json.loads(row[11])
                except (json.JSONDecodeError, TypeError):
                    chunk_embeddings = None
            
            results.append({
                'id': row[0],
                'document_id': row[1],
                'title': row[2],
                'text': row[3],
                'agency_id': row[4],
                'document_type': row[5],
                'web_comment_link': row[6],
                'web_document_link': row[7],
                'web_docket_link': row[8],
                'docket_id': row[9],
                'embedding': embedding,
                'chunk_embeddings': chunk_embeddings,
                'posted_date': row[12],
                'comment_end_date': row[13]
            })
        
        conn.close()
        
        response = {"query": query, "results": results}
        
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(response).encode())
    
    def create_persona(self, data):
        """Create a new persona"""
        conn = sqlite3.connect(DB_FILE)
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT INTO personas (name, role, location, age_range, employment_status, industry,
                                policy_interests, preferred_agencies, impact_level, additional_context, embedding)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            data.get('name'),
            data.get('role'),
            data.get('location'),
            data.get('age_range'),
            data.get('employment_status'),
            data.get('industry'),
            json.dumps(data.get('policy_interests', [])),
            json.dumps(data.get('preferred_agencies', [])),
            json.dumps(data.get('impact_level', [])),
            data.get('additional_context'),
            json.dumps(data.get('embedding', [])) if data.get('embedding') else None
        ))
        
        persona_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        result = {
            'id': persona_id,
            'name': data.get('name'),
            'role': data.get('role'),
            'location': data.get('location'),
            'age_range': data.get('age_range'),
            'employment_status': data.get('employment_status'),
            'industry': data.get('industry'),
            'policy_interests': data.get('policy_interests', []),
            'preferred_agencies': data.get('preferred_agencies', []),
            'impact_level': data.get('impact_level', []),
            'additional_context': data.get('additional_context'),
            'created_at': datetime.now().isoformat(),
            'updated_at': datetime.now().isoformat()
        }
        
        self.send_response(201)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(result).encode())
    
    def update_persona(self, persona_id, data):
        """Update an existing persona"""
        conn = sqlite3.connect(DB_FILE)
        cursor = conn.cursor()
        
        cursor.execute("""
            UPDATE personas 
            SET name = ?, role = ?, location = ?, age_range = ?, employment_status = ?, 
                industry = ?, policy_interests = ?, preferred_agencies = ?, 
                impact_level = ?, additional_context = ?, embedding = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        """, (
            data.get('name'),
            data.get('role'),
            data.get('location'),
            data.get('age_range'),
            data.get('employment_status'),
            data.get('industry'),
            json.dumps(data.get('policy_interests', [])),
            json.dumps(data.get('preferred_agencies', [])),
            json.dumps(data.get('impact_level', [])),
            data.get('additional_context'),
            json.dumps(data.get('embedding', [])) if data.get('embedding') else None,
            persona_id
        ))
        
        if cursor.rowcount > 0:
            conn.commit()
            conn.close()
            
            result = {
                'id': persona_id,
                'name': data.get('name'),
                'role': data.get('role'),
                'location': data.get('location'),
                'age_range': data.get('age_range'),
                'employment_status': data.get('employment_status'),
                'industry': data.get('industry'),
                'policy_interests': data.get('policy_interests', []),
                'preferred_agencies': data.get('preferred_agencies', []),
                'impact_level': data.get('impact_level', []),
                'additional_context': data.get('additional_context'),
                'updated_at': datetime.now().isoformat()
            }
            
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(result).encode())
        else:
            conn.close()
            self.send_response(404)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({"error": "Persona not found"}).encode())
    
    def get_all_personas(self):
        """Get all personas"""
        conn = sqlite3.connect(DB_FILE)
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT id, name, role, location, age_range, employment_status, industry,
                   policy_interests, preferred_agencies, impact_level, additional_context, embedding,
                   created_at, updated_at
            FROM personas
            ORDER BY created_at DESC
        """)
        
        results = []
        for row in cursor.fetchall():
            # Parse embedding JSON if it exists
            embedding = None
            if row[11]:  # embedding field
                try:
                    embedding = json.loads(row[11])
                except (json.JSONDecodeError, TypeError):
                    embedding = None
            
            results.append({
                'id': row[0],
                'name': row[1],
                'role': row[2],
                'location': row[3],
                'age_range': row[4],
                'employment_status': row[5],
                'industry': row[6],
                'policy_interests': json.loads(row[7]) if row[7] else [],
                'preferred_agencies': json.loads(row[8]) if row[8] else [],
                'impact_level': json.loads(row[9]) if row[9] else [],
                'additional_context': row[10],
                'embedding': embedding,
                'created_at': row[12],
                'updated_at': row[13]
            })
        
        conn.close()
        
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(results).encode())
    
    def get_persona(self, persona_id):
        """Get persona by ID"""
        conn = sqlite3.connect(DB_FILE)
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT id, name, role, location, age_range, employment_status, industry,
                   policy_interests, preferred_agencies, impact_level, additional_context, embedding,
                   created_at, updated_at
            FROM personas WHERE id = ?
        """, (persona_id,))
        
        row = cursor.fetchone()
        conn.close()
        
        if row:
            # Parse embedding JSON if it exists
            embedding = None
            if row[11]:  # embedding field
                try:
                    embedding = json.loads(row[11])
                except (json.JSONDecodeError, TypeError):
                    embedding = None
            
            result = {
                'id': row[0],
                'name': row[1],
                'role': row[2],
                'location': row[3],
                'age_range': row[4],
                'employment_status': row[5],
                'industry': row[6],
                'policy_interests': json.loads(row[7]) if row[7] else [],
                'preferred_agencies': json.loads(row[8]) if row[8] else [],
                'impact_level': json.loads(row[9]) if row[9] else [],
                'additional_context': row[10],
                'embedding': embedding,
                'created_at': row[12],
                'updated_at': row[13]
            }
            
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(result).encode())
        else:
            self.send_response(404)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({"error": "Persona not found"}).encode())
    
    def create_comment(self, persona_id, data):
        """Create a new comment"""
        conn = sqlite3.connect(DB_FILE)
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT INTO comments (persona_id, document_id, title, content, status)
            VALUES (?, ?, ?, ?, 'draft')
        """, (persona_id, data['document_id'], data.get('title'), data['content']))
        
        comment_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        result = {
            'id': comment_id,
            'persona_id': persona_id,
            'document_id': data['document_id'],
            'title': data.get('title'),
            'content': data['content'],
            'status': 'draft',
            'created_at': datetime.now().isoformat()
        }
        
        self.send_response(201)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(result).encode())
    
    def get_comment(self, comment_id):
        """Get comment by ID"""
        conn = sqlite3.connect(DB_FILE)
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT id, persona_id, document_id, title, content, status, created_at
            FROM comments WHERE id = ?
        """, (comment_id,))
        
        row = cursor.fetchone()
        conn.close()
        
        if row:
            result = {
                'id': row[0],
                'persona_id': row[1],
                'document_id': row[2],
                'title': row[3],
                'content': row[4],
                'status': row[5],
                'created_at': row[6]
            }
            
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(result).encode())
        else:
            self.send_response(404)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({"error": "Comment not found"}).encode())
    
    def bulk_insert_documents(self, data):
        """Bulk insert documents from API data"""
        conn = sqlite3.connect(DB_FILE)
        cursor = conn.cursor()
        
        documents = data.get('documents', [])
        inserted_count = 0
        updated_count = 0
        errors = []
        
        for doc in documents:
            try:
                # Extract data from API format
                document_id = doc.get('documentId') or doc.get('document_id', '')
                title = doc.get('title', '')
                text = doc.get('text', '')
                agency_id = doc.get('agencyId') or doc.get('agency_id', '')
                document_type = doc.get('documentType') or doc.get('document_type', '')
                web_comment_link = doc.get('webCommentLink') or doc.get('web_comment_link', '')
                web_document_link = doc.get('webDocumentLink') or doc.get('web_document_link', '')
                web_docket_link = doc.get('webDocketLink') or doc.get('web_docket_link', '')
                docket_id = doc.get('docketId') or doc.get('docket_id', '')
                embedding = doc.get('embedding', [])
                posted_date = doc.get('postedDate') or doc.get('posted_date', '')
                comment_end_date = doc.get('commentEndDate') or doc.get('comment_end_date', '')
                
                # Convert embedding array to JSON string for storage
                embedding_json = json.dumps(embedding) if embedding else None
                
                # Check if document already exists
                cursor.execute("SELECT id FROM documents WHERE document_id = ?", (document_id,))
                existing = cursor.fetchone()
                
                if existing:
                    # Update existing document
                    cursor.execute("""
                        UPDATE documents 
                        SET title = ?, text = ?, agency_id = ?, document_type = ?,
                            web_comment_link = ?, web_document_link = ?, web_docket_link = ?,
                            docket_id = ?, embedding = ?, posted_date = ?, comment_end_date = ?
                        WHERE document_id = ?
                    """, (title, text, agency_id, document_type, 
                          web_comment_link, web_document_link, web_docket_link,
                          docket_id, embedding_json, posted_date, comment_end_date, document_id))
                    updated_count += 1
                else:
                    # Insert new document
                    cursor.execute("""
                        INSERT INTO documents (document_id, title, text, agency_id, 
                                             document_type, web_comment_link, web_document_link, 
                                             web_docket_link, docket_id, embedding, posted_date, comment_end_date)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, (document_id, title, text, agency_id, document_type,
                          web_comment_link, web_document_link, web_docket_link,
                          docket_id, embedding_json, posted_date, comment_end_date))
                    inserted_count += 1
                    
            except Exception as e:
                errors.append(f"Error processing document {doc.get('documentId', 'unknown')}: {str(e)}")
        
        conn.commit()
        conn.close()
        
        result = {
            'success': True,
            'inserted': inserted_count,
            'updated': updated_count,
            'total_processed': len(documents),
            'errors': errors,
            'timestamp': datetime.now().isoformat()
        }
        
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(result).encode())
    
    def clear_documents(self):
        """Clear all documents from the database"""
        conn = sqlite3.connect(DB_FILE)
        cursor = conn.cursor()
        
        # Count documents before deletion
        cursor.execute("SELECT COUNT(*) FROM documents")
        count_before = cursor.fetchone()[0]
        
        # Delete all documents
        cursor.execute("DELETE FROM documents")
        
        conn.commit()
        conn.close()
        
        result = {
            'success': True,
            'deleted_count': count_before,
            'timestamp': datetime.now().isoformat()
        }
        
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(result).encode())
    
    def clear_document_embeddings(self):
        """Clear all document embeddings from the database"""
        conn = sqlite3.connect(DB_FILE)
        cursor = conn.cursor()
        
        # Count documents with embeddings before clearing
        cursor.execute("SELECT COUNT(*) FROM documents WHERE embedding IS NOT NULL OR chunk_embeddings IS NOT NULL")
        count_before = cursor.fetchone()[0]
        
        # Clear all embeddings
        cursor.execute("UPDATE documents SET embedding = NULL, chunk_embeddings = NULL")
        
        conn.commit()
        conn.close()
        
        result = {
            'success': True,
            'cleared_embeddings_count': count_before,
            'timestamp': datetime.now().isoformat()
        }
        
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(result).encode())
    
    def upload_api_data(self, data):
        """Upload API data with embeddings to database"""
        conn = sqlite3.connect(DB_FILE)
        cursor = conn.cursor()
        
        # Handle both direct documents array and nested data structure
        documents = data.get('documents', [])
        if not documents and 'data' in data and 'documents' in data['data']:
            documents = data['data']['documents']
        
        inserted_count = 0
        updated_count = 0
        errors = []
        
        print(f"Processing {len(documents)} documents for upload...")
        
        for doc in documents:
            try:
                # Extract data from API format
                document_id = doc.get('documentId') or doc.get('document_id', '')
                title = doc.get('title', '')
                text = doc.get('text', '')
                agency_id = doc.get('agencyId') or doc.get('agency_id', '')
                document_type = doc.get('documentType') or doc.get('document_type', '')
                web_comment_link = doc.get('webCommentLink') or doc.get('web_comment_link', '')
                web_document_link = doc.get('webDocumentLink') or doc.get('web_document_link', '')
                web_docket_link = doc.get('webDocketLink') or doc.get('web_docket_link', '')
                docket_id = doc.get('docketId') or doc.get('docket_id', '')
                embedding = doc.get('embedding', [])
                posted_date = doc.get('postedDate') or doc.get('posted_date', '')
                comment_end_date = doc.get('commentEndDate') or doc.get('comment_end_date', '')
                
                # Convert embedding array to JSON string for storage
                embedding_json = json.dumps(embedding) if embedding else None
                
                # Check if document already exists
                cursor.execute("SELECT id FROM documents WHERE document_id = ?", (document_id,))
                existing = cursor.fetchone()
                
                if existing:
                    # Update existing document
                    cursor.execute("""
                        UPDATE documents 
                        SET title = ?, text = ?, agency_id = ?, document_type = ?,
                            web_comment_link = ?, web_document_link = ?, web_docket_link = ?,
                            docket_id = ?, embedding = ?, posted_date = ?, comment_end_date = ?
                        WHERE document_id = ?
                    """, (title, text, agency_id, document_type, 
                          web_comment_link, web_document_link, web_docket_link,
                          docket_id, embedding_json, posted_date, comment_end_date, document_id))
                    updated_count += 1
                else:
                    # Insert new document
                    cursor.execute("""
                        INSERT INTO documents (document_id, title, text, agency_id, 
                                             document_type, web_comment_link, web_document_link, 
                                             web_docket_link, docket_id, embedding, posted_date, comment_end_date)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, (document_id, title, text, agency_id, document_type,
                          web_comment_link, web_document_link, web_docket_link,
                          docket_id, embedding_json, posted_date, comment_end_date))
                    inserted_count += 1
                    
            except Exception as e:
                errors.append(f"Error processing document {doc.get('documentId', 'unknown')}: {str(e)}")
                print(f"Error processing document {doc.get('documentId', 'unknown')}: {str(e)}")
        
        conn.commit()
        conn.close()
        
        result = {
            'success': True,
            'inserted': inserted_count,
            'updated': updated_count,
            'total_processed': len(documents),
            'errors': errors,
            'timestamp': datetime.now().isoformat()
        }
        
        print(f"Upload complete: {inserted_count} inserted, {updated_count} updated, {len(errors)} errors")
        
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(result).encode())
    
    def update_persona_embedding(self, data):
        """Update persona embedding"""
        conn = sqlite3.connect(DB_FILE)
        cursor = conn.cursor()
        
        persona_id = data.get('persona_id')
        embedding = data.get('embedding', [])
        
        if not persona_id:
            conn.close()
            self.send_response(400)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({"error": "persona_id is required"}).encode())
            return
        
        # Convert embedding array to JSON string for storage
        embedding_json = json.dumps(embedding) if embedding else None
        
        cursor.execute("""
            UPDATE personas 
            SET embedding = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        """, (embedding_json, persona_id))
        
        if cursor.rowcount > 0:
            conn.commit()
            conn.close()
            
            result = {
                'success': True,
                'persona_id': persona_id,
                'embedding_dimensions': len(embedding) if embedding else 0,
                'updated_at': datetime.now().isoformat()
            }
            
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(result).encode())
        else:
            conn.close()
            self.send_response(404)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({"error": "Persona not found"}).encode())
    
    def update_document_embedding(self, data):
        """Update document embedding"""
        conn = sqlite3.connect(DB_FILE)
        cursor = conn.cursor()
        
        document_id = data.get('document_id')
        embedding = data.get('embedding', [])
        
        if not document_id:
            conn.close()
            self.send_response(400)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({"error": "document_id is required"}).encode())
            return
        
        # Convert embedding array to JSON string for storage
        embedding_json = json.dumps(embedding) if embedding else None
        
        cursor.execute("""
            UPDATE documents 
            SET embedding = ?, created_at = CURRENT_TIMESTAMP
            WHERE document_id = ?
        """, (embedding_json, document_id))
        
        if cursor.rowcount > 0:
            conn.commit()
            conn.close()
            
            result = {
                'success': True,
                'document_id': document_id,
                'embedding_dimensions': len(embedding) if embedding else 0,
                'updated_at': datetime.now().isoformat()
            }
            
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(result).encode())
        else:
            conn.close()
            self.send_response(404)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({"error": "Document not found"}).encode())
    
    def update_document_chunk_embeddings(self, data):
        """Update document chunk embeddings"""
        conn = sqlite3.connect(DB_FILE)
        cursor = conn.cursor()
        
        document_id = data.get('document_id')
        chunk_embeddings = data.get('chunk_embeddings', [])
        
        if not document_id:
            conn.close()
            self.send_response(400)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({"error": "document_id is required"}).encode())
            return
        
        # Convert chunk embeddings array to JSON string for storage
        chunk_embeddings_json = json.dumps(chunk_embeddings) if chunk_embeddings else None
        
        cursor.execute("""
            UPDATE documents 
            SET chunk_embeddings = ?, created_at = CURRENT_TIMESTAMP
            WHERE document_id = ?
        """, (chunk_embeddings_json, document_id))
        
        if cursor.rowcount > 0:
            conn.commit()
            conn.close()
            
            result = {
                'success': True,
                'document_id': document_id,
                'chunk_count': len(chunk_embeddings) if chunk_embeddings else 0,
                'updated_at': datetime.now().isoformat()
            }
            
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(result).encode())
        else:
            conn.close()
            self.send_response(404)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({"error": "Document not found"}).encode())
    
    def save_matched_documents(self, data):
        """Save matched documents that passed semantic and GPT thresholds"""
        conn = sqlite3.connect(DB_FILE)
        cursor = conn.cursor()
        
        persona_id = data.get('persona_id')
        matched_documents = data.get('matched_documents', [])
        
        if not persona_id:
            conn.close()
            self.send_response(400)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({"error": "persona_id is required"}).encode())
            return
        
        # Clear existing matches for this persona
        cursor.execute("DELETE FROM matched_documents WHERE persona_id = ?", (persona_id,))
        
        saved_count = 0
        errors = []
        
        for match in matched_documents:
            try:
                cursor.execute("""
                    INSERT OR REPLACE INTO matched_documents 
                    (persona_id, document_id, similarity_score, gpt_relevance_score, 
                     relevance_reason, gpt_reasoning, gpt_thought_process)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (
                    persona_id,
                    match.get('document_id'),
                    match.get('similarity_score', 0.0),
                    match.get('gpt_relevance_score', 0),
                    match.get('relevance_reason', ''),
                    match.get('gpt_reasoning', ''),
                    match.get('gpt_thought_process', '')
                ))
                saved_count += 1
            except Exception as e:
                errors.append(f"Error saving match for document {match.get('document_id', 'unknown')}: {str(e)}")
        
        conn.commit()
        conn.close()
        
        result = {
            'success': True,
            'persona_id': persona_id,
            'saved_count': saved_count,
            'total_matches': len(matched_documents),
            'errors': errors,
            'timestamp': datetime.now().isoformat()
        }
        
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(result).encode())
    
    def get_matched_documents(self, query_params):
        """Get matched documents for a persona"""
        conn = sqlite3.connect(DB_FILE)
        cursor = conn.cursor()
        
        persona_id = query_params.get('persona_id', [None])[0]
        
        if not persona_id:
            conn.close()
            self.send_response(400)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({"error": "persona_id is required"}).encode())
            return
        
        # Get matched documents with full document details
        cursor.execute("""
            SELECT 
                md.id,
                md.persona_id,
                md.document_id,
                md.similarity_score,
                md.gpt_relevance_score,
                md.relevance_reason,
                md.gpt_reasoning,
                md.gpt_thought_process,
                md.created_at,
                d.title,
                d.text,
                d.agency_id,
                d.document_type,
                d.web_comment_link,
                d.web_document_link,
                d.web_docket_link,
                d.docket_id,
                d.posted_date,
                d.comment_end_date
            FROM matched_documents md
            JOIN documents d ON md.document_id = d.document_id
            WHERE md.persona_id = ?
            ORDER BY md.gpt_relevance_score DESC, md.similarity_score DESC
        """, (persona_id,))
        
        results = []
        for row in cursor.fetchall():
            results.append({
                'id': row[0],
                'persona_id': row[1],
                'document_id': row[2],
                'similarity_score': row[3],
                'gpt_relevance_score': row[4],
                'relevance_reason': row[5],
                'gpt_reasoning': row[6],
                'gpt_thought_process': row[7],
                'created_at': row[8],
                'document': {
                    'id': row[2],  # document_id
                    'document_id': row[2],
                    'title': row[9],
                    'text': row[10],
                    'agency_id': row[11],
                    'document_type': row[12],
                    'web_comment_link': row[13],
                    'web_document_link': row[14],
                    'web_docket_link': row[15],
                    'docket_id': row[16],
                    'posted_date': row[17],
                    'comment_end_date': row[18]
                }
            })
        
        conn.close()
        
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(results).encode())

def run_server(port=8001):
    """Run the HTTP server"""
    init_db()
    server = HTTPServer(('localhost', port), APIHandler)
    print(f"🚀 Simple Navi API server running on http://localhost:{port}")
    print(f"📚 API docs: http://localhost:{port}/health")
    print("Press Ctrl+C to stop")
    
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n👋 Server stopped")
        server.shutdown()

if __name__ == "__main__":
    run_server()
