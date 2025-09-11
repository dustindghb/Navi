"""
Advanced AI-powered comment analysis using GPT-OSS:20b capabilities
This module provides sophisticated analysis of regulatory comments including:
- Key point extraction and synthesis
- Common perspective identification
- Sentiment analysis
- Stakeholder categorization
- Regulatory impact assessment
"""

import json
import logging
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass, asdict
from datetime import datetime
import re
from collections import Counter
import statistics

from regulations_gov_api import RegulationsComment, CommentAnalysis

logger = logging.getLogger(__name__)

@dataclass
class AdvancedCommentAnalysis:
    """Enhanced analysis results with detailed insights"""
    # Basic analysis
    key_points: List[str]
    common_perspectives: List[str]
    sentiment_summary: str
    stakeholder_types: List[str]
    summary: str
    total_comments_analyzed: int
    
    # Advanced analysis
    regulatory_themes: List[Dict[str, Any]]
    impact_assessments: List[Dict[str, Any]]
    stakeholder_concerns: Dict[str, List[str]]
    recommendation_patterns: List[str]
    technical_issues: List[str]
    economic_concerns: List[str]
    timeline_concerns: List[str]
    implementation_challenges: List[str]
    
    # Metadata
    analysis_timestamp: str
    confidence_scores: Dict[str, float]

