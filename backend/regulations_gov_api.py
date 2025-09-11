"""
Regulations.gov API utility functions for Python
Handles fetching public comments from regulations.gov API v4 and provides AI analysis capabilities
"""

import requests
import json
import logging
from typing import List, Dict, Optional, Any
from dataclasses import dataclass
from datetime import datetime
import re
import os
from local_storage_reader import get_regulations_api_key

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class RegulationsComment:
    """Data class representing a regulations.gov comment"""
    id: str
    comment_on_document_id: str
    comment_text: str
    submitter_name: Optional[str] = None
    organization_name: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    posted_date: str = ""
    title: Optional[str] = None
    docket_id: str = ""
    agency_id: str = ""

@dataclass
class CommentAnalysis:
    """Data class for AI analysis results"""
    key_points: List[str]
    common_perspectives: List[str]
    sentiment_summary: str
    stakeholder_types: List[str]
    summary: str
    total_comments_analyzed: int

class RegulationsGovAPI:
    """Main class for interacting with regulations.gov API and providing analysis"""
    
    def __init__(self, api_key: Optional[str] = None):
        # If no API key provided, try to get it from localStorage equivalent
        if api_key is None:
            api_key = self._get_api_key_from_config()
        
        self.api_key = api_key
        self.base_url = "https://api.regulations.gov/v4"
        self.session = requests.Session()
        self.session.headers.update({
            'Accept': 'application/json',
            'User-Agent': 'Navi-Regulatory-Analysis/1.0'
        })
    
    def _get_api_key_from_config(self) -> str:
        """
        Get regulations.gov API key from local configuration
        This mimics the localStorage.getItem('navi-regulations-api-config') behavior
        """
        try:
            # Try to get API key from localStorage reader
            api_key = get_regulations_api_key()
            
            if api_key:
                return api_key
            
            # Fallback: try environment variable
            api_key = os.getenv('NAVI_REGULATIONS_API_KEY')
            if api_key:
                return api_key
            
            raise ValueError("No regulations.gov API key configured. Please add your API key in Settings.")
                
        except Exception as e:
            # Fallback: try environment variable
            api_key = os.getenv('NAVI_REGULATIONS_API_KEY')
            if api_key:
                return api_key
            
            raise ValueError("No regulations.gov API key configured. Please add your API key in Settings.")
    
    def _make_request(self, url: str) -> Optional[Dict[str, Any]]:
        """Make a request to the regulations.gov API with error handling"""
        try:
            response = self.session.get(url)
            
            if response.status_code == 401:
                raise ValueError("Invalid regulations.gov API key. Please check your API key.")
            elif response.status_code == 403:
                raise ValueError("API key access denied. Please verify your regulations.gov API key permissions.")
            elif response.status_code == 429:
                raise ValueError("API rate limit exceeded. Please try again later.")
            elif not response.ok:
                raise ValueError(f"HTTP {response.status_code}: {response.reason}")
            
            return response.json()
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Request failed: {e}")
            raise ValueError(f"Failed to connect to regulations.gov API: {e}")
    
    def get_document_object_id(self, document_id: str) -> Optional[str]:
        """Get document objectId from documentId"""
        try:
            url = f"{self.base_url}/documents/{document_id}?api_key={self.api_key}"
            logger.info(f"Getting document objectId: {document_id}")
            
            data = self._make_request(url)
            if data and 'data' in data and 'attributes' in data['data']:
                object_id = data['data']['attributes'].get('objectId')
                if object_id:
                    logger.info(f"Found objectId for document {document_id}: {object_id}")
                    return object_id
                else:
                    logger.warning(f"No objectId found for document {document_id}")
                    return None
            return None
            
        except Exception as e:
            logger.error(f"Error getting document objectId: {e}")
            return None
    
    def get_document_comment_count(self, document_id: str) -> int:
        """Get comment count for a document (lightweight function)"""
        try:
            object_id = self.get_document_object_id(document_id)
            if not object_id:
                return 0
            
            # Get comment count using the list endpoint
            url = (f"{self.base_url}/comments"
                   f"?filter%5BcommentOnId%5D={object_id}"
                   f"&page%5Bsize%5D=5"
                   f"&sort=-postedDate"
                   f"&api_key={self.api_key}")
            
            data = self._make_request(url)
            if data and 'meta' in data:
                total_comments = data['meta'].get('totalElements', 0)
                logger.info(f"Document {document_id} has {total_comments} comments")
                return total_comments
            
            return 0
            
        except Exception as e:
            logger.warning(f"Error getting comment count for document {document_id}: {e}")
            return 0
    
    def fetch_comment_details(self, comment_id: str) -> Optional[RegulationsComment]:
        """Fetch comment details for a specific comment ID"""
        try:
            url = f"{self.base_url}/comments/{comment_id}?api_key={self.api_key}"
            data = self._make_request(url)
            
            if data and 'data' in data:
                comment_data = data['data']
                attributes = comment_data.get('attributes', {})
                
                return RegulationsComment(
                    id=comment_data.get('id', ''),
                    comment_on_document_id=attributes.get('commentOnDocumentId', ''),
                    comment_text=attributes.get('comment', '') or attributes.get('commentText', ''),
                    submitter_name=attributes.get('submitterName'),
                    organization_name=attributes.get('organizationName'),
                    first_name=attributes.get('firstName'),
                    last_name=attributes.get('lastName'),
                    posted_date=attributes.get('postedDate', ''),
                    title=attributes.get('title'),
                    docket_id=attributes.get('docketId', ''),
                    agency_id=attributes.get('agencyId', '')
                )
            
            return None
            
        except Exception as e:
            logger.warning(f"Error fetching details for comment {comment_id}: {e}")
            return None
    
    def fetch_comments_by_document_id(self, document_id: str, max_comments: int = 30) -> List[RegulationsComment]:
        """Fetch comments directly filtered by document objectId"""
        try:
            # Step 1: Get the document's objectId
            object_id = self.get_document_object_id(document_id)
            if not object_id:
                logger.info(f"No objectId found for document, no comments available: {document_id}")
                return []
            
            # Step 2: Get list of comment IDs filtered by commentOnId
            url = (f"{self.base_url}/comments"
                   f"?filter%5BcommentOnId%5D={object_id}"
                   f"&page%5Bsize%5D={max_comments}"
                   f"&sort=-postedDate"
                   f"&api_key={self.api_key}")
            
            logger.info(f"Getting comment list for document objectId (limited to {max_comments}): {document_id}")
            
            data = self._make_request(url)
            if not data or 'data' not in data:
                logger.info(f"No comments found for document: {document_id}")
                return []
            
            comment_summaries = data['data']
            if not comment_summaries:
                logger.info(f"No comments found for document: {document_id}")
                return []
            
            logger.info(f"Found {len(comment_summaries)} comment IDs for document {document_id}")
            
            # Step 3: Get full details for each comment
            comment_details = []
            comments_to_process = min(len(comment_summaries), max_comments)
            
            if len(comment_summaries) > max_comments:
                logger.warning(f"Document has {len(comment_summaries)} comments, limiting to {max_comments} most recent comments")
            
            for i in range(comments_to_process):
                comment_summary = comment_summaries[i]
                try:
                    comment_id = comment_summary['id']
                    logger.info(f"Getting full details for comment {comment_id}")
                    
                    comment_detail = self.fetch_comment_details(comment_id)
                    if comment_detail and comment_detail.comment_on_document_id == document_id:
                        comment_details.append(comment_detail)
                        logger.info(f"Successfully fetched full details for comment {comment_id}")
                    else:
                        logger.warning(f"Comment {comment_id} is not for document {document_id}, skipping")
                        
                except Exception as e:
                    logger.warning(f"Error fetching details for comment {comment_summary.get('id', 'unknown')}: {e}")
            
            limit_message = f" (limited from {len(comment_summaries)} total comments)" if len(comment_summaries) > max_comments else ""
            logger.info(f"Successfully fetched {len(comment_details)} full comment details for document {document_id}{limit_message}")
            
            return comment_details
            
        except Exception as e:
            logger.error(f"Error fetching comments by document ID: {e}")
            raise
    
    def derive_docket_id(self, document_id: str) -> Optional[str]:
        """Derive docket ID from document ID"""
        if not document_id:
            return None
        
        parts = document_id.split('-')
        # Use first three parts as docket_id (AGENCY-YEAR-DOCKET)
        if len(parts) >= 3:
            return '-'.join(parts[:3])
        
        return None
    
    def test_api_connection(self) -> str:
        """Test regulations.gov API connection"""
        try:
            # Try dockets endpoint first
            test_url = f"{self.base_url}/dockets?filter%5BagencyId%5D=EPA&page%5Bsize%5D=5&api_key={self.api_key}"
            data = self._make_request(test_url)
            
            if data:
                return "API key is valid and working!"
            else:
                # Fallback to comments endpoint
                comments_url = f"{self.base_url}/comments?filter%5BagencyId%5D=EPA&page%5Bsize%5D=5&api_key={self.api_key}"
                comments_data = self._make_request(comments_url)
                
                if comments_data:
                    return "API key is valid! (Limited access - dockets endpoint restricted)"
                else:
                    raise ValueError("API key access denied. Your API key may not have the required permissions.")
                    
        except Exception as e:
            if "Invalid" in str(e) or "401" in str(e):
                raise ValueError("Invalid API key. Please check your regulations.gov API key.")
            elif "403" in str(e) or "access denied" in str(e):
                raise ValueError("API key access denied. Please contact regulations.gov support to enable comment access.")
            else:
                raise ValueError(f"Failed to test API connection: {e}")


