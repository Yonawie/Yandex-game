const { chromium } = require('playwright');
const url = process.argv[2];
(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/local/bin/google-chrome', args: ['--no-sandbox','--disable-gpu'] });
  const page = await browser.newPage();
  try {
    const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(3000);
    const title = await page.title();
    const hasRoot = await page.evaluate(() => Boolean(document.getElementById('game-root')));
    console.log(JSON.stringify({ url, status: resp?.status() ?? 0, title, hasRoot, ok: hasRoot && (resp?.status() ?? 0) === 200 }));
  } catch (e) {
    console.log(JSON.stringify({ url, ok: false, error: String(e.message).split('\n')[0] }));
  } finally {
    await browser.close();
  }
})();
