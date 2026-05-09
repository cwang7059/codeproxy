const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("codeProxyDesktop", {
  isDesktop: true,
  platform: process.platform,
  versions: {
    chrome: process.versions.chrome,
    electron: process.versions.electron,
    node: process.versions.node,
  },
  getBackendBase: () => ipcRenderer.invoke("desktop:get-backend-base"),
});
