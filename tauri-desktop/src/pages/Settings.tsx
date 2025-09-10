import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  TextField, 
  Button, 
  Alert, 
  Grid, 
  Chip,
  IconButton,
  Collapse
} from '@mui/material';
import { 
  Close as CloseIcon,
  Save as SaveIcon,
  Delete as DeleteIcon,
  CloudDownload as DownloadIcon
} from '@mui/icons-material';
import { fetch as tauriFetch } from '@tauri-apps/plugin-http';

export function Settings() {
  const [host, setHost] = useState('10.0.4.52');
  const [port, setPort] = useState('11434');
  const [model, setModel] = useState('gpt-oss:20b');
  const [testMessage, setTestMessage] = useState('Hello, how are you?');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [apiData, setApiData] = useState<any>(null);
  const [isFetchingApi, setIsFetchingApi] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [savedData, setSavedData] = useState<any>(null);
  const [lastFetchTime, setLastFetchTime] = useState<string | null>(null);
  const [connectivityTest, setConnectivityTest] = useState<string | null>(null);
  const [isTestingConnectivity, setIsTestingConnectivity] = useState(false);
  const [ollamaTagsTest, setOllamaTagsTest] = useState<string | null>(null);
  const [isTestingOllamaTags, setIsTestingOllamaTags] = useState(false);
  const [isClearingData, setIsClearingData] = useState(false);
  const [paginationConfig, setPaginationConfig] = useState({
    limit: 50,
    offset: 0,
    total: 0,
    hasMore: false
  });
  const [fetchProgress, setFetchProgress] = useState({
    isFetching: false,
    currentBatch: 0,
    totalBatches: 0,
    documentsFetched: 0
  });
  const [hasAutoFetched, setHasAutoFetched] = useState(false);

  // Load saved data on component mount and auto-fetch API data only if localStorage is empty
  useEffect(() => {
    loadSavedData();
    // Only auto-fetch API data if no saved data exists
    const timer = setTimeout(() => {
      const savedData = localStorage.getItem('navi-regulations-data');
      if (!savedData) {
        console.log('No saved data found, auto-fetching API data...');
        setHasAutoFetched(true);
        fetchApiData(false); // Fetch sample data by default
      } else {
        console.log('Saved data found, skipping auto-fetch');
        setHasAutoFetched(false);
      }
    }, 1000);
    
    return () => clearTimeout(timer);
  }, []);

  const loadSavedData = () => {
    try {
      const saved = localStorage.getItem('navi-regulations-data');
      const lastFetch = localStorage.getItem('navi-last-fetch');
      if (saved) {
        const parsedData = JSON.parse(saved);
        setSavedData(parsedData);
        setApiData(parsedData); // Show the saved data in the display area too
        console.log('Loaded saved data from localStorage:', parsedData);
      }
      if (lastFetch) {
        setLastFetchTime(lastFetch);
      }
    } catch (err) {
      console.error('Error loading saved data:', err);
    }
  };

  const testConnection = async () => {
    setIsTesting(true);
    setError(null);
    setTestResult(null);

    const url = `http://${host}:${port}/api/generate`;
    const payload = {
      model: model,
      prompt: testMessage,
      stream: false
    };

    console.log('=== OLLAMA CONNECTION TEST START ===');
    console.log('URL:', url);
    console.log('Payload:', payload);
    console.log('Host:', host);
    console.log('Port:', port);
    console.log('Model:', model);

    try {
      console.log('Attempting to connect to Ollama...');
      
      let response;
      try {
        // Try Tauri HTTP client first
        console.log('Trying Tauri HTTP client...');
        response = await tauriFetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload)
        });
        console.log('Tauri HTTP client succeeded');
      } catch (tauriError) {
        console.log('Tauri HTTP client failed, trying browser fetch...', tauriError);
        // Fallback to browser fetch
        response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload)
        });
        console.log('Browser fetch succeeded');
      }

      console.log('Response received:', {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        ok: response.ok
      });

      if (!response.ok) {
        let errorText = '';
        try {
          errorText = await response.text();
          console.log('Error response body:', errorText);
        } catch (e) {
          console.log('Could not read error response body:', e);
        }
        throw new Error(`HTTP ${response.status}: ${errorText || response.statusText}`);
      }

      console.log('Response is OK, parsing JSON...');
      const data = await response.json();
      console.log('Parsed response data:', data);
      
      const result = data.response || 'No response received';
      setTestResult(result);
      console.log('Ollama connection successful! Result:', result);
      
    } catch (err) {
      console.error('=== OLLAMA CONNECTION ERROR ===');
      console.error('Error type:', typeof err);
      console.error('Error constructor:', err?.constructor?.name);
      console.error('Error message:', err instanceof Error ? err.message : String(err));
      console.error('Error stack:', err instanceof Error ? err.stack : 'No stack trace');
      console.error('Full error object:', err);
      
      // More detailed error message
      let errorMessage = 'Connection failed';
      if (err instanceof Error) {
        if (err.message.includes('fetch')) {
          errorMessage = `Network error: ${err.message}. Check if Ollama is running on ${host}:${port}`;
        } else if (err.message.includes('HTTP')) {
          errorMessage = `HTTP error: ${err.message}`;
        } else {
          errorMessage = err.message;
        }
      }
      
      setError(errorMessage);
    } finally {
      setIsTesting(false);
      console.log('=== OLLAMA CONNECTION TEST END ===');
    }
  };

  const fetchApiData = async (fetchAll: boolean = false) => {
    setIsFetchingApi(true);
    setApiError(null);
    setHasAutoFetched(false); // Reset auto-fetch flag for manual fetches
    setFetchProgress({
      isFetching: true,
      currentBatch: 0,
      totalBatches: 0,
      documentsFetched: 0
    });

    console.log('=== API FETCH START ===');
    console.log('Fetch mode:', fetchAll ? 'Fetch All (with pagination)' : 'Fetch Sample (50 documents)');

    try {
      const baseUrl = 'https://pktr0h24g5.execute-api.us-west-1.amazonaws.com/prod/';
      const limit = fetchAll ? 100 : 50; // Use larger batches for full fetch
      let allDocuments: any[] = [];
      let offset = 0;
      let totalDocuments = 0;
      let batchCount = 0;

      // First, get total count
      console.log('Getting total document count...');
      const countUrl = `${baseUrl}?limit=1&offset=0`;
      
      let countResponse;
      try {
        countResponse = await tauriFetch(countUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          }
        });
        console.log('Count fetch via Tauri succeeded');
      } catch (tauriError) {
        console.log('Tauri failed for count, trying browser fetch...', tauriError);
        countResponse = await fetch(countUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          }
        });
        console.log('Count fetch via browser succeeded');
      }

      if (!countResponse.ok) {
        const errorText = await countResponse.text();
        console.error('Count API Error Response:', errorText);
        throw new Error(`Count HTTP ${countResponse.status}: ${countResponse.statusText} - ${errorText}`);
      }

      const countData = await countResponse.json();
      totalDocuments = countData.data?.pagination?.total || 0;
      console.log('Total documents available:', totalDocuments);

      if (totalDocuments === 0) {
        throw new Error('No documents found in the API');
      }

      // Calculate total batches needed
      const totalBatches = fetchAll ? Math.ceil(totalDocuments / limit) : 1;
      setFetchProgress(prev => ({
        ...prev,
        totalBatches,
        documentsFetched: 0
      }));

      // Fetch documents in batches
      while (offset < totalDocuments && (fetchAll || batchCount === 0)) {
        batchCount++;
        console.log(`Fetching batch ${batchCount}/${totalBatches} (offset: ${offset}, limit: ${limit})`);
        
        setFetchProgress(prev => ({
          ...prev,
          currentBatch: batchCount
        }));

        const batchUrl = `${baseUrl}?limit=${limit}&offset=${offset}`;
        
        let batchResponse;
        try {
          batchResponse = await tauriFetch(batchUrl, {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json',
            }
          });
          console.log(`Batch ${batchCount} fetch via Tauri succeeded`);
        } catch (tauriError) {
          console.log(`Tauri failed for batch ${batchCount}, trying browser fetch...`, tauriError);
          batchResponse = await fetch(batchUrl, {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json',
            }
          });
          console.log(`Batch ${batchCount} fetch via browser succeeded`);
        }

        if (!batchResponse.ok) {
          const errorText = await batchResponse.text();
          console.error(`Batch ${batchCount} API Error Response:`, errorText);
          throw new Error(`Batch ${batchCount} HTTP ${batchResponse.status}: ${batchResponse.statusText} - ${errorText}`);
        }

        const batchData = await batchResponse.json();
        console.log(`Batch ${batchCount} received:`, {
          success: batchData.success,
          documentCount: batchData.data?.documents?.length || 0,
          pagination: batchData.data?.pagination
        });

        if (batchData.success && batchData.data?.documents) {
          allDocuments = [...allDocuments, ...batchData.data.documents];
          setFetchProgress(prev => ({
            ...prev,
            documentsFetched: allDocuments.length
          }));
        }

        // Update pagination config
        if (batchData.data?.pagination) {
          setPaginationConfig({
            limit: batchData.data.pagination.limit,
            offset: batchData.data.pagination.offset,
            total: batchData.data.pagination.total,
            hasMore: batchData.data.pagination.has_more
          });
        }

        offset += limit;

        // If not fetching all, break after first batch
        if (!fetchAll) {
          break;
        }

        // Add small delay between batches to be respectful to the API
        if (offset < totalDocuments) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      console.log('=== ALL DATA RECEIVED ===');
      console.log('Total documents fetched:', allDocuments.length);
      console.log('Sample document structure:', allDocuments[0] ? {
        documentId: allDocuments[0].documentId,
        title: allDocuments[0].title,
        hasEmbedding: !!allDocuments[0].embedding,
        embeddingLength: allDocuments[0].embedding?.length || 0,
        hasContent: !!allDocuments[0].content,
        contentLength: allDocuments[0].content?.length || 0,
        allKeys: Object.keys(allDocuments[0])
      } : 'No documents');

      // Format the data for storage
      const formattedData = {
        documents: allDocuments,
        pagination: {
          total: totalDocuments,
          fetched: allDocuments.length,
          batches: batchCount,
          limit: limit,
          fetchMode: fetchAll ? 'all' : 'sample'
        },
        _saved_at: new Date().toISOString()
      };

      // Save the data to localStorage
      localStorage.setItem('navi-regulations-data', JSON.stringify(formattedData));
      localStorage.setItem('navi-last-fetch', formattedData._saved_at);
      
      setSavedData(formattedData);
      setApiData(formattedData);
      setLastFetchTime(new Date().toISOString());
      
      console.log('Data saved to localStorage:', {
        totalDocuments: allDocuments.length,
        timestamp: formattedData._saved_at,
        fetchMode: fetchAll ? 'all' : 'sample'
      });
      
      // Dispatch custom event to notify other components
      window.dispatchEvent(new CustomEvent('storageChange', {
        detail: { key: 'navi-regulations-data', value: formattedData }
      }));
      
    } catch (err) {
      console.error('=== API FETCH ERROR ===');
      console.error('Error type:', typeof err);
      console.error('Error constructor:', err?.constructor?.name);
      console.error('Error message:', err instanceof Error ? err.message : String(err));
      console.error('Error stack:', err instanceof Error ? err.stack : 'No stack trace');
      console.error('Full error object:', err);
      
      // More detailed error message
      let errorMessage = 'Failed to fetch data from API';
      if (err instanceof Error) {
        if (err.message.includes('fetch')) {
          errorMessage = `Network error: ${err.message}. Check your internet connection.`;
        } else if (err.message.includes('HTTP')) {
          errorMessage = `HTTP error: ${err.message}`;
        } else if (err.message.includes('permission') || err.message.includes('capability')) {
          errorMessage = `Permission error: ${err.message}. Check Tauri capabilities configuration.`;
        } else {
          errorMessage = err.message;
        }
      }
      
      setApiError(errorMessage);
    } finally {
      setIsFetchingApi(false);
      setFetchProgress({
        isFetching: false,
        currentBatch: 0,
        totalBatches: 0,
        documentsFetched: 0
      });
      console.log('=== API FETCH END ===');
    }
  };

  const saveDataLocally = () => {
    if (!apiData) {
      setApiError('No data to save');
      return;
    }

    try {
      const timestamp = new Date().toISOString();
      const dataToSave = {
        ...apiData,
        _saved_at: timestamp
      };

      localStorage.setItem('navi-regulations-data', JSON.stringify(dataToSave));
      localStorage.setItem('navi-last-fetch', timestamp);
      
      setSavedData(dataToSave);
      setLastFetchTime(timestamp);
      
      console.log('Data saved locally:', dataToSave);
      
      // Dispatch custom event to notify other components
      window.dispatchEvent(new CustomEvent('storageChange', {
        detail: { key: 'navi-regulations-data', value: dataToSave }
      }));
      
      // Clear any existing errors
      setApiError(null);
    } catch (err) {
      console.error('Error saving data:', err);
      setApiError('Failed to save data locally');
    }
  };

  const clearSavedData = async () => {
    setIsClearingData(true);
    try {
      localStorage.removeItem('navi-regulations-data');
      localStorage.removeItem('navi-last-fetch');
      setSavedData(null);
      setLastFetchTime(null);
      setHasAutoFetched(true); // Mark as auto-fetch since we're clearing and refetching
      console.log('Cleared saved data');
      
      // Dispatch custom event to notify other components that data was cleared
      window.dispatchEvent(new CustomEvent('storageChange', {
        detail: { key: 'navi-regulations-data', value: null }
      }));
      
      // Automatically fetch fresh API data after clearing
      console.log('Auto-fetching fresh API data after clearing...');
      await fetchApiData();
      
    } catch (err) {
      console.error('Error clearing data:', err);
    } finally {
      setIsClearingData(false);
    }
  };

  const testConnectivity = async () => {
    setIsTestingConnectivity(true);
    setConnectivityTest(null);

    console.log('=== CONNECTIVITY TEST START ===');
    
    const testUrls = [
      'https://httpbin.org/get',
      'https://pktr0h24g5.execute-api.us-west-1.amazonaws.com/prod/?all=true',
      'http://10.0.4.52:11434/api/tags' // Test Ollama endpoint
    ];

    for (const url of testUrls) {
      try {
        console.log(`Testing connectivity to: ${url}`);
        const response = await tauriFetch(url, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          }
        });

        console.log(`Response from ${url}:`, {
          status: response.status,
          ok: response.ok,
          statusText: response.statusText
        });

        if (response.ok) {
          setConnectivityTest(`✓ Internet connectivity: OK (tested ${url})`);
          console.log(`Connectivity test passed for ${url}`);
          break; // Stop on first success
        } else {
          console.log(`Connectivity test failed for ${url}: HTTP ${response.status}`);
        }
      } catch (err) {
        console.error(`Connectivity test error for ${url}:`, err);
        setConnectivityTest(`✗ Internet connectivity: Failed (${url}) - ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }
    
    setIsTestingConnectivity(false);
    console.log('=== CONNECTIVITY TEST END ===');
  };

  const testApiVsS3 = async () => {
    console.log('=== TESTING NEW API ENDPOINT ===');
    
    // Test the new API endpoint
    try {
      const apiResponse = await tauriFetch('https://pktr0h24g5.execute-api.us-west-1.amazonaws.com/prod/?limit=5&offset=0', {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        }
      });
      
      if (apiResponse.ok) {
        const apiData = await apiResponse.json();
        console.log('New API Response structure:', {
          success: apiData.success,
          hasData: !!apiData.data,
          hasDocuments: !!apiData.data?.documents,
          documentCount: apiData.data?.documents?.length || 0,
          pagination: apiData.data?.pagination,
          firstDocumentKeys: apiData.data?.documents?.[0] ? Object.keys(apiData.data.documents[0]) : 'No documents',
          hasWebLinks: apiData.data?.documents?.[0] ? {
            webCommentLink: !!apiData.data.documents[0].webCommentLink,
            webDocumentLink: !!apiData.data.documents[0].webDocumentLink,
            webDocketLink: !!apiData.data.documents[0].webDocketLink
          } : 'No documents'
        });
        
        // Show a sample of what the API returns
        if (apiData.data?.documents?.[0]) {
          console.log('Sample API document:', JSON.stringify(apiData.data.documents[0], null, 2));
        }
      } else {
        console.error('API test failed:', apiResponse.status, apiResponse.statusText);
      }
    } catch (err) {
      console.error('Error testing new API:', err);
    }
    
    console.log('=== END NEW API TEST ===');
  };

  const testOllamaTags = async () => {
    setIsTestingOllamaTags(true);
    setOllamaTagsTest(null);

    const url = `http://${host}:${port}/api/tags`;
    
    console.log('=== OLLAMA TAGS TEST START ===');
    console.log('Testing Ollama tags endpoint:', url);

    try {
      const response = await tauriFetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        }
      });

      console.log('Ollama tags response:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Ollama tags data:', data);
        
        const models = data.models || [];
        const modelNames = models.map((m: any) => m.name).join(', ');
        
        setOllamaTagsTest(`✓ Ollama accessible - Available models: ${modelNames || 'None'}`);
      } else {
        setOllamaTagsTest(`✗ Ollama tags failed: HTTP ${response.status}`);
      }
    } catch (err) {
      console.error('Ollama tags test error:', err);
      setOllamaTagsTest(`✗ Ollama not accessible: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsTestingOllamaTags(false);
      console.log('=== OLLAMA TAGS TEST END ===');
    }
  };

  const getDataSummary = (data: any) => {
    if (!data) return 'No data';
    
    if (Array.isArray(data)) {
      return `Array with ${data.length} items`;
    }
    
    if (typeof data === 'object') {
      const keys = Object.keys(data);
      return `Object with ${keys.length} properties: ${keys.slice(0, 3).join(', ')}${keys.length > 3 ? '...' : ''}`;
    }
    
    return `${typeof data} data`;
  };

  const splitApiData = (data: any) => {
    console.log('=== SPLIT API DATA START ===');
    console.log('Input data structure:', {
      hasData: !!data,
      hasDocuments: !!(data && data.documents),
      documentsIsArray: !!(data && data.documents && Array.isArray(data.documents)),
      documentsLength: data?.documents?.length || 0,
      firstDocumentKeys: data?.documents?.[0] ? Object.keys(data.documents[0]) : 'No documents',
      pagination: data?.pagination
    });

    if (!data || !data.documents || !Array.isArray(data.documents)) {
      console.log('Invalid data structure, returning null');
      return { embeddings: null, summaries: null };
    }

    const embeddings: any[] = [];
    const summaries: any[] = [];

    data.documents.forEach((document: any, index: number) => {
      console.log(`Processing document ${index}:`, {
        documentId: document.documentId,
        title: document.title,
        hasEmbedding: !!document.embedding,
        embeddingLength: document.embedding ? document.embedding.length : 0,
        hasContent: !!document.content,
        contentLength: document.content ? document.content.length : 0,
        allKeys: Object.keys(document)
      });
      
      if (document) {
        // Create embedding object with embedding, documentId, title, and links
        const embeddingObj = {
          documentId: document.documentId,
          title: document.title,
          embedding: document.embedding || null,
          webCommentLink: document.webCommentLink || null,
          webDocumentLink: document.webDocumentLink || null,
          webDocketLink: document.webDocketLink || null,
          s3Key: document.s3Key || null,
          metadata: document.metadata || null
        };
        embeddings.push(embeddingObj);

        // Create summary object with all attributes except embedding
        const { embedding, ...summaryData } = document;
        summaries.push(summaryData);
      }
    });

    // Log summary of extracted data
    console.log('Split data summary:', {
      totalDocuments: data.documents.length,
      embeddingsCount: embeddings.length,
      summariesCount: summaries.length,
      pagination: data.pagination,
      firstEmbeddingLinks: embeddings[0] ? {
        webCommentLink: embeddings[0].webCommentLink,
        webDocumentLink: embeddings[0].webDocumentLink,
        webDocketLink: embeddings[0].webDocketLink
      } : 'No embeddings'
    });

    const result = {
      embeddings: {
        count: embeddings.length,
        items: embeddings,
        _saved_at: data._saved_at
      },
      summaries: {
        count: summaries.length,
        items: summaries,
        _saved_at: data._saved_at
      },
      pagination: data.pagination
    };

    console.log('=== SPLIT API DATA END ===');
    return result;
  };

  return (
    <Box sx={{ 
      height: '100vh', 
      display: 'flex', 
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      <Box sx={{ 
        p: 3, 
        borderBottom: '1px solid #333', 
        bgcolor: 'background.paper', 
        flexShrink: 0 
      }}>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>
          Settings
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Configure Ollama Connection & Fetch Regulations Data
        </Typography>
      </Box>
      
      <Box sx={{ 
        flex: 1, 
        overflowY: 'auto', 
        overflowX: 'hidden',
        p: 3 
      }}>
        {(error || apiError) && (
          <Alert 
            severity="error" 
            sx={{ mb: 3 }}
            action={
              <IconButton
                color="inherit"
                size="small"
                onClick={() => { setError(null); setApiError(null); }}
              >
                <CloseIcon fontSize="inherit" />
              </IconButton>
            }
          >
            {error || apiError}
          </Alert>
        )}

        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
            Ollama Configuration
          </Typography>
          
          <Box sx={{ mb: 2, p: 2, bgcolor: 'background.default', borderRadius: 1, border: '1px solid #333' }}>
            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
              Current Configuration:
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
              Host: {host}<br/>
              Port: {port}<br/>
              Model: {model}<br/>
              URL: http://{host}:{port}/api/generate
            </Typography>
          </Box>
          
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Host"
                value={host}
                onChange={(e) => setHost(e.target.value)}
                placeholder="e.g., 10.0.4.52"
                variant="outlined"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Port"
                value={port}
                onChange={(e) => setPort(e.target.value)}
                placeholder="e.g., 11434"
                variant="outlined"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Model"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="e.g., gpt-oss:20b"
                variant="outlined"
              />
            </Grid>
          </Grid>

          <TextField
            fullWidth
            multiline
            rows={3}
            label="Test Message"
            value={testMessage}
            onChange={(e) => setTestMessage(e.target.value)}
            placeholder="Enter a test message to send to the model"
            variant="outlined"
            sx={{ mb: 2 }}
          />

          <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              onClick={testConnection}
              disabled={isTesting}
            >
              {isTesting ? 'Testing...' : 'Test Ollama Connection'}
            </Button>
            
            <Button
              variant="outlined"
              onClick={testOllamaTags}
              disabled={isTestingOllamaTags}
            >
              {isTestingOllamaTags ? 'Testing...' : 'Test Ollama Access'}
            </Button>
            
            <Button
              variant="outlined"
              onClick={testApiVsS3}
              style={{ background: '#2A4A2A', color: '#4CAF50', borderColor: '#4CAF50' }}
            >
              Test New API Endpoint
            </Button>
          </Box>

          {ollamaTagsTest && (
            <Alert 
              severity={ollamaTagsTest.startsWith('✓') ? 'success' : 'error'} 
              sx={{ mb: 2 }}
            >
              <Typography variant="body2">
                {ollamaTagsTest}
              </Typography>
            </Alert>
          )}

          <Collapse in={!!testResult}>
            <Alert severity="success" sx={{ mt: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                ✓ Ollama Response:
              </Typography>
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                {testResult}
              </Typography>
            </Alert>
          </Collapse>
        </Paper>

        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" sx={{ mb: 1, fontWeight: 600 }}>
            Regulations.gov Data
          </Typography>
          
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Fetch dockets and notices from regulations.gov API (auto-fetches on app startup)
          </Typography>

          <Box sx={{ mb: 2, p: 2, bgcolor: 'background.default', borderRadius: 1, border: '1px solid #333' }}>
            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
              API Configuration:
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
              URL: https://pktr0h24g5.execute-api.us-west-1.amazonaws.com/prod/<br/>
              Method: GET<br/>
              Pagination: ?limit=50&offset=0<br/>
              Client: Tauri HTTP (bypasses CORS)<br/>
              Features: Pagination, Progress Tracking, Error Handling
            </Typography>
          </Box>

          {lastFetchTime && (
            <Chip 
              label={`Last fetched: ${new Date(lastFetchTime).toLocaleString()}`}
              color="success"
              size="small"
              sx={{ mb: 2 }}
            />
          )}

          <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              startIcon={<DownloadIcon />}
              onClick={() => fetchApiData(false)}
              disabled={isFetchingApi}
            >
              {isFetchingApi && !fetchProgress.isFetching ? 'Fetching...' : 'Fetch Sample (50 docs)'}
            </Button>
            
            <Button
              variant="contained"
              color="secondary"
              startIcon={<DownloadIcon />}
              onClick={() => fetchApiData(true)}
              disabled={isFetchingApi}
            >
              {isFetchingApi && fetchProgress.isFetching ? 'Fetching All...' : 'Fetch All Documents'}
            </Button>
            
            <Button
              variant="outlined"
              onClick={testConnectivity}
              disabled={isTestingConnectivity}
            >
              {isTestingConnectivity ? 'Testing...' : 'Test Connectivity'}
            </Button>
            
            {apiData && (
              <Button
                variant="outlined"
                startIcon={<SaveIcon />}
                onClick={saveDataLocally}
              >
                Save Locally
              </Button>
            )}

            {savedData && (
              <Button
                variant="outlined"
                color="error"
                startIcon={<DeleteIcon />}
                onClick={clearSavedData}
                disabled={isClearingData || isFetchingApi}
              >
                {isClearingData ? 'Clearing & Refreshing...' : 'Clear Saved Data'}
              </Button>
            )}
          </Box>

          {connectivityTest && (
            <Alert 
              severity={connectivityTest.startsWith('✓') ? 'success' : 'error'} 
              sx={{ mb: 2 }}
            >
              <Typography variant="body2">
                {connectivityTest}
              </Typography>
            </Alert>
          )}

          {isClearingData && (
            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="body2">
                🔄 Clearing saved data and fetching fresh API data...
              </Typography>
            </Alert>
          )}

          {fetchProgress.isFetching && (
            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                📥 {hasAutoFetched ? 'Auto-fetching Documents...' : 'Fetching Documents...'}
              </Typography>
              <Typography variant="body2">
                Batch {fetchProgress.currentBatch} of {fetchProgress.totalBatches} • 
                Documents fetched: {fetchProgress.documentsFetched}
                {paginationConfig.total > 0 && ` of ${paginationConfig.total}`}
                {hasAutoFetched && (
                  <span style={{ color: '#666', fontSize: '0.8em' }}>
                    {' '}• Auto-fetch (no saved data found)
                  </span>
                )}
              </Typography>
            </Alert>
          )}

          {savedData && (
            <Alert severity="success" sx={{ mb: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
                ✓ Data saved locally
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {savedData.documents ? `${savedData.documents.length} documents` : getDataSummary(savedData)} • 
                {savedData.pagination ? ` ${savedData.pagination.fetchMode} mode` : ''} • 
                Saved at {savedData._saved_at ? new Date(savedData._saved_at).toLocaleString() : 'Unknown time'}
              </Typography>
            </Alert>
          )}

          {apiData && (() => {
            const splitData = splitApiData(apiData);
            return (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {/* Embeddings Data */}
                {splitData.embeddings && (
                  <Paper sx={{ 
                    bgcolor: 'background.default',
                    border: '1px solid #444',
                    overflow: 'hidden'
                  }}>
                    <Box sx={{ 
                      p: 2, 
                      bgcolor: '#2A4A2A', 
                      borderBottom: '1px solid #444',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#4CAF50' }}>
                        Embeddings Data ({splitData.embeddings.count} items)
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {new Date().toLocaleTimeString()}
                      </Typography>
                    </Box>
                    <Box sx={{ 
                      p: 2,
                      maxHeight: '300px',
                      overflowY: 'auto',
                      overflowX: 'auto',
                      fontSize: '12px',
                      fontFamily: 'monospace',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      minWidth: '0'
                    }}>
                      {JSON.stringify(splitData.embeddings, null, 2)}
                    </Box>
                  </Paper>
                )}

                {/* Summaries Data */}
                {splitData.summaries && (
                  <Paper sx={{ 
                    bgcolor: 'background.default',
                    border: '1px solid #444',
                    overflow: 'hidden'
                  }}>
                    <Box sx={{ 
                      p: 2, 
                      bgcolor: '#2A2A4A', 
                      borderBottom: '1px solid #444',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#2196F3' }}>
                        Summaries Data ({splitData.summaries.count} items)
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {new Date().toLocaleTimeString()}
                      </Typography>
                    </Box>
                    <Box sx={{ 
                      p: 2,
                      maxHeight: '300px',
                      overflowY: 'auto',
                      overflowX: 'auto',
                      fontSize: '12px',
                      fontFamily: 'monospace',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      minWidth: '0'
                    }}>
                      {JSON.stringify(splitData.summaries, null, 2)}
                    </Box>
                  </Paper>
                )}

                {/* Original Data (for reference) */}
                <Paper sx={{ 
                  bgcolor: 'background.default',
                  border: '1px solid #444',
                  overflow: 'hidden'
                }}>
                  <Box sx={{ 
                    p: 2, 
                    bgcolor: '#333', 
                    borderBottom: '1px solid #444',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                      Original Data ({getDataSummary(apiData)})
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {new Date().toLocaleTimeString()}
                    </Typography>
                  </Box>
                  <Box sx={{ 
                    p: 2,
                    maxHeight: '200px',
                    overflowY: 'auto',
                    overflowX: 'auto',
                    fontSize: '12px',
                    fontFamily: 'monospace',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    minWidth: '0'
                  }}>
                    {JSON.stringify(apiData, null, 2)}
                  </Box>
                </Paper>
              </Box>
            );
          })()}
        </Paper>
      </Box>
    </Box>
  );
}