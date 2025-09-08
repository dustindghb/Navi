import React, { useEffect, useState } from 'react';

type PersonaData = {
  name?: string;
  region?: string;
  role?: string;
  interests?: string[];
  depth?: string;
};

export function Persona() {
  const [persona, setPersona] = useState<PersonaData>({ role: 'Citizen', depth: 'summary' });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (async () => {
      // @ts-ignore
      const res = await window.ollama?.persona?.load?.();
      if (res?.exists && res.persona) setPersona(res.persona);
    })();
  }, []);

  async function save() {
    setSaved(false);
    // @ts-ignore
    const res = await window.ollama?.persona?.save?.(persona);
    if (res?.ok) setSaved(true);
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
            {saved && <div style={badgeStyle}>Saved</div>}
          </div>

          <div style={{ marginTop: 16 }}>
            <label style={labelStyle}>Display Name (Optional)</label>
            <input style={inputStyle} value={persona.name || ''} onChange={(e) => setPersona({ ...persona, name: e.target.value })} placeholder="How you'd like to be addressed" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={labelStyle}>Location</label>
              <input style={inputStyle} value={persona.region || ''} onChange={(e) => setPersona({ ...persona, region: e.target.value })} placeholder="ZIP, city, or state" />
            </div>
            <div>
              <label style={labelStyle}>Primary Role</label>
              <select style={inputStyle} value={persona.role} onChange={(e) => setPersona({ ...persona, role: e.target.value })}>
                <option value="Citizen">Individual Citizen</option>
                <option value="Small Business">Small Business Owner</option>
                <option value="NGO">Non-Profit/NGO Representative</option>
                <option value="Researcher">Academic/Researcher</option>
                <option value="Industry">Industry Professional</option>
                <option value="Legal">Legal Professional</option>
              </select>
            </div>
          </div>

          <div>
            <label style={labelStyle}>Areas of Interest</label>
            <textarea style={{ ...inputStyle, minHeight: 100 }} value={(persona.interests || []).join(', ')} onChange={(e) => setPersona({ ...persona, interests: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })} placeholder="Environment, Small Business, Tech Policy..." />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={labelStyle}>Analysis Depth</label>
              <select style={inputStyle} value={persona.depth} onChange={(e) => setPersona({ ...persona, depth: e.target.value })}>
                <option value="summary">Summary</option>
                <option value="detailed">Detailed</option>
                <option value="expert">Expert</option>
              </select>
            </div>
          </div>

          <div style={{ marginTop: 16 }}>
            <button style={primaryBtn} onClick={save}>Save Persona</button>
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


