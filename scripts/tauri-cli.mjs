#!/usr/bin/env node
import { spawn, spawnSync } from "node:child_process";
import { copyFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);

if (args[0] === "dev") {
  prepareMacDevBundle();
}

const tauriBinary = resolve(
  repoRoot,
  "node_modules",
  ".bin",
  process.platform === "win32" ? "tauri.cmd" : "tauri"
);

const tauri = spawn(tauriBinary, args, {
  cwd: repoRoot,
  env: process.env,
  stdio: "inherit"
});

tauri.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});

function prepareMacDevBundle() {
  if (process.platform !== "darwin") {
    return;
  }

  runChecked("pnpm", ["build"]);
  runChecked("cargo", ["build", "--manifest-path", "src-tauri/Cargo.toml"]);
  syncDebugBundleBinary();
}

function runChecked(command, commandArgs) {
  const result = spawnSync(command, commandArgs, {
    cwd: repoRoot,
    env: process.env,
    stdio: "inherit"
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function syncDebugBundleBinary() {
  const debugBinary = resolve(repoRoot, "src-tauri", "target", "debug", "cyro");
  const bundleBinary = resolve(
    repoRoot,
    "src-tauri",
    "target",
    "debug",
    "bundle",
    "macos",
    "Cyro.app",
    "Contents",
    "MacOS",
    "cyro"
  );

  if (!existsSync(debugBinary) || !existsSync(bundleBinary)) {
    return;
  }

  copyFileSync(debugBinary, bundleBinary);
  console.log("[tauri-dev] Synced current debug binary into macOS debug app bundle.");
}
