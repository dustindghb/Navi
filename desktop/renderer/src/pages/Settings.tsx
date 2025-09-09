import React, { useEffect, useState } from 'react';
import { Box, Paper, Typography, Grid2 as Grid, TextField, MenuItem, Button, Divider, Alert, Collapse, Switch, FormControlLabel } from '@mui/material';

// Type definitions for better TypeScript support
interface OllamaDefaults {
  host?: string;
  port?: string | number;
}

interface DetectResult {
  host?: string;
  port?: string | number;
  logs?: any;
}

interface CheckResult {
  cliInstalled?: boolean;
  cliVersion?: string | null;
  serverRunning?: boolean;
  modelPresent?: boolean;
  testGenerationOk?: boolean;
  testTimedOut?: boolean;
  testOutput?: string | null;
  testError?: string | null;
  baseURL?: string;
  logs?: any;
}

// Public API auto-fetch types
interface ApiDataPayload {
  url?: string;
  fetchedAt?: string;
  ok?: boolean;
  status?: number;
  data?: any;
  raw?: string;
  error?: string;
}

interface ApiDataStatus {
  url?: string;
  intervalMs?: number;
  running?: boolean;
  hasData?: boolean;
  fetchedAt?: string | null;
}

// Extend Window interface for TypeScript
declare global {
  interface Window {
    ollama?: {
      getDefaults?: () => Promise<OllamaDefaults>;
      detect?: () => Promise<DetectResult>;
      runChecks?: (model: string, autoStart: boolean, host: string, port: string) => Promise<CheckResult>;
      apiData?: {
        getLatest?: () => Promise<ApiDataPayload | null>;
        getStatus?: () => Promise<ApiDataStatus>;
        clear?: () => Promise<{ ok: boolean }>;
        fetchNow?: (url?: string) => Promise<ApiDataPayload | null>;
        subscribe?: (cb: (payload: ApiDataPayload | null) => void) => () => void;
      };
      gen?: {
        getSettings?: () => Promise<{ timeoutMs: number; num_predict: number; num_ctx: number; temperature: number; stream: boolean }>;
        saveSettings?: (next: { timeoutMs: number; num_predict: number; num_ctx: number; temperature: number; stream: boolean }) => Promise<{ ok: boolean; error?: string }>;
      };
    };
  }
}

