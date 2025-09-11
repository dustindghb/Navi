"""
Simplified Navi Backend API

This is a much simpler version that removes ChromaDB complexity
and focuses on basic CRUD operations with PostgreSQL only.
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import psycopg2
from psycopg2.extras import RealDictCursor
import os
from datetime import datetime
import json

app = FastAPI(title="Navi API - Simplified", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:1420", "tauri://localhost"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database connection
def get_db_connection():
    return psycopg2.connect(
        host="localhost",
        database="navi_db",
        user="navi_user",
        password="navi_password",
        port="5432"
    )

# Pydantic models
class PersonaCreate(BaseModel):
    name: str
    role: Optional[str] = None
    interests: List[str] = []

class PersonaResponse(BaseModel):
    id: int
    name: str
    role: Optional[str]
    interests: List[str]
    created_at: datetime

class DocumentResponse(BaseModel):
    id: int
    document_id: str
    title: str
    content: str
    agency_id: str
    document_type: Optional[str]
    web_comment_link: Optional[str]
    web_document_link: Optional[str]
    posted_date: Optional[datetime]

class CommentCreate(BaseModel):
    document_id: str
    title: Optional[str] = None
    content: str

class CommentResponse(BaseModel):
    id: int
    persona_id: int
    document_id: str
    title: Optional[str]
    content: str
    status: str
    created_at: datetime

# Health check
@app.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}

# Persona endpoints
@app.post("/personas", response_model=PersonaResponse)
async def create_persona(persona: PersonaCreate):
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                INSERT INTO personas (name, role, interests)
                VALUES (%s, %s, %s)
                RETURNING id, name, role, interests, created_at
            """, (persona.name, persona.role, json.dumps(persona.interests)))
            
            result = cur.fetchone()
            conn.commit()
            
            return PersonaResponse(
                id=result['id'],
                name=result['name'],
                role=result['role'],
                interests=json.loads(result['interests']),
                created_at=result['created_at']
            )
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@app.get("/personas/{persona_id}", response_model=PersonaResponse)
async def get_persona(persona_id: int):
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT id, name, role, interests, created_at
                FROM personas WHERE id = %s
            """, (persona_id,))
            
            result = cur.fetchone()
            if not result:
                raise HTTPException(status_code=404, detail="Persona not found")
            
            return PersonaResponse(
                id=result['id'],
                name=result['name'],
                role=result['role'],
                interests=json.loads(result['interests']),
                created_at=result['created_at']
            )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

# Document endpoints
@app.get("/documents", response_model=List[DocumentResponse])
async def get_documents(limit: int = 10, offset: int = 0):
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT id, document_id, title, content, agency_id, 
                       document_type, web_comment_link, web_document_link, posted_date
                FROM documents
                ORDER BY posted_date DESC
                LIMIT %s OFFSET %s
            """, (limit, offset))
            
            results = cur.fetchall()
            return [DocumentResponse(**row) for row in results]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@app.get("/documents/{document_id}", response_model=DocumentResponse)
async def get_document(document_id: str):
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT id, document_id, title, content, agency_id, 
                       document_type, web_comment_link, web_document_link, posted_date
                FROM documents WHERE document_id = %s
            """, (document_id,))
            
            result = cur.fetchone()
            if not result:
                raise HTTPException(status_code=404, detail="Document not found")
            
            return DocumentResponse(**result)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

# Comment endpoints
@app.post("/comments", response_model=CommentResponse)
async def create_comment(comment: CommentCreate, persona_id: int):
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                INSERT INTO comments (persona_id, document_id, title, content, status)
                VALUES (%s, %s, %s, %s, 'draft')
                RETURNING id, persona_id, document_id, title, content, status, created_at
            """, (persona_id, comment.document_id, comment.title, comment.content))
            
            result = cur.fetchone()
            conn.commit()
            
            return CommentResponse(**result)
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@app.get("/comments/{comment_id}", response_model=CommentResponse)
async def get_comment(comment_id: int):
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT id, persona_id, document_id, title, content, status, created_at
                FROM comments WHERE id = %s
            """, (comment_id,))
            
            result = cur.fetchone()
            if not result:
                raise HTTPException(status_code=404, detail="Comment not found")
            
            return CommentResponse(**result)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

# Simple search endpoint (no embeddings needed)
@app.get("/documents/search")
async def search_documents(q: str, limit: int = 10):
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT id, document_id, title, content, agency_id, 
                       document_type, web_comment_link, web_document_link, posted_date
                FROM documents
                WHERE title ILIKE %s OR content ILIKE %s
                ORDER BY posted_date DESC
                LIMIT %s
            """, (f'%{q}%', f'%{q}%', limit))
            
            results = cur.fetchall()
            return {"query": q, "results": [DocumentResponse(**row) for row in results]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
