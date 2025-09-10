import React, { useState, useEffect } from 'react';

type PersonaData = {
  name?: string;
  role?: string;
  interests?: string[];
  _saved_at?: string;
};

export function Persona() {
  const [persona, setPersona] = useState<PersonaData>({ role: '' });
  const [saving, setSaving] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [interestsText, setInterestsText] = useState('');
  const [lastSaved, setLastSaved] = useState<string | null>(null);

  // Load saved persona data on component mount
  useEffect(() => {
    loadSavedPersona();
  }, []);

  const loadSavedPersona = () => {
    try {
      const saved = localStorage.getItem('navi-persona-data');
      if (saved) {
        const parsedData = JSON.parse(saved);
        setPersona(parsedData);
        setInterestsText(parsedData.interests ? parsedData.interests.join(', ') : '');
        setLastSaved(parsedData._saved_at || null);
        console.log('Loaded saved persona data:', parsedData);
      }
    } catch (err) {
      console.error('Error loading saved persona data:', err);
    }
  };

  const clearSavedPersona = () => {
    try {
      localStorage.removeItem('navi-persona-data');
      setPersona({ role: '' });
      setInterestsText('');
      setLastSaved(null);
      setIsDirty(false);
      console.log('Cleared saved persona data');
    } catch (err) {
      console.error('Error clearing persona data:', err);
    }
  };

  async function save() {
    setErrorText(null);
    setSaving(true);
    try {
      const derivedInterests = interestsText
        .split(/[,\n]/)
        .map(s => s.trim())
        .filter(Boolean);
      
      const timestamp = new Date().toISOString();
      const toSave = { 
        ...persona, 
        interests: derivedInterests,
        _saved_at: timestamp
      };
      
      // Save to localStorage
      localStorage.setItem('navi-persona-data', JSON.stringify(toSave));
      
      // Simulate save operation for UI feedback
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setIsDirty(false);
      setPersona(toSave);
      setLastSaved(timestamp);
      console.log('Persona data saved successfully:', toSave);
    } catch (e: any) {
      console.error('Error saving persona data:', e);
      setErrorText(String(e?.message || e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <header style={headerStyle}>
        <h1 style={{ margin: 0 }}>My Persona</h1>
        <p style={{ color: '#B8B8B8', margin: '6px 0 0' }}>Configure your civic profile</p>
      </header>
      <div style={{ padding: 30 }}>
        <section style={sectionStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div>
              <h3 style={titleStyle}>Personal Information</h3>
              <p style={subtitleStyle}>Help us understand your civic context</p>
            </div>
          </div>

          <div style={{ marginTop: 16 }}>
            <label style={labelStyle}>Display Name (Optional)</label>
            <input 
              style={inputStyle} 
              value={persona.name || ''} 
              onChange={(e) => { setPersona({ ...persona, name: e.target.value }); setIsDirty(true); }} 
              placeholder="How you'd like to be addressed" 
            />
          </div>

          <div>
            <label style={labelStyle}>Primary Role</label>
            <input 
              style={inputStyle} 
              value={persona.role || ''} 
              onChange={(e) => { setPersona({ ...persona, role: e.target.value }); setIsDirty(true); }} 
              placeholder="e.g., Small Business Owner, Student, Advocate" 
            />
          </div>

          <div>
            <label style={labelStyle}>Areas of Interest</label>
            <textarea 
              style={{ ...inputStyle, minHeight: 100 }} 
              value={interestsText} 
              onChange={(e) => { setInterestsText(e.target.value); setIsDirty(true); }} 
              placeholder="Environment, Small Business, Tech Policy..." 
            />
          </div>

          {errorText && (
            <div style={{ color: '#FF6B6B', fontSize: 12, marginTop: 8 }}>{errorText}</div>
          )}
          
          {lastSaved && (
            <div style={{ color: '#4CAF50', fontSize: 12, marginTop: 8 }}>
              ✓ Last saved: {new Date(lastSaved).toLocaleString()}
            </div>
          )}
          
          <div style={{ marginTop: 16, display: 'flex', gap: 12 }}>
            <button style={primaryBtn} onClick={save} disabled={saving || !isDirty}>
              {saving ? 'Saving…' : (isDirty ? 'Save Persona' : 'Saved')}
            </button>
            
            {lastSaved && (
              <button 
                style={{ ...primaryBtn, background: '#6B2C2C', color: '#FAFAFA' }} 
                onClick={clearSavedPersona}
              >
                Clear Data
              </button>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

const headerStyle: React.CSSProperties = { padding: '20px 30px', borderBottom: '1px solid #333', background: '#1A1A1A' };
const sectionStyle: React.CSSProperties = { background: '#1A1A1A', border: '1px solid #333', borderRadius: 12, padding: 24 };
const titleStyle: React.CSSProperties = { fontSize: 20, fontWeight: 600 };
const subtitleStyle: React.CSSProperties = { color: '#B8B8B8', fontSize: 14, marginTop: 4 };
const labelStyle: React.CSSProperties = { display: 'block', fontSize: 14, margin: '12px 0 8px' };
const inputStyle: React.CSSProperties = { width: '100%', padding: '12px 16px', background: '#2A2A2A', border: '1px solid #333', borderRadius: 8, color: '#FAFAFA' };
const primaryBtn: React.CSSProperties = { background: '#3C362A', color: '#FAFAFA', padding: '10px 16px', borderRadius: 8, border: 'none', cursor: 'pointer' };
