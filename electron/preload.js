// Preload script (context-isolated).
// Exposes a minimal, read-only bridge for future desktop integrations.
// The React app already talks to Express over http://127.0.0.1:PORT, so no
// data flows through IPC today — this file is here to keep the door open
// without ever needing to modify the React code.

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktop', {
  isElectron: true,
  getPaths: () => ipcRenderer.invoke('app:getPaths'),
  openDataFolder: () => ipcRenderer.invoke('app:openDataFolder'),
});
