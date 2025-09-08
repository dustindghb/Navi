import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import { request } from 'undici';
import { spawn, exec } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';

const DEFAULT_OLLAMA_HOST = '127.0.0.1';
const DEFAULT_OLLAMA_PORT = 11434;
function parseEnvBase() {
  const envHost = process.env.OLLAMA_HOST; // e.g., http://127.0.0.1:11435
  if (!envHost) return null;
  try {
    const url = new URL(envHost.startsWith('http') ? envHost : `http://${envHost}`);
    return { host: url.hostname, port: Number(url.port || DEFAULT_OLLAMA_PORT) };
  } catch {
    return null;
  }
}
function toBaseURL(host, port) {
  const h = (host || DEFAULT_OLLAMA_HOST).replace(/^https?:\/\//, '');
  const p = Number(port || DEFAULT_OLLAMA_PORT);
  return `http://${h}:${p}`;
}

/**
 * Create the main application window.
 */
function createWindow() {
  const win = new BrowserWindow({
    width: 900,
    height: 700,
    webPreferences: {
      preload: path.join(app.getAppPath(), 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  const devUrl = process.env.RENDERER_DEV_URL;
  if (devUrl) {
    win.loadURL(devUrl).catch(() => {
      // Fallback to built file if dev server not available
      const built = path.join(app.getAppPath(), 'renderer', 'dist', 'index.html');
      if (fs.existsSync(built)) {
        win.loadFile(built);
      } else {
        win.loadFile(path.join(app.getAppPath(), 'renderer.html'));
      }
    });
  } else {
    const built = path.join(app.getAppPath(), 'renderer', 'dist', 'index.html');
    if (fs.existsSync(built)) {
      win.loadFile(built);
    } else {
      win.loadFile(path.join(app.getAppPath(), 'renderer.html'));
    }
  }
}

app.whenReady().then(() => {
  createWindow();
  // Start automatic API data fetching and persistence
  try {
    startApiDataAutoFetch();
  } catch {}

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// --------------------- Ollama helpers ---------------------

function execCommand(cmd) {
  return new Promise((resolve) => {
    exec(cmd, (error, stdout, stderr) => {
      resolve({ error, stdout, stderr });
    });
  });
}

function execCommandWithEnv(cmd, extraEnv = {}) {
  return new Promise((resolve) => {
    exec(cmd, { env: { ...process.env, ...extraEnv }, shell: '/bin/zsh' }, (error, stdout, stderr) => {
      resolve({ error, stdout, stderr });
    });
  });
}

async function checkOllamaCLI() {
  // Try version first; fall back to which for better diagnostics
  const version = await execCommand('ollama --version');
  if (!version.error && version.stdout) {
    return { installed: true, version: version.stdout.trim() };
  }
  const which = await execCommand('which ollama');
  if (!which.error && which.stdout) {
    return { installed: true, version: 'unknown' };
  }
  return { installed: false, version: null, error: version.stderr || which.stderr };
}

async function isServerRunning(baseURL) {
  try {
    const res = await fetch(`${baseURL}/api/tags`);
    if (!res.ok) return false;
    return true;
  } catch (e) {
    return false;
  }
}

function startOllamaServeDetached() {
  try {
    const child = spawn('ollama', ['serve'], {
      detached: true,
      stdio: 'ignore',
    });
    child.unref();
    return true;
  } catch (e) {
    return false;
  }
}

async function waitForServer(baseURL, timeoutMs = 10000, intervalMs = 300) {
  const start = Date.now();
  // eslint-disable-next-line no-constant-condition
  while (true) {
    if (await isServerRunning(baseURL)) return true;
    if (Date.now() - start > timeoutMs) return false;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
}

async function checkModelPresent(baseURL, modelName) {
  try {
    const res = await fetch(`${baseURL}/api/show`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: modelName }),
    });
    if (res.ok) {
      const data = await res.json();
      return { present: true, details: data };
    }
    // Fallback: scan tags list
    const tags = await fetch(`${baseURL}/api/tags`).then(r => r.ok ? r.json() : { models: [] }).catch(() => ({ models: [] }));
    if (Array.isArray(tags.models)) {
      const found = tags.models.find(m => m.name === modelName);
      if (found) return { present: true, details: found };
    }
    // Final fallback: CLI list
    const cli = await listModelsViaCLI(baseURL);
    if (cli.models?.includes(modelName)) return { present: true, details: { name: modelName } };
    let details = null;
    try { details = await res.json(); } catch {}
    return { present: false, details };
  } catch (e) {
    return { present: false, error: String(e) };
  }
}

async function testGenerate(baseURL, modelName) {
  // Add a timeout so we don't hang during cold-start model load
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 90000);
  try {
    const res = await fetch(`${baseURL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: modelName,
        prompt: 'Respond with a single short sentence: Hello from Ollama.',
        stream: false,
        options: { temperature: 0.1, num_predict: 1 },
      }),
      signal: controller.signal,
    });
    if (!res.ok) {
      return { ok: false, error: `HTTP ${res.status}` };
    }
    const data = await res.json();
    const output = data.response || '';
    return { ok: true, output };
  } catch (e) {
    const message = String(e);
    const timedOut = message.includes('AbortError') || message.includes('The operation was aborted');
    return { ok: false, error: message, timedOut };
  } finally {
    clearTimeout(timeout);
  }
}

async function listModelsViaCLI(baseURL) {
  const env = { OLLAMA_HOST: baseURL };
  const jsonAttempt = await execCommandWithEnv('ollama list --json', env);
  if (!jsonAttempt.error && jsonAttempt.stdout) {
    try {
      const parsed = JSON.parse(jsonAttempt.stdout);
      if (Array.isArray(parsed)) {
        return { models: parsed.map(m => m.name).filter(Boolean) };
      }
    } catch {}
  }
  const textAttempt = await execCommandWithEnv('ollama list', env);
  const models = [];
  if (!textAttempt.error && textAttempt.stdout) {
    const lines = textAttempt.stdout.split('\n').map(s => s.trim()).filter(Boolean);
    for (const line of lines) {
      if (/^NAME\s+ID\s+SIZE\s+MODIFIED/i.test(line)) continue;
      const cols = line.split(/\s+/);
      if (cols.length >= 1) models.push(cols[0]);
    }
  }
  return { models };
}

// --------------------- IPC handlers ---------------------

ipcMain.handle('ollama:runChecks', async (_event, args) => {
  const { modelName, allowAutoStart, host, port } = args || {};
  const logs = [];
  // Determine base URL precedence: explicit host/port → env → 11434 → 11435
  let baseCandidate = host || port ? toBaseURL(host, port) : null;
  if (!baseCandidate) {
    const envBase = parseEnvBase();
    if (envBase) baseCandidate = toBaseURL(envBase.host, envBase.port);
  }
  if (!baseCandidate) baseCandidate = toBaseURL(DEFAULT_OLLAMA_HOST, DEFAULT_OLLAMA_PORT);

  let baseURL = baseCandidate;

  const cli = await checkOllamaCLI();
  logs.push({ step: 'cli', result: cli });

  let serverUp = await isServerRunning(baseURL);
  logs.push({ step: 'server:initial', result: serverUp, baseURL });
  if (!serverUp && !host && !port) {
    // Try common alternate port 11435
    const altBase = toBaseURL(DEFAULT_OLLAMA_HOST, 11435);
    const altUp = await isServerRunning(altBase);
    logs.push({ step: 'server:altProbe', baseURL: altBase, result: altUp });
    if (altUp) {
      baseURL = altBase;
      serverUp = true;
      logs.push({ step: 'server:selectedAlt', baseURL });
    } else {
      // Try detect via lsof
      try {
        const lsof = await execCommand("lsof -iTCP -sTCP:LISTEN -nP | grep ollama");
        logs.push({ step: 'server:lsofRaw', output: lsof.stdout || lsof.stderr });
        if (!lsof.error && lsof.stdout) {
          const lines = lsof.stdout.split('\n').filter(Boolean);
          for (const line of lines) {
            const m = line.match(/\b(\d+\.\d+\.\d+\.\d+|\[::1\]|::1|127\.0\.0\.1|0\.0\.0\.0):(\d+)\b/);
            if (m) {
              const hostM = m[1].replace(/\[|\]/g, '') || '127.0.0.1';
              const portM = Number(m[2]);
              const detBase = toBaseURL(hostM, portM);
              const detUp = await isServerRunning(detBase);
              logs.push({ step: 'server:lsofProbe', baseURL: detBase, result: detUp });
              if (detUp) {
                baseURL = detBase;
                serverUp = true;
                logs.push({ step: 'server:selectedLsof', baseURL });
                break;
              }
            }
          }
        }
      } catch {}
    }
  }

  if (!serverUp && allowAutoStart && cli.installed) {
    const started = startOllamaServeDetached();
    logs.push({ step: 'server:startAttempt', result: started });
    if (started) {
      const ready = await waitForServer(baseURL);
      serverUp = ready;
      logs.push({ step: 'server:waitReady', result: ready });
    }
  }

  let model = { present: false };
  let gen = { ok: false };

  if (serverUp && modelName) {
    model = await checkModelPresent(baseURL, modelName);
    logs.push({ step: 'model:present', result: model });
    if (model.present) {
      gen = await testGenerate(baseURL, modelName);
      logs.push({ step: 'generate:test', result: gen });
    }
  }

  return {
    cliInstalled: cli.installed,
    cliVersion: cli.version || null,
    serverRunning: serverUp,
    modelPresent: model.present,
    testGenerationOk: gen.ok,
    testOutput: gen.output || null,
    testError: gen.error || null,
    testTimedOut: !!gen.timedOut,
    baseURL,
    logs,
  };
});

ipcMain.handle('ollama:getDefaults', async () => {
  const env = parseEnvBase();
  return {
    host: env?.host || DEFAULT_OLLAMA_HOST,
    port: env?.port || DEFAULT_OLLAMA_PORT,
  };
});

ipcMain.handle('ollama:detect', async () => {
  const logs = [];
  const env = parseEnvBase();
  if (env) logs.push({ step: 'envBase', env });
  // Prefer env if present
  if (env) {
    const envBase = toBaseURL(env.host, env.port);
    const envUp = await isServerRunning(envBase);
    logs.push({ step: 'probeEnv', baseURL: envBase, up: envUp });
    if (envUp) return { host: env.host, port: env.port, logs };
  }
  // probe defaults next
  const defBase = toBaseURL(DEFAULT_OLLAMA_HOST, DEFAULT_OLLAMA_PORT);
  const defUp = await isServerRunning(defBase);
  logs.push({ step: 'probeDefault', baseURL: defBase, up: defUp });
  if (defUp) return { host: DEFAULT_OLLAMA_HOST, port: DEFAULT_OLLAMA_PORT, logs };
  // probe 11435
  const altBase = toBaseURL(DEFAULT_OLLAMA_HOST, 11435);
  const altUp = await isServerRunning(altBase);
  logs.push({ step: 'probeAlt', baseURL: altBase, up: altUp });
  if (altUp) return { host: DEFAULT_OLLAMA_HOST, port: 11435, logs };
  // lsof
  try {
    const lsof = await execCommand("lsof -iTCP -sTCP:LISTEN -nP | grep ollama");
    logs.push({ step: 'lsofRaw', output: lsof.stdout || lsof.stderr });
    if (!lsof.error && lsof.stdout) {
      const lines = lsof.stdout.split('\n').filter(Boolean);
      for (const line of lines) {
        const m = line.match(/\b(\d+\.\d+\.\d+\.\d+|\[::1\]|::1|127\.0\.0\.1|0\.0\.0\.0):(\d+)\b/);
        if (m) {
          const hostM = m[1].replace(/\[|\]/g, '') || '127.0.0.1';
          const portM = Number(m[2]);
          const detBase = toBaseURL(hostM, portM);
          const detUp = await isServerRunning(detBase);
          logs.push({ step: 'lsofProbe', baseURL: detBase, up: detUp });
          if (detUp) return { host: hostM, port: portM, logs };
        }
      }
    }
  } catch {}
  // fallback to env
  if (env) return { host: env.host, port: env.port, logs };
  return { host: DEFAULT_OLLAMA_HOST, port: DEFAULT_OLLAMA_PORT, logs };
});

ipcMain.handle('ollama:promptStart', async () => {
  const response = await dialog.showMessageBox({
    type: 'question',
    buttons: ['Start Ollama Serve', 'Cancel'],
    defaultId: 0,
    cancelId: 1,
    title: 'Start Ollama',
    message: 'Ollama server is not running. Do you want to start it now?'
  });
  if (response.response === 0) {
    const started = startOllamaServeDetached();
    if (!started) return { started: false };
    const ready = await waitForServer(toBaseURL());
    return { started: ready };
  }
  return { started: false };
});

// --------------------- Persona persistence ---------------------

function getPersonaPath() {
  const dir = app.getPath('userData');
  try {
    fs.mkdirSync(dir, { recursive: true });
  } catch {}
  return path.join(dir, 'persona.json');
}

ipcMain.handle('persona:load', async () => {
  try {
    const file = getPersonaPath();
    if (!fs.existsSync(file)) return { exists: false, persona: null };
    const raw = fs.readFileSync(file, 'utf8');
    const persona = JSON.parse(raw);
    return { exists: true, persona };
  } catch (e) {
    return { exists: false, error: String(e) };
  }
});

ipcMain.handle('persona:save', async (_event, persona) => {
  try {
    const file = getPersonaPath();
    fs.writeFileSync(file, JSON.stringify(persona || {}, null, 2), 'utf8');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
});

// --------------------- Public API fetch ---------------------

ipcMain.handle('api:fetchJSON', async (_event, args) => {
  const { url } = args || {};
  if (!url || typeof url !== 'string') {
    return { ok: false, error: 'Missing URL' };
  }
  try {
    const { statusCode, body } = await request(url, { method: 'GET' });
    const text = await body.text();
    let parsed = null;
    try { parsed = JSON.parse(text); } catch {}
    const ok = statusCode >= 200 && statusCode < 300;
    return { ok, status: statusCode, data: parsed, raw: parsed ? undefined : text };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
});


// --------------------- API Data auto-fetch & persistence ---------------------

const API_DATA_DEFAULT_URL = 'https://pktr0h24g5.execute-api.us-west-1.amazonaws.com/prod/data?all=true';
const API_DATA_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

let apiDataInterval = null;
let apiDataIntervalMs = API_DATA_INTERVAL_MS;
let apiDataUrl = API_DATA_DEFAULT_URL;
let lastApiDataPayload = null;

function getApiDataPath() {
  const dir = app.getPath('userData');
  try { fs.mkdirSync(dir, { recursive: true }); } catch {}
  return path.join(dir, 'api-data.json');
}

function readApiDataFromDisk() {
  try {
    const file = getApiDataPath();
    if (!fs.existsSync(file)) return null;
    const raw = fs.readFileSync(file, 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function broadcastApiDataUpdate(payload) {
  try {
    for (const bw of BrowserWindow.getAllWindows()) {
      try { bw.webContents.send('apiData:update', payload); } catch {}
    }
  } catch {}
}

async function fetchAndPersistApiData(url) {
  const startedAt = new Date().toISOString();
  try {
    const { statusCode, body } = await request(url, { method: 'GET' });
    const text = await body.text();
    let parsed = null;
    try { parsed = JSON.parse(text); } catch {}
    const ok = statusCode >= 200 && statusCode < 300;
    const payload = {
      url,
      fetchedAt: startedAt,
      ok,
      status: statusCode,
      data: parsed || undefined,
      raw: parsed ? undefined : text,
    };
    try { fs.writeFileSync(getApiDataPath(), JSON.stringify(payload, null, 2), 'utf8'); } catch {}
    lastApiDataPayload = payload;
    broadcastApiDataUpdate(payload);
    return payload;
  } catch (e) {
    const payload = {
      url,
      fetchedAt: startedAt,
      ok: false,
      error: String(e),
    };
    try { fs.writeFileSync(getApiDataPath(), JSON.stringify(payload, null, 2), 'utf8'); } catch {}
    lastApiDataPayload = payload;
    broadcastApiDataUpdate(payload);
    return payload;
  }
}

function startApiDataAutoFetch(url = API_DATA_DEFAULT_URL, intervalMs = API_DATA_INTERVAL_MS) {
  apiDataUrl = url;
  apiDataIntervalMs = intervalMs;
  if (apiDataInterval) {
    try { clearInterval(apiDataInterval); } catch {}
    apiDataInterval = null;
  }
  // Load any previously saved payload
  try { lastApiDataPayload = readApiDataFromDisk(); } catch {}
  // Do an immediate fetch, then schedule
  fetchAndPersistApiData(apiDataUrl).catch(() => {});
  try {
    apiDataInterval = setInterval(() => {
      fetchAndPersistApiData(apiDataUrl).catch(() => {});
    }, apiDataIntervalMs);
  } catch {}
}

ipcMain.handle('apiData:getLatest', async () => {
  if (!lastApiDataPayload) {
    try { lastApiDataPayload = readApiDataFromDisk(); } catch {}
  }
  return lastApiDataPayload || null;
});

ipcMain.handle('apiData:getStatus', async () => {
  return {
    url: apiDataUrl,
    intervalMs: apiDataIntervalMs,
    running: !!apiDataInterval,
    hasData: !!lastApiDataPayload,
    fetchedAt: lastApiDataPayload?.fetchedAt || null,
  };
});

ipcMain.handle('apiData:clear', async () => {
  try { fs.unlinkSync(getApiDataPath()); } catch {}
  lastApiDataPayload = null;
  broadcastApiDataUpdate(null);
  return { ok: true };
});

