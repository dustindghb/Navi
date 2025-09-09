import React, { useEffect, useState } from 'react';
import { Box, Typography, Paper, Button, Link } from '@mui/material';

type RelevantItem = { key: string; score: number; reason: string; item: any };

export function Dashboard() {
  const [relevant, setRelevant] = useState<RelevantItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debug, setDebug] = useState<any[]>([]);
  const [showDebug, setShowDebug] = useState(false);
  const [live, setLive] = useState<any[]>([]);
  const [unsub, setUnsub] = useState<null | (() => void)>(null);

  async function analyze() {
    setLoading(true);
    setError(null);
    try {
      // @ts-ignore
      const res = await window.ollama?.recommend?.findRelevantBoards?.('gpt-oss:20b');
      if (!res?.ok) throw new Error(res?.error || 'Analysis failed');
      setRelevant(Array.isArray(res.relevant) ? res.relevant : []);
      setDebug(Array.isArray(res.debug) ? res.debug : []);
    } catch (e: any) {
      setError(String(e?.message || e));
      setRelevant([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    analyze();
    try {
      // @ts-ignore
      const off = window.ollama?.recommend?.onProgress?.((evt: any) => {
        setLive((prev) => [evt, ...prev].slice(0, 50));
      });
      setUnsub(() => off);
    } catch {}
    return () => { try { unsub && unsub(); } catch {} };
  }, []);

  return (
    <Box>
      <Box sx={{ p: 3, borderBottom: '1px solid #333', bgcolor: 'background.paper' }}>
        <Typography variant="h4">Dashboard</Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>Relevant comment boards for you</Typography>
      </Box>
      <Box sx={{ p: 3 }}>
        <Paper sx={{ p: 2, mb: 2, display: 'flex', gap: 1, alignItems: 'center' }}>
          <Button variant="contained" onClick={analyze} disabled={loading}>
            {loading ? 'Analyzing…' : 'Refresh Recommendations'}
          </Button>
          <Button variant="outlined" color="secondary" onClick={() => setShowDebug((v) => !v)}>
            {showDebug ? 'Hide Debug' : 'Show Debug'}{debug.length ? ` (${debug.length})` : ''}
          </Button>
          {error && (
            <Typography variant="body2" color="error" sx={{ ml: 1 }}>{error}</Typography>
          )}
        </Paper>

        {relevant.length === 0 && !loading && !error && (
          <Typography variant="body2" color="text.secondary">No relevant boards found yet.</Typography>
        )}

        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr', gap: 2 }}>
          {relevant.map((r) => {
            const title = r?.item?.title || r?.key;
            const link = r?.item?.webDocumentLink || r?.item?.webDocketLink || r?.item?.webCommentLink || '';
            return (
              <Paper key={r.key} sx={{ p: 2, border: '1px solid #333', bgcolor: '#121212' }}>
                <Typography variant="subtitle1" sx={{ mb: 0.5 }}>{title}</Typography>
                {link && (
                  <Link href={link} target="_blank" rel="noreferrer" sx={{ color: 'info.light' }}>
                    {link}
                  </Link>
                )}
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                  Score: {r.score.toFixed(2)}{r.reason ? ` — ${r.reason}` : ''}
                </Typography>
              </Paper>
            );
          })}
        </Box>

        {showDebug && (
          <Paper sx={{ p: 2, mt: 3 }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>Live Analysis Stream</Typography>
            <Box component="pre" sx={{ p: 2, bgcolor: '#0F0F0F', border: '1px solid #333', borderRadius: 1, overflowX: 'auto', fontSize: '0.8rem', maxHeight: 280 }}>
              {live.length ? JSON.stringify(live.slice(0, 5), null, 2) : 'No live events yet.'}
            </Box>
            <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
              Last Run Summary{debug.length ? ` — showing ${Math.min(3, debug.length)} of ${debug.length}` : ''}
            </Typography>
            <Box component="pre" sx={{ p: 2, bgcolor: '#0F0F0F', border: '1px solid #333', borderRadius: 1, overflowX: 'auto', fontSize: '0.8rem', maxHeight: 280 }}>
              {debug.length ? JSON.stringify(debug.slice(0, 3), null, 2) : 'No debug available yet. Click "Refresh Recommendations" to generate logs.'}
            </Box>
          </Paper>
        )}
      </Box>
    </Box>
  );
}

