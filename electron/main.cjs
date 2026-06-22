const { app, BrowserWindow, Menu, Tray, ipcMain, nativeImage, shell } = require("electron");
const fs = require("node:fs");
const http = require("node:http");
const https = require("node:https");
const net = require("node:net");
const path = require("node:path");
const tls = require("node:tls");
const { isFramelessWindowEnabled } = require("./frameless.cjs");

const DEFAULT_BACKEND_BASE = "http://127.0.0.1:8317";
const DEFAULT_WINDOW_WIDTH = 1080;
const DEFAULT_WINDOW_HEIGHT = 700;
const MIN_WINDOW_WIDTH = 1024;
const MIN_WINDOW_HEIGHT = 640;
const AUTH_SNAPSHOT_FILE = "auth-snapshot.json";
const DESKTOP_SETTINGS_FILE = "desktop-settings.json";
const API_PREFIXES = ["/v0", "/v1", "/v1beta"];
const MANAGE_PREFIX = "/manage";
const HTTP_HOP_BY_HOP_HEADERS = [
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "proxy-connection",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
];

let localServer = null;
let localServerOrigin = null;
let mainWindow = null;
let tray = null;
let isQuitting = false;
let trayHintShown = false;
let desktopBackendBaseOverride = null;

const mimeTypes = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".map", "application/json; charset=utf-8"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
  [".ico", "image/x-icon"],
  [".woff", "font/woff"],
  [".woff2", "font/woff2"],
]);

function getTrayIconPath() {
  return path.join(__dirname, "assets", "clirelay-icon.ico");
}

function getWindowIconPath() {
  return path.join(__dirname, "assets", "clirelay-icon.png");
}

function isWindowVisible() {
  return Boolean(mainWindow && mainWindow.isVisible() && !mainWindow.isMinimized());
}

function refreshTrayMenu() {
  if (!tray) {
    return;
  }

  const visible = isWindowVisible();
  tray.setContextMenu(
    Menu.buildFromTemplate([
      {
        label: visible ? "隐藏窗口" : "显示窗口",
        click: () => {
          if (visible) {
            hideMainWindowToTray();
            return;
          }
          showMainWindowFromTray();
        },
      },
      { type: "separator" },
      {
        label: "退出",
        click: () => {
          isQuitting = true;
          app.quit();
        },
      },
    ]),
  );
}

function showTrayHint() {
  if (trayHintShown || !tray) {
    return;
  }

  trayHintShown = true;
  if (process.platform === "win32" && typeof tray.displayBalloon === "function") {
    tray.displayBalloon({
      title: "代理控制台",
      content: "客户端已隐藏到托盘，点击托盘图标可重新打开。",
      iconType: "info",
    });
  }
}

function hideMainWindowToTray() {
  if (!mainWindow) {
    return;
  }

  mainWindow.hide();
  mainWindow.setSkipTaskbar(true);
  refreshTrayMenu();
  showTrayHint();
}

function showMainWindowFromTray() {
  if (!mainWindow) {
    return;
  }

  mainWindow.setSkipTaskbar(false);
  if (mainWindow.isMinimized()) {
    mainWindow.restore();
  }
  mainWindow.show();
  mainWindow.focus();
  refreshTrayMenu();
}

function createTray() {
  if (tray) {
    refreshTrayMenu();
    return;
  }

  const trayIcon = nativeImage.createFromPath(getTrayIconPath());
  tray = new Tray(trayIcon);
  tray.setToolTip("代理控制台");
  tray.on("click", () => {
    if (isWindowVisible()) {
      hideMainWindowToTray();
      return;
    }
    showMainWindowFromTray();
  });
  tray.on("double-click", () => {
    showMainWindowFromTray();
  });
  refreshTrayMenu();
}

function releaseDesktopResources() {
  if (tray) {
    tray.destroy();
    tray = null;
  }

  if (localServer) {
    localServer.close();
    localServer = null;
    localServerOrigin = null;
  }
}

