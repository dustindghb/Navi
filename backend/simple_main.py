"""
Ultra-simple Navi Backend API

This version uses only built-in Python libraries and SQLite
to avoid dependency issues.
"""

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
            name TEXT NOT NULL,
            role TEXT,
            interests TEXT DEFAULT '[]',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
            content TEXT,
            agency_id TEXT,
            document_type TEXT,
            web_comment_link TEXT,
            web_document_link TEXT,
            web_docket_link TEXT,
            docket_id TEXT,
            embedding TEXT,
            posted_date TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
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
    
    # Insert sample data
    cursor.execute("""
        INSERT OR IGNORE INTO agencies (name, code) VALUES 
        ('Federal Communications Commission', 'FCC'),
        ('Environmental Protection Agency', 'EPA'),
        ('Food and Drug Administration', 'FDA')
    """)
    
    cursor.execute("""
        INSERT OR IGNORE INTO documents (document_id, title, content, agency_id, document_type, web_comment_link, web_document_link, posted_date) VALUES 
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
                
        elif path.startswith('/personas/'):
            persona_id = int(path.split('/')[-1])
            self.get_persona(persona_id)
            
        elif path.startswith('/comments/'):
            comment_id = int(path.split('/')[-1])
            self.get_comment(comment_id)
            
        else:
            self.send_response(404)
            self.end_headers()
    
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
        
        content_length = int(self.headers['Content-Length'])
        post_data = self.rfile.read(content_length)
        data = json.loads(post_data.decode('utf-8'))
        
        if path == '/personas':
            self.create_persona(data)
            
        elif path == '/comments':
            persona_id = int(query_params.get('persona_id', [0])[0])
            self.create_comment(persona_id, data)
            
        elif path == '/documents/bulk':
            self.bulk_insert_documents(data)
            
        elif path == '/documents/clear':
            self.clear_documents()
            
        elif path == '/api/upload':
            self.upload_api_data(data)
            
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
            SELECT id, document_id, title, content, agency_id, 
                   document_type, web_comment_link, web_document_link, web_docket_link,
                   docket_id, embedding, posted_date
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
            
            results.append({
                'id': row[0],
                'document_id': row[1],
                'title': row[2],
                'content': row[3],
                'agency_id': row[4],
                'document_type': row[5],
                'web_comment_link': row[6],
                'web_document_link': row[7],
                'web_docket_link': row[8],
                'docket_id': row[9],
                'embedding': embedding,
                'posted_date': row[11]
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
            SELECT id, document_id, title, content, agency_id, 
                   document_type, web_comment_link, web_document_link, web_docket_link,
                   docket_id, embedding, posted_date
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
            
            result = {
                'id': row[0],
                'document_id': row[1],
                'title': row[2],
                'content': row[3],
                'agency_id': row[4],
                'document_type': row[5],
                'web_comment_link': row[6],
                'web_document_link': row[7],
                'web_docket_link': row[8],
                'docket_id': row[9],
                'embedding': embedding,
                'posted_date': row[11]
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
            SELECT id, document_id, title, content, agency_id, 
                   document_type, web_comment_link, web_document_link, web_docket_link,
                   docket_id, embedding, posted_date
            FROM documents
            WHERE title LIKE ? OR content LIKE ?
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
            
            results.append({
                'id': row[0],
                'document_id': row[1],
                'title': row[2],
                'content': row[3],
                'agency_id': row[4],
                'document_type': row[5],
                'web_comment_link': row[6],
                'web_document_link': row[7],
                'web_docket_link': row[8],
                'docket_id': row[9],
                'embedding': embedding,
                'posted_date': row[11]
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
            INSERT INTO personas (name, role, interests)
            VALUES (?, ?, ?)
        """, (data['name'], data.get('role'), json.dumps(data.get('interests', []))))
        
        persona_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        result = {
            'id': persona_id,
            'name': data['name'],
            'role': data.get('role'),
            'interests': data.get('interests', []),
            'created_at': datetime.now().isoformat()
        }
        
        self.send_response(201)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(result).encode())
    
    def get_persona(self, persona_id):
        """Get persona by ID"""
        conn = sqlite3.connect(DB_FILE)
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT id, name, role, interests, created_at
            FROM personas WHERE id = ?
        """, (persona_id,))
        
        row = cursor.fetchone()
        conn.close()
        
        if row:
            result = {
                'id': row[0],
                'name': row[1],
                'role': row[2],
                'interests': json.loads(row[3]),
                'created_at': row[4]
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
                content = doc.get('content', '')
                agency_id = doc.get('agencyId') or doc.get('agency_id', '')
                document_type = doc.get('documentType') or doc.get('document_type', '')
                web_comment_link = doc.get('webCommentLink') or doc.get('web_comment_link', '')
                web_document_link = doc.get('webDocumentLink') or doc.get('web_document_link', '')
                web_docket_link = doc.get('webDocketLink') or doc.get('web_docket_link', '')
                docket_id = doc.get('docketId') or doc.get('docket_id', '')
                embedding = doc.get('embedding', [])
                posted_date = doc.get('postedDate') or doc.get('posted_date', '')
                
                # Convert embedding array to JSON string for storage
                embedding_json = json.dumps(embedding) if embedding else None
                
                # Check if document already exists
                cursor.execute("SELECT id FROM documents WHERE document_id = ?", (document_id,))
                existing = cursor.fetchone()
                
                if existing:
                    # Update existing document
                    cursor.execute("""
                        UPDATE documents 
                        SET title = ?, content = ?, agency_id = ?, document_type = ?,
                            web_comment_link = ?, web_document_link = ?, web_docket_link = ?,
                            docket_id = ?, embedding = ?, posted_date = ?
                        WHERE document_id = ?
                    """, (title, content, agency_id, document_type, 
                          web_comment_link, web_document_link, web_docket_link,
                          docket_id, embedding_json, posted_date, document_id))
                    updated_count += 1
                else:
                    # Insert new document
                    cursor.execute("""
                        INSERT INTO documents (document_id, title, content, agency_id, 
                                             document_type, web_comment_link, web_document_link, 
                                             web_docket_link, docket_id, embedding, posted_date)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, (document_id, title, content, agency_id, document_type,
                          web_comment_link, web_document_link, web_docket_link,
                          docket_id, embedding_json, posted_date))
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
                content = doc.get('content', '')
                agency_id = doc.get('agencyId') or doc.get('agency_id', '')
                document_type = doc.get('documentType') or doc.get('document_type', '')
                web_comment_link = doc.get('webCommentLink') or doc.get('web_comment_link', '')
                web_document_link = doc.get('webDocumentLink') or doc.get('web_document_link', '')
                web_docket_link = doc.get('webDocketLink') or doc.get('web_docket_link', '')
                docket_id = doc.get('docketId') or doc.get('docket_id', '')
                embedding = doc.get('embedding', [])
                posted_date = doc.get('postedDate') or doc.get('posted_date', '')
                
                # Convert embedding array to JSON string for storage
                embedding_json = json.dumps(embedding) if embedding else None
                
                # Check if document already exists
                cursor.execute("SELECT id FROM documents WHERE document_id = ?", (document_id,))
                existing = cursor.fetchone()
                
                if existing:
                    # Update existing document
                    cursor.execute("""
                        UPDATE documents 
                        SET title = ?, content = ?, agency_id = ?, document_type = ?,
                            web_comment_link = ?, web_document_link = ?, web_docket_link = ?,
                            docket_id = ?, embedding = ?, posted_date = ?
                        WHERE document_id = ?
                    """, (title, content, agency_id, document_type, 
                          web_comment_link, web_document_link, web_docket_link,
                          docket_id, embedding_json, posted_date, document_id))
                    updated_count += 1
                else:
                    # Insert new document
                    cursor.execute("""
                        INSERT INTO documents (document_id, title, content, agency_id, 
                                             document_type, web_comment_link, web_document_link, 
                                             web_docket_link, docket_id, embedding, posted_date)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, (document_id, title, content, agency_id, document_type,
                          web_comment_link, web_document_link, web_docket_link,
                          docket_id, embedding_json, posted_date))
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
