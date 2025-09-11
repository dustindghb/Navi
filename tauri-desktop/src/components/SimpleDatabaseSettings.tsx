import { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Button, 
  Alert, 
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Tab
} from '@mui/material';
// import { Grid } from '@mui/material';
import { 
  Close as CloseIcon,
  Dataset as DatabaseIcon,
  Person as PersonIcon
} from '@mui/icons-material';
// import { fetch as tauriFetch } from '@tauri-apps/plugin-http'; // Using regular fetch to match working upload pattern

// Type definitions for database stats

interface DatabaseStats {
  total_documents: number;
  last_updated: string;
  api_health: boolean;
}

interface PersonaData {
  id: number;
  name?: string;
  role?: string;
  location?: string;
  age_range?: string;
  employment_status?: string;
  industry?: string;
  policy_interests: string[];
  preferred_agencies: string[];
  impact_level: string[];
  additional_context?: string;
  created_at: string;
  updated_at?: string;
}

interface DocumentData {
  id: number;
  document_id: string;
  title: string;
  content: string;
  agency_id: string;
  document_type?: string;
  web_comment_link?: string;
  web_document_link?: string;
  web_docket_link?: string;
  docket_id?: string;
  embedding?: number[];
  posted_date?: string;
  created_at: string;
}

interface CommentData {
  id: number;
  persona_id: number;
  document_id: string;
  title?: string;
  content: string;
  status: string;
  created_at: string;
}

