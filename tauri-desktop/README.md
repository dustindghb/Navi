# Navi - Civic Engagement Assistant

A sophisticated desktop application built with Tauri, React, and TypeScript that helps users discover, analyze, and engage with government policy documents through AI-powered semantic matching and comment drafting assistance.

## 🎯 Overview

Navi is a civic engagement platform that democratizes access to government policy documents by:

- **Semantic Document Matching**: Uses AI embeddings to match government documents with user interests and personas
- **Intelligent Comment Drafting**: Provides AI-assisted comment writing with real-time suggestions
- **Public Comment Analysis**: Fetches and analyzes existing public comments on policy documents
- **Persona-Based Recommendations**: Creates personalized document recommendations based on user profiles

## 🏗️ Architecture

### Frontend (React + TypeScript)
- **Framework**: React 19.1.0 with TypeScript
- **UI Library**: Material-UI (MUI) v7.3.2 with custom dark theme
- **Build Tool**: Vite 7.0.4
- **State Management**: React hooks with localStorage persistence

### Backend Integration
- **Local API**: Python FastAPI server running on `localhost:8001`
- **Database**: SQLite with document, persona, and comment storage
- **AI Models**: Ollama integration for embeddings and text generation
- **External APIs**: Regulations.gov API for public comments

### Desktop Framework
- **Tauri**: Cross-platform desktop app framework
- **Rust Backend**: Minimal Rust code with HTTP and opener plugins
- **Platform Support**: Windows, macOS, Linux

## 📁 Project Structure

```
tauri-desktop/
├── src/
│   ├── components/           # Reusable UI components
│   │   ├── CommentDrafting.tsx    # AI-assisted comment editor
│   │   └── SimpleDatabaseSettings.tsx  # Database management UI
│   ├── pages/               # Main application pages
│   │   ├── Dashboard.tsx           # Main document discovery interface
│   │   ├── Persona.tsx            # User profile configuration
│   │   ├── Settings.tsx           # App configuration and API setup
│   │   └── CommentDraft.tsx       # Comment drafting interface
│   ├── utils/               # Utility functions
│   │   ├── regulationsGovApi.ts   # Regulations.gov API integration
│   │   └── semanticMatching.ts    # AI embedding and matching logic
│   ├── App.tsx              # Main application component
│   ├── theme.ts             # Material-UI theme configuration
│   └── main.tsx             # Application entry point
├── src-tauri/               # Tauri configuration
│   ├── src/main.rs          # Rust backend entry point
│   ├── Cargo.toml           # Rust dependencies
│   └── tauri.conf.json      # Tauri app configuration
├── package.json             # Node.js dependencies
└── vite.config.ts           # Vite build configuration
```

## 🚀 Features

### 1. Dashboard - Document Discovery
- **Semantic Search**: AI-powered document matching based on user persona
- **Document Embedding**: Automatic embedding generation for policy documents
- **Relevance Scoring**: Dual scoring system (semantic similarity + GPT reasoning)
- **Comment Period Tracking**: Visual indicators for documents accepting comments
- **Public Comment Integration**: View existing comments from regulations.gov

### 2. Persona Management
- **Comprehensive Profiles**: Demographics, interests, and regulatory focus areas
- **Policy Interest Categories**: 50+ predefined policy areas across 8 categories
- **Agency Preferences**: 100+ federal agencies and departments
- **Embedding Generation**: Automatic persona embedding for semantic matching
- **Persistent Storage**: Database-backed profile management

### 3. AI-Powered Comment Drafting
- **Real-time Suggestions**: AI feedback on comment structure, clarity, and compliance
- **Version Control**: Track comment revisions and improvements
- **Suggestion Categories**: Structure, clarity, evidence, tone, and compliance
- **Auto-save**: Automatic comment saving with debounced updates
- **Submission Integration**: Direct submission to regulations.gov

### 4. Settings & Configuration
- **Ollama Integration**: Local and remote AI model configuration
- **Embedding Models**: Separate configuration for embedding generation
- **API Management**: Regulations.gov API key management
- **Database Operations**: Document fetching, clearing, and management
- **Connection Testing**: Comprehensive connectivity and API testing

### 5. Database Management
- **Document Storage**: SQLite database with full-text search capabilities
- **Persona Storage**: User profile and embedding persistence
- **Comment Tracking**: Draft and submitted comment management
- **Data Visualization**: Table views and statistics for all data types

## 🛠️ Technology Stack

### Core Technologies
- **Tauri 2.0**: Desktop app framework
- **React 19.1.0**: Frontend framework
- **TypeScript 5.8.3**: Type-safe development
- **Material-UI 7.3.2**: Component library
- **Vite 7.0.4**: Build tool and dev server

### AI & Machine Learning
- **Ollama**: Local AI model hosting
- **Embedding Models**: Vector embeddings for semantic search
- **GPT Models**: Text generation and reasoning
- **Semantic Matching**: Cosine similarity and relevance scoring

### Backend Services
- **Python FastAPI**: Local API server
- **SQLite**: Embedded database
- **Regulations.gov API**: Government document and comment data
- **HTTP Client**: Tauri HTTP plugin for CORS-free requests

## 🎨 Design System

