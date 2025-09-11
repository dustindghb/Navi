import { useState, useEffect } from 'react';

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
  text?: string;
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
  relevanceScore: number;
  reasoning: string;
  thoughtProcess: string;
}

interface MatchedDocument {
  document: DocumentData;
  similarityScore: number;
  relevanceReason?: string;
  gptReasoning?: GPTReasoningResult;
}

interface CommentDraftModalProps {
  document: DocumentData;
  onClose: () => void;
}

function CommentDraftModal({ document, onClose }: CommentDraftModalProps) {
  const [draftText, setDraftText] = useState('');
  const [keyPoints, setKeyPoints] = useState<string[]>([]);
  const [isLoadingKeyPoints, setIsLoadingKeyPoints] = useState(false);

  // Mock key points for now - in real implementation, this would be extracted from the document
  useEffect(() => {
    setIsLoadingKeyPoints(true);
    // Simulate loading key points
    setTimeout(() => {
      setKeyPoints([
        'Proposed changes to regulatory framework',
        'Impact on small businesses and startups',
        'New compliance requirements for data handling',
        'Public comment period extended to 60 days',
        'Focus on environmental sustainability measures'
      ]);
      setIsLoadingKeyPoints(false);
    }, 1000);
  }, [document.document_id]);

  return (
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
        maxWidth: '1000px',
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
              Draft Comment
            </h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#B8B8B8' }}>
              {document.title}
            </p>
          </div>
          <button
            onClick={onClose}
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

        {/* Main Content */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {/* Left Panel - Comment Draft */}
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            padding: 24,
            borderRight: '1px solid #333'
          }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: 600,
                marginBottom: 8,
                color: '#B8B8B8'
              }}>
                Your Comment Draft
              </label>
              <textarea
                value={draftText}
                onChange={(e) => setDraftText(e.target.value)}
                placeholder="Write your comment draft here..."
                style={{
                  flex: 1,
                  padding: '16px',
                  background: '#2A2A2A',
                  border: '1px solid #444',
                  borderRadius: 6,
                  color: '#FAFAFA',
                  fontSize: '14px',
                  lineHeight: '1.6',
                  resize: 'none',
                  fontFamily: 'inherit'
                }}
              />
            </div>

            {/* Action Buttons */}
            <div style={{
              display: 'flex',
              gap: 12,
              marginTop: 16,
              flexShrink: 0
            }}>
              <button
                style={{
                  background: '#4CAF50',
                  color: '#FAFAFA',
                  border: 'none',
                  borderRadius: 6,
                  padding: '12px 24px',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Get Feedback
              </button>
              <button
                style={{
                  background: '#3C362A',
                  color: '#FAFAFA',
                  border: 'none',
                  borderRadius: 6,
                  padding: '12px 24px',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                See What Others Are Saying
              </button>
            </div>
          </div>

          {/* Right Panel - Key Points Summary */}
          <div style={{
            width: '350px',
            display: 'flex',
            flexDirection: 'column',
            background: '#1A1A1A'
          }}>
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid #333'
            }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>
                Key Points Summary
              </h3>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
              {isLoadingKeyPoints ? (
                <div style={{
                  textAlign: 'center',
                  color: '#666',
                  fontSize: '14px',
                  padding: '40px 20px'
                }}>
                  Loading key points...
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {keyPoints.map((point, index) => (
                    <div
                      key={index}
                      style={{
                        background: '#2A2A2A',
                        border: '1px solid #444',
                        borderRadius: 8,
                        padding: 16
                      }}
                    >
                      <div style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 8
                      }}>
                        <div style={{
                          width: 20,
                          height: 20,
                          borderRadius: '50%',
                          background: '#4CAF50',
                          color: '#FAFAFA',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '12px',
                          fontWeight: 600,
                          flexShrink: 0,
                          marginTop: 2
                        }}>
                          {index + 1}
                        </div>
                        <p style={{
                          margin: 0,
                          fontSize: '14px',
                          lineHeight: '1.5',
                          color: '#FAFAFA'
                        }}>
                          {point}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function CommentDraft() {
  const [persona, setPersona] = useState<PersonaData | null>(null);
  const [matchedDocuments, setMatchedDocuments] = useState<MatchedDocument[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<DocumentData | null>(null);

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

  const handleDraftComment = (document: DocumentData) => {
    setSelectedDocument(document);
  };

  const handleCloseModal = () => {
    setSelectedDocument(null);
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
        <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 700 }}>Comment Draft</h1>
        <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#B8B8B8' }}>
          Draft comments for your matched documents
        </p>
      </div>
      
      <div style={{ 
        flex: 1, 
        overflowY: 'auto', 
        overflowX: 'hidden',
        padding: 30 
      }}>
        {error && (
          <div style={{ 
            background: '#6B2C2C', 
            color: '#FAFAFA', 
            padding: '12px 16px', 
            borderRadius: 6, 
            marginBottom: 24 
          }}>
            ❌ Error: {error}
          </div>
        )}

        {isLoading ? (
          <div style={{ 
            textAlign: 'center', 
            color: '#B8B8B8', 
            fontSize: '16px', 
            padding: '40px' 
          }}>
            Loading...
          </div>
        ) : matchedDocuments.length === 0 ? (
          <div style={{ 
            background: '#1A1A1A', 
            border: '1px solid #333', 
            borderRadius: 12, 
            padding: 24,
            textAlign: 'center'
          }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: 600 }}>No Matched Documents</h3>
            <p style={{ color: '#B8B8B8', fontSize: '14px', margin: 0 }}>
              Go to the Dashboard to find and save document matches first.
            </p>
          </div>
        ) : (
          <div>
            <div style={{ marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
                Your Matched Documents ({matchedDocuments.length})
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

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                      <div style={{ fontSize: '14px', color: '#B8B8B8' }}>
                        Document ID: {match.document.document_id}
                      </div>
                      
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          onClick={() => handleDraftComment(match.document)}
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
      </div>

      {/* Comment Draft Modal */}
      {selectedDocument && (
        <CommentDraftModal
          document={selectedDocument}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
}