function normalizeBackendBase(rawBase) {
  let base = String(rawBase || "").trim();
  if (!base) {
    return "";
  }

  base = base.replace(/\/?v0\/management\/?$/i, "");
  base = base.replace(/\/+$/, "");
  if (!/^https?:\/\//i.test(base)) {
    base = `http://${base}`;
  }

  try {
    const url = new URL(base);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return "";
    }
    return url.toString().replace(/\/+$/, "");
  } catch {
    return "";
  }
}

function getBackendBase() {
  return (
    desktopBackendBaseOverride ||
    normalizeBackendBase(process.env.CODE_PROXY_API_BASE) ||
    DEFAULT_BACKEND_BASE
  ).replace(/\/+$/, "");
}

function getAuthSnapshotPath() {
  return path.join(app.getPath("userData"), AUTH_SNAPSHOT_FILE);
}

function getDesktopSettingsPath() {
  return path.join(app.getPath("userData"), DESKTOP_SETTINGS_FILE);
}

async function readDesktopAuthSnapshot() {
  try {
    const raw = await fs.promises.readFile(getAuthSnapshotPath(), "utf8");
    return JSON.parse(raw);
  } catch (error) {
    if (error && typeof error === "object" && error.code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

async function writeDesktopAuthSnapshot(snapshot) {
  const snapshotPath = getAuthSnapshotPath();
  await fs.promises.mkdir(path.dirname(snapshotPath), { recursive: true });
  await fs.promises.writeFile(snapshotPath, JSON.stringify(snapshot, null, 2), "utf8");
}

async function clearDesktopAuthSnapshot() {
  try {
    await fs.promises.unlink(getAuthSnapshotPath());
  } catch (error) {
    if (!error || typeof error !== "object" || error.code !== "ENOENT") {
      throw error;
    }
  }
}

async function readDesktopSettings() {
  try {
    const raw = await fs.promises.readFile(getDesktopSettingsPath(), "utf8");
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      return {};
    }
    return parsed;
  } catch (error) {
    if (error && typeof error === "object" && error.code === "ENOENT") {
      return {};
    }
    throw error;
  }
}

async function writeDesktopSettings(settings) {
  const settingsPath = getDesktopSettingsPath();
  await fs.promises.mkdir(path.dirname(settingsPath), { recursive: true });
  await fs.promises.writeFile(settingsPath, JSON.stringify(settings, null, 2), "utf8");
}

async function loadDesktopBackendBaseOverride() {
  const settings = await readDesktopSettings();
  const normalized = normalizeBackendBase(settings.backendBase);
  desktopBackendBaseOverride = normalized || null;
}

async function setDesktopBackendBaseOverride(rawBase) {
  const normalized = normalizeBackendBase(rawBase);
  const settings = await readDesktopSettings();

  if (normalized) {
    settings.backendBase = normalized;
    desktopBackendBaseOverride = normalized;
  } else {
    delete settings.backendBase;
    desktopBackendBaseOverride = null;
  }

  await writeDesktopSettings(settings);
  return getBackendBase();
}

function getConfiguredRendererUrl() {
  const rendererUrl = process.env.CODE_PROXY_ADMIN_URL || process.env.ELECTRON_RENDERER_URL;
  return rendererUrl?.trim() || "";
}

function isApiRequest(pathname) {
  return API_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function sendPlain(res, statusCode, message) {
  res.writeHead(statusCode, {
    "Content-Type": "text/plain; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(message);
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(payload));
}

function resolveBackendUrl(rawUrl, backendBase) {
  try {
    const targetUrl = new URL(rawUrl || "/", `${backendBase}/`);
    if (targetUrl.protocol !== "http:" && targetUrl.protocol !== "https:") {
      return null;
    }

    return targetUrl;
  } catch {
    return null;
  }
}

function probeBackendBase(rawBase) {
  const normalized = normalizeBackendBase(rawBase);
  if (!normalized) {
    return Promise.resolve("invalid");
  }

  return new Promise((resolve) => {
    const targetUrl = resolveBackendUrl("/v0/management", normalized);
    if (!targetUrl) {
      resolve("invalid");
      return;
    }

    const requestModule = targetUrl.protocol === "https:" ? https : http;
    const request = requestModule.request(
      {
        protocol: targetUrl.protocol,
        hostname: targetUrl.hostname,
        port: targetUrl.port,
        method: "GET",
        path: `${targetUrl.pathname}${targetUrl.search}`,
        timeout: 5000,
      },
      (response) => {
        response.resume();
        if (
          response.statusCode === 401 ||
          response.statusCode === 403 ||
          (response.statusCode >= 200 && response.statusCode < 500)
        ) {
          resolve("reachable");
          return;
        }
        resolve(response.statusCode >= 500 ? "unreachable" : "reachable");
      },
    );

    request.on("timeout", () => {
      request.destroy(new Error("timeout"));
    });
    request.on("error", () => resolve("unreachable"));
    request.end();
  });
}

function sanitizeHttpProxyHeaders(headers, targetHost) {
  const proxyHeaders = {
    ...headers,
    host: targetHost,
  };

  for (const header of HTTP_HOP_BY_HOP_HEADERS) {
    delete proxyHeaders[header];
  }

  return proxyHeaders;
}

function writeRawHeaders(upstream, req, targetUrl) {
  const requestPath = `${targetUrl.pathname}${targetUrl.search}`;
  const requestLines = [`${req.method} ${requestPath} HTTP/${req.httpVersion}`];
  const headers = {
    ...req.headers,
    host: targetUrl.host,
  };
  delete headers["proxy-connection"];

  for (const [name, value] of Object.entries(headers)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        requestLines.push(`${name}: ${item}`);
      }
      continue;
    }

    if (value !== undefined) {
      requestLines.push(`${name}: ${value}`);
    }
  }

  upstream.write(`${requestLines.join("\r\n")}\r\n\r\n`);
}

function getSafeStaticFile(distDir, pathname) {
  let decodedPath = "";
  try {
    decodedPath = decodeURIComponent(pathname);
  } catch {
    return null;
  }

  const relativePath = decodedPath.slice(`${MANAGE_PREFIX}/`.length) || "index.html";
  const candidate = path.resolve(distDir, relativePath);
  const normalizedDistDir = path.resolve(distDir);
  if (candidate !== normalizedDistDir && !candidate.startsWith(`${normalizedDistDir}${path.sep}`)) {
    return null;
  }

  return candidate;
}

function serveStaticFile(req, res, distDir, pathname) {
  if (pathname === "/" || pathname === MANAGE_PREFIX) {
    res.writeHead(302, { Location: `${MANAGE_PREFIX}/` });
    res.end();
    return;
  }

  if (pathname === `${MANAGE_PREFIX}/`) {
    const manageFile = path.join(distDir, "manage.html");
    fs.stat(manageFile, (error, stat) => {
      if (error || !stat.isFile()) {
        sendPlain(res, 404, "Built management UI was not found. Run bun run build first.");
        return;
      }

      res.writeHead(200, {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Length": stat.size,
        "Cache-Control": "no-store",
      });
      fs.createReadStream(manageFile).pipe(res);
    });
    return;
  }

  if (!pathname.startsWith(`${MANAGE_PREFIX}/`)) {
    sendPlain(res, 404, "Not found");
    return;
  }

  const filePath = getSafeStaticFile(distDir, pathname);
  if (!filePath) {
    sendPlain(res, 403, "Forbidden");
    return;
  }

  const fallbackFile = path.join(distDir, "index.html");
  const fileExists = fs.existsSync(filePath) && fs.statSync(filePath).isFile();
  const targetFile = fileExists ? filePath : path.extname(filePath) ? null : fallbackFile;

  if (!targetFile) {
    sendPlain(res, 404, "Not found");
    return;
  }

  fs.stat(targetFile, (error, stat) => {
    if (error || !stat.isFile()) {
      sendPlain(res, 404, "Built management UI was not found. Run bun run build first.");
      return;
    }

    const extension = path.extname(targetFile).toLowerCase();
    res.writeHead(200, {
      "Content-Type": mimeTypes.get(extension) || "application/octet-stream",
      "Content-Length": stat.size,
      "Cache-Control": extension === ".html" ? "no-store" : "public, max-age=31536000, immutable",
    });
    fs.createReadStream(targetFile).pipe(res);
  });
}

function proxyApiRequest(req, res, backendBase) {
  const targetUrl = resolveBackendUrl(req.url, backendBase);
  if (!targetUrl) {
    sendJson(res, 400, {
      error: "Desktop proxy received an invalid backend URL",
      backend: backendBase,
    });
    return;
  }

  const proxyModule = targetUrl.protocol === "https:" ? https : http;
  const headers = sanitizeHttpProxyHeaders(req.headers, targetUrl.host);

  const proxyReq = proxyModule.request(
    {
      protocol: targetUrl.protocol,
      hostname: targetUrl.hostname,
      port: targetUrl.port,
      method: req.method,
      path: `${targetUrl.pathname}${targetUrl.search}`,
      headers,
    },
    (proxyRes) => {
      res.writeHead(proxyRes.statusCode || 502, proxyRes.headers);
      proxyRes.pipe(res);
    },
  );

  proxyReq.on("error", (error) => {
    sendJson(res, 502, {
      error: "Desktop proxy could not reach CliRelay backend",
      detail: error.message,
      backend: backendBase,
    });
  });

  req.pipe(proxyReq);
}

function proxyWebSocketUpgrade(req, socket, head, backendBase) {
  const targetUrl = resolveBackendUrl(req.url, backendBase);
  if (!targetUrl) {
    socket.destroy();
    return;
  }

  const useTls = targetUrl.protocol === "https:";
  const upstream = (useTls ? tls : net).connect({
    host: targetUrl.hostname,
    port: Number(targetUrl.port || (useTls ? 443 : 80)),
    servername: useTls ? targetUrl.hostname : undefined,
  });

  const closeBoth = () => {
    upstream.destroy();
    socket.destroy();
  };

  upstream.once(useTls ? "secureConnect" : "connect", () => {
    writeRawHeaders(upstream, req, targetUrl);
    if (head.length > 0) {
      upstream.write(head);
    }

    upstream.pipe(socket);
    socket.pipe(upstream);
  });

  upstream.once("error", closeBoth);
  socket.once("error", closeBoth);
  socket.once("close", () => upstream.destroy());
}

function startLocalServer() {
  const distDir = path.resolve(__dirname, "..", "dist");

  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const requestUrl = new URL(req.url || "/", "http://127.0.0.1");
      if (isApiRequest(requestUrl.pathname)) {
        proxyApiRequest(req, res, getBackendBase());
        return;
      }

      serveStaticFile(req, res, distDir, requestUrl.pathname);
    });

    server.on("upgrade", (req, socket, head) => {
      let requestUrl = null;
      try {
        requestUrl = new URL(req.url || "/", "http://127.0.0.1");
      } catch {
        socket.destroy();
        return;
      }

      if (!isApiRequest(requestUrl.pathname)) {
        socket.destroy();
        return;
      }

      proxyWebSocketUpgrade(req, socket, head, getBackendBase());
    });

    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        reject(new Error("Failed to allocate local desktop server port."));
        return;
      }

      localServer = server;
      localServerOrigin = `http://127.0.0.1:${address.port}`;
      resolve(`${localServerOrigin}${MANAGE_PREFIX}/`);
    });
  });
}

