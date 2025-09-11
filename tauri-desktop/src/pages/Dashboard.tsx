import { useState, useEffect } from 'react';
import { CommentDrafting } from '../components/CommentDrafting';

interface PersonaData {
  id?: number;
  name?: string;
  role?: string;
  location?: string;
  age_range?: string;
  employment_status?: string;
  industry?: string;
  policy_interests?: string[];
  preferred_agencies?: string[];
  impact_level?: string[];
  additional_context?: string;
  embedding?: number[];
  created_at?: string;
  updated_at?: string;
}

interface DocumentData {
  id: number;
  document_id: string;
  title: string;
  text?: string;  // Changed from content to text
  agency_id?: string;
  document_type?: string;
  web_comment_link?: string;
  web_document_link?: string;
  web_docket_link?: string;
  docket_id?: string;
  embedding?: number[];
  posted_date?: string;
  comment_end_date?: string;
  created_at?: string;
}

interface GPTReasoningResult {
  relevanceScore: number; // 1-10
  reasoning: string;
  thoughtProcess: string;
}

interface MatchedDocument {
  document: DocumentData;
  similarityScore: number;
  relevanceReason?: string;
  gptReasoning?: GPTReasoningResult;
}

export function Dashboard() {
  const [persona, setPersona] = useState<PersonaData | null>(null);
  const [documents, setDocuments] = useState<DocumentData[]>([]);
  const [matchedDocuments, setMatchedDocuments] = useState<MatchedDocument[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  
  // Document embedding state
  const [isEmbeddingDocuments, setIsEmbeddingDocuments] = useState(false);
  const [documentEmbeddingProgress, setDocumentEmbeddingProgress] = useState({ current: 0, total: 0 });
  
  // Comment drafting state
  const [showCommentDrafting, setShowCommentDrafting] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<{id: string, title: string} | null>(null);
  
  // GPT reasoning state
  const [isGeneratingReasoning, setIsGeneratingReasoning] = useState(false);
  const [reasoningProgress, setReasoningProgress] = useState({ current: 0, total: 0 });
  const [shouldStopReasoning, setShouldStopReasoning] = useState(false);
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  
  // Semantic matching threshold
  const semanticThreshold = 5.2;
  // GPT reasoning threshold
  const gptThreshold = 5.0;
  

  // Load data on component mount
  useEffect(() => {
    loadData();
  }, []);

  // Load saved matches when persona changes
  useEffect(() => {
    if (persona?.id) {
      loadSavedMatches();
    }
  }, [persona?.id]);


  // Utility function to prepare persona data for embedding
  const preparePersonaForEmbedding = (persona: PersonaData): string => {
    if (!persona) return '';
    
    const parts = [];
    
    // Basic information
    if (persona.name) parts.push(`Name: ${persona.name}`);
    if (persona.role) parts.push(`Role: ${persona.role}`);
    if (persona.location) parts.push(`Location: ${persona.location}`);
    if (persona.age_range) parts.push(`Age Range: ${persona.age_range}`);
    if (persona.employment_status) parts.push(`Employment Status: ${persona.employment_status}`);
    if (persona.industry) parts.push(`Industry: ${persona.industry}`);
    
    // Policy interests
    if (persona.policy_interests && persona.policy_interests.length > 0) {
      parts.push(`Policy Interests: ${persona.policy_interests.join(', ')}`);
    }
    
    // Preferred agencies
    if (persona.preferred_agencies && persona.preferred_agencies.length > 0) {
      parts.push(`Preferred Agencies: ${persona.preferred_agencies.join(', ')}`);
    }
    
    // Impact level
    if (persona.impact_level && persona.impact_level.length > 0) {
      parts.push(`Impact Level: ${persona.impact_level.join(', ')}`);
    }
    
    // Additional context
    if (persona.additional_context) {
      parts.push(`Additional Context: ${persona.additional_context}`);
    }
    
    // Create a comprehensive description
    const personaDescription = parts.join('. ');
    
    return personaDescription;
  };


  // Function to embed a single document
  const embedDocument = async (document: DocumentData): Promise<number[]> => {
    const documentText = `${document.title}. ${document.text || ''}`.trim();
    
    if (!documentText) {
      throw new Error(`No content available for document ${document.document_id}`);
    }
    
    // Get remote embedding configuration from localStorage
    const remoteEmbeddingHost = localStorage.getItem('remoteEmbeddingHost') || '10.0.4.52';
    const remoteEmbeddingPort = localStorage.getItem('remoteEmbeddingPort') || '11434';
    const remoteEmbeddingModel = localStorage.getItem('remoteEmbeddingModel') || 'nomic-embed-text:latest';
    
    const url = `http://${remoteEmbeddingHost}:${remoteEmbeddingPort}/api/embeddings`;
    const payload = {
      model: remoteEmbeddingModel,
      prompt: documentText
    };

    const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload)
        });

      if (!response.ok) {
        const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    
    if (!result.embedding || !Array.isArray(result.embedding)) {
      throw new Error('Invalid embedding response format');
    }

    return result.embedding;
  };

  // Function to embed all documents
  const embedAllDocuments = async () => {
    if (documents.length === 0) {
      return;
    }

    setIsEmbeddingDocuments(true);
    setDocumentEmbeddingProgress({ current: 0, total: documents.length });

    try {
      let successCount = 0;
      let errorCount = 0;

      for (let i = 0; i < documents.length; i++) {
        const document = documents[i];
        setDocumentEmbeddingProgress({ current: i + 1, total: documents.length });
        

        try {
          // Generate embedding for this document
          const embedding = await embedDocument(document);
          
          // Store the embedding in the database
          const embeddingResponse = await fetch('http://localhost:8001/documents/embedding', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              document_id: document.document_id,
              embedding: embedding
            })
          });
          
          if (embeddingResponse.ok) {
            successCount++;
          } else {
            errorCount++;
          }

        } catch (err) {
          errorCount++;
        }

        // Small delay to avoid overwhelming the embedding service
        await new Promise(resolve => setTimeout(resolve, 100));
      }


      // Reload data to get updated embeddings
      await loadData();

    } catch (err) {
      // Error in document embedding process
    } finally {
      setIsEmbeddingDocuments(false);
      setDocumentEmbeddingProgress({ current: 0, total: 0 });
    }
  };

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Load persona data
      const personaResponse = await fetch('http://localhost:8001/personas');
      if (personaResponse.ok) {
        const personas = await personaResponse.json();
        if (personas.length > 0) {
          setPersona(personas[0]);
        }
      }

      // Load all documents (we'll filter for embeddings in semantic matching)
      const documentsResponse = await fetch('http://localhost:8001/documents?limit=1000');
      if (documentsResponse.ok) {
        const documentsData = await documentsResponse.json();
        setDocuments(documentsData);
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const loadSavedMatches = async () => {
    if (!persona?.id) return;
    
    try {
      const response = await fetch(`http://localhost:8001/matched-documents?persona_id=${persona.id}`);
      if (response.ok) {
        const savedMatches = await response.json();
        
        // Convert saved matches to the format expected by the component
        const convertedMatches: MatchedDocument[] = savedMatches.map((savedMatch: any) => ({
          document: savedMatch.document,
          similarityScore: savedMatch.similarity_score,
          relevanceReason: savedMatch.relevance_reason,
          gptReasoning: {
            relevanceScore: savedMatch.gpt_relevance_score,
            reasoning: savedMatch.gpt_reasoning,
            thoughtProcess: savedMatch.gpt_thought_process
          }
        }));
        
        setMatchedDocuments(convertedMatches);
      }
    } catch (err) {
      console.error('Error loading saved matches:', err);
    }
  };

  const saveMatchesToDatabase = async (matches: MatchedDocument[]) => {
    if (!persona?.id || matches.length === 0) return;
    
    try {
      const matchesToSave = matches.map(match => ({
        document_id: match.document.document_id,
        similarity_score: match.similarityScore,
        gpt_relevance_score: match.gptReasoning?.relevanceScore || 0,
        relevance_reason: match.relevanceReason || '',
        gpt_reasoning: match.gptReasoning?.reasoning || '',
        gpt_thought_process: match.gptReasoning?.thoughtProcess || ''
      }));
      
      const response = await fetch('http://localhost:8001/matched-documents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          persona_id: persona.id,
          matched_documents: matchesToSave
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log(`Saved ${result.saved_count} matched documents to database`);
      }
    } catch (err) {
      console.error('Error saving matches to database:', err);
    }
  };

  const clearSavedMatches = async () => {
    if (!persona?.id) return;
    
    try {
      // Clear matches from database by saving an empty array
      const response = await fetch('http://localhost:8001/matched-documents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          persona_id: persona.id,
          matched_documents: []
        })
      });
      
      if (response.ok) {
        setMatchedDocuments([]);
        console.log('Cleared saved matches from database');
      }
    } catch (err) {
      console.error('Error clearing saved matches:', err);
    }
  };

  const findMatches = async () => {
    if (!persona || !persona.embedding || documents.length === 0) {
      setError('Missing persona embedding or documents. Please ensure persona has been embedded and documents are loaded.');
      return;
    }

    setIsLoading(true);
    setError(null);
    const semanticThresholdValue = semanticThreshold / 10; // Convert from 0-10 scale to 0-1 scale

    try {
      const personaEmbedding = persona.embedding;

      // Filter documents that have embeddings
      const documentsWithEmbeddings = documents.filter(doc => 
        doc.embedding && doc.embedding.length > 0
      );
      
      if (documentsWithEmbeddings.length === 0) {
        setError('No documents with embeddings found. Please embed documents first.');
        return;
      }

      // Step 1: Perform semantic matching
      const semanticMatches: MatchedDocument[] = [];
      const allSimilarities: {doc: DocumentData, similarity: number}[] = [];

      for (const doc of documentsWithEmbeddings) {
        // Type guard to ensure embedding exists
        if (!doc.embedding || doc.embedding.length === 0) {
          continue;
        }

        // Check dimension compatibility
        if (doc.embedding.length !== personaEmbedding.length) {
          continue;
        }

        // Calculate cosine similarity
        const similarity = calculateCosineSimilarity(personaEmbedding, doc.embedding);
        allSimilarities.push({doc, similarity});
        
        if (similarity >= semanticThresholdValue) {
          semanticMatches.push({
            document: doc,
            similarityScore: similarity,
            relevanceReason: generateRelevanceReason(persona, doc, similarity)
          });
        }
      }

      if (semanticMatches.length === 0) {
        setMatchedDocuments([]);
        setError(`No documents found above semantic threshold of ${semanticThreshold}/10`);
        return;
      }

      // Step 2: Perform GPT reasoning on semantic matches
      setIsGeneratingReasoning(true);
      setShouldStopReasoning(false);
      setReasoningProgress({ current: 0, total: semanticMatches.length });
      
      // Create abort controller for cancelling requests
      const controller = new AbortController();
      setAbortController(controller);

      const finalMatches: MatchedDocument[] = [];
      let gptMatchesCount = 0;

      for (let i = 0; i < semanticMatches.length; i++) {
        // Check if user wants to stop
        if (shouldStopReasoning) {
          break;
        }

        const match = semanticMatches[i];
        setReasoningProgress({ current: i + 1, total: semanticMatches.length });

        try {
          const gptResult = await getGPTReasoning(persona, match.document, controller.signal);
          
          // Count documents that pass GPT threshold
          if (gptResult.relevanceScore >= gptThreshold) {
            gptMatchesCount++;
            finalMatches.push({
              ...match,
              gptReasoning: gptResult
            });
          }
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'Unknown error';
          
          // Check if this was an abort error
          if (err instanceof Error && err.name === 'AbortError') {
            break; // Exit the loop completely
          } else {
            // Continue with other documents even if one fails
            console.error(`Error analyzing ${match.document.document_id}: ${errorMessage}`);
          }
        }

        // Small delay to avoid overwhelming the GPT service
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Sort final matches by GPT score (highest first)
      finalMatches.sort((a, b) => {
        const scoreA = a.gptReasoning?.relevanceScore || 0;
        const scoreB = b.gptReasoning?.relevanceScore || 0;
        return scoreB - scoreA;
      });
      
      setMatchedDocuments(finalMatches);

      // Save matches to database
      if (finalMatches.length > 0) {
        await saveMatchesToDatabase(finalMatches);
      }

      if (finalMatches.length === 0) {
        setError(`No documents found above GPT threshold of ${gptThreshold}/10 after semantic filtering`);
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
      setIsGeneratingReasoning(false);
      setReasoningProgress({ current: 0, total: 0 });
      setAbortController(null);
    }
  };

  const calculateCosineSimilarity = (vecA: number[], vecB: number[]): number => {
    if (vecA.length !== vecB.length) {
      throw new Error('Vectors must have the same length');
    }
    
    const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
    const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
    const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
    
    if (magnitudeA === 0 || magnitudeB === 0) {
      return 0;
    }
    
    return dotProduct / (magnitudeA * magnitudeB);
  };

  const generateRelevanceReason = (persona: PersonaData, doc: DocumentData, similarity: number): string => {
    const reasons = [];
    
    // Check for agency match
    if (doc.agency_id && persona.preferred_agencies?.some(agency => 
      agency.toLowerCase().includes(doc.agency_id!.toLowerCase()) || 
      doc.agency_id!.toLowerCase().includes(agency.toLowerCase())
    )) {
      reasons.push(`matches your preferred agency (${doc.agency_id})`);
    }
    
    // Check for policy interest match
    const docText = `${doc.title} ${doc.text || ''}`.toLowerCase();
    const matchingInterests = persona.policy_interests?.filter(interest => 
      docText.includes(interest.toLowerCase())
    ) || [];
    if (matchingInterests.length > 0) {
      reasons.push(`relates to your policy interests: ${matchingInterests.join(', ')}`);
    }
    
    // Check for role/industry relevance
    if (persona.role && docText.includes(persona.role.toLowerCase())) {
      reasons.push(`directly relates to your role as ${persona.role}`);
    }
    
    if (persona.industry && docText.includes(persona.industry.toLowerCase())) {
      reasons.push(`affects your industry: ${persona.industry}`);
    }
    
    // Default reason based on similarity score
    if (reasons.length === 0) {
      if (similarity > 0.9) {
        reasons.push('highly semantically similar to your profile');
      } else if (similarity > 0.8) {
        reasons.push('very relevant to your interests and background');
      } else {
        reasons.push('semantically relevant to your profile');
      }
    }
    
    return reasons.join(', ');
  };

  // Function to call GPT-OSS:20b for reasoning
  const getGPTReasoning = async (persona: PersonaData, document: DocumentData, signal?: AbortSignal): Promise<GPTReasoningResult> => {
    // Get GPT configuration from localStorage
    const gptHost = localStorage.getItem('gptHost') || '10.0.4.52';
    const gptPort = localStorage.getItem('gptPort') || '11434';
    const gptModel = localStorage.getItem('gptModel') || 'gpt-oss:20b';
    
    const url = `http://${gptHost}:${gptPort}/api/generate`;
    
    // Prepare persona text (non-embedded version)
    const personaText = preparePersonaForEmbedding(persona);
    
    // Prepare document text
    const documentText = `${document.title}\n\n${document.text || ''}`.trim();
    
    const prompt = `You are an AI assistant analyzing government document relevance with a focus on potential impacts and creative connections.

PERSONA PROFILE:
${personaText}

DOCUMENT TO ANALYZE:
Title: ${document.title}
Agency: ${document.agency_id || 'Unknown'}
Type: ${document.document_type || 'Unknown'}
Content: ${documentText}

TASK: Analyze how this legislation or policy could potentially impact the persona above. Be CREATIVE and THOUGHTFUL about:
1. DIRECT impacts on the persona's interests, work, or life
2. SECONDARY effects (how changes might ripple through their community, industry, or field)
3. TERTIARY effects (broader societal changes that could eventually affect them)
4. POTENTIAL opportunities or challenges that might emerge
5. CREATIVE connections between seemingly unrelated policy areas

SCORING GUIDELINES (be GENEROUS with relevance):
- Score 6-10 for documents with ANY potential connection, even indirect ones
- Consider how policy changes create ripple effects over time
- Think about how regulatory changes in one area affect other sectors
- Consider how funding changes might impact related programs
- Look for opportunities for civic engagement or professional development
- Even tangential connections deserve consideration if they could have future impact

IMPORTANT: Use the special thought process format. Start your thought process with "THOUGHT_PROCESS:" and end with "END_THOUGHT_PROCESS:". This allows extraction of your reasoning steps.

RESPONSE FORMAT:
Relevance Score: [1-10]
Reasoning: [Your explanation focusing on potential impacts and creative connections]
THOUGHT_PROCESS:
[Your step-by-step analysis including direct, secondary, and tertiary effects]
END_THOUGHT_PROCESS:`;

    const payload = {
      model: gptModel,
      prompt: prompt,
      stream: false,
      options: {
        temperature: 0.7,
        top_p: 0.9
      }
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: signal
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    const responseText = result.response || '';

    // Parse the response
    const scoreMatch = responseText.match(/Relevance Score:\s*(\d+)/i);
    const reasoningMatch = responseText.match(/Reasoning:\s*([^]*?)(?=THOUGHT_PROCESS:|$)/i);
    const thoughtProcessMatch = responseText.match(/THOUGHT_PROCESS:\s*([^]*?)END_THOUGHT_PROCESS:/i);

    const relevanceScore = scoreMatch ? parseInt(scoreMatch[1]) : 5;
    const reasoning = reasoningMatch ? reasoningMatch[1].trim() : 'No reasoning provided';
    const thoughtProcess = thoughtProcessMatch ? thoughtProcessMatch[1].trim() : 'No thought process provided';

    return {
      relevanceScore: Math.max(1, Math.min(10, relevanceScore)), // Clamp between 1-10
      reasoning: reasoning,
      thoughtProcess: thoughtProcess
    };
  };



  // Comment drafting functions
  const handleStartComment = (documentId: string, documentTitle: string) => {
    setSelectedDocument({ id: documentId, title: documentTitle });
    setShowCommentDrafting(true);
  };

  const handleCloseCommentDrafting = () => {
    setShowCommentDrafting(false);
    setSelectedDocument(null);
  };

  const handleCommentSubmitted = (_commentId: string) => {
    // Comment submitted successfully
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
          Semantic matching between your persona and government documents
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
                background: persona ? (persona.embedding ? '#4CAF50' : '#FFA726') : '#FF6B6B' 
              }} />
              <span style={{ fontSize: '14px', color: '#B8B8B8' }}>
                Persona: {persona ? `${persona.name || 'Unnamed'} (${persona.embedding ? 'Embedded' : 'Not Embedded'})` : 'Not found'}
              </span>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ 
                width: 8, 
                height: 8, 
                borderRadius: '50%', 
                background: documents.length > 0 ? '#4CAF50' : '#FF6B6B' 
              }} />
              <span style={{ fontSize: '14px', color: '#B8B8B8' }}>
                Documents: {documents.length} total, {documents.filter(d => d.embedding && d.embedding.length > 0).length} with embeddings
              </span>
            </div>
            
            {matchedDocuments.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ 
                  width: 8, 
                  height: 8, 
                  borderRadius: '50%', 
                  background: '#4CAF50' 
                }} />
                <span style={{ fontSize: '14px', color: '#B8B8B8' }}>
                  Matches: {matchedDocuments.length} found
                </span>
                <button
                  onClick={clearSavedMatches}
                  style={{
                    background: '#6B2C2C',
                    color: '#FAFAFA',
                    border: '1px solid #444',
                    borderRadius: 4,
                    padding: '4px 8px',
                    fontSize: '12px',
                    cursor: 'pointer',
                    marginLeft: 8
                  }}
                >
                  Clear Saved
                </button>
              </div>
            )}
          </div>

          {error && (
            <div style={{ marginTop: 16, color: '#FF6B6B', fontSize: '14px' }}>
              ❌ Error: {error}
            </div>
          )}


          {/* Action Buttons */}
          <div style={{ marginTop: 16, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            
            
              <button
              onClick={embedAllDocuments}
              disabled={isEmbeddingDocuments || documents.length === 0}
                style={{
                background: (isEmbeddingDocuments || documents.length === 0) ? '#444' : '#2A3C4A',
                  color: '#FAFAFA',
                  border: '1px solid #555',
                  borderRadius: 6,
                  padding: '8px 16px',
                  fontSize: '14px',
                cursor: (isEmbeddingDocuments || documents.length === 0) ? 'not-allowed' : 'pointer',
                opacity: (isEmbeddingDocuments || documents.length === 0) ? 0.5 : 1
                }}
              >
              {isEmbeddingDocuments ? `Embedding... (${documentEmbeddingProgress.current}/${documentEmbeddingProgress.total})` : `Embed Documents (${documents.length})`}
              </button>
            
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <button
                  onClick={findMatches}
                  disabled={isLoading || !persona?.embedding || documents.length === 0}
                  style={{
                    background: (isLoading || !persona?.embedding || documents.length === 0) ? '#444' : '#2A4A2A',
                    color: '#FAFAFA',
                    border: '1px solid #555',
                    borderRadius: 6,
                    padding: '8px 16px',
                    fontSize: '14px',
                    cursor: (isLoading || !persona?.embedding || documents.length === 0) ? 'not-allowed' : 'pointer',
                    opacity: (isLoading || !persona?.embedding || documents.length === 0) ? 0.5 : 1
                  }}
                >
                  {isLoading ? (isGeneratingReasoning ? `Analyzing... (${reasoningProgress.current}/${reasoningProgress.total})` : 'Finding...') : 'Find Matches'}
                </button>
              </div>
            
            
              {isGeneratingReasoning && (
                <button
                  onClick={() => {
                    if (abortController) {
                      abortController.abort();
                    }
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
                  Stop GPT Analysis
                </button>
              )}
          </div>

        </div>


        {/* Matched Documents */}
        {matchedDocuments.length > 0 && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
                Semantically Matched Documents ({matchedDocuments.length})
              </h3>
            </div>
            
            <div style={{ display: 'grid', gap: 16 }}>
              {matchedDocuments.map((match) => (
                <div key={match.document.document_id} style={{
                  background: '#1A1A1A',
                  border: '1px solid #333',
                  borderRadius: 12,
                  padding: 20,
                  position: 'relative'
                }}>
                  {/* Similarity Score Badge */}
                  <div style={{
                    position: 'absolute',
                    top: 16,
                    right: 16,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4
                  }}>
                    <div style={{
                      background: match.similarityScore >= 0.9 ? '#4CAF50' : 
                                 match.similarityScore >= 0.8 ? '#FFA726' : '#FF6B6B',
                      color: '#FAFAFA',
                      padding: '4px 8px',
                      borderRadius: 6,
                      fontSize: '12px',
                      fontWeight: 600,
                      textAlign: 'center'
                    }}>
                      Semantic: {(match.similarityScore * 10).toFixed(1)}/10
                    </div>
                    {match.gptReasoning && (
                      <div style={{
                        background: match.gptReasoning.relevanceScore >= 8 ? '#4CAF50' : 
                                   match.gptReasoning.relevanceScore >= 6 ? '#FFA726' : '#FF6B6B',
                        color: '#FAFAFA',
                        padding: '4px 8px',
                        borderRadius: 6,
                        fontSize: '12px',
                        fontWeight: 600,
                        textAlign: 'center'
                      }}>
                        GPT: {match.gptReasoning.relevanceScore}/10
                      </div>
                    )}
                  </div>

                  <div style={{ marginRight: 80 }}>
                    <h4 style={{ 
                      margin: '0 0 8px 0', 
                      fontSize: '16px', 
                      fontWeight: 600,
                      lineHeight: '1.4'
                    }}>
                      {match.document.title}
                    </h4>
                    
                    <div style={{ display: 'flex', gap: 16, marginBottom: 12, flexWrap: 'wrap' }}>
                      <span style={{ 
                        background: '#2A2A2A', 
                        color: '#B8B8B8', 
                        padding: '4px 8px', 
                        borderRadius: 4, 
                        fontSize: '12px' 
                      }}>
                        {match.document.agency_id}
                      </span>
                      <span style={{ 
                        background: '#2A2A2A', 
                        color: '#B8B8B8', 
                        padding: '4px 8px', 
                        borderRadius: 4, 
                        fontSize: '12px' 
                      }}>
                        {match.document.document_type}
                      </span>
                        <span style={{ 
                        background: '#2A4A2A', 
                        color: '#4CAF50', 
                          padding: '4px 8px', 
                          borderRadius: 4, 
                          fontSize: '12px' 
                        }}>
                        Semantic Match
                        </span>
                    </div>

                    {match.relevanceReason && (
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
                          {match.relevanceReason}
                        </div>
                      </div>
                    )}

                    {match.gptReasoning && (
                      <div style={{ 
                        background: '#2A2A2A', 
                        padding: 12, 
                        borderRadius: 8, 
                        marginBottom: 12,
                        borderLeft: '3px solid #FFA726'
                      }}>
                        <div style={{ fontSize: '12px', color: '#FFA726', fontWeight: 600, marginBottom: 4 }}>
                          GPT Analysis (Score: {match.gptReasoning.relevanceScore}/10):
                        </div>
                        <div style={{ fontSize: '14px', color: '#B8B8B8', marginBottom: 8 }}>
                          {match.gptReasoning.reasoning}
                        </div>
                        <details style={{ fontSize: '12px', color: '#888' }}>
                          <summary style={{ cursor: 'pointer', color: '#FFA726', fontWeight: 600 }}>
                            View Thought Process
                          </summary>
                          <div style={{ 
                            marginTop: 8, 
                            padding: 8, 
                            background: '#1A1A1A', 
                            borderRadius: 4,
                            whiteSpace: 'pre-wrap',
                            fontFamily: 'monospace',
                            fontSize: '11px',
                            lineHeight: '1.4'
                          }}>
                            {match.gptReasoning.thoughtProcess}
                          </div>
                        </details>
                      </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                      <div style={{ fontSize: '14px', color: '#B8B8B8' }}>
                        Document ID: {match.document.document_id}
                      </div>
                      
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          onClick={() => handleStartComment(match.document.document_id, match.document.title)}
                          style={{
                            background: '#4CAF50',
                            color: '#FAFAFA',
                            border: 'none',
                            padding: '8px 16px',
                            borderRadius: 6,
                            fontSize: '14px',
                            fontWeight: 500,
                            cursor: 'pointer'
                          }}
                        >
                          Draft Comment
                        </button>
                        {match.document.web_comment_link && (
                          <a 
                            href={match.document.web_comment_link} 
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
                            External Comment
                          </a>
                        )}
                        {match.document.web_document_link && (
                          <a 
                            href={match.document.web_document_link} 
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
                        )}
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
              Set up your persona in the "Profile" section. Embeddings are generated automatically when you save.
            </p>
          </div>
        )}

        {persona && !persona.embedding && (
          <div style={{ 
            background: '#1A1A1A', 
            border: '1px solid #333', 
            borderRadius: 12, 
            padding: 24,
            textAlign: 'center'
          }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: 600 }}>Generate Persona Embedding</h3>
            <p style={{ color: '#B8B8B8', fontSize: '14px', margin: 0 }}>
              Go to the Profile section and save your persona to generate an embedding automatically.
            </p>
          </div>
        )}

        {persona && persona.embedding && documents.length === 0 && (
          <div style={{ 
            background: '#1A1A1A', 
            border: '1px solid #333', 
            borderRadius: 12, 
            padding: 24,
            textAlign: 'center'
          }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: 600 }}>No Documents with Embeddings</h3>
            <p style={{ color: '#B8B8B8', fontSize: '14px', margin: 0 }}>
              Upload documents with embeddings to the database to perform semantic matching.
            </p>
          </div>
        )}
      </div>
      
      {/* Comment Drafting Modal */}
      {showCommentDrafting && selectedDocument && persona && (
        <CommentDrafting
          documentId={selectedDocument.id}
          documentTitle={selectedDocument.title}
          personaId={persona.name || 'default'}
          onClose={handleCloseCommentDrafting}
          onCommentSubmitted={handleCommentSubmitted}
        />
      )}
    </div>
  );
}