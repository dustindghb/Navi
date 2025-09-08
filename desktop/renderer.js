window.addEventListener('DOMContentLoaded', () => {
  const results = document.getElementById('results');
  const runBtn = document.getElementById('run');
  const detectBtn = document.getElementById('detect');
  const modelInput = document.getElementById('model');
  const hostInput = document.getElementById('host');
  const portInput = document.getElementById('port');
  const autoStart = document.getElementById('autoStart');

  // Prefill host/port from env defaults (overwrite any hardcoded)
  if (window.ollama && window.ollama.getDefaults) {
    window.ollama.getDefaults().then((d) => {
      if (hostInput) hostInput.value = d.host || '127.0.0.1';
      if (portInput) portInput.value = String(d.port || '11434');
    }).catch(() => {});
  }

  async function runChecks() {
    results.innerHTML = '<em>Running…</em>';
    if (!window.ollama || !window.ollama.runChecks) {
      results.innerHTML = '<div class="err">Preload not loaded. window.ollama is undefined.</div>';
      return;
    }
    const modelName = modelInput.value.trim();
    const allowAutoStart = autoStart.checked;
    const host = hostInput.value.trim();
    const port = portInput.value.trim();
    try {
      const res = await window.ollama.runChecks(modelName, allowAutoStart, host, port);
      const lines = [];
      lines.push(`<div>CLI installed: <b class="${res.cliInstalled ? 'ok' : 'err'}">${res.cliInstalled}</b> ${res.cliVersion ? '('+res.cliVersion+')' : ''}</div>`);
      lines.push(`<div>Server running: <b class="${res.serverRunning ? 'ok' : 'err'}">${res.serverRunning}</b></div>`);
      lines.push(`<div>Model present: <b class="${res.modelPresent ? 'ok' : 'warn'}">${res.modelPresent}</b></div>`);
      lines.push(`<div>Test generation: <b class="${res.testGenerationOk ? 'ok' : 'warn'}">${res.testGenerationOk}</b>${res.testTimedOut ? ' (timed out while loading model)' : ''}</div>`);
      if (res.testOutput) {
        lines.push('<div>Output:</div>');
        lines.push(`<pre>${res.testOutput.replace(/[&<>]/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[s]))}</pre>`);
      }
      if (res.testError) {
        lines.push('<div class="err">' + String(res.testError).replace(/[&<>]/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[s])) + '</div>');
      }
      lines.push(`<div>Base URL: <code>${res.baseURL}</code></div>`);
      lines.push('<details><summary>Logs</summary><pre>' + JSON.stringify(res.logs, null, 2) + '</pre></details>');
      results.innerHTML = lines.join('');
    } catch (e) {
      results.innerHTML = `<div class="err">${String(e)}</div>`;
    }
  }

  runBtn?.addEventListener('click', runChecks);

  detectBtn?.addEventListener('click', async () => {
    if (!window.ollama || !window.ollama.detect) return;
    const res = await window.ollama.detect();
    if (hostInput) hostInput.value = res.host;
    if (portInput) portInput.value = String(res.port);
    if (results) {
      const lines = [];
      lines.push(`<div>Detected: <code>${res.host}:${res.port}</code></div>`);
      lines.push('<details><summary>Detection Logs</summary><pre>' + JSON.stringify(res.logs, null, 2) + '</pre></details>');
      results.innerHTML = lines.join('');
    }
  });
});