function isInternalUrl(rawUrl) {
  if (!rawUrl) {
    return false;
  }

  try {
    const url = new URL(rawUrl);
    const configuredRendererUrl = getConfiguredRendererUrl();
    if (configuredRendererUrl && url.origin === new URL(configuredRendererUrl).origin) {
      return true;
    }

    return Boolean(localServerOrigin && url.origin === localServerOrigin);
  } catch {
    return false;
  }
}

function openExternalUrl(rawUrl) {
  if (!rawUrl) {
    return;
  }

  shell.openExternal(rawUrl).catch(() => undefined);
}

async function resolveRendererUrl() {
  const configuredRendererUrl = getConfiguredRendererUrl();
  if (configuredRendererUrl) {
    return configuredRendererUrl;
  }

  return startLocalServer();
}

async function createMainWindow() {
  const rendererUrl = await resolveRendererUrl();
  const frameless = isFramelessWindowEnabled();
  const windowOptions = {
    width: DEFAULT_WINDOW_WIDTH,
    height: DEFAULT_WINDOW_HEIGHT,
    minWidth: MIN_WINDOW_WIDTH,
    minHeight: MIN_WINDOW_HEIGHT,
    center: true,
    title: "CliRelay",
    backgroundColor: "#f4f4f5",
    show: false,
    autoHideMenuBar: true,
    icon: getWindowIconPath(),
    frame: !frameless,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  };

  if (frameless && process.platform === "win32") {
    Object.assign(windowOptions, {
      // 保留 thickFrame 才能在无边框模式下拖拽边缘调整窗口大小。
      thickFrame: true,
      roundedCorners: true,
    });
  }

  if (frameless && process.platform === "darwin") {
    Object.assign(windowOptions, {
      titleBarStyle: "hiddenInset",
      trafficLightPosition: { x: 14, y: 16 },
    });
  }

  mainWindow = new BrowserWindow(windowOptions);
  refreshTrayMenu();

  mainWindow.once("ready-to-show", () => {
    mainWindow?.show();
    mainWindow?.setSkipTaskbar(false);
    refreshTrayMenu();
  });

  const notifyMaximizeChanged = () => {
    if (!mainWindow) {
      return;
    }

    mainWindow.webContents.send("desktop:window-maximize-changed", mainWindow.isMaximized());
  };

  mainWindow.on("maximize", notifyMaximizeChanged);
  mainWindow.on("unmaximize", notifyMaximizeChanged);
  mainWindow.on("show", refreshTrayMenu);
  mainWindow.on("hide", refreshTrayMenu);
  mainWindow.on("restore", refreshTrayMenu);
  mainWindow.on("minimize", (event) => {
    if (isQuitting) {
      return;
    }

    event.preventDefault();
    hideMainWindowToTray();
  });
  mainWindow.on("close", (event) => {
    if (isQuitting) {
      return;
    }

    event.preventDefault();
    hideMainWindowToTray();
  });
  mainWindow.on("closed", () => {
    mainWindow = null;
    refreshTrayMenu();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (isInternalUrl(url)) {
      return { action: "allow" };
    }

    openExternalUrl(url);
    return { action: "deny" };
  });

  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (isInternalUrl(url)) {
      return;
    }

    event.preventDefault();
    openExternalUrl(url);
  });

  await mainWindow.loadURL(rendererUrl);
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (!mainWindow) {
      return;
    }

    showMainWindowFromTray();
  });

  app.whenReady().then(async () => {
    await loadDesktopBackendBaseOverride();
    app.setAppUserModelId("代理控制台");
    ipcMain.handle("desktop:get-backend-base", () => getBackendBase());
    ipcMain.handle("desktop:set-backend-base", async (_event, backendBase) =>
      setDesktopBackendBaseOverride(backendBase),
    );
    ipcMain.handle("desktop:probe-backend-base", async (_event, backendBase) =>
      probeBackendBase(backendBase),
    );
    ipcMain.handle("desktop:auth-snapshot-read", async () => readDesktopAuthSnapshot());
    ipcMain.handle("desktop:auth-snapshot-write", async (_event, snapshot) => {
      await writeDesktopAuthSnapshot(snapshot);
    });
    ipcMain.handle("desktop:auth-snapshot-clear", async () => {
      await clearDesktopAuthSnapshot();
    });
    ipcMain.handle("desktop:window-minimize", () => {
      hideMainWindowToTray();
    });
    ipcMain.handle("desktop:window-toggle-maximize", () => {
      if (!mainWindow) {
        return false;
      }

      if (mainWindow.isMaximized()) {
        mainWindow.unmaximize();
      } else {
        mainWindow.maximize();
      }

      return mainWindow.isMaximized();
    });
    ipcMain.handle("desktop:window-close", () => {
      hideMainWindowToTray();
    });
    ipcMain.handle("desktop:window-is-maximized", () => mainWindow?.isMaximized() ?? false);
    createTray();
    await createMainWindow();

    app.on("activate", async () => {
      if (mainWindow) {
        showMainWindowFromTray();
        return;
      }

      if (BrowserWindow.getAllWindows().length === 0) {
        await createMainWindow();
      }
    });
  });
}

app.on("before-quit", () => {
  isQuitting = true;
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    releaseDesktopResources();
    app.quit();
  }
});

app.on("quit", () => {
  releaseDesktopResources();
});
