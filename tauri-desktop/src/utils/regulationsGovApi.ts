// Regulations.gov API utility functions
// Handles fetching public comments from regulations.gov API v4

export interface RegulationsComment {
  id: string;
  attributes: {
    commentOnDocumentId: string;
    comment: string;
    commentText?: string;
    submitterName?: string;
    organizationName?: string;
    firstName?: string;
    lastName?: string;
    postedDate: string;
    title?: string;
    docketId: string;
    agencyId: string;
  };
}

export interface RegulationsApiConfig {
  apiKey: string;
}

/**
 * Get regulations.gov API key from localStorage
 * @returns The API key string
 * @throws Error if no API key is configured
 */
export const getRegulationsApiKey = (): string => {
  const savedConfig = localStorage.getItem('navi-regulations-api-config');
  if (!savedConfig) {
    throw new Error('No regulations.gov API key configured. Please add your API key in Settings.');
  }
  
  const config: RegulationsApiConfig = JSON.parse(savedConfig);
  const apiKey = config.apiKey;
  
  if (!apiKey) {
    throw new Error('No regulations.gov API key found. Please add your API key in Settings.');
  }
  
  return apiKey;
};

/**
 * Fetch comment details for a specific comment ID
 * @param commentId The comment ID to fetch
 * @param apiKey The regulations.gov API key
 * @returns Comment data object or null if failed
 */
export const fetchCommentDetails = async (commentId: string, apiKey: string): Promise<RegulationsComment | null> => {
  try {
    const detailUrl = `https://api.regulations.gov/v4/comments/${encodeURIComponent(commentId)}?api_key=${apiKey}`;
    const detailResponse = await fetch(detailUrl);
    
    if (detailResponse.ok) {
      const detailData = await detailResponse.json();
      return detailData.data;
    } else {
      console.warn(`Failed to fetch details for comment ${commentId}:`, detailResponse.status);
      return null;
    }
  } catch (error) {
    console.warn(`Error fetching details for comment ${commentId}:`, error);
    return null;
  }
};

/**
 * Get comment count for a document (lightweight function for match cards)
 * @param documentId The document ID to get comment count for
 * @param apiKey The regulations.gov API key
 * @returns The number of comments or 0 if none found
 */
export const getDocumentCommentCount = async (documentId: string, apiKey: string): Promise<number> => {
  try {
    // Step 1: Get the document's objectId
    const objectId = await getDocumentObjectId(documentId, apiKey);
    
    if (!objectId) {
      return 0;
    }
    
    // Step 2: Get comment count using the list endpoint (no need for full details)
    // Note: regulations.gov API requires minimum page size of 5
    const commentsListUrl = `https://api.regulations.gov/v4/comments?filter%5BcommentOnId%5D=${encodeURIComponent(objectId)}&page%5Bsize%5D=5&sort=-postedDate&api_key=${apiKey}`;
    
    const response = await fetch(commentsListUrl);
    
    if (!response.ok) {
      console.warn(`Failed to get comment count for document ${documentId}:`, response.status);
      return 0;
    }
    
    const data = await response.json();
    const totalComments = data.meta?.totalElements || 0;
    
    console.log(`Document ${documentId} has ${totalComments} comments (meta.totalElements: ${data.meta?.totalElements})`);
    return totalComments;
    
  } catch (error) {
    console.warn(`Error getting comment count for document ${documentId}:`, error);
    return 0;
  }
};

/**
 * Get document objectId from documentId
 * @param documentId The document ID to get objectId for
 * @param apiKey The regulations.gov API key
 * @returns The objectId string or null if not found
 */
