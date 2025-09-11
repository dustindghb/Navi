"""
GPT-OSS:20b Tool Interface for Regulatory Comment Analysis
This module provides the tool definitions and interface for GPT-OSS:20b to analyze
regulatory comments from regulations.gov API
"""

import json
import logging
from typing import Dict, List, Any, Optional
from datetime import datetime
import os

from regulations_gov_api import RegulationsGovAPI, create_regulations_analysis_tool
from ai_comment_analyzer import GPTOSSAnalyzer, create_advanced_analysis_tool, AdvancedCommentAnalysis

logger = logging.getLogger(__name__)

class GPTOSSToolInterface:
    """
    Main interface class for GPT-OSS:20b integration
    Provides all the tools needed for regulatory comment analysis
    """
    
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key
        self.regulations_api = RegulationsGovAPI(api_key)
        self.advanced_analyzer = GPTOSSAnalyzer()
        
        # Initialize tool sets
        self.basic_tools = create_regulations_analysis_tool(api_key)
        self.advanced_tools = create_advanced_analysis_tool()
    
    def get_tool_definitions(self) -> List[Dict[str, Any]]:
        """
        Get the complete set of tool definitions for GPT-OSS:20b
        Returns the tool schema that the AI model can use
        """
        return [
            {
                "type": "function",
                "function": {
                    "name": "analyze_regulatory_comments",
                    "description": "Analyze public comments on a regulatory document using AI to extract key points, common perspectives, and stakeholder concerns",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "document_id": {
                                "type": "string",
                                "description": "The regulations.gov document ID to analyze (e.g., 'EPA-HQ-OAR-2021-0317-0001')"
                            },
                            "max_comments": {
                                "type": "integer",
                                "description": "Maximum number of comments to analyze (default: 30, max: 100)",
                                "default": 30,
                                "minimum": 1,
                                "maximum": 100
                            },
                            "analysis_depth": {
                                "type": "string",
                                "enum": ["basic", "advanced", "comprehensive"],
                                "description": "Depth of analysis to perform",
                                "default": "advanced"
                            }
                        },
                        "required": ["document_id"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "get_comment_count",
                    "description": "Get the total number of public comments on a regulatory document",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "document_id": {
                                "type": "string",
                                "description": "The regulations.gov document ID"
                            }
                        },
                        "required": ["document_id"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "synthesize_comment_insights",
                    "description": "Synthesize key insights from comment analysis for executive summary",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "analysis_results": {
                                "type": "object",
                                "description": "Results from analyze_regulatory_comments function"
                            },
                            "summary_type": {
                                "type": "string",
                                "enum": ["executive", "technical", "stakeholder"],
                                "description": "Type of summary to generate",
                                "default": "executive"
                            }
                        },
                        "required": ["analysis_results"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "identify_regulatory_themes",
                    "description": "Identify and categorize key regulatory themes from comment analysis",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "analysis_results": {
                                "type": "object",
                                "description": "Results from analyze_regulatory_comments function"
                            }
                        },
                        "required": ["analysis_results"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "assess_stakeholder_concerns",
                    "description": "Assess and categorize stakeholder concerns by type and frequency",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "analysis_results": {
                                "type": "object",
                                "description": "Results from analyze_regulatory_comments function"
                            }
                        },
                        "required": ["analysis_results"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "test_api_connection",
                    "description": "Test the connection to regulations.gov API",
                    "parameters": {
                        "type": "object",
                        "properties": {}
                    }
                }
            }
        ]
    
    def execute_tool(self, tool_name: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute a tool function by name with given parameters
        This is the main entry point for GPT-OSS:20b to call tools
        """
        try:
            if tool_name == "analyze_regulatory_comments":
                return self._analyze_regulatory_comments(**parameters)
            elif tool_name == "get_comment_count":
                return self._get_comment_count(**parameters)
            elif tool_name == "synthesize_comment_insights":
                return self._synthesize_comment_insights(**parameters)
            elif tool_name == "identify_regulatory_themes":
                return self._identify_regulatory_themes(**parameters)
            elif tool_name == "assess_stakeholder_concerns":
                return self._assess_stakeholder_concerns(**parameters)
            elif tool_name == "test_api_connection":
                return self._test_api_connection(**parameters)
            else:
                return {
                    "success": False,
                    "error": f"Unknown tool: {tool_name}",
                    "available_tools": [tool["function"]["name"] for tool in self.get_tool_definitions()]
                }
        except Exception as e:
            logger.error(f"Error executing tool {tool_name}: {e}")
            return {
                "success": False,
                "error": str(e),
                "tool": tool_name
            }
    
    def _analyze_regulatory_comments(self, document_id: str, max_comments: int = 30, 
                                   analysis_depth: str = "advanced") -> Dict[str, Any]:
        """
        Main analysis function that fetches and analyzes regulatory comments
        """
        try:
            logger.info(f"Starting {analysis_depth} analysis of document {document_id}")
            
            # Fetch comments from regulations.gov
            comments = self.regulations_api.fetch_comments_by_document_id(document_id, max_comments)
            
            if not comments:
                return {
                    "success": True,
                    "document_id": document_id,
                    "message": "No comments found for this document",
                    "analysis": {
                        "total_comments_analyzed": 0,
                        "key_points": [],
                        "common_perspectives": [],
                        "sentiment_summary": "No comments available for analysis",
                        "stakeholder_types": [],
                        "summary": "No public comments were found for this document."
                    }
                }
            
            # Perform analysis based on depth
            if analysis_depth == "basic":
                analysis = self._perform_basic_analysis(comments)
            elif analysis_depth == "advanced":
                analysis = self.advanced_analyzer.analyze_comments_advanced(comments, document_id)
            else:  # comprehensive
                analysis = self._perform_comprehensive_analysis(comments, document_id)
            
            # Convert analysis to dictionary
            if hasattr(analysis, '__dict__'):
                analysis_dict = analysis.__dict__
            else:
                analysis_dict = analysis
            
            return {
                "success": True,
                "document_id": document_id,
                "analysis_depth": analysis_depth,
                "total_comments_found": len(comments),
                "analysis": analysis_dict,
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error analyzing comments for document {document_id}: {e}")
            return {
                "success": False,
                "error": str(e),
                "document_id": document_id
            }
    
    def _get_comment_count(self, document_id: str) -> Dict[str, Any]:
        """Get comment count for a document"""
        try:
            count = self.regulations_api.get_document_comment_count(document_id)
            return {
                "success": True,
                "document_id": document_id,
                "comment_count": count,
                "timestamp": datetime.now().isoformat()
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "document_id": document_id
            }
    
    def _synthesize_comment_insights(self, analysis_results: Dict[str, Any], 
                                   summary_type: str = "executive") -> Dict[str, Any]:
        """Synthesize key insights from analysis results"""
        try:
            if not analysis_results.get("success"):
                return analysis_results
            
            analysis = analysis_results.get("analysis", {})
            
            if summary_type == "executive":
                insights = self._create_executive_summary(analysis)
            elif summary_type == "technical":
                insights = self._create_technical_summary(analysis)
            else:  # stakeholder
                insights = self._create_stakeholder_summary(analysis)
            
            return {
                "success": True,
                "summary_type": summary_type,
                "insights": insights,
                "document_id": analysis_results.get("document_id"),
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
    
    def _identify_regulatory_themes(self, analysis_results: Dict[str, Any]) -> Dict[str, Any]:
        """Identify and categorize regulatory themes"""
        try:
            if not analysis_results.get("success"):
                return analysis_results
            
            analysis = analysis_results.get("analysis", {})
            themes = analysis.get("regulatory_themes", [])
            
            # Categorize themes by type
            theme_categories = {
                "compliance": [],
                "economic": [],
                "environmental": [],
                "safety": [],
                "technical": [],
                "timeline": []
            }
            
            for theme in themes:
                theme_name = theme.get("theme", "")
                if "compliance" in theme_name:
                    theme_categories["compliance"].append(theme)
                elif "economic" in theme_name:
                    theme_categories["economic"].append(theme)
                elif "environmental" in theme_name:
                    theme_categories["environmental"].append(theme)
                elif "safety" in theme_name:
                    theme_categories["safety"].append(theme)
                elif "technical" in theme_name:
                    theme_categories["technical"].append(theme)
                elif "timeline" in theme_name:
                    theme_categories["timeline"].append(theme)
            
            return {
                "success": True,
                "theme_categories": theme_categories,
                "total_themes": len(themes),
                "document_id": analysis_results.get("document_id"),
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
    
    def _assess_stakeholder_concerns(self, analysis_results: Dict[str, Any]) -> Dict[str, Any]:
        """Assess stakeholder concerns by type and frequency"""
        try:
            if not analysis_results.get("success"):
                return analysis_results
            
            analysis = analysis_results.get("analysis", {})
            concerns = analysis.get("stakeholder_concerns", {})
            
            # Analyze concern patterns
            concern_analysis = {
                "total_concerns": sum(len(concern_list) for concern_list in concerns.values()),
                "concerns_by_type": {
                    "organizations": len(concerns.get("organizations", [])),
                    "individuals": len(concerns.get("individuals", [])),
                    "common": len(concerns.get("common", []))
                },
                "top_concerns": concerns.get("common", [])[:5],
                "stakeholder_distribution": {
                    "organization_concerns": concerns.get("organizations", [])[:3],
                    "individual_concerns": concerns.get("individuals", [])[:3]
                }
            }
            
            return {
                "success": True,
                "concern_analysis": concern_analysis,
                "document_id": analysis_results.get("document_id"),
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
    
    def _test_api_connection(self) -> Dict[str, Any]:
        """Test API connection"""
        try:
            result = self.regulations_api.test_api_connection()
            return {
                "success": True,
                "message": result,
                "timestamp": datetime.now().isoformat()
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }
    
    def _perform_basic_analysis(self, comments) -> Dict[str, Any]:
        """Perform basic analysis using the basic tools"""
        try:
            # Convert comments to the format expected by basic tools
            comments_data = []
            for comment in comments:
                comments_data.append({
                    'id': comment.id,
                    'comment_text': comment.comment_text,
                    'submitter_name': comment.submitter_name,
                    'organization_name': comment.organization_name,
                    'posted_date': comment.posted_date
                })
            
            # Use the advanced analyzer for basic analysis
            analysis = self.advanced_analyzer.analyze_comments_advanced(comments, "basic_analysis")
            
            # Return simplified version
            return {
                'key_points': analysis.key_points,
                'common_perspectives': analysis.common_perspectives,
                'sentiment_summary': analysis.sentiment_summary,
                'stakeholder_types': analysis.stakeholder_types,
                'summary': analysis.summary,
                'total_comments_analyzed': analysis.total_comments_analyzed
            }
            
        except Exception as e:
            logger.error(f"Error in basic analysis: {e}")
            return {
                'key_points': [],
                'common_perspectives': [],
                'sentiment_summary': "Analysis failed",
                'stakeholder_types': [],
                'summary': f"Error performing analysis: {e}",
                'total_comments_analyzed': 0
            }
    
    def _perform_comprehensive_analysis(self, comments, document_id: str) -> AdvancedCommentAnalysis:
        """Perform comprehensive analysis with all available features"""
        try:
            # Use the advanced analyzer with full features
            analysis = self.advanced_analyzer.analyze_comments_advanced(comments, document_id)
            
            # Add additional comprehensive features
            analysis.comprehensive_metadata = {
                "analysis_version": "1.0",
                "features_used": ["sentiment", "themes", "impacts", "stakeholders", "recommendations"],
                "data_quality_score": self._calculate_data_quality_score(comments),
                "analysis_confidence": analysis.confidence_scores.get("overall_confidence", 0.0)
            }
            
            return analysis
            
        except Exception as e:
            logger.error(f"Error in comprehensive analysis: {e}")
            raise
    
    def _create_executive_summary(self, analysis: Dict[str, Any]) -> Dict[str, Any]:
        """Create executive summary of analysis"""
        return {
            "overview": analysis.get("summary", ""),
            "key_findings": analysis.get("key_points", [])[:3],
            "sentiment": analysis.get("sentiment_summary", ""),
            "stakeholder_engagement": {
                "total_comments": analysis.get("total_comments_analyzed", 0),
                "stakeholder_types": analysis.get("stakeholder_types", [])
            },
            "primary_themes": [theme.get("theme", "") for theme in analysis.get("regulatory_themes", [])[:3]],
            "confidence_level": analysis.get("confidence_scores", {}).get("overall_confidence", 0.0)
        }
    
    def _create_technical_summary(self, analysis: Dict[str, Any]) -> Dict[str, Any]:
        """Create technical summary of analysis"""
        return {
            "technical_issues": analysis.get("technical_issues", [])[:5],
            "implementation_challenges": analysis.get("implementation_challenges", [])[:5],
            "regulatory_themes": analysis.get("regulatory_themes", []),
            "impact_assessments": analysis.get("impact_assessments", []),
            "recommendations": analysis.get("recommendation_patterns", [])[:5],
            "data_quality": analysis.get("confidence_scores", {})
        }
    
    def _create_stakeholder_summary(self, analysis: Dict[str, Any]) -> Dict[str, Any]:
        """Create stakeholder-focused summary"""
        return {
            "stakeholder_concerns": analysis.get("stakeholder_concerns", {}),
            "stakeholder_types": analysis.get("stakeholder_types", []),
            "common_perspectives": analysis.get("common_perspectives", []),
            "economic_concerns": analysis.get("economic_concerns", [])[:5],
            "timeline_concerns": analysis.get("timeline_concerns", [])[:5],
            "engagement_level": analysis.get("total_comments_analyzed", 0)
        }
    
    def _calculate_data_quality_score(self, comments) -> float:
        """Calculate data quality score based on comment completeness"""
        if not comments:
            return 0.0
        
        total_score = 0.0
        for comment in comments:
            score = 0.0
            if comment.comment_text and len(comment.comment_text) > 50:
                score += 0.4
            if comment.submitter_name or comment.organization_name:
                score += 0.3
            if comment.posted_date:
                score += 0.2
            if comment.title:
                score += 0.1
            total_score += score
        
        return total_score / len(comments)


# Factory function to create the tool interface
def create_gpt_oss_tool_interface(api_key: Optional[str] = None) -> GPTOSSToolInterface:
    """
    Factory function to create a GPT-OSS tool interface
    This is the main entry point for integrating with GPT-OSS:20b
    """
    return GPTOSSToolInterface(api_key)


# Example usage and testing
if __name__ == "__main__":
    # Example usage
    api_key = "your-api-key-here"  # This would come from configuration
    
    # Create the tool interface
    tool_interface = create_gpt_oss_tool_interface(api_key)
    
    # Get tool definitions for GPT-OSS:20b
    tools = tool_interface.get_tool_definitions()
    print("Available tools for GPT-OSS:20b:")
    for tool in tools:
        print(f"- {tool['function']['name']}: {tool['function']['description']}")
    
    # Example tool execution
    document_id = "EPA-HQ-OAR-2021-0317-0001"
    
    # Test API connection
    print(f"\nTesting API connection...")
    connection_result = tool_interface.execute_tool("test_api_connection", {})
    print(f"Connection test: {connection_result}")
    
    if connection_result.get("success"):
        # Get comment count
        print(f"\nGetting comment count for document {document_id}...")
        count_result = tool_interface.execute_tool("get_comment_count", {"document_id": document_id})
        print(f"Comment count: {count_result}")
        
        # Analyze comments
        print(f"\nAnalyzing comments for document {document_id}...")
        analysis_result = tool_interface.execute_tool("analyze_regulatory_comments", {
            "document_id": document_id,
            "max_comments": 10,
            "analysis_depth": "advanced"
        })
        
        if analysis_result.get("success"):
            print(f"Analysis completed successfully!")
            print(f"Total comments analyzed: {analysis_result.get('total_comments_found', 0)}")
            
            # Synthesize insights
            print(f"\nSynthesizing insights...")
            insights_result = tool_interface.execute_tool("synthesize_comment_insights", {
                "analysis_results": analysis_result,
                "summary_type": "executive"
            })
            print(f"Executive summary: {json.dumps(insights_result, indent=2)}")
        else:
            print(f"Analysis failed: {analysis_result.get('error', 'Unknown error')}")
