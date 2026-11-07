const fs = require('node:fs');
const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const { chromium } = require('C:/Program Files/WindowsApps/OpenAI.CodexPrimaryRuntime.v26-1105-1297-0_26.1105.1297.0_x64__3k8sg7r9htsxt/dependencies/node/node_modules/playwright');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    for (const period of ['1945-48', '1948-54']) {
      const page = await browser.newPage({ viewport: { width: 1400, height: 1000 }, reducedMotion: 'reduce' });
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      const path = 'Kreativní spolupráce ' + period + '.html';
      const data = JSON.parse(fs.readFileSync(path, 'utf8').match(/<script id="data" type="application\/json">([\s\S]*?)<\/script>/)[1]);
      await page.goto(pathToFileURL(require('path').resolve(path)).href);
      for (let i = 0; i < data.length; i++) {
        await page.locator('#networks button').nth(i).click();
        const panel = page.locator('#network-' + i);
        await panel.locator('[data-node]').first().waitFor();
        assert.equal(await panel.locator('[data-node]').count(), data[i].nodes.length);
        await panel.locator('[data-part=metric]').selectOption('between');
        await panel.locator('[data-part=reset]').click();
        if (data[i].directed) {
          await panel.getByRole('button', { name: 'Vypnout všechny hrany', exact: true }).click();
          await panel.locator('.legend button[aria-pressed]').first().click();
          await panel.locator('[data-part=filtered-layout]').click();
          await panel.locator('[data-part=metric]').selectOption('between');
        }
        await panel.locator('[data-part=search]').fill(data[i].nodes.find(n => n.Type === 'Osoba').Label);
        assert((await panel.locator('[data-part=detail]').innerText()).includes('Betweenness centrality'));
        await panel.locator('[data-part=snapshot]').click();
        const image = panel.locator('[data-part=preview-graph]');
        await image.evaluate(img => img.decode());
        assert(await image.evaluate(img => img.naturalWidth > 0));
        await panel.locator('dialog button', { hasText: 'Zrušit' }).click();
        await panel.locator('[data-part=reset]').click();
        console.log(period, data[i].folder, 'PASS');
      }
      assert.deepEqual(errors, []);
      await page.close();
    }
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
