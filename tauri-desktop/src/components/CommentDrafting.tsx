import { useState, useEffect } from 'react';

interface CommentSuggestion {
  id: string;
  type: 'structure' | 'clarity' | 'evidence' | 'tone' | 'compliance';
  text: string;
  priority: 'high' | 'medium' | 'low';
  applied: boolean;
}

// interface CommentVersion {
//   id: string;
//   version_number: number;
//   content: string;
//   ai_suggestions: CommentSuggestion[];
//   user_notes?: string;
//   is_current: boolean;
//   created_at: string;
// }

interface CommentDraftingProps {
  documentId: string;
  documentTitle: string;
  personaId: string;
  onClose: () => void;
  onCommentSubmitted?: (commentId: string) => void;
}

export function CommentDrafting({ 
  documentId, 
  documentTitle, 
  personaId: _personaId, 
  onClose, 
  onCommentSubmitted 
}: CommentDraftingProps) {
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [suggestions, setSuggestions] = useState<CommentSuggestion[]>([]);
  // const [versions, setVersions] = useState<CommentVersion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [commentId, setCommentId] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(true);
  // const [showVersions, setShowVersions] = useState(false);

  // API base URL - update this to match your backend
  const API_BASE = 'http://localhost:8001';

  useEffect(() => {
    if (content.trim() && commentId) {
      // Debounce content changes to avoid too many API calls
      const timeoutId = setTimeout(() => {
        updateComment();
      }, 2000);
      return () => clearTimeout(timeoutId);
    }
  }, [content]);

  const createComment = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          document_id: documentId,
          title: title || undefined,
          content: content,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const comment = await response.json();
      setCommentId(comment.id);
      setSuggestions(comment.ai_suggestions || []);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create comment');
    } finally {
      setIsLoading(false);
    }
  };

  const updateComment = async () => {
    if (!commentId || !content.trim()) return;
    
    setIsSaving(true);
    
    try {
      const response = await fetch(`${API_BASE}/comments/${commentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const updatedComment = await response.json();
      setSuggestions(updatedComment.ai_suggestions || []);
      
    } catch (err) {
      console.error('Error updating comment:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const applySuggestion = async (suggestionId: string) => {
    if (!commentId) return;
    
    try {
      const response = await fetch(`${API_BASE}/comments/${commentId}/apply-suggestion`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ suggestion_id: suggestionId }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const updatedComment = await response.json();
      setContent(updatedComment.content);
      setSuggestions(updatedComment.ai_suggestions || []);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to apply suggestion');
    }
  };

  const submitComment = async () => {
    if (!commentId) return;
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE}/comments/${commentId}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const submittedComment = await response.json();
      
      if (onCommentSubmitted) {
        onCommentSubmitted(submittedComment.id);
      }
      
      onClose();
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit comment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const loadVersions = async () => {
    if (!commentId) return;
    
    try {
      const response = await fetch(`${API_BASE}/comments/${commentId}/versions`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // const versionsData = await response.json();
      // setVersions(versionsData);
      
    } catch (err) {
      console.error('Error loading versions:', err);
    }
  };

  const getSuggestionIcon = (type: string) => {
    switch (type) {
      case 'structure': return '📋';
      case 'clarity': return '💡';
      case 'evidence': return '📊';
      case 'tone': return '🎭';
      case 'compliance': return '⚖️';
      default: return '💬';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return '#FF6B6B';
      case 'medium': return '#FFA726';
      case 'low': return '#4CAF50';
      default: return '#B8B8B8';
    }
  };

  const wordCount = content.trim().split(/\s+/).filter(word => word.length > 0).length;
  const characterCount = content.length;

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
        maxWidth: '1200px',
        height: '90vh',
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
              {documentTitle}
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

        {/* Error Display */}
        {error && (
          <div style={{
            background: '#6B2C2C',
            color: '#FAFAFA',
            padding: '12px 24px',
            borderBottom: '1px solid #333'
          }}>
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* Main Content */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {/* Left Panel - Comment Editor */}
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            padding: 24,
            borderRight: '1px solid #333'
          }}>
            {/* Title Input */}
            <div style={{ marginBottom: 16 }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: 600,
                marginBottom: 8,
                color: '#B8B8B8'
              }}>
                Comment Title (Optional)
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Brief title for your comment..."
                style={{
                  width: '100%',
                  padding: '12px',
                  background: '#2A2A2A',
                  border: '1px solid #444',
                  borderRadius: 6,
                  color: '#FAFAFA',
                  fontSize: '14px'
                }}
              />
            </div>

            {/* Content Editor */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: 600,
                marginBottom: 8,
                color: '#B8B8B8'
              }}>
                Comment Content
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write your comment here... The AI will provide suggestions to help improve your comment."
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
              
              {/* Stats */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: 8,
                fontSize: '12px',
                color: '#666'
              }}>
                <span>{wordCount} words, {characterCount} characters</span>
                {isSaving && <span style={{ color: '#FFA726' }}>Saving...</span>}
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{
              display: 'flex',
              gap: 12,
              marginTop: 16,
              flexShrink: 0
            }}>
              {!commentId ? (
                <button
                  onClick={createComment}
                  disabled={isLoading || !content.trim()}
                  style={{
                    background: isLoading || !content.trim() ? '#444' : '#4CAF50',
                    color: '#FAFAFA',
                    border: 'none',
                    borderRadius: 6,
                    padding: '12px 24px',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: isLoading || !content.trim() ? 'not-allowed' : 'pointer',
                    opacity: isLoading || !content.trim() ? 0.5 : 1
                  }}
                >
                  {isLoading ? 'Creating...' : 'Start Draft'}
                </button>
              ) : (
                <>
                  <button
                    onClick={submitComment}
                    disabled={isSubmitting || !content.trim()}
                    style={{
                      background: isSubmitting || !content.trim() ? '#444' : '#3C362A',
                      color: '#FAFAFA',
                      border: 'none',
                      borderRadius: 6,
                      padding: '12px 24px',
                      fontSize: '14px',
                      fontWeight: 600,
                      cursor: isSubmitting || !content.trim() ? 'not-allowed' : 'pointer',
                      opacity: isSubmitting || !content.trim() ? 0.5 : 1
                    }}
                  >
                    {isSubmitting ? 'Submitting...' : 'Submit Comment'}
                  </button>
                  
                  <button
                    onClick={loadVersions}
                    style={{
                      background: '#2A2A2A',
                      color: '#B8B8B8',
                      border: '1px solid #444',
                      borderRadius: 6,
                      padding: '12px 24px',
                      fontSize: '14px',
                      cursor: 'pointer'
                    }}
                  >
                    View History
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Right Panel - AI Suggestions */}
          {commentId && (
            <div style={{
              width: '400px',
              display: 'flex',
              flexDirection: 'column',
              background: '#1A1A1A'
            }}>
              {/* Suggestions Header */}
              <div style={{
                padding: '20px 24px',
                borderBottom: '1px solid #333',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>
                  AI Suggestions ({suggestions.length})
                </h3>
                <button
                  onClick={() => setShowSuggestions(!showSuggestions)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#B8B8B8',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  {showSuggestions ? 'Hide' : 'Show'}
                </button>
              </div>

              {/* Suggestions List */}
              {showSuggestions && (
                <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
                  {suggestions.length === 0 ? (
                    <div style={{
                      textAlign: 'center',
                      color: '#666',
                      fontSize: '14px',
                      padding: '40px 20px'
                    }}>
                      No suggestions yet. Keep writing to get AI feedback!
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {suggestions.map((suggestion) => (
                        <div
                          key={suggestion.id}
                          style={{
                            background: '#2A2A2A',
                            border: '1px solid #444',
                            borderRadius: 8,
                            padding: 16,
                            position: 'relative'
                          }}
                        >
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            marginBottom: 8
                          }}>
                            <span style={{ fontSize: '16px' }}>
                              {getSuggestionIcon(suggestion.type)}
                            </span>
                            <span style={{
                              fontSize: '12px',
                              fontWeight: 600,
                              textTransform: 'uppercase',
                              color: '#B8B8B8'
                            }}>
                              {suggestion.type}
                            </span>
                            <div style={{
                              width: 6,
                              height: 6,
                              borderRadius: '50%',
                              background: getPriorityColor(suggestion.priority)
                            }} />
                          </div>
                          
                          <p style={{
                            margin: '0 0 12px 0',
                            fontSize: '14px',
                            lineHeight: '1.5',
                            color: '#FAFAFA'
                          }}>
                            {suggestion.text}
                          </p>
                          
                          <button
                            onClick={() => applySuggestion(suggestion.id)}
                            disabled={suggestion.applied}
                            style={{
                              background: suggestion.applied ? '#4CAF50' : '#3C362A',
                              color: '#FAFAFA',
                              border: 'none',
                              borderRadius: 4,
                              padding: '6px 12px',
                              fontSize: '12px',
                              cursor: suggestion.applied ? 'default' : 'pointer',
                              opacity: suggestion.applied ? 0.7 : 1
                            }}
                          >
                            {suggestion.applied ? 'Applied' : 'Apply'}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
