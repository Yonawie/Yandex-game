/**
 * Live store screenshots from the built game (portrait 1080×1920, RU UI).
 * Usage: node scripts/capture-store.mjs [baseUrl]
 */
import { chromium } from "playwright";
import sharp from "sharp";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "store");
const rawDir = join(root, "store", "_raw");
const BASE = (process.argv[2] || "http://127.0.0.1:4173/").replace(/\/?$/, "/");
const W = 390;
const H = 844;

mkdirSync(rawDir, { recursive: true });

async function toStoreJpg(pngPath, outName) {
  const buf = await sharp(pngPath)
    .resize(1080, 1920, { fit: "cover", position: "centre" })
    .jpeg({ quality: 88, mozjpeg: true })
    .toBuffer();
  writeFileSync(join(outDir, outName), buf);
  console.log("✓", outName, `${(buf.length / 1024).toFixed(0)} KB`);
}

async function waitGame(page) {
  await page.waitForFunction(
    () => {
      const boot = document.getElementById("boot");
      const view = document.getElementById("echo-view");
      const g = window.__echoGame;
      return !!g && !!view && (!boot || boot.classList.contains("hide") || !boot.isConnected);
    },
    { timeout: 60000 },
  );
  await page.waitForTimeout(450);
}

async function main() {
  const url = `${BASE}?lang=ru`;
  console.log("→", url);
  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  const page = await browser.newPage({
    viewport: { width: W, height: H },
    deviceScaleFactor: 2,
    locale: "ru-RU",
  });

  await page.goto(url, { waitUntil: "networkidle", timeout: 90000 });
  await waitGame(page);

  // MENU
  await page.evaluate(() => {
    window.__echoGame.scene.getScene("Main").core.phase = "menu";
  });
  await page.waitForTimeout(500);
  const menuPng = join(rawDir, "menu.png");
  await page.locator("#game").screenshot({ path: menuPng });
  await toStoreJpg(menuPng, "shot-menu-1080x1920.jpg");

  // PLAY
  await page.evaluate(() => {
    window.__echoGame.scene.getScene("Main").core.start("easy");
  });
  await page.waitForTimeout(700);
  const playPng = join(rawDir, "play.png");
  await page.locator("#game").screenshot({ path: playPng });
  await toStoreJpg(playPng, "shot-play-1080x1920.jpg");

  // STRIKE
  const struck = await page.evaluate(() => {
    const g = window.__echoGame.scene.getScene("Main").core;
    const wall = [];
    for (const stack of g.stacks) for (const cell of stack) wall.push(cell.letter);
    const candidates = ["СОН", "ДОМ", "КОТ", "ЛЕС", "МИР", "ВОДА", "СТЕНА", "РЕКА", "ГОРА"];
    const word = candidates.find((w) => [...w].some((ch) => wall.includes(ch))) || "СОН";
    const letters = [...word];
    while (letters.length < 8) letters.push("А");
    g.tray = letters;
    g.pick = [];
    g.previewIds = new Set();
    for (let i = 0; i < word.length; i++) g.selectTray(i);
    const res = g.submit();
    return { word, ok: !!res?.ok, stamp: g.stamp };
  });
  console.log("strike", struck);
  await page.waitForTimeout(160);
  const strikePng = join(rawDir, "strike.png");
  await page.locator("#game").screenshot({ path: strikePng });

  if (!struck.ok) {
    await page.evaluate(() => {
      const g = window.__echoGame.scene.getScene("Main").core;
      g.start("easy");
      const word = "СТЕНА";
      for (let i = 0; i < Math.min(word.length, g.cols); i++) {
        if (!g.stacks[i].length) {
          g.stacks[i].push({ letter: word[i], armor: 0, mirror: false, id: 9000 + i });
        } else {
          g.stacks[i][0] = { ...g.stacks[i][0], letter: word[i], armor: 0 };
        }
      }
      g.tray = [...word, "А", "О", "У"];
      g.pick = [];
      g.previewIds = new Set();
      for (let i = 0; i < word.length; i++) g.selectTray(i);
      return g.submit();
    });
    await page.waitForTimeout(160);
    await page.locator("#game").screenshot({ path: strikePng });
  }

  await toStoreJpg(strikePng, "shot-strike-1080x1920.jpg");
  await browser.close();
  console.log("✓ live RU store shots ready in store/");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