export function SimpleDatabaseSettings() {
  // State management
  const [apiError, setApiError] = useState<string | null>(null);
  const [databaseStats, setDatabaseStats] = useState<DatabaseStats | null>(null);
  const [personas, setPersonas] = useState<PersonaData[]>([]);
  const [documents, setDocuments] = useState<DocumentData[]>([]);
  const [comments, setComments] = useState<CommentData[]>([]);
  const [showPersonasDialog, setShowPersonasDialog] = useState(false);
  const [showTableViewDialog, setShowTableViewDialog] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [isClearingDatabase, setIsClearingDatabase] = useState(false);

  // Load database stats on component mount
  useEffect(() => {
    loadDatabaseStats();
  }, []);

  const loadDatabaseStats = async () => {
    try {
      console.log('=== LOADING DATABASE STATS ===');
      
      // Check API health
      const healthResponse = await fetch('http://localhost:8001/health');
      const healthData = await healthResponse.json();
      console.log('API Health Check:', healthData);

      // Get document count from database (request all documents to get accurate count)
      console.log('Fetching documents from API...');
      const documentsResponse = await fetch('http://localhost:8001/documents?limit=10000');
      const documents = await documentsResponse.json();
      console.log('Documents response:', documents);
      console.log('Documents type:', typeof documents);
      console.log('Is array:', Array.isArray(documents));
      
      const totalDocs = Array.isArray(documents) ? documents.length : 0;
      console.log('Total documents calculated:', totalDocs);

      const newStats = {
        total_documents: totalDocs,
        last_updated: new Date().toISOString(),
        api_health: true
      };
      
      console.log('Setting database stats to:', newStats);
      setDatabaseStats(newStats);
      console.log('Database stats updated successfully');
      
    } catch (err) {
      console.error('Error loading database stats:', err);
      const errorStats = {
        total_documents: 0,
        last_updated: 'Never',
        api_health: false
      };
      console.log('Setting error stats to:', errorStats);
      setDatabaseStats(errorStats);
    }
  };

  const loadPersonas = async () => {
    try {
      const response = await fetch('http://localhost:8001/personas');
      if (response.ok) {
        const personasData = await response.json();
        setPersonas(personasData);
        setShowPersonasDialog(true);
      } else {
        setApiError('Failed to load personas');
      }
    } catch (err) {
      console.error('Error loading personas:', err);
      setApiError('Failed to load personas');
    }
  };

  const loadAllData = async () => {
    try {
      // Load personas
      const personasResponse = await fetch('http://localhost:8001/personas');
      if (personasResponse.ok) {
        const personasData = await personasResponse.json();
        setPersonas(personasData);
      }

      // Load documents (limit to 5 for performance)
      const documentsResponse = await fetch('http://localhost:8001/documents?limit=5');
      if (documentsResponse.ok) {
        const documentsData = await documentsResponse.json();
        setDocuments(documentsData);
      }

      // Load comments (if endpoint exists)
      try {
        const commentsResponse = await fetch('http://localhost:8001/comments');
        if (commentsResponse.ok) {
          const commentsData = await commentsResponse.json();
          setComments(commentsData);
        }
      } catch (err) {
        console.log('Comments endpoint not available yet');
        setComments([]);
      }

      setShowTableViewDialog(true);
    } catch (err) {
      console.error('Error loading data:', err);
      setApiError('Failed to load database data');
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
              startIcon={<PersonIcon />}
              onClick={loadPersonas}
            >
              View Personas
            </Button>
            
            <Button
              variant="outlined"
              startIcon={<DatabaseIcon />}
              onClick={loadAllData}
            >
              View Database Tables
            </Button>
            
            <Button
              variant="outlined"
              color="error"
              onClick={async () => {
                console.log('INLINE CLEAR BUTTON CLICKED!');
                if (confirm('Are you sure you want to clear all documents?')) {
                  console.log('User confirmed inline clear');
                  try {
                    const response = await fetch('http://localhost:8001/documents/clear', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({})
                    });
                    const result = await response.json();
                    alert(`Inline clear successful! Deleted ${result.deleted_count} documents.`);
                  } catch (err) {
                    console.error('Inline clear error:', err);
                    alert(`Inline clear failed: ${err}`);
                  }
                }
              }}
            >
              Clear Documents
            </Button>
          </Box>
        </Paper>
      </Box>

      {/* Personas Dialog */}
      <Dialog 
        open={showPersonasDialog} 
        onClose={() => setShowPersonasDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PersonIcon />
            Saved Personas ({personas.length})
          </Box>
        </DialogTitle>
        <DialogContent>
          {personas.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
              No personas found in the database.
            </Typography>
          ) : (
            <List>
              {personas.map((persona, index) => (
                <Box key={persona.id}>
                  <ListItem sx={{ flexDirection: 'column', alignItems: 'flex-start', py: 2 }}>
                    <Box sx={{ width: '100%', mb: 1 }}>
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        {persona.name || 'Unnamed Persona'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        ID: {persona.id} • {persona.location || 'No location'} • {persona.age_range || 'No age range'} • {persona.employment_status || 'No employment status'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Created: {persona.created_at ? new Date(persona.created_at).toLocaleDateString() : 'N/A'}
                        {persona.updated_at && persona.updated_at !== persona.created_at && 
                          ` • Updated: ${new Date(persona.updated_at).toLocaleDateString()}`
                        }
                      </Typography>
                    </Box>
                    
                    <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 1 }}>
                      {persona.role && (
                        <Box>
                          <Typography variant="subtitle2" color="text.secondary">Role:</Typography>
                          <Typography variant="body2">{persona.role}</Typography>
                        </Box>
                      )}
                      
                      {persona.location && (
                        <Box>
                          <Typography variant="subtitle2" color="text.secondary">Location:</Typography>
                          <Typography variant="body2">{persona.location}</Typography>
                        </Box>
                      )}
                      
                      {persona.age_range && (
                        <Box>
                          <Typography variant="subtitle2" color="text.secondary">Age Range:</Typography>
                          <Typography variant="body2">{persona.age_range}</Typography>
                        </Box>
                      )}
                      
                      {persona.employment_status && (
                        <Box>
                          <Typography variant="subtitle2" color="text.secondary">Employment Status:</Typography>
                          <Typography variant="body2">{persona.employment_status}</Typography>
                        </Box>
                      )}
                      
                      {persona.industry && (
                        <Box>
                          <Typography variant="subtitle2" color="text.secondary">Industry:</Typography>
                          <Typography variant="body2">{persona.industry}</Typography>
                        </Box>
                      )}
                      
                      {persona.policy_interests.length > 0 && (
                        <Box>
                          <Typography variant="subtitle2" color="text.secondary">Policy Interests:</Typography>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                            {persona.policy_interests.map((interest, idx) => (
                              <Chip key={idx} label={interest} size="small" variant="outlined" />
                            ))}
                          </Box>
                        </Box>
                      )}
                      
                      {persona.preferred_agencies.length > 0 && (
                        <Box>
                          <Typography variant="subtitle2" color="text.secondary">Preferred Agencies:</Typography>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                            {persona.preferred_agencies.map((agency, idx) => (
                              <Chip key={idx} label={agency} size="small" variant="outlined" />
                            ))}
                          </Box>
                        </Box>
                      )}
                      
                      {persona.impact_level.length > 0 && (
                        <Box>
                          <Typography variant="subtitle2" color="text.secondary">Impact Level:</Typography>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                            {persona.impact_level.map((level, idx) => (
                              <Chip key={idx} label={level} size="small" variant="outlined" />
                            ))}
                          </Box>
                        </Box>
                      )}
                      
                      {persona.additional_context && (
                        <Box>
                          <Typography variant="subtitle2" color="text.secondary">Additional Context:</Typography>
                          <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
                            {persona.additional_context}
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  </ListItem>
                  {index < personas.length - 1 && <Divider />}
                </Box>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowPersonasDialog(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Database Tables Dialog */}
      <Dialog 
        open={showTableViewDialog} 
        onClose={() => setShowTableViewDialog(false)}
        maxWidth="xl"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <DatabaseIcon />
            Database Tables
          </Box>
        </DialogTitle>
        <DialogContent>
          <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)} sx={{ mb: 2 }}>
            <Tab label={`Personas (${personas.length})`} />
            <Tab label={`Documents (${documents.length})`} />
            <Tab label={`Comments (${comments.length})`} />
          </Tabs>

          {activeTab === 0 && (
            <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
              <Table stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>ID</TableCell>
                    <TableCell>Name</TableCell>
                    <TableCell>Role</TableCell>
                    <TableCell>Location</TableCell>
                    <TableCell>Age Range</TableCell>
                    <TableCell>Employment</TableCell>
                    <TableCell>Industry</TableCell>
                    <TableCell>Policy Interests</TableCell>
                    <TableCell>Created</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {personas.map((persona) => (
                    <TableRow key={persona.id}>
                      <TableCell>{persona.id}</TableCell>
                      <TableCell>{persona.name || 'N/A'}</TableCell>
                      <TableCell>{persona.role || 'N/A'}</TableCell>
                      <TableCell>{persona.location || 'N/A'}</TableCell>
                      <TableCell>{persona.age_range || 'N/A'}</TableCell>
                      <TableCell>{persona.employment_status || 'N/A'}</TableCell>
                      <TableCell>{persona.industry || 'N/A'}</TableCell>
                      <TableCell>
                        {persona.policy_interests && persona.policy_interests.length > 0 ? (
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {persona.policy_interests.slice(0, 2).map((interest: string, idx: number) => (
                              <Chip key={idx} label={interest} size="small" variant="outlined" />
                            ))}
                            {persona.policy_interests.length > 2 && (
                              <Chip label={`+${persona.policy_interests.length - 2}`} size="small" variant="outlined" />
                            )}
                          </Box>
                        ) : 'N/A'}
                      </TableCell>
                      <TableCell>{persona.created_at ? new Date(persona.created_at).toLocaleDateString() : 'N/A'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {activeTab === 1 && (
            <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
              <Table stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>ID</TableCell>
                    <TableCell>Document ID</TableCell>
                    <TableCell>Title</TableCell>
                    <TableCell>Agency</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Posted</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {documents.map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell>{doc.id}</TableCell>
                      <TableCell>{doc.document_id}</TableCell>
                      <TableCell sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {doc.title}
                      </TableCell>
                      <TableCell>{doc.agency_id}</TableCell>
                      <TableCell>{doc.document_type || 'N/A'}</TableCell>
                      <TableCell>{doc.posted_date ? new Date(doc.posted_date).toLocaleDateString() : 'N/A'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {activeTab === 2 && (
            <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
              <Table stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>ID</TableCell>
                    <TableCell>Persona ID</TableCell>
                    <TableCell>Document ID</TableCell>
                    <TableCell>Title</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Created</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {comments.map((comment) => (
                    <TableRow key={comment.id}>
                      <TableCell>{comment.id}</TableCell>
                      <TableCell>{comment.persona_id}</TableCell>
                      <TableCell>{comment.document_id}</TableCell>
                      <TableCell sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {comment.title || 'N/A'}
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={comment.status} 
                          size="small" 
                          color={comment.status === 'draft' ? 'default' : 'primary'}
                        />
                      </TableCell>
                      <TableCell>{comment.created_at ? new Date(comment.created_at).toLocaleDateString() : 'N/A'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowTableViewDialog(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}



