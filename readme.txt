# Navi Desktop App

A desktop application for regulation analysis and AI model configuration built with Tauri and React.

## Requirements

Before running the application, ensure you have the following installed:

### System Requirements
- **Node.js** (v16 or higher) - [Download here](https://nodejs.org/)
- **Rust** (latest stable version) - [Install via rustup](https://rustup.rs/)
- **Tauri CLI** - Will be installed automatically with the project

### Platform-Specific Requirements

#### Windows
- Microsoft Visual Studio C++ Build Tools
- WebView2 (usually pre-installed on Windows 10/11)

#### macOS
- Xcode Command Line Tools: `xcode-select --install`

## Setup Instructions

1. **Clone the repository** (if not already done)
   ```bash
   git clone <repository-url>
   cd Navi
   ```

2. **Install dependencies**
   ```bash
   cd tauri-desktop
   npm install
   ```

3. **Run the development server**
   ```bash
   npm run tauri dev
   ```

## Project Structure

- `tauri-desktop/` - Main desktop application (React + Tauri)
- `lambda_function.py` - AWS Lambda function for API endpoints
- `workflows/` - N8N workflow configurations

## Features

- **Remote Ollama Configuration** - Connect to remote AI models
- **Local Ollama Configuration** - Configure local AI models
- **Regulations.gov Data Fetching** - Fetch and analyze regulatory documents
- **Data Preview** - Preview fetched data with expandable sections
- **Settings Management** - Persistent configuration storage

## Development

The application uses:
- **Frontend**: React with Material-UI
- **Backend**: Tauri (Rust)
- **Styling**: Material-UI with custom monochrome theme
- **State Management**: React hooks with localStorage persistence

## License

This project is licensed under the MIT License - see the LICENSE file for details.