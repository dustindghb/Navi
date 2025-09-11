# Navi Desktop App

A comprehensive desktop application for civic engagement and regulatory document analysis, built with Tauri, React, and AI-powered semantic matching.

## Architecture Overview

Navi is a multi-component desktop application that helps users engage with government regulations through AI-powered document analysis and comment generation:

### Core Components

1. **Tauri Desktop Frontend** (`tauri-desktop/`)
   - React + TypeScript frontend with Material-UI
   - Monochrome theme (black, white, grays) [[memory:8411911]]
   - Three main pages: Dashboard, Profile, Settings
   - Semantic document matching and comment drafting

2. **Python Backend API** (`backend/`)
   - SQLite database with HTTP server
   - RESTful API for personas, documents, and comments
   - Embedding storage and retrieval
   - Runs on `http://localhost:8001`

3. **AWS Lambda Integration** (`aws/`)
   - S3-based document retrieval service
   - Handles large-scale document processing
   - Pagination and filtering support

4. **Workflow Automation** (`workflows/`)
   - N8N workflow configurations
   - Docker compose setup for automation

## System Requirements

### Required Software
- **Node.js** (v16 or higher) - [Download here](https://nodejs.org/)
- **Rust** (latest stable version) - [Install via rustup](https://rustup.rs/)
- **Python 3.13+** - [Download here](https://python.org/)
- **Tauri CLI** - Installed automatically with the project

### Platform-Specific Requirements

#### Windows
- Microsoft Visual Studio C++ Build Tools
- WebView2 (usually pre-installed on Windows 10/11)

#### macOS
- Xcode Command Line Tools: `xcode-select --install`

#### Linux
- `libwebkit2gtk-4.0-dev` and `libgtk-3-dev`

## Quick Start

### 1. Start the Backend Server
```bash
cd backend
python3 simple_main.py
```
The backend will start on `http://localhost:8001` with a SQLite database.

### 2. Start the Desktop Application
```bash
cd tauri-desktop
npm run tauri dev
```
This will open the Navi desktop application.

## Detailed Setup Instructions

### Backend Setup

1. **Navigate to backend directory**
   ```bash
   cd backend
   ```

2. **Start the Python server**
   ```bash
   python3 simple_main.py
   ```
   
   The server will:
   - Initialize SQLite database (`navi.db`)
   - Create tables for personas, documents, agencies, and comments
   - Insert sample data
   - Start HTTP server on port 8001

3. **Verify backend is running**
   ```bash
   curl http://localhost:8001/health
   ```

### Frontend Setup

1. **Navigate to tauri-desktop directory**
   ```bash
   cd tauri-desktop
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm run tauri dev
   ```

## Key Commands

### Essential Commands
```bash
# Start backend server
python3 simple_main.py

# Start desktop app
npm run tauri dev

# Build production app
npm run tauri build
```

### Database Management
```bash
# View database schema
sqlite3 backend/navi.db ".schema"

# Count documents
sqlite3 backend/navi.db "SELECT COUNT(*) FROM documents;"

# View all personas
sqlite3 backend/navi.db "SELECT * FROM personas;"
```

## Application Features

### Dashboard
- **Semantic Document Matching**: AI-powered matching between user personas and regulatory documents
- **Dual Analysis**: Combines semantic similarity with GPT reasoning
- **Comment Drafting**: Generate and submit public comments on regulations
- **Real-time Status**: Monitor embedding generation and matching progress

### Profile Management
- **Persona Creation**: Define your civic engagement profile
- **Automatic Embedding**: AI embeddings generated for semantic matching
- **Policy Interests**: Specify areas of interest and preferred agencies
- **Contextual Information**: Role, industry, location, and impact preferences

### Settings
- **Ollama Configuration**: Connect to local or remote AI models
- **Database Management**: Upload documents, clear data, manage storage
- **API Integration**: Configure regulations.gov and S3 connections
- **Model Settings**: Adjust embedding and reasoning models

## Database Schema

### Core Tables
- **personas**: User profiles with embeddings for semantic matching
- **documents**: Regulatory documents with full text and embeddings
- **agencies**: Government agencies (FCC, EPA, FDA, etc.)
- **comments**: User-generated comments linked to documents and personas

### Key Features
- **Embedding Storage**: Vector embeddings for semantic search
- **Comment Period Tracking**: Monitor active comment periods
- **Upsert Logic**: Prevents duplicate documents
- **CORS Support**: Cross-origin requests from frontend

## API Endpoints

### Document Operations
- `GET /documents` - List documents with pagination
- `GET /documents/{id}` - Get specific document
- `GET /documents/search?q=term` - Search documents
- `POST /api/upload` - Upload documents with embeddings
- `POST /documents/clear` - Clear all documents

### Persona Operations
- `GET /personas` - List all personas
- `POST /personas` - Create new persona
- `PUT /personas/{id}` - Update persona
- `POST /personas/embedding` - Update persona embedding

### Comment Operations
- `POST /comments?persona_id={id}` - Create comment
- `GET /comments/{id}` - Get specific comment

## AI Integration

### Embedding Models
- **Default**: `nomic-embed-text:latest`
- **Configurable**: Remote Ollama instance support
- **Semantic Matching**: Cosine similarity calculations

### Reasoning Models
- **Default**: `gpt-oss:20b`
- **Analysis**: GPT-powered relevance scoring
- **Creative Connections**: Identifies indirect policy impacts

## Development Workflow

### Adding New Features
1. **Backend**: Modify `backend/simple_main.py` for API changes
2. **Frontend**: Update React components in `tauri-desktop/src/`
3. **Database**: Use SQLite migrations in the init function
4. **Testing**: Use curl commands or the built-in UI

### Debugging
```bash
# Check backend logs
# (View terminal where python3 simple_main.py is running)

# Test API endpoints
curl http://localhost:8001/health
curl http://localhost:8001/documents?limit=5

# View database contents
sqlite3 backend/navi.db "SELECT * FROM documents LIMIT 5;"
```

## Troubleshooting

### Common Issues

1. **Backend won't start**
   - Ensure Python 3.13+ is installed
   - Check port 8001 is not in use
   - Verify SQLite permissions

2. **Frontend build fails**
   - Run `npm install` in tauri-desktop directory
   - Ensure Rust is properly installed
   - Check Tauri CLI installation

3. **No documents found**
   - Upload documents via Settings page
   - Generate embeddings for semantic matching
   - Check database connection

4. **AI models not responding**
   - Verify Ollama is running
   - Check model names in Settings
   - Test with curl commands

### Performance Tips
- **Embedding Generation**: Process documents in batches
- **Database Size**: Monitor SQLite file size
- **Memory Usage**: Limit document batch sizes
- **Network**: Use local Ollama for better performance

## Project Structure

```
Navi/
├── backend/                 # Python API server
│   ├── simple_main.py      # Main server implementation
│   ├── navi.db            # SQLite database
│   └── requirements.txt   # Python dependencies (minimal)
├── tauri-desktop/         # React + Tauri frontend
│   ├── src/
│   │   ├── pages/         # Dashboard, Profile, Settings
│   │   ├── components/    # Reusable components
│   │   └── theme.ts       # Monochrome theme
│   ├── src-tauri/         # Rust backend
│   └── package.json       # Node.js dependencies
├── aws/                   # AWS Lambda functions
│   └── lambda_function.py # S3 document retrieval
├── workflows/             # N8N automation
│   └── docker-compose.yml # Workflow orchestration
└── readme.txt            # This file
```

## License

This project is licensed under the MIT License - see the MIT-LICENSE file for details.