export const getDocumentObjectId = async (documentId: string, apiKey: string): Promise<string | null> => {
  try {
    const documentUrl = `https://api.regulations.gov/v4/documents/${encodeURIComponent(documentId)}?api_key=${apiKey}`;
    console.log('Getting document objectId:', documentUrl);
    
    const response = await fetch(documentUrl);
    
    if (!response.ok) {
      console.warn(`Failed to get document details for ${documentId}:`, response.status);
      return null;
    }
    
    const data = await response.json();
    const objectId = data.data?.attributes?.objectId;
    
    if (objectId) {
      console.log(`Found objectId for document ${documentId}:`, objectId);
    } else {
      console.warn(`No objectId found for document ${documentId}`);
    }
    
    return objectId || null;
    
  } catch (error) {
    console.error('Error getting document objectId:', error);
    return null;
  }
};

/**
 * Fetch comments directly filtered by document objectId (more efficient approach)
 * @param documentId The specific document ID to fetch comments for
 * @param apiKey The regulations.gov API key
 * @returns Array of document-specific comment details with full text
 */
export const fetchCommentsByDocumentId = async (
  documentId: string, 
  apiKey: string
): Promise<RegulationsComment[]> => {
  try {
    // Step 1: Get the document's objectId
    const objectId = await getDocumentObjectId(documentId, apiKey);
    
    if (!objectId) {
      console.log('No objectId found for document, no comments available:', documentId);
      return [];
    }
    
    // Step 2: Get list of comment IDs filtered by commentOnId (objectId)
    // Limit to 30 comments to prevent system overload with documents that have thousands of comments
    const commentsListUrl = `https://api.regulations.gov/v4/comments?filter%5BcommentOnId%5D=${encodeURIComponent(objectId)}&page%5Bsize%5D=30&sort=-postedDate&api_key=${apiKey}`;
    console.log('Step 1 - Getting comment list for document objectId (limited to 30):', commentsListUrl);
    
    const listResponse = await fetch(commentsListUrl);
    
    if (!listResponse.ok) {
      if (listResponse.status === 401) {
        throw new Error('Invalid regulations.gov API key. Please check your API key in Settings.');
      } else if (listResponse.status === 403) {
        throw new Error('API key access denied. Please verify your regulations.gov API key permissions.');
      } else {
        throw new Error(`HTTP ${listResponse.status}: ${listResponse.statusText}`);
      }
    }
    
    const listData = await listResponse.json();
    const commentSummaries = listData.data || [];
    
    if (commentSummaries.length === 0) {
      console.log('No comments found for document:', documentId);
      return [];
    }
    
    console.log(`Step 1 - Found ${commentSummaries.length} comment IDs for document ${documentId}`);
    
    // Step 3: Get full details for each comment (including comment text)
    const commentDetails: RegulationsComment[] = [];
    const maxCommentsToProcess = 30; // Safety limit to prevent system overload
    
    if (commentSummaries.length > maxCommentsToProcess) {
      console.warn(`Document has ${commentSummaries.length} comments, limiting to ${maxCommentsToProcess} most recent comments to prevent system overload`);
    }
    
    for (let i = 0; i < Math.min(commentSummaries.length, maxCommentsToProcess); i++) {
      const commentSummary = commentSummaries[i];
      try {
        const commentId = commentSummary.id;
        console.log(`Step 2 - Getting full details for comment ${commentId}`);
        
        const detailUrl = `https://api.regulations.gov/v4/comments/${encodeURIComponent(commentId)}?api_key=${apiKey}`;
        const detailResponse = await fetch(detailUrl);
        
        if (detailResponse.ok) {
          const detailData = await detailResponse.json();
          const fullComment = detailData.data;
          
          // Verify this comment is for our document (double-check)
          if (fullComment.attributes.commentOnDocumentId === documentId) {
            commentDetails.push(fullComment);
            console.log(`Step 2 - Successfully fetched full details for comment ${commentId}`);
          } else {
            console.warn(`Step 2 - Comment ${commentId} is not for document ${documentId}, skipping`);
          }
        } else {
          console.warn(`Step 2 - Failed to fetch details for comment ${commentId}:`, detailResponse.status);
        }
      } catch (error) {
        console.warn(`Step 2 - Error fetching details for comment ${commentSummary.id}:`, error);
      }
    }
    
    const limitMessage = commentSummaries.length > maxCommentsToProcess ? ` (limited from ${commentSummaries.length} total comments)` : '';
    console.log(`Successfully fetched ${commentDetails.length} full comment details for document ${documentId}${limitMessage}`);
    return commentDetails;
    
  } catch (error) {
    console.error('Error fetching comments by document ID:', error);
    throw error;
  }
};

