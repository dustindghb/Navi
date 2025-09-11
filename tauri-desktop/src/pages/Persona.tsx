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
  Container
} from '@mui/material';

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

  async function save() {
    setErrorText(null);
    setSaving(true);
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

      const savedPersona = await response.json();
      
      setIsDirty(false);
      setLastSaved(savedPersona.updated_at || savedPersona.created_at);
      console.log('Persona data saved successfully:', savedPersona);
    } catch (e: any) {
      console.error('Error saving persona data:', e);
      setErrorText(String(e?.message || e));
    } finally {
      setSaving(false);
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
          My Persona
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
              {/* Basic Information */}
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
                label="Industry/Profession"
                value={persona.industry || ''}
                onChange={(e) => { setPersona({ ...persona, industry: e.target.value }); setIsDirty(true); }}
                placeholder="e.g., Technology, Healthcare, Education, Manufacturing"
                fullWidth
                variant="outlined"
              />

              <Divider sx={{ my: 2 }} />

              {/* Policy Interest Categories */}
              <Box>
                <Typography variant="h6" sx={{ color: '#FAFAFA', marginBottom: 1 }}>
                  Specific Policy Interest Areas
                </Typography>
                <Typography variant="body2" sx={{ color: '#B8B8B8', marginBottom: 2 }}>
                  Be specific! Instead of "Technology", select "AI Regulation" or "Data Privacy". This helps avoid irrelevant matches.
                </Typography>
                <Grid container spacing={1}>
                  {[
                    'Climate Change & Carbon Emissions',
                    'Renewable Energy Standards',
                    'Water Quality & Pollution',
                    'Air Quality Regulations',
                    'Waste Management & Recycling',
                    'Healthcare Data Privacy (HIPAA)',
                    'Drug Approval & Safety',
                    'Medical Device Regulations',
                    'Telehealth & Digital Health',
                    'AI & Machine Learning Regulation',
                    'Data Privacy & Protection',
                    'Cybersecurity Standards',
                    'Social Media & Content Moderation',
                    'Cryptocurrency & Digital Assets',
                    'Banking & Financial Services',
                    'Consumer Credit & Lending',
                    'Investment & Securities',
                    'Aviation Safety & Operations',
                    'Highway & Road Safety',
                    'Public Transportation',
                    'Railroad Regulations',
                    'Student Loan & Education Finance',
                    'School Safety & Security',
                    'Higher Education Accreditation',
                    'Workplace Safety (OSHA)',
                    'Minimum Wage & Labor Standards',
                    'Employee Benefits & Retirement',
                    'Product Safety & Recalls',
                    'Food Safety & Labeling',
                    'Advertising & Marketing Practices',
                    'Border Security & Immigration',
                    'Cybersecurity & Critical Infrastructure',
                    'Nuclear Energy & Safety',
                    'Electric Grid & Power Systems',
                    'Oil & Gas Pipeline Safety'
                  ].map((interest) => (
                    <Grid item xs={12} sm={6} md={4} key={interest}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={selectedPolicyInterests.includes(interest)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedPolicyInterests([...selectedPolicyInterests, interest]);
                              } else {
                                setSelectedPolicyInterests(selectedPolicyInterests.filter(i => i !== interest));
                              }
                              setIsDirty(true);
                            }}
                          />
                        }
                        label={interest}
                        sx={{ color: '#FAFAFA', fontSize: '0.9rem' }}
                      />
                    </Grid>
                  ))}
                </Grid>
                <Typography variant="body2" sx={{ color: '#FFA726', marginTop: 2, fontStyle: 'italic' }}>
                  💡 Tip: Select only the areas you're genuinely interested in. Too many broad categories can lead to irrelevant matches.
                </Typography>
              </Box>

              <Divider sx={{ my: 2 }} />

              {/* Regulatory Focus Areas */}
              <Box>
                <Typography variant="h6" sx={{ color: '#FAFAFA', marginBottom: 1 }}>
                  Regulatory Focus Areas
                </Typography>
                <Typography variant="body2" sx={{ color: '#B8B8B8', marginBottom: 2 }}>
                  Help us prioritize which regulations to show you
                </Typography>

                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle1" sx={{ color: '#FAFAFA', marginBottom: 1 }}>
                    Preferred Agencies
                  </Typography>
                  <Grid container spacing={1}>
                    {[
                      'Environmental Protection Agency (EPA)',
                      'Food and Drug Administration (FDA)',
                      'Federal Communications Commission (FCC)',
                      'Securities and Exchange Commission (SEC)',
                      'Department of Transportation (DOT)',
                      'Department of Labor (DOL)',
                      'Department of Health and Human Services (HHS)',
                      'Department of Energy (DOE)',
                      'Department of Homeland Security (DHS)',
                      'Consumer Financial Protection Bureau (CFPB)',
                      'Federal Trade Commission (FTC)',
                      'Other'
                    ].map((agency) => (
                      <Grid item xs={12} sm={6} md={4} key={agency}>
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={selectedAgencies.includes(agency)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedAgencies([...selectedAgencies, agency]);
                                } else {
                                  setSelectedAgencies(selectedAgencies.filter(a => a !== agency));
                                }
                                setIsDirty(true);
                              }}
                            />
                          }
                          label={agency}
                          sx={{ color: '#FAFAFA' }}
                        />
                      </Grid>
                    ))}
                  </Grid>
                </Box>

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
                            />
                          }
                          label={impact}
                          sx={{ color: '#FAFAFA' }}
                        />
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              </Box>

              <Divider sx={{ my: 2 }} />

              {/* Additional Context - Enhanced */}
              <Box sx={{ 
                background: '#2A2A2A', 
                border: '2px solid #4CAF50', 
                borderRadius: 2, 
                p: 3,
                mb: 2
              }}>
                <Typography variant="h6" sx={{ color: '#4CAF50', marginBottom: 1 }}>
                  🎯 Specific Context & Use Cases
                </Typography>
                <Typography variant="body2" sx={{ color: '#B8B8B8', marginBottom: 2 }}>
                  This is the MOST IMPORTANT field for accurate matching. Be very specific about your situation, needs, and use cases.
                </Typography>
                <TextField
                  label="Detailed Context & Specific Interests"
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
                  helperText="💡 Be specific about your role, industry, location, and exact regulatory concerns. This helps avoid irrelevant matches."
                />
              </Box>

              {/* Status Messages */}
          {errorText && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  {errorText}
                </Alert>
          )}
          
          {lastSaved && (
                <Alert severity="success" sx={{ mt: 2 }}>
              ✓ Last saved: {new Date(lastSaved).toLocaleString()}
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
              {saving ? 'Saving…' : (isDirty ? 'Save Persona' : 'Saved')}
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

