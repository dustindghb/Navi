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

  // Load saved data on component mount and auto-fetch API data
  useEffect(() => {
    loadSavedData();
    // Auto-fetch API data when component mounts (with small delay to ensure component is ready)
    const timer = setTimeout(() => {
      fetchApiData();
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

  const fetchApiData = async () => {
    setIsFetchingApi(true);
    setApiError(null);

    const url = 'https://pktr0h24g5.execute-api.us-west-1.amazonaws.com/prod/data?all=true';
    
    console.log('=== API FETCH START ===');
    console.log('URL:', url);
    console.log('Using Tauri HTTP client to bypass CORS');
    console.log('Tauri fetch available:', typeof tauriFetch);

    try {
      console.log('Attempting to fetch regulations data from API...');
      
      let response;
      try {
        // Try Tauri HTTP client first
        console.log('Trying Tauri HTTP client...');
        console.log('Tauri fetch function:', tauriFetch);
        
        response = await tauriFetch(url, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          }
        });
        console.log('Tauri HTTP client succeeded');
      } catch (tauriError) {
        console.log('Tauri HTTP client failed, trying browser fetch...', tauriError);
        console.log('Tauri error details:', {
          name: tauriError?.name,
          message: tauriError?.message,
          stack: tauriError?.stack,
          cause: tauriError?.cause
        });
        
        // Fallback to browser fetch
        response = await fetch(url, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          }
        });
        console.log('Browser fetch succeeded');
      }
      
      console.log('API Response received:', {
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
      console.log('Successfully fetched API data:', data);
      console.log('Data type:', typeof data);
      console.log('Data keys:', data ? Object.keys(data) : 'No keys');
      
      // Validate the data structure
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid data format received from API');
      }

      setApiData(data);
      setLastFetchTime(new Date().toISOString());
      console.log('API data set successfully');
      
    } catch (err) {
      console.error('=== API FETCH ERROR ===');
      console.error('Error type:', typeof err);
      console.error('Error constructor:', err?.constructor?.name);
      console.error('Error message:', err instanceof Error ? err.message : String(err));
      console.error('Error stack:', err instanceof Error ? err.stack : 'No stack trace');
      console.error('Full error object:', err);
      console.error('Error details:', {
        name: err?.name,
        message: err?.message,
        stack: err?.stack,
        cause: err?.cause,
        code: err?.code
      });
      
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
      
      // Clear any existing errors
      setApiError(null);
    } catch (err) {
      console.error('Error saving data:', err);
      setApiError('Failed to save data locally');
    }
  };

  const clearSavedData = () => {
    try {
      localStorage.removeItem('navi-regulations-data');
      localStorage.removeItem('navi-last-fetch');
      setSavedData(null);
      setLastFetchTime(null);
      console.log('Cleared saved data');
    } catch (err) {
      console.error('Error clearing data:', err);
    }
  };

  const testConnectivity = async () => {
    setIsTestingConnectivity(true);
    setConnectivityTest(null);

    console.log('=== CONNECTIVITY TEST START ===');
    
    const testUrls = [
      'https://httpbin.org/get',
      'https://pktr0h24g5.execute-api.us-west-1.amazonaws.com/prod/data?all=true',
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
              URL: https://pktr0h24g5.execute-api.us-west-1.amazonaws.com/prod/data?all=true<br/>
              Method: GET<br/>
              Client: Tauri HTTP (bypasses CORS)
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
              onClick={fetchApiData}
              disabled={isFetchingApi}
            >
              {isFetchingApi ? 'Fetching...' : 'Refresh API Data'}
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
              >
                Clear Saved Data
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

          {savedData && (
            <Alert severity="success" sx={{ mb: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
                ✓ Data saved locally
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {getDataSummary(savedData)} • Saved at {savedData._saved_at ? new Date(savedData._saved_at).toLocaleString() : 'Unknown time'}
              </Typography>
            </Alert>
          )}

          {apiData && (
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
                  Fetched Data ({getDataSummary(apiData)})
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
          )}
        </Paper>
      </Box>
    </Box>
  );
}