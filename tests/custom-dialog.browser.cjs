// Optional browser regression: requires Playwright and Chromium, not needed to use BoxFit.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { pathToFileURL } = require('node:url');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const isolated = fs.mkdtempSync(path.join(os.tmpdir(), 'boxfit-dialog-'));
const file = path.join(isolated, 'index.html');
fs.writeFileSync(file, html);

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.BOXFIT_BROWSER_PATH || '/usr/bin/chromium', headless: true, args: ['--no-sandbox'] });
  try {
    let page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const errors = [], externalRequests = [];
    function observe(target) {
      target.on('pageerror', err => errors.push(err.message));
      target.on('request', request => { if (/^https?:/.test(request.url())) externalRequests.push(request.url()); });
    }
    observe(page);
    let mode = 'file://';
    try { await page.goto(pathToFileURL(file).href); }
    catch (err) {
      if (!err.message.includes('ERR_BLOCKED_BY_ADMINISTRATOR')) throw err;
      console.log('FILE_DIRECT_BLOCKED: ' + err.message.split('\n')[0]);
      mode = 'setContent fallback; file:// was not verified';
      await page.close();
      page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
      observe(page);
    }
    if (mode !== 'file://') await page.setContent(html, { waitUntil: 'load' });
    assert.equal(await page.locator('#custom-box-form').isVisible(), false);
    await page.click('#example');
    assert.match(await page.locator('.needed').innerText(), /22 × 17 × 12/);
    await page.click('#open-custom-box');
    assert.equal(await page.locator('#custom-box-dialog').isVisible(), true);
    assert.equal(await page.evaluate(() => document.activeElement.id), 'box-name');
    await page.click('#custom-box-form button[type=submit]');
    assert.equal(await page.locator('#custom-error').isVisible(), true);
    assert.equal(await page.locator('#custom-box-dialog').isVisible(), true);
    await page.click('#cancel-custom-box');
    assert.equal(await page.locator('#custom-box-form').isVisible(), false);
    await page.click('#open-custom-box');
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#custom-box-form').isVisible(), false);
    // Item axes must rotate: width 18 -> box height; depth 28 -> box width; height 23 -> box depth.
    for (const [i, id] of ['width', 'depth', 'height'].entries()) await page.fill('#' + id, ['18', '28', '23'][i]);
    await page.click('#open-custom-box');
    await page.fill('#box-name', '내 택배 박스 30');
    for (const [i, id] of ['box-width', 'box-depth', 'box-height'].entries()) await page.fill('#' + id, ['30', '25', '20'][i]);
    await page.screenshot({ path: path.join(isolated, 'dialog.png') });
    await page.click('#custom-box-form button[type=submit]');
    assert.equal(await page.locator('#custom-box-dialog').isVisible(), false);
    assert.equal(await page.locator('#custom-count').innerText(), '1개');
    assert.match(await page.locator('#custom-box-list').innerText(), /내 택배 박스 30[\s\S]*30 × 25 × 20 cm/);
    assert.match(await page.locator('#custom-status').innerText(), /추가했어요/);
    const card = page.locator('.box-card').filter({ has: page.locator('h3', { hasText: '내 택배 박스 30' }) });
    assert.equal(await card.count(), 1);
    assert.equal(await card.locator('.source-tag').innerText(), '내 박스');
    assert.match(await card.innerText(), /15,000 cm³/);
    assert.match(await card.locator('.orientation').innerText(), /28 × 23 × 18/);
    assert.match(await card.locator('.orientation').innerText(), /가로 ← 물건 세로 · 세로 ← 높이 · 높이 ← 가로/);
    assert.equal(await page.locator('.box-card').count(), 3);
    await page.screenshot({ path: path.join(isolated, 'saved-desktop.png'), fullPage: true });
    await page.locator('input[name=padding][value="3"]').check();
    await page.click('#box-form button[type=submit]');
    assert.equal(await card.count(), 0);
    await page.locator('input[name=padding][value="2"]').check();
    await page.click('#box-form button[type=submit]');
    assert.equal(await card.count(), 1);
    for (const width of [375, 320]) {
      await page.setViewportSize({ width, height: 812 });
      await page.click('#open-custom-box');
      assert.ok(await page.locator('#custom-box-dialog').isVisible());
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      const bounds = await page.locator('#custom-box-dialog').boundingBox();
      assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= width);
      await page.click('#close-custom-box');
    }
    await page.screenshot({ path: path.join(isolated, 'saved-mobile.png'), fullPage: true });
    await page.locator('#custom-box-list button').click();
    assert.equal(await page.locator('#custom-count').innerText(), '0개');
    assert.equal(await card.count(), 0);
    assert.deepEqual(errors, []);
    assert.deepEqual(externalRequests, []);
    console.log('PASS ' + mode + ': open, focus, invalid save, cancel, Escape, save 30×25×20, list and recommendation update, rotation, padding exclusion, mobile, deletion, zero JS errors/external requests.');
    console.log('Screenshots: ' + isolated);

    // Real browser storage using an intercepted test origin. No HTTP server is started.
    const stored = await browser.newPage();
    await stored.route('http://boxfit.test/**', route => route.fulfill({ contentType: 'text/html', body: html }));
    await stored.goto('http://boxfit.test/');
    await stored.click('#open-custom-box');
    await stored.fill('#box-name', '테스트 박스');
    for (const [i, id] of ['box-width', 'box-depth', 'box-height'].entries()) await stored.fill('#' + id, ['30', '25', '20'][i]);
    await stored.click('#custom-box-form button[type=submit]');
    assert.match(await stored.locator('#custom-box-list').innerText(), /테스트 박스/);
    for (const [i, id] of ['width', 'depth', 'height'].entries()) await stored.fill('#' + id, ['28', '23', '18'][i]);
    await stored.click('#box-form button[type=submit]');
    assert.match(await stored.locator('#results').innerText(), /테스트 박스/);
    await stored.reload();
    assert.match(await stored.locator('#custom-box-list').innerText(), /테스트 박스/);
    await stored.evaluate(() => { Storage.prototype.setItem = () => { throw new Error('storage blocked'); }; });
    await stored.click('#open-custom-box');
    await stored.fill('#box-name', '현재 창 박스');
    for (const [i, id] of ['box-width', 'box-depth', 'box-height'].entries()) await stored.fill('#' + id, ['30', '25', '20'][i]);
    await stored.click('#custom-box-form button[type=submit]');
    assert.equal(await stored.locator('#custom-count').innerText(), '2개');
    assert.match(await stored.locator('#storage-note').innerText(), /현재 창에서만 유지/);
    for (const [i, id] of ['width', 'depth', 'height'].entries()) await stored.fill('#' + id, ['28', '23', '18'][i]);
    await stored.click('#box-form button[type=submit]');
    assert.match(await stored.locator('#results').innerText(), /현재 창 박스/);
    console.log('PASS intercepted test origin: persistence and blocked-storage fallback.');
  } finally { await browser.close(); }
})().catch(err => { console.error(err); process.exitCode = 1; });