class GPTOSSAnalyzer:
    """
    Advanced comment analyzer designed to work with GPT-OSS:20b
    This class provides the framework for AI-powered regulatory comment analysis
    """
    
    def __init__(self):
        self.regulatory_keywords = self._load_regulatory_keywords()
        self.sentiment_indicators = self._load_sentiment_indicators()
        self.stakeholder_patterns = self._load_stakeholder_patterns()
    
    def analyze_comments_advanced(self, comments: List[RegulationsComment], document_id: str) -> AdvancedCommentAnalysis:
        """
        Perform comprehensive AI analysis on regulatory comments
        This is the main function that would integrate with GPT-OSS:20b
        """
        try:
            logger.info(f"Starting advanced analysis of {len(comments)} comments for document {document_id}")
            
            # Prepare data for analysis
            comment_data = self._prepare_comment_data(comments)
            
            # Perform multi-dimensional analysis
            basic_analysis = self._perform_basic_analysis(comment_data)
            regulatory_themes = self._identify_regulatory_themes(comment_data)
            impact_assessments = self._assess_regulatory_impacts(comment_data)
            stakeholder_concerns = self._analyze_stakeholder_concerns(comment_data)
            recommendation_patterns = self._extract_recommendations(comment_data)
            technical_issues = self._identify_technical_issues(comment_data)
            economic_concerns = self._identify_economic_concerns(comment_data)
            timeline_concerns = self._identify_timeline_concerns(comment_data)
            implementation_challenges = self._identify_implementation_challenges(comment_data)
            
            # Calculate confidence scores
            confidence_scores = self._calculate_confidence_scores(
                comment_data, basic_analysis, regulatory_themes, impact_assessments
            )
            
            # Generate comprehensive summary
            summary = self._generate_comprehensive_summary(
                basic_analysis, regulatory_themes, impact_assessments, 
                stakeholder_concerns, len(comments)
            )
            
            return AdvancedCommentAnalysis(
                # Basic analysis
                key_points=basic_analysis['key_points'],
                common_perspectives=basic_analysis['perspectives'],
                sentiment_summary=basic_analysis['sentiment'],
                stakeholder_types=basic_analysis['stakeholder_types'],
                summary=summary,
                total_comments_analyzed=len(comments),
                
                # Advanced analysis
                regulatory_themes=regulatory_themes,
                impact_assessments=impact_assessments,
                stakeholder_concerns=stakeholder_concerns,
                recommendation_patterns=recommendation_patterns,
                technical_issues=technical_issues,
                economic_concerns=economic_concerns,
                timeline_concerns=timeline_concerns,
                implementation_challenges=implementation_challenges,
                
                # Metadata
                analysis_timestamp=datetime.now().isoformat(),
                confidence_scores=confidence_scores
            )
            
        except Exception as e:
            logger.error(f"Error in advanced comment analysis: {e}")
            raise
    
    def _prepare_comment_data(self, comments: List[RegulationsComment]) -> Dict[str, Any]:
        """Prepare comment data for analysis"""
        comment_texts = []
        stakeholder_info = []
        dates = []
        
        for comment in comments:
            if comment.comment_text:
                comment_texts.append(comment.comment_text)
                
                stakeholder_info.append({
                    'name': comment.submitter_name or comment.organization_name,
                    'type': 'organization' if comment.organization_name else 'individual',
                    'organization': comment.organization_name
                })
                
                if comment.posted_date:
                    dates.append(comment.posted_date)
        
        return {
            'texts': comment_texts,
            'stakeholders': stakeholder_info,
            'dates': dates,
            'total_comments': len(comments)
        }
    
    def _perform_basic_analysis(self, comment_data: Dict[str, Any]) -> Dict[str, Any]:
        """Perform basic analysis using pattern matching and frequency analysis"""
        texts = comment_data['texts']
        stakeholders = comment_data['stakeholders']
        
        # Key points extraction
        key_points = self._extract_key_points(texts)
        
        # Perspective identification
        perspectives = self._identify_perspectives(texts)
        
        # Sentiment analysis
        sentiment = self._analyze_sentiment(texts)
        
        # Stakeholder categorization
        stakeholder_types = self._categorize_stakeholders(stakeholders)
        
        return {
            'key_points': key_points,
            'perspectives': perspectives,
            'sentiment': sentiment,
            'stakeholder_types': stakeholder_types
        }
    
    def _identify_regulatory_themes(self, comment_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Identify key regulatory themes and their frequency"""
        texts = comment_data['texts']
        all_text = ' '.join(texts).lower()
        
        themes = []
        
        # Define regulatory theme patterns
        theme_patterns = {
            'compliance_burden': [
                'compliance', 'burden', 'administrative', 'paperwork', 'reporting',
                'recordkeeping', 'monitoring', 'certification'
            ],
            'economic_impact': [
                'cost', 'economic', 'financial', 'budget', 'expense', 'investment',
                'revenue', 'profit', 'market', 'competition'
            ],
            'environmental_concerns': [
                'environment', 'pollution', 'emissions', 'waste', 'conservation',
                'sustainability', 'climate', 'greenhouse', 'carbon'
            ],
            'safety_health': [
                'safety', 'health', 'risk', 'hazard', 'protection', 'injury',
                'illness', 'exposure', 'toxic', 'dangerous'
            ],
            'implementation_timeline': [
                'timeline', 'deadline', 'implementation', 'effective date',
                'phase', 'transition', 'grace period', 'compliance date'
            ],
            'technical_standards': [
                'standard', 'specification', 'requirement', 'criteria',
                'methodology', 'procedure', 'protocol', 'guideline'
            ]
        }
        
        for theme_name, keywords in theme_patterns.items():
            frequency = sum(all_text.count(keyword) for keyword in keywords)
            if frequency > 0:
                themes.append({
                    'theme': theme_name,
                    'frequency': frequency,
                    'keywords_found': [kw for kw in keywords if kw in all_text],
                    'relevance_score': min(frequency / len(texts), 1.0)
                })
        
        # Sort by relevance score
        themes.sort(key=lambda x: x['relevance_score'], reverse=True)
        return themes[:5]  # Top 5 themes
    
    def _assess_regulatory_impacts(self, comment_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Assess potential regulatory impacts mentioned in comments"""
        texts = comment_data['texts']
        impacts = []
        
        # Impact categories
        impact_categories = {
            'industry_impact': [
                'industry', 'business', 'company', 'firm', 'sector', 'market',
                'competition', 'innovation', 'investment'
            ],
            'consumer_impact': [
                'consumer', 'customer', 'public', 'user', 'end user', 'buyer',
                'purchaser', 'beneficiary'
            ],
            'government_impact': [
                'government', 'agency', 'federal', 'state', 'local', 'regulatory',
                'enforcement', 'oversight', 'compliance'
            ],
            'environmental_impact': [
                'environment', 'ecosystem', 'natural', 'wildlife', 'habitat',
                'biodiversity', 'conservation'
            ]
        }
        
        for impact_type, keywords in impact_categories.items():
            mentions = 0
            relevant_comments = []
            
            for i, text in enumerate(texts):
                text_lower = text.lower()
                if any(keyword in text_lower for keyword in keywords):
                    mentions += 1
                    relevant_comments.append(i)
            
            if mentions > 0:
                impacts.append({
                    'impact_type': impact_type,
                    'mention_count': mentions,
                    'affected_comments': relevant_comments,
                    'impact_score': mentions / len(texts)
                })
        
        return impacts
    
    def _analyze_stakeholder_concerns(self, comment_data: Dict[str, Any]) -> Dict[str, List[str]]:
        """Analyze concerns by stakeholder type"""
        texts = comment_data['texts']
        stakeholders = comment_data['stakeholders']
        
        concerns = {
            'organizations': [],
            'individuals': [],
            'common': []
        }
        
        # Common concern patterns
        concern_patterns = {
            'cost_concerns': ['expensive', 'costly', 'burden', 'financial impact'],
            'timeline_concerns': ['too fast', 'too slow', 'deadline', 'timeline'],
            'complexity_concerns': ['complex', 'complicated', 'confusing', 'unclear'],
            'feasibility_concerns': ['impossible', 'unrealistic', 'impractical', 'feasible']
        }
        
        for i, (text, stakeholder) in enumerate(zip(texts, stakeholders)):
            text_lower = text.lower()
            stakeholder_type = stakeholder['type']
            
            for concern_type, keywords in concern_patterns.items():
                if any(keyword in text_lower for keyword in keywords):
                    concern_text = f"{concern_type.replace('_', ' ').title()}: {text[:100]}..."
                    
                    if stakeholder_type == 'organization':
                        concerns['organizations'].append(concern_text)
                    else:
                        concerns['individuals'].append(concern_text)
                    
                    # Check if this is a common concern
                    if concern_text not in concerns['common']:
                        concerns['common'].append(concern_text)
        
        return concerns
    
    def _extract_recommendations(self, comment_data: Dict[str, Any]) -> List[str]:
        """Extract recommendations and suggestions from comments"""
        texts = comment_data['texts']
        recommendations = []
        
        # Recommendation patterns
        recommendation_patterns = [
            r'recommend\s+that',
            r'suggest\s+that',
            r'propose\s+that',
            r'urge\s+that',
            r'request\s+that',
            r'should\s+be',
            r'would\s+be\s+better',
            r'consider\s+',
            r'we\s+recommend',
            r'we\s+suggest'
        ]
        
        for text in texts:
            text_lower = text.lower()
            for pattern in recommendation_patterns:
                matches = re.findall(pattern, text_lower)
                if matches:
                    # Extract the sentence containing the recommendation
                    sentences = re.split(r'[.!?]', text)
                    for sentence in sentences:
                        if any(pattern_word in sentence.lower() for pattern_word in pattern.split()):
                            recommendations.append(sentence.strip())
                            break
        
        return list(set(recommendations))[:10]  # Top 10 unique recommendations
    
    def _identify_technical_issues(self, comment_data: Dict[str, Any]) -> List[str]:
        """Identify technical issues and challenges mentioned"""
        texts = comment_data['texts']
        technical_issues = []
        
        technical_keywords = [
            'technical', 'technology', 'methodology', 'standard', 'specification',
            'measurement', 'testing', 'validation', 'calibration', 'accuracy',
            'precision', 'reliability', 'interoperability', 'compatibility'
        ]
        
        for text in texts:
            text_lower = text.lower()
            if any(keyword in text_lower for keyword in technical_keywords):
                # Extract sentences with technical content
                sentences = re.split(r'[.!?]', text)
                for sentence in sentences:
                    if any(keyword in sentence.lower() for keyword in technical_keywords):
                        technical_issues.append(sentence.strip())
        
        return list(set(technical_issues))[:5]  # Top 5 technical issues
    
    def _identify_economic_concerns(self, comment_data: Dict[str, Any]) -> List[str]:
        """Identify economic concerns and impacts"""
        texts = comment_data['texts']
        economic_concerns = []
        
        economic_keywords = [
            'cost', 'price', 'economic', 'financial', 'budget', 'expense',
            'investment', 'revenue', 'profit', 'loss', 'market', 'competition',
            'efficiency', 'productivity', 'employment', 'jobs'
        ]
        
        for text in texts:
            text_lower = text.lower()
            if any(keyword in text_lower for keyword in economic_keywords):
                sentences = re.split(r'[.!?]', text)
                for sentence in sentences:
                    if any(keyword in sentence.lower() for keyword in economic_keywords):
                        economic_concerns.append(sentence.strip())
        
        return list(set(economic_concerns))[:5]  # Top 5 economic concerns
    
    def _identify_timeline_concerns(self, comment_data: Dict[str, Any]) -> List[str]:
        """Identify timeline and implementation schedule concerns"""
        texts = comment_data['texts']
        timeline_concerns = []
        
        timeline_keywords = [
            'timeline', 'deadline', 'schedule', 'implementation', 'effective date',
            'compliance date', 'phase', 'transition', 'grace period', 'timeframe',
            'too fast', 'too slow', 'rushed', 'delayed', 'extended'
        ]
        
        for text in texts:
            text_lower = text.lower()
            if any(keyword in text_lower for keyword in timeline_keywords):
                sentences = re.split(r'[.!?]', text)
                for sentence in sentences:
                    if any(keyword in sentence.lower() for keyword in timeline_keywords):
                        timeline_concerns.append(sentence.strip())
        
        return list(set(timeline_concerns))[:5]  # Top 5 timeline concerns
    
    def _identify_implementation_challenges(self, comment_data: Dict[str, Any]) -> List[str]:
        """Identify implementation challenges and barriers"""
        texts = comment_data['texts']
        challenges = []
        
        challenge_keywords = [
            'challenge', 'barrier', 'obstacle', 'difficulty', 'problem',
            'issue', 'concern', 'limitation', 'constraint', 'burden',
            'complex', 'complicated', 'unclear', 'confusing', 'impractical'
        ]
        
        for text in texts:
            text_lower = text.lower()
            if any(keyword in text_lower for keyword in challenge_keywords):
                sentences = re.split(r'[.!?]', text)
                for sentence in sentences:
                    if any(keyword in sentence.lower() for keyword in challenge_keywords):
                        challenges.append(sentence.strip())
        
        return list(set(challenges))[:5]  # Top 5 implementation challenges
    
    def _calculate_confidence_scores(self, comment_data: Dict[str, Any], basic_analysis: Dict[str, Any], 
                                   regulatory_themes: List[Dict[str, Any]], 
                                   impact_assessments: List[Dict[str, Any]]) -> Dict[str, float]:
        """Calculate confidence scores for different analysis components"""
        total_comments = comment_data['total_comments']
        
        scores = {
            'overall_confidence': 0.0,
            'key_points_confidence': 0.0,
            'sentiment_confidence': 0.0,
            'stakeholder_confidence': 0.0,
            'theme_confidence': 0.0,
            'impact_confidence': 0.0
        }
        
        # Calculate confidence based on data quality and quantity
        if total_comments >= 20:
            base_confidence = 0.8
        elif total_comments >= 10:
            base_confidence = 0.6
        elif total_comments >= 5:
            base_confidence = 0.4
        else:
            base_confidence = 0.2
        
        scores['overall_confidence'] = base_confidence
        scores['key_points_confidence'] = min(base_confidence + 0.1, 1.0)
        scores['sentiment_confidence'] = base_confidence
        scores['stakeholder_confidence'] = min(base_confidence + 0.05, 1.0)
        scores['theme_confidence'] = min(base_confidence + 0.15, 1.0)
        scores['impact_confidence'] = min(base_confidence + 0.1, 1.0)
        
        return scores
    
    def _generate_comprehensive_summary(self, basic_analysis: Dict[str, Any], 
                                      regulatory_themes: List[Dict[str, Any]],
                                      impact_assessments: List[Dict[str, Any]],
                                      stakeholder_concerns: Dict[str, List[str]],
                                      total_comments: int) -> str:
        """Generate a comprehensive summary of the analysis"""
        summary_parts = [
            f"Analysis of {total_comments} public comments reveals:",
            f"Overall sentiment: {basic_analysis['sentiment']}",
        ]
        
        if basic_analysis['perspectives']:
            summary_parts.append(f"Common perspectives: {'; '.join(basic_analysis['perspectives'])}")
        
        if regulatory_themes:
            top_theme = regulatory_themes[0]
            summary_parts.append(f"Primary regulatory theme: {top_theme['theme']} (mentioned {top_theme['frequency']} times)")
        
        if impact_assessments:
            top_impact = max(impact_assessments, key=lambda x: x['impact_score'])
            summary_parts.append(f"Main impact area: {top_impact['impact_type']} (mentioned in {top_impact['mention_count']} comments)")
        
        if stakeholder_concerns['common']:
            summary_parts.append(f"Common concerns identified: {len(stakeholder_concerns['common'])} distinct issues")
        
        return " ".join(summary_parts)
    
    # Helper methods for basic analysis
    def _extract_key_points(self, texts: List[str]) -> List[str]:
        """Extract key points using frequency analysis and pattern matching"""
        all_text = ' '.join(texts).lower()
        
        # Regulatory key terms with weights
        key_terms = {
            'compliance': 3, 'cost': 3, 'burden': 2, 'impact': 2, 'implementation': 2,
            'safety': 2, 'environment': 2, 'economic': 2, 'technical': 2, 'timeline': 2,
            'standard': 1, 'requirement': 1, 'regulation': 1, 'enforcement': 1
        }
        
        term_scores = {}
        for term, weight in key_terms.items():
            count = all_text.count(term)
            if count > 0:
                term_scores[term] = count * weight
        
        # Sort by score and create key points
        sorted_terms = sorted(term_scores.items(), key=lambda x: x[1], reverse=True)
        key_points = []
        
        for term, score in sorted_terms[:5]:
            key_points.append(f"'{term}' mentioned {score} times across comments")
        
        return key_points
    
    def _identify_perspectives(self, texts: List[str]) -> List[str]:
        """Identify common perspectives using sentiment and keyword analysis"""
        all_text = ' '.join(texts).lower()
        
        perspectives = []
        
        # Support indicators
        support_words = ['support', 'agree', 'beneficial', 'good', 'effective', 'necessary', 'important']
        support_count = sum(all_text.count(word) for word in support_words)
        
        # Opposition indicators
        opposition_words = ['oppose', 'concern', 'problem', 'burden', 'costly', 'unnecessary', 'harmful']
        opposition_count = sum(all_text.count(word) for word in opposition_words)
        
        # Neutral/constructive indicators
        constructive_words = ['suggest', 'recommend', 'propose', 'modify', 'improve', 'clarify']
        constructive_count = sum(all_text.count(word) for word in constructive_words)
        
        if support_count > opposition_count * 1.5:
            perspectives.append("Generally supportive of the proposed regulation")
        elif opposition_count > support_count * 1.5:
            perspectives.append("Generally concerned about the proposed regulation")
        else:
            perspectives.append("Mixed perspectives with both support and concerns")
        
        if constructive_count > 0:
            perspectives.append("Many comments provide constructive suggestions for improvement")
        
        return perspectives
    
    def _analyze_sentiment(self, texts: List[str]) -> str:
        """Analyze overall sentiment of comments"""
        all_text = ' '.join(texts).lower()
        
        positive_words = ['support', 'agree', 'beneficial', 'good', 'effective', 'necessary', 'important', 'valuable']
        negative_words = ['oppose', 'concern', 'problem', 'burden', 'costly', 'unnecessary', 'harmful', 'difficult']
        
        positive_count = sum(all_text.count(word) for word in positive_words)
        negative_count = sum(all_text.count(word) for word in negative_words)
        
        if positive_count > negative_count * 1.5:
            return "Predominantly positive sentiment"
        elif negative_count > positive_count * 1.5:
            return "Predominantly negative sentiment"
        else:
            return "Mixed sentiment with both support and concerns"
    
    def _categorize_stakeholders(self, stakeholders: List[Dict[str, Any]]) -> List[str]:
        """Categorize stakeholder types"""
        stakeholder_counts = Counter(stakeholder['type'] for stakeholder in stakeholders)
        
        categories = []
        for stakeholder_type, count in stakeholder_counts.most_common():
            categories.append(f"{stakeholder_type.title()}s ({count})")
        
        return categories
    
    def _load_regulatory_keywords(self) -> Dict[str, List[str]]:
        """Load regulatory domain-specific keywords"""
        return {
            'compliance': ['compliance', 'conform', 'adhere', 'follow', 'meet requirements'],
            'economic': ['cost', 'benefit', 'economic', 'financial', 'budget', 'investment'],
            'environmental': ['environment', 'pollution', 'emissions', 'conservation', 'sustainability'],
            'safety': ['safety', 'health', 'risk', 'hazard', 'protection', 'security'],
            'technical': ['technical', 'standard', 'specification', 'methodology', 'procedure']
        }
    
    def _load_sentiment_indicators(self) -> Dict[str, List[str]]:
        """Load sentiment analysis indicators"""
        return {
            'positive': ['support', 'agree', 'beneficial', 'good', 'effective', 'necessary'],
            'negative': ['oppose', 'concern', 'problem', 'burden', 'costly', 'harmful'],
            'neutral': ['suggest', 'recommend', 'propose', 'consider', 'evaluate', 'assess']
        }
    
    def _load_stakeholder_patterns(self) -> Dict[str, List[str]]:
        """Load patterns for identifying stakeholder types"""
        return {
            'organization': ['inc', 'corp', 'llc', 'association', 'institute', 'foundation', 'coalition'],
            'government': ['department', 'agency', 'bureau', 'office', 'commission', 'authority'],
            'academic': ['university', 'college', 'research', 'institute', 'professor', 'dr.'],
            'individual': ['mr.', 'ms.', 'mrs.', 'dr.', 'individual', 'citizen', 'resident']
        }


# GPT-OSS:20b Integration Functions
def create_advanced_analysis_tool():
    """
    Create an advanced analysis tool for GPT-OSS:20b integration
    This function returns the tool definition that can be used by the AI model
    """
    
    def analyze_comments_with_ai(comments_data: List[Dict[str, Any]], document_id: str) -> Dict[str, Any]:
        """
        Advanced AI analysis tool for regulatory comments
        
        Args:
            comments_data: List of comment dictionaries with text and metadata
            document_id: The regulations.gov document ID being analyzed
            
        Returns:
            Dictionary containing comprehensive analysis results
        """
        try:
            # Convert comment data to RegulationsComment objects
            comments = []
            for comment_dict in comments_data:
                comment = RegulationsComment(
                    id=comment_dict.get('id', ''),
                    comment_on_document_id=comment_dict.get('comment_on_document_id', ''),
                    comment_text=comment_dict.get('comment_text', ''),
                    submitter_name=comment_dict.get('submitter_name'),
                    organization_name=comment_dict.get('organization_name'),
                    first_name=comment_dict.get('first_name'),
                    last_name=comment_dict.get('last_name'),
                    posted_date=comment_dict.get('posted_date', ''),
                    title=comment_dict.get('title'),
                    docket_id=comment_dict.get('docket_id', ''),
                    agency_id=comment_dict.get('agency_id', '')
                )
                comments.append(comment)
            
            # Perform advanced analysis
            analyzer = GPTOSSAnalyzer()
            analysis = analyzer.analyze_comments_advanced(comments, document_id)
            
            # Convert to dictionary for JSON serialization
            return {
                'success': True,
                'document_id': document_id,
                'analysis': asdict(analysis)
            }
            
        except Exception as e:
            logger.error(f"Error in advanced AI analysis: {e}")
            return {
                'success': False,
                'error': str(e),
                'document_id': document_id
            }
    
    def synthesize_key_insights(analysis_results: Dict[str, Any]) -> Dict[str, Any]:
        """
        Synthesize key insights from analysis results for executive summary
        
        Args:
            analysis_results: Results from analyze_comments_with_ai
            
        Returns:
            Dictionary containing synthesized insights
        """
        try:
            if not analysis_results.get('success'):
                return analysis_results
            
            analysis = analysis_results['analysis']
            
            # Extract key insights
            insights = {
                'executive_summary': analysis['summary'],
                'top_concerns': analysis['stakeholder_concerns']['common'][:3],
                'primary_themes': [theme['theme'] for theme in analysis['regulatory_themes'][:3]],
                'main_impacts': [impact['impact_type'] for impact in analysis['impact_assessments'][:3]],
                'key_recommendations': analysis['recommendation_patterns'][:3],
                'confidence_level': analysis['confidence_scores']['overall_confidence']
            }
            
            return {
                'success': True,
                'insights': insights,
                'document_id': analysis_results['document_id']
            }
            
        except Exception as e:
            logger.error(f"Error synthesizing insights: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    return {
        'analyze_comments_with_ai': analyze_comments_with_ai,
        'synthesize_key_insights': synthesize_key_insights
    }


# Example usage
if __name__ == "__main__":
    # Example usage of the advanced analyzer
    analyzer = GPTOSSAnalyzer()
    
    # Create sample comments for testing
    sample_comments = [
        RegulationsComment(
            id="1",
            comment_on_document_id="EPA-HQ-OAR-2021-0317-0001",
            comment_text="We support this regulation but are concerned about the implementation timeline. The costs may be too high for small businesses.",
            submitter_name="John Smith",
            organization_name="Small Business Association",
            posted_date="2023-01-15"
        ),
        RegulationsComment(
            id="2",
            comment_on_document_id="EPA-HQ-OAR-2021-0317-0001",
            comment_text="This regulation is necessary for environmental protection. We recommend extending the compliance deadline by 6 months.",
            submitter_name="Jane Doe",
            organization_name="Environmental Defense Fund",
            posted_date="2023-01-16"
        )
    ]
    
    # Perform analysis
    analysis = analyzer.analyze_comments_advanced(sample_comments, "EPA-HQ-OAR-2021-0317-0001")
    
    print("Advanced Analysis Results:")
    print(json.dumps(asdict(analysis), indent=2))
