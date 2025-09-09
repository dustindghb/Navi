import React, { useState } from 'react';
import { Dashboard } from './pages/Dashboard';
import { Persona } from './pages/Persona';
import { Settings } from './pages/Settings';

function Chat() {
  const [model, setModel] = React.useState('gpt-oss:20b');
  const [input, setInput] = React.useState('tell me a short bedtime story');
  const [response, setResponse] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  return (
    <div style={{ padding: 20 }}>
      <div style={{ marginBottom: 10 }}>
        <input style={{ width: '100%', padding: 8, background: '#111', color: '#fafafa', border: '1px solid #333' }} value={model} onChange={(e) => setModel(e.target.value)} />
      </div>
      <div style={{ marginBottom: 10 }}>
        <textarea style={{ width: '100%', minHeight: 120, padding: 8, background: '#111', color: '#fafafa', border: '1px solid #333' }} value={input} onChange={(e) => setInput(e.target.value)} />
      </div>
      <button onClick={async () => {
        setLoading(true);
        setResponse('');
        try {
          // @ts-ignore
          const res = await window.ollama?.chat?.send?.(model, [
            { role: 'system', content: 'Reasoning: low' },
            { role: 'user', content: input }
          ], { temperature: 0.2, num_predict: 256, num_ctx: 2048 }, false, -1);
          if (res?.ok) setResponse(res?.response || JSON.stringify(res.raw || {}, null, 2));
          else setResponse(res?.error || 'Failed');
        } catch (e: any) { setResponse(String(e?.message || e)); }
        finally { setLoading(false); }
      }} disabled={loading} style={{ padding: '8px 16px', background: '#3C362A', color: '#fafafa', border: 'none', cursor: 'pointer' }}>
        {loading ? 'Sending…' : 'Send'}
      </button>
      <pre style={{ marginTop: 16, whiteSpace: 'pre-wrap', background: '#0f0f0f', padding: 12, border: '1px solid #333', borderRadius: 4 }}>
        {response || 'Response will appear here.'}
      </pre>
    </div>
  );
}

type ViewKey = 'dashboard' | 'persona' | 'settings' | 'chat';

export function App() {
  const [view, setView] = useState<ViewKey>('dashboard');

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#0A0A0A', color: '#FAFAFA' }}>
      <aside style={{ width: 280, background: '#1A1A1A', borderRight: '1px solid #333' }}>
        <div style={{ padding: 20, borderBottom: '1px solid #333' }}>
          <div style={{ fontSize: 24, fontWeight: 700 }}>Navi</div>
          <div style={{ fontSize: 14, color: '#B8B8B8' }}>Civic Engagement Assistant</div>
        </div>
        <nav style={{ paddingTop: 10 }}>
          <button onClick={() => setView('dashboard')} style={navStyle(view === 'dashboard')}>Dashboard</button>
          <button onClick={() => setView('persona')} style={navStyle(view === 'persona')}>My Persona</button>
          <button onClick={() => setView('settings')} style={navStyle(view === 'settings')}>Settings</button>
          <button onClick={() => setView('chat')} style={navStyle(view === 'chat')}>Chat</button>
        </nav>
      </aside>
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {view === 'dashboard' && <Dashboard />}
        {view === 'persona' && <Persona />}
        {view === 'settings' && <Settings />}
        {view === 'chat' && <Chat />}
      </main>
    </div>
  );
}

function navStyle(active: boolean): React.CSSProperties {
  return {
    display: 'block',
    width: '100%',
    textAlign: 'left',
    padding: '12px 20px',
    color: active ? '#FAFAFA' : '#B8B8B8',
    background: active ? '#3C362A' : 'transparent',
    border: 'none',
    cursor: 'pointer',
  };
}


