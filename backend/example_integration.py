"""
Example integration of GPT-OSS:20b with regulations.gov API
This script demonstrates how to use the tools for regulatory comment analysis
"""

import json
import logging
from typing import Dict, Any

from gpt_oss_tools import create_gpt_oss_tool_interface

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def example_gpt_oss_integration():
    """
    Example of how GPT-OSS:20b would use the regulatory analysis tools
    """
    
    # Create the tool interface (API key will be read from localStorage/config)
    tool_interface = create_gpt_oss_tool_interface()
    
    # Get the tool definitions for GPT-OSS:20b
    tools = tool_interface.get_tool_definitions()
    
    print("=== GPT-OSS:20b Tool Integration Example ===\n")
    print("Available tools for GPT-OSS:20b:")
    for tool in tools:
        print(f"• {tool['function']['name']}")
        print(f"  Description: {tool['function']['description']}")
        print()
    
    # Example document ID (this would come from the frontend "see more" button)
    document_id = "EPA-HQ-OAR-2021-0317-0001"
    
    print(f"=== Analyzing Document: {document_id} ===\n")
    
    # Step 1: Test API connection
    print("1. Testing API connection...")
    connection_result = tool_interface.execute_tool("test_api_connection", {})
    print(f"   Result: {connection_result.get('message', 'Failed')}")
    print()
    
    if not connection_result.get("success"):
        print("❌ API connection failed. Please check your API key.")
        return
    
    # Step 2: Get comment count
    print("2. Getting comment count...")
    count_result = tool_interface.execute_tool("get_comment_count", {
        "document_id": document_id
    })
    
    if count_result.get("success"):
        comment_count = count_result.get("comment_count", 0)
        print(f"   Found {comment_count} comments")
        
        if comment_count == 0:
            print("   No comments found for this document.")
            return
    else:
        print(f"   Failed to get comment count: {count_result.get('error')}")
        return
    
    # Step 3: Analyze comments with AI
    print("3. Performing AI analysis of comments...")
    analysis_result = tool_interface.execute_tool("analyze_regulatory_comments", {
        "document_id": document_id,
        "max_comments": 20,  # Limit for demo
        "analysis_depth": "advanced"
    })
    
    if analysis_result.get("success"):
        print(f"   ✅ Analysis completed successfully!")
        print(f"   Comments analyzed: {analysis_result.get('total_comments_found', 0)}")
        
        analysis = analysis_result.get("analysis", {})
        print(f"   Key points found: {len(analysis.get('key_points', []))}")
        print(f"   Common perspectives: {len(analysis.get('common_perspectives', []))}")
        print(f"   Regulatory themes: {len(analysis.get('regulatory_themes', []))}")
        print()
        
        # Step 4: Synthesize insights for executive summary
        print("4. Creating executive summary...")
        insights_result = tool_interface.execute_tool("synthesize_comment_insights", {
            "analysis_results": analysis_result,
            "summary_type": "executive"
        })
        
        if insights_result.get("success"):
            insights = insights_result.get("insights", {})
            print("   📊 Executive Summary:")
            print(f"   • Overview: {insights.get('overview', 'N/A')}")
            print(f"   • Sentiment: {insights.get('sentiment', 'N/A')}")
            print(f"   • Total Comments: {insights.get('stakeholder_engagement', {}).get('total_comments', 0)}")
            print(f"   • Confidence Level: {insights.get('confidence_level', 0.0):.2f}")
            print()
            
            # Show key findings
            key_findings = insights.get('key_findings', [])
            if key_findings:
                print("   🔍 Key Findings:")
                for i, finding in enumerate(key_findings, 1):
                    print(f"   {i}. {finding}")
                print()
        
        # Step 5: Identify regulatory themes
        print("5. Identifying regulatory themes...")
        themes_result = tool_interface.execute_tool("identify_regulatory_themes", {
            "analysis_results": analysis_result
        })
        
        if themes_result.get("success"):
            theme_categories = themes_result.get("theme_categories", {})
            print("   📋 Regulatory Themes by Category:")
            for category, themes in theme_categories.items():
                if themes:
                    print(f"   • {category.title()}: {len(themes)} themes")
                    for theme in themes[:2]:  # Show top 2 themes per category
                        print(f"     - {theme.get('theme', 'Unknown')} (frequency: {theme.get('frequency', 0)})")
            print()
        
        # Step 6: Assess stakeholder concerns
        print("6. Assessing stakeholder concerns...")
        concerns_result = tool_interface.execute_tool("assess_stakeholder_concerns", {
            "analysis_results": analysis_result
        })
        
        if concerns_result.get("success"):
            concern_analysis = concerns_result.get("concern_analysis", {})
            print("   👥 Stakeholder Concerns:")
            print(f"   • Total concerns identified: {concern_analysis.get('total_concerns', 0)}")
            
            concerns_by_type = concern_analysis.get("concerns_by_type", {})
            print(f"   • Organization concerns: {concerns_by_type.get('organizations', 0)}")
            print(f"   • Individual concerns: {concerns_by_type.get('individuals', 0)}")
            print(f"   • Common concerns: {concerns_by_type.get('common', 0)}")
            
            top_concerns = concern_analysis.get("top_concerns", [])
            if top_concerns:
                print("   • Top concerns:")
                for i, concern in enumerate(top_concerns[:3], 1):
                    print(f"     {i}. {concern}")
            print()
        
        # Step 7: Generate final summary for "see more" button
        print("7. Generating final summary for 'See More' button...")
        final_summary = generate_see_more_summary(analysis_result, insights_result, themes_result, concerns_result)
        print("   📄 Final Summary:")
        print(f"   {final_summary}")
        
    else:
        print(f"   ❌ Analysis failed: {analysis_result.get('error')}")