/**
 * Derive docket ID from document ID
 * @param documentId The document ID (e.g., "EERE-2009-BT-BC-0021-2649")
 * @returns The docket ID (e.g., "EERE-2009-BT-BC-0021") or null if invalid
 */
export const deriveDocketId = (documentId: string): string | null => {
  // Based on testing with regulations.gov API, the docket_id should be the first 3 parts
  // Example: "EERE-2009-BT-BC-0021-2649" -> "EERE-2009-BT-BC-0021"
  if (!documentId) return null;
  
  const parts = documentId.split('-');
  
  // Use first three parts as docket_id (AGENCY-YEAR-DOCKET)
  if (parts.length >= 3) {
    return parts.slice(0, 3).join('-');
  }
  
  return null;
};

/**
 * Fetch comments from regulations.gov using v4 API
 * @param docketId The docket ID (kept for backward compatibility, but not used in new approach)
 * @param documentId The specific document ID to fetch comments for
 * @returns Array of document-specific comment details
 */
export const fetchCommentsFromRegulationsGov = async (docketId: string, documentId: string): Promise<RegulationsComment[]> => {
  try {
    const apiKey = getRegulationsApiKey();
    console.log('Fetching comments for document:', documentId);
    
    // Use the more efficient approach: filter directly by documentId
    // This avoids fetching all docket comments and then filtering
    const comments = await fetchCommentsByDocumentId(documentId, apiKey);
    
    if (comments.length === 0) {
      console.log('No comments found for document:', documentId);
      return [];
    }
    
    console.log(`Found ${comments.length} comments for document ${documentId}`);
    return comments;
    
  } catch (error) {
    console.error('Error fetching comments from regulations.gov:', error);
    throw error; // Re-throw to be handled by the calling function
  }
};

/**
 * Test regulations.gov API connection
 * @param apiKey The API key to test
 * @returns Promise that resolves to success message or throws error
 */
export const testRegulationsApiConnection = async (apiKey: string): Promise<string> => {
  try {
    // Try dockets endpoint first
    const testUrl = `https://api.regulations.gov/v4/dockets?filter%5BagencyId%5D=EPA&page%5Bsize%5D=5&api_key=${apiKey}`;
    const response = await fetch(testUrl, { 
      method: 'GET', 
      headers: { 'Accept': 'application/json' } 
    });
    
    if (response.ok) {
      return 'API key is valid and working!';
    } else {
      if (response.status === 403) {
        // Fallback to comments endpoint
        const commentsUrl = `https://api.regulations.gov/v4/comments?filter%5BagencyId%5D=EPA&page%5Bsize%5D=5&api_key=${apiKey}`;
        const commentsResponse = await fetch(commentsUrl, { 
          method: 'GET', 
          headers: { 'Accept': 'application/json' } 
        });
        
        if (commentsResponse.ok) {
          return 'API key is valid! (Limited access - dockets endpoint restricted)';
        } else {
          throw new Error('API key access denied. Your API key may not have the required permissions. Please contact regulations.gov support to enable comment access.');
        }
      } else if (response.status === 401) {
        throw new Error('Invalid API key. Please check your regulations.gov API key.');
      } else {
        throw new Error(`API test failed: ${response.status} ${response.statusText}`);
      }
    }
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    } else {
      throw new Error('Failed to test API connection. Please check your internet connection and try again.');
    }
  }
};