### Color Palette
- **Background**: `#0A0A0A` (primary), `#1A1A1A` (secondary)
- **Text**: `#FAFAFA` (primary), `#B8B8B8` (secondary)
- **Accent**: `#3C362A` (primary), `#2A2A2A` (secondary)
- **Status**: `#4CAF50` (success), `#FF6B6B` (error), `#FFA726` (warning)

### Typography
- **Font Family**: System default with Material-UI typography
- **Font Weights**: 400 (regular), 500 (medium), 600 (semi-bold), 700 (bold)
- **Responsive**: Mobile-first design with desktop optimization

## 🔧 Installation & Setup

### Prerequisites
- **Node.js**: v18+ with npm
- **Rust**: Latest stable version
- **Python**: v3.8+ (for backend API)
- **Ollama**: For AI model hosting (optional)

### Development Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Navi/tauri-desktop
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the backend API**
   ```bash
   cd ../backend
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   python simple_main.py
   ```

4. **Start the development server**
   ```bash
   npm run tauri dev
   ```

### Production Build

```bash
npm run tauri build
```

## ⚙️ Configuration

### Ollama Setup
1. Install Ollama from [ollama.ai](https://ollama.ai)
2. Pull required models:
   ```bash
   ollama pull gpt-oss:20b
   ollama pull nomic-embed-text:latest
   ```
3. Configure in Settings → Remote/Local Configuration

### Regulations.gov API
1. Get API key from [regulations.gov/api](https://regulations.gov/api)
2. Configure in Settings → Regulations.gov API Configuration
3. Test connection to verify access

### Database Setup
- SQLite database is automatically created on first run
- Documents are fetched from the configured API endpoint
- Personas and comments are stored locally

## 📊 Data Flow

### Document Discovery
1. **Fetch**: Documents retrieved from regulations.gov API
2. **Embed**: Generate embeddings for document content
3. **Store**: Save to local SQLite database
4. **Match**: Semantic matching with user persona embeddings
5. **Score**: Dual scoring (semantic + GPT reasoning)
6. **Display**: Ranked results with relevance explanations

### Comment Drafting
1. **Create**: Initialize comment draft for selected document
2. **Analyze**: AI analyzes content for improvements
3. **Suggest**: Real-time suggestions for structure, clarity, etc.
4. **Apply**: User can apply or ignore suggestions
5. **Submit**: Direct submission to regulations.gov

## 🔒 Security & Privacy

- **Local Storage**: All user data stored locally
- **API Keys**: Securely stored in localStorage
- **CORS Handling**: Tauri HTTP plugin bypasses browser CORS restrictions
- **No Data Collection**: No user data sent to external services (except regulations.gov)

## 🚀 Performance

### Optimizations
- **Lazy Loading**: Components loaded on demand
- **Debounced Updates**: Comment auto-save with 2-second debounce
- **Efficient Embeddings**: Vector similarity calculations optimized
- **Database Indexing**: SQLite indexes for fast queries
- **Memory Management**: Proper cleanup of event listeners and timeouts

### Scalability
- **Batch Processing**: Document embedding in batches
- **Pagination**: Large document sets handled efficiently
- **Caching**: Embeddings cached to avoid regeneration
- **Background Processing**: Non-blocking AI operations

## 🧪 Testing

### Manual Testing
- **Connection Tests**: Built-in connectivity testing for all APIs
- **Database Operations**: Comprehensive database management UI
- **Error Handling**: Graceful error handling with user feedback
- **Cross-platform**: Tested on Windows, macOS, and Linux

### Development Tools
- **TypeScript**: Compile-time error checking
- **ESLint**: Code quality and consistency
- **Hot Reload**: Fast development iteration
- **Debug Console**: Comprehensive logging for troubleshooting

## 📈 Roadmap

### Planned Features
- **Multi-language Support**: Internationalization
- **Advanced Analytics**: Comment sentiment analysis
- **Collaboration**: Team comment drafting
- **Notifications**: Comment period alerts
- **Export**: PDF and document export functionality

### Technical Improvements
- **Performance**: Further optimization for large datasets
- **Offline Mode**: Full offline functionality
- **Mobile App**: React Native companion app
- **Cloud Sync**: Optional cloud backup and sync

## 🤝 Contributing

### Development Guidelines
- **Code Style**: Follow TypeScript and React best practices
- **Component Structure**: Use functional components with hooks
- **Error Handling**: Comprehensive error boundaries and user feedback
- **Documentation**: Inline comments for complex logic
- **Testing**: Manual testing for all new features

### Pull Request Process
1. Fork the repository
2. Create a feature branch
3. Make changes with proper testing
4. Submit pull request with detailed description
5. Address review feedback

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Regulations.gov**: For providing public access to government documents
- **Ollama**: For making AI models accessible locally
- **Tauri**: For the excellent desktop app framework
- **Material-UI**: For the comprehensive component library
- **Open Source Community**: For the tools and libraries that made this possible

## 📞 Support

For support, feature requests, or bug reports:
- **Issues**: Use GitHub Issues for bug reports and feature requests
- **Documentation**: Check this README and inline code comments
- **Community**: Join discussions in GitHub Discussions

---

**Navi** - Empowering civic engagement through AI-powered document discovery and comment drafting.