class CommentAnalyzer:
    """AI-powered comment analysis using GPT-OSS:20b capabilities"""
    
    def __init__(self, api_key: Optional[str] = None):
        self.api = RegulationsGovAPI(api_key)
    
    def analyze_comments(self, document_id: str, max_comments: int = 30) -> CommentAnalysis:
        """
        Analyze comments for a document and provide AI-powered insights
        This function is designed to be used as a tool by GPT-OSS:20b
        """
        try:
            # Fetch comments
            comments = self.api.fetch_comments_by_document_id(document_id, max_comments)
            
            if not comments:
                return CommentAnalysis(
                    key_points=[],
                    common_perspectives=[],
                    sentiment_summary="No comments found for analysis",
                    stakeholder_types=[],
                    summary="No public comments were found for this document.",
                    total_comments_analyzed=0
                )
            
            # Prepare comment data for analysis
            comment_texts = [comment.comment_text for comment in comments if comment.comment_text]
            stakeholder_info = self._extract_stakeholder_info(comments)
            
            # This is where GPT-OSS:20b would perform the analysis
            # For now, we'll create a structured analysis framework
            analysis = self._perform_ai_analysis(comment_texts, stakeholder_info, len(comments))
            
            return analysis
            
        except Exception as e:
            logger.error(f"Error analyzing comments: {e}")
            raise ValueError(f"Failed to analyze comments: {e}")
    
    def _extract_stakeholder_info(self, comments: List[RegulationsComment]) -> Dict[str, Any]:
        """Extract stakeholder information from comments"""
        stakeholders = {
            'individuals': 0,
            'organizations': 0,
            'agencies': 0,
            'companies': 0,
            'other': 0
        }
        
        stakeholder_names = []
        
        for comment in comments:
            if comment.organization_name:
                stakeholders['organizations'] += 1
                stakeholder_names.append(comment.organization_name)
            elif comment.submitter_name:
                stakeholders['individuals'] += 1
                stakeholder_names.append(comment.submitter_name)
            else:
                stakeholders['other'] += 1
        
        return {
            'counts': stakeholders,
            'names': stakeholder_names[:10]  # Limit to first 10 for analysis
        }
    
    def _perform_ai_analysis(self, comment_texts: List[str], stakeholder_info: Dict[str, Any], total_comments: int) -> CommentAnalysis:
        """
        Perform AI analysis on comment texts
        This is where GPT-OSS:20b would analyze the content
        """
        # This is a placeholder for the actual AI analysis
        # In practice, this would call GPT-OSS:20b with the comment texts
        
        # For now, we'll create a basic analysis structure
        key_points = self._extract_key_points_basic(comment_texts)
        common_perspectives = self._identify_common_perspectives_basic(comment_texts)
        sentiment = self._analyze_sentiment_basic(comment_texts)
        stakeholder_types = self._categorize_stakeholders(stakeholder_info)
        
        summary = self._generate_summary(key_points, common_perspectives, sentiment, total_comments)
        
        return CommentAnalysis(
            key_points=key_points,
            common_perspectives=common_perspectives,
            sentiment_summary=sentiment,
            stakeholder_types=stakeholder_types,
            summary=summary,
            total_comments_analyzed=total_comments
        )
    
    def _extract_key_points_basic(self, comment_texts: List[str]) -> List[str]:
        """Basic key point extraction (placeholder for AI analysis)"""
        # This would be replaced with GPT-OSS:20b analysis
        key_points = []
        
        # Simple keyword frequency analysis
        all_text = ' '.join(comment_texts).lower()
        
        # Common regulatory terms
        regulatory_terms = [
            'cost', 'benefit', 'impact', 'implementation', 'compliance',
            'burden', 'efficiency', 'effectiveness', 'safety', 'risk',
            'environment', 'health', 'economic', 'social', 'technical'
        ]
        
        for term in regulatory_terms:
            if term in all_text and all_text.count(term) >= 3:
                key_points.append(f"Concerns about {term} mentioned frequently")
        
        return key_points[:5]  # Limit to top 5
    
    def _identify_common_perspectives_basic(self, comment_texts: List[str]) -> List[str]:
        """Basic perspective identification (placeholder for AI analysis)"""
        # This would be replaced with GPT-OSS:20b analysis
        perspectives = []
        
        # Look for common sentiment patterns
        positive_words = ['support', 'agree', 'beneficial', 'good', 'effective']
        negative_words = ['oppose', 'concern', 'problem', 'burden', 'costly']
        
        all_text = ' '.join(comment_texts).lower()
        
        positive_count = sum(all_text.count(word) for word in positive_words)
        negative_count = sum(all_text.count(word) for word in negative_words)
        
        if positive_count > negative_count:
            perspectives.append("Generally supportive of the proposed regulation")
        elif negative_count > positive_count:
            perspectives.append("Generally concerned about the proposed regulation")
        else:
            perspectives.append("Mixed perspectives on the proposed regulation")
        
        return perspectives
    
    def _analyze_sentiment_basic(self, comment_texts: List[str]) -> str:
        """Basic sentiment analysis (placeholder for AI analysis)"""
        # This would be replaced with GPT-OSS:20b analysis
        all_text = ' '.join(comment_texts).lower()
        
        positive_words = ['support', 'agree', 'beneficial', 'good', 'effective', 'necessary']
        negative_words = ['oppose', 'concern', 'problem', 'burden', 'costly', 'unnecessary']
        
        positive_count = sum(all_text.count(word) for word in positive_words)
        negative_count = sum(all_text.count(word) for word in negative_words)
        
        if positive_count > negative_count * 1.5:
            return "Predominantly positive sentiment"
        elif negative_count > positive_count * 1.5:
            return "Predominantly negative sentiment"
        else:
            return "Mixed sentiment with both support and concerns"
    
    def _categorize_stakeholders(self, stakeholder_info: Dict[str, Any]) -> List[str]:
        """Categorize stakeholder types"""
        categories = []
        counts = stakeholder_info.get('counts', {})
        
        if counts.get('organizations', 0) > 0:
            categories.append(f"Organizations ({counts['organizations']})")
        if counts.get('individuals', 0) > 0:
            categories.append(f"Individuals ({counts['individuals']})")
        if counts.get('agencies', 0) > 0:
            categories.append(f"Government Agencies ({counts['agencies']})")
        if counts.get('companies', 0) > 0:
            categories.append(f"Companies ({counts['companies']})")
        
        return categories
    
    def _generate_summary(self, key_points: List[str], perspectives: List[str], sentiment: str, total_comments: int) -> str:
        """Generate a comprehensive summary"""
        summary_parts = [
            f"Analysis of {total_comments} public comments reveals:",
            f"Sentiment: {sentiment}",
        ]
        
        if perspectives:
            summary_parts.append(f"Common perspectives: {'; '.join(perspectives)}")
        
        if key_points:
            summary_parts.append(f"Key themes: {'; '.join(key_points)}")
        
        return " ".join(summary_parts)


