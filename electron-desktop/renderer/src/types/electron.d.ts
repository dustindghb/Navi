export interface ElectronAPI {
  ollama: {
    runChecks: (modelName?: string, allowAutoStart?: boolean, host?: string, port?: number) => Promise<any>;
    promptStart: () => Promise<any>;
    getDefaults: () => Promise<any>;
    detect: () => Promise<any>;
    persona: {
      load: () => Promise<any>;
      save: (persona: any) => Promise<any>;
    };
    regulations: {
      fetch: (filters: any) => Promise<any>;
      analyze: (regulationId: string, persona: any) => Promise<any>;
    };
    comments: {
      save: (comment: any) => Promise<any>;
      list: () => Promise<any>;
    };
    api: {
      fetchJSON: (url: string) => Promise<any>;
    };
    apiData: {
      getLatest: () => Promise<any>;
      getStatus: () => Promise<any>;
      clear: () => Promise<any>;
      subscribe: (callback: (payload: any) => void) => () => void;
    };
    recommend: {
      findRelevantBoards: (modelName?: string, persona?: any, itemsPayload?: any) => Promise<any>;
      onProgress: (callback: (payload: any) => void) => () => void;
    };
    gen: {
      getSettings: () => Promise<any>;
      saveSettings: (next: any) => Promise<any>;
    };
    chat: {
      send: (args: {
        model?: string;
        messages?: Array<{ role: string; content: string }>;
        options?: any;
        stream?: boolean;
        keep_alive?: number;
      }) => Promise<{ ok: boolean; response?: string; error?: string; raw?: any }>;
    };
    generate: (model: string, prompt: string, options?: any) => Promise<any>;
  };
}

declare global {
  interface Window {
    ollama: ElectronAPI['ollama'];
  }
}
