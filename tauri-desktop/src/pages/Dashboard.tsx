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
  const [consoleLogs, setConsoleLogs] = useState<string[]>([]);
  const [showLogs, setShowLogs] = useState(false);
  
  // Persona embedding state
  const [isGeneratingEmbedding, setIsGeneratingEmbedding] = useState(false);
  const [embeddingError, setEmbeddingError] = useState<string | null>(null);
  
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
  const [semanticThreshold, setSemanticThreshold] = useState(5.0);

  // Load data on component mount
  useEffect(() => {
    loadData();
  }, []);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const logMessage = `[${timestamp}] ${message}`;
    console.log(logMessage);
    setConsoleLogs(prev => [...prev.slice(-49), logMessage]); // Keep last 50 logs
  };

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

  // Function to generate persona embedding using remote model
  const generatePersonaEmbedding = async (persona: PersonaData): Promise<number[]> => {
    const personaText = preparePersonaForEmbedding(persona);
    
    if (!personaText.trim()) {
      throw new Error('No persona data available for embedding');
    }
    
    // Get remote embedding configuration from localStorage
    const remoteEmbeddingHost = localStorage.getItem('remoteEmbeddingHost') || '10.0.4.52';
    const remoteEmbeddingPort = localStorage.getItem('remoteEmbeddingPort') || '11434';
    const remoteEmbeddingModel = localStorage.getItem('remoteEmbeddingModel') || 'nomic-embed-text:latest';
    
    const url = `http://${remoteEmbeddingHost}:${remoteEmbeddingPort}/api/embeddings`;
      const payload = {
      model: remoteEmbeddingModel,
      prompt: personaText
      };

    addLog('=== GENERATING PERSONA EMBEDDING ===');
    addLog(`Persona text: ${personaText.substring(0, 200)}...`);
      addLog(`URL: ${url}`);
    addLog(`Model: ${remoteEmbeddingModel}`);

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

    addLog(`Generated embedding with ${result.embedding.length} dimensions`);
    return result.embedding;
  };

  // Function to generate and store persona embedding
  const generateAndStorePersonaEmbedding = async () => {
    if (!persona) {
      setEmbeddingError('No persona found. Please configure your persona first.');
      return;
    }

    setIsGeneratingEmbedding(true);
    setEmbeddingError(null);
    addLog('=== GENERATING PERSONA EMBEDDING ===');

    try {
      // Generate the embedding
      const embedding = await generatePersonaEmbedding(persona);
      
      // Store the embedding in the database
      const embeddingResponse = await fetch('http://localhost:8001/personas/embedding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          persona_id: persona.id,
          embedding: embedding
        })
      });
      
      if (embeddingResponse.ok) {
        const embeddingResult = await embeddingResponse.json();
        addLog(`Successfully stored persona embedding in database: ${embeddingResult.embedding_dimensions} dimensions`);
        
        // Reload persona data to get the updated embedding
        await loadData();
        
        addLog('Persona embedding generation and storage complete!');
      } else {
        const errorResult = await embeddingResponse.json();
        throw new Error(`Failed to store embedding: ${errorResult.error || 'Unknown error'}`);
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      addLog(`Error generating persona embedding: ${errorMessage}`);
      setEmbeddingError(errorMessage);
    } finally {
      setIsGeneratingEmbedding(false);
      addLog('=== PERSONA EMBEDDING GENERATION COMPLETE ===');
    }
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
      setEmbeddingError('No documents found to embed.');
      return;
    }

    setIsEmbeddingDocuments(true);
    setEmbeddingError(null);
    setDocumentEmbeddingProgress({ current: 0, total: documents.length });
    addLog('=== EMBEDDING ALL DOCUMENTS ===');

    try {
      let successCount = 0;
      let errorCount = 0;

      for (let i = 0; i < documents.length; i++) {
        const document = documents[i];
        setDocumentEmbeddingProgress({ current: i + 1, total: documents.length });
        
        addLog(`Embedding document ${i + 1}/${documents.length}: ${document.title.substring(0, 50)}...`);

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
            addLog(`✓ Successfully embedded document ${document.document_id} (${embedding.length} dimensions)`);
          } else {
            const errorResult = await embeddingResponse.json();
            addLog(`✗ Failed to store embedding for ${document.document_id}: ${errorResult.error || 'Unknown error'}`);
            errorCount++;
          }

        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'Unknown error';
          addLog(`✗ Error embedding document ${document.document_id}: ${errorMessage}`);
          errorCount++;
        }

        // Small delay to avoid overwhelming the embedding service
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      addLog(`=== DOCUMENT EMBEDDING COMPLETE ===`);
      addLog(`Successfully embedded: ${successCount} documents`);
      addLog(`Errors: ${errorCount} documents`);
      
      if (errorCount > 0) {
        setEmbeddingError(`${errorCount} documents failed to embed. Check console logs for details.`);
      }

      // Reload data to get updated embeddings
      await loadData();

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      addLog(`Error in document embedding process: ${errorMessage}`);
      setEmbeddingError(errorMessage);
    } finally {
      setIsEmbeddingDocuments(false);
      setDocumentEmbeddingProgress({ current: 0, total: 0 });
    }
  };

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    addLog('=== LOADING DASHBOARD DATA ===');
    
    try {
      // Load persona data
      addLog('Loading persona data...');
      const personaResponse = await fetch('http://localhost:8001/personas');
      if (personaResponse.ok) {
        const personas = await personaResponse.json();
        if (personas.length > 0) {
          setPersona(personas[0]);
          addLog(`Loaded persona: ${personas[0].name || 'Unnamed'} (ID: ${personas[0].id})`);
        } else {
          addLog('No persona found in database');
        }
      } else {
        addLog('Failed to load persona data');
      }

      // Load all documents (we'll filter for embeddings in semantic matching)
      addLog('Loading documents...');
      const documentsResponse = await fetch('http://localhost:8001/documents?limit=1000');
      if (documentsResponse.ok) {
        const documentsData = await documentsResponse.json();
        setDocuments(documentsData);
        const documentsWithEmbeddings = documentsData.filter((doc: DocumentData) => 
          doc.embedding && doc.embedding.length > 0
        );
        addLog(`Loaded ${documentsData.length} total documents, ${documentsWithEmbeddings.length} with embeddings`);
      } else {
        addLog('Failed to load documents data');
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      addLog(`Error loading data: ${errorMessage}`);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
      addLog('=== DATA LOADING COMPLETE ===');
    }
  };

  const performSemanticMatching = async () => {
    if (!persona || !persona.embedding || documents.length === 0) {
      setError('Missing persona embedding or documents. Please ensure persona has been embedded and documents are loaded.');
      return;
    }

    setIsLoading(true);
    setError(null);
    const threshold = semanticThreshold / 10; // Convert from 0-10 scale to 0-1 scale
    addLog(`=== PERFORMING SEMANTIC MATCHING (threshold: ${semanticThreshold}/10) ===`);

    try {
      const personaEmbedding = persona.embedding;
      addLog(`Persona embedding dimensions: ${personaEmbedding.length}`);

      // Filter documents that have embeddings
      const documentsWithEmbeddings = documents.filter(doc => 
        doc.embedding && doc.embedding.length > 0
      );
      
      if (documentsWithEmbeddings.length === 0) {
        setError('No documents with embeddings found. Please embed documents first.');
        return;
      }

      addLog(`Found ${documentsWithEmbeddings.length} documents with embeddings`);

      const matches: MatchedDocument[] = [];
      const allSimilarities: {doc: DocumentData, similarity: number}[] = [];

      for (const doc of documentsWithEmbeddings) {
        // Type guard to ensure embedding exists
        if (!doc.embedding || doc.embedding.length === 0) {
          addLog(`Skipping document ${doc.document_id} - no embedding`);
          continue;
        }

        // Check dimension compatibility
        if (doc.embedding.length !== personaEmbedding.length) {
          addLog(`Skipping document ${doc.document_id} - dimension mismatch (${doc.embedding.length} vs ${personaEmbedding.length})`);
          continue;
        }

        // Calculate cosine similarity
        const similarity = calculateCosineSimilarity(personaEmbedding, doc.embedding);
        allSimilarities.push({doc, similarity});
        
        if (similarity >= threshold) { // Threshold for relevance
          matches.push({
            document: doc,
            similarityScore: similarity,
            relevanceReason: generateRelevanceReason(persona, doc, similarity)
          });
        }
      }

      // Sort all similarities to show top scores
      allSimilarities.sort((a, b) => b.similarity - a.similarity);
      addLog(`Top 10 similarity scores: ${allSimilarities.slice(0, 10).map(s => `${s.doc.title.substring(0, 30)}... (${s.similarity.toFixed(4)})`).join(', ')}`);
      addLog(`Similarity range: ${allSimilarities[allSimilarities.length-1]?.similarity.toFixed(4)} to ${allSimilarities[0]?.similarity.toFixed(4)}`);

      // Sort by similarity score (highest first)
      matches.sort((a, b) => b.similarityScore - a.similarityScore);
      
      setMatchedDocuments(matches);
      addLog(`Found ${matches.length} relevant documents above threshold ${semanticThreshold}/10`);
      addLog(`Top matches: ${matches.slice(0, 3).map(m => `${m.document.title} (${(m.similarityScore * 10).toFixed(1)}/10)`).join(', ')}`);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      addLog(`Error in semantic matching: ${errorMessage}`);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
      addLog('=== SEMANTIC MATCHING COMPLETE ===');
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
    
    const prompt = `You are an AI assistant analyzing government document relevance. 

PERSONA PROFILE:
${personaText}

DOCUMENT TO ANALYZE:
Title: ${document.title}
Agency: ${document.agency_id || 'Unknown'}
Type: ${document.document_type || 'Unknown'}
Content: ${documentText}

TASK: Analyze how relevant this document is to the persona above. Provide:
1. A relevance score from 1-10 (10 = highly relevant, 1 = not relevant)
2. Your reasoning for the score
3. Your thought process (step-by-step analysis)

IMPORTANT: Use the special thought process format. Start your thought process with "THOUGHT_PROCESS:" and end with "END_THOUGHT_PROCESS:". This allows extraction of your reasoning steps.

RESPONSE FORMAT:
Relevance Score: [1-10]
Reasoning: [Your explanation]
THOUGHT_PROCESS:
[Your step-by-step analysis]
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

  // Function to generate GPT reasoning for all matched documents
  const generateGPTReasoning = async () => {
    if (matchedDocuments.length === 0) {
      setEmbeddingError('No matched documents found. Please perform semantic matching first.');
      return;
    }

    if (!persona) {
      setEmbeddingError('No persona found. Please configure your persona first.');
      return;
    }

    setIsGeneratingReasoning(true);
    setShouldStopReasoning(false);
    setEmbeddingError(null);
    setReasoningProgress({ current: 0, total: matchedDocuments.length });
    
    // Create abort controller for cancelling requests
    const controller = new AbortController();
    setAbortController(controller);
    
    addLog('=== GENERATING GPT REASONING ===');

    try {
      const updatedMatches = [...matchedDocuments];

      for (let i = 0; i < matchedDocuments.length; i++) {
        // Check if user wants to stop
        if (shouldStopReasoning) {
          addLog('GPT analysis stopped by user');
          break;
        }

        const match = matchedDocuments[i];
        setReasoningProgress({ current: i + 1, total: matchedDocuments.length });
        
        addLog(`Analyzing document ${i + 1}/${matchedDocuments.length}: ${match.document.title.substring(0, 50)}...`);

        try {
          const gptResult = await getGPTReasoning(persona, match.document, controller.signal);
          updatedMatches[i].gptReasoning = gptResult;
          
          addLog(`✓ GPT analysis complete for ${match.document.document_id}: Score ${gptResult.relevanceScore}/10`);
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'Unknown error';
          
          // Check if this was an abort error
          if (err instanceof Error && err.name === 'AbortError') {
            addLog(`⏹️ Analysis cancelled for ${match.document.document_id}`);
            break; // Exit the loop completely
          } else {
            addLog(`✗ Error analyzing ${match.document.document_id}: ${errorMessage}`);
            
            // Add error result
            updatedMatches[i].gptReasoning = {
              relevanceScore: 0,
              reasoning: `Error: ${errorMessage}`,
              thoughtProcess: 'Analysis failed'
            };
          }
        }

        // Small delay to avoid overwhelming the GPT service
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      setMatchedDocuments(updatedMatches);
      addLog(`=== GPT REASONING COMPLETE ===`);
      addLog(`Successfully analyzed ${updatedMatches.filter(m => m.gptReasoning && m.gptReasoning.relevanceScore > 0).length} documents`);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      addLog(`Error in GPT reasoning process: ${errorMessage}`);
      setEmbeddingError(errorMessage);
    } finally {
      setIsGeneratingReasoning(false);
      setReasoningProgress({ current: 0, total: 0 });
      setAbortController(null);
    }
  };


  // Comment drafting functions
  const handleStartComment = (documentId: string, documentTitle: string) => {
    setSelectedDocument({ id: documentId, title: documentTitle });
    setShowCommentDrafting(true);
    addLog(`Starting comment draft for document: ${documentTitle}`);
  };

  const handleCloseCommentDrafting = () => {
    setShowCommentDrafting(false);
    setSelectedDocument(null);
    addLog('Comment drafting closed');
  };

  const handleCommentSubmitted = (commentId: string) => {
    addLog(`Comment submitted successfully: ${commentId}`);
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
                Persona: {persona ? `${persona.name || 'Unnamed'} (${persona.embedding ? 'Embedded' : 'Needs Embedding'})` : 'Not found'}
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
              </div>
            )}
          </div>

          {error && (
            <div style={{ marginTop: 16, color: '#FF6B6B', fontSize: '14px' }}>
              ❌ Error: {error}
            </div>
          )}

          {embeddingError && (
            <div style={{ marginTop: 16, color: '#FF6B6B', fontSize: '14px' }}>
              ❌ Embedding Error: {embeddingError}
            </div>
          )}

          {/* Action Buttons */}
          <div style={{ marginTop: 16, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button
              onClick={loadData}
              disabled={isLoading}
              style={{
                background: isLoading ? '#444' : '#2A2A2A',
                color: '#B8B8B8',
                border: '1px solid #444',
                borderRadius: 6,
                padding: '8px 16px',
                fontSize: '14px',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                opacity: isLoading ? 0.5 : 1
              }}
            >
              {isLoading ? 'Loading...' : 'Refresh Data'}
            </button>
            
              <button
              onClick={generateAndStorePersonaEmbedding}
              disabled={isGeneratingEmbedding || !persona}
                style={{
                background: (isGeneratingEmbedding || !persona) ? '#444' : '#3C362A',
                  color: '#FAFAFA',
                  border: '1px solid #555',
                  borderRadius: 6,
                  padding: '8px 16px',
                  fontSize: '14px',
                cursor: (isGeneratingEmbedding || !persona) ? 'not-allowed' : 'pointer',
                opacity: (isGeneratingEmbedding || !persona) ? 0.5 : 1
                }}
              >
              {isGeneratingEmbedding ? 'Generating...' : 'Generate Persona Embedding'}
              </button>
            
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
                <label style={{ color: '#B8B8B8', fontSize: '14px', whiteSpace: 'nowrap' }}>
                  Min Score:
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  step="0.5"
                  value={semanticThreshold}
                  onChange={(e) => setSemanticThreshold(parseFloat(e.target.value) || 5.0)}
                  style={{
                    width: '60px',
                    padding: '4px 8px',
                    background: '#2A2A2A',
                    color: '#FAFAFA',
                    border: '1px solid #444',
                    borderRadius: 4,
                    fontSize: '14px'
                  }}
                />
                <span style={{ color: '#B8B8B8', fontSize: '14px' }}>/10</span>
                <button
                  onClick={performSemanticMatching}
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
                  {isLoading ? 'Matching...' : 'Semantic Match'}
                </button>
              </div>
            
              <button
              onClick={generateGPTReasoning}
              disabled={isGeneratingReasoning || matchedDocuments.length === 0}
                style={{
                background: (isGeneratingReasoning || matchedDocuments.length === 0) ? '#444' : '#4A2A4A',
                  color: '#FAFAFA',
                border: '1px solid #555',
                  borderRadius: 6,
                  padding: '8px 16px',
                  fontSize: '14px',
                cursor: (isGeneratingReasoning || matchedDocuments.length === 0) ? 'not-allowed' : 'pointer',
                opacity: (isGeneratingReasoning || matchedDocuments.length === 0) ? 0.5 : 1
                }}
              >
              {isGeneratingReasoning ? `GPT Analysis... (${reasoningProgress.current}/${reasoningProgress.total})` : `GPT Reasoning (${matchedDocuments.length} docs)`}
              </button>
            
              {isGeneratingReasoning && (
                <button
                  onClick={() => {
                    if (abortController) {
                      abortController.abort();
                      addLog('⏹️ Stopping GPT analysis...');
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
                  No logs yet.
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
              Set up your persona in the "My Persona" section and generate embeddings in Settings.
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
              Go to Settings to generate an embedding for your persona before performing semantic matching.
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