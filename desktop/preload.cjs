import { contextBridge, ipcRenderer } from "electron"

contextBridge.exposeInMainWorld("ollama", {
  runChecks: async (modelName, allowAutoStart, host, port) => {
    return await ipcRenderer.invoke("ollama:runChecks", { modelName, allowAutoStart, host, port })
  },
  promptStart: async () => {
    return await ipcRenderer.invoke("ollama:promptStart")
  },
  getDefaults: async () => {
    return await ipcRenderer.invoke("ollama:getDefaults")
  },
  detect: async () => {
    return await ipcRenderer.invoke("ollama:detect")
  },
  persona: {
    load: async () => {
      return await ipcRenderer.invoke("persona:load")
    },
    save: async (persona) => {
      return await ipcRenderer.invoke("persona:save", persona)
    },
  },
  regulations: {
    fetch: async (filters) => {
      return await ipcRenderer.invoke("regulations:fetch", filters)
    },
    analyze: async (regulationId, persona) => {
      return await ipcRenderer.invoke("regulations:analyze", regulationId, persona)
    },
  },
  comments: {
    save: async (comment) => {
      return await ipcRenderer.invoke("comments:save", comment)
    },
    list: async () => {
      return await ipcRenderer.invoke("comments:list")
    },
  },
})


