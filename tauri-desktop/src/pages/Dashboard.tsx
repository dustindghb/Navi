import { useState, useEffect } from 'react';
import { CommentDrafting } from '../components/CommentDrafting';
import { fetchCommentsFromRegulationsGov, deriveDocketId, getDocumentCommentCount } from '../utils/regulationsGovApi';

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
  chunk_embeddings?: number[][];
  posted_date?: string;
  comment_end_date?: string;
  created_at?: string;
}

interface GPTReasoningResult {
  relevanceScore: number; // 1-10
  shortSummary: string;
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
  
  // Comments viewing state
  const [showComments, setShowComments] = useState(false);
  const [selectedDocumentForComments, setSelectedDocumentForComments] = useState<{id: string, title: string, docket_id?: string} | null>(null);
  const [documentComments, setDocumentComments] = useState<any[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [documentCommentCounts, setDocumentCommentCounts] = useState<{[documentId: string]: number}>({});
  const [isLoadingCommentCounts, setIsLoadingCommentCounts] = useState(false);
  const [enableCommentCounts, setEnableCommentCounts] = useState(true);
  
  // GPT reasoning state
  const [isGeneratingReasoning, setIsGeneratingReasoning] = useState(false);
  const [reasoningProgress, setReasoningProgress] = useState({ current: 0, total: 0 });
  const [shouldStopReasoning, setShouldStopReasoning] = useState(false);
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  
  // Top K documents for semantic matching
  const [topK, setTopK] = useState(20);
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


  // Utility function to clean text by removing non-ASCII characters
  const cleanText = (text: string): string => {
    // Remove non-ASCII characters and normalize whitespace
    return text
      .replace(/[^\x00-\x7F]/g, '') // Remove non-ASCII characters
      .replace(/\s+/g, ' ') // Normalize whitespace (multiple spaces to single space)
      .trim(); // Remove leading/trailing whitespace
  };

  // Utility function to chunk text into smaller pieces based on word count
  const chunkText = (text: string, maxWords: number = 1200): string[] => {
    // Clean the text first
    const cleanedText = cleanText(text);
    
    // Split text into words
    const words = cleanedText.split(/\s+/).filter(word => word.length > 0);
    
    if (words.length <= maxWords) {
      return [cleanedText];
    }
    
    const chunks: string[] = [];
    let currentChunk: string[] = [];
    
    for (const word of words) {
      // If adding this word would exceed the limit, start a new chunk
      if (currentChunk.length >= maxWords && currentChunk.length > 0) {
        chunks.push(currentChunk.join(' '));
        currentChunk = [word];
      } else {
        currentChunk.push(word);
      }
    }
    
    // Add the last chunk if it has content
    if (currentChunk.length > 0) {
      chunks.push(currentChunk.join(' '));
    }
    
    return chunks;
  };

  // Function to embed a single document with chunking
  const embedDocument = async (document: DocumentData): Promise<{embedding: number[], chunk_embeddings: number[][]}> => {
    const documentText = `${document.title}. ${document.text || ''}`.trim();
    
    if (!documentText) {
      throw new Error(`No content available for document ${document.document_id}`);
    }
    
    // Get remote embedding configuration from localStorage (same format as Settings.tsx)
    let remoteEmbeddingHost = '10.0.4.52';
    let remoteEmbeddingPort = '11434';
    let remoteEmbeddingModel = '';
    
    try {
      const saved = localStorage.getItem('navi-remote-embedding-config');
      if (saved) {
        const config = JSON.parse(saved);
        if (config.host) remoteEmbeddingHost = config.host;
        if (config.port) remoteEmbeddingPort = config.port;
        if (config.model) remoteEmbeddingModel = config.model;
      }
    } catch (err) {
      console.error('Error loading remote embedding config:', err);
    }
    
    if (!remoteEmbeddingModel) {
      throw new Error('Remote embedding model not configured. Please set the model in Settings.');
    }
    
    // Use /api/embeddings endpoint for all models
    const url = `http://${remoteEmbeddingHost}:${remoteEmbeddingPort}/api/embeddings`;
    
    // Always chunk documents to avoid truncation issues
    const chunks = chunkText(documentText);
    const chunkEmbeddings: number[][] = [];
    
    console.log(`Embedding document ${document.document_id} with ${chunks.length} chunks`);
    
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      try {
        const chunkPayload = {
          model: remoteEmbeddingModel,
          prompt: chunk
        };

        const chunkResponse = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(chunkPayload)
        });

        if (!chunkResponse.ok) {
          const errorText = await chunkResponse.text();
          if (chunkResponse.status === 0 || chunkResponse.status >= 500) {
            throw new Error(`Cannot connect to embedding model at ${url}. Please check if the model is running.`);
          }
          throw new Error(`HTTP ${chunkResponse.status}: ${errorText}`);
        }

        const chunkResult = await chunkResponse.json();
        
        if (!chunkResult.embedding || !Array.isArray(chunkResult.embedding)) {
          throw new Error('Invalid embedding response format');
        }

        chunkEmbeddings.push(chunkResult.embedding);
        
        // Small delay to avoid overwhelming the embedding service
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`Failed to embed chunk ${i + 1} of document ${document.document_id}:`, error);
        throw error;
      }
    }
    
    // Use the first chunk embedding as the main embedding
    const finalEmbedding = chunkEmbeddings.length > 0 ? chunkEmbeddings[0] : [];
    
    return {
      embedding: finalEmbedding,
      chunk_embeddings: chunkEmbeddings
    };
  };

  // Function to embed all documents
  const embedAllDocuments = async () => {
    if (documents.length === 0) {
      return;
    }

    setIsEmbeddingDocuments(true);
    setDocumentEmbeddingProgress({ current: 0, total: documents.length });
    setError(null);

    try {
      let successCount = 0;
      let errorCount = 0;

      for (let i = 0; i < documents.length; i++) {
        const document = documents[i];
        setDocumentEmbeddingProgress({ current: i + 1, total: documents.length });
        

        try {
          // Generate embedding for this document
          const { embedding, chunk_embeddings } = await embedDocument(document);
          
          // Store the main embedding in the database
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
          
          // Store the chunk embeddings in the database
          const chunkEmbeddingResponse = await fetch('http://localhost:8001/documents/chunk-embeddings', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              document_id: document.document_id,
              chunk_embeddings: chunk_embeddings
            })
          });
          
          if (embeddingResponse.ok && chunkEmbeddingResponse.ok) {
            successCount++;
          } else {
            errorCount++;
          }

        } catch (err) {
          errorCount++;
          console.error(`Error embedding document ${document.document_id}:`, err);
        }

        // Small delay to avoid overwhelming the embedding service
        await new Promise(resolve => setTimeout(resolve, 100));
      }


      // Reload data to get updated embeddings
      await loadData();

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error during embedding';
      setError(errorMessage);
      console.error('Error in document embedding process:', err);
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
            shortSummary: savedMatch.gpt_short_summary || '',
            reasoning: savedMatch.gpt_reasoning,
            thoughtProcess: savedMatch.gpt_thought_process
          }
        }));
        
        setMatchedDocuments(convertedMatches);
        
        // Fetch comment counts for loaded matches
        if (convertedMatches.length > 0) {
          fetchCommentCounts(convertedMatches.map(match => match.document));
        }
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
        gpt_short_summary: match.gptReasoning?.shortSummary || '',
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

  const clearDocumentEmbeddings = async () => {
    try {
      console.log('Clearing document embeddings...');
      const response = await fetch('http://localhost:8001/documents/clear-embeddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      console.log('Clear embeddings response status:', response.status);
      
      if (response.ok) {
        const result = await response.json();
        console.log(`Cleared ${result.cleared_embeddings_count} document embeddings`);
        console.log('Clear embeddings result:', result);
        
        // Reload data to reflect cleared embeddings
        await loadData();
        console.log('Data reloaded after clearing embeddings');
      } else {
        const errorText = await response.text();
        console.error('Failed to clear embeddings:', response.status, errorText);
      }
    } catch (err) {
      console.error('Error clearing document embeddings:', err);
    }
  };

  const findMatches = async () => {
    if (!persona || !persona.embedding || documents.length === 0) {
      setError('Missing persona embedding or documents. Please ensure persona has been embedded and documents are loaded.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const personaEmbedding = persona.embedding;

      // Filter documents that have embeddings (either main embedding or chunk embeddings)
      const documentsWithEmbeddings = documents.filter(doc => 
        (doc.embedding && doc.embedding.length > 0) || 
        (doc.chunk_embeddings && doc.chunk_embeddings.length > 0)
      );
      
      if (documentsWithEmbeddings.length === 0) {
        setError('No documents with embeddings found. Please embed documents first.');
        return;
      }

      // Step 1: Calculate similarities for all documents
      const allSimilarities: {doc: DocumentData, similarity: number}[] = [];

      for (const doc of documentsWithEmbeddings) {
        let bestSimilarity = 0;
        let bestEmbedding: number[] | null = null;
        
        // Try main embedding first
        if (doc.embedding && doc.embedding.length > 0 && doc.embedding.length === personaEmbedding.length) {
          const similarity = calculateCosineSimilarity(personaEmbedding, doc.embedding);
          if (similarity > bestSimilarity) {
            bestSimilarity = similarity;
            bestEmbedding = doc.embedding;
          }
        }
        
        // Try chunk embeddings if available
        if (doc.chunk_embeddings && doc.chunk_embeddings.length > 0) {
          for (const chunkEmbedding of doc.chunk_embeddings) {
            if (chunkEmbedding.length === personaEmbedding.length) {
              const similarity = calculateCosineSimilarity(personaEmbedding, chunkEmbedding);
              if (similarity > bestSimilarity) {
                bestSimilarity = similarity;
                bestEmbedding = chunkEmbedding;
              }
            }
          }
        }
        
        // Skip if no compatible embeddings found
        if (bestEmbedding === null) {
          continue;
        }
        
        allSimilarities.push({doc, similarity: bestSimilarity});
      }

      // Sort by similarity (highest first) and take top K
      allSimilarities.sort((a, b) => b.similarity - a.similarity);
      const topKSimilarities = allSimilarities.slice(0, topK);

      if (topKSimilarities.length === 0) {
        setMatchedDocuments([]);
        setError('No documents with compatible embeddings found.');
        return;
      }

      // Convert to semantic matches
      const semanticMatches: MatchedDocument[] = topKSimilarities.map(({doc, similarity}) => ({
        document: doc,
        similarityScore: similarity,
        relevanceReason: generateRelevanceReason(persona, doc, similarity)
      }));

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
            const newMatch = {
              ...match,
              gptReasoning: gptResult
            };
            finalMatches.push(newMatch);
            
            // Live update: add this match to the displayed matches immediately
            setMatchedDocuments(prevMatches => {
              const updated = [...prevMatches, newMatch];
              // Sort by GPT score (highest first)
              return updated.sort((a, b) => {
                const scoreA = a.gptReasoning?.relevanceScore || 0;
                const scoreB = b.gptReasoning?.relevanceScore || 0;
                return scoreB - scoreA;
              });
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

      // Save matches to database
      if (finalMatches.length > 0) {
        await saveMatchesToDatabase(finalMatches);
        
        // Fetch comment counts for all matched documents
        fetchCommentCounts(finalMatches.map((match: MatchedDocument) => match.document));
      }

      if (finalMatches.length === 0) {
        setError('No relevant documents found');
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
    
    const prompt = `You are an AI assistant analyzing government document relevance with a focus on potential impacts and ripple effects.

PERSONA PROFILE:
${personaText}

DOCUMENT TO ANALYZE:
Title: ${document.title}
Agency: ${document.agency_id || 'Unknown'}
Type: ${document.document_type || 'Unknown'}
Content: ${documentText}

LOCATION FILTERING RULE:
- If this document mentions specific states, regions, or localities that do NOT include the persona's location (${persona.location || 'Unknown'}), automatically score this document 0-2 (irrelevant)
- Only consider documents that either:
  1. Apply to the persona's specific location (${persona.location || 'Unknown'})
  2. Are federal/national in scope and apply everywhere
  3. Don't specify geographic restrictions

TASK: Analyze how this legislation or policy could potentially impact the persona above. Be THOUGHTFUL about:
1. DIRECT impacts on the persona's interests, work, or life
2. SECONDARY effects (how changes might ripple through their community, industry, or field)
3. POTENTIAL opportunities or challenges that might emerge

SCORING GUIDELINES (be GENEROUS with relevance):
- Score 6-10 for documents with ANY potential connection, even indirect ones
- Consider how policy changes create ripple effects over time
- Think about how regulatory changes in one area affect other sectors
- Consider how funding changes might impact related programs
- Look for opportunities for civic engagement or professional development
- Even tangential connections deserve consideration if they could have future impact

RESPONSE FORMAT:
Relevance Score: [1-10]
Short Summary: [One sentence explaining why this document is relevant to the persona]
Reasoning: [Your explanation focusing on potential impacts and ripple effects]`;

    const payload = {
      model: gptModel,
      prompt: prompt,
      stream: false,
      reasoning_level: "low",
      options: {
        temperature: 0.3,
        top_p: 0.8
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
      if (response.status === 0 || response.status >= 500) {
        throw new Error(`Cannot connect to GPT model at ${url}. Please check if the model is running.`);
      }
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    const responseText = result.response || '';

    // Parse the response
    const scoreMatch = responseText.match(/Relevance Score:\s*(\d+)/i);
    const shortSummaryMatch = responseText.match(/Short Summary:\s*([^]*?)(?=Reasoning:|$)/i);
    const reasoningMatch = responseText.match(/Reasoning:\s*([^]*?)$/i);

    const relevanceScore = scoreMatch ? parseInt(scoreMatch[1]) : 5;
    const shortSummary = shortSummaryMatch ? shortSummaryMatch[1].trim() : 'No summary provided';
    const reasoning = reasoningMatch ? reasoningMatch[1].trim() : 'No reasoning provided';

    return {
      relevanceScore: Math.max(1, Math.min(10, relevanceScore)), // Clamp between 1-10
      shortSummary: shortSummary,
      reasoning: reasoning,
      thoughtProcess: '' // No longer used
    };
  };





  // Function to fetch comment counts for all matched documents (optimized for performance)
  const fetchCommentCounts = async (documents: any[]) => {
    try {
      // Check if comment counts are enabled
      if (!enableCommentCounts) {
        console.log('Comment counts disabled, skipping fetch');
        return;
      }
      
      const savedConfig = localStorage.getItem('navi-regulations-api-config');
      if (!savedConfig) {
        console.log('No regulations.gov API key configured, skipping comment count fetch');
        return;
      }
      
      const config = JSON.parse(savedConfig);
      const apiKey = config.apiKey;
      if (!apiKey) {
        console.log('No regulations.gov API key found, skipping comment count fetch');
        return;
      }

      console.log('Fetching comment counts for', documents.length, 'documents (optimized)');
      setIsLoadingCommentCounts(true);
      
      // Process documents in batches to avoid overwhelming the API
      const batchSize = 3; // Process 3 documents at a time
      const delayBetweenBatches = 1000; // 1 second delay between batches
      
      for (let i = 0; i < documents.length; i += batchSize) {
        const batch = documents.slice(i, i + batchSize);
        
        // Process batch concurrently
        const batchPromises = batch.map(async (doc) => {
          try {
            const count = await getDocumentCommentCount(doc.document_id, apiKey);
            return { documentId: doc.document_id, count };
          } catch (error) {
            console.warn(`Failed to get comment count for document ${doc.document_id}:`, error);
            return { documentId: doc.document_id, count: 0 };
          }
        });
        
        // Wait for batch to complete
        const batchResults = await Promise.all(batchPromises);
        
        // Update state with batch results (progressive loading)
        setDocumentCommentCounts(prevCounts => {
          const newCounts = { ...prevCounts };
          batchResults.forEach(result => {
            newCounts[result.documentId] = result.count;
          });
          return newCounts;
        });
        
        // Add delay between batches (except for the last batch)
        if (i + batchSize < documents.length) {
          await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
        }
      }
      
      console.log('Comment counts fetching completed');
      
    } catch (error) {
      console.error('Error fetching comment counts:', error);
    } finally {
      setIsLoadingCommentCounts(false);
    }
  };

  // Function to handle viewing comments
  const handleViewComments = async (documentId: string, documentTitle: string, docketId?: string) => {
    // If no docket_id provided, try to derive it from document_id
    const effectiveDocketId = docketId || deriveDocketId(documentId);
    
    console.log('View Comments clicked:', {
      documentId,
      originalDocketId: docketId,
      derivedDocketId: effectiveDocketId
    });
    
    if (!effectiveDocketId) {
      setError('No docket ID available for this document. The document may not have public comments or the docket ID cannot be determined from the document ID.');
      return;
    }

    setSelectedDocumentForComments({ id: documentId, title: documentTitle, docket_id: effectiveDocketId });
    setLoadingComments(true);
    setShowComments(true);
    setDocumentComments([]);
    setError(null); // Clear any previous errors

    try {
      const comments = await fetchCommentsFromRegulationsGov(effectiveDocketId, documentId);
      setDocumentComments(comments);
    } catch (error) {
      console.error('Error loading comments:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to load comments from regulations.gov';
      setError(errorMessage);
    } finally {
      setLoadingComments(false);
    }
  };

  const handleCloseComments = () => {
    setShowComments(false);
    setSelectedDocumentForComments(null);
    setDocumentComments([]);
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
                Documents: {documents.length} total, {documents.filter(d => (d.embedding && d.embedding.length > 0) || (d.chunk_embeddings && d.chunk_embeddings.length > 0)).length} with embeddings
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


          {/* Top K Input */}
          <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <label style={{ fontSize: '14px', color: '#B8B8B8', fontWeight: 500 }}>
              Top K Documents:
            </label>
            <input
              type="number"
              value={topK}
              onChange={(e) => setTopK(Math.max(1, Math.min(100, parseInt(e.target.value) || 20)))}
              min="1"
              max="100"
              style={{
                background: '#2A2A2A',
                border: '1px solid #444',
                borderRadius: 4,
                padding: '6px 8px',
                color: '#FAFAFA',
                fontSize: '14px',
                width: '80px'
              }}
            />
          </div>

          {/* Action Buttons */}
          <div style={{ marginTop: 16, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            
            
              <button
              onClick={async () => {
                // Clear embeddings first, then embed documents
                await clearDocumentEmbeddings();
                await embedAllDocuments();
              }}
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
              {isEmbeddingDocuments ? `Embedding... (${documentEmbeddingProgress.current}/${documentEmbeddingProgress.total})` : `Find Matches (${documents.length})`}
              </button>
              
              {/* Comment Count Toggle */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="checkbox"
                  id="enableCommentCounts"
                  checked={enableCommentCounts}
                  onChange={(e) => setEnableCommentCounts(e.target.checked)}
                  style={{ margin: 0 }}
                />
                <label htmlFor="enableCommentCounts" style={{ 
                  fontSize: '12px', 
                  color: '#B8B8B8', 
                  cursor: 'pointer',
                  userSelect: 'none'
                }}>
                  Show comment counts
                </label>
              </div>
            
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
                  {isLoading ? (isGeneratingReasoning ? `Analyzing... (${reasoningProgress.current}/${reasoningProgress.total})` : 'Finding...') : `Analyze Top ${topK} Matches`}
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
                  Stop Analysis
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
              {matchedDocuments.map((match) => {
                // Debug: Log document structure to see what fields are available
                console.log('Document fields for', match.document.title, ':', Object.keys(match.document));
                return (
                <div key={match.document.document_id} style={{
                  background: '#1A1A1A',
                  border: '1px solid #333',
                  borderRadius: 12,
                  padding: 20,
                  position: 'relative'
                }}>
                  {/* GPT Score Badge */}
                  {match.gptReasoning && (
                    <div style={{
                      position: 'absolute',
                      top: 16,
                      right: 16,
                      background: match.gptReasoning.relevanceScore >= 8 ? '#4CAF50' : 
                                 match.gptReasoning.relevanceScore >= 6 ? '#FFA726' : '#FF6B6B',
                      color: '#FAFAFA',
                      padding: '4px 8px',
                      borderRadius: 6,
                      fontSize: '12px',
                      fontWeight: 600,
                      textAlign: 'center'
                    }}>
                      {match.gptReasoning.relevanceScore}/10
                    </div>
                  )}

                  <div style={{ marginRight: 60 }}>
                    <h4 style={{ 
                      margin: '0 0 8px 0', 
                      fontSize: '16px', 
                      fontWeight: 600,
                      lineHeight: '1.4'
                    }}>
                      {match.document.title}
                    </h4>
                    
                    {/* Comment Count Badge */}
                    {documentCommentCounts[match.document.document_id] !== undefined ? (
                      <div style={{
                        display: 'inline-block',
                        background: documentCommentCounts[match.document.document_id] > 0 ? '#3C362A' : '#2A2A2A',
                        color: documentCommentCounts[match.document.document_id] > 0 ? '#FAFAFA' : '#666',
                        padding: '2px 8px',
                        borderRadius: 4,
                        fontSize: '11px',
                        fontWeight: 500,
                        marginBottom: 8,
                        border: documentCommentCounts[match.document.document_id] > 0 ? '1px solid #5D4E37' : '1px solid #333'
                      }}>
                        {documentCommentCounts[match.document.document_id]} comment{documentCommentCounts[match.document.document_id] !== 1 ? 's' : ''}
                      </div>
                    ) : isLoadingCommentCounts ? (
                      <div style={{
                        display: 'inline-block',
                        background: '#2A2A2A',
                        color: '#666',
                        padding: '2px 8px',
                        borderRadius: 4,
                        fontSize: '11px',
                        fontWeight: 500,
                        marginBottom: 8,
                        border: '1px solid #333'
                      }}>
                        Loading...
                      </div>
                    ) : null}
                    
                    {match.gptReasoning?.shortSummary && (
                      <p style={{ 
                        margin: '0 0 12px 0', 
                        fontSize: '14px', 
                        color: '#B8B8B8',
                        lineHeight: '1.4',
                        fontStyle: 'italic'
                      }}>
                        {match.gptReasoning.shortSummary}
                      </p>
                    )}
                    
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
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
                        See More
                      </button>
                      <button
                        onClick={() => handleViewComments(match.document.document_id, match.document.title, match.document.docket_id)}
                        style={{
                          background: '#3C362A',
                          color: '#FAFAFA',
                          border: 'none',
                          padding: '8px 16px',
                          borderRadius: 6,
                          fontSize: '14px',
                          fontWeight: 500,
                          cursor: 'pointer'
                        }}
                        title="View public comments for this document (docket ID will be derived from document ID)"
                      >
                        View Comments
                      </button>
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
                          View Document
                        </a>
                      )}
                    </div>
                  </div>
                </div>
                );
              })}
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

      {/* Comments Viewing Modal */}
      {showComments && selectedDocumentForComments && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: 20
        }}>
          <div style={{
            background: '#1A1A1A',
            border: '1px solid #333',
            borderRadius: 12,
            width: '100%',
            maxWidth: '800px',
            height: '80vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            {/* Header */}
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid #333',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexShrink: 0
            }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 600 }}>
                  Public Comments
                </h2>
                <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#B8B8B8' }}>
                  {selectedDocumentForComments.title}
                </p>
              </div>
              <button
                onClick={handleCloseComments}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#B8B8B8',
                  fontSize: '24px',
                  cursor: 'pointer',
                  padding: '4px'
                }}
              >
                ×
              </button>
            </div>

            {/* Content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
              {loadingComments ? (
                <div style={{ textAlign: 'center', color: '#B8B8B8', fontSize: '14px' }}>
                  Loading comments from regulations.gov...
                </div>
              ) : documentComments.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {documentComments.map((comment, index) => (
                    <div key={index} style={{
                      background: '#2A2A2A',
                      border: '1px solid #444',
                      borderRadius: 8,
                      padding: 16
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <span style={{ fontSize: '12px', color: '#4CAF50', fontWeight: 600 }}>
                          Comment #{index + 1}
                        </span>
                        {(comment.attributes?.postedDate || comment.attributes?.datePosted) && (
                          <span style={{ fontSize: '12px', color: '#666' }}>
                            {new Date(comment.attributes.postedDate || comment.attributes.datePosted).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '14px', color: '#FAFAFA', lineHeight: '1.5' }}>
                        {comment.attributes?.comment || comment.attributes?.commentText || 'No comment text available'}
                      </div>
                      {(comment.attributes?.submitterName || comment.attributes?.organizationName) && (
                        <div style={{ fontSize: '12px', color: '#B8B8B8', marginTop: 8, fontStyle: 'italic' }}>
                          — {comment.attributes.submitterName || comment.attributes.organizationName}
                        </div>
                      )}
                    </div>
                  ))}
                  {documentComments.length === 30 && (
                    <div style={{
                      background: '#3C362A',
                      border: '1px solid #5D4E37',
                      borderRadius: 8,
                      padding: 12,
                      textAlign: 'center',
                      fontSize: '12px',
                      color: '#B8B8B8'
                    }}>
                      Showing 30 most recent comments. This document may have more comments available.
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ textAlign: 'center', color: '#B8B8B8', fontSize: '14px' }}>
                  No public comments found for this document.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}