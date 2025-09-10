import React, { useState } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import { Dashboard } from './pages/Dashboard';
import { Persona } from './pages/Persona';
import { Settings } from './pages/Settings';
import { appTheme } from './theme';
import './App.css';

type ViewKey = 'dashboard' | 'persona' | 'settings';

export function App() {
  const [view, setView] = useState<ViewKey>('dashboard');

  return (
    <ThemeProvider theme={appTheme}>
      <CssBaseline />
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
          </nav>
        </aside>
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {view === 'dashboard' && <Dashboard />}
          {view === 'persona' && <Persona />}
          {view === 'settings' && <Settings />}
        </main>
      </div>
    </ThemeProvider>
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

export default App;