/**
 * Frontend Integration Example
 * This shows how to integrate the comment analysis API with your Tauri frontend
 * when the "See More" button is clicked
 */

// Example function to call when "See More" button is clicked
async function handleSeeMoreClick(documentId, documentTitle) {
    try {
        // Show loading state
        setLoadingState(true);
        setError(null);
        
        // Call the comment analysis API
        const analysisResult = await analyzeDocumentComments(documentId, documentTitle);
        
        if (analysisResult.success) {
            // Display the analysis results
            displayCommentAnalysis(analysisResult.analysis);
        } else {
            // Show error
            setError(analysisResult.error || 'Analysis failed');
        }
        
    } catch (error) {
        console.error('Error analyzing comments:', error);
        setError('Failed to analyze comments. Please try again.');
    } finally {
        setLoadingState(false);
    }
}

// Function to call the comment analysis API
async function analyzeDocumentComments(documentId, documentTitle, maxComments = 30) {
    const apiUrl = 'http://localhost:8080/api/comment-analysis/analyze';
    
    const requestBody = {
        document_id: documentId,
        document_title: documentTitle,
        max_comments: maxComments
    };
    
    const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
    }
    
    return await response.json();
}

// Function to get comment count (quick check)
async function getCommentCount(documentId) {
    const apiUrl = `http://localhost:8080/api/comment-analysis/count?document_id=${encodeURIComponent(documentId)}`;
    
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
    }
    
    return await response.json();
}

// Function to test API connections
async function testConnections() {
    const apiUrl = 'http://localhost:8080/api/comment-analysis/test';
    
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
    }
    
    return await response.json();
}

