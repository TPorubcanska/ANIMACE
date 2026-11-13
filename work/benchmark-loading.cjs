const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require(path.join(process.argv[2], 'node', 'node_modules', 'playwright'));
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1100 }, reducedMotion: 'reduce' });
    page.setDefaultTimeout(180000);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const filename = 'Kreativní spolupráce 1976-92.html';
    let start = Date.now();
    await page.goto(pathToFileURL(path.resolve(filename)).href);
    await page.locator('#network-0 [data-node]').first().waitFor();
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const initialMs = Date.now() - start;
    start = Date.now();
    await page.locator('#networks button').nth(1).click();
    await page.locator('#network-1 [data-node]').first().waitFor();
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const result = { initialMs, secondCardMs: Date.now() - start, errors };
    console.log(JSON.stringify(result));
    fs.writeFileSync(process.argv[3], JSON.stringify(result, null, 2));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
