import { spawn } from "node:child_process";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const rendererUrl = process.env.CODE_PROXY_ADMIN_URL || "http://127.0.0.1:5173/manage/";
const vitePort = new URL(rendererUrl).port || "5173";
const isWindows = process.platform === "win32";
const bunExecutable = process.execPath;
const electronExecutable = path.join(
  rootDir,
  "node_modules",
  ".bin",
  isWindows ? "electron.cmd" : "electron",
);

let viteProcess = null;
let electronProcess = null;
let isShuttingDown = false;

function spawnProcess(command, args, options = {}) {
  return spawn(command, args, {
    cwd: rootDir,
    stdio: "inherit",
    shell: isWindows,
    ...options,
  });
}

async function canReach(url, timeoutMs = 1200) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: "manual",
    });
    return response.status < 500;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

async function waitForRenderer(url, timeoutMs = 45_000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (await canReach(url, 1500)) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error(`Timed out waiting for ${url}`);
}

function stopChild(child) {
  if (!child || child.killed) {
    return;
  }

  child.kill();
}

function shutdown(exitCode = 0) {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;
  stopChild(electronProcess);
  stopChild(viteProcess);
  process.exit(exitCode);
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

if (!(await canReach(rendererUrl))) {
  viteProcess = spawnProcess(bunExecutable, [
    "run",
    "dev",
    "--",
    "--host",
    "127.0.0.1",
    "--port",
    vitePort,
    "--strictPort",
  ]);
  viteProcess.on("exit", (code) => {
    if (!isShuttingDown && code !== 0) {
      shutdown(code ?? 1);
    }
  });
}

await waitForRenderer(rendererUrl);

electronProcess = spawnProcess(electronExecutable, ["."], {
  env: {
    ...process.env,
    CODE_PROXY_ADMIN_URL: rendererUrl,
  },
});

electronProcess.on("exit", (code) => {
  shutdown(code ?? 0);
});
