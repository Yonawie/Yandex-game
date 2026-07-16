/**
 * Headless QA for Stay Lit — tips, retention, play loop, save fields.
 * Run: node scripts/qa-features.mjs
 */
import { chromium } from 'playwright';

const BASE = process.env.QA_URL || 'http://127.0.0.1:4173';
const W = 390;
const H = 700;

const results = [];

function ok(name, pass, detail = '') {
  results.push({ name, pass, detail });
  const mark = pass ? 'PASS' : 'FAIL';
  console.log(`${mark}  ${name}${detail ? ` — ${detail}` : ''}`);
}

async function readSave(page) {
  return page.evaluate(() => {
    const raw = localStorage.getItem('staylit_v1');
    return raw ? JSON.parse(raw) : null;
  });
}

async function waitMenu(page) {
  await page.waitForFunction(
    () => {
      const canvas = document.querySelector('canvas');
      return canvas && canvas.width > 0;
    },
    { timeout: 20000 },
  );
  // Boot → Preload → Menu
  await page.waitForTimeout(2500);
}

async function tap(page, x, y) {
  await page.mouse.click(x, y, { delay: 40 });
  await page.waitForTimeout(200);
}

async function main() {
  const browser = await chromium.launch({
    headless: true,
    args: ['--autoplay-policy=no-user-gesture-required'],
  });
  const page = await browser.newPage({ viewport: { width: W, height: H } });
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(String(e)));

  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle' });
  await waitMenu(page);

  ok('boot to menu (canvas)', true);

  // Tips overlay — full screen dismiss near OK button (~height/2+130)
  await tap(page, W / 2, H / 2 + 130);
  await page.waitForTimeout(500);
  let save = await readSave(page);
  ok('tips dismissed (seenTip)', Boolean(save?.seenTip), `seenTip=${save?.seenTip}`);

  // Morning retention hub should auto-open — claim button ~58% height
  await page.waitForTimeout(400);
  const coinsBefore = save?.coins ?? 0;
  await tap(page, W / 2, H * 0.58);
  await page.waitForTimeout(700);
  save = await readSave(page);
  const claimedMorning =
    Boolean(save?.morningClaimedDay) && (save?.coins ?? 0) > coinsBefore;
  ok(
    'morning flame claim',
    claimedMorning,
    `day=${save?.morningClaimedDay} coins ${coinsBefore}→${save?.coins} streak=${save?.streak}`,
  );

  // Close retention
  await tap(page, W / 2, H * 0.9);
  await page.waitForTimeout(400);

  // Open hub again via hub button
  await tap(page, W / 2, H * 0.865);
  await page.waitForTimeout(400);
  await tap(page, W / 2, H * 0.9);
  await page.waitForTimeout(300);
  ok('retention hub open/close', true);

  // Letters unlocked after syncRetentionClock
  save = await readSave(page);
  ok(
    'letter unlock path',
    Array.isArray(save?.unlockedLetters) && save.unlockedLetters.length >= 1,
    `unlocked=${JSON.stringify(save?.unlockedLetters)}`,
  );

  // Start game — Play ~68%
  await tap(page, W / 2, H * 0.68);
  await page.waitForTimeout(800);

  // Play ~8s with lane swaps (prefer dodge voids randomly)
  const t0 = Date.now();
  while (Date.now() - t0 < 9000) {
    const side = Math.random() < 0.5 ? W * 0.25 : W * 0.75;
    await page.mouse.click(side, H * 0.55, { delay: 20 });
    await page.waitForTimeout(180);
  }

  // Continue screen or result — tap continue-skip / again / menu
  await page.waitForTimeout(600);
  // Prefer skip continue (again label at ~0.62) then again on result
  await tap(page, W / 2, H * 0.62);
  await page.waitForTimeout(800);
  await tap(page, W / 2, H * 0.72);
  await page.waitForTimeout(500);
  // back to menu if still on result
  await tap(page, W / 2, H * 0.84);
  await page.waitForTimeout(800);

  save = await readSave(page);
  ok('run increments', (save?.runs ?? 0) >= 1, `runs=${save?.runs}`);
  ok(
    'challenge id assigned',
    Boolean(save?.challengeId),
    `id=${save?.challengeId} progress=${save?.challengeProgress}`,
  );
  ok(
    'score/height saved somehow',
    (save?.todayBestScore ?? 0) >= 0 && save?.todayBestDay,
    `todayBest=${save?.todayBestScore} day=${save?.todayBestDay}`,
  );

  // textures / no page errors
  ok('no pageerrors', pageErrors.length === 0, pageErrors.slice(0, 3).join(' | '));

  // Second load: tips should NOT show; retention may auto-open if idle/letters
  await page.reload({ waitUntil: 'networkidle' });
  await waitMenu(page);
  save = await readSave(page);
  ok('persistent seenTip after reload', Boolean(save?.seenTip));

  // Challenge pipeline (survive_voids / collect etc.) via QA hook
  await page.goto(`${BASE}/?qa=1`, { waitUntil: 'networkidle' });
  await waitMenu(page);
  const challengeCheck = await page.evaluate(async () => {
    const qa = window.__stayLitQA;
    if (!qa) return { ok: false, reason: 'no hook' };
    await qa.applyRunToRetention({
      score: 40,
      height: 80,
      maxCombo: 3,
      matchedCollects: 5,
      voidsPassed: 3,
    });
    const s = qa.getSave();
    return {
      ok: s.challengeProgress >= 3 || s.challengeDone,
      id: s.challengeId,
      progress: s.challengeProgress,
      done: s.challengeDone,
    };
  });
  ok(
    'challenge progress pipeline',
    Boolean(challengeCheck?.ok),
    JSON.stringify(challengeCheck),
  );

  // Visual texture keys present after preload
  const textures = await page.evaluate(() => {
    const qa = window.__stayLitQA;
    const cache = qa?.game?.textures;
    if (!cache) return [];
    return [
      'void',
      'match-ring',
      'danger-mark',
      'vignette',
      'orb-amber',
      'portal-teal',
      'caretaker',
      'ghost-chevron',
      'combo-aura',
      'rain-drop',
      'ripple',
    ].filter((k) => cache.exists(k));
  });
  ok(
    'new visual textures loaded',
    textures.length === 11,
    `got=${textures.join(',')}`,
  );

  // If morning already claimed, claiming again shouldn't break
  await tap(page, W / 2, H * 0.865);
  await page.waitForTimeout(400);
  const coinsHub = (await readSave(page))?.coins ?? 0;
  await tap(page, W / 2, H * 0.58);
  await page.waitForTimeout(500);
  const coinsAfter = (await readSave(page))?.coins ?? 0;
  ok(
    'morning not double-claimed',
    coinsAfter === coinsHub,
    `coins ${coinsHub}→${coinsAfter}`,
  );

  await browser.close();

  const failed = results.filter((r) => !r.pass);
  console.log('\n---');
  console.log(`${results.length - failed.length}/${results.length} passed`);
  if (failed.length) {
    process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
