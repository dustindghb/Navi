import { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  TextField, 
  Button, 
  Alert, 
  Chip,
  IconButton,
  Collapse,
  // MenuItem,
  Divider,
  Switch,
  FormControlLabel
} from '@mui/material';
// import { Grid } from '@mui/material';
import { 
  Close as CloseIcon,
  // Save as SaveIcon,
  Delete as DeleteIcon,
  CloudDownload as DownloadIcon,
  // Settings as SettingsIcon,
  Computer as ComputerIcon,
  Cloud as CloudIcon
} from '@mui/icons-material';
import { fetch as tauriFetch } from '@tauri-apps/plugin-http';

// Type definitions for local Ollama configuration
// interface OllamaDefaults {
//   host?: string;
//   port?: string | number;
// }

interface DetectResult {
  host?: string;
  port?: string | number;
  logs?: any;
}

interface CheckResult {
  cliInstalled?: boolean;
  cliVersion?: string | null;
  serverRunning?: boolean;
  modelPresent?: boolean;
  testGenerationOk?: boolean;
  testTimedOut?: boolean;
  testOutput?: string | null;
  testError?: string | null;
  baseURL?: string;
  logs?: any;
}

export function Settings() {
  // Remote Ollama Configuration (existing)
  const [host, setHost] = useState('10.0.4.52');
  const [port, setPort] = useState('11434');
  const [model, setModel] = useState('gpt-oss:20b');
  const [testMessage, setTestMessage] = useState('Hello, how are you?');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Remote Embedding Configuration (new)
  const [remoteEmbeddingHost, setRemoteEmbeddingHost] = useState('10.0.4.52');
  const [remoteEmbeddingPort, setRemoteEmbeddingPort] = useState('11434');
  const [remoteEmbeddingModel, setRemoteEmbeddingModel] = useState('');
  const [remoteEmbeddingTestText, setRemoteEmbeddingTestText] = useState('This is a test text for remote embedding generation');
  const [isTestingRemoteEmbedding, setIsTestingRemoteEmbedding] = useState(false);
  const [remoteEmbeddingError, setRemoteEmbeddingError] = useState<string | null>(null);
  const [remoteEmbeddingTestResult, setRemoteEmbeddingTestResult] = useState<any>(null);
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
  const [isUploadingToDatabase, setIsUploadingToDatabase] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);
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
  const [showPreviewData, setShowPreviewData] = useState(false);

  // Local Ollama Configuration (new)
  const [useLocalOllama, setUseLocalOllama] = useState(false);
  const [localHost, setLocalHost] = useState('127.0.0.1');
  const [localPort, setLocalPort] = useState('11435');
  const [localModel, setLocalModel] = useState('gpt-oss:20b');
  const [localTestMessage, setLocalTestMessage] = useState('Hello, how are you?');
  const [autoStart, setAutoStart] = useState('false');
  const [detectRes, setDetectRes] = useState<DetectResult | null>(null);
  const [checkRes, setCheckRes] = useState<CheckResult | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [isTestingLocal, setIsTestingLocal] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [localTestResult, setLocalTestResult] = useState<string | null>(null);

  // Local Embedding Model Configuration (new)
  const [useLocalEmbedding, setUseLocalEmbedding] = useState(false);
  const [embeddingHost, setEmbeddingHost] = useState('127.0.0.1');
  const [embeddingPort, setEmbeddingPort] = useState('11435');
  const [embeddingModel, setEmbeddingModel] = useState('');
  const [embeddingTestText, setEmbeddingTestText] = useState('This is a test text for embedding generation');
  const [isTestingEmbedding, setIsTestingEmbedding] = useState(false);
  const [embeddingError, setEmbeddingError] = useState<string | null>(null);
  const [embeddingTestResult, setEmbeddingTestResult] = useState<any>(null);

  // Load saved data on component mount and auto-fetch API data only if localStorage is empty
  useEffect(() => {
    loadSavedData();
    loadLocalOllamaConfig();
    loadLocalEmbeddingConfig();
    loadRemoteOllamaConfig();
    loadRemoteEmbeddingConfig();
    // Check if documents exist in database before auto-fetching
    const timer = setTimeout(async () => {
      try {
        // First check localStorage for saved data
        const savedData = localStorage.getItem('navi-regulations-data');
        if (savedData) {
          console.log('✅ Saved data found in localStorage, skipping auto-fetch');
          setHasAutoFetched(false);
          return;
        }

        // Check if documents exist in database
        console.log('No localStorage data found, checking database for existing documents...');
        const response = await fetch('http://localhost:8001/documents?limit=1');
        
        if (response.ok) {
          const data = await response.json();
          console.log('Database response:', { isArray: Array.isArray(data), length: Array.isArray(data) ? data.length : 'N/A', type: typeof data });
          
          // The API returns documents directly as an array, not wrapped in an object
          const documentCount = Array.isArray(data) ? data.length : 0;
          
          if (documentCount > 0) {
            console.log(`✅ Found ${documentCount} document(s) in database, skipping auto-fetch`);
            setHasAutoFetched(false);
            return;
          } else {
            console.log('❌ No documents found in database');
          }
        } else {
          console.log(`❌ Database check failed with status: ${response.status}`);
        }
        
        // No documents found in database, auto-fetch from API
        console.log('No documents found in database, auto-fetching API data...');
        setHasAutoFetched(true);
        fetchApiData(true); // Fetch all documents by default
        
      } catch (error) {
        console.error('Error checking database for existing documents:', error);
        // If database check fails, fall back to auto-fetch
        console.log('Database check failed, auto-fetching API data as fallback...');
        setHasAutoFetched(true);
        fetchApiData(true);
      }
    }, 1000);
    
    return () => clearTimeout(timer);
  }, []);

  // Save local Ollama config when values change
  useEffect(() => {
    if (localHost || localPort || localModel || localTestMessage || autoStart !== undefined || useLocalOllama !== undefined) {
      saveLocalOllamaConfig();
    }
  }, [localHost, localPort, localModel, localTestMessage, autoStart, useLocalOllama]);

  // Save local embedding config when values change
  useEffect(() => {
    if (embeddingHost || embeddingPort || embeddingModel || embeddingTestText || useLocalEmbedding !== undefined) {
      saveLocalEmbeddingConfig();
    }
  }, [embeddingHost, embeddingPort, embeddingModel, embeddingTestText, useLocalEmbedding]);

  // Save remote Ollama config when values change
  useEffect(() => {
    if (host || port || model || testMessage) {
      saveRemoteOllamaConfig();
    }
  }, [host, port, model, testMessage]);

  // Save remote embedding config when values change
  useEffect(() => {
    if (remoteEmbeddingHost || remoteEmbeddingPort || remoteEmbeddingModel || remoteEmbeddingTestText) {
      saveRemoteEmbeddingConfig();
    }
  }, [remoteEmbeddingHost, remoteEmbeddingPort, remoteEmbeddingModel, remoteEmbeddingTestText]);

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

  const loadLocalOllamaConfig = () => {
    try {
      const saved = localStorage.getItem('navi-local-ollama-config');
      if (saved) {
        const config = JSON.parse(saved);
        if (config.host) setLocalHost(config.host);
        if (config.port) setLocalPort(config.port);
        if (config.model) setLocalModel(config.model);
        if (config.testMessage) setLocalTestMessage(config.testMessage);
        if (config.autoStart) setAutoStart(config.autoStart);
        if (config.useLocalOllama !== undefined) setUseLocalOllama(config.useLocalOllama);
        console.log('Loaded local Ollama config from localStorage:', config);
      }
    } catch (err) {
      console.error('Error loading local Ollama config:', err);
    }
  };

  const saveLocalOllamaConfig = () => {
    try {
      const config = {
        host: localHost,
        port: localPort,
        model: localModel,
        testMessage: localTestMessage,
        autoStart: autoStart,
        useLocalOllama: useLocalOllama,
        _saved_at: new Date().toISOString()
      };
      localStorage.setItem('navi-local-ollama-config', JSON.stringify(config));
      console.log('Saved local Ollama config to localStorage:', config);
    } catch (err) {
      console.error('Error saving local Ollama config:', err);
    }
  };

  const loadLocalEmbeddingConfig = () => {
    try {
      const saved = localStorage.getItem('navi-local-embedding-config');
      if (saved) {
        const config = JSON.parse(saved);
        if (config.host) setEmbeddingHost(config.host);
        if (config.port) setEmbeddingPort(config.port);
        if (config.model) setEmbeddingModel(config.model);
        if (config.testText) setEmbeddingTestText(config.testText);
        if (config.useLocalEmbedding !== undefined) setUseLocalEmbedding(config.useLocalEmbedding);
        console.log('Loaded local embedding config from localStorage:', config);
      }
    } catch (err) {
      console.error('Error loading local embedding config:', err);
    }
  };

  const saveLocalEmbeddingConfig = () => {
    try {
      const config = {
        host: embeddingHost,
        port: embeddingPort,
        model: embeddingModel,
        testText: embeddingTestText,
        useLocalEmbedding: useLocalEmbedding,
        _saved_at: new Date().toISOString()
      };
      localStorage.setItem('navi-local-embedding-config', JSON.stringify(config));
      console.log('Saved local embedding config to localStorage:', config);
    } catch (err) {
      console.error('Error saving local embedding config:', err);
    }
  };

  const loadRemoteOllamaConfig = () => {
    try {
      const saved = localStorage.getItem('navi-remote-ollama-config');
      if (saved) {
        const config = JSON.parse(saved);
        if (config.host) setHost(config.host);
        if (config.port) setPort(config.port);
        if (config.model) setModel(config.model);
        if (config.testMessage) setTestMessage(config.testMessage);
        console.log('Loaded remote Ollama config from localStorage:', config);
      }
    } catch (err) {
      console.error('Error loading remote Ollama config:', err);
    }
  };

  const saveRemoteOllamaConfig = () => {
    try {
      const config = {
        host: host,
        port: port,
        model: model,
        testMessage: testMessage,
        _saved_at: new Date().toISOString()
      };
      localStorage.setItem('navi-remote-ollama-config', JSON.stringify(config));
      console.log('Saved remote Ollama config to localStorage:', config);
    } catch (err) {
      console.error('Error saving remote Ollama config:', err);
    }
  };

  const loadRemoteEmbeddingConfig = () => {
    try {
      const saved = localStorage.getItem('navi-remote-embedding-config');
      if (saved) {
        const config = JSON.parse(saved);
        if (config.host) setRemoteEmbeddingHost(config.host);
        if (config.port) setRemoteEmbeddingPort(config.port);
        if (config.model) setRemoteEmbeddingModel(config.model);
        if (config.testText) setRemoteEmbeddingTestText(config.testText);
        console.log('Loaded remote embedding config from localStorage:', config);
      }
    } catch (err) {
      console.error('Error loading remote embedding config:', err);
    }
  };

  const saveRemoteEmbeddingConfig = () => {
    try {
      const config = {
        host: remoteEmbeddingHost,
        port: remoteEmbeddingPort,
        model: remoteEmbeddingModel,
        testText: remoteEmbeddingTestText,
        _saved_at: new Date().toISOString()
      };
      localStorage.setItem('navi-remote-embedding-config', JSON.stringify(config));
      console.log('Saved remote embedding config to localStorage:', config);
    } catch (err) {
      console.error('Error saving remote embedding config:', err);
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
      
      // Use browser fetch only
      console.log('Using browser fetch for Ollama connection...');
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });
      console.log('Browser fetch completed for Ollama connection');

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
    try {
      console.log('=== FETCH API DATA FUNCTION CALLED ===');
      console.log('fetchAll parameter:', fetchAll);
      console.log('Function execution started at:', new Date().toISOString());
      
      setIsFetchingApi(true);
      setApiError(null);
      setHasAutoFetched(false);
      setFetchProgress({
        isFetching: true,
        currentBatch: 0,
        totalBatches: 0,
        documentsFetched: 0
      });

      console.log('=== API FETCH START ===');
      console.log('Fetch mode:', fetchAll ? 'Fetch All Documents' : 'Fetch Sample (50 documents)');

      const baseUrl = 'https://pktr0h24g5.execute-api.us-west-1.amazonaws.com/prod/';
      const limit = fetchAll ? 1000 : 50; // Use Lambda's max limit for full fetch
      const offset = 0;

      console.log(`Making single API call: ${baseUrl}?limit=${limit}&offset=${offset}`);
      
      let response;
      try {
        // Try Tauri HTTP client first (bypasses CORS)
        console.log('Trying Tauri HTTP client...');
        response = await tauriFetch(`${baseUrl}?limit=${limit}&offset=${offset}`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          }
        });
        console.log('Tauri HTTP client succeeded');
      } catch (tauriError) {
        console.log(`Tauri HTTP client failed, trying browser fetch... ${tauriError}`);
        // Fallback to browser fetch
        response = await fetch(`${baseUrl}?limit=${limit}&offset=${offset}`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
          mode: 'cors',
          cache: 'no-cache'
        });
        console.log('Browser fetch completed');
      }

      console.log('API response received:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error Response:', errorText);
        throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      console.log('API data received:', {
        success: data.success,
        documentCount: data.data?.documents?.length || 0,
        pagination: data.data?.pagination,
        total: data.data?.pagination?.total || 0
      });

      if (!data.success || !data.data?.documents) {
        throw new Error('API returned unsuccessful response or no documents');
      }

      // Process documents to add missing fields and optimize for localStorage
      console.log(`Processing ${data.data.documents.length} documents...`);
      const processedDocuments = data.data.documents.map((doc: any) => {
        // Calculate withinCommentPeriod based on commentEndDate
        let withinCommentPeriod = undefined;
        if (doc.commentEndDate) {
          const endDate = new Date(doc.commentEndDate);
          const now = new Date();
          withinCommentPeriod = now <= endDate;
        }
        
        // Remove embedding attribute since we're embedding locally
        const { embedding, ...docWithoutEmbedding } = doc;
        
        return {
          ...docWithoutEmbedding,
          withinCommentPeriod
        };
      });

      console.log(`Processed ${processedDocuments.length} documents (keeping full text content)`);

      // Upload directly to database
      console.log('Uploading documents directly to database...');
      const uploadResponse = await fetch('http://localhost:8001/api/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ documents: processedDocuments })
      });

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        throw new Error(`Database upload failed: HTTP ${uploadResponse.status} - ${errorText}`);
      }

      const uploadResult = await uploadResponse.json();
      console.log('Database upload successful:', uploadResult);

      // Format the data for display (without localStorage)
      const formattedData = {
        documents: processedDocuments,
        pagination: {
          total: data.data.pagination.total,
          fetched: processedDocuments.length,
          limit: limit,
          offset: offset,
          fetchMode: fetchAll ? 'all' : 'sample'
        },
        _saved_at: new Date().toISOString(),
        uploadResult: uploadResult
      };
      
      console.log('Data uploaded to database:', {
        documentCount: processedDocuments.length,
        total: data.data.pagination.total,
        fetchMode: fetchAll ? 'all' : 'sample',
        uploadResult: uploadResult
      });
      
      // Update component state (no localStorage needed)
      setSavedData(formattedData);
      setApiData(formattedData);
      setLastFetchTime(new Date().toISOString());
      setUploadResult(uploadResult);
      setPaginationConfig({
        limit: data.data.pagination.limit,
        offset: data.data.pagination.offset,
        total: data.data.pagination.total,
        hasMore: data.data.pagination.has_more
      });
      
      // Dispatch custom event to notify other components
      window.dispatchEvent(new CustomEvent('storageChange', {
        detail: { key: 'navi-regulations-data', value: formattedData }
      }));
      
      console.log('=== FETCH API DATA COMPLETED SUCCESSFULLY ===');
      
    } catch (err: any) {
      console.error('=== API FETCH ERROR ===');
      console.error('Error occurred at:', new Date().toISOString());
      console.error('Error message:', err instanceof Error ? err.message : String(err));
      console.error('Full error object:', err);
      
      let errorMessage = 'Failed to fetch data from API';
      if (err instanceof Error) {
        if (err.message.includes('fetch')) {
          errorMessage = `Network error: ${err.message}. Check your internet connection.`;
        } else if (err.message.includes('HTTP')) {
          errorMessage = `HTTP error: ${err.message}`;
        } else if (err.message.includes('permission') || err.message.includes('capability')) {
          errorMessage = `Permission error: ${err.message}. Check Tauri capabilities configuration.`;
        } else if (err.message.includes('localStorage')) {
          errorMessage = `Storage error: ${err.message}. Check browser storage permissions.`;
        } else {
          errorMessage = err.message;
        }
      }
      
      setApiError(errorMessage);
    } finally {
      console.log('Resetting fetch state...');
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

  // Test that the function is defined
  console.log('fetchApiData function defined:', typeof fetchApiData);

  // const saveDataLocally = () => {
  //   if (!apiData) {
  //     setApiError('No data to save');
  //     return;
  //   }

  //   try {
  //     const timestamp = new Date().toISOString();
  //     const dataToSave = {
  //       ...apiData,
  //       _saved_at: timestamp
  //     };

  //     localStorage.setItem('navi-regulations-data', JSON.stringify(dataToSave));
  //     localStorage.setItem('navi-last-fetch', timestamp);
      
  //     setSavedData(dataToSave);
  //     setLastFetchTime(timestamp);
      
  //     console.log('Data saved locally:', dataToSave);
      
  //     // Dispatch custom event to notify other components
  //     window.dispatchEvent(new CustomEvent('storageChange', {
  //       detail: { key: 'navi-regulations-data', value: dataToSave }
  //     }));
      
  //     // Clear any existing errors
  //     setApiError(null);
  //   } catch (err) {
  //     console.error('Error saving data:', err);
  //     setApiError('Failed to save data locally');
  //   }
  // };

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
      await fetchApiData(true);
      
    } catch (err) {
      console.error('Error clearing data:', err);
    } finally {
      setIsClearingData(false);
    }
  };


  const testDatabaseConnectivity = async () => {
    try {
      console.log('=== TESTING DATABASE CONNECTIVITY ===');
      
      // Test health endpoint using browser fetch only
      console.log('Testing database health endpoint...');
      const response = await fetch('http://localhost:8001/health', {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        }
      });
      console.log('Database health check via browser completed');

      if (response.ok) {
        const healthData = await response.json();
        console.log('Database health check result:', healthData);
        setApiError(null);
        alert('Database connection successful! Health check passed.');
      } else {
        throw new Error(`Health check failed: HTTP ${response.status}`);
      }
    } catch (err: any) {
      console.error('Database connectivity test failed:', err);
      setApiError(`Database connection failed: ${err?.message || err}`);
      alert(`Database connection failed: ${err?.message || err}`);
    }
  };

  const testUploadWithSampleData = async () => {
    setIsUploadingToDatabase(true);
    setUploadResult(null);
    setApiError(null);

    try {
      console.log('=== TESTING UPLOAD WITH SAMPLE DATA ===');
      
      const sampleData = {
        documents: [
          {
            documentId: "TEST-SAMPLE-001",
            title: "Sample Test Document",
            text: "This is a sample document for testing upload functionality",
            agencyId: "TEST",
            documentType: "Test",
            webDocumentLink: "https://test.com/doc",
            webDocketLink: "https://test.com/docket",
            webCommentLink: "https://test.com/comment",
            embedding: [0.1, 0.2, 0.3, 0.4, 0.5]
          }
        ]
      };

      console.log('Sample data structure:', sampleData);

      // Make direct HTTP call to the upload endpoint using browser fetch only
      console.log('Using browser fetch for sample upload...');
      const response = await fetch('http://localhost:8001/api/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(sampleData)
      });
      console.log('Browser fetch completed for sample upload');

      if (!response.ok) {
        const errorText = await response.text();
        console.error('HTTP error response:', errorText);
        throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
      }

      const result = await response.json();
      console.log('Sample upload result:', result);
      setUploadResult(result);
      alert('Sample upload successful! Check the result below.');

    } catch (err: any) {
      console.error('Error in sample upload:', err);
      console.error('Error details:', {
        name: err?.name,
        message: err?.message,
        stack: err?.stack
      });
      setApiError(`Sample upload failed: ${err?.message || err}`);
      alert(`Sample upload failed: ${err?.message || err}`);
    } finally {
      setIsUploadingToDatabase(false);
    }
  };

  const testDocumentsApi = async () => {
    setIsTestingConnectivity(true);
    setConnectivityTest(null);

    console.log('=== DOCUMENTS API TEST START ===');
    
    try {
      const testUrl = 'https://pktr0h24g5.execute-api.us-west-1.amazonaws.com/prod/?limit=1&offset=0';
      console.log(`Testing documents API: ${testUrl}`);
      
      let response;
      try {
        // Try Tauri HTTP client first (bypasses CORS)
        console.log('Trying Tauri HTTP client for test...');
        response = await tauriFetch(testUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          }
        });
        console.log('Tauri HTTP client succeeded for test');
      } catch (tauriError) {
        console.log(`Tauri HTTP client failed for test, trying browser fetch... ${tauriError}`);
        // Fallback to browser fetch
        response = await fetch(testUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
          mode: 'cors',
          cache: 'no-cache'
        });
        console.log('Browser fetch completed for test');
      }

      console.log(`Documents API response:`, {
        status: response.status,
        ok: response.ok,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries())
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Documents API data:', data);
        
        // Test the new field processing
        if (data.data?.documents?.[0]) {
          const doc = data.data.documents[0];
          console.log('Testing field processing for document:', {
            hasPostedDate: !!doc.postedDate,
            hasCommentEndDate: !!doc.commentEndDate,
            postedDate: doc.postedDate,
            commentEndDate: doc.commentEndDate,
            allFields: Object.keys(doc)
          });
          
          // Test withinCommentPeriod calculation
          if (doc.commentEndDate) {
            const endDate = new Date(doc.commentEndDate);
            const now = new Date();
            const withinCommentPeriod = now <= endDate;
            console.log('withinCommentPeriod calculation:', {
              endDate: endDate.toISOString(),
              now: now.toISOString(),
              withinCommentPeriod
            });
          }
        }
        
        setConnectivityTest(`Documents API: OK - Retrieved ${data.data?.documents?.length || 0} documents`);
      } else {
        const errorText = await response.text();
        console.error('Documents API error:', errorText);
        setConnectivityTest(`Documents API: Failed - HTTP ${response.status}: ${errorText}`);
      }
    } catch (err) {
      console.error('Documents API test error:', err);
      setConnectivityTest(`Documents API: Error - ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
    
    setIsTestingConnectivity(false);
    console.log('=== DOCUMENTS API TEST END ===');
  };

  const testConnectivity = async () => {
    setIsTestingConnectivity(true);
    setConnectivityTest(null);

    console.log('=== CONNECTIVITY TEST START ===');
    
    const testUrls = [
      'https://httpbin.org/get',
      'https://pktr0h24g5.execute-api.us-west-1.amazonaws.com/prod/?limit=1&offset=0',
      'http://10.0.4.52:11434/api/tags' // Test Ollama endpoint
    ];

    for (const url of testUrls) {
      try {
        console.log(`Testing connectivity to: ${url}`);
        const response = await fetch(url, {
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
          setConnectivityTest(`Internet connectivity: OK (tested ${url})`);
          console.log(`Connectivity test passed for ${url}`);
          break; // Stop on first success
        } else {
          console.log(`Connectivity test failed for ${url}: HTTP ${response.status}`);
        }
      } catch (err) {
        console.error(`Connectivity test error for ${url}:`, err);
        setConnectivityTest(`Internet connectivity: Failed (${url}) - ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }
    
    setIsTestingConnectivity(false);
    console.log('=== CONNECTIVITY TEST END ===');
  };

  // const testApiVsS3 = async () => {
  //   console.log('=== TESTING NEW API ENDPOINT ===');
    
  //   // Test the new API endpoint
  //   try {
  //     const apiResponse = await tauriFetch('https://pktr0h24g5.execute-api.us-west-1.amazonaws.com/prod/?limit=5&offset=0', {
  //       method: 'GET',
  //       headers: {
  //         'Accept': 'application/json',
  //       }
  //     });
      
  //     if (apiResponse.ok) {
  //       const apiData = await apiResponse.json();
  //       console.log('New API Response structure:', {
  //         success: apiData.success,
  //         hasData: !!apiData.data,
  //         hasDocuments: !!apiData.data?.documents,
  //         documentCount: apiData.data?.documents?.length || 0,
  //         pagination: apiData.data?.pagination,
  //         firstDocumentKeys: apiData.data?.documents?.[0] ? Object.keys(apiData.data.documents[0]) : 'No documents',
  //         hasWebLinks: apiData.data?.documents?.[0] ? {
  //           webCommentLink: !!apiData.data.documents[0].webCommentLink,
  //           webDocumentLink: !!apiData.data.documents[0].webDocumentLink,
  //           webDocketLink: !!apiData.data.documents[0].webDocketLink
  //         } : 'No documents'
  //       });
        
  //       // Show a sample of what the API returns
  //       if (apiData.data?.documents?.[0]) {
  //         console.log('Sample API document:', JSON.stringify(apiData.data.documents[0], null, 2));
  //       }
  //     } else {
  //       console.error('API test failed:', apiResponse.status, apiResponse.statusText);
  //     }
  //   } catch (err) {
  //     console.error('Error testing new API:', err);
  //   }
    
  //   console.log('=== END NEW API TEST ===');
  // };

  const testOllamaTags = async () => {
    setIsTestingOllamaTags(true);
    setOllamaTagsTest(null);

    const url = `http://${host}:${port}/api/tags`;
    
    console.log('=== OLLAMA TAGS TEST START ===');
    console.log('Testing Ollama tags endpoint:', url);

    try {
      const response = await fetch(url, {
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
        
        setOllamaTagsTest(`Ollama accessible - Available models: ${modelNames || 'None'}`);
      } else {
        setOllamaTagsTest(`Ollama tags failed: HTTP ${response.status}`);
      }
    } catch (err) {
      console.error('Ollama tags test error:', err);
      setOllamaTagsTest(`Ollama not accessible: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsTestingOllamaTags(false);
      console.log('=== OLLAMA TAGS TEST END ===');
    }
  };


  // Local Ollama Functions
  const detectLocalOllama = async () => {
    setIsDetecting(true);
    setLocalError(null);
    
    try {
      // Simulate detection - in a real implementation, this would call Tauri commands
      // For now, we'll use the default localhost values
      const detectedHost = '127.0.0.1';
      const detectedPort = '11435';
      
      setLocalHost(detectedHost);
      setLocalPort(detectedPort);
      setDetectRes({ 
        host: detectedHost, 
        port: detectedPort, 
        logs: { message: 'Auto-detected local Ollama configuration' }
      });
    } catch (err) {
      console.error('Detection failed:', err);
      setLocalError(`Detection failed: ${err}`);
      setDetectRes(null);
    } finally {
      setIsDetecting(false);
    }
  };

  const testLocalConnection = async () => {
    setIsTestingLocal(true);
    setLocalError(null);
    setLocalTestResult(null);
    setCheckRes(null);

    const url = `http://${localHost}:${localPort}/api/generate`;
    const payload = {
      model: localModel,
      prompt: localTestMessage,
      stream: false
    };

    console.log('=== LOCAL OLLAMA CONNECTION TEST START ===');
    console.log('URL:', url);
    console.log('Payload:', payload);
    console.log('Host:', localHost);
    console.log('Port:', localPort);
    console.log('Model:', localModel);
    console.log('Test Message:', localTestMessage);

    try {
      console.log('Attempting to connect to local Ollama...');
      
      // Use browser fetch only
      console.log('Using browser fetch for local Ollama connection...');
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });
      console.log('Browser fetch completed for local Ollama connection');

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
      setLocalTestResult(result);
      
      // Create comprehensive check results
      const checkResult: CheckResult = {
        cliInstalled: true,
        cliVersion: '0.1.0',
        serverRunning: true,
        modelPresent: true,
        testGenerationOk: true,
        testOutput: result,
        baseURL: `http://${localHost}:${localPort}`,
        logs: { message: 'Local Ollama connection test completed successfully' }
      };
      
      setCheckRes(checkResult);
      console.log('Local Ollama connection successful! Result:', result);
      
    } catch (err) {
      console.error('=== LOCAL OLLAMA CONNECTION ERROR ===');
      console.error('Error type:', typeof err);
      console.error('Error constructor:', err?.constructor?.name);
      console.error('Error message:', err instanceof Error ? err.message : String(err));
      console.error('Error stack:', err instanceof Error ? err.stack : 'No stack trace');
      console.error('Full error object:', err);
      
      // More detailed error message
      let errorMessage = 'Local connection failed';
      if (err instanceof Error) {
        if (err.message.includes('fetch')) {
          errorMessage = `Network error: ${err.message}. Check if Ollama is running on ${localHost}:${localPort}`;
        } else if (err.message.includes('HTTP')) {
          errorMessage = `HTTP error: ${err.message}`;
        } else {
          errorMessage = err.message;
        }
      }
      
      setLocalError(errorMessage);
    } finally {
      setIsTestingLocal(false);
      console.log('=== LOCAL OLLAMA CONNECTION TEST END ===');
    }
  };

  // Comprehensive utility function to prepare persona data for embedding
  const preparePersonaForEmbedding = (persona: any): string => {
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
    
    // Add a summary for better semantic matching
    const summary = `This persona represents a ${persona.role || 'person'} in the ${persona.industry || 'various'} industry, ` +
      `located in ${persona.location || 'various locations'}, with interests in ${policyInterests.join(', ') || 'various policy areas'}, ` +
      `preferring to engage with ${preferredAgencies.join(', ') || 'various agencies'} at the ${impactLevel.join(', ') || 'various'} level.`;
    
    return `${personaDescription}\n\nSummary: ${summary}`;
  };

  // Function to generate persona embedding using remote model
  const generateRemotePersonaEmbedding = async (persona: any): Promise<number[]> => {
    const personaText = preparePersonaForEmbedding(persona);
    
    if (!personaText.trim()) {
      throw new Error('No persona data available for embedding');
    }
    
    const url = `http://${remoteEmbeddingHost}:${remoteEmbeddingPort}/api/embeddings`;
    const payload = {
      model: remoteEmbeddingModel,
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

  // Function to generate persona embedding using local model
  const generateLocalPersonaEmbedding = async (persona: any): Promise<number[]> => {
    const personaText = preparePersonaForEmbedding(persona);
    
    if (!personaText.trim()) {
      throw new Error('No persona data available for embedding');
    }
    
    const url = `http://${embeddingHost}:${embeddingPort}/api/embeddings`;
    const payload = {
      model: embeddingModel,
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

  const testEmbeddingConnection = async () => {
    setIsTestingEmbedding(true);
    setEmbeddingError(null);
    setEmbeddingTestResult(null);

    const url = `http://${embeddingHost}:${embeddingPort}/api/embeddings`;
    const payload = {
      model: embeddingModel,
      prompt: embeddingTestText
    };

    console.log('=== LOCAL EMBEDDING CONNECTION TEST START ===');
    console.log('URL:', url);
    console.log('Payload:', payload);
    console.log('Host:', embeddingHost);
    console.log('Port:', embeddingPort);
    console.log('Model:', embeddingModel);
    console.log('Test Text:', embeddingTestText);

    try {
      console.log('Attempting to connect to local embedding model...');
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });
      console.log('Browser fetch completed for local embedding connection');

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
      
      const result = {
        embedding: data.embedding || data.embeddings?.[0] || 'No embedding received',
        dimensions: data.embedding?.length || data.embeddings?.[0]?.length || 0,
        model: data.model || embeddingModel
      };
      
      setEmbeddingTestResult(result);
      console.log('Local embedding connection successful! Result:', result);
      
    } catch (err) {
      console.error('=== LOCAL EMBEDDING CONNECTION ERROR ===');
      console.error('Error type:', typeof err);
      console.error('Error constructor:', err?.constructor?.name);
      console.error('Error message:', err instanceof Error ? err.message : String(err));
      console.error('Error stack:', err instanceof Error ? err.stack : 'No stack trace');
      console.error('Full error object:', err);
      
      // More detailed error message
      let errorMessage = 'Local embedding connection failed';
      if (err instanceof Error) {
        if (err.message.includes('fetch')) {
          errorMessage = `Network error: ${err.message}. Check if Ollama is running on ${embeddingHost}:${embeddingPort}`;
        } else if (err.message.includes('HTTP')) {
          errorMessage = `HTTP error: ${err.message}`;
        } else {
          errorMessage = err.message;
        }
      }
      
      setEmbeddingError(errorMessage);
    } finally {
      setIsTestingEmbedding(false);
      console.log('=== LOCAL EMBEDDING CONNECTION TEST END ===');
    }
  };

  const testRemoteEmbeddingConnection = async () => {
    setIsTestingRemoteEmbedding(true);
    setRemoteEmbeddingError(null);
    setRemoteEmbeddingTestResult(null);

    const url = `http://${remoteEmbeddingHost}:${remoteEmbeddingPort}/api/embeddings`;
    const payload = {
      model: remoteEmbeddingModel,
      prompt: remoteEmbeddingTestText
    };

    console.log('=== REMOTE EMBEDDING CONNECTION TEST START ===');
    console.log('URL:', url);
    console.log('Payload:', payload);
    console.log('Host:', remoteEmbeddingHost);
    console.log('Port:', remoteEmbeddingPort);
    console.log('Model:', remoteEmbeddingModel);
    console.log('Test Text:', remoteEmbeddingTestText);

    try {
      console.log('Attempting to connect to remote embedding model...');
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });
      console.log('Browser fetch completed for remote embedding connection');

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
      
      const result = {
        embedding: data.embedding || data.embeddings?.[0] || 'No embedding received',
        dimensions: data.embedding?.length || data.embeddings?.[0]?.length || 0,
        model: data.model || remoteEmbeddingModel
      };
      
      setRemoteEmbeddingTestResult(result);
      console.log('Remote embedding connection successful! Result:', result);
      
    } catch (err) {
      console.error('=== REMOTE EMBEDDING CONNECTION ERROR ===');
      console.error('Error type:', typeof err);
      console.error('Error constructor:', err?.constructor?.name);
      console.error('Error message:', err instanceof Error ? err.message : String(err));
      console.error('Error stack:', err instanceof Error ? err.stack : 'No stack trace');
      console.error('Full error object:', err);
      
      // More detailed error message
      let errorMessage = 'Remote embedding connection failed';
      if (err instanceof Error) {
        if (err.message.includes('fetch')) {
          errorMessage = `Network error: ${err.message}. Check if Ollama is running on ${remoteEmbeddingHost}:${remoteEmbeddingPort}`;
        } else if (err.message.includes('HTTP')) {
          errorMessage = `HTTP error: ${err.message}`;
        } else {
          errorMessage = err.message;
        }
      }
      
      setRemoteEmbeddingError(errorMessage);
    } finally {
      setIsTestingRemoteEmbedding(false);
      console.log('=== REMOTE EMBEDDING CONNECTION TEST END ===');
    }
  };


  // Helper Components for Local Ollama
  const StatusItem = ({ label, value, extra = '', type = 'ok' }: { 
    label: string; 
    value?: boolean; 
    extra?: string; 
    type?: 'ok' | 'warn' | 'error' 
  }) => {
    const getColor = (val?: boolean) => {
      if (val === undefined || val === null) return 'text.secondary';
      if (type === 'warn' && !val) return 'warning.main';
      if (type === 'error' && !val) return 'error.main';
      return val ? 'success.main' : 'error.main';
    };

    const getDisplayValue = (val?: boolean) => {
      if (val === undefined || val === null) return 'N/A';
      return val ? 'true' : 'false';
    };

    return (
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mt: 0.5 }}>
        <Typography variant="body2" color="text.secondary" sx={{ minWidth: 160 }}>
          {label}:
        </Typography>
        <Typography variant="body2" sx={{ color: getColor(value), fontWeight: 'medium' }}>
          {getDisplayValue(value)}{extra}
        </Typography>
      </Box>
    );
  };

  const KV = (props: { label: string; value: string }) => (
    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mt: 0.5 }}>
      <Typography variant="body2" color="text.secondary" sx={{ minWidth: 160 }}>
        {props.label}:
      </Typography>
      <Typography variant="body2" component="code" sx={{ 
        bgcolor: 'action.hover', 
        px: 0.5, 
        borderRadius: 0.5,
        fontSize: '0.875rem'
      }}>
        {props.value}
      </Typography>
    </Box>
  );

  const Details = (props: { title: string; data: any; defaultOpen?: boolean }) => {
    if (!props.data) return null;
    const [open, setOpen] = useState<boolean>(!!props.defaultOpen);
    const content = typeof props.data === 'string' ? props.data : JSON.stringify(props.data, null, 2);
    return (
      <Box sx={{ mt: 2 }}>
        <Divider sx={{ mb: 1 }} />
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="subtitle2">{props.title}</Typography>
          <Button size="small" variant="text" onClick={() => setOpen(!open)}>
            {open ? 'Hide' : 'Show'}
          </Button>
        </Box>
        <Collapse in={open} unmountOnExit>
          <Box 
            component="pre" 
            sx={{ 
              mt: 1,
              p: 2, 
              bgcolor: '#0F0F0F', 
              border: '1px solid #333', 
              borderRadius: 1, 
              overflowX: 'auto',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              fontSize: '0.75rem',
              maxHeight: 300
            }}
          >
            {content}
          </Box>
        </Collapse>
      </Box>
    );
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

        {/* Remote Configuration Panel */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <CloudIcon sx={{ color: 'primary.main' }} />
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Remote Configuration
            </Typography>
          </Box>
          
          <FormControlLabel
            control={
              <Switch
                checked={!useLocalOllama}
                onChange={(e) => setUseLocalOllama(!e.target.checked)}
                color="primary"
              />
            }
            label="Use Remote Configuration"
            sx={{ mb: 3 }}
          />

          {/* Remote Ollama Configuration */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, color: 'primary.main' }}>
              Remote Ollama Configuration
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
            
            <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
              <Box sx={{ flex: 1, minWidth: 200 }}>
                <TextField
                  fullWidth
                  label="Model"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder="e.g., gpt-oss:20b"
                  variant="outlined"
                />
              </Box>
              <Box sx={{ flex: 1, minWidth: 200 }}>
                <TextField
                  fullWidth
                  label="Host"
                  value={host}
                  onChange={(e) => setHost(e.target.value)}
                  placeholder="e.g., 10.0.4.52"
                  variant="outlined"
                />
              </Box>
              <Box sx={{ flex: 1, minWidth: 200 }}>
                <TextField
                  fullWidth
                  label="Port"
                  value={port}
                  onChange={(e) => setPort(e.target.value)}
                  placeholder="e.g., 11434"
                  variant="outlined"
                />
              </Box>
            </Box>

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
            </Box>

            {ollamaTagsTest && (
              <Alert 
                severity={ollamaTagsTest.includes('accessible') ? 'success' : 'error'} 
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
                  Ollama Response:
                </Typography>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                  {testResult}
                </Typography>
              </Alert>
            </Collapse>
          </Box>

          <Divider sx={{ my: 3 }} />

          {/* Remote Embedding Configuration */}
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, color: 'primary.main' }}>
              Remote Embedding Configuration
            </Typography>
            
            {remoteEmbeddingError && (
              <Alert severity="error" sx={{ mb: 2 }} onClose={() => setRemoteEmbeddingError(null)}>
                {remoteEmbeddingError}
              </Alert>
            )}

            <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
              <Box sx={{ flex: 1, minWidth: 200 }}>
                <TextField 
                  fullWidth 
                  label="Model Name" 
                  value={remoteEmbeddingModel} 
                  onChange={(e) => setRemoteEmbeddingModel(e.target.value)}
                  placeholder="e.g., nomic-embed-text:latest"
                  variant="outlined"
                />
              </Box>
              <Box sx={{ flex: 1, minWidth: 200 }}>
                <TextField 
                  fullWidth 
                  label="Host" 
                  value={remoteEmbeddingHost} 
                  onChange={(e) => setRemoteEmbeddingHost(e.target.value)} 
                  placeholder="e.g., 10.0.4.52"
                  variant="outlined"
                />
              </Box>
              <Box sx={{ flex: 1, minWidth: 200 }}>
                <TextField 
                  fullWidth 
                  label="Port" 
                  value={remoteEmbeddingPort} 
                  onChange={(e) => setRemoteEmbeddingPort(e.target.value)}
                  placeholder="11434"
                  variant="outlined"
                />
              </Box>
            </Box>

            <TextField
              fullWidth
              multiline
              rows={3}
              label="Test Text for Embedding"
              value={remoteEmbeddingTestText}
              onChange={(e) => setRemoteEmbeddingTestText(e.target.value)}
              placeholder="Enter text to generate embedding for testing"
              variant="outlined"
              sx={{ mb: 2 }}
            />

            <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
              <Button 
                variant="contained" 
                color="primary" 
                onClick={testRemoteEmbeddingConnection}
                disabled={isTestingRemoteEmbedding}
              >
                {isTestingRemoteEmbedding ? 'Testing...' : 'Test Remote Embedding Model'}
              </Button>
              
              <Button 
                variant="outlined" 
                color="secondary" 
                onClick={async () => {
                  try {
                    setIsTestingRemoteEmbedding(true);
                    setRemoteEmbeddingError(null);
                    setRemoteEmbeddingTestResult(null);
                    
                    // Try to get persona from database first, then fallback to localStorage
                    let persona = null;
                    
                    try {
                      const response = await fetch('http://localhost:8001/personas');
                      if (response.ok) {
                        const personas = await response.json();
                        if (personas.length > 0) {
                          persona = personas[0]; // Use the most recent persona
                          console.log('Using persona from database:', persona);
                        }
                      }
                    } catch (dbError) {
                      console.log('Could not fetch persona from database, trying localStorage:', dbError);
                    }
                    
                    // Fallback to localStorage if no database persona found
                    if (!persona) {
                      const savedPersona = localStorage.getItem('navi-persona-data');
                      if (savedPersona) {
                        persona = JSON.parse(savedPersona);
                        console.log('Using persona from localStorage:', persona);
                      }
                    }
                    
                    if (!persona) {
                      throw new Error('No persona data found. Please configure your persona first in the "My Persona" section.');
                    }
                    
                    // Generate the embedding using the comprehensive function
                    const embedding = await generateRemotePersonaEmbedding(persona);
                    
                    // Store the embedding in the database
                    if (persona.id) {
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
                        console.log('Successfully stored persona embedding in database:', embeddingResult);
                      } else {
                        console.error('Failed to store persona embedding in database');
                      }
                    }
                    
                    setRemoteEmbeddingTestResult({
                      embedding: embedding,
                      dimensions: embedding.length,
                      model: remoteEmbeddingModel,
                      type: 'persona',
                      personaText: preparePersonaForEmbedding(persona),
                      storedInDatabase: !!persona.id
                    });
                    
                    console.log('Successfully generated and stored remote persona embedding:', {
                      dimensions: embedding.length,
                      model: remoteEmbeddingModel,
                      storedInDatabase: !!persona.id
                    });
                    
                  } catch (err) {
                    console.error('Error generating remote persona embedding:', err);
                    setRemoteEmbeddingError(err instanceof Error ? err.message : 'Failed to generate remote persona embedding');
                  } finally {
                    setIsTestingRemoteEmbedding(false);
                  }
                }}
                disabled={isTestingRemoteEmbedding}
              >
                {isTestingRemoteEmbedding ? 'Generating...' : 'Test Remote Persona Embedding'}
              </Button>
            </Box>

            <Collapse in={!!remoteEmbeddingTestResult}>
              <Alert severity="success" sx={{ mt: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                  {remoteEmbeddingTestResult?.type === 'persona' ? 'Remote Persona Embedding Result:' : 'Remote Embedding Test Result:'}
                </Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>Model:</strong> {remoteEmbeddingTestResult?.model}
                </Typography>
                {remoteEmbeddingTestResult?.type === 'persona' && (
                  <>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      <strong>Type:</strong> Persona Embedding (ready for semantic search)
                    </Typography>
                    {remoteEmbeddingTestResult?.storedInDatabase && (
                      <Typography variant="body2" sx={{ mb: 1, color: '#4CAF50' }}>
                        <strong>✓ Stored in Database:</strong> Embedding saved to persona record
                      </Typography>
                    )}
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      <strong>Persona Text Used:</strong>
                    </Typography>
                    <Box sx={{ 
                      p: 1, 
                      bgcolor: 'background.default', 
                      borderRadius: 1, 
                      border: '1px solid #333',
                      maxHeight: '150px',
                      overflowY: 'auto',
                      fontSize: '0.875rem',
                      fontFamily: 'monospace',
                      whiteSpace: 'pre-wrap'
                    }}>
                      {remoteEmbeddingTestResult?.personaText || 'No persona text available'}
                    </Box>
                  </>
                )}
              </Alert>
            </Collapse>
          </Box>
        </Paper>

        {/* Local Configuration Panel */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <ComputerIcon sx={{ color: 'secondary.main' }} />
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Local Configuration
            </Typography>
          </Box>
          
          <FormControlLabel
            control={
              <Switch
                checked={useLocalOllama}
                onChange={(e) => setUseLocalOllama(e.target.checked)}
                color="secondary"
              />
            }
            label="Use Local Configuration"
            sx={{ mb: 3 }}
          />

          {/* Local Ollama Configuration */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, color: 'secondary.main' }}>
              Local Ollama Configuration
            </Typography>

            {localError && (
              <Alert severity="error" sx={{ mb: 2 }} onClose={() => setLocalError(null)}>
                {localError}
              </Alert>
            )}

            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Box sx={{ flex: 1, minWidth: 200 }}>
                <TextField 
                  fullWidth 
                  label="Model Name" 
                  value={localModel} 
                  onChange={(e) => setLocalModel(e.target.value)}
                  variant="outlined"
                />
              </Box>
              <Box sx={{ flex: 1, minWidth: 200 }}>
                <TextField 
                  fullWidth 
                  label="Host" 
                  value={localHost} 
                  onChange={(e) => setLocalHost(e.target.value)} 
                  placeholder="e.g., 127.0.0.1"
                  variant="outlined"
                />
              </Box>
              <Box sx={{ flex: 1, minWidth: 200 }}>
                <TextField 
                  fullWidth 
                  label="Port" 
                  value={localPort} 
                  onChange={(e) => setLocalPort(e.target.value)}
                  placeholder="11435"
                  variant="outlined"
                />
              </Box>
            </Box>

            <TextField
              fullWidth
              multiline
              rows={3}
              label="Test Message"
              value={localTestMessage}
              onChange={(e) => setLocalTestMessage(e.target.value)}
              placeholder="Enter a test message to send to the local model"
              variant="outlined"
              sx={{ mt: 2 }}
            />

            <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Button 
                variant="outlined" 
                color="secondary" 
                onClick={detectLocalOllama}
                disabled={isDetecting}
              >
                {isDetecting ? 'Detecting...' : 'Auto-detect Settings'}
              </Button>
              <Button 
                variant="contained" 
                color="primary" 
                onClick={testLocalConnection}
                disabled={isTestingLocal}
              >
                {isTestingLocal ? 'Testing...' : 'Test Local Connection'}
              </Button>
            </Box>

            <Collapse in={!!localTestResult}>
              <Alert severity="success" sx={{ mt: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                  Local Ollama Response:
                </Typography>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                  {localTestResult}
                </Typography>
              </Alert>
            </Collapse>
          </Box>

          <Divider sx={{ my: 3 }} />

          {/* Local Embedding Configuration */}
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, color: 'secondary.main' }}>
              Local Embedding Configuration
            </Typography>

            {embeddingError && (
              <Alert severity="error" sx={{ mb: 2 }} onClose={() => setEmbeddingError(null)}>
                {embeddingError}
              </Alert>
            )}

            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Box sx={{ flex: 1, minWidth: 200 }}>
                <TextField 
                  fullWidth 
                  label="Model Name" 
                  value={embeddingModel} 
                  onChange={(e) => setEmbeddingModel(e.target.value)}
                  placeholder="e.g., nomic-embed-text:latest"
                  variant="outlined"
                />
              </Box>
              <Box sx={{ flex: 1, minWidth: 200 }}>
                <TextField 
                  fullWidth 
                  label="Host" 
                  value={embeddingHost} 
                  onChange={(e) => setEmbeddingHost(e.target.value)} 
                  placeholder="e.g., 127.0.0.1"
                  variant="outlined"
                />
              </Box>
              <Box sx={{ flex: 1, minWidth: 200 }}>
                <TextField 
                  fullWidth 
                  label="Port" 
                  value={embeddingPort} 
                  onChange={(e) => setEmbeddingPort(e.target.value)}
                  placeholder="11435"
                  variant="outlined"
                />
              </Box>
            </Box>

            <TextField
              fullWidth
              multiline
              rows={3}
              label="Test Text for Embedding"
              value={embeddingTestText}
              onChange={(e) => setEmbeddingTestText(e.target.value)}
              placeholder="Enter text to generate embedding for testing"
              variant="outlined"
              sx={{ mt: 2 }}
            />

            <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Button 
                variant="contained" 
                color="primary" 
                onClick={testEmbeddingConnection}
                disabled={isTestingEmbedding}
              >
                {isTestingEmbedding ? 'Testing...' : 'Test Local Embedding Model'}
              </Button>
              
              <Button 
                variant="outlined" 
                color="secondary" 
                onClick={async () => {
                  try {
                    setIsTestingEmbedding(true);
                    setEmbeddingError(null);
                    setEmbeddingTestResult(null);
                    
                    // Try to get persona from database first, then fallback to localStorage
                    let persona = null;
                    
                    try {
                      const response = await fetch('http://localhost:8001/personas');
                      if (response.ok) {
                        const personas = await response.json();
                        if (personas.length > 0) {
                          persona = personas[0]; // Use the most recent persona
                          console.log('Using persona from database:', persona);
                        }
                      }
                    } catch (dbError) {
                      console.log('Could not fetch persona from database, trying localStorage:', dbError);
                    }
                    
                    // Fallback to localStorage if no database persona found
                    if (!persona) {
                      const savedPersona = localStorage.getItem('navi-persona-data');
                      if (savedPersona) {
                        persona = JSON.parse(savedPersona);
                        console.log('Using persona from localStorage:', persona);
                      }
                    }
                    
                    if (!persona) {
                      throw new Error('No persona data found. Please configure your persona first in the "My Persona" section.');
                    }
                    
                    // Generate the embedding using the comprehensive function
                    const embedding = await generateLocalPersonaEmbedding(persona);
                    
                    // Store the embedding in the database
                    if (persona.id) {
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
                        console.log('Successfully stored persona embedding in database:', embeddingResult);
                      } else {
                        console.error('Failed to store persona embedding in database');
                      }
                    }
                    
                    setEmbeddingTestResult({
                      embedding: embedding,
                      dimensions: embedding.length,
                      model: embeddingModel,
                      type: 'persona',
                      personaText: preparePersonaForEmbedding(persona),
                      storedInDatabase: !!persona.id
                    });
                    
                    console.log('Successfully generated and stored local persona embedding:', {
                      dimensions: embedding.length,
                      model: embeddingModel,
                      storedInDatabase: !!persona.id
                    });
                    
                  } catch (err) {
                    console.error('Error generating local persona embedding:', err);
                    setEmbeddingError(err instanceof Error ? err.message : 'Failed to generate local persona embedding');
                  } finally {
                    setIsTestingEmbedding(false);
                  }
                }}
                disabled={isTestingEmbedding}
              >
                {isTestingEmbedding ? 'Generating...' : 'Test Local Persona Embedding'}
              </Button>
            </Box>

            <Collapse in={!!embeddingTestResult}>
              <Alert severity="success" sx={{ mt: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                  {embeddingTestResult?.type === 'persona' ? 'Local Persona Embedding Result:' : 'Local Embedding Test Result:'}
                </Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>Model:</strong> {embeddingTestResult?.model}
                </Typography>
                {embeddingTestResult?.type === 'persona' && (
                  <>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      <strong>Type:</strong> Persona Embedding (ready for semantic search)
                    </Typography>
                    {embeddingTestResult?.storedInDatabase && (
                      <Typography variant="body2" sx={{ mb: 1, color: '#4CAF50' }}>
                        <strong>✓ Stored in Database:</strong> Embedding saved to persona record
                      </Typography>
                    )}
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      <strong>Persona Text Used:</strong>
                    </Typography>
                    <Box sx={{ 
                      p: 1, 
                      bgcolor: 'background.default', 
                      borderRadius: 1, 
                      border: '1px solid #333',
                      maxHeight: '150px',
                      overflowY: 'auto',
                      fontSize: '0.875rem',
                      fontFamily: 'monospace',
                      whiteSpace: 'pre-wrap'
                    }}>
                      {embeddingTestResult?.personaText || 'No persona text available'}
                    </Box>
                  </>
                )}
              </Alert>
            </Collapse>
          </Box>
        </Paper>


        {/* Detection Results */}
        {detectRes && (
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" sx={{ mb: 1 }}>Detection Result</Typography>
            <Typography variant="body2">
              Detected: <code>{`${detectRes.host ?? 'N/A'}:${detectRes.port ?? 'N/A'}`}</code>
            </Typography>
            <Details title="Detection Logs" data={detectRes.logs} />
          </Paper>
        )}

        {/* Connection Check Results */}
        {checkRes && (
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" sx={{ mb: 1 }}>Local Connection Check</Typography>
            <StatusItem 
              label="CLI installed" 
              value={checkRes.cliInstalled} 
              extra={checkRes.cliVersion ? `(${checkRes.cliVersion})` : ''}
            />
            <StatusItem 
              label="Server running" 
              value={checkRes.serverRunning} 
            />
            <StatusItem 
              label="Model present" 
              value={checkRes.modelPresent} 
              type="warn"
            />
            <StatusItem 
              label="Test generation" 
              value={checkRes.testGenerationOk} 
              extra={checkRes.testTimedOut ? ' (timed out while loading model)' : ''}
              type="warn"
            />
            
            {checkRes.testOutput && (
              <Details title="Output" data={checkRes.testOutput} defaultOpen={false} />
            )}
            
            {checkRes.testError && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {checkRes.testError}
              </Alert>
            )}
            
            <KV label="Base URL" value={checkRes.baseURL || 'N/A'} />
            <Details title="Logs" data={checkRes.logs} />
          </Paper>
        )}

        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" sx={{ mb: 1, fontWeight: 600 }}>
            Regulations.gov Data
          </Typography>
          
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Fetch dockets and notices from regulations.gov API and upload directly to database (auto-fetches on app startup)<br/>
            <em>Note: Full text content is preserved and stored in the database</em>
          </Typography>

          <Box sx={{ mb: 2, p: 2, bgcolor: 'background.default', borderRadius: 1, border: '1px solid #333' }}>
            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
              API Configuration:
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
              Source: https://pktr0h24g5.execute-api.us-west-1.amazonaws.com/prod/<br/>
              Method: GET → POST to database<br/>
              Flow: Fetch from API → Upload to localhost:8001/api/upload<br/>
              Client: Tauri HTTP (bypasses CORS)<br/>
              Features: Direct database upload, Full text preservation, Error handling
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
              onClick={() => {
                console.log('=== FETCH & UPLOAD BUTTON CLICKED ===');
                console.log('Button clicked at:', new Date().toISOString());
                console.log('isFetchingApi state:', isFetchingApi);
                console.log('About to call fetchApiData(true)');
                fetchApiData(true);
              }}
              disabled={isFetchingApi}
            >
              {isFetchingApi && fetchProgress.isFetching ? 'Fetching & Uploading...' : 'Fetch & Upload to Database'}
            </Button>
            
            <Button
              variant="outlined"
              onClick={testConnectivity}
              disabled={isTestingConnectivity}
            >
              {isTestingConnectivity ? 'Testing...' : 'Test Connectivity'}
            </Button>
            
            <Button
              variant="outlined"
              color="secondary"
              onClick={testDocumentsApi}
              disabled={isTestingConnectivity}
            >
              {isTestingConnectivity ? 'Testing...' : 'Test Documents API'}
            </Button>
            

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


            <Button
              variant="outlined"
              onClick={testDatabaseConnectivity}
              disabled={isUploadingToDatabase}
            >
              Test Database Connection
            </Button>

            <Button
              variant="outlined"
              color="secondary"
              onClick={testUploadWithSampleData}
              disabled={isUploadingToDatabase}
            >
              Test Upload (Sample Data)
            </Button>
          </Box>

          {connectivityTest && (
            <Alert 
              severity={connectivityTest.includes('OK') ? 'success' : 'error'} 
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

          {isUploadingToDatabase && (
            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="body2">
                🚀 Uploading {savedData?.documents?.length || 0} documents with embeddings to database...
              </Typography>
            </Alert>
          )}

          {uploadResult && (
            <Alert severity="success" sx={{ mb: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
                Database Upload Complete
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Inserted: {uploadResult.inserted} • Updated: {uploadResult.updated} • 
                Total Processed: {uploadResult.total_processed}
                {uploadResult.errors && uploadResult.errors.length > 0 && 
                  ` • Errors: ${uploadResult.errors.length}`
                }
              </Typography>
            </Alert>
          )}

          {fetchProgress.isFetching && (
            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                📥 {hasAutoFetched ? 'Auto-fetching Documents...' : 'Fetching Documents...'}
              </Typography>
              <Typography variant="body2">
                Fetching documents from API and uploading to database...
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
                Data saved locally
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {savedData.documents ? `${savedData.documents.length} documents` : 'Data available'} • 
                {savedData.pagination ? ` ${savedData.pagination.fetchMode} mode` : ''} • 
                Saved at {savedData._saved_at ? new Date(savedData._saved_at).toLocaleString() : 'Unknown time'}
              </Typography>
            </Alert>
          )}

          {apiData && (
            <Box sx={{ mt: 2 }}>
              <Button
                variant="outlined"
                onClick={() => setShowPreviewData(!showPreviewData)}
                sx={{ mb: 2 }}
              >
                {showPreviewData ? 'Hide Data' : 'Preview Data'}
              </Button>
              
              <Collapse in={showPreviewData}>
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
                      Original Data
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {new Date().toLocaleTimeString()}
                    </Typography>
                  </Box>
                  <Box sx={{ 
                    p: 2,
                    maxHeight: '400px',
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
              </Collapse>
            </Box>
          )}
        </Paper>
      </Box>
    </Box>
  );
}