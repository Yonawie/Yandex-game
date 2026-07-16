#!/usr/bin/env node
/**
 * One-command playtest: Vite + Cloudflare quick tunnel → public URL.
 * Usage: npm run play
 */
import { spawn } from "node:child_process";
import { createWriteStream, existsSync, chmodSync, mkdirSync } from "node:fs";
import { pipeline } from "node:stream/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import http from "node:http";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const PORT = Number(process.env.PORT || 5173);
const toolsDir = path.join(root, "tools");
const cfPath = path.join(toolsDir, "cloudflared");
const CF_URL =
  "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64";

function log(msg) {
  console.log(msg);
}

function httpOk(url, timeoutMs = 1500) {
  return new Promise((resolve) => {
    const req = http.get(url, { timeout: timeoutMs }, (res) => {
      res.resume();
      resolve((res.statusCode ?? 500) < 500);
    });
    req.on("error", () => resolve(false));
    req.on("timeout", () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function ensureCloudflared() {
  if (existsSync(cfPath)) return cfPath;
  if (existsSync("/tmp/cloudflared")) return "/tmp/cloudflared";

  mkdirSync(toolsDir, { recursive: true });
  log("↓ Скачиваю cloudflared (один раз)…");
  const res = await fetch(CF_URL);
  if (!res.ok || !res.body) {
    throw new Error(`Не удалось скачать cloudflared: ${res.status}`);
  }
  await pipeline(res.body, createWriteStream(cfPath));
  chmodSync(cfPath, 0o755);
  return cfPath;
}

function startVite() {
  log(`▶ Запускаю Vite на http://127.0.0.1:${PORT}`);
  const child = spawn("npx", ["vite", "--host", "0.0.0.0", "--port", String(PORT)], {
    cwd: root,
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env },
  });
  child.stdout.on("data", (d) => process.stdout.write(d));
  child.stderr.on("data", (d) => process.stderr.write(d));
  return child;
}

function startTunnel(bin) {
  return new Promise((resolve, reject) => {
    const child = spawn(bin, ["tunnel", "--url", `http://127.0.0.1:${PORT}`, "--no-autoupdate"], {
      cwd: root,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let resolved = false;
    const onChunk = (buf) => {
      const text = buf.toString();
      process.stderr.write(text);
      const m = text.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
      if (m && !resolved) {
        resolved = true;
        resolve({ url: m[0], child });
      }
    };
    child.stdout.on("data", onChunk);
    child.stderr.on("data", onChunk);
    child.on("exit", (code) => {
      if (!resolved) reject(new Error(`cloudflared exited ${code}`));
    });
    setTimeout(() => {
      if (!resolved) reject(new Error("Не дождался URL туннеля"));
    }, 60000);
  });
}

async function main() {
  const bin = await ensureCloudflared();
  let vite = null;
  if (!(await httpOk(`http://127.0.0.1:${PORT}/`))) {
    vite = startVite();
    for (let i = 0; i < 40; i++) {
      if (await httpOk(`http://127.0.0.1:${PORT}/`)) break;
      await new Promise((r) => setTimeout(r, 250));
    }
  } else {
    log(`✓ Vite уже на порту ${PORT}`);
  }

  const { url } = await startTunnel(bin);
  log("\n══════════════════════════════════════");
  log(`  Сотослов → ${url}`);
  log("══════════════════════════════════════\n");
  log("Открой ссылку на телефоне или в браузере. Ctrl+C — стоп.\n");

  process.on("SIGINT", () => {
    vite?.kill();
    process.exit(0);
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
