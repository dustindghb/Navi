import React, { useEffect, useState } from 'react';
import { Box, Paper, Typography, TextField, Button, Alert } from '@mui/material';

type PersonaData = {
  name?: string;
  role?: string;
  interests?: string[];
};

export function Persona() {
  const [persona, setPersona] = useState<PersonaData>({ role: '' });
  const [saving, setSaving] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [interestsText, setInterestsText] = useState('');

  useEffect(() => {
    (async () => {
      // @ts-ignore
      const res = await window.ollama?.persona?.load?.();
      if (res?.exists && res.persona) {
        setPersona(res.persona);
        setInterestsText(Array.isArray(res.persona.interests) ? res.persona.interests.join(', ') : '');
        setIsDirty(false);
      } else {
        setInterestsText('');
        setIsDirty(false);
      }
    })();
  }, []);

  async function save() {
    setErrorText(null);
    setSaving(true);
    try {
      const derivedInterests = interestsText
        .split(/[,\n]/)
        .map(s => s.trim())
        .filter(Boolean);
      const toSave = { ...persona, interests: derivedInterests };
      // @ts-ignore
      const res = await window.ollama?.persona?.save?.(toSave);
      if (!res?.ok) {
        setErrorText(res?.error || 'Failed to save persona');
      } else {
        setIsDirty(false);
        setPersona(toSave);
      }
    } catch (e: any) {
      setErrorText(String(e?.message || e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Box>
      <Box sx={{ p: 3, borderBottom: '1px solid #333', bgcolor: 'background.paper' }}>
        <Typography variant="h4">My Persona</Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>Configure your civic profile</Typography>
      </Box>
      <Box sx={{ p: 3 }}>
        {errorText && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErrorText(null)}>
            {errorText}
          </Alert>
        )}
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Personal Information</Typography>
          <Box sx={{ display: 'grid', gap: 2 }}>
            <TextField
              fullWidth
              label="Display Name (Optional)"
              placeholder="How you'd like to be addressed"
              value={persona.name || ''}
              onChange={(e) => { setPersona({ ...persona, name: e.target.value }); setIsDirty(true); }}
            />
            <TextField
              fullWidth
              label="Primary Role"
              placeholder="e.g., Small Business Owner, Student, Advocate"
              value={persona.role || ''}
              onChange={(e) => { setPersona({ ...persona, role: e.target.value }); setIsDirty(true); }}
            />
            <TextField
              fullWidth
              label="Areas of Interest"
              placeholder="Environment, Small Business, Tech Policy..."
              value={interestsText}
              onChange={(e) => { setInterestsText(e.target.value); setIsDirty(true); }}
              multiline
              minRows={4}
            />
          </Box>
          <Box sx={{ mt: 2 }}>
            <Button variant="contained" onClick={save} disabled={saving || !isDirty}>
              {saving ? 'Saving…' : (isDirty ? 'Save Persona' : 'Saved')}
            </Button>
          </Box>
        </Paper>
      </Box>
    </Box>
  );
}

const headerStyle: React.CSSProperties = { padding: '20px 30px', borderBottom: '1px solid #333', background: '#1A1A1A' };
const sectionStyle: React.CSSProperties = { background: '#1A1A1A', border: '1px solid #333', borderRadius: 12, padding: 24 };
const titleStyle: React.CSSProperties = { fontSize: 20, fontWeight: 600 };
const subtitleStyle: React.CSSProperties = { color: '#B8B8B8', fontSize: 14, marginTop: 4 };
const labelStyle: React.CSSProperties = { display: 'block', fontSize: 14, margin: '12px 0 8px' };
const inputStyle: React.CSSProperties = { width: '100%', padding: '12px 16px', background: '#2A2A2A', border: '1px solid #333', borderRadius: 8, color: '#FAFAFA' };
const badgeStyle: React.CSSProperties = { background: '#3C362A', color: '#FAFAFA', padding: '6px 10px', borderRadius: 8, border: '1px solid #333', fontSize: 12 };
const primaryBtn: React.CSSProperties = { background: '#3C362A', color: '#FAFAFA', padding: '10px 16px', borderRadius: 8, border: 'none', cursor: 'pointer' };


