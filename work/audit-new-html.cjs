const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const { chromium } = require(path.join(process.argv[2], 'node', 'node_modules', 'playwright'));
const results = [];
const periods = process.argv.slice(3).length ? process.argv.slice(3) : ['1954-61', '1961-69'];
const reportName = 'kontrola-' + periods[0].split('-')[0] + '-19' + periods.at(-1).split('-')[1];

async function inspectGeometry(panel) {
  return panel.locator('[data-node]').evaluateAll(marks => {
    const points = marks.map(mark => {
      const circle = mark.tagName === 'circle';
      const radius = Number(mark.getAttribute(circle ? 'r' : 'width')) / (circle ? 1 : 2);
      return { x: Number(mark.getAttribute(circle ? 'cx' : 'x')) + (circle ? 0 : radius),
        y: Number(mark.getAttribute(circle ? 'cy' : 'y')) + (circle ? 0 : radius), radius };
    });
    return { finite: points.every(p => Number.isFinite(p.x + p.y + p.radius)), points };
  });
}

async function inspectPreview(panel, withPanel) {
  await panel.locator('[data-part=snapshot]').click();
  if (withPanel) await panel.locator('[data-part=snapshot-detail]').check();
  const image = panel.locator('[data-part=preview-graph]');
  await image.evaluate(img => img.decode());
  const content = await image.evaluate(async img => {
    const xml = await (await fetch(img.src)).text();
    const doc = new DOMParser().parseFromString(xml, 'image/svg+xml');
    return { errors: doc.querySelectorAll('parsererror').length, width: Number(doc.documentElement.getAttribute('width')),
      height: Number(doc.documentElement.getAttribute('height')), text: doc.documentElement.textContent };
  });
  assert.equal(content.errors, 0);
  assert(content.width > 0 && content.height > 0);
  if (withPanel) assert(content.text.includes('Betweenness centrality'));
  await panel.locator('[data-part=snapshot-legend]').uncheck();
  await image.evaluate(img => img.decode());
  await panel.locator('dialog button', { hasText: 'Zrušit' }).click();
}

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    for (const period of periods) {
      const page = await browser.newPage({ viewport: { width: 1440, height: 1100 }, reducedMotion: 'reduce' });
      page.setDefaultTimeout(120000);
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      const filename = 'Kreativní spolupráce ' + period + '.html';
      const data = JSON.parse(fs.readFileSync(filename, 'utf8').match(/<script id="data" type="application\/json">([\s\S]*?)<\/script>/)[1]);
      await page.goto(pathToFileURL(path.resolve(filename)).href);
      for (let i = 0; i < data.length; i++) {
        const started = Date.now();
        await page.locator('#networks button').nth(i).click();
        const panel = page.locator('#network-' + i);
        const graph = panel.locator('[data-part=graph]');
        await panel.locator('[data-node]').first().waitFor();
        assert.equal(await panel.locator('[data-node]').count(), data[i].nodes.length);
        assert.equal(await panel.locator('[data-part=layer] > path').count(), data[i].edges.length);
        const original = await inspectGeometry(panel);
        assert(original.finite);
        await panel.locator('[data-part=metric]').selectOption('between');
        assert((await inspectGeometry(panel)).finite);
        await panel.locator('[data-part=reset]').click();
        assert.deepEqual((await inspectGeometry(panel)).points, original.points);
        if (data[i].directed) {
          await panel.getByRole('button', { name: 'Vypnout všechny hrany', exact: true }).click();
          assert.equal(await panel.locator('[data-part=layer] > path:visible').count(), 0);
          const category = panel.locator('.legend button[aria-pressed]').first();
          const caption = await category.innerText();
          const role = caption.slice(0, caption.lastIndexOf(' ('));
          await category.click();
          const expectedEdges = data[i].edges.filter(e => e.pozice_kat === role);
          assert.equal(await panel.locator('[data-part=layer] > path:visible').count(), expectedEdges.length);
          await panel.locator('[data-part=filtered-layout]').click();
          await panel.locator('[data-part=metric]').selectOption('between');
          assert((await inspectGeometry(panel)).finite);
        }
        const person = data[i].nodes.find(n => n.Type === 'Osoba');
        await panel.locator('[data-part=search]').fill(person.Label);
        const detail = await panel.locator('[data-part=detail]').innerText();
        assert(detail.includes(person.Label) && detail.includes('Betweenness centrality'));
        assert(!/NaN|undefined/.test(detail));
        await inspectPreview(panel, true);
        await panel.locator('[data-part=reset]').click();
        await panel.locator('[data-part=theme]').click();
        assert.equal(await panel.locator('[data-part=viewer]').getAttribute('data-theme'), 'light');
        await inspectPreview(panel, false);
        await panel.locator('[data-part=theme]').click();
        const view = await graph.getAttribute('viewBox');
        await panel.locator('[data-part=zoom-in]').click();
        assert(Number((await graph.getAttribute('viewBox')).split(' ')[2]) < Number(view.split(' ')[2]));
        await panel.locator('[data-part=reset]').click();
        if (i === 0) {
          await panel.locator('[data-part=toggle-detail]').click();
          assert(await panel.locator('[data-part=detail]').isHidden());
          await panel.locator('[data-part=fullscreen]').click();
          assert(await page.evaluate(() => Boolean(document.fullscreenElement)));
          await panel.locator('[data-part=fullscreen]').click();
          await panel.locator('[data-part=toggle-detail]').click();
          await graph.screenshot({ path: path.join('work', 'graph-' + period + '.png') });
        }
        results.push({ period, network: data[i].folder, milliseconds: Date.now() - started, result: 'PASS' });
        console.log(JSON.stringify(results.at(-1)));
      }
      assert.deepEqual(errors, []);
      await page.close();
      const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
      const phone = await mobile.newPage();
      phone.setDefaultTimeout(120000);
      await phone.goto(pathToFileURL(path.resolve(filename)).href);
      const graph = phone.locator('#network-0 [data-part=graph]');
      await graph.scrollIntoViewIfNeeded();
      const rect = await graph.boundingBox();
      const before = (await graph.getAttribute('viewBox')).split(' ').map(Number);
      const cdp = await mobile.newCDPSession(phone);
      const center = { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: center.x - 30, y: center.y }, { x: center.x + 30, y: center.y }] });
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: center.x - 60, y: center.y }, { x: center.x + 60, y: center.y }] });
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      assert(Number((await graph.getAttribute('viewBox')).split(' ')[2]) < before[2]);
      assert(await phone.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      console.log(period, 'mobile pinch PASS');
      await mobile.close();
    }
    fs.writeFileSync(path.join('outputs', reportName, 'html-kontrola.json'), JSON.stringify(results, null, 2) + '\n');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
