# Regulatory Comment Analysis with GPT-OSS:20b

This module provides AI-powered analysis of regulatory comments from regulations.gov API, designed for integration with GPT-OSS:20b for agentic tasks.

## Overview

The system consists of three main components:

1. **`regulations_gov_api.py`** - Core API functions for fetching comments from regulations.gov
2. **`ai_comment_analyzer.py`** - Advanced AI analysis capabilities for comment synthesis
3. **`gpt_oss_tools.py`** - Tool interface for GPT-OSS:20b integration

## Features

### Core Analysis Capabilities
- **Comment Fetching**: Retrieve public comments from regulations.gov API v4
- **Key Point Extraction**: Identify main themes and concerns from comments
- **Sentiment Analysis**: Analyze overall sentiment (positive, negative, mixed)
- **Stakeholder Categorization**: Classify commenters by type (organizations, individuals, etc.)
- **Regulatory Theme Identification**: Categorize comments by regulatory themes
- **Impact Assessment**: Identify potential regulatory impacts mentioned
- **Recommendation Extraction**: Extract suggestions and recommendations from comments

### Advanced AI Features
- **Multi-dimensional Analysis**: Comprehensive analysis across multiple dimensions
- **Confidence Scoring**: Calculate confidence levels for analysis results
- **Stakeholder Concern Mapping**: Map concerns by stakeholder type
- **Technical Issue Identification**: Identify technical challenges and barriers
- **Economic Impact Analysis**: Extract economic concerns and impacts
- **Timeline Analysis**: Identify implementation timeline concerns
- **Implementation Challenge Detection**: Find potential implementation barriers

## GPT-OSS:20b Integration

### Tool Definitions

The system provides 6 main tools for GPT-OSS:20b:

1. **`analyze_regulatory_comments`** - Main analysis function
2. **`get_comment_count`** - Get total comment count for a document
3. **`synthesize_comment_insights`** - Create executive summaries
4. **`identify_regulatory_themes`** - Categorize regulatory themes
5. **`assess_stakeholder_concerns`** - Analyze stakeholder concerns
6. **`test_api_connection`** - Test regulations.gov API connection

### Usage Example

```python
from gpt_oss_tools import create_gpt_oss_tool_interface

# Create tool interface (API key read from localStorage/config)
tool_interface = create_gpt_oss_tool_interface()

# Get tool definitions for GPT-OSS:20b
tools = tool_interface.get_tool_definitions()

# Execute analysis
result = tool_interface.execute_tool("analyze_regulatory_comments", {
    "document_id": "EPA-HQ-OAR-2021-0317-0001",
    "max_comments": 30,
    "analysis_depth": "advanced"
})
```

## Installation

1. Install required dependencies:
```bash
pip install -r requirements.txt
```

2. Get a regulations.gov API key from https://api.regulations.gov/

3. Configure your API key using one of these methods:
   - **Frontend Settings**: Add the API key in your Tauri app's Settings page
   - **Setup Script**: Run `python setup_api_key.py` for interactive setup
   - **Environment Variable**: Set `NAVI_REGULATIONS_API_KEY=your-key-here`

## API Key Setup

The system automatically reads the regulations.gov API key from your Tauri app's localStorage (same as the frontend). The API key is stored with the key `'navi-regulations-api-config'` and follows the same format as the TypeScript version.

### Setup Methods:

1. **Frontend Settings (Recommended)**: 
   - Open your Tauri app
   - Go to Settings page
   - Add your regulations.gov API key
   - The Python backend will automatically read it

2. **Setup Script**:
   ```bash
   python setup_api_key.py
   ```

3. **Environment Variable**:
   ```bash
   export NAVI_REGULATIONS_API_KEY="your-api-key-here"
   ```

4. **Manual Config File**:
   - Create `regulations_api_config.json` in the backend directory
   - Add: `{"apiKey": "your-api-key-here"}`

## Analysis Depth Levels

### Basic Analysis
- Key point extraction using frequency analysis
- Basic sentiment analysis
- Simple stakeholder categorization
- Summary generation

### Advanced Analysis (Default)
- All basic features plus:
- Regulatory theme identification
- Impact assessment
- Stakeholder concern mapping
- Recommendation extraction
- Technical issue identification
- Economic concern analysis
- Timeline analysis
- Implementation challenge detection
- Confidence scoring

### Comprehensive Analysis
- All advanced features plus:
- Enhanced metadata
- Data quality scoring
- Extended confidence metrics
- Additional comprehensive features

## Output Format

All analysis results are returned as structured dictionaries with:

```python
{
    "success": True/False,
    "document_id": "string",
    "analysis": {
        "key_points": ["list of key points"],
        "common_perspectives": ["list of perspectives"],
        "sentiment_summary": "sentiment description",
        "stakeholder_types": ["list of stakeholder types"],
        "regulatory_themes": [{"theme": "name", "frequency": 10, ...}],
        "impact_assessments": [{"impact_type": "name", "mention_count": 5, ...}],
        "stakeholder_concerns": {"organizations": [...], "individuals": [...], "common": [...]},
        "recommendation_patterns": ["list of recommendations"],
        "technical_issues": ["list of technical issues"],
        "economic_concerns": ["list of economic concerns"],
        "timeline_concerns": ["list of timeline concerns"],
        "implementation_challenges": ["list of challenges"],
        "confidence_scores": {"overall_confidence": 0.8, ...},
        "summary": "comprehensive summary text"
    },
    "timestamp": "ISO timestamp"
}
```

## Error Handling

The system includes comprehensive error handling for:
- Invalid API keys
- Network connectivity issues
- API rate limiting
- Malformed responses
- Missing data
- Analysis failures

All errors are returned in a structured format with success/failure indicators.

## Performance Considerations

- **Comment Limits**: Default limit of 30 comments per analysis to prevent system overload
- **Rate Limiting**: Built-in handling for regulations.gov API rate limits
- **Caching**: Results can be cached to avoid repeated API calls
- **Async Support**: Can be extended for asynchronous processing

## Integration with Frontend

The "See More" button in the frontend would:

1. Send document ID to backend
2. Backend calls GPT-OSS:20b with tool definitions
3. GPT-OSS:20b analyzes comments using the tools
4. GPT-OSS:20b returns formatted analysis
5. Frontend displays the analysis in a modal/panel

## Example Workflow

1. User clicks "See More" on a regulatory document
2. Frontend sends document ID to backend
3. Backend creates GPT-OSS:20b tool interface
4. GPT-OSS:20b receives tool definitions
5. GPT-OSS:20b calls `analyze_regulatory_comments`
6. GPT-OSS:20b calls `synthesize_comment_insights` for summary
7. GPT-OSS:20b calls `identify_regulatory_themes` for themes
8. GPT-OSS:20b calls `assess_stakeholder_concerns` for concerns
9. GPT-OSS:20b synthesizes all results
10. GPT-OSS:20b returns comprehensive analysis
11. Frontend displays formatted results

## Testing

1. **Check API key setup**:
   ```bash
   python setup_api_key.py check
   ```

2. **Run the example integration**:
   ```bash
   python example_integration.py
   ```

3. **Test localStorage reader**:
   ```bash
   python local_storage_reader.py
   ```

This will demonstrate the complete workflow and show how GPT-OSS:20b would use the tools.

## Future Enhancements

- Integration with actual GPT-OSS:20b model
- Enhanced NLP capabilities
- Machine learning-based sentiment analysis
- Real-time comment monitoring
- Advanced visualization of analysis results
- Export capabilities for analysis reports
