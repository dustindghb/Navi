import React, { useState } from 'react';

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

  async function save() {
    setErrorText(null);
    setSaving(true);
    try {
      const derivedInterests = interestsText
        .split(/[,\n]/)
        .map(s => s.trim())
        .filter(Boolean);
      const toSave = { ...persona, interests: derivedInterests };
      
      // Simulate save operation (no actual functionality)
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setIsDirty(false);
      setPersona(toSave);
    } catch (e: any) {
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
          <div style={{ marginTop: 16 }}>
            <button style={primaryBtn} onClick={save} disabled={saving || !isDirty}>
              {saving ? 'Saving…' : (isDirty ? 'Save Persona' : 'Saved')}
            </button>
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
