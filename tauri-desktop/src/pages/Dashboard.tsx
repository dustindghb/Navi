import { useState, useEffect } from 'react';
import { fetchCommentsFromRegulationsGov, deriveDocketId, getDocumentCommentCount } from '../utils/regulationsGovApi';
import {
  Card,
  CardContent,
  Typography,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  CircularProgress,
  Alert,
  AlertTitle,
  TextField
} from '@mui/material';
import {
  Assessment as AssessmentIcon,
  Lightbulb as LightbulbIcon,
  Group as GroupIcon,
  Assignment as AssignmentIcon,
  Mood as MoodIcon,
  FiberManualRecord as FiberManualRecordIcon
} from '@mui/icons-material';

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
  
  // Document analysis state
  const [documentAnalysis, setDocumentAnalysis] = useState<DocumentAnalysisResult | null>(null);
  const [isAnalyzingDocument, setIsAnalyzingDocument] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState({ current: 0, total: 0 });
  const [documentAnalysisError, setDocumentAnalysisError] = useState<string | null>(null);
  
  // Comments viewing state
  const [showComments, setShowComments] = useState(false);
  const [selectedDocumentForComments, setSelectedDocumentForComments] = useState<{id: string, title: string, docket_id?: string} | null>(null);
  const [documentComments, setDocumentComments] = useState<any[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [documentCommentCounts, setDocumentCommentCounts] = useState<{[documentId: string]: number}>({});
  const [isLoadingCommentCounts, setIsLoadingCommentCounts] = useState(false);
  
  // Comment analysis state
  const [commentAnalysis, setCommentAnalysis] = useState<any>(null);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  
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

  // Utility function to chunk text for document analysis (2k words per chunk)
  const chunkTextForAnalysis = (text: string, maxWords: number = 2000): string[] => {
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

  // Interface for document analysis results
  interface DocumentAnalysisResult {
    analysis: string;
    chunkSummaries: string[];
    totalChunks: number;
  }

  // Function to analyze a single chunk for summary with retry logic
  const analyzeChunk = async (chunk: string, chunkIndex: number, totalChunks: number, signal?: AbortSignal, maxRetries: number = 3): Promise<string> => {
    // Get GPT configuration from localStorage
    const gptHost = localStorage.getItem('gptHost') || '10.0.4.52';
    const gptPort = localStorage.getItem('gptPort') || '11434';
    const gptModel = localStorage.getItem('gptModel') || 'gpt-oss:20b';
    
    const url = `http://${gptHost}:${gptPort}/api/generate`;
    
    const prompt = `You are an AI assistant tasked with summarizing a chunk of a government document.

CHUNK ${chunkIndex + 1} of ${totalChunks}:
${chunk}

TASK: Provide a concise but comprehensive summary of this chunk. Focus on:
1. Key regulatory requirements or proposals
2. Important deadlines or dates
3. Specific impacts or changes mentioned
4. Stakeholders or groups affected
5. Any notable provisions or exceptions

Keep the summary focused and factual. This will be combined with other chunk summaries to create a comprehensive document overview.

RESPONSE FORMAT: Provide only the summary text, no additional formatting or labels.`;

    const payload = {
      model: gptModel,
      prompt: prompt,
      stream: false,
      reasoning_level: "low",
      options: {
        temperature: 0.2,
        top_p: 0.8
      }
    };

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
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
          if (response.status === 500) {
            console.warn(`Chunk ${chunkIndex + 1} attempt ${attempt} failed with 500 error: ${errorText}`);
            if (attempt < maxRetries) {
              // Wait before retrying (exponential backoff)
              await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
              continue;
            }
          }
          if (response.status === 0 || response.status >= 500) {
            throw new Error(`Cannot connect to GPT model at ${url}. Please check if the model is running.`);
          }
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        const result = await response.json();
        return result.response || 'No summary generated';
      } catch (error) {
        console.warn(`Chunk ${chunkIndex + 1} attempt ${attempt} failed:`, error);
        if (attempt === maxRetries) {
          throw error;
        }
        // Wait before retrying (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
    
    throw new Error(`Failed to analyze chunk ${chunkIndex + 1} after ${maxRetries} attempts`);
  };

  // Function to perform comprehensive document analysis
  const analyzeDocument = async (document: DocumentData, persona: PersonaData, signal?: AbortSignal): Promise<DocumentAnalysisResult> => {
    // Get GPT configuration from localStorage
    const gptHost = localStorage.getItem('gptHost') || '10.0.4.52';
    const gptPort = localStorage.getItem('gptPort') || '11434';
    const gptModel = localStorage.getItem('gptModel') || 'gpt-oss:20b';
    
    const url = `http://${gptHost}:${gptPort}/api/generate`;
    
    // Prepare document text
    const documentText = `${document.title}\n\n${document.text || ''}`.trim();
    
    if (!documentText) {
      throw new Error('No document content available for analysis');
    }
    
    // Chunk the document
    const chunks = chunkTextForAnalysis(documentText, 2000);
    console.log(`Analyzing document with ${chunks.length} chunks`);
    
    // Set initial progress
    setAnalysisProgress({ current: 0, total: chunks.length + 1 }); // +1 for final analysis
    
    // Analyze each chunk
    const chunkSummaries: string[] = [];
    for (let i = 0; i < chunks.length; i++) {
      setAnalysisProgress({ current: i + 1, total: chunks.length + 1 });
      
      try {
        const chunkSummary = await analyzeChunk(chunks[i], i, chunks.length, signal);
        chunkSummaries.push(chunkSummary);
      } catch (error) {
        console.error(`Failed to analyze chunk ${i + 1}:`, error);
        // Add a placeholder summary for failed chunks
        chunkSummaries.push(`[Chunk ${i + 1} analysis failed - content may be incomplete]`);
      }
      
      // Small delay to avoid overwhelming the service
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // Combine chunk summaries
    const combinedSummary = chunkSummaries.join('\n\n');
    
    // Update progress for final analysis
    setAnalysisProgress({ current: chunks.length + 1, total: chunks.length + 1 });
    
    // Prepare persona text
    const personaText = preparePersonaForEmbedding(persona);
    
    // Perform final analysis
    const finalPrompt = `You are an AI assistant providing comprehensive analysis of a government document.

PERSONA PROFILE:
${personaText}

DOCUMENT INFORMATION:
Title: ${document.title}
Agency: ${document.agency_id || 'Unknown'}
Type: ${document.document_type || 'Unknown'}

COMPREHENSIVE DOCUMENT SUMMARY (from chunk analysis):
${combinedSummary}

TASK: Based on the comprehensive summary above, provide a detailed analysis that includes:

1. Executive Summary: A clear, concise overview of what this document is about and its main provisions
2. Relevancy Analysis: How this document relates to the persona's interests, role, industry, and location. Consider direct and indirect impacts
3. Chain of Thought Reasoning: Your step-by-step reasoning process for determining relevancy, including what factors you considered and why
4. Actionable Steps: Specific, concrete actions the persona should consider taking based on this document. Include:
   - Immediate actions (if any deadlines or time-sensitive items)
   - Research or follow-up actions needed
   - Stakeholders to contact or engage with
   - Resources to review or documents to read
   - Opportunities for public comment or participation
   - Professional or personal considerations

WRITING STYLE INSTRUCTIONS:
- Use simple, clear language that is easy to understand
- Avoid jargon, legal terminology, or overly complex sentences
- Write in a conversational, accessible tone
- Break down complex concepts into simple explanations
- Use everyday language that anyone can understand
- Keep sentences short and to the point

IMPORTANT FORMATTING INSTRUCTIONS:
- Use plain text format only
- Do NOT use ASCII tables, boxes, or complex formatting
- Use simple bullet points, numbered lists, or paragraph breaks for structure
- Keep formatting clean and readable in a plain text environment
- Avoid special characters that may not display properly

Provide your analysis in a clear, well-structured format that covers all these aspects.`;

    const payload = {
      model: gptModel,
      prompt: finalPrompt,
      stream: false,
      reasoning_level: "high",
      options: {
        temperature: 0.3,
        top_p: 0.8
      }
    };

    // Retry logic for final analysis
    const maxRetries = 3;
    let responseText = 'No analysis provided';
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
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
          if (response.status === 500) {
            console.warn(`Final analysis attempt ${attempt} failed with 500 error: ${errorText}`);
            if (attempt < maxRetries) {
              // Wait before retrying (exponential backoff)
              await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
              continue;
            }
          }
          if (response.status === 0 || response.status >= 500) {
            throw new Error(`Cannot connect to GPT model at ${url}. Please check if the model is running.`);
          }
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        const result = await response.json();
        responseText = result.response || 'No analysis provided';
        break; // Success, exit retry loop
      } catch (error) {
        console.warn(`Final analysis attempt ${attempt} failed:`, error);
        if (attempt === maxRetries) {
          throw error;
        }
        // Wait before retrying (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
      }
    }

    return {
      analysis: responseText,
      chunkSummaries,
      totalChunks: chunks.length
    };
  };





  // Function to fetch comment counts for all matched documents (optimized for performance)
  const fetchCommentCounts = async (documents: any[]) => {
    try {
      
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
    setLoadingAnalysis(true);
    setShowComments(true);
    setDocumentComments([]);
    setCommentAnalysis(null);
    setError(null);
    setAnalysisError(null);

    try {
      // Fetch comments and analysis in parallel
      const [comments, analysisResult] = await Promise.allSettled([
        fetchCommentsFromRegulationsGov(effectiveDocketId, documentId),
        fetchCommentAnalysis(documentId, documentTitle)
      ]);

      // Handle comments result
      if (comments.status === 'fulfilled') {
        setDocumentComments(comments.value);
      } else {
        console.error('Error loading comments:', comments.reason);
        const errorMessage = comments.reason instanceof Error ? comments.reason.message : 'Failed to load comments from regulations.gov';
        setError(errorMessage);
      }

      // Handle analysis result
      if (analysisResult.status === 'fulfilled') {
        setCommentAnalysis(analysisResult.value);
      } else {
        console.error('Error loading analysis:', analysisResult.reason);
        const errorMessage = analysisResult.reason instanceof Error ? analysisResult.reason.message : 'Failed to load comment analysis';
        setAnalysisError(errorMessage);
      }

    } catch (error) {
      console.error('Error in handleViewComments:', error);
      setError('An unexpected error occurred while loading comments and analysis.');
    } finally {
      setLoadingComments(false);
      setLoadingAnalysis(false);
    }
  };

  const handleCloseComments = () => {
    setShowComments(false);
    setSelectedDocumentForComments(null);
    setDocumentComments([]);
    setCommentAnalysis(null);
    setAnalysisError(null);
  };

  // Function to fetch comment analysis using GPT model directly (like getGPTReasoning)
  const fetchCommentAnalysis = async (documentId: string, documentTitle: string) => {
    try {
      // Get GPT configuration from localStorage (same as getGPTReasoning)
      const gptHost = localStorage.getItem('gptHost') || '10.0.4.52';
      const gptPort = localStorage.getItem('gptPort') || '11434';
      const gptModel = localStorage.getItem('gptModel') || 'gpt-oss:20b';
      
      const url = `http://${gptHost}:${gptPort}/api/generate`;
      
      // First, get the comments from regulations.gov
      const comments = await fetchCommentsFromRegulationsGov(deriveDocketId(documentId) || '', documentId);
      
      if (!comments || comments.length === 0) {
        return {
          summary: "No comments found for this document.",
          key_insights: [],
          common_perspectives: [],
          regulatory_themes: [],
          sentiment_analysis: {
            overall_sentiment: "unknown",
            confidence: 0.0,
            details: "No comments available for analysis"
          },
          total_comments_analyzed: 0,
          confidence_score: 0.0
        };
      }
      
      // Prepare comment text for analysis
      const commentTexts = comments.map((comment, index) => {
        const text = comment.attributes?.comment || comment.attributes?.commentText || '';
        const submitter = comment.attributes?.submitterName || comment.attributes?.organizationName || 'Anonymous';
        return `Comment ${index + 1} (${submitter}): ${text}`;
      }).join('\n\n');
      
      const prompt = `You are an AI assistant specialized in analyzing regulatory comments. Analyze the following public comments on a regulatory document and provide insights.

DOCUMENT INFORMATION:
- Document ID: ${documentId}
- Title: ${documentTitle}
- Total Comments: ${comments.length}

COMMENTS TO ANALYZE:
${commentTexts}

TASK: Analyze these comments and provide a comprehensive analysis including:
1. Key insights and main themes
2. Common perspectives and concerns
3. Regulatory themes (compliance, economic, environmental, safety, etc.)
4. Overall sentiment analysis
5. Stakeholder concerns and recommendations

RESPONSE FORMAT: Provide your analysis in the following JSON format:

{
  "summary": "Executive summary of the comment analysis",
  "key_insights": [
    "Key insight 1",
    "Key insight 2",
    "Key insight 3"
  ],
  "common_perspectives": [
    "Common perspective 1",
    "Common perspective 2"
  ],
  "regulatory_themes": [
    {
      "theme": "compliance_burden",
      "description": "Description of the theme",
      "frequency": "high/medium/low"
    }
  ],
  "sentiment_analysis": {
    "overall_sentiment": "positive/negative/mixed",
    "confidence": 0.85,
    "details": "Detailed sentiment analysis"
  },
  "total_comments_analyzed": ${comments.length},
  "confidence_score": 0.8
}

Focus on providing actionable insights and clear categorization of the comments.`;

      const payload = {
        model: gptModel,
        prompt: prompt,
        stream: false,
        reasoning_level: "high",
        options: {
          temperature: 0.3,
          top_p: 0.8,
          max_tokens: 4000
        }
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
        if (response.status === 0 || response.status >= 500) {
          throw new Error(`Cannot connect to GPT model at ${url}. Please check if the model is running.`);
        }
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      const responseText = result.response || '';
      
      // Try to parse JSON from the response
      let analysis;
      try {
        // Look for JSON in the response
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          analysis = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('No JSON found in response');
        }
      } catch (parseError) {
        // Fallback: create a basic analysis structure
        analysis = {
          summary: responseText.substring(0, 500) + (responseText.length > 500 ? '...' : ''),
          key_insights: ["Analysis completed but response format was not JSON"],
          common_perspectives: ["Response parsing required manual review"],
          regulatory_themes: [],
          sentiment_analysis: {
            overall_sentiment: "unknown",
            confidence: 0.5,
            details: "Response format was not JSON"
          },
          total_comments_analyzed: comments.length,
          confidence_score: 0.5
        };
      }
      
      return analysis;
      
    } catch (error) {
      console.error('Error fetching comment analysis:', error);
      throw error;
    }
  };

  // Comment drafting functions
  const handleStartComment = async (documentId: string, documentTitle: string) => {
    setSelectedDocument({ id: documentId, title: documentTitle });
    setShowCommentDrafting(true);
    setDocumentAnalysis(null);
    setDocumentAnalysisError(null);
    
    // Find the document data
    const document = documents.find(doc => doc.document_id === documentId);
    if (!document || !persona) {
      setDocumentAnalysisError('Document or persona not found');
      return;
    }
    
    // Start document analysis
    setIsAnalyzingDocument(true);
    setAnalysisProgress({ current: 0, total: 0 });
    
    try {
      const analysis = await analyzeDocument(document, persona);
      setDocumentAnalysis(analysis);
    } catch (error) {
      console.error('Error analyzing document:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error during analysis';
      setDocumentAnalysisError(errorMessage);
    } finally {
      setIsAnalyzingDocument(false);
      setAnalysisProgress({ current: 0, total: 0 });
    }
  };

  const handleCloseCommentDrafting = () => {
    setShowCommentDrafting(false);
    setSelectedDocument(null);
    setDocumentAnalysis(null);
    setDocumentAnalysisError(null);
    setIsAnalyzingDocument(false);
    setAnalysisProgress({ current: 0, total: 0 });
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
            <TextField
              label="Top K Documents"
              type="number"
              value={topK}
              onChange={(e) => setTopK(Math.max(1, Math.min(100, parseInt(e.target.value) || 20)))}
              inputProps={{ min: 1, max: 100 }}
              size="small"
              sx={{
                width: '120px',
                '& .MuiOutlinedInput-root': {
                  backgroundColor: '#2A2A2A',
                  '& fieldset': {
                    borderColor: '#444',
                  },
                  '&:hover fieldset': {
                    borderColor: '#666',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#4CAF50',
                  },
                },
                '& .MuiInputLabel-root': {
                  color: '#B8B8B8',
                  '&.Mui-focused': {
                    color: '#4CAF50',
                  },
                },
                '& .MuiOutlinedInput-input': {
                  color: '#FAFAFA',
                },
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
                  {isLoading ? (isGeneratingReasoning ? `Analyzing... (${reasoningProgress.current}/${reasoningProgress.total})` : 'Finding...') : `Top ${topK} Semantic Matches`}
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
                    
                    {/* Document Type and Comment Count Badges */}
                    <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                      {/* Document Type Badge */}
                      {match.document.document_type && (
                        <div style={{
                          display: 'inline-block',
                          background: '#2A4A2A',
                          color: '#FAFAFA',
                          padding: '2px 8px',
                          borderRadius: 4,
                          fontSize: '11px',
                          fontWeight: 500,
                          border: '1px solid #3A5A3A'
                        }}>
                          {match.document.document_type}
                        </div>
                      )}
                      
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
                          border: '1px solid #333'
                        }}>
                          Loading...
                        </div>
                      ) : null}
                    </div>
                    
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
                        Analyze Document
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
      
      {/* Document Analysis Modal */}
      {showCommentDrafting && selectedDocument && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
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
            maxWidth: '1000px',
            maxHeight: '90vh',
            overflow: 'hidden',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column'
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
                  Document Analysis
                </h2>
                <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#B8B8B8' }}>
                  {selectedDocument.title}
                </p>
              </div>
              <button
                onClick={handleCloseCommentDrafting}
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
            <div style={{ 
              flex: 1, 
              overflowY: 'auto', 
              padding: 24 
            }}>
              {isAnalyzingDocument ? (
                <div style={{ textAlign: 'center', color: '#B8B8B8', fontSize: '14px' }}>
                  <CircularProgress size={32} style={{ marginBottom: 16, color: '#4CAF50' }} />
                  <div style={{ marginBottom: 16 }}>Analyzing document with AI...</div>
                  <div style={{ fontSize: '12px', color: '#666' }}>
                    This may take a moment while we process the document in chunks
                  </div>
                  {analysisProgress.total > 0 && (
                    <div style={{ marginTop: 12, fontSize: '12px', color: '#4CAF50' }}>
                      Processing chunk {analysisProgress.current} of {analysisProgress.total}
                    </div>
                  )}
                </div>
              ) : documentAnalysisError ? (
                <Alert severity="error" style={{ marginBottom: 16 }}>
                  <AlertTitle>Analysis Error</AlertTitle>
                  {documentAnalysisError}
                </Alert>
              ) : documentAnalysis ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                  {/* Document Analysis */}
                  <Card style={{ background: '#2A2A2A', border: '1px solid #444' }}>
                    <CardContent>
                      <Typography variant="h6" style={{ marginBottom: 16, color: '#4CAF50', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <AssessmentIcon fontSize="small" />
                        Document Analysis
                      </Typography>
                      <Typography variant="body1" style={{ 
                        color: '#FAFAFA', 
                        lineHeight: '1.6',
                        whiteSpace: 'pre-wrap',
                        fontSize: '14px',
                        maxHeight: '500px',
                        overflowY: 'auto',
                        padding: '16px',
                        background: '#1A1A1A',
                        borderRadius: '8px',
                        border: '1px solid #333'
                      }}>
                        {documentAnalysis.analysis}
                      </Typography>
                    </CardContent>
                  </Card>

                  {/* Analysis Metadata */}
                  <Card style={{ background: '#333', border: '1px solid #555' }}>
                    <CardContent style={{ padding: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="caption" style={{ color: '#B8B8B8' }}>
                          <strong>Document Chunks Analyzed:</strong> {documentAnalysis.totalChunks}
                        </Typography>
                        <Typography variant="caption" style={{ color: '#B8B8B8' }}>
                          <strong>Analysis Method:</strong> Chunked Processing
                        </Typography>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <div style={{ textAlign: 'center', color: '#B8B8B8', fontSize: '14px' }}>
                  <div style={{ marginBottom: 16 }}>Document analysis will appear here once processing is complete.</div>
                  <div style={{ fontSize: '12px', color: '#666' }}>
                    The document is being analyzed in chunks for comprehensive understanding.
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Comments Viewing Modal with Split View */}
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
            maxWidth: '1400px',
            height: '85vh',
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
                  Public Comments & Analysis
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

            {/* Split Content */}
            <div style={{ 
              flex: 1, 
              display: 'flex', 
              overflow: 'hidden',
              borderTop: '1px solid #333'
            }}>
              {/* Left Side - Comments */}
              <div style={{ 
                flex: 1, 
                borderRight: '1px solid #333',
                display: 'flex',
                flexDirection: 'column'
              }}>
                <div style={{
                  padding: '16px 20px',
                  borderBottom: '1px solid #333',
                  background: '#222',
                  fontSize: '16px',
                  fontWeight: 600,
                  color: '#FAFAFA'
                }}>
                  Comments ({documentComments.length})
                </div>
                <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
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

              {/* Right Side - Analysis */}
              <div style={{ 
                flex: 1, 
                display: 'flex',
                flexDirection: 'column'
              }}>
                <div style={{
                  padding: '16px 20px',
                  borderBottom: '1px solid #333',
                  background: '#222',
                  fontSize: '16px',
                  fontWeight: 600,
                  color: '#FAFAFA'
                }}>
                  AI Analysis
                </div>
                <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
                  {loadingAnalysis ? (
                    <div style={{ textAlign: 'center', color: '#B8B8B8', fontSize: '14px' }}>
                      <CircularProgress size={24} style={{ marginBottom: 16, color: '#4CAF50' }} />
                      <div style={{ marginBottom: 16 }}>Analyzing comments with AI...</div>
                      <div style={{ fontSize: '12px', color: '#666' }}>
                        This may take a moment while we process the comments
                      </div>
                    </div>
                  ) : analysisError ? (
                    <Alert severity="error" style={{ marginBottom: 16 }}>
                      <AlertTitle>Analysis Error</AlertTitle>
                      {analysisError}
                    </Alert>
                  ) : commentAnalysis ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                      {/* Executive Summary */}
                      {commentAnalysis.summary && (
                        <Card style={{ background: '#2A2A2A', border: '1px solid #444' }}>
                          <CardContent>
                            <Typography variant="h6" style={{ marginBottom: 12, color: '#4CAF50', display: 'flex', alignItems: 'center', gap: 8 }}>
                              <AssessmentIcon fontSize="small" />
                              Executive Summary
                            </Typography>
                            <Typography variant="body2" style={{ color: '#FAFAFA', lineHeight: '1.5' }}>
                              {commentAnalysis.summary}
                            </Typography>
                          </CardContent>
                        </Card>
                      )}

                      {/* Key Insights */}
                      {commentAnalysis.key_insights && commentAnalysis.key_insights.length > 0 && (
                        <Card style={{ background: '#2A2A2A', border: '1px solid #444' }}>
                          <CardContent>
                            <Typography variant="h6" style={{ marginBottom: 12, color: '#4CAF50', display: 'flex', alignItems: 'center', gap: 8 }}>
                              <LightbulbIcon fontSize="small" />
                              Key Insights
                            </Typography>
                            <List dense>
                              {commentAnalysis.key_insights.map((insight: string, index: number) => (
                                <ListItem key={index} style={{ paddingLeft: 0 }}>
                                  <ListItemIcon>
                                    <FiberManualRecordIcon style={{ fontSize: 8, color: '#4CAF50' }} />
                                  </ListItemIcon>
                                  <ListItemText 
                                    primary={insight}
                                    primaryTypographyProps={{ style: { color: '#FAFAFA', fontSize: '14px' } }}
                                  />
                                </ListItem>
                              ))}
                            </List>
                          </CardContent>
                        </Card>
                      )}

                      {/* Common Perspectives */}
                      {commentAnalysis.common_perspectives && commentAnalysis.common_perspectives.length > 0 && (
                        <Card style={{ background: '#2A2A2A', border: '1px solid #444' }}>
                          <CardContent>
                            <Typography variant="h6" style={{ marginBottom: 12, color: '#4CAF50', display: 'flex', alignItems: 'center', gap: 8 }}>
                              <GroupIcon fontSize="small" />
                              Common Perspectives
                            </Typography>
                            <List dense>
                              {commentAnalysis.common_perspectives.map((perspective: string, index: number) => (
                                <ListItem key={index} style={{ paddingLeft: 0 }}>
                                  <ListItemIcon>
                                    <FiberManualRecordIcon style={{ fontSize: 8, color: '#4CAF50' }} />
                                  </ListItemIcon>
                                  <ListItemText 
                                    primary={perspective}
                                    primaryTypographyProps={{ style: { color: '#FAFAFA', fontSize: '14px' } }}
                                  />
                                </ListItem>
                              ))}
                            </List>
                          </CardContent>
                        </Card>
                      )}

                      {/* Regulatory Themes */}
                      {commentAnalysis.regulatory_themes && commentAnalysis.regulatory_themes.length > 0 && (
                        <Card style={{ background: '#2A2A2A', border: '1px solid #444' }}>
                          <CardContent>
                            <Typography variant="h6" style={{ marginBottom: 12, color: '#4CAF50', display: 'flex', alignItems: 'center', gap: 8 }}>
                              <AssignmentIcon fontSize="small" />
                              Regulatory Themes
                            </Typography>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                              {commentAnalysis.regulatory_themes.map((theme: any, index: number) => (
                                <div
                                  key={index}
                                  style={{
                                    background: '#333',
                                    color: '#FAFAFA',
                                    borderRadius: 16,
                                    padding: '8px 12px',
                                    border: '1px solid #555'
                                  }}
                                >
                                  <div style={{ fontWeight: 600, marginBottom: 2 }}>
                                    {theme.theme?.replace(/_/g, ' ').toUpperCase() || 'Unknown Theme'}
                                  </div>
                                  <div style={{ fontSize: '11px', opacity: 0.8 }}>
                                    {theme.description || 'No description available'}
                                  </div>
                                  {theme.frequency && (
                                    <div style={{ fontSize: '11px', color: '#4CAF50', marginTop: 2 }}>
                                      Frequency: {theme.frequency}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      {/* Sentiment Analysis */}
                      {commentAnalysis.sentiment_analysis && (
                        <Card style={{ background: '#2A2A2A', border: '1px solid #444' }}>
                          <CardContent>
                            <Typography variant="h6" style={{ marginBottom: 12, color: '#4CAF50', display: 'flex', alignItems: 'center', gap: 8 }}>
                              <MoodIcon fontSize="small" />
                              Sentiment Analysis
                            </Typography>
                            <div style={{ fontSize: '14px', color: '#FAFAFA', lineHeight: '1.5' }}>
                              <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                                <Typography variant="body2" style={{ color: '#FAFAFA' }}>
                                  <strong>Overall Sentiment:</strong>
                                </Typography>
                                <Chip 
                                  label={commentAnalysis.sentiment_analysis.overall_sentiment || 'Unknown'}
                                  size="small"
                                  style={{ 
                                    background: commentAnalysis.sentiment_analysis.overall_sentiment === 'positive' ? '#4CAF50' : 
                                               commentAnalysis.sentiment_analysis.overall_sentiment === 'negative' ? '#F44336' : '#FF9800',
                                    color: 'white'
                                  }}
                                />
                              </div>
                              <div style={{ marginBottom: 8 }}>
                                <Typography variant="body2" style={{ color: '#FAFAFA' }}>
                                  <strong>Confidence:</strong> {((commentAnalysis.sentiment_analysis.confidence || 0) * 100).toFixed(1)}%
                                </Typography>
                              </div>
                              {commentAnalysis.sentiment_analysis.details && (
                                <Typography variant="body2" style={{ color: '#B8B8B8', fontSize: '13px' }}>
                                  {commentAnalysis.sentiment_analysis.details}
                                </Typography>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      {/* Analysis Metadata */}
                      <Card style={{ background: '#333', border: '1px solid #555' }}>
                        <CardContent style={{ padding: 12 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="caption" style={{ color: '#B8B8B8' }}>
                              <strong>Comments Analyzed:</strong> {commentAnalysis.total_comments_analyzed || 0}
                            </Typography>
                            <Typography variant="caption" style={{ color: '#B8B8B8' }}>
                              <strong>Analysis Confidence:</strong> {((commentAnalysis.confidence_score || 0) * 100).toFixed(1)}%
                            </Typography>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', color: '#B8B8B8', fontSize: '14px' }}>
                      No analysis available. Analysis will appear here once comments are loaded.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}