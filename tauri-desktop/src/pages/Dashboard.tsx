import React, { useState, useEffect } from 'react';
import { fetch as tauriFetch } from '@tauri-apps/plugin-http';

interface PersonaData {
  name?: string;
  role?: string;
  interests?: string[];
  _saved_at?: string;
}

interface CommentBoard {
  docketId: string;
  documentId: string;
  title: string;
  agencyId: string;
  documentType: string;
  openForComment: boolean;
  withinCommentPeriod: boolean;
  commentEndDate: string;
  commentStartDate: string;
  postedDate: string;
  content: string;
  webCommentLink: string;
  webDocumentLink: string;
  relevanceScore?: number;
  relevanceReason?: string;
}

interface ApiData {
  count: number;
  items: Array<{
    key: string;
    data: CommentBoard;
  }>;
}

export function Dashboard() {
  const [persona, setPersona] = useState<PersonaData | null>(null);
  const [apiData, setApiData] = useState<ApiData | null>(null);
  const [relevantBoards, setRelevantBoards] = useState<CommentBoard[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [lastAnalysis, setLastAnalysis] = useState<string | null>(null);
  const [consoleLogs, setConsoleLogs] = useState<string[]>([]);
  const [showLogs, setShowLogs] = useState(false);

  // Load persona and API data on component mount
  useEffect(() => {
    loadData();
  }, []);

  // Analyze relevance when both persona and API data are available
  useEffect(() => {
    if (persona && apiData && apiData.items.length > 0) {
      analyzeRelevance();
    }
  }, [persona, apiData]);

  // Custom logging function that adds to both console and UI
  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const logMessage = `[${timestamp}] ${message}`;
    console.log(logMessage);
    setConsoleLogs(prev => [...prev.slice(-49), logMessage]); // Keep last 50 logs
  };

  const loadData = () => {
    addLog('=== LOADING DATA START ===');
    try {
      // Load persona data
      const savedPersona = localStorage.getItem('navi-persona-data');
      addLog(`Persona data from localStorage: ${savedPersona ? 'Found' : 'Not found'}`);
      if (savedPersona) {
        const parsedPersona = JSON.parse(savedPersona);
        setPersona(parsedPersona);
        addLog(`Loaded persona data: ${JSON.stringify(parsedPersona)}`);
        addLog(`Persona interests: ${parsedPersona.interests ? parsedPersona.interests.join(', ') : 'None'}`);
        addLog(`Persona role: ${parsedPersona.role || 'None'}`);
      } else {
        addLog('No persona data found in localStorage');
      }

      // Load API data
      const savedApiData = localStorage.getItem('navi-regulations-data');
      addLog(`API data from localStorage: ${savedApiData ? 'Found' : 'Not found'}`);
      if (savedApiData) {
        const parsedApiData = JSON.parse(savedApiData);
        setApiData(parsedApiData);
        addLog(`Loaded API data with count: ${parsedApiData.count}`);
        addLog(`API data items length: ${parsedApiData.items ? parsedApiData.items.length : 'No items'}`);
        if (parsedApiData.items && parsedApiData.items.length > 0) {
          addLog(`First API item: ${parsedApiData.items[0].data.title} (${parsedApiData.items[0].data.agencyId})`);
        }
      } else {
        addLog('No API data found in localStorage');
      }

      // Load saved relevant boards
      const savedRelevantBoards = localStorage.getItem('navi-relevant-boards');
      addLog(`Relevant boards from localStorage: ${savedRelevantBoards ? 'Found' : 'Not found'}`);
      if (savedRelevantBoards) {
        const parsedRelevantBoards = JSON.parse(savedRelevantBoards);
        setRelevantBoards(parsedRelevantBoards.boards || []);
        setLastAnalysis(parsedRelevantBoards.lastAnalysis || null);
        addLog(`Loaded ${parsedRelevantBoards.boards ? parsedRelevantBoards.boards.length : 0} relevant boards`);
        addLog(`Last analysis: ${parsedRelevantBoards.lastAnalysis || 'Unknown'}`);
      } else {
        addLog('No relevant boards found in localStorage');
      }
    } catch (err) {
      addLog(`ERROR LOADING DATA: ${err instanceof Error ? err.message : String(err)}`);
      console.error('=== ERROR LOADING DATA ===');
      console.error('Error type:', typeof err);
      console.error('Error message:', err instanceof Error ? err.message : String(err));
      console.error('Error stack:', err instanceof Error ? err.stack : 'No stack trace');
      console.error('Full error object:', err);
    }
    addLog('=== LOADING DATA END ===');
  };

  const saveRelevantBoards = (boards: CommentBoard[], analysisTime: string) => {
    try {
      const dataToSave = {
        boards: boards,
        lastAnalysis: analysisTime,
        savedAt: new Date().toISOString()
      };
      localStorage.setItem('navi-relevant-boards', JSON.stringify(dataToSave));
      addLog(`Saved ${boards.length} relevant boards to localStorage`);
    } catch (err) {
      addLog(`ERROR SAVING RELEVANT BOARDS: ${err instanceof Error ? err.message : String(err)}`);
      console.error('Error saving relevant boards:', err);
    }
  };

  const analyzeRelevance = async () => {
    if (!persona || !apiData) return;

    setIsAnalyzing(true);
    setAnalysisError(null);

    try {
      addLog('=== RELEVANCE ANALYSIS START ===');
      addLog(`Persona data: ${JSON.stringify(persona)}`);
      addLog(`API data count: ${apiData.count}`);
      addLog(`API data items: ${apiData.items.length}`);
      
      // Create a prompt for Ollama to analyze relevance
      const prompt = createAnalysisPrompt(persona, apiData.items.map(item => item.data));
      
      addLog(`=== PROMPT SENT TO OLLAMA ===`);
      addLog(`Prompt length: ${prompt.length}`);
      addLog(`Full prompt: ${prompt}`);
      
      // Get Ollama configuration from localStorage or use defaults
      const host = '10.0.4.52';
      const port = '11434';
      const model = 'gpt-oss:20b';
      
      const url = `http://${host}:${port}/api/generate`;
      const payload = {
        model: model,
        prompt: prompt,
        stream: false
      };

      addLog(`=== OLLAMA REQUEST DETAILS ===`);
      addLog(`URL: ${url}`);
      addLog(`Model: ${model}`);
      addLog(`Payload: ${JSON.stringify(payload)}`);

      addLog('Sending analysis request to Ollama...');
      
      let response;
      try {
        // Try Tauri HTTP client first
        addLog('Trying Tauri HTTP client...');
        response = await tauriFetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload)
        });
        addLog('Tauri HTTP client succeeded');
      } catch (tauriError) {
        addLog(`Tauri HTTP client failed, trying browser fetch... ${tauriError}`);
        // Fallback to browser fetch
        response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload)
        });
        addLog('Browser fetch succeeded');
      }

      addLog(`=== OLLAMA RESPONSE ===`);
      addLog(`Response status: ${response.status}`);
      addLog(`Response ok: ${response.ok}`);

      if (!response.ok) {
        const errorText = await response.text();
        addLog(`Error response body: ${errorText}`);
        throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      addLog(`=== OLLAMA RESPONSE DATA ===`);
      addLog(`Full response data: ${JSON.stringify(data)}`);
      addLog(`Response type: ${typeof data}`);
      addLog(`Response keys: ${Object.keys(data)}`);
      addLog(`Response.response: ${data.response}`);
      addLog(`Response.response type: ${typeof data.response}`);
      addLog(`Response.response length: ${data.response ? data.response.length : 'N/A'}`);
      
      // Parse the analysis results
      addLog(`=== PARSING ANALYSIS RESULTS ===`);
      const analysisResults = parseAnalysisResults(data.response, apiData.items.map(item => item.data));
      addLog(`Parsed analysis results: ${JSON.stringify(analysisResults)}`);
      addLog(`Number of relevant boards found: ${analysisResults.length}`);
      
      const analysisTime = new Date().toISOString();
      setRelevantBoards(analysisResults);
      setLastAnalysis(analysisTime);
      
      // Save the results to localStorage
      saveRelevantBoards(analysisResults, analysisTime);
      
      addLog(`=== ANALYSIS COMPLETED ===`);
      addLog(`Final relevant boards: ${analysisResults.length} boards`);
      
    } catch (err) {
      addLog(`=== ANALYSIS ERROR ===`);
      addLog(`Error: ${err instanceof Error ? err.message : String(err)}`);
      console.error('=== ANALYSIS ERROR ===');
      console.error('Error type:', typeof err);
      console.error('Error constructor:', err?.constructor?.name);
      console.error('Error message:', err instanceof Error ? err.message : String(err));
      console.error('Error stack:', err instanceof Error ? err.stack : 'No stack trace');
      console.error('Full error object:', err);
      
      setAnalysisError(err instanceof Error ? err.message : 'Failed to analyze relevance');
    } finally {
      setIsAnalyzing(false);
      addLog('=== RELEVANCE ANALYSIS END ===');
    }
  };

  const createAnalysisPrompt = (persona: PersonaData, boards: CommentBoard[]): string => {
    const personaInfo = `
Persona Information:
- Name: ${persona.name || 'Not specified'}
- Role: ${persona.role || 'Not specified'}
- Interests: ${persona.interests ? persona.interests.join(', ') : 'Not specified'}
`;

    const boardsInfo = boards.map((board, index) => `
${index + 1}. ${board.title}
   Agency: ${board.agencyId}
   Type: ${board.documentType}
   Open for Comment: ${board.openForComment}
   Comment Period: ${board.commentStartDate} to ${board.commentEndDate}
   Content: ${board.content.substring(0, 500)}...
`).join('\n');

    return `
You are a civic engagement assistant. Analyze the following comment boards and identify which ones would be most relevant and interesting to the given persona.

${personaInfo}

Available Comment Boards:
${boardsInfo}

For each comment board, determine:
1. Relevance score (0-10, where 10 is highly relevant)
2. Brief reason for relevance

Respond in JSON format with this structure:
{
  "relevant_boards": [
    {
      "index": 1,
      "relevance_score": 8,
      "relevance_reason": "Directly relates to healthcare policy which aligns with the persona's interests"
    }
  ]
}

Only include boards with relevance score >= 6. Be selective and focus on the most relevant opportunities for civic engagement.
`;
  };

  const parseAnalysisResults = (ollamaResponse: string, boards: CommentBoard[]): CommentBoard[] => {
    addLog('=== PARSING ANALYSIS RESULTS START ===');
    addLog(`Raw Ollama response: ${ollamaResponse}`);
    addLog(`Response type: ${typeof ollamaResponse}`);
    addLog(`Response length: ${ollamaResponse ? ollamaResponse.length : 'N/A'}`);
    addLog(`Available boards count: ${boards.length}`);
    
    try {
      // Try to extract JSON from the response
      addLog('Looking for JSON pattern in response...');
      const jsonMatch = ollamaResponse.match(/\{[\s\S]*\}/);
      addLog(`JSON match found: ${!!jsonMatch}`);
      
      if (!jsonMatch) {
        addLog('No JSON pattern found in response');
        addLog(`Response preview (first 500 chars): ${ollamaResponse.substring(0, 500)}`);
        throw new Error('No JSON found in response');
      }

      addLog(`Extracted JSON string: ${jsonMatch[0]}`);
      const analysis = JSON.parse(jsonMatch[0]);
      addLog(`Parsed analysis object: ${JSON.stringify(analysis)}`);
      addLog(`Analysis keys: ${Object.keys(analysis)}`);
      
      const relevantBoards: CommentBoard[] = [];

      if (analysis.relevant_boards && Array.isArray(analysis.relevant_boards)) {
        addLog(`Found relevant_boards array with ${analysis.relevant_boards.length} items`);
        analysis.relevant_boards.forEach((item: any, index: number) => {
          addLog(`Processing relevant board ${index + 1}: ${JSON.stringify(item)}`);
          const boardIndex = item.index - 1; // Convert to 0-based index
          addLog(`Board index: ${item.index} -> array index: ${boardIndex}`);
          
          if (boardIndex >= 0 && boardIndex < boards.length) {
            const board = { ...boards[boardIndex] };
            board.relevanceScore = item.relevance_score;
            board.relevanceReason = item.relevance_reason;
            relevantBoards.push(board);
            addLog(`Added board: ${board.title} (score: ${board.relevanceScore})`);
          } else {
            addLog(`Invalid board index: ${boardIndex} (boards length: ${boards.length})`);
          }
        });
      } else {
        addLog('No relevant_boards array found in analysis');
        addLog(`Analysis structure: ${JSON.stringify(analysis)}`);
      }

      addLog(`Total relevant boards found: ${relevantBoards.length}`);
      
      // Sort by relevance score (highest first)
      const sortedBoards = relevantBoards.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));
      addLog(`Sorted boards: ${JSON.stringify(sortedBoards.map(b => ({ title: b.title, score: b.relevanceScore })))}`);
      
      addLog('=== PARSING ANALYSIS RESULTS SUCCESS ===');
      return sortedBoards;
    } catch (err) {
      addLog(`=== PARSING ANALYSIS RESULTS ERROR ===`);
      addLog(`Error: ${err instanceof Error ? err.message : String(err)}`);
      console.error('=== PARSING ANALYSIS RESULTS ERROR ===');
      console.error('Error type:', typeof err);
      console.error('Error message:', err instanceof Error ? err.message : String(err));
      console.error('Error stack:', err instanceof Error ? err.stack : 'No stack trace');
      console.error('Full error object:', err);
      
      // Fallback: return first few boards if parsing fails
      const fallbackBoards = boards.slice(0, 3).map(board => ({
        ...board,
        relevanceScore: 5,
        relevanceReason: 'Analysis parsing failed - showing sample boards'
      }));
      addLog(`Returning fallback boards: ${fallbackBoards.length}`);
      return fallbackBoards;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getDaysUntilDeadline = (endDate: string) => {
    const now = new Date();
    const deadline = new Date(endDate);
    const diffTime = deadline.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <div style={{ 
      height: '100vh', 
      display: 'flex', 
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      <div style={{ 
        padding: '20px 30px', 
        borderBottom: '1px solid #333', 
        background: '#1A1A1A',
        flexShrink: 0
      }}>
        <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 700 }}>Dashboard</h1>
        <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#B8B8B8' }}>
          Personalized civic engagement opportunities
        </p>
      </div>
      
      <div style={{ 
        flex: 1, 
        overflowY: 'auto', 
        overflowX: 'hidden',
        padding: 30 
      }}>
        {/* Status Section */}
        <div style={{ 
          background: '#1A1A1A', 
          border: '1px solid #333', 
          borderRadius: 12, 
          padding: 24,
          marginBottom: 24
        }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: 600 }}>Status</h3>
          
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ 
                width: 8, 
                height: 8, 
                borderRadius: '50%', 
                background: persona ? '#4CAF50' : '#FF6B6B' 
              }} />
              <span style={{ fontSize: '14px', color: '#B8B8B8' }}>
                Persona: {persona ? 'Configured' : 'Not configured'}
              </span>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ 
                width: 8, 
                height: 8, 
                borderRadius: '50%', 
                background: apiData ? '#4CAF50' : '#FF6B6B' 
              }} />
              <span style={{ fontSize: '14px', color: '#B8B8B8' }}>
                API Data: {apiData ? `${apiData.count} items` : 'Not loaded'}
              </span>
            </div>
            
            {lastAnalysis && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ 
                  width: 8, 
                  height: 8, 
                  borderRadius: '50%', 
                  background: '#4CAF50' 
                }} />
                <span style={{ fontSize: '14px', color: '#B8B8B8' }}>
                  Last analyzed: {new Date(lastAnalysis).toLocaleString()}
                </span>
              </div>
            )}
          </div>

          {isAnalyzing && (
            <div style={{ marginTop: 16, color: '#FFA726', fontSize: '14px' }}>
              🔄 Analyzing relevance with AI...
            </div>
          )}

          {analysisError && (
            <div style={{ marginTop: 16, color: '#FF6B6B', fontSize: '14px' }}>
              ❌ Analysis error: {analysisError}
            </div>
          )}

          {/* Action Buttons */}
          <div style={{ marginTop: 16, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button
              onClick={analyzeRelevance}
              disabled={isAnalyzing || !persona || !apiData}
              style={{
                background: isAnalyzing || !persona || !apiData ? '#444' : '#3C362A',
                color: '#FAFAFA',
                border: '1px solid #555',
                borderRadius: 6,
                padding: '8px 16px',
                fontSize: '14px',
                cursor: isAnalyzing || !persona || !apiData ? 'not-allowed' : 'pointer',
                opacity: (isAnalyzing || !persona || !apiData) ? 0.5 : 1
              }}
            >
              {isAnalyzing ? 'Analyzing...' : 'Refresh Analysis'}
            </button>
            
            {relevantBoards.length > 0 && (
              <button
                onClick={() => {
                  localStorage.removeItem('navi-relevant-boards');
                  setRelevantBoards([]);
                  setLastAnalysis(null);
                  addLog('Cleared saved relevant boards');
                }}
                style={{
                  background: '#6B2C2C',
                  color: '#FAFAFA',
                  border: '1px solid #444',
                  borderRadius: 6,
                  padding: '8px 16px',
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
              >
                Clear Saved Results
              </button>
            )}
          </div>

          {/* Console Logs Toggle */}
          <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button
              onClick={() => setShowLogs(!showLogs)}
              style={{
                background: '#2A2A2A',
                color: '#B8B8B8',
                border: '1px solid #444',
                borderRadius: 6,
                padding: '8px 16px',
                fontSize: '14px',
                cursor: 'pointer'
              }}
            >
              {showLogs ? 'Hide' : 'Show'} Console Logs ({consoleLogs.length})
            </button>
            
            {consoleLogs.length > 0 && (
              <button
                onClick={() => setConsoleLogs([])}
                style={{
                  background: '#6B2C2C',
                  color: '#FAFAFA',
                  border: '1px solid #444',
                  borderRadius: 6,
                  padding: '8px 16px',
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
              >
                Clear Logs
              </button>
            )}
          </div>

          {/* Console Logs Display */}
          {showLogs && (
            <div style={{ 
              marginTop: 16, 
              background: '#0A0A0A', 
              border: '1px solid #333', 
              borderRadius: 8, 
              padding: 16,
              maxHeight: '300px',
              overflowY: 'auto'
            }}>
              <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: 600, color: '#B8B8B8' }}>
                Console Logs
              </h4>
              {consoleLogs.length === 0 ? (
                <div style={{ color: '#666', fontSize: '12px', fontStyle: 'italic' }}>
                  No logs yet. Navigate to Dashboard to see analysis logs.
                </div>
              ) : (
                <div style={{ fontFamily: 'monospace', fontSize: '11px', lineHeight: '1.4' }}>
                  {consoleLogs.map((log, index) => (
                    <div key={index} style={{ 
                      color: log.includes('ERROR') ? '#FF6B6B' : 
                             log.includes('===') ? '#4CAF50' : '#B8B8B8',
                      marginBottom: 4,
                      wordBreak: 'break-word'
                    }}>
                      {log}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Relevant Comment Boards */}
        {relevantBoards.length > 0 && (
          <div>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: 600 }}>
              Relevant Comment Opportunities ({relevantBoards.length})
            </h3>
            
            <div style={{ display: 'grid', gap: 16 }}>
              {relevantBoards.map((board, index) => (
                <div key={board.documentId} style={{
                  background: '#1A1A1A',
                  border: '1px solid #333',
                  borderRadius: 12,
                  padding: 20,
                  position: 'relative'
                }}>
                  {/* Relevance Score Badge */}
                  <div style={{
                    position: 'absolute',
                    top: 16,
                    right: 16,
                    background: board.relevanceScore && board.relevanceScore >= 8 ? '#4CAF50' : 
                               board.relevanceScore && board.relevanceScore >= 6 ? '#FFA726' : '#FF6B6B',
                    color: '#FAFAFA',
                    padding: '4px 8px',
                    borderRadius: 6,
                    fontSize: '12px',
                    fontWeight: 600
                  }}>
                    {board.relevanceScore}/10
                  </div>

                  <div style={{ marginRight: 80 }}>
                    <h4 style={{ 
                      margin: '0 0 8px 0', 
                      fontSize: '16px', 
                      fontWeight: 600,
                      lineHeight: '1.4'
                    }}>
                      {board.title}
                    </h4>
                    
                    <div style={{ display: 'flex', gap: 16, marginBottom: 12, flexWrap: 'wrap' }}>
                      <span style={{ 
                        background: '#2A2A2A', 
                        color: '#B8B8B8', 
                        padding: '4px 8px', 
                        borderRadius: 4, 
                        fontSize: '12px' 
                      }}>
                        {board.agencyId}
                      </span>
                      <span style={{ 
                        background: '#2A2A2A', 
                        color: '#B8B8B8', 
                        padding: '4px 8px', 
                        borderRadius: 4, 
                        fontSize: '12px' 
                      }}>
                        {board.documentType}
                      </span>
                      <span style={{ 
                        background: board.withinCommentPeriod ? '#4CAF50' : '#FF6B6B', 
                        color: '#FAFAFA', 
                        padding: '4px 8px', 
                        borderRadius: 4, 
                        fontSize: '12px' 
                      }}>
                        {board.withinCommentPeriod ? 'Open for Comments' : 'Closed'}
                      </span>
                    </div>

                    {board.relevanceReason && (
                      <div style={{ 
                        background: '#2A2A2A', 
                        padding: 12, 
                        borderRadius: 8, 
                        marginBottom: 12,
                        borderLeft: '3px solid #4CAF50'
                      }}>
                        <div style={{ fontSize: '12px', color: '#4CAF50', fontWeight: 600, marginBottom: 4 }}>
                          Why this is relevant:
                        </div>
                        <div style={{ fontSize: '14px', color: '#B8B8B8' }}>
                          {board.relevanceReason}
                        </div>
                      </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                      <div style={{ fontSize: '14px', color: '#B8B8B8' }}>
                        Comment deadline: {formatDate(board.commentEndDate)}
                        {board.withinCommentPeriod && (
                          <span style={{ 
                            color: getDaysUntilDeadline(board.commentEndDate) <= 7 ? '#FF6B6B' : '#FFA726',
                            fontWeight: 600,
                            marginLeft: 8
                          }}>
                            ({getDaysUntilDeadline(board.commentEndDate)} days left)
                          </span>
                        )}
                      </div>
                      
                      <div style={{ display: 'flex', gap: 8 }}>
                        <a 
                          href={board.webCommentLink} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          style={{
                            background: '#3C362A',
                            color: '#FAFAFA',
                            padding: '8px 16px',
                            borderRadius: 6,
                            textDecoration: 'none',
                            fontSize: '14px',
                            fontWeight: 500
                          }}
                        >
                          Comment
                        </a>
                        <a 
                          href={board.webDocumentLink} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          style={{
                            background: '#2A2A2A',
                            color: '#B8B8B8',
                            padding: '8px 16px',
                            borderRadius: 6,
                            textDecoration: 'none',
                            fontSize: '14px',
                            border: '1px solid #444'
                          }}
                        >
                          View Details
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* No Data States */}
        {!persona && (
          <div style={{ 
            background: '#1A1A1A', 
            border: '1px solid #333', 
            borderRadius: 12, 
            padding: 24,
            textAlign: 'center'
          }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: 600 }}>Configure Your Persona</h3>
            <p style={{ color: '#B8B8B8', fontSize: '14px', margin: 0 }}>
              Set up your persona in the "My Persona" section to get personalized comment board recommendations.
            </p>
          </div>
        )}

        {persona && !apiData && (
          <div style={{ 
            background: '#1A1A1A', 
            border: '1px solid #333', 
            borderRadius: 12, 
            padding: 24,
            textAlign: 'center'
          }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: 600 }}>Load API Data</h3>
            <p style={{ color: '#B8B8B8', fontSize: '14px', margin: 0 }}>
              Go to Settings to fetch the latest comment board data from the API.
            </p>
          </div>
        )}

        {persona && apiData && relevantBoards.length === 0 && !isAnalyzing && (
          <div style={{ 
            background: '#1A1A1A', 
            border: '1px solid #333', 
            borderRadius: 12, 
            padding: 24,
            textAlign: 'center'
          }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: 600 }}>No Relevant Boards Found</h3>
          <p style={{ color: '#B8B8B8', fontSize: '14px', margin: 0 }}>
              No comment boards were found that match your current persona interests. Try updating your interests or check back later for new opportunities.
          </p>
        </div>
        )}
      </div>
    </div>
  );
}
