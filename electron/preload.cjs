const { contextBridge, ipcRenderer } = require("electron");
const { isFramelessWindowEnabled } = require("./frameless.cjs");

const frameless = isFramelessWindowEnabled();

contextBridge.exposeInMainWorld("codeProxyDesktop", {
  isDesktop: true,
  frameless,
  platform: process.platform,
  versions: {
    chrome: process.versions.chrome,
    electron: process.versions.electron,
    node: process.versions.node,
  },
  getBackendBase: () => ipcRenderer.invoke("desktop:get-backend-base"),
  minimizeWindow: () => ipcRenderer.invoke("desktop:window-minimize"),
  toggleWindowMaximize: () => ipcRenderer.invoke("desktop:window-toggle-maximize"),
  closeWindow: () => ipcRenderer.invoke("desktop:window-close"),
  isWindowMaximized: () => ipcRenderer.invoke("desktop:window-is-maximized"),
  onWindowMaximizeChanged: (listener) => {
    if (typeof listener !== "function") {
      return () => undefined;
    }

    const forward = (_event, maximized) => {
      listener(Boolean(maximized));
    };

    ipcRenderer.on("desktop:window-maximize-changed", forward);
    return () => {
      ipcRenderer.removeListener("desktop:window-maximize-changed", forward);
    };
  },
});