// Function to display the analysis results
function displayCommentAnalysis(analysis) {
    // Create a modal or panel to display the results
    const modal = document.createElement('div');
    modal.className = 'comment-analysis-modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>Comment Analysis Results</h2>
                <button class="close-button" onclick="closeModal()">&times;</button>
            </div>
            <div class="modal-body">
                <div class="analysis-section">
                    <h3>Executive Summary</h3>
                    <p>${analysis.summary || 'No summary available'}</p>
                </div>
                
                <div class="analysis-section">
                    <h3>Key Insights</h3>
                    <ul>
                        ${(analysis.key_insights || []).map(insight => `<li>${insight}</li>`).join('')}
                    </ul>
                </div>
                
                <div class="analysis-section">
                    <h3>Common Perspectives</h3>
                    <ul>
                        ${(analysis.common_perspectives || []).map(perspective => `<li>${perspective}</li>`).join('')}
                    </ul>
                </div>
                
                <div class="analysis-section">
                    <h3>Regulatory Themes</h3>
                    <ul>
                        ${(analysis.regulatory_themes || []).map(theme => 
                            `<li><strong>${theme.theme}</strong>: ${theme.description} (${theme.frequency})</li>`
                        ).join('')}
                    </ul>
                </div>
                
                <div class="analysis-section">
                    <h3>Stakeholder Concerns</h3>
                    <ul>
                        ${(analysis.stakeholder_concerns || []).map(concern => 
                            `<li><strong>${concern.stakeholder_type}</strong>: ${concern.concern} (${concern.severity})</li>`
                        ).join('')}
                    </ul>
                </div>
                
                <div class="analysis-section">
                    <h3>Recommendations</h3>
                    <ul>
                        ${(analysis.recommendations || []).map(rec => `<li>${rec}</li>`).join('')}
                    </ul>
                </div>
                
                <div class="analysis-section">
                    <h3>Sentiment Analysis</h3>
                    <p><strong>Overall Sentiment:</strong> ${analysis.sentiment_analysis?.overall_sentiment || 'Unknown'}</p>
                    <p><strong>Confidence:</strong> ${(analysis.sentiment_analysis?.confidence || 0) * 100}%</p>
                    <p>${analysis.sentiment_analysis?.details || 'No details available'}</p>
                </div>
                
                <div class="analysis-section">
                    <h3>Impact Assessment</h3>
                    <p><strong>Economic Impact:</strong> ${analysis.impact_assessment?.economic_impact || 'Unknown'}</p>
                    <p><strong>Implementation Challenges:</strong> ${(analysis.impact_assessment?.implementation_challenges || []).join(', ') || 'None identified'}</p>
                    <p><strong>Timeline Concerns:</strong> ${(analysis.impact_assessment?.timeline_concerns || []).join(', ') || 'None identified'}</p>
                </div>
                
                <div class="analysis-meta">
                    <p><strong>Total Comments Analyzed:</strong> ${analysis.total_comments_analyzed || 0}</p>
                    <p><strong>Analysis Confidence:</strong> ${(analysis.confidence_score || 0) * 100}%</p>
                </div>
            </div>
        </div>
    `;
    
    // Add modal to page
    document.body.appendChild(modal);
    
    // Add CSS for modal (if not already present)
    if (!document.getElementById('comment-analysis-modal-styles')) {
        const styles = document.createElement('style');
        styles.id = 'comment-analysis-modal-styles';
        styles.textContent = `
            .comment-analysis-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(0, 0, 0, 0.5);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 1000;
            }
            
            .modal-content {
                background: white;
                border-radius: 8px;
                max-width: 800px;
                max-height: 90vh;
                overflow-y: auto;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
            }
            
            .modal-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 20px;
                border-bottom: 1px solid #eee;
            }
            
            .modal-header h2 {
                margin: 0;
                color: #333;
            }
            
            .close-button {
                background: none;
                border: none;
                font-size: 24px;
                cursor: pointer;
                color: #666;
            }
            
            .close-button:hover {
                color: #333;
            }
            
            .modal-body {
                padding: 20px;
            }
            
            .analysis-section {
                margin-bottom: 20px;
            }
            
            .analysis-section h3 {
                margin: 0 0 10px 0;
                color: #333;
                font-size: 16px;
            }
            
            .analysis-section p {
                margin: 5px 0;
                line-height: 1.5;
            }
            
            .analysis-section ul {
                margin: 5px 0;
                padding-left: 20px;
            }
            
            .analysis-section li {
                margin: 5px 0;
                line-height: 1.4;
            }
            
            .analysis-meta {
                margin-top: 20px;
                padding-top: 20px;
                border-top: 1px solid #eee;
                font-size: 14px;
                color: #666;
            }
        `;
        document.head.appendChild(styles);
    }
}

// Function to close the modal
function closeModal() {
    const modal = document.querySelector('.comment-analysis-modal');
    if (modal) {
        modal.remove();
    }
}

// Function to set loading state
function setLoadingState(loading) {
    // This would update your UI to show loading state
    console.log('Loading state:', loading);
}

// Function to set error state
function setError(error) {
    // This would update your UI to show error state
    console.error('Error:', error);
}

// Example integration with your existing Dashboard component
// This would be added to your Dashboard.tsx file

/*
// Add this to your Dashboard component state
const [showCommentAnalysis, setShowCommentAnalysis] = useState(false);
const [commentAnalysis, setCommentAnalysis] = useState(null);
const [loadingAnalysis, setLoadingAnalysis] = useState(false);
const [analysisError, setAnalysisError] = useState(null);

// Add this function to your Dashboard component
const handleSeeMoreClick = async (documentId, documentTitle) => {
    try {
        setLoadingAnalysis(true);
        setAnalysisError(null);
        
        const response = await fetch('http://localhost:8080/api/comment-analysis/analyze', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                document_id: documentId,
                document_title: documentTitle,
                max_comments: 30
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `HTTP ${response.status}`);
        }
        
        const result = await response.json();
        setCommentAnalysis(result.analysis);
        setShowCommentAnalysis(true);
        
    } catch (error) {
        console.error('Error analyzing comments:', error);
        setAnalysisError(error.message);
    } finally {
        setLoadingAnalysis(false);
    }
};

// Add this to your JSX where you have the "See More" button
<button 
    onClick={() => handleSeeMoreClick(document.id, document.title)}
    disabled={loadingAnalysis}
    style={{ marginLeft: '8px' }}
>
    {loadingAnalysis ? 'Analyzing...' : 'See More'}
</button>

// Add this modal to your JSX
{showCommentAnalysis && (
    <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000
    }}>
        <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            maxWidth: '800px',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '20px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2>Comment Analysis Results</h2>
                <button onClick={() => setShowCommentAnalysis(false)}>&times;</button>
            </div>
            
            {analysisError ? (
                <div style={{ color: 'red' }}>
                    Error: {analysisError}
                </div>
            ) : commentAnalysis ? (
                <div>
                    <div style={{ marginBottom: '20px' }}>
                        <h3>Executive Summary</h3>
                        <p>{commentAnalysis.summary}</p>
                    </div>
                    
                    <div style={{ marginBottom: '20px' }}>
                        <h3>Key Insights</h3>
                        <ul>
                            {commentAnalysis.key_insights?.map((insight, index) => (
                                <li key={index}>{insight}</li>
                            ))}
                        </ul>
                    </div>
                    
                    <div style={{ marginBottom: '20px' }}>
                        <h3>Common Perspectives</h3>
                        <ul>
                            {commentAnalysis.common_perspectives?.map((perspective, index) => (
                                <li key={index}>{perspective}</li>
                            ))}
                        </ul>
                    </div>
                    
                    <div style={{ marginBottom: '20px' }}>
                        <h3>Sentiment Analysis</h3>
                        <p><strong>Overall Sentiment:</strong> {commentAnalysis.sentiment_analysis?.overall_sentiment}</p>
                        <p><strong>Confidence:</strong> {(commentAnalysis.sentiment_analysis?.confidence || 0) * 100}%</p>
                    </div>
                    
                    <div style={{ fontSize: '14px', color: '#666', marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #eee' }}>
                        <p><strong>Total Comments Analyzed:</strong> {commentAnalysis.total_comments_analyzed}</p>
                        <p><strong>Analysis Confidence:</strong> {(commentAnalysis.confidence_score || 0) * 100}%</p>
                    </div>
                </div>
            ) : null}
        </div>
    </div>
)}
*/