export function Settings() {
  const [model, setModel] = useState('gpt-oss:20b');
  const [host, setHost] = useState('127.0.0.1');
  const [port, setPort] = useState('11434');
  const [autoStart, setAutoStart] = useState('false');
  const [detectRes, setDetectRes] = useState<DetectResult | null>(null);
  const [checkRes, setCheckRes] = useState<CheckResult | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [apiStatus, setApiStatus] = useState<ApiDataStatus | null>(null);
  const [apiPayload, setApiPayload] = useState<ApiDataPayload | null>(null);
  const [genTimeout, setGenTimeout] = useState(150000);
  const [genMaxTokens, setGenMaxTokens] = useState(64);
  const [genCtx, setGenCtx] = useState(8192);
  const [genTemp, setGenTemp] = useState(0.05);
  const [genStream, setGenStream] = useState(true);

  useEffect(() => {
    async function loadDefaults() {
      try {
        if (!window.ollama?.getDefaults) {
          setError('Ollama preload not available. Make sure the electron preload script is working.');
          return;
        }
        
        const defaults = await window.ollama.getDefaults();
        if (defaults?.host) setHost(defaults.host);
        if (defaults?.port) setPort(String(defaults.port));
      } catch (err) {
        console.error('Failed to load defaults:', err);
        setError(`Failed to load defaults: ${err}`);
      }
    }

    loadDefaults();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const s = await window.ollama?.gen?.getSettings?.();
        if (s) {
          setGenTimeout(s.timeoutMs);
          setGenMaxTokens(s.num_predict);
          setGenCtx(s.num_ctx);
          setGenTemp(s.temperature);
          setGenStream(!!s.stream);
        }
      } catch (e) {}
    })();
  }, []);

  async function saveGenSettings() {
    try {
      const next = { timeoutMs: Number(genTimeout), num_predict: Number(genMaxTokens), num_ctx: Number(genCtx), temperature: Number(genTemp), stream: !!genStream };
      const res = await window.ollama?.gen?.saveSettings?.(next);
      if (!res?.ok) setError(res?.error || 'Failed to save generation settings');
    } catch (e: any) {
      setError(String(e?.message || e));
    }
  }

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    async function initApiData() {
      try {
        if (window.ollama?.apiData?.getStatus) {
          const status = await window.ollama.apiData.getStatus();
          setApiStatus(status || null);
        }
        if (window.ollama?.apiData?.getLatest) {
          const latest = await window.ollama.apiData.getLatest();
          setApiPayload(latest || null);
        }
        if (window.ollama?.apiData?.subscribe) {
          unsubscribe = window.ollama.apiData.subscribe((payload) => {
            setApiPayload(payload || null);
            if (payload?.fetchedAt || payload === null) {
              setApiStatus((prev) => ({ ...(prev || {}), fetchedAt: payload ? payload.fetchedAt || null : null, hasData: !!payload }));
            }
          });
        }
      } catch (err) {
        console.error('Failed to initialize API data:', err);
      }
    }

    initApiData();

    return () => {
      try { unsubscribe && unsubscribe(); } catch {}
    };
  }, []);

  async function detect() {
    if (!window.ollama?.detect) {
      setError('Ollama detect function not available');
      return;
    }

    setIsDetecting(true);
    setError(null);
    
    try {
      const res = await window.ollama.detect();
      
      if (res && typeof res.host !== 'undefined' && typeof res.port !== 'undefined') {
        const nextHost = String(res.host ?? '');
        const nextPort = String(res.port ?? '');
        setHost(nextHost);
        setPort(nextPort);
        setDetectRes({ host: nextHost, port: nextPort, logs: res.logs });
      } else {
        setDetectRes({ host: undefined, port: undefined, logs: res?.logs });
      }
    } catch (err) {
      console.error('Detection failed:', err);
      setError(`Detection failed: ${err}`);
      setDetectRes(null);
    } finally {
      setIsDetecting(false);
    }
  }

  async function run() {
    if (!window.ollama?.runChecks) {
      setError('Ollama runChecks function not available');
      return;
    }

    setIsTesting(true);
    setError(null);
    
    try {
      const res = await window.ollama.runChecks(model, autoStart === 'true', host, port);
      setCheckRes(res || {});
    } catch (err) {
      console.error('Connection test failed:', err);
      setError(`Connection test failed: ${err}`);
      setCheckRes(null);
    } finally {
      setIsTesting(false);
    }
  }

  return (
    <Box>
      <Box sx={{ p: 3, borderBottom: '1px solid #333', bgcolor: 'background.paper' }}>
        <Typography variant="h4">Settings</Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
          Configure Navi
        </Typography>
      </Box>
      
      <Box sx={{ p: 3 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" sx={{ mb: 0.5 }}>
            AI Model Configuration
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Configure your local AI model for regulation analysis
          </Typography>

          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField 
                fullWidth 
                label="Model Name" 
                value={model} 
                onChange={(e) => setModel(e.target.value)}
                helperText="e.g., llama2:7b, codellama:13b"
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField 
                fullWidth 
                label="Host" 
                value={host} 
                onChange={(e) => setHost(e.target.value)} 
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField 
                fullWidth 
                label="Port" 
                value={port} 
                onChange={(e) => setPort(e.target.value)}
                type="number"
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField 
                select 
                fullWidth 
                label="Auto-start Server" 
                value={autoStart} 
                onChange={(e) => setAutoStart(e.target.value)}
              >
                <MenuItem value="true">Yes</MenuItem>
                <MenuItem value="false">No</MenuItem>
              </TextField>
            </Grid>
          </Grid>

          <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
            <Button 
              variant="outlined" 
              color="secondary" 
              onClick={detect}
              disabled={isDetecting}
            >
              {isDetecting ? 'Detecting...' : 'Auto-detect Settings'}
            </Button>
            <Button 
              variant="contained" 
              color="primary" 
              onClick={run}
              disabled={isTesting}
            >
              {isTesting ? 'Testing...' : 'Test Connection'}
            </Button>
          </Box>
        </Paper>

        {detectRes && (
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" sx={{ mb: 1 }}>Detection Result</Typography>
            <Typography variant="body2">
              Detected: <code>{`${detectRes.host ?? 'N/A'}:${detectRes.port ?? 'N/A'}`}</code>
            </Typography>
            <Details title="Detection Logs" data={detectRes.logs} />
          </Paper>
        )}

        {checkRes && (
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 1 }}>Connection Check</Typography>
            <StatusItem 
              label="CLI installed" 
              value={checkRes.cliInstalled} 
              extra={checkRes.cliVersion ? `(${checkRes.cliVersion})` : ''}
            />
            <StatusItem 
              label="Server running" 
              value={checkRes.serverRunning} 
            />
            <StatusItem 
              label="Model present" 
              value={checkRes.modelPresent} 
              type="warn"
            />
            <StatusItem 
              label="Test generation" 
              value={checkRes.testGenerationOk} 
              extra={checkRes.testTimedOut ? ' (timed out while loading model)' : ''}
              type="warn"
            />
            
            {checkRes.testOutput && (
              <Details title="Output" data={checkRes.testOutput} defaultOpen={false} />
            )}
            
            {checkRes.testError && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {checkRes.testError}
              </Alert>
            )}
            
            <KV label="Base URL" value={checkRes.baseURL || 'N/A'} />
            <Details title="Logs" data={checkRes.logs} />
          </Paper>
        )}

        <Paper sx={{ p: 3, mt: 3 }}>
          <Typography variant="h6" sx={{ mb: 1 }}>Model Generation Settings</Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField fullWidth label="Timeout (ms)" type="number" value={genTimeout} onChange={(e) => setGenTimeout(Number(e.target.value))} />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField fullWidth label="Max tokens (num_predict)" type="number" value={genMaxTokens} onChange={(e) => setGenMaxTokens(Number(e.target.value))} />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField fullWidth label="Context size (num_ctx)" type="number" value={genCtx} onChange={(e) => setGenCtx(Number(e.target.value))} />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField fullWidth label="Temperature" type="number" inputProps={{ step: 0.01 }} value={genTemp} onChange={(e) => setGenTemp(Number(e.target.value))} />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <FormControlLabel control={<Switch checked={genStream} onChange={(e) => setGenStream(e.target.checked)} />} label="Enable streaming (recommended)" />
            </Grid>
          </Grid>
          <Box sx={{ mt: 2 }}>
            <Button variant="contained" onClick={saveGenSettings}>Save Generation Settings</Button>
          </Box>
        </Paper>

        <Paper sx={{ p: 3, mt: 3 }}>
          <Typography variant="h6" sx={{ mb: 1 }}>Public API Data</Typography>
          <StatusItem label="Auto-fetch running" value={!!apiStatus?.running} />
          <KV label="URL" value={apiStatus?.url || 'N/A'} />
          <KV label="Interval (ms)" value={String(apiStatus?.intervalMs ?? 'N/A')} />
          <KV label="Last fetched" value={apiStatus?.fetchedAt || 'N/A'} />
          <StatusItem label="Has data" value={!!apiStatus?.hasData} />
          <Details title="Latest Payload" data={apiPayload} />
          <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Button 
              variant="outlined" 
              color="secondary"
              onClick={async () => { try { await window.ollama?.apiData?.clear?.(); setApiPayload(null); setApiStatus((p) => ({ ...(p || {}), hasData: false, fetchedAt: null })); } catch {} }}
            >
              Clear stored data
            </Button>
            <Button 
              variant="contained"
              onClick={async () => {
                try {
                  const url = apiStatus?.url || 'https://pktr0h24g5.execute-api.us-west-1.amazonaws.com/prod/data?all=true';
                  const payload = await window.ollama?.apiData?.fetchNow?.(url);
                  if (payload) {
                    // @ts-ignore
                    setApiPayload(payload);
                    setApiStatus((p) => ({ ...(p || {}), fetchedAt: payload?.fetchedAt || null, hasData: !!payload }));
                  }
                } catch (e) {
                  setError(String(e as any));
                }
              }}
            >
              Fetch & Store Now
            </Button>
          </Box>
        </Paper>
      </Box>
    </Box>
  );
}

