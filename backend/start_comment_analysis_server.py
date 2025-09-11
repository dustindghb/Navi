#!/usr/bin/env python3
"""
Start Comment Analysis Server
Simple script to start the comment analysis API server
"""

import sys
import os
import signal
import time
from comment_analysis_api import start_comment_analysis_server

def signal_handler(sig, frame):
    """Handle Ctrl+C gracefully"""
    print('\n🛑 Shutting down comment analysis server...')
    sys.exit(0)

def main():
    """Main function to start the server"""
    print("🚀 Starting Comment Analysis API Server")
    print("=" * 50)
    
    # Set up signal handler for graceful shutdown
    signal.signal(signal.SIGINT, signal_handler)
    
    # Parse command line arguments
    port = 8080
    host = 'localhost'
    
    if len(sys.argv) > 1:
        try:
            port = int(sys.argv[1])
        except ValueError:
            print(f"❌ Invalid port: {sys.argv[1]}")
            print("Usage: python start_comment_analysis_server.py [port] [host]")
            sys.exit(1)
    
    if len(sys.argv) > 2:
        host = sys.argv[2]
    
    print(f"📡 Server will start on: http://{host}:{port}")
    print(f"🔧 API endpoints available:")
    print(f"   GET  /api/comment-analysis/health - Health check")
    print(f"   GET  /api/comment-analysis/test - Test connections")
    print(f"   GET  /api/comment-analysis/count?document_id=XXX - Get comment count")
    print(f"   POST /api/comment-analysis/analyze - Analyze comments")
    print()
    print("🧪 Test the API with:")
    print(f"   curl http://{host}:{port}/api/comment-analysis/health")
    print(f"   curl http://{host}:{port}/api/comment-analysis/test")
    print()
    print("📱 Frontend integration:")
    print(f"   Call POST http://{host}:{port}/api/comment-analysis/analyze")
    print("   with JSON body: {\"document_id\": \"XXX\", \"document_title\": \"Title\"}")
    print()
    print("⏹️  Press Ctrl+C to stop the server")
    print("=" * 50)
    
    try:
        # Start the server
        start_comment_analysis_server(port, host)
    except KeyboardInterrupt:
        print("\n🛑 Server stopped by user")
    except Exception as e:
        print(f"❌ Server error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
