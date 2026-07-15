#!/usr/bin/env node
/**
 * One-command playtest for Yandex HTML5 games.
 * Starts Vite (if needed) + Cloudflare quick tunnel and prints a public URL.
 *
 * Usage: npm run play
 */
import { spawn } from 'node:child_process';
import { createWriteStream, existsSync, chmodSync, mkdirSync } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import http from 'node:http';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const PORT = Number(process.env.PORT || 5173);
const toolsDir = path.join(root, 'tools');
const cfPath = path.join(toolsDir, 'cloudflared');
const CF_URL =
  'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64';

function log(msg) {
  console.log(msg);
}

function httpOk(url, timeoutMs = 1500) {
  return new Promise((resolve) => {
    const req = http.get(url, { timeout: timeoutMs }, (res) => {
      res.resume();
      resolve((res.statusCode ?? 500) < 500);
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function ensureCloudflared() {
  if (existsSync(cfPath)) return cfPath;
  if (existsSync('/tmp/cloudflared')) return '/tmp/cloudflared';

  mkdirSync(toolsDir, { recursive: true });
  log('↓ Скачиваю cloudflared (один раз)…');
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
  const child = spawn('npx', ['vite', '--host', '0.0.0.0', '--port', String(PORT)], {
    cwd: root,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env },
  });
  child.stdout.on('data', (d) => process.stdout.write(d));
  child.stderr.on('data', (d) => process.stderr.write(d));
  child.on('exit', (code) => {
    if (code) log(`Vite вышел с кодом ${code}`);
  });
  return child;
}

function startTunnel(bin) {
  return new Promise((resolve, reject) => {
    const child = spawn(bin, ['tunnel', '--url', `http://127.0.0.1:${PORT}`], {
      cwd: root,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let resolved = false;
    const onChunk = (buf) => {
      const text = buf.toString();
      process.stderr.write(text);
      const match = text.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/i);
      if (match && !resolved) {
        resolved = true;
        resolve({ child, url: match[0] });
      }
    };

    child.stdout.on('data', onChunk);
    child.stderr.on('data', onChunk);
    child.on('error', reject);
    child.on('exit', (code) => {
      if (!resolved) reject(new Error(`cloudflared exit ${code}`));
    });

    setTimeout(() => {
      if (!resolved) reject(new Error('Таймаут: URL туннеля не получен за 45с'));
    }, 45000);
  });
}

async function waitForVite(retries = 40) {
  for (let i = 0; i < retries; i++) {
    if (await httpOk(`http://127.0.0.1:${PORT}/`)) return true;
    await new Promise((r) => setTimeout(r, 250));
  }
  return false;
}

async function main() {
  let viteChild = null;
  const alreadyUp = await httpOk(`http://127.0.0.1:${PORT}/`);
  if (!alreadyUp) {
    viteChild = startVite();
    const ok = await waitForVite();
    if (!ok) throw new Error('Vite не поднялся');
  } else {
    log(`✓ Vite уже работает на порту ${PORT}`);
  }

  const bin = await ensureCloudflared();
  log('▶ Открываю публичный туннель…');
  const { child: tunnelChild, url } = await startTunnel(bin);

  const stop = () => {
    tunnelChild.kill('SIGTERM');
    if (viteChild) viteChild.kill('SIGTERM');
    process.exit(0);
  };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);

  console.log('\n========================================');
  console.log('  ИГРА ГОТОВА К ПРОВЕРКЕ');
  console.log(`  ${url}`);
  console.log('========================================');
  console.log('Открой ссылку на телефоне или в браузере.');
  console.log('Остановка: Ctrl+C\n');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