def generate_see_more_summary(analysis_result: Dict[str, Any], 
                            insights_result: Dict[str, Any],
                            themes_result: Dict[str, Any], 
                            concerns_result: Dict[str, Any]) -> str:
    """
    Generate a comprehensive summary for the "See More" button
    This would be displayed in the frontend when users click "See More"
    """
    
    if not all(result.get("success") for result in [analysis_result, insights_result, themes_result, concerns_result]):
        return "Analysis incomplete. Please try again."
    
    analysis = analysis_result.get("analysis", {})
    insights = insights_result.get("insights", {})
    concern_analysis = concerns_result.get("concern_analysis", {})
    
    # Build the summary
    summary_parts = []
    
    # Overview
    total_comments = analysis.get("total_comments_analyzed", 0)
    sentiment = insights.get("sentiment", "Unknown")
    summary_parts.append(f"Analysis of {total_comments} public comments shows {sentiment.lower()}.")
    
    # Key themes
    primary_themes = insights.get("primary_themes", [])
    if primary_themes:
        themes_text = ", ".join(primary_themes[:3])
        summary_parts.append(f"Primary themes include: {themes_text}.")
    
    # Stakeholder engagement
    stakeholder_types = insights.get("stakeholder_engagement", {}).get("stakeholder_types", [])
    if stakeholder_types:
        stakeholder_text = ", ".join(stakeholder_types[:3])
        summary_parts.append(f"Comments from {stakeholder_text}.")
    
    # Top concerns
    top_concerns = concern_analysis.get("top_concerns", [])
    if top_concerns:
        concerns_text = "; ".join([concern.split(":")[0] for concern in top_concerns[:2]])
        summary_parts.append(f"Main concerns: {concerns_text}.")
    
    # Confidence level
    confidence = insights.get("confidence_level", 0.0)
    if confidence > 0.7:
        summary_parts.append("High confidence analysis based on comprehensive comment review.")
    elif confidence > 0.4:
        summary_parts.append("Moderate confidence analysis with some limitations.")
    else:
        summary_parts.append("Limited analysis due to small comment sample.")
    
    return " ".join(summary_parts)


def simulate_gpt_oss_workflow():
    """
    Simulate how GPT-OSS:20b would use these tools in a real workflow
    """
    print("=== GPT-OSS:20b Workflow Simulation ===\n")
    
    # This simulates the chain-of-thought process that GPT-OSS:20b would follow
    workflow_steps = [
        "1. User clicks 'See More' button on a regulatory document",
        "2. Frontend sends document ID to backend",
        "3. GPT-OSS:20b receives tool definitions and document ID",
        "4. GPT-OSS:20b decides to analyze comments using available tools",
        "5. GPT-OSS:20b calls 'analyze_regulatory_comments' tool",
        "6. GPT-OSS:20b processes the analysis results",
        "7. GPT-OSS:20b calls 'synthesize_comment_insights' for executive summary",
        "8. GPT-OSS:20b calls 'identify_regulatory_themes' for theme analysis",
        "9. GPT-OSS:20b calls 'assess_stakeholder_concerns' for stakeholder analysis",
        "10. GPT-OSS:20b synthesizes all results into a comprehensive response",
        "11. GPT-OSS:20b returns formatted analysis to frontend",
        "12. Frontend displays the analysis in the 'See More' modal/panel"
    ]
    
    for step in workflow_steps:
        print(step)
    
    print("\n=== Tool Usage Pattern ===")
    print("GPT-OSS:20b would use these tools in sequence:")
    print("• analyze_regulatory_comments (main analysis)")
    print("• synthesize_comment_insights (executive summary)")
    print("• identify_regulatory_themes (theme categorization)")
    print("• assess_stakeholder_concerns (stakeholder analysis)")
    print("\nEach tool call provides structured data that GPT-OSS:20b can")
    print("process and synthesize into natural language responses.")


if __name__ == "__main__":
    print("Regulatory Comment Analysis - GPT-OSS:20b Integration Example\n")
    
    # Run the simulation first
    simulate_gpt_oss_workflow()
    print("\n" + "="*60 + "\n")
    
    # Run the actual example (requires valid API key)
    try:
        example_gpt_oss_integration()
    except Exception as e:
        print(f"Example failed (likely due to missing API key): {e}")
        print("\nTo run the full example:")
        print("1. Get a regulations.gov API key from https://api.regulations.gov/")
        print("2. Add the API key in the frontend Settings")
        print("3. Or set the NAVI_REGULATIONS_API_KEY environment variable")
        print("4. Run the script again")
    
    print("\n=== Integration Complete ===")
    print("The tools are ready for GPT-OSS:20b integration!")
    print("Use create_gpt_oss_tool_interface() to get started.")
