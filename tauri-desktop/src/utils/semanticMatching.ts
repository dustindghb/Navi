/**
 * Semantic Matching Utilities for Navi
 * 
 * This module provides functions for performing semantic matching between
 * user personas and government documents using vector embeddings.
 */

// Types for semantic matching
export interface PersonaData {
  name?: string;
  role?: string;
  location?: string;
  ageRange?: string;
  age_range?: string;
  employmentStatus?: string;
  employment_status?: string;
  industry?: string;
  policyInterests?: string[];
  policy_interests?: string[];
  preferredAgencies?: string[];
  preferred_agencies?: string[];
  impactLevel?: string[];
  impact_level?: string[];
  additionalContext?: string;
  additional_context?: string;
  _saved_at?: string;
}

export interface DocumentWithEmbedding {
  documentId: string;
  title: string;
  text?: string;  // Changed from content to text
  agencyId?: string;
  documentType?: string;
  embedding: number[];
  webCommentLink?: string;
  webDocumentLink?: string;
  webDocketLink?: string;
  docketId?: string;
  postedDate?: string;
  commentEndDate?: string;
  withinCommentPeriod?: boolean;
}

export interface ScoredDocument extends DocumentWithEmbedding {
  similarityScore: number;
  relevanceReason?: string;
}

/**
 * Calculate cosine similarity between two vectors
 */
