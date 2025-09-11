-- Simplified database schema for Navi
-- This removes all the complex features and focuses on basic functionality

-- Create tables
CREATE TABLE IF NOT EXISTS personas (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(255),
    interests JSONB DEFAULT '[]',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS agencies (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(10) UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS documents (
    id SERIAL PRIMARY KEY,
    document_id VARCHAR(255) UNIQUE NOT NULL,
    title TEXT NOT NULL,
    content TEXT,
    agency_id VARCHAR(255),
    document_type VARCHAR(100),
    web_comment_link TEXT,
    web_document_link TEXT,
    posted_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS comments (
    id SERIAL PRIMARY KEY,
    persona_id INTEGER REFERENCES personas(id),
    document_id VARCHAR(255) NOT NULL,
    title VARCHAR(255),
    content TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'draft',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert sample data
INSERT INTO agencies (name, code) VALUES 
('Federal Communications Commission', 'FCC'),
('Environmental Protection Agency', 'EPA'),
('Food and Drug Administration', 'FDA')
ON CONFLICT (code) DO NOTHING;

INSERT INTO documents (document_id, title, content, agency_id, document_type, web_comment_link, web_document_link, posted_date) VALUES 
('FCC-2025-001', 'Broadband Infrastructure Rules', 'New rules for broadband infrastructure deployment...', 'FCC', 'Rule', 'https://example.com/comment', 'https://example.com/doc', '2025-01-15'),
('EPA-2025-001', 'Clean Air Act Amendments', 'Proposed amendments to clean air regulations...', 'EPA', 'Proposed Rule', 'https://example.com/comment', 'https://example.com/doc', '2025-01-10'),
('FDA-2025-001', 'Food Safety Standards', 'Updated food safety standards for imports...', 'FDA', 'Guidance', 'https://example.com/comment', 'https://example.com/doc', '2025-01-05')
ON CONFLICT (document_id) DO NOTHING;
