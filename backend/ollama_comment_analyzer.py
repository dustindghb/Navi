"""
Ollama Comment Analyzer
This module provides integration with Ollama server for comment analysis using GPT-OSS:20b with tools
"""

import json
import logging
import requests
from typing import Dict, Any, Optional, List
from dataclasses import dataclass
from local_storage_reader import get_gpt_config, get_regulations_api_key
from gpt_oss_tools import create_gpt_oss_tool_interface

logger = logging.getLogger(__name__)

@dataclass
class CommentAnalysisResult:
    """Result from comment analysis"""
    success: bool
    document_id: str
    analysis: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    raw_response: Optional[str] = None

class OllamaCommentAnalyzer:
    """
    Comment analyzer that uses Ollama server with GPT-OSS:20b and tools
    """
    
    def __init__(self):
        self.gpt_config = get_gpt_config()
        self.tool_interface = create_gpt_oss_tool_interface()
        self.tools = self.tool_interface.get_tool_definitions()
    
    def analyze_document_comments(self, document_id: str, document_title: str, 
                                max_comments: int = 30, signal=None) -> CommentAnalysisResult:
        """
        Analyze comments for a document using Ollama with GPT-OSS:20b and tools
        
        Args:
            document_id: The regulations.gov document ID
            document_title: The document title for context
            max_comments: Maximum number of comments to analyze
            signal: AbortSignal for cancellation
            
        Returns:
            CommentAnalysisResult with analysis or error
        """
        try:
            # Get Ollama configuration
            gpt_host = self.gpt_config.get('gptHost', '10.0.4.52')
            gpt_port = self.gpt_config.get('gptPort', '11434')
            gpt_model = self.gpt_config.get('gptModel', 'gpt-oss:20b')
            
            url = f"http://{gpt_host}:{gpt_port}/api/generate"
            
            # Create the prompt with tool definitions
            prompt = self._create_analysis_prompt(document_id, document_title, max_comments)
            
            # Prepare the payload
            payload = {
                "model": gpt_model,
                "prompt": prompt,
                "stream": False,
                "reasoning_level": "high",  # Use high reasoning for complex analysis
                "options": {
                    "temperature": 0.3,
                    "top_p": 0.8,
                    "max_tokens": 4000  # Allow for longer responses
                }
            }
            
            logger.info(f"Calling Ollama for comment analysis: {document_id}")
            
            # Make the request
            response = requests.post(
                url,
                headers={'Content-Type': 'application/json'},
                json=payload,
                timeout=120,  # 2 minute timeout for analysis
                stream=False
            )
            
            if not response.ok:
                error_text = response.text
                if response.status_code == 0 or response.status_code >= 500:
                    raise Exception(f"Cannot connect to GPT model at {url}. Please check if the model is running.")
                raise Exception(f"HTTP {response.status_code}: {error_text}")
            
            # Parse the response
            result = response.json()
            raw_response = result.get('response', '')
            
            # Parse the structured response
            analysis = self._parse_analysis_response(raw_response)
            
            return CommentAnalysisResult(
                success=True,
                document_id=document_id,
                analysis=analysis,
                raw_response=raw_response
            )
            
        except Exception as e:
            logger.error(f"Error analyzing comments for document {document_id}: {e}")
            return CommentAnalysisResult(
                success=False,
                document_id=document_id,
                error=str(e)
            )
    
    def _create_analysis_prompt(self, document_id: str, document_title: str, max_comments: int) -> str:
        """
        Create the prompt for GPT-OSS:20b with tool definitions
        """
        
        # Get tool definitions as JSON
        tools_json = json.dumps(self.tools, indent=2)
        
        prompt = f"""You are an AI assistant specialized in analyzing regulatory comments using advanced tools. You have access to powerful tools for fetching and analyzing public comments from regulations.gov.

DOCUMENT TO ANALYZE:
- Document ID: {document_id}
- Title: {document_title}
- Max Comments: {max_comments}

AVAILABLE TOOLS:
{tools_json}

TASK: Analyze the public comments for this regulatory document and provide a comprehensive analysis.

INSTRUCTIONS:
1. First, test the API connection using the test_api_connection tool
2. Get the comment count using the get_comment_count tool
3. If comments exist, perform a comprehensive analysis using the analyze_regulatory_comments tool
4. Synthesize insights using the synthesize_comment_insights tool
5. Identify regulatory themes using the identify_regulatory_themes tool
6. Assess stakeholder concerns using the assess_stakeholder_concerns tool

TOOL USAGE FORMAT:
When you need to use a tool, respond with:
```json
{{
  "tool": "tool_name",
  "parameters": {{
    "param1": "value1",
    "param2": "value2"
  }}
}}
```

ANALYSIS REQUIREMENTS:
- Provide key insights and common perspectives
- Identify main regulatory themes and concerns
- Analyze stakeholder engagement and sentiment
- Extract recommendations and suggestions
- Assess potential impacts and challenges
- Provide confidence levels for your analysis

RESPONSE FORMAT:
Provide a comprehensive analysis in the following JSON format:

```json
{{
  "summary": "Executive summary of the comment analysis",
  "key_insights": [
    "Key insight 1",
    "Key insight 2",
    "Key insight 3"
  ],
  "common_perspectives": [
    "Perspective 1",
    "Perspective 2"
  ],
  "regulatory_themes": [
    {{
      "theme": "theme_name",
      "description": "description",
      "frequency": "high/medium/low"
    }}
  ],
  "stakeholder_concerns": [
    {{
      "concern": "concern_description",
      "stakeholder_type": "organizations/individuals/common",
      "severity": "high/medium/low"
    }}
  ],
  "recommendations": [
    "Recommendation 1",
    "Recommendation 2"
  ],
  "sentiment_analysis": {{
    "overall_sentiment": "positive/negative/mixed",
    "confidence": 0.85,
    "details": "Detailed sentiment analysis"
  }},
  "impact_assessment": {{
    "economic_impact": "high/medium/low",
    "implementation_challenges": ["challenge1", "challenge2"],
    "timeline_concerns": ["concern1", "concern2"]
  }},
  "confidence_score": 0.8,
  "total_comments_analyzed": 25
}}
```

Begin the analysis now. Start by testing the API connection and then proceed with the full analysis."""

        return prompt
    
    def _parse_analysis_response(self, response: str) -> Dict[str, Any]:
        """
        Parse the structured response from GPT-OSS:20b
        """
        try:
            # Try to extract JSON from the response
            if "```json" in response:
                # Extract JSON between ```json and ```
                start = response.find("```json") + 7
                end = response.find("```", start)
                if end > start:
                    json_str = response[start:end].strip()
                    return json.loads(json_str)
            
            # If no JSON blocks, try to parse the entire response as JSON
            if response.strip().startswith("{"):
                return json.loads(response)
            
            # Fallback: create a basic analysis structure
            return {
                "summary": response[:500] + "..." if len(response) > 500 else response,
                "key_insights": ["Analysis completed but response format was not JSON"],
                "common_perspectives": ["Response parsing required manual review"],
                "regulatory_themes": [],
                "stakeholder_concerns": [],
                "recommendations": [],
                "sentiment_analysis": {
                    "overall_sentiment": "unknown",
                    "confidence": 0.5,
                    "details": "Response format was not JSON"
                },
                "impact_assessment": {
                    "economic_impact": "unknown",
                    "implementation_challenges": [],
                    "timeline_concerns": []
                },
                "confidence_score": 0.5,
                "total_comments_analyzed": 0,
                "raw_response": response
            }
            
        except json.JSONDecodeError as e:
            logger.error(f"Error parsing JSON response: {e}")
            return {
                "summary": "Analysis completed but response could not be parsed as JSON",
                "key_insights": ["Response parsing failed"],
                "common_perspectives": ["Manual review required"],
                "regulatory_themes": [],
                "stakeholder_concerns": [],
                "recommendations": [],
                "sentiment_analysis": {
                    "overall_sentiment": "unknown",
                    "confidence": 0.3,
                    "details": f"JSON parsing error: {e}"
                },
                "impact_assessment": {
                    "economic_impact": "unknown",
                    "implementation_challenges": [],
                    "timeline_concerns": []
                },
                "confidence_score": 0.3,
                "total_comments_analyzed": 0,
                "raw_response": response,
                "parse_error": str(e)
            }

    def get_comment_count_only(self, document_id: str) -> Dict[str, Any]:
        """
        Get just the comment count for a document (quick check)
        """
        try:
            result = self.tool_interface.execute_tool("get_comment_count", {
                "document_id": document_id
            })
            return result
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "document_id": document_id
            }

    def test_connection(self) -> Dict[str, Any]:
        """
        Test the connection to both Ollama and regulations.gov API
        """
        try:
            # Test regulations.gov API
            api_test = self.tool_interface.execute_tool("test_api_connection", {})
            
            # Test Ollama connection
            gpt_host = self.gpt_config.get('gptHost', '10.0.4.52')
            gpt_port = self.gpt_config.get('gptPort', '11434')
            gpt_model = self.gpt_config.get('gptModel', 'gpt-oss:20b')
            
            url = f"http://{gpt_host}:{gpt_port}/api/generate"
            
            test_payload = {
                "model": gpt_model,
                "prompt": "Test connection",
                "stream": False,
                "options": {
                    "temperature": 0.1,
                    "max_tokens": 10
                }
            }
            
            response = requests.post(
                url,
                headers={'Content-Type': 'application/json'},
                json=test_payload,
                timeout=10
            )
            
            ollama_test = {
                "success": response.ok,
                "message": "Ollama connection successful" if response.ok else f"Ollama connection failed: {response.status_code}"
            }
            
            return {
                "success": api_test.get("success", False) and ollama_test.get("success", False),
                "regulations_api": api_test,
                "ollama": ollama_test,
                "config": {
                    "gpt_host": gpt_host,
                    "gpt_port": gpt_port,
                    "gpt_model": gpt_model
                }
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "regulations_api": {"success": False, "error": "Not tested"},
                "ollama": {"success": False, "error": "Not tested"}
            }


