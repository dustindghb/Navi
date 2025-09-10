import React, { useState, useEffect } from 'react';
import { fetch as tauriFetch } from '@tauri-apps/plugin-http';

interface S3File {
  key: string;
  lastModified: string;
  size: number;
}

interface S3Document {
  documentId: string;
  title: string;
  content: string;
  agencyId: string;
  documentType: string;
  webCommentLink?: string;
  webDocumentLink?: string;
  webDocketLink?: string;
  docketId?: string;
  embedding?: number[];
}

export function S3Browser() {
  const [files, setFiles] = useState<S3File[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [documentContent, setDocumentContent] = useState<S3Document | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const listS3Files = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Call your Lambda function to list files (metadata only - fast)
      const response = await fetch('https://pktr0h24g5.execute-api.us-west-1.amazonaws.com/prod/?list=true&limit=100');
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      setFiles(data.files || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to list S3 files');
      console.error('Error listing S3 files:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const downloadFile = async (key: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Call your Lambda function to get specific file by key
      const response = await fetch(`https://pktr0h24g5.execute-api.us-west-1.amazonaws.com/prod/?key=${encodeURIComponent(key)}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      setDocumentContent(data.data);
      setSelectedFile(key);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download file');
      console.error('Error downloading file:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  useEffect(() => {
    listS3Files();
  }, []);

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
        <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 700 }}>S3 Document Browser</h1>
        <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#B8B8B8' }}>
          Browse and view documents stored in S3 bucket: navi-dockets
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
            borderRadius: 8,
            marginBottom: 20,
            border: '1px solid #FF6B6B'
          }}>
            <strong>Error:</strong> {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: 20, height: '100%' }}>
          {/* File List */}
          <div style={{ 
            flex: '0 0 400px',
            background: '#1A1A1A',
            border: '1px solid #333',
            borderRadius: 12,
            padding: 20,
            overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
                S3 Files ({files.length})
              </h3>
              <button
                onClick={listS3Files}
                disabled={isLoading}
                style={{
                  background: isLoading ? '#444' : '#2A2A2A',
                  color: '#B8B8B8',
                  border: '1px solid #444',
                  borderRadius: 6,
                  padding: '6px 12px',
                  fontSize: '12px',
                  cursor: isLoading ? 'not-allowed' : 'pointer'
                }}
              >
                {isLoading ? 'Loading...' : 'Refresh'}
              </button>
            </div>

            {files.length === 0 ? (
              <div style={{ 
                textAlign: 'center', 
                color: '#666', 
                padding: '40px 20px',
                fontSize: '14px'
              }}>
                {isLoading ? 'Loading files...' : 'No files found'}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {files.map((file) => (
                  <div
                    key={file.key}
                    onClick={() => downloadFile(file.key)}
                    style={{
                      background: selectedFile === file.key ? '#2A4A2A' : '#2A2A2A',
                      border: '1px solid #444',
                      borderRadius: 8,
                      padding: 12,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      if (selectedFile !== file.key) {
                        e.currentTarget.style.background = '#333';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (selectedFile !== file.key) {
                        e.currentTarget.style.background = '#2A2A2A';
                      }
                    }}
                  >
                    <div style={{ 
                      fontSize: '14px', 
                      fontWeight: 600, 
                      marginBottom: 4,
                      color: selectedFile === file.key ? '#4CAF50' : '#FAFAFA'
                    }}>
                      {file.key}
                    </div>
                    <div style={{ fontSize: '12px', color: '#B8B8B8' }}>
                      {formatFileSize(file.size)} • {formatDate(file.lastModified)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Document Content */}
          <div style={{ 
            flex: 1,
            background: '#1A1A1A',
            border: '1px solid #333',
            borderRadius: 12,
            padding: 20,
            overflowY: 'auto'
          }}>
            {selectedFile ? (
              <div>
                <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: 600 }}>
                  Document: {selectedFile}
                </h3>
                
                {documentContent ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {/* Document Metadata */}
                    <div style={{
                      background: '#2A2A2A',
                      border: '1px solid #444',
                      borderRadius: 8,
                      padding: 16
                    }}>
                      <h4 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: 600 }}>
                        Document Information
                      </h4>
                      <div style={{ display: 'grid', gap: 8, fontSize: '14px' }}>
                        <div><strong>Title:</strong> {documentContent.title}</div>
                        <div><strong>Agency:</strong> {documentContent.agencyId}</div>
                        <div><strong>Type:</strong> {documentContent.documentType}</div>
                        <div><strong>Document ID:</strong> {documentContent.documentId}</div>
                        {documentContent.docketId && (
                          <div><strong>Docket ID:</strong> {documentContent.docketId}</div>
                        )}
                      </div>
                    </div>

                    {/* Links */}
                    {(documentContent.webCommentLink || documentContent.webDocumentLink || documentContent.webDocketLink) && (
                      <div style={{
                        background: '#2A2A2A',
                        border: '1px solid #444',
                        borderRadius: 8,
                        padding: 16
                      }}>
                        <h4 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: 600 }}>
                          Links
                        </h4>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          {documentContent.webCommentLink && (
                            <a 
                              href={documentContent.webCommentLink} 
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
                          )}
                          {documentContent.webDocumentLink && (
                            <a 
                              href={documentContent.webDocumentLink} 
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
                          {documentContent.webDocketLink && (
                            <a 
                              href={documentContent.webDocketLink} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              style={{
                                background: '#2A4A2A',
                                color: '#4CAF50',
                                padding: '8px 16px',
                                borderRadius: 6,
                                textDecoration: 'none',
                                fontSize: '14px',
                                fontWeight: 500
                              }}
                            >
                              View Docket
                            </a>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Content */}
                    <div style={{
                      background: '#2A2A2A',
                      border: '1px solid #444',
                      borderRadius: 8,
                      padding: 16
                    }}>
                      <h4 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: 600 }}>
                        Content
                      </h4>
                      <div style={{ 
                        fontSize: '14px', 
                        lineHeight: '1.6',
                        color: '#B8B8B8',
                        maxHeight: '400px',
                        overflowY: 'auto',
                        whiteSpace: 'pre-wrap'
                      }}>
                        {documentContent.content}
                      </div>
                    </div>

                    {/* Raw JSON */}
                    <details style={{
                      background: '#2A2A2A',
                      border: '1px solid #444',
                      borderRadius: 8,
                      padding: 16
                    }}>
                      <summary style={{ 
                        fontSize: '16px', 
                        fontWeight: 600, 
                        cursor: 'pointer',
                        marginBottom: 12
                      }}>
                        Raw JSON Data
                      </summary>
                      <pre style={{ 
                        fontSize: '12px', 
                        color: '#B8B8B8',
                        overflow: 'auto',
                        maxHeight: '300px',
                        background: '#1A1A1A',
                        padding: 12,
                        borderRadius: 4,
                        border: '1px solid #333'
                      }}>
                        {JSON.stringify(documentContent, null, 2)}
                      </pre>
                    </details>
                  </div>
                ) : (
                  <div style={{ 
                    textAlign: 'center', 
                    color: '#666', 
                    padding: '40px 20px',
                    fontSize: '14px'
                  }}>
                    {isLoading ? 'Loading document...' : 'Click a file to view its contents'}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ 
                textAlign: 'center', 
                color: '#666', 
                padding: '40px 20px',
                fontSize: '14px'
              }}>
                Select a file from the list to view its contents
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