interface StatusItemProps {
  label: string;
  value?: boolean;
  extra?: string;
  type?: 'ok' | 'warn' | 'error';
}

function StatusItem({ label, value, extra = '', type = 'ok' }: StatusItemProps) {
  const getColor = (val?: boolean) => {
    if (val === undefined || val === null) return 'text.secondary';
    if (type === 'warn' && !val) return 'warning.main';
    if (type === 'error' && !val) return 'error.main';
    return val ? 'success.main' : 'error.main';
  };

  const getDisplayValue = (val?: boolean) => {
    if (val === undefined || val === null) return 'N/A';
    return val ? 'true' : 'false';
  };

  return (
    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mt: 0.5 }}>
      <Typography variant="body2" color="text.secondary" sx={{ minWidth: 160 }}>
        {label}:
      </Typography>
      <Typography variant="body2" sx={{ color: getColor(value), fontWeight: 'medium' }}>
        {getDisplayValue(value)}{extra}
      </Typography>
    </Box>
  );
}

function KV(props: { label: string; value: string }) {
  return (
    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mt: 0.5 }}>
      <Typography variant="body2" color="text.secondary" sx={{ minWidth: 160 }}>
        {props.label}:
      </Typography>
      <Typography variant="body2" component="code" sx={{ 
        bgcolor: 'action.hover', 
        px: 0.5, 
        borderRadius: 0.5,
        fontSize: '0.875rem'
      }}>
        {props.value}
      </Typography>
    </Box>
  );
}

function Details(props: { title: string; data: any; defaultOpen?: boolean }) {
  if (!props.data) return null;
  const [open, setOpen] = React.useState<boolean>(!!props.defaultOpen);
  const content = typeof props.data === 'string' ? props.data : JSON.stringify(props.data, null, 2);
  return (
    <Box sx={{ mt: 2 }}>
      <Divider sx={{ mb: 1 }} />
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="subtitle2">{props.title}</Typography>
        <Button size="small" variant="text" onClick={() => setOpen(!open)}>
          {open ? 'Hide' : 'Show'}
        </Button>
      </Box>
      <Collapse in={open} unmountOnExit>
        <Box 
          component="pre" 
          sx={{ 
            mt: 1,
            p: 2, 
            bgcolor: '#0F0F0F', 
            border: '1px solid #333', 
            borderRadius: 1, 
            overflowX: 'auto',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            fontSize: '0.75rem',
            maxHeight: 300
          }}
        >
          {content}
        </Box>
      </Collapse>
    </Box>
  );
}

