import React from 'react';

export function Dashboard() {
  return (
    <div>
      <div style={{ padding: '20px 30px', borderBottom: '1px solid #333', background: '#1A1A1A' }}>
        <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 700 }}>Dashboard</h1>
        <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#B8B8B8' }}>
          Welcome to Navi
        </p>
      </div>
      <div style={{ padding: 30 }}>
        <div style={{ 
          background: '#1A1A1A', 
          border: '1px solid #333', 
          borderRadius: 12, 
          padding: 24 
        }}>
          <p style={{ color: '#B8B8B8', fontSize: '14px', margin: 0 }}>
            Dashboard content will appear here.
          </p>
        </div>
      </div>
    </div>
  );
}
