import { spawn } from "node:child_process";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const isWindows = process.platform === "win32";
const electronExecutable = path.join(
  rootDir,
  "node_modules",
  ".bin",
  isWindows ? "electron.exe" : "electron",
);

const env = {
  ...process.env,
};
delete env.ELECTRON_RUN_AS_NODE;

const electronProcess = spawn(electronExecutable, ["."], {
  cwd: rootDir,
  stdio: "inherit",
  shell: isWindows,
  env,
});

electronProcess.on("exit", (code) => {
  process.exit(code ?? 0);
});
