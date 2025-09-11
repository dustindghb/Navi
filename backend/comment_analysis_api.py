"""
Comment Analysis API
Simple HTTP API endpoint for the frontend to call when "See More" is clicked
"""

import json
import logging
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
import threading
from typing import Dict, Any
from ollama_comment_analyzer import analyze_document_comments, get_comment_count, test_connections

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class CommentAnalysisHandler(BaseHTTPRequestHandler):
    """HTTP request handler for comment analysis API"""
    
    def do_GET(self):
        """Handle GET requests"""
        try:
            parsed_path = urlparse(self.path)
            path = parsed_path.path
            query_params = parse_qs(parsed_path.query)
            
            if path == '/api/comment-analysis/health':
                self._handle_health_check()
            elif path == '/api/comment-analysis/test':
                self._handle_test_connections()
            elif path == '/api/comment-analysis/count':
                self._handle_get_comment_count(query_params)
            else:
                self._send_error_response(404, "Endpoint not found")
                
        except Exception as e:
            logger.error(f"Error handling GET request: {e}")
            self._send_error_response(500, f"Internal server error: {e}")
    
    def do_POST(self):
        """Handle POST requests"""
        try:
            parsed_path = urlparse(self.path)
            path = parsed_path.path
            
            if path == '/api/comment-analysis/analyze':
                self._handle_analyze_comments()
            else:
                self._send_error_response(404, "Endpoint not found")
                
        except Exception as e:
            logger.error(f"Error handling POST request: {e}")
            self._send_error_response(500, f"Internal server error: {e}")
    
    def _handle_health_check(self):
        """Handle health check endpoint"""
        response = {
            "status": "healthy",
            "service": "comment-analysis-api",
            "version": "1.0.0"
        }
        self._send_json_response(200, response)
    
    def _handle_test_connections(self):
        """Handle test connections endpoint"""
        try:
            result = test_connections()
            self._send_json_response(200, result)
        except Exception as e:
            self._send_error_response(500, f"Connection test failed: {e}")
    
    def _handle_get_comment_count(self, query_params: Dict[str, list]):
        """Handle get comment count endpoint"""
        try:
            document_id = query_params.get('document_id', [None])[0]
            if not document_id:
                self._send_error_response(400, "document_id parameter is required")
                return
            
            result = get_comment_count(document_id)
            self._send_json_response(200, result)
            
        except Exception as e:
            self._send_error_response(500, f"Failed to get comment count: {e}")
    
    def _handle_analyze_comments(self):
        """Handle analyze comments endpoint"""
        try:
            # Read request body
            content_length = int(self.headers.get('Content-Length', 0))
            if content_length == 0:
                self._send_error_response(400, "Request body is required")
                return
            
            body = self.rfile.read(content_length)
            request_data = json.loads(body.decode('utf-8'))
            
            # Validate required fields
            document_id = request_data.get('document_id')
            document_title = request_data.get('document_title', 'Unknown Document')
            max_comments = request_data.get('max_comments', 30)
            
            if not document_id:
                self._send_error_response(400, "document_id is required")
                return
            
            logger.info(f"Analyzing comments for document: {document_id}")
            
            # Perform analysis
            result = analyze_document_comments(document_id, document_title, max_comments)
            
            if result.success:
                self._send_json_response(200, {
                    "success": True,
                    "document_id": result.document_id,
                    "analysis": result.analysis,
                    "raw_response": result.raw_response
                })
            else:
                self._send_error_response(500, f"Analysis failed: {result.error}")
                
        except json.JSONDecodeError:
            self._send_error_response(400, "Invalid JSON in request body")
        except Exception as e:
            logger.error(f"Error analyzing comments: {e}")
            self._send_error_response(500, f"Analysis failed: {e}")
    
    def _send_json_response(self, status_code: int, data: Dict[str, Any]):
        """Send JSON response"""
        self.send_response(status_code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')  # Enable CORS
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
        
        response_json = json.dumps(data, indent=2)
        self.wfile.write(response_json.encode('utf-8'))
    
    def _send_error_response(self, status_code: int, message: str):
        """Send error response"""
        error_data = {
            "success": False,
            "error": message,
            "status_code": status_code
        }
        self._send_json_response(status_code, error_data)
    
    def do_OPTIONS(self):
        """Handle CORS preflight requests"""
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
    
    def log_message(self, format, *args):
        """Override to use our logger"""
        logger.info(f"{self.address_string()} - {format % args}")


def start_comment_analysis_server(port: int = 8080, host: str = 'localhost'):
    """
    Start the comment analysis API server
    """
    server_address = (host, port)
    httpd = HTTPServer(server_address, CommentAnalysisHandler)
    
    logger.info(f"Comment Analysis API server starting on http://{host}:{port}")
    logger.info("Available endpoints:")
    logger.info("  GET  /api/comment-analysis/health - Health check")
    logger.info("  GET  /api/comment-analysis/test - Test connections")
    logger.info("  GET  /api/comment-analysis/count?document_id=XXX - Get comment count")
    logger.info("  POST /api/comment-analysis/analyze - Analyze comments")
    
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        logger.info("Server stopped by user")
        httpd.shutdown()


def start_server_in_background(port: int = 8080, host: str = 'localhost'):
    """
    Start the server in a background thread
    """
    server_thread = threading.Thread(
        target=start_comment_analysis_server,
        args=(port, host),
        daemon=True
    )
    server_thread.start()
    return server_thread


# Example usage and testing
if __name__ == "__main__":
    import sys
    
    # Parse command line arguments
    port = 8080
    host = 'localhost'
    
    if len(sys.argv) > 1:
        try:
            port = int(sys.argv[1])
        except ValueError:
            print(f"Invalid port: {sys.argv[1]}")
            sys.exit(1)
    
    if len(sys.argv) > 2:
        host = sys.argv[2]
    
    print("=== Comment Analysis API Server ===")
    print(f"Starting server on http://{host}:{port}")
    print("\nTest the API with:")
    print(f"  curl http://{host}:{port}/api/comment-analysis/health")
    print(f"  curl http://{host}:{port}/api/comment-analysis/test")
    print(f"  curl \"http://{host}:{port}/api/comment-analysis/count?document_id=EPA-HQ-OAR-2021-0317-0001\"")
    print(f"  curl -X POST http://{host}:{port}/api/comment-analysis/analyze \\")
    print("    -H 'Content-Type: application/json' \\")
    print("    -d '{\"document_id\": \"EPA-HQ-OAR-2021-0317-0001\", \"document_title\": \"Test Document\"}'")
    print("\nPress Ctrl+C to stop the server")
    
    start_comment_analysis_server(port, host)
