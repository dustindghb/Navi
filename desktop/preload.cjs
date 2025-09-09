const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('ollama', {
  runChecks: async (modelName, allowAutoStart, host, port) => {
    return await ipcRenderer.invoke('ollama:runChecks', { modelName, allowAutoStart, host, port })
  },
  promptStart: async () => {
    return await ipcRenderer.invoke('ollama:promptStart')
  },
  getDefaults: async () => {
    return await ipcRenderer.invoke('ollama:getDefaults')
  },
  detect: async () => {
    return await ipcRenderer.invoke('ollama:detect')
  },
  persona: {
    load: async () => {
      return await ipcRenderer.invoke('persona:load')
    },
    save: async (persona) => {
      return await ipcRenderer.invoke('persona:save', persona)
    },
  },
  regulations: {
    fetch: async (filters) => {
      return await ipcRenderer.invoke('regulations:fetch', filters)
    },
    analyze: async (regulationId, persona) => {
      return await ipcRenderer.invoke('regulations:analyze', regulationId, persona)
    },
  },
  comments: {
    save: async (comment) => {
      return await ipcRenderer.invoke('comments:save', comment)
    },
    list: async () => {
      return await ipcRenderer.invoke('comments:list')
    },
  },
  api: {
    fetchJSON: async (url) => {
      return await ipcRenderer.invoke('api:fetchJSON', { url })
    }
  },
  apiData: {
    getLatest: async () => {
      return await ipcRenderer.invoke('apiData:getLatest')
    },
    getStatus: async () => {
      return await ipcRenderer.invoke('apiData:getStatus')
    },
    clear: async () => {
      return await ipcRenderer.invoke('apiData:clear')
    },
    subscribe: (callback) => {
      const listener = (_event, payload) => {
        try { callback(payload) } catch {}
      }
      ipcRenderer.on('apiData:update', listener)
      return () => {
        try { ipcRenderer.removeListener('apiData:update', listener) } catch {}
      }
    }
  },
  recommend: {
    findRelevantBoards: async (modelName, persona, itemsPayload) => {
      return await ipcRenderer.invoke('recommend:findRelevantBoards', { modelName, personaOverride: persona, itemsOverride: itemsPayload })
    },
    onProgress: (callback) => {
      const listener = (_event, payload) => { try { callback(payload) } catch {} }
      ipcRenderer.on('recommend:progress', listener)
      return () => { try { ipcRenderer.removeListener('recommend:progress', listener) } catch {} }
    }
  },
  gen: {
    getSettings: async () => {
      return await ipcRenderer.invoke('gen:getSettings')
    },
    saveSettings: async (next) => {
      return await ipcRenderer.invoke('gen:saveSettings', next)
    }
  },
  chat: {
    send: async (model, messages, options = {}, stream = false, keep_alive = -1) => {
      return await ipcRenderer.invoke('chat:send', { model, messages, options, stream, keep_alive })
    }
  }
})