# Tool interface for GPT-OSS:20b integration
def create_regulations_analysis_tool(api_key: Optional[str] = None):
    """
    Create a tool interface for GPT-OSS:20b to analyze regulations.gov comments
    This function returns the tool definition that can be used by the AI model
    """
    
    def analyze_document_comments(document_id: str, max_comments: int = 30) -> Dict[str, Any]:
        """
        Tool for analyzing public comments on a regulatory document
        
        Args:
            document_id: The regulations.gov document ID to analyze
            max_comments: Maximum number of comments to analyze (default: 30)
            
        Returns:
            Dictionary containing analysis results including key points, 
            common perspectives, sentiment, and stakeholder information
        """
        try:
            analyzer = CommentAnalyzer(api_key)
            analysis = analyzer.analyze_comments(document_id, max_comments)
            
            return {
                'success': True,
                'document_id': document_id,
                'analysis': {
                    'key_points': analysis.key_points,
                    'common_perspectives': analysis.common_perspectives,
                    'sentiment_summary': analysis.sentiment_summary,
                    'stakeholder_types': analysis.stakeholder_types,
                    'summary': analysis.summary,
                    'total_comments_analyzed': analysis.total_comments_analyzed
                }
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'document_id': document_id
            }
    
    def get_comment_count(document_id: str) -> Dict[str, Any]:
        """
        Tool for getting the total number of comments on a document
        
        Args:
            document_id: The regulations.gov document ID
            
        Returns:
            Dictionary containing the comment count
        """
        try:
            api = RegulationsGovAPI(api_key)
            count = api.get_document_comment_count(document_id)
            
            return {
                'success': True,
                'document_id': document_id,
                'comment_count': count
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'document_id': document_id
            }
    
    def test_api_connection() -> Dict[str, Any]:
        """
        Tool for testing the regulations.gov API connection
        
        Returns:
            Dictionary containing connection test results
        """
        try:
            api = RegulationsGovAPI(api_key)
            result = api.test_api_connection()
            
            return {
                'success': True,
                'message': result
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    # Return the tool definitions
    return {
        'analyze_document_comments': analyze_document_comments,
        'get_comment_count': get_comment_count,
        'test_api_connection': test_api_connection
    }


# Example usage and testing
if __name__ == "__main__":
    # Example usage
    api_key = "your-api-key-here"  # This would come from configuration
    
    # Create the analysis tool
    tools = create_regulations_analysis_tool(api_key)
    
    # Example document ID (this would come from the frontend)
    document_id = "EPA-HQ-OAR-2021-0317-0001"
    
    # Test the tools
    print("Testing API connection...")
    connection_result = tools['test_api_connection']()
    print(f"Connection test: {connection_result}")
    
    if connection_result['success']:
        print(f"\nGetting comment count for document {document_id}...")
        count_result = tools['get_comment_count'](document_id)
        print(f"Comment count: {count_result}")
        
        if count_result['success'] and count_result['comment_count'] > 0:
            print(f"\nAnalyzing comments for document {document_id}...")
            analysis_result = tools['analyze_document_comments'](document_id)
            print(f"Analysis result: {json.dumps(analysis_result, indent=2)}")
