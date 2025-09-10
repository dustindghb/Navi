import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('ollama', {
  runChecks: async (modelName, allowAutoStart, host, port) => {
    return await ipcRenderer.invoke('ollama:runChecks', { modelName, allowAutoStart, host, port });
  },
  promptStart: async () => {
    return await ipcRenderer.invoke('ollama:promptStart');
  }
});


