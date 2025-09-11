import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Grid,
  Alert,
  Divider,
  Container,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Stack,
  Card,
  CardContent
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import PersonIcon from '@mui/icons-material/Person';
import TargetIcon from '@mui/icons-material/GpsFixed';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import NatureIcon from '@mui/icons-material/Nature';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import ComputerIcon from '@mui/icons-material/Computer';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import SchoolIcon from '@mui/icons-material/School';
import SecurityIcon from '@mui/icons-material/Security';
import WarningIcon from '@mui/icons-material/Warning';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

type PersonaData = {
  name?: string;
  role?: string;
  // Demographic & Geographic Context
  location?: string;
  ageRange?: string;
  employmentStatus?: string;
  industry?: string;
  // Policy Interest Categories
  policyInterests?: string[];
  // Regulatory Focus Areas
  preferredAgencies?: string[];
  impactLevel?: string[];
  // Additional Context
  additionalContext?: string;
  _saved_at?: string;
};

export function Persona() {
  const [persona, setPersona] = useState<PersonaData>({ role: '' });
  const [saving, setSaving] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  
  // Embedding generation state
  const [isGeneratingEmbedding, setIsGeneratingEmbedding] = useState(false);
  const [embeddingError, setEmbeddingError] = useState<string | null>(null);
  
  // Policy interest categories
  const [selectedPolicyInterests, setSelectedPolicyInterests] = useState<string[]>([]);
  const [selectedAgencies, setSelectedAgencies] = useState<string[]>([]);
  const [selectedImpactLevels, setSelectedImpactLevels] = useState<string[]>([]);

  // Load saved persona data on component mount
  useEffect(() => {
    loadSavedPersona();
  }, []);

  const loadSavedPersona = async () => {
    try {
      const response = await fetch('http://localhost:8001/personas');
      if (response.ok) {
        const personas = await response.json();
        if (personas.length > 0) {
          // Use the most recent persona
          const latestPersona = personas[0];
          setPersona({
            name: latestPersona.name,
            role: latestPersona.role,
            location: latestPersona.location,
            ageRange: latestPersona.age_range,
            employmentStatus: latestPersona.employment_status,
            industry: latestPersona.industry,
            additionalContext: latestPersona.additional_context
          });
          setSelectedPolicyInterests(latestPersona.policy_interests || []);
          setSelectedAgencies(latestPersona.preferred_agencies || []);
          setSelectedImpactLevels(latestPersona.impact_level || []);
          setLastSaved(latestPersona.updated_at || null);
          console.log('Loaded saved persona data:', latestPersona);
        }
      }
    } catch (err) {
      console.error('Error loading saved persona data:', err);
    }
  };

  const clearSavedPersona = async () => {
    try {
      // For now, just clear the form - we could add a delete endpoint later
      setPersona({ role: '' });
      setSelectedPolicyInterests([]);
      setSelectedAgencies([]);
      setSelectedImpactLevels([]);
      setLastSaved(null);
      setIsDirty(false);
      console.log('Cleared persona form data');
    } catch (err) {
      console.error('Error clearing persona data:', err);
    }
  };

  // Utility function to prepare persona data for embedding
  const preparePersonaForEmbedding = (personaData: PersonaData): string => {
    if (!personaData) return '';
    
    const parts = [];
    
    // Basic information
    if (personaData.name) parts.push(`Name: ${personaData.name}`);
    if (personaData.role) parts.push(`Role: ${personaData.role}`);
    if (personaData.location) parts.push(`Location: ${personaData.location}`);
    if (personaData.ageRange) parts.push(`Age Range: ${personaData.ageRange}`);
    if (personaData.employmentStatus) parts.push(`Employment Status: ${personaData.employmentStatus}`);
    if (personaData.industry) parts.push(`Industry: ${personaData.industry}`);
    
    // Policy interests
    if (selectedPolicyInterests && selectedPolicyInterests.length > 0) {
      parts.push(`Policy Interests: ${selectedPolicyInterests.join(', ')}`);
    }
    
    // Preferred agencies
    if (selectedAgencies && selectedAgencies.length > 0) {
      parts.push(`Preferred Agencies: ${selectedAgencies.join(', ')}`);
    }
    
    // Impact level
    if (selectedImpactLevels && selectedImpactLevels.length > 0) {
      parts.push(`Impact Level: ${selectedImpactLevels.join(', ')}`);
    }
    
    // Additional context
    if (personaData.additionalContext) {
      parts.push(`Additional Context: ${personaData.additionalContext}`);
    }
    
    // Create a comprehensive description
    const personaDescription = parts.join('. ');
    
    return personaDescription;
  };

  // Function to generate persona embedding using remote model
  const generatePersonaEmbedding = async (personaData: PersonaData): Promise<number[]> => {
    const personaText = preparePersonaForEmbedding(personaData);
    
    if (!personaText.trim()) {
      throw new Error('No persona data available for embedding');
    }
    
    // Get remote embedding configuration from localStorage (same format as Settings.tsx)
    let remoteEmbeddingHost = '10.0.4.52';
    let remoteEmbeddingPort = '11434';
    let remoteEmbeddingModel = '';
    
    try {
      const saved = localStorage.getItem('navi-remote-embedding-config');
      if (saved) {
        const config = JSON.parse(saved);
        if (config.host) remoteEmbeddingHost = config.host;
        if (config.port) remoteEmbeddingPort = config.port;
        if (config.model) remoteEmbeddingModel = config.model;
      }
    } catch (err) {
      console.error('Error loading remote embedding config:', err);
    }
    
    if (!remoteEmbeddingModel) {
      throw new Error('Remote embedding model not configured. Please set the model in Settings.');
    }
    
    const url = `http://${remoteEmbeddingHost}:${remoteEmbeddingPort}/api/embeddings`;
    const payload = {
      model: remoteEmbeddingModel,
      prompt: personaText
    };

    console.log('=== GENERATING PERSONA EMBEDDING ===');
    console.log(`Persona text: ${personaText.substring(0, 200)}...`);
    console.log(`URL: ${url}`);
    console.log(`Model: ${remoteEmbeddingModel}`);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    
    if (!result.embedding || !Array.isArray(result.embedding)) {
      throw new Error('Invalid embedding response format');
    }

    console.log(`Generated embedding with ${result.embedding.length} dimensions`);
    return result.embedding;
  };

  async function save() {
    setErrorText(null);
    setEmbeddingError(null);
    setSaving(true);
    setIsGeneratingEmbedding(true);
    
    try {
      const personaData = {
        name: persona.name,
        role: persona.role,
        location: persona.location,
        age_range: persona.ageRange,
        employment_status: persona.employmentStatus,
        industry: persona.industry,
        policy_interests: selectedPolicyInterests,
        preferred_agencies: selectedAgencies,
        impact_level: selectedImpactLevels,
        additional_context: persona.additionalContext
      };

      // Check if we have existing personas to determine if this is an update or create
      const existingResponse = await fetch('http://localhost:8001/personas');
      let response;
      let savedPersona;
      
      if (existingResponse.ok) {
        const existingPersonas = await existingResponse.json();
        if (existingPersonas.length > 0) {
          // Update existing persona
          response = await fetch(`http://localhost:8001/personas/${existingPersonas[0].id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(personaData)
          });
        } else {
          // Create new persona
          response = await fetch('http://localhost:8001/personas', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(personaData)
          });
        }
      } else {
        // Create new persona if we can't check existing ones
        response = await fetch('http://localhost:8001/personas', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(personaData)
        });
      }

      if (!response.ok) {
        throw new Error(`Failed to save persona: ${response.statusText}`);
      }

      savedPersona = await response.json();
      console.log('Persona data saved successfully:', savedPersona);

      // Generate and store embedding
      console.log('=== GENERATING PERSONA EMBEDDING ===');
      try {
        const embedding = await generatePersonaEmbedding(persona);
        
        // Store the embedding in the database
        const embeddingResponse = await fetch('http://localhost:8001/personas/embedding', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            persona_id: savedPersona.id,
            embedding: embedding
          })
        });
        
        if (embeddingResponse.ok) {
          const embeddingResult = await embeddingResponse.json();
          console.log(`Successfully stored persona embedding in database: ${embeddingResult.embedding_dimensions} dimensions`);
          console.log('Persona embedding generation and storage complete!');
        } else {
          const errorResult = await embeddingResponse.json();
          throw new Error(`Failed to store embedding: ${errorResult.error || 'Unknown error'}`);
        }
      } catch (embeddingErr) {
        const errorMessage = embeddingErr instanceof Error ? embeddingErr.message : 'Unknown error';
        console.error(`Error generating persona embedding: ${errorMessage}`);
        setEmbeddingError(errorMessage);
        // Don't throw here - we still want to save the persona data even if embedding fails
      }
      
      setIsDirty(false);
      setLastSaved(savedPersona.updated_at || savedPersona.created_at);
    } catch (e: any) {
      console.error('Error saving persona data:', e);
      setErrorText(String(e?.message || e));
    } finally {
      setSaving(false);
      setIsGeneratingEmbedding(false);
    }
  }

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Paper 
        elevation={0} 
        sx={{ 
          p: 3, 
          borderBottom: '1px solid #333', 
          background: '#1A1A1A',
          flexShrink: 0
        }}
      >
        <Typography variant="h4" component="h1" sx={{ margin: 0, color: '#FAFAFA' }}>
          Profile
        </Typography>
        <Typography variant="body2" sx={{ color: '#B8B8B8', marginTop: 1 }}>
          Configure your civic profile
        </Typography>
      </Paper>

      {/* Scrollable Content */}
      <Box 
        sx={{ 
          flex: 1, 
          overflow: 'auto', 
          p: 3,
          '&::-webkit-scrollbar': {
            width: '8px',
          },
          '&::-webkit-scrollbar-track': {
            background: '#1A1A1A',
          },
          '&::-webkit-scrollbar-thumb': {
            background: '#333',
            borderRadius: '4px',
          },
          '&::-webkit-scrollbar-thumb:hover': {
            background: '#555',
          },
        }}
      >
        <Container maxWidth="md">
          <Paper elevation={0} sx={{ p: 4, background: '#1A1A1A', border: '1px solid #333' }}>
            <Typography variant="h5" sx={{ color: '#FAFAFA', marginBottom: 1 }}>
              Civic Engagement Profile
            </Typography>
            <Typography variant="body2" sx={{ color: '#B8B8B8', marginBottom: 3 }}>
              Help us understand your civic context and policy interests
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {/* Basic Information Accordion */}
              <Accordion 
                defaultExpanded
                sx={{ 
                  background: '#1A1A1A', 
                  border: '1px solid #333',
                  '&:before': { display: 'none' },
                  '&.Mui-expanded': { margin: 0 }
                }}
              >
                <AccordionSummary
                  expandIcon={<ExpandMoreIcon sx={{ color: '#FAFAFA' }} />}
                  sx={{ 
                    background: '#2A2A2A',
                    borderBottom: '1px solid #333',
                    '&.Mui-expanded': { minHeight: 'auto' }
                  }}
                >
                  <Typography variant="h6" sx={{ color: '#FAFAFA', display: 'flex', alignItems: 'center', gap: 1 }}>
                    <PersonIcon /> Basic Information
                  </Typography>
                </AccordionSummary>
                <AccordionDetails sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <TextField
                      label="Display Name (Optional)"
                      value={persona.name || ''} 
                      onChange={(e) => { setPersona({ ...persona, name: e.target.value }); setIsDirty(true); }} 
                      placeholder="How you'd like to be addressed" 
                      fullWidth
                      variant="outlined"
                    />

                    <TextField
                      label="Primary Role"
                      value={persona.role || ''} 
                      onChange={(e) => { setPersona({ ...persona, role: e.target.value }); setIsDirty(true); }} 
                      placeholder="e.g., Small Business Owner, Student, Advocate" 
                      fullWidth
                      variant="outlined"
                    />

                    <TextField
                      label="Location/State"
                      value={persona.location || ''}
                      onChange={(e) => { setPersona({ ...persona, location: e.target.value }); setIsDirty(true); }}
                      placeholder="e.g., California, New York, Texas"
                      fullWidth
                      variant="outlined"
                    />

                    <FormControl fullWidth>
                      <InputLabel>Age Range</InputLabel>
                      <Select
                        value={persona.ageRange || ''}
                        onChange={(e) => { setPersona({ ...persona, ageRange: e.target.value }); setIsDirty(true); }}
                        label="Age Range"
                      >
                        <MenuItem value="">Select age range</MenuItem>
                        <MenuItem value="18-24">18-24</MenuItem>
                        <MenuItem value="25-34">25-34</MenuItem>
                        <MenuItem value="35-44">35-44</MenuItem>
                        <MenuItem value="45-54">45-54</MenuItem>
                        <MenuItem value="55-64">55-64</MenuItem>
                        <MenuItem value="65+">65+</MenuItem>
                      </Select>
                    </FormControl>

                    <FormControl fullWidth>
                      <InputLabel>Employment Status</InputLabel>
                      <Select
                        value={persona.employmentStatus || ''}
                        onChange={(e) => { setPersona({ ...persona, employmentStatus: e.target.value }); setIsDirty(true); }}
                        label="Employment Status"
                      >
                        <MenuItem value="">Select employment status</MenuItem>
                        <MenuItem value="Student">Student</MenuItem>
                        <MenuItem value="Employed">Employed</MenuItem>
                        <MenuItem value="Self-employed">Self-employed</MenuItem>
                        <MenuItem value="Unemployed">Unemployed</MenuItem>
                        <MenuItem value="Retired">Retired</MenuItem>
                        <MenuItem value="Other">Other</MenuItem>
                      </Select>
                    </FormControl>

                    <TextField
                      label="Industry/Profession (Be Specific)"
                      value={persona.industry || ''}
                      onChange={(e) => { setPersona({ ...persona, industry: e.target.value }); setIsDirty(true); }}
                      placeholder="e.g., 'Small Business SaaS Software' instead of 'Technology', 'Telehealth Services' instead of 'Healthcare'"
                      fullWidth
                      variant="outlined"
                      helperText="Avoid broad terms like 'Technology' or 'Healthcare' - be specific about your niche or specialization"
                    />

                    <TextField
                      label="Personal Context & Regulatory Focus"
                      value={persona.additionalContext || ''}
                      onChange={(e) => { setPersona({ ...persona, additionalContext: e.target.value }); setIsDirty(true); }}
                      placeholder="Examples:
• I run a small tech startup and need to understand data privacy regulations for my SaaS product
• I'm a healthcare provider implementing telehealth and need to know HIPAA compliance requirements
• I'm a manufacturer concerned about new EPA emissions standards affecting my facility
• I'm a consumer advocate focused on protecting vulnerable populations from predatory lending
• I'm a student studying environmental policy and want to track climate change regulations
• I'm a small business owner in the food industry and need to understand FDA labeling requirements"
                      fullWidth
                      multiline
                      rows={6}
                      variant="outlined"
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          backgroundColor: '#1A1A1A',
                        }
                      }}
                      helperText="CRITICAL: Be very specific about your situation, needs, and regulatory concerns. This is the most important field for accurate document matching."
                    />
                  </Box>
                </AccordionDetails>
              </Accordion>

              {/* Policy Interest Categories Accordion */}
              <Accordion 
                sx={{ 
                  background: '#1A1A1A', 
                  border: '1px solid #333',
                  '&:before': { display: 'none' },
                  '&.Mui-expanded': { margin: 0 }
                }}
              >
                <AccordionSummary
                  expandIcon={<ExpandMoreIcon sx={{ color: '#FAFAFA' }} />}
                  sx={{ 
                    background: '#2A2A2A',
                    borderBottom: '1px solid #333',
                    '&.Mui-expanded': { minHeight: 'auto' }
                  }}
                >
                  <Typography variant="h6" sx={{ color: '#FAFAFA', display: 'flex', alignItems: 'center', gap: 1 }}>
                    <TargetIcon /> Policy Interest Areas
                  </Typography>
                </AccordionSummary>
                <AccordionDetails sx={{ p: 3 }}>
                  <Typography variant="body2" sx={{ color: '#B8B8B8', marginBottom: 3 }}>
                    Click on topics that interest you. Be specific to get better matches!
                  </Typography>
                  
                  {/* Selected Interests Display */}
                  {selectedPolicyInterests.length > 0 && (
                    <Box sx={{ mb: 3 }}>
                      <Typography variant="subtitle2" sx={{ color: '#FAFAFA', mb: 1 }}>
                        Selected ({selectedPolicyInterests.length}):
                      </Typography>
                      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                        {selectedPolicyInterests.map((interest) => (
                          <Chip
                            key={interest}
                            label={interest}
                            onDelete={() => {
                              setSelectedPolicyInterests(selectedPolicyInterests.filter(i => i !== interest));
                              setIsDirty(true);
                            }}
                            sx={{
                              backgroundColor: '#2A4A2A',
                              color: '#FAFAFA',
                              '& .MuiChip-deleteIcon': {
                                color: '#B8B8B8',
                                '&:hover': {
                                  color: '#FAFAFA',
                                },
                              },
                            }}
                          />
                        ))}
                      </Stack>
                    </Box>
                  )}

                  {/* Policy Interest Categories */}
                  <Grid container spacing={2}>
                    {/* Environmental & Energy */}
                    <Grid item xs={12} md={6}>
                      <Card sx={{ backgroundColor: '#2A2A2A', border: '1px solid #444' }}>
                        <CardContent sx={{ p: 2 }}>
                          <Typography variant="subtitle1" sx={{ color: '#FAFAFA', fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                            <NatureIcon /> Environmental & Energy
                          </Typography>
                          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                            {[
                              'Climate Change & Carbon Emissions',
                              'Renewable Energy Standards',
                              'Water Quality & Pollution',
                              'Air Quality Regulations',
                              'Waste Management & Recycling',
                              'Nuclear Energy & Safety',
                              'Electric Grid & Power Systems',
                              'Oil & Gas Pipeline Safety'
                            ].map((interest) => (
                              <Chip
                                key={interest}
                                label={interest}
                                onClick={() => {
                                  if (selectedPolicyInterests.includes(interest)) {
                                    setSelectedPolicyInterests(selectedPolicyInterests.filter(i => i !== interest));
                                  } else {
                                    setSelectedPolicyInterests([...selectedPolicyInterests, interest]);
                                  }
                                  setIsDirty(true);
                                }}
                                variant={selectedPolicyInterests.includes(interest) ? "filled" : "outlined"}
                                sx={{
                                  backgroundColor: selectedPolicyInterests.includes(interest) ? '#2A4A2A' : 'transparent',
                                  color: '#FAFAFA',
                                  borderColor: '#666',
                                  fontSize: '0.75rem',
                                  '&:hover': {
                                    backgroundColor: selectedPolicyInterests.includes(interest) ? '#3A5A3A' : '#333',
                                  },
                                }}
                              />
                            ))}
                          </Stack>
                        </CardContent>
                      </Card>
                    </Grid>

                    {/* Healthcare & Medical */}
                    <Grid item xs={12} md={6}>
                      <Card sx={{ backgroundColor: '#2A2A2A', border: '1px solid #444' }}>
                        <CardContent sx={{ p: 2 }}>
                          <Typography variant="subtitle1" sx={{ color: '#FAFAFA', fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                            <LocalHospitalIcon /> Healthcare & Medical
                          </Typography>
                          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                            {[
                              'Healthcare Data Privacy (HIPAA)',
                              'Drug Approval & Safety',
                              'Medical Device Regulations',
                              'Telehealth & Digital Health'
                            ].map((interest) => (
                              <Chip
                                key={interest}
                                label={interest}
                                onClick={() => {
                                  if (selectedPolicyInterests.includes(interest)) {
                                    setSelectedPolicyInterests(selectedPolicyInterests.filter(i => i !== interest));
                                  } else {
                                    setSelectedPolicyInterests([...selectedPolicyInterests, interest]);
                                  }
                                  setIsDirty(true);
                                }}
                                variant={selectedPolicyInterests.includes(interest) ? "filled" : "outlined"}
                                sx={{
                                  backgroundColor: selectedPolicyInterests.includes(interest) ? '#2A4A2A' : 'transparent',
                                  color: '#FAFAFA',
                                  borderColor: '#666',
                                  fontSize: '0.75rem',
                                  '&:hover': {
                                    backgroundColor: selectedPolicyInterests.includes(interest) ? '#3A5A3A' : '#333',
                                  },
                                }}
                              />
                            ))}
                          </Stack>
                        </CardContent>
                      </Card>
                    </Grid>

                    {/* Technology & Digital */}
                    <Grid item xs={12} md={6}>
                      <Card sx={{ backgroundColor: '#2A2A2A', border: '1px solid #444' }}>
                        <CardContent sx={{ p: 2 }}>
                          <Typography variant="subtitle1" sx={{ color: '#FAFAFA', fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                            <ComputerIcon /> Technology & Digital
                          </Typography>
                          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                            {[
                              'AI & Machine Learning Regulation',
                              'Data Privacy & Protection',
                              'Cybersecurity Standards',
                              'Social Media & Content Moderation',
                              'Cryptocurrency & Digital Assets',
                              'Cybersecurity & Critical Infrastructure'
                            ].map((interest) => (
                              <Chip
                                key={interest}
                                label={interest}
                                onClick={() => {
                                  if (selectedPolicyInterests.includes(interest)) {
                                    setSelectedPolicyInterests(selectedPolicyInterests.filter(i => i !== interest));
                                  } else {
                                    setSelectedPolicyInterests([...selectedPolicyInterests, interest]);
                                  }
                                  setIsDirty(true);
                                }}
                                variant={selectedPolicyInterests.includes(interest) ? "filled" : "outlined"}
                                sx={{
                                  backgroundColor: selectedPolicyInterests.includes(interest) ? '#2A4A2A' : 'transparent',
                                  color: '#FAFAFA',
                                  borderColor: '#666',
                                  fontSize: '0.75rem',
                                  '&:hover': {
                                    backgroundColor: selectedPolicyInterests.includes(interest) ? '#3A5A3A' : '#333',
                                  },
                                }}
                              />
                            ))}
                          </Stack>
                        </CardContent>
                      </Card>
                    </Grid>

                    {/* Financial & Banking */}
                    <Grid item xs={12} md={6}>
                      <Card sx={{ backgroundColor: '#2A2A2A', border: '1px solid #444' }}>
                        <CardContent sx={{ p: 2 }}>
                          <Typography variant="subtitle1" sx={{ color: '#FAFAFA', fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                            <AttachMoneyIcon /> Financial & Banking
                          </Typography>
                          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                            {[
                              'Banking & Financial Services',
                              'Consumer Credit & Lending',
                              'Investment & Securities'
                            ].map((interest) => (
                              <Chip
                                key={interest}
                                label={interest}
                                onClick={() => {
                                  if (selectedPolicyInterests.includes(interest)) {
                                    setSelectedPolicyInterests(selectedPolicyInterests.filter(i => i !== interest));
                                  } else {
                                    setSelectedPolicyInterests([...selectedPolicyInterests, interest]);
                                  }
                                  setIsDirty(true);
                                }}
                                variant={selectedPolicyInterests.includes(interest) ? "filled" : "outlined"}
                                sx={{
                                  backgroundColor: selectedPolicyInterests.includes(interest) ? '#2A4A2A' : 'transparent',
                                  color: '#FAFAFA',
                                  borderColor: '#666',
                                  fontSize: '0.75rem',
                                  '&:hover': {
                                    backgroundColor: selectedPolicyInterests.includes(interest) ? '#3A5A3A' : '#333',
                                  },
                                }}
                              />
                            ))}
                          </Stack>
                        </CardContent>
                      </Card>
                    </Grid>

                    {/* Transportation & Infrastructure */}
                    <Grid item xs={12} md={6}>
                      <Card sx={{ backgroundColor: '#2A2A2A', border: '1px solid #444' }}>
                        <CardContent sx={{ p: 2 }}>
                          <Typography variant="subtitle1" sx={{ color: '#FAFAFA', fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                            <DirectionsCarIcon /> Transportation & Infrastructure
                          </Typography>
                          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                            {[
                              'Aviation Safety & Operations',
                              'Highway & Road Safety',
                              'Public Transportation',
                              'Railroad Regulations'
                            ].map((interest) => (
                              <Chip
                                key={interest}
                                label={interest}
                                onClick={() => {
                                  if (selectedPolicyInterests.includes(interest)) {
                                    setSelectedPolicyInterests(selectedPolicyInterests.filter(i => i !== interest));
                                  } else {
                                    setSelectedPolicyInterests([...selectedPolicyInterests, interest]);
                                  }
                                  setIsDirty(true);
                                }}
                                variant={selectedPolicyInterests.includes(interest) ? "filled" : "outlined"}
                                sx={{
                                  backgroundColor: selectedPolicyInterests.includes(interest) ? '#2A4A2A' : 'transparent',
                                  color: '#FAFAFA',
                                  borderColor: '#666',
                                  fontSize: '0.75rem',
                                  '&:hover': {
                                    backgroundColor: selectedPolicyInterests.includes(interest) ? '#3A5A3A' : '#333',
                                  },
                                }}
                              />
                            ))}
                          </Stack>
                        </CardContent>
                      </Card>
                    </Grid>

                    {/* Education & Labor */}
                    <Grid item xs={12} md={6}>
                      <Card sx={{ backgroundColor: '#2A2A2A', border: '1px solid #444' }}>
                        <CardContent sx={{ p: 2 }}>
                          <Typography variant="subtitle1" sx={{ color: '#FAFAFA', fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                            <SchoolIcon /> Education & Labor
                          </Typography>
                          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                            {[
                              'Student Loan & Education Finance',
                              'School Safety & Security',
                              'Higher Education Accreditation',
                              'Workplace Safety (OSHA)',
                              'Minimum Wage & Labor Standards',
                              'Employee Benefits & Retirement'
                            ].map((interest) => (
                              <Chip
                                key={interest}
                                label={interest}
                                onClick={() => {
                                  if (selectedPolicyInterests.includes(interest)) {
                                    setSelectedPolicyInterests(selectedPolicyInterests.filter(i => i !== interest));
                                  } else {
                                    setSelectedPolicyInterests([...selectedPolicyInterests, interest]);
                                  }
                                  setIsDirty(true);
                                }}
                                variant={selectedPolicyInterests.includes(interest) ? "filled" : "outlined"}
                                sx={{
                                  backgroundColor: selectedPolicyInterests.includes(interest) ? '#2A4A2A' : 'transparent',
                                  color: '#FAFAFA',
                                  borderColor: '#666',
                                  fontSize: '0.75rem',
                                  '&:hover': {
                                    backgroundColor: selectedPolicyInterests.includes(interest) ? '#3A5A3A' : '#333',
                                  },
                                }}
                              />
                            ))}
                          </Stack>
                        </CardContent>
                      </Card>
                    </Grid>

                    {/* Consumer & Safety */}
                    <Grid item xs={12} md={6}>
                      <Card sx={{ backgroundColor: '#2A2A2A', border: '1px solid #444' }}>
                        <CardContent sx={{ p: 2 }}>
                          <Typography variant="subtitle1" sx={{ color: '#FAFAFA', fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                            <SecurityIcon /> Consumer & Safety
                          </Typography>
                          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                            {[
                              'Product Safety & Recalls',
                              'Food Safety & Labeling',
                              'Advertising & Marketing Practices'
                            ].map((interest) => (
                              <Chip
                                key={interest}
                                label={interest}
                                onClick={() => {
                                  if (selectedPolicyInterests.includes(interest)) {
                                    setSelectedPolicyInterests(selectedPolicyInterests.filter(i => i !== interest));
                                  } else {
                                    setSelectedPolicyInterests([...selectedPolicyInterests, interest]);
                                  }
                                  setIsDirty(true);
                                }}
                                variant={selectedPolicyInterests.includes(interest) ? "filled" : "outlined"}
                                sx={{
                                  backgroundColor: selectedPolicyInterests.includes(interest) ? '#2A4A2A' : 'transparent',
                                  color: '#FAFAFA',
                                  borderColor: '#666',
                                  fontSize: '0.75rem',
                                  '&:hover': {
                                    backgroundColor: selectedPolicyInterests.includes(interest) ? '#3A5A3A' : '#333',
                                  },
                                }}
                              />
                            ))}
                          </Stack>
                        </CardContent>
                      </Card>
                    </Grid>

                    {/* Security & Immigration */}
                    <Grid item xs={12} md={6}>
                      <Card sx={{ backgroundColor: '#2A2A2A', border: '1px solid #444' }}>
                        <CardContent sx={{ p: 2 }}>
                          <Typography variant="subtitle1" sx={{ color: '#FAFAFA', fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                            <SecurityIcon /> Security & Immigration
                          </Typography>
                          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                            {[
                              'Border Security & Immigration'
                            ].map((interest) => (
                              <Chip
                                key={interest}
                                label={interest}
                                onClick={() => {
                                  if (selectedPolicyInterests.includes(interest)) {
                                    setSelectedPolicyInterests(selectedPolicyInterests.filter(i => i !== interest));
                                  } else {
                                    setSelectedPolicyInterests([...selectedPolicyInterests, interest]);
                                  }
                                  setIsDirty(true);
                                }}
                                variant={selectedPolicyInterests.includes(interest) ? "filled" : "outlined"}
                                sx={{
                                  backgroundColor: selectedPolicyInterests.includes(interest) ? '#2A4A2A' : 'transparent',
                                  color: '#FAFAFA',
                                  borderColor: '#666',
                                  fontSize: '0.75rem',
                                  '&:hover': {
                                    backgroundColor: selectedPolicyInterests.includes(interest) ? '#3A5A3A' : '#333',
                                  },
                                }}
                              />
                            ))}
                          </Stack>
                        </CardContent>
                      </Card>
                    </Grid>
                  </Grid>
                  
                  <Typography variant="body2" sx={{ color: '#B8B8B8', marginTop: 3, fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: 1 }}>
                    <LightbulbIcon /> Tip: Select only the areas you're genuinely interested in. Too many broad categories can lead to irrelevant matches.
                  </Typography>
                </AccordionDetails>
              </Accordion>

              {/* Regulatory Focus Areas Accordion */}
              <Accordion 
                sx={{ 
                  background: '#1A1A1A', 
                  border: '1px solid #333',
                  '&:before': { display: 'none' },
                  '&.Mui-expanded': { margin: 0 }
                }}
              >
                <AccordionSummary
                  expandIcon={<ExpandMoreIcon sx={{ color: '#FAFAFA' }} />}
                  sx={{ 
                    background: '#2A2A2A',
                    borderBottom: '1px solid #333',
                    '&.Mui-expanded': { minHeight: 'auto' }
                  }}
                >
                  <Typography variant="h6" sx={{ color: '#FAFAFA', display: 'flex', alignItems: 'center', gap: 1 }}>
                    <AccountBalanceIcon /> Agencies
                  </Typography>
                </AccordionSummary>
                <AccordionDetails sx={{ p: 3 }}>
                  <Typography variant="body2" sx={{ color: '#B8B8B8', marginBottom: 3 }}>
                    Click on agencies you want to prioritize for document matching
                  </Typography>

                  {/* Selected Agencies Display */}
                  {selectedAgencies.length > 0 && (
                    <Box sx={{ mb: 3 }}>
                      <Typography variant="subtitle2" sx={{ color: '#FAFAFA', mb: 1 }}>
                        Selected Agencies ({selectedAgencies.length}):
                      </Typography>
                      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                        {selectedAgencies.map((agency) => (
                          <Chip
                            key={agency}
                            label={agency}
                            onDelete={() => {
                              setSelectedAgencies(selectedAgencies.filter(a => a !== agency));
                              setIsDirty(true);
                            }}
                            sx={{
                              backgroundColor: '#2A4A2A',
                              color: '#FAFAFA',
                              fontSize: '0.75rem',
                              '& .MuiChip-deleteIcon': {
                                color: '#B8B8B8',
                                '&:hover': {
                                  color: '#FAFAFA',
                                },
                              },
                            }}
                          />
                        ))}
                      </Stack>
                    </Box>
                  )}

                  {/* Agency Categories */}
                  <Grid container spacing={2}>
                    {/* Health & Safety */}
                    <Grid item xs={12} md={6}>
                      <Card sx={{ backgroundColor: '#2A2A2A', border: '1px solid #444' }}>
                        <CardContent sx={{ p: 2 }}>
                          <Typography variant="subtitle1" sx={{ color: '#FAFAFA', fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                            <LocalHospitalIcon /> Health & Safety
                          </Typography>
                          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                            {[
                              'Food and Drug Administration (FDA)',
                              'Department of Health and Human Services (HHS)',
                              'Centers for Medicare & Medicaid Services (CMS)',
                              'Centers for Disease Control and Prevention (CDC)',
                              'National Institutes of Health (NIH)',
                              'Health Resources and Services Administration (HRSA)',
                              'Substance Abuse and Mental Health Services Administration (SAMHSA)',
                              'Agency for Healthcare Research and Quality (AHRQ)',
                              'Indian Health Service (IHS)'
                            ].map((agency) => (
                              <Chip
                                key={agency}
                                label={agency}
                                onClick={() => {
                                  if (selectedAgencies.includes(agency)) {
                                    setSelectedAgencies(selectedAgencies.filter(a => a !== agency));
                                  } else {
                                    setSelectedAgencies([...selectedAgencies, agency]);
                                  }
                                  setIsDirty(true);
                                }}
                                variant={selectedAgencies.includes(agency) ? "filled" : "outlined"}
                                sx={{
                                  backgroundColor: selectedAgencies.includes(agency) ? '#2A4A2A' : 'transparent',
                                  color: '#FAFAFA',
                                  borderColor: '#666',
                                  fontSize: '0.7rem',
                                  '&:hover': {
                                    backgroundColor: selectedAgencies.includes(agency) ? '#3A5A3A' : '#333',
                                  },
                                }}
                              />
                            ))}
                          </Stack>
                        </CardContent>
                      </Card>
                    </Grid>

                    {/* Environment & Energy */}
                    <Grid item xs={12} md={6}>
                      <Card sx={{ backgroundColor: '#2A2A2A', border: '1px solid #444' }}>
                        <CardContent sx={{ p: 2 }}>
                          <Typography variant="subtitle1" sx={{ color: '#FAFAFA', fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                            <NatureIcon /> Environment & Energy
                          </Typography>
                          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                            {[
                              'Environmental Protection Agency (EPA)',
                              'Department of Energy (DOE)',
                              'Bureau of Land Management (BLM)',
                              'Fish and Wildlife Service (FWS)',
                              'National Park Service (NPS)',
                              'Forest Service (USFS)',
                              'Nuclear Regulatory Commission (NRC)',
                              'Federal Energy Regulatory Commission (FERC)',
                              'Bureau of Ocean Energy Management (BOEM)',
                              'Bureau of Safety and Environmental Enforcement (BSEE)',
                              'U.S. Geological Survey (USGS)',
                              'National Oceanic and Atmospheric Administration (NOAA)'
                            ].map((agency) => (
                              <Chip
                                key={agency}
                                label={agency}
                                onClick={() => {
                                  if (selectedAgencies.includes(agency)) {
                                    setSelectedAgencies(selectedAgencies.filter(a => a !== agency));
                                  } else {
                                    setSelectedAgencies([...selectedAgencies, agency]);
                                  }
                                  setIsDirty(true);
                                }}
                                variant={selectedAgencies.includes(agency) ? "filled" : "outlined"}
                                sx={{
                                  backgroundColor: selectedAgencies.includes(agency) ? '#2A4A2A' : 'transparent',
                                  color: '#FAFAFA',
                                  borderColor: '#666',
                                  fontSize: '0.7rem',
                                  '&:hover': {
                                    backgroundColor: selectedAgencies.includes(agency) ? '#3A5A3A' : '#333',
                                  },
                                }}
                              />
                            ))}
                          </Stack>
                        </CardContent>
                      </Card>
                    </Grid>

                    {/* Technology & Communications */}
                    <Grid item xs={12} md={6}>
                      <Card sx={{ backgroundColor: '#2A2A2A', border: '1px solid #444' }}>
                        <CardContent sx={{ p: 2 }}>
                          <Typography variant="subtitle1" sx={{ color: '#FAFAFA', fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                            <ComputerIcon /> Technology & Communications
                          </Typography>
                          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                            {[
                              'Federal Communications Commission (FCC)',
                              'National Telecommunications and Information Administration (NTIA)',
                              'Federal Trade Commission (FTC)',
                              'National Institute of Standards and Technology (NIST)',
                              'Cybersecurity and Infrastructure Security Agency (CISA)',
                              'National Science Foundation (NSF)',
                              'Defense Advanced Research Projects Agency (DARPA)'
                            ].map((agency) => (
                              <Chip
                                key={agency}
                                label={agency}
                                onClick={() => {
                                  if (selectedAgencies.includes(agency)) {
                                    setSelectedAgencies(selectedAgencies.filter(a => a !== agency));
                                  } else {
                                    setSelectedAgencies([...selectedAgencies, agency]);
                                  }
                                  setIsDirty(true);
                                }}
                                variant={selectedAgencies.includes(agency) ? "filled" : "outlined"}
                                sx={{
                                  backgroundColor: selectedAgencies.includes(agency) ? '#2A4A2A' : 'transparent',
                                  color: '#FAFAFA',
                                  borderColor: '#666',
                                  fontSize: '0.7rem',
                                  '&:hover': {
                                    backgroundColor: selectedAgencies.includes(agency) ? '#3A5A3A' : '#333',
                                  },
                                }}
                              />
                            ))}
                          </Stack>
                        </CardContent>
                      </Card>
                    </Grid>

                    {/* Financial & Consumer */}
                    <Grid item xs={12} md={6}>
                      <Card sx={{ backgroundColor: '#2A2A2A', border: '1px solid #444' }}>
                        <CardContent sx={{ p: 2 }}>
                          <Typography variant="subtitle1" sx={{ color: '#FAFAFA', fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                            <AttachMoneyIcon /> Financial & Consumer
                          </Typography>
                          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                            {[
                              'Securities and Exchange Commission (SEC)',
                              'Consumer Financial Protection Bureau (CFPB)',
                              'Federal Trade Commission (FTC)',
                              'Federal Reserve System (Fed)',
                              'Office of the Comptroller of the Currency (OCC)',
                              'Federal Deposit Insurance Corporation (FDIC)',
                              'National Credit Union Administration (NCUA)',
                              'Commodity Futures Trading Commission (CFTC)',
                              'Financial Crimes Enforcement Network (FinCEN)',
                              'Internal Revenue Service (IRS)',
                              'Treasury Department (USDT)',
                              'Small Business Administration (SBA)'
                            ].map((agency) => (
                              <Chip
                                key={agency}
                                label={agency}
                                onClick={() => {
                                  if (selectedAgencies.includes(agency)) {
                                    setSelectedAgencies(selectedAgencies.filter(a => a !== agency));
                                  } else {
                                    setSelectedAgencies([...selectedAgencies, agency]);
                                  }
                                  setIsDirty(true);
                                }}
                                variant={selectedAgencies.includes(agency) ? "filled" : "outlined"}
                                sx={{
                                  backgroundColor: selectedAgencies.includes(agency) ? '#2A4A2A' : 'transparent',
                                  color: '#FAFAFA',
                                  borderColor: '#666',
                                  fontSize: '0.7rem',
                                  '&:hover': {
                                    backgroundColor: selectedAgencies.includes(agency) ? '#3A5A3A' : '#333',
                                  },
                                }}
                              />
                            ))}
                          </Stack>
                        </CardContent>
                      </Card>
                    </Grid>

                    {/* Transportation & Infrastructure */}
                    <Grid item xs={12} md={6}>
                      <Card sx={{ backgroundColor: '#2A2A2A', border: '1px solid #444' }}>
                        <CardContent sx={{ p: 2 }}>
                          <Typography variant="subtitle1" sx={{ color: '#FAFAFA', fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                            <DirectionsCarIcon /> Transportation & Infrastructure
                          </Typography>
                          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                            {[
                              'Department of Transportation (DOT)',
                              'Federal Aviation Administration (FAA)',
                              'Federal Highway Administration (FHWA)',
                              'Federal Motor Carrier Safety Administration (FMCSA)',
                              'Federal Railroad Administration (FRA)',
                              'Federal Transit Administration (FTA)',
                              'Maritime Administration (MARAD)',
                              'National Highway Traffic Safety Administration (NHTSA)',
                              'Pipeline and Hazardous Materials Safety Administration (PHMSA)',
                              'Army Corps of Engineers (USACE)',
                              'Federal Housing Administration (FHA)'
                            ].map((agency) => (
                              <Chip
                                key={agency}
                                label={agency}
                                onClick={() => {
                                  if (selectedAgencies.includes(agency)) {
                                    setSelectedAgencies(selectedAgencies.filter(a => a !== agency));
                                  } else {
                                    setSelectedAgencies([...selectedAgencies, agency]);
                                  }
                                  setIsDirty(true);
                                }}
                                variant={selectedAgencies.includes(agency) ? "filled" : "outlined"}
                                sx={{
                                  backgroundColor: selectedAgencies.includes(agency) ? '#2A4A2A' : 'transparent',
                                  color: '#FAFAFA',
                                  borderColor: '#666',
                                  fontSize: '0.7rem',
                                  '&:hover': {
                                    backgroundColor: selectedAgencies.includes(agency) ? '#3A5A3A' : '#333',
                                  },
                                }}
                              />
                            ))}
                          </Stack>
                        </CardContent>
                      </Card>
                    </Grid>

                    {/* Labor & Employment */}
                    <Grid item xs={12} md={6}>
                      <Card sx={{ backgroundColor: '#2A2A2A', border: '1px solid #444' }}>
                        <CardContent sx={{ p: 2 }}>
                          <Typography variant="subtitle1" sx={{ color: '#FAFAFA', fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                            <SchoolIcon /> Labor & Employment
                          </Typography>
                          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                            {[
                              'Department of Labor (DOL)',
                              'Occupational Safety and Health Administration (OSHA)',
                              'Equal Employment Opportunity Commission (EEOC)',
                              'National Labor Relations Board (NLRB)',
                              'Mine Safety and Health Administration (MSHA)',
                              'Wage and Hour Division (WHD)',
                              'Office of Federal Contract Compliance Programs (OFCCP)',
                              'Department of Education (ED)',
                              'Office for Civil Rights (OCR)'
                            ].map((agency) => (
                              <Chip
                                key={agency}
                                label={agency}
                                onClick={() => {
                                  if (selectedAgencies.includes(agency)) {
                                    setSelectedAgencies(selectedAgencies.filter(a => a !== agency));
                                  } else {
                                    setSelectedAgencies([...selectedAgencies, agency]);
                                  }
                                  setIsDirty(true);
                                }}
                                variant={selectedAgencies.includes(agency) ? "filled" : "outlined"}
                                sx={{
                                  backgroundColor: selectedAgencies.includes(agency) ? '#2A4A2A' : 'transparent',
                                  color: '#FAFAFA',
                                  borderColor: '#666',
                                  fontSize: '0.7rem',
                                  '&:hover': {
                                    backgroundColor: selectedAgencies.includes(agency) ? '#3A5A3A' : '#333',
                                  },
                                }}
                              />
                            ))}
                          </Stack>
                        </CardContent>
                      </Card>
                    </Grid>

                    {/* Security & Immigration */}
                    <Grid item xs={12} md={6}>
                      <Card sx={{ backgroundColor: '#2A2A2A', border: '1px solid #444' }}>
                        <CardContent sx={{ p: 2 }}>
                          <Typography variant="subtitle1" sx={{ color: '#FAFAFA', fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                            <SecurityIcon /> Security & Immigration
                          </Typography>
                          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                            {[
                              'Department of Homeland Security (DHS)',
                              'U.S. Citizenship and Immigration Services (USCIS)',
                              'Customs and Border Protection (CBP)',
                              'Immigration and Customs Enforcement (ICE)',
                              'Transportation Security Administration (TSA)',
                              'Federal Emergency Management Agency (FEMA)',
                              'U.S. Coast Guard (USCG)',
                              'Department of Justice (DOJ)',
                              'Federal Bureau of Investigation (FBI)',
                              'Bureau of Alcohol, Tobacco, Firearms and Explosives (ATF)',
                              'Drug Enforcement Administration (DEA)',
                              'U.S. Marshals Service (USMS)'
                            ].map((agency) => (
                              <Chip
                                key={agency}
                                label={agency}
                                onClick={() => {
                                  if (selectedAgencies.includes(agency)) {
                                    setSelectedAgencies(selectedAgencies.filter(a => a !== agency));
                                  } else {
                                    setSelectedAgencies([...selectedAgencies, agency]);
                                  }
                                  setIsDirty(true);
                                }}
                                variant={selectedAgencies.includes(agency) ? "filled" : "outlined"}
                                sx={{
                                  backgroundColor: selectedAgencies.includes(agency) ? '#2A4A2A' : 'transparent',
                                  color: '#FAFAFA',
                                  borderColor: '#666',
                                  fontSize: '0.7rem',
                                  '&:hover': {
                                    backgroundColor: selectedAgencies.includes(agency) ? '#3A5A3A' : '#333',
                                  },
                                }}
                              />
                            ))}
                          </Stack>
                        </CardContent>
                      </Card>
                    </Grid>

                    {/* Agriculture & Food */}
                    <Grid item xs={12} md={6}>
                      <Card sx={{ backgroundColor: '#2A2A2A', border: '1px solid #444' }}>
                        <CardContent sx={{ p: 2 }}>
                          <Typography variant="subtitle1" sx={{ color: '#FAFAFA', fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                            <NatureIcon /> Agriculture & Food
                          </Typography>
                          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                            {[
                              'Department of Agriculture (USDA)',
                              'Food Safety and Inspection Service (FSIS)',
                              'Animal and Plant Health Inspection Service (APHIS)',
                              'Agricultural Marketing Service (AMS)',
                              'Farm Service Agency (FSA)',
                              'Natural Resources Conservation Service (NRCS)',
                              'Rural Development (RD)'
                            ].map((agency) => (
                              <Chip
                                key={agency}
                                label={agency}
                                onClick={() => {
                                  if (selectedAgencies.includes(agency)) {
                                    setSelectedAgencies(selectedAgencies.filter(a => a !== agency));
                                  } else {
                                    setSelectedAgencies([...selectedAgencies, agency]);
                                  }
                                  setIsDirty(true);
                                }}
                                variant={selectedAgencies.includes(agency) ? "filled" : "outlined"}
                                sx={{
                                  backgroundColor: selectedAgencies.includes(agency) ? '#2A4A2A' : 'transparent',
                                  color: '#FAFAFA',
                                  borderColor: '#666',
                                  fontSize: '0.7rem',
                                  '&:hover': {
                                    backgroundColor: selectedAgencies.includes(agency) ? '#3A5A3A' : '#333',
                                  },
                                }}
                              />
                            ))}
                          </Stack>
                        </CardContent>
                      </Card>
                    </Grid>

                    {/* Defense & Military */}
                    <Grid item xs={12} md={6}>
                      <Card sx={{ backgroundColor: '#2A2A2A', border: '1px solid #444' }}>
                        <CardContent sx={{ p: 2 }}>
                          <Typography variant="subtitle1" sx={{ color: '#FAFAFA', fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                            <SecurityIcon /> Defense & Military
                          </Typography>
                          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                            {[
                              'Department of Defense (DOD)',
                              'Department of Veterans Affairs (VA)',
                              'Defense Contract Management Agency (DCMA)',
                              'Defense Logistics Agency (DLA)',
                              'National Security Agency (NSA)',
                              'Central Intelligence Agency (CIA)'
                            ].map((agency) => (
                              <Chip
                                key={agency}
                                label={agency}
                                onClick={() => {
                                  if (selectedAgencies.includes(agency)) {
                                    setSelectedAgencies(selectedAgencies.filter(a => a !== agency));
                                  } else {
                                    setSelectedAgencies([...selectedAgencies, agency]);
                                  }
                                  setIsDirty(true);
                                }}
                                variant={selectedAgencies.includes(agency) ? "filled" : "outlined"}
                                sx={{
                                  backgroundColor: selectedAgencies.includes(agency) ? '#2A4A2A' : 'transparent',
                                  color: '#FAFAFA',
                                  borderColor: '#666',
                                  fontSize: '0.7rem',
                                  '&:hover': {
                                    backgroundColor: selectedAgencies.includes(agency) ? '#3A5A3A' : '#333',
                                  },
                                }}
                              />
                            ))}
                          </Stack>
                        </CardContent>
                      </Card>
                    </Grid>

                    {/* International & Trade */}
                    <Grid item xs={12} md={6}>
                      <Card sx={{ backgroundColor: '#2A2A2A', border: '1px solid #444' }}>
                        <CardContent sx={{ p: 2 }}>
                          <Typography variant="subtitle1" sx={{ color: '#FAFAFA', fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                            <AccountBalanceIcon /> International & Trade
                          </Typography>
                          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                            {[
                              'Department of State (DOS)',
                              'Department of Commerce (DOC)',
                              'International Trade Administration (ITA)',
                              'Bureau of Industry and Security (BIS)',
                              'U.S. Trade Representative (USTR)',
                              'Export-Import Bank of the United States (EXIM)',
                              'Overseas Private Investment Corporation (OPIC)'
                            ].map((agency) => (
                              <Chip
                                key={agency}
                                label={agency}
                                onClick={() => {
                                  if (selectedAgencies.includes(agency)) {
                                    setSelectedAgencies(selectedAgencies.filter(a => a !== agency));
                                  } else {
                                    setSelectedAgencies([...selectedAgencies, agency]);
                                  }
                                  setIsDirty(true);
                                }}
                                variant={selectedAgencies.includes(agency) ? "filled" : "outlined"}
                                sx={{
                                  backgroundColor: selectedAgencies.includes(agency) ? '#2A4A2A' : 'transparent',
                                  color: '#FAFAFA',
                                  borderColor: '#666',
                                  fontSize: '0.7rem',
                                  '&:hover': {
                                    backgroundColor: selectedAgencies.includes(agency) ? '#3A5A3A' : '#333',
                                  },
                                }}
                              />
                            ))}
                          </Stack>
                        </CardContent>
                      </Card>
                    </Grid>
                  </Grid>

                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle1" sx={{ color: '#FAFAFA', marginBottom: 1 }}>
                    Impact Level
                  </Typography>
                  <Grid container spacing={1}>
                    {[
                      'Local',
                      'State',
                      'Federal',
                      'International'
                    ].map((impact) => (
                      <Grid item xs={6} sm={3} key={impact}>
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={selectedImpactLevels.includes(impact)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedImpactLevels([...selectedImpactLevels, impact]);
                                } else {
                                  setSelectedImpactLevels(selectedImpactLevels.filter(i => i !== impact));
                                }
                                setIsDirty(true);
                              }}
                              sx={{
                                color: '#B8B8B8',
                                '&.Mui-checked': {
                                  color: '#B8B8B8',
                                },
                              }}
                            />
                          }
                          label={impact}
                          sx={{ color: '#FAFAFA' }}
                        />
                      </Grid>
                    ))}
                  </Grid>
                </Box>
                </AccordionDetails>
              </Accordion>


              {/* Status Messages */}
          {errorText && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  {errorText}
                </Alert>
          )}
          
          {embeddingError && (
                <Alert severity="warning" sx={{ mt: 2 }}>
                  Embedding Error: {embeddingError}
                </Alert>
          )}
          
          {lastSaved && (
                <Alert severity="success" sx={{ mt: 2 }}>
                  Last saved: {new Date(lastSaved).toLocaleString()}
                </Alert>
              )}

              {/* Action Buttons */}
              <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
                <Button
                  variant="contained"
                  onClick={save}
                  disabled={saving || !isDirty}
                  sx={{ minWidth: 120 }}
                >
              {saving ? (isGeneratingEmbedding ? 'Generating Embedding…' : 'Saving…') : (isDirty ? 'Save & Generate Embedding' : 'Saved')}
                </Button>
            
            {lastSaved && (
                  <Button
                    variant="contained"
                onClick={clearSavedPersona}
                    sx={{ 
                      backgroundColor: '#6B2C2C',
                      '&:hover': {
                        backgroundColor: '#8B3C3C',
                      }
                    }}
              >
                Clear Data
                  </Button>
                )}
              </Box>
            </Box>
          </Paper>
        </Container>
      </Box>
    </Box>
  );
}

