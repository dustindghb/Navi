import { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Button, 
  Alert, 
  Chip,
  IconButton,
  Collapse,
  LinearProgress
} from '@mui/material';
// import { Grid } from '@mui/material';
import { 
  Close as CloseIcon,
  Dataset as DatabaseIcon
} from '@mui/icons-material';
// import { fetch as tauriFetch } from '@tauri-apps/plugin-http'; // Not using Tauri HTTP due to consistency issues

// Type definitions for database stats

interface DatabaseStats {
  total_documents: number;
  last_updated: string;
  api_health: boolean;
}

export function SimpleDatabaseSettings() {
  // State management
  const [apiError, setApiError] = useState<string | null>(null);
  const [databaseStats, setDatabaseStats] = useState<DatabaseStats | null>(null);

  // Load database stats on component mount
  useEffect(() => {
    loadDatabaseStats();
  }, []);

  const loadDatabaseStats = async () => {
    try {
      // Check API health
      const healthResponse = await fetch('http://localhost:8001/health');
      const healthData = await healthResponse.json();
      console.log('API Health Check:', healthData);

      // Get document count from database (request all documents to get accurate count)
      const documentsResponse = await fetch('http://localhost:8001/documents?limit=10000');
      const documents = await documentsResponse.json();
      const totalDocs = Array.isArray(documents) ? documents.length : 0;

      setDatabaseStats({
        total_documents: totalDocs,
        last_updated: new Date().toISOString(),
        api_health: true
      });
    } catch (err) {
      console.error('Error loading database stats:', err);
      setDatabaseStats({
        total_documents: 0,
        last_updated: 'Never',
        api_health: false
      });
    }
  };

  const clearDatabase = async () => {
    if (!confirm('Are you sure you want to clear all documents from the database? This action cannot be undone.')) {
      return;
    }

    try {
      console.log('=== CLEARING DATABASE ===');
      
      // Use browser fetch directly for consistency with other requests
      console.log('Using browser fetch for database clear...');
      const response = await fetch('http://localhost:8001/documents/clear', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      console.log('Browser fetch completed for database clear');

      if (!response.ok) {
        const errorText = await response.text();
        console.error('HTTP error response:', errorText);
        throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
      }

      const result = await response.json();
      console.log('Database clear result:', result);
      
      // Refresh database stats
      await loadDatabaseStats();
      
      console.log('Database cleared successfully');
    } catch (err) {
      console.error('Error clearing database:', err);
      console.error('Error details:', {
        name: err?.name,
        message: err?.message,
        stack: err?.stack
      });
      setApiError(`Failed to clear database: ${err?.message || err}`);
    }
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
          Simple Database Settings
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Fetch API Data & Save to Local Database (Direct HTTP Method)
        </Typography>
      </Box>
      
      <Box sx={{ 
        flex: 1, 
        overflowY: 'auto', 
        overflowX: 'hidden',
        p: 3 
      }}>
        {apiError && (
          <Alert 
            severity="error" 
            sx={{ mb: 3 }}
            action={
              <IconButton
                color="inherit"
                size="small"
                onClick={() => setApiError(null)}
              >
                <CloseIcon fontSize="inherit" />
              </IconButton>
            }
          >
            {apiError}
          </Alert>
        )}

        {/* Database Status */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <DatabaseIcon sx={{ color: 'primary.main' }} />
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Database Status
            </Typography>
          </Box>
          
          {databaseStats && (
            <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
              <Box sx={{ flex: 1, minWidth: 200, p: 2, bgcolor: 'background.default', borderRadius: 1, border: '1px solid #333' }}>
                <Typography variant="subtitle2" color="text.secondary">
                  Total Documents
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 700, color: 'primary.main' }}>
                  {databaseStats.total_documents}
                </Typography>
              </Box>
              <Box sx={{ flex: 1, minWidth: 200, p: 2, bgcolor: 'background.default', borderRadius: 1, border: '1px solid #333' }}>
                <Typography variant="subtitle2" color="text.secondary">
                  API Health
                </Typography>
                <Typography variant="h6" sx={{ 
                  fontWeight: 700, 
                  color: databaseStats.api_health ? 'success.main' : 'error.main' 
                }}>
                  {databaseStats.api_health ? 'Healthy' : 'Unhealthy'}
                </Typography>
              </Box>
              <Box sx={{ flex: 1, minWidth: 200, p: 2, bgcolor: 'background.default', borderRadius: 1, border: '1px solid #333' }}>
                <Typography variant="subtitle2" color="text.secondary">
                  Last Updated
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {new Date(databaseStats.last_updated).toLocaleString()}
                </Typography>
              </Box>
            </Box>
          )}

          <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
            <Button
              variant="outlined"
              onClick={loadDatabaseStats}
            >
              Refresh Stats
            </Button>
            
            <Button
              variant="outlined"
              color="error"
              onClick={clearDatabase}
            >
              Clear Database
            </Button>
          </Box>
        </Paper>

        {/* Database Management */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <DatabaseIcon sx={{ color: 'primary.main' }} />
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Database Management
            </Typography>
          </Box>
          
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Manage your local database. Use the Settings page to fetch and upload regulations.gov data.
          </Typography>

          <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
            <Button
              variant="outlined"
              onClick={loadDatabaseStats}
            >
              Refresh Stats
            </Button>
            
            <Button
              variant="outlined"
              color="error"
              onClick={clearDatabase}
            >
              Clear Database
            </Button>
          </Box>
        </Paper>
      </Box>
    </Box>
  );
}