export const cosineSimilarity = (vecA: number[], vecB: number[]): number => {
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

/**
 * Prepare persona data for embedding by flattening all fields into a comprehensive text description
 */
export const preparePersonaForEmbedding = (persona: PersonaData): string => {
  if (!persona) return '';
  
  const parts = [];
  
  // Basic demographic information
  if (persona.name) parts.push(`Name: ${persona.name}`);
  if (persona.role) parts.push(`Role: ${persona.role}`);
  if (persona.location) parts.push(`Location: ${persona.location}`);
  if (persona.ageRange || persona.age_range) parts.push(`Age Range: ${persona.ageRange || persona.age_range}`);
  if (persona.employmentStatus || persona.employment_status) parts.push(`Employment Status: ${persona.employmentStatus || persona.employment_status}`);
  if (persona.industry) parts.push(`Industry: ${persona.industry}`);
  
  // Policy interests (handle both frontend and backend field names)
  const policyInterests = persona.policyInterests || persona.policy_interests || [];
  if (policyInterests && policyInterests.length > 0) {
    parts.push(`Policy Interests: ${policyInterests.join(', ')}`);
  }
  
  // Preferred agencies (handle both frontend and backend field names)
  const preferredAgencies = persona.preferredAgencies || persona.preferred_agencies || [];
  if (preferredAgencies && preferredAgencies.length > 0) {
    parts.push(`Preferred Agencies: ${preferredAgencies.join(', ')}`);
  }
  
  // Impact levels (handle both frontend and backend field names)
  const impactLevel = persona.impactLevel || persona.impact_level || [];
  if (impactLevel && impactLevel.length > 0) {
    parts.push(`Impact Level: ${impactLevel.join(', ')}`);
  }
  
  // Additional context (handle both frontend and backend field names)
  const additionalContext = persona.additionalContext || persona.additional_context;
  if (additionalContext) {
    parts.push(`Additional Context: ${additionalContext}`);
  }
  
  // Create a comprehensive persona description for embedding
  const personaDescription = parts.join('\n');
  
  return personaDescription;
};

/**
 * Generate persona embedding using remote embedding model
 */
export const generateRemotePersonaEmbedding = async (
  persona: PersonaData,
  host: string = '10.0.4.52',
  port: string = '11434',
  model: string = 'nomic-embed-text:latest'
): Promise<number[]> => {
  const personaText = preparePersonaForEmbedding(persona);
  
  if (!personaText.trim()) {
    throw new Error('No persona data available for embedding');
  }
  
  const url = `http://${host}:${port}/api/embeddings`;
  const payload = {
    model: model,
    prompt: personaText
  };

  console.log('=== GENERATING REMOTE PERSONA EMBEDDING ===');
  console.log('Persona text:', personaText);
  console.log('URL:', url);
  console.log('Payload:', payload);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP ${response.status}: ${errorText || response.statusText}`);
  }

  const data = await response.json();
  const embedding = data.embedding || data.embeddings?.[0];
  
  if (!embedding || !Array.isArray(embedding)) {
    throw new Error('Invalid embedding response from model');
  }
  
  console.log('Generated remote persona embedding with dimensions:', embedding.length);
  return embedding;
};

/**
 * Generate persona embedding using local embedding model
 */
export const generateLocalPersonaEmbedding = async (
  persona: PersonaData,
  host: string = '127.0.0.1',
  port: string = '11435',
  model: string = 'nomic-embed-text:latest'
): Promise<number[]> => {
  const personaText = preparePersonaForEmbedding(persona);
  
  if (!personaText.trim()) {
    throw new Error('No persona data available for embedding');
  }
  
  const url = `http://${host}:${port}/api/embeddings`;
  const payload = {
    model: model,
    prompt: personaText
  };

  console.log('=== GENERATING LOCAL PERSONA EMBEDDING ===');
  console.log('Persona text:', personaText);
  console.log('URL:', url);
  console.log('Payload:', payload);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP ${response.status}: ${errorText || response.statusText}`);
  }

  const data = await response.json();
  const embedding = data.embedding || data.embeddings?.[0];
  
  if (!embedding || !Array.isArray(embedding)) {
    throw new Error('Invalid embedding response from model');
  }
  
  console.log('Generated local persona embedding with dimensions:', embedding.length);
  return embedding;
};

/**
 * Perform semantic matching between persona and documents
 */
export const performSemanticMatching = async (
  persona: PersonaData,
  documents: DocumentWithEmbedding[],
  options: {
    useRemote?: boolean;
    remoteHost?: string;
    remotePort?: string;
    remoteModel?: string;
    localHost?: string;
    localPort?: string;
    localModel?: string;
    similarityThreshold?: number;
    maxResults?: number;
  } = {}
): Promise<ScoredDocument[]> => {
  const {
    useRemote = true,
    remoteHost = '10.0.4.52',
    remotePort = '11434',
    remoteModel = 'nomic-embed-text:latest',
    localHost = '127.0.0.1',
    localPort = '11435',
    localModel = 'nomic-embed-text:latest',
    similarityThreshold = 0.7,
    maxResults = 10
  } = options;

  console.log('=== PERFORMING SEMANTIC MATCHING ===');
  console.log('Persona:', persona);
  console.log('Documents count:', documents.length);
  console.log('Options:', options);

  // 1. Generate persona embedding
  let personaEmbedding: number[];
  if (useRemote) {
    personaEmbedding = await generateRemotePersonaEmbedding(persona, remoteHost, remotePort, remoteModel);
  } else {
    personaEmbedding = await generateLocalPersonaEmbedding(persona, localHost, localPort, localModel);
  }

  console.log('Persona embedding generated with dimensions:', personaEmbedding.length);

  // 2. Calculate similarities for all documents
  const scoredDocuments: ScoredDocument[] = [];
  
  for (const doc of documents) {
    if (!doc.embedding || doc.embedding.length === 0) {
      console.warn(`Document ${doc.documentId} has no embedding, skipping`);
      continue;
    }

    try {
      const similarity = cosineSimilarity(personaEmbedding, doc.embedding);
      
      if (similarity >= similarityThreshold) {
        scoredDocuments.push({
          ...doc,
          similarityScore: similarity,
          relevanceReason: generateRelevanceReason(persona, doc, similarity)
        });
      }
    } catch (error) {
      console.error(`Error calculating similarity for document ${doc.documentId}:`, error);
    }
  }

  // 3. Sort by similarity score (highest first) and limit results
  const sortedResults = scoredDocuments
    .sort((a, b) => b.similarityScore - a.similarityScore)
    .slice(0, maxResults);

  console.log(`Found ${sortedResults.length} relevant documents above threshold ${similarityThreshold}`);
  console.log('Top matches:', sortedResults.map(doc => ({
    title: doc.title,
    score: doc.similarityScore
  })));

  return sortedResults;
};

/**
 * Generate a human-readable relevance reason for a matched document
 */
const generateRelevanceReason = (persona: PersonaData, doc: DocumentWithEmbedding, similarity: number): string => {
  const reasons = [];
  
  // Check for agency match
  const preferredAgencies = persona.preferredAgencies || persona.preferred_agencies || [];
  if (doc.agencyId && preferredAgencies.some(agency => 
    agency.toLowerCase().includes(doc.agencyId!.toLowerCase()) || 
    doc.agencyId!.toLowerCase().includes(agency.toLowerCase())
  )) {
    reasons.push(`matches your preferred agency (${doc.agencyId})`);
  }
  
  // Check for policy interest match
  const policyInterests = persona.policyInterests || persona.policy_interests || [];
  const docText = `${doc.title} ${doc.text || ''}`.toLowerCase();
  const matchingInterests = policyInterests.filter(interest => 
    docText.includes(interest.toLowerCase())
  );
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

/**
 * Get persona data from database or localStorage
 */
export const getPersonaData = async (): Promise<PersonaData | null> => {
  try {
    // Try database first
    const response = await fetch('http://localhost:8001/personas');
    if (response.ok) {
      const personas = await response.json();
      if (personas.length > 0) {
        console.log('Using persona from database:', personas[0]);
        return personas[0];
      }
    }
  } catch (dbError) {
    console.log('Could not fetch persona from database, trying localStorage:', dbError);
  }
  
  // Fallback to localStorage
  const savedPersona = localStorage.getItem('navi-persona-data');
  if (savedPersona) {
    const persona = JSON.parse(savedPersona);
    console.log('Using persona from localStorage:', persona);
    return persona;
  }
  
  return null;
};
