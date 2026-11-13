const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const { chromium } = require(path.join(process.argv[2], 'node', 'node_modules', 'playwright'));
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    for (const filename of fs.readdirSync('.').filter(name => /^Kreativní spolupráce .*\.html$/.test(name))) {
      const data = JSON.parse(fs.readFileSync(filename, 'utf8').match(/<script id="data" type="application\/json">([\s\S]*?)<\/script>/)[1]);
      const page = await browser.newPage({ viewport: { width: 1440, height: 1100 }, reducedMotion: 'reduce' });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(pathToFileURL(path.resolve(filename)).href);
      await page.evaluate(() => {
        window.forceCalls = 0;
        const original = layoutForceAtlas2;
        layoutForceAtlas2 = (...args) => { window.forceCalls++; return original(...args); };
      });
      for (let i = 0; i < data.length; i++) {
        await page.locator('#networks button').nth(i).click();
        const panel = page.locator('#network-' + i);
        assert.equal(await panel.locator('[data-node]').count(), data[i].nodes.length);
        assert.equal(await panel.locator('[data-part=layer] > path').count(), data[i].edges.length);
        assert.equal(await page.evaluate(() => window.forceCalls), 0, 'Tab switching recomputed layout');
      }
      await page.locator('#networks button').first().click();
      const panel = page.locator('#network-0');
      await panel.getByRole('button', { name: 'Vypnout všechny hrany', exact: true }).click();
      await panel.locator('.legend button[aria-pressed]').nth(-2).click();
      await panel.locator('[data-part=filtered-layout]').click();
      assert(await page.evaluate(() => window.forceCalls > 0), 'Filtered layout was not recomputed');
      await panel.locator('[data-part=metric]').selectOption('between');
      const person = data[0].nodes.find(node => node.Type === 'Osoba');
      await panel.locator('[data-part=search]').fill(person.Label);
      assert((await panel.locator('[data-part=detail]').innerText()).includes('Betweenness centrality'));
      await panel.locator('[data-part=reset]').click();
      const positions = await panel.locator('[data-node]').evaluateAll(marks => marks.map(mark => {
        const circle = mark.tagName === 'circle';
        const radius = Number(mark.getAttribute('width')) / 2;
        return circle ? [Number(mark.getAttribute('cx')), Number(mark.getAttribute('cy'))]
          : [Number(mark.getAttribute('x')) + radius, Number(mark.getAttribute('y')) + radius];
      }));
      for (let i = 0; i < positions.length; i++) {
        assert(positions[i].every((value, j) => Math.abs(value - data[0].initialLayout.coordinates[i][j]) < 1e-8));
      }
      await panel.locator('[data-part=snapshot]').click();
      await panel.locator('[data-part=preview-graph]').evaluate(image => image.decode());
      await panel.locator('dialog button', { hasText: 'Zrušit' }).click();
      assert.deepEqual(errors, []);
      console.log(filename, 'six cached cards, filtered FA2, metrics, reset, snapshot PASS');
      await page.close();
    }
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, reducedMotion: 'reduce' });
    const page = await context.newPage();
    await page.goto(pathToFileURL(path.resolve('Kreativní spolupráce 1976-92.html')).href);
    const graph = page.locator('#network-0 [data-part=graph]');
    await graph.scrollIntoViewIfNeeded();
    const rectangle = await graph.boundingBox();
    const before = Number((await graph.getAttribute('viewBox')).split(' ')[2]);
    const session = await context.newCDPSession(page);
    const x = rectangle.x + rectangle.width / 2, y = rectangle.y + rectangle.height / 2;
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x - 25, y }, { x: x + 25, y }] });
    await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x - 60, y }, { x: x + 60, y }] });
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    assert(Number((await graph.getAttribute('viewBox')).split(' ')[2]) < before);
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    await context.close();
    console.log('Largest page mobile pinch PASS');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