# Convenience functions for easy integration
def analyze_document_comments(document_id: str, document_title: str, 
                            max_comments: int = 30, signal=None) -> CommentAnalysisResult:
    """
    Convenience function to analyze document comments
    """
    analyzer = OllamaCommentAnalyzer()
    return analyzer.analyze_document_comments(document_id, document_title, max_comments, signal)

def get_comment_count(document_id: str) -> Dict[str, Any]:
    """
    Convenience function to get comment count
    """
    analyzer = OllamaCommentAnalyzer()
    return analyzer.get_comment_count_only(document_id)

def test_connections() -> Dict[str, Any]:
    """
    Convenience function to test all connections
    """
    analyzer = OllamaCommentAnalyzer()
    return analyzer.test_connection()


# Example usage and testing
if __name__ == "__main__":
    print("=== Ollama Comment Analyzer Test ===\n")
    
    # Test connections
    print("1. Testing connections...")
    connection_test = test_connections()
    print(f"Connection test: {json.dumps(connection_test, indent=2)}")
    
    if connection_test.get("success"):
        print("\n✅ All connections successful!")
        
        # Test with a sample document
        document_id = "EPA-HQ-OAR-2021-0317-0001"
        document_title = "Sample EPA Regulation"
        
        print(f"\n2. Getting comment count for document {document_id}...")
        count_result = get_comment_count(document_id)
        print(f"Comment count: {json.dumps(count_result, indent=2)}")
        
        if count_result.get("success") and count_result.get("comment_count", 0) > 0:
            print(f"\n3. Analyzing comments for document {document_id}...")
            analysis_result = analyze_document_comments(document_id, document_title, max_comments=10)
            
            if analysis_result.success:
                print("✅ Analysis completed successfully!")
                print(f"Analysis: {json.dumps(analysis_result.analysis, indent=2)}")
            else:
                print(f"❌ Analysis failed: {analysis_result.error}")
        else:
            print("No comments found for this document.")
    else:
        print("❌ Connection test failed. Please check your configuration.")
        print("\nTo fix:")
        print("1. Make sure your Ollama server is running")
        print("2. Make sure you have a regulations.gov API key configured")
        print("3. Check your GPT configuration in Settings")
