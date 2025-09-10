import React, { useState } from 'react';

export function Settings() {
  const [model, setModel] = useState('gpt-oss:20b');
  const [host, setHost] = useState('127.0.0.1');
  const [port, setPort] = useState('11434');
  const [autoStart, setAutoStart] = useState('false');
  const [isDetecting, setIsDetecting] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [genTimeout, setGenTimeout] = useState(150000);
  const [genMaxTokens, setGenMaxTokens] = useState(64);
  const [genCtx, setGenCtx] = useState(8192);
  const [genTemp, setGenTemp] = useState(0.05);
  const [genStream, setGenStream] = useState(true);

  async function detect() {
    setIsDetecting(true);
    setError(null);
    
    try {
      // Simulate detection (no actual functionality)
      await new Promise(resolve => setTimeout(resolve, 1000));
      setHost('127.0.0.1');
      setPort('11434');
    } catch (err) {
      console.error('Detection failed:', err);
      setError(`Detection failed: ${err}`);
    } finally {
      setIsDetecting(false);
    }
  }

  async function run() {
    setIsTesting(true);
    setError(null);
    
    try {
      // Simulate connection test (no actual functionality)
      await new Promise(resolve => setTimeout(resolve, 1500));
    } catch (err) {
      console.error('Connection test failed:', err);
      setError(`Connection test failed: ${err}`);
    } finally {
      setIsTesting(false);
    }
  }

  async function saveGenSettings() {
    try {
      // Simulate save operation (no actual functionality)
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (e: any) {
      setError(String(e?.message || e));
    }
  }

  return (
    <div>
      <div style={{ padding: '20px 30px', borderBottom: '1px solid #333', background: '#1A1A1A' }}>
        <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 700 }}>Settings</h1>
        <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#B8B8B8' }}>
          Configure Navi (placeholder - no actual functionality)
        </p>
      </div>
      
      <div style={{ padding: 30 }}>
        {error && (
          <div style={{ 
            background: '#2A1A1A', 
            color: '#FF6B6B', 
            padding: '12px 16px', 
            borderRadius: '8px', 
            marginBottom: '20px',
            border: '1px solid #FF6B6B'
          }}>
            {error}
            <button 
              onClick={() => setError(null)}
              style={{ 
                float: 'right', 
                background: 'none', 
                border: 'none', 
                color: '#FF6B6B', 
                cursor: 'pointer' 
              }}
            >
              ×
            </button>
          </div>
        )}

        <div style={{ 
          background: '#1A1A1A', 
          border: '1px solid #333', 
          borderRadius: 12, 
          padding: 24, 
          marginBottom: 20 
        }}>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: 600 }}>
            AI Model Configuration
          </h3>
          <p style={{ color: '#B8B8B8', fontSize: '14px', margin: '0 0 20px 0' }}>
            Configure your AI model (placeholder - no actual functionality)
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
            <div>
              <label style={labelStyle}>Model Name</label>
              <input 
                style={inputStyle}
                value={model} 
                onChange={(e) => setModel(e.target.value)}
                placeholder="e.g., gpt-oss:20b, llama2:7b, codellama:13b"
              />
            </div>
            <div>
              <label style={labelStyle}>Host</label>
              <input 
                style={{...inputStyle, background: '#1A1A1A', color: '#888'}}
                value={host} 
                disabled
                placeholder="Hardcoded localhost"
              />
            </div>
            <div>
              <label style={labelStyle}>Port</label>
              <input 
                style={{...inputStyle, background: '#1A1A1A', color: '#888'}}
                value={port} 
                disabled
                placeholder="Hardcoded port"
              />
            </div>
            <div>
              <label style={labelStyle}>Auto-start Server</label>
              <select 
                style={inputStyle}
                value={autoStart} 
                onChange={(e) => setAutoStart(e.target.value)}
              >
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button 
              style={secondaryBtn}
              onClick={detect}
              disabled={isDetecting}
            >
              {isDetecting ? 'Detecting...' : 'Auto-detect Settings'}
            </button>
            <button 
              style={primaryBtn}
              onClick={run}
              disabled={isTesting}
            >
              {isTesting ? 'Testing...' : 'Test Connection'}
            </button>
          </div>
        </div>

        <div style={{ 
          background: '#1A1A1A', 
          border: '1px solid #333', 
          borderRadius: 12, 
          padding: 24, 
          marginBottom: 20 
        }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: 600 }}>
            Model Generation Settings
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
            <div>
              <label style={labelStyle}>Timeout (ms)</label>
              <input 
                style={inputStyle}
                type="number" 
                value={genTimeout} 
                onChange={(e) => setGenTimeout(Number(e.target.value))} 
              />
            </div>
            <div>
              <label style={labelStyle}>Max tokens (num_predict)</label>
              <input 
                style={inputStyle}
                type="number" 
                value={genMaxTokens} 
                onChange={(e) => setGenMaxTokens(Number(e.target.value))} 
              />
            </div>
            <div>
              <label style={labelStyle}>Context size (num_ctx)</label>
              <input 
                style={inputStyle}
                type="number" 
                value={genCtx} 
                onChange={(e) => setGenCtx(Number(e.target.value))} 
              />
            </div>
            <div>
              <label style={labelStyle}>Temperature</label>
              <input 
                style={inputStyle}
                type="number" 
                step="0.01"
                value={genTemp} 
                onChange={(e) => setGenTemp(Number(e.target.value))} 
              />
            </div>
          </div>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input 
                type="checkbox"
                checked={genStream}
                onChange={(e) => setGenStream(e.target.checked)}
                style={{ accentColor: '#3C362A' }}
              />
              <span style={{ fontSize: '14px' }}>Enable streaming (recommended)</span>
            </label>
          </div>
          <button style={primaryBtn} onClick={saveGenSettings}>
            Save Generation Settings
          </button>
        </div>
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = { 
  display: 'block', 
  fontSize: 14, 
  margin: '0 0 8px 0', 
  color: '#FAFAFA' 
};

const inputStyle: React.CSSProperties = { 
  width: '100%', 
  padding: '12px 16px', 
  background: '#2A2A2A', 
  border: '1px solid #333', 
  borderRadius: 8, 
  color: '#FAFAFA',
  fontSize: '14px'
};

const primaryBtn: React.CSSProperties = { 
  background: '#3C362A', 
  color: '#FAFAFA', 
  padding: '10px 16px', 
  borderRadius: 8, 
  border: 'none', 
  cursor: 'pointer',
  fontSize: '14px'
};

const secondaryBtn: React.CSSProperties = { 
  background: '#2A2A2A', 
  color: '#FAFAFA', 
  padding: '10px 16px', 
  borderRadius: 8, 
  border: '1px solid #555', 
  cursor: 'pointer',
  fontSize: '14px'
};
