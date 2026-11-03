/**
 * Development: compiles the API once, then recompiles on change (tsc --watch)
 * and restarts the server when the output changes. Works on Windows, macOS
 * and Linux. Reads the repository's root .env.
 *
 *   npm run dev:api            (API on http://localhost:4000)
 *   npm run dev:worker         (optional separate job worker)
 */
import { spawn, spawnSync } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const entry = process.argv[2] === "worker" ? "dist/worker.js" : "dist/main.js";
const tsc = createRequire(import.meta.url).resolve("typescript/bin/tsc");
const envFile = path.resolve(root, "../../.env");

rmSync(path.join(root, "dist"), { recursive: true, force: true });
const first = spawnSync(process.execPath, [tsc, "-p", "tsconfig.build.json"], { cwd: root, stdio: "inherit" });
if (first.status !== 0) process.exit(first.status ?? 1);

const children = [
  spawn(process.execPath, [tsc, "-p", "tsconfig.build.json", "--watch", "--preserveWatchOutput"], { cwd: root, stdio: "inherit" }),
  spawn(process.execPath, ["--watch", ...(existsSync(envFile) ? [`--env-file=${envFile}`] : []), entry], { cwd: root, stdio: "inherit" }),
];
const stop = () => {
  for (const c of children) c.kill();
  process.exit(0);
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
for (const c of children) c.on("exit", (code) => code && code !== 0 && console.error(`[dev] process exited with ${code}`));
