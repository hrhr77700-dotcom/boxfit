// Run with Playwright and Chromium installed: node tests/recommendation-filters.browser.cjs
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const screenshots = fs.mkdtempSync(path.join(os.tmpdir(), 'boxfit-filters-'));

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.BOXFIT_BROWSER_PATH || '/usr/bin/chromium',
    headless: true,
    args: ['--no-sandbox']
  });
  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 950 } });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    // Serve the same standalone HTML under a test origin, without external network requests.
    await page.route('https://boxfit.test/**', route => route.fulfill({ contentType: 'text/html', body: html }));
    await page.goto('https://boxfit.test/');
    const productCards = page.getByRole('region', { name: '판매 상품 추천' }).locator('.box-card');
    const customCards = page.getByRole('region', { name: '맞는 내 박스', exact: true }).locator('.box-card');
    const submit = page.locator('#box-form button[type=submit]');

    async function search(dimensions, padding = 2) {
      for (const [index, id] of ['width', 'depth', 'height'].entries()) {
        await page.fill('#' + id, String(dimensions[index]));
      }
      await page.locator(`input[name=padding][value="${padding}"]`).check();
      await submit.click();
    }
    async function saveBox(name, dimensions) {
      await page.fill('#box-name', name);
      for (const [index, id] of ['box-width', 'box-depth', 'box-height'].entries()) {
        await page.fill('#' + id, String(dimensions[index]));
      }
      await page.locator('#custom-box-form button[type=submit]').click();
    }

    // Choosing filters before the first search should not create validation errors.
    await page.locator('#quantity-single').check();
    assert.equal(await page.locator('#input-error').isVisible(), false);
    await page.click('#example');
    assert.equal(await productCards.count(), 1);
    assert.match(await productCards.innerText(), /3호 크기/);
    assert.match(await productCards.locator('a').getAttribute('href'), /9618455300$/);
    assert.equal(await page.getByRole('region', { name: '맞는 예시 박스와 내 박스', exact: true }).locator('.box-card').count(), 3);
    await page.locator('#quantity-all').check();
    assert.equal(await productCards.count(), 3);
    assert.deepEqual(await productCards.first().locator('.remaining-space dd').allTextContents(), ['7 cm', '3 cm', '5 cm']);
    await page.screenshot({ path: path.join(screenshots, 'desktop.png'), fullPage: true });

    // The same gaps must follow the displayed box axes after rotation.
    await search([10, 20, 15]);
    assert.match(await productCards.first().locator('.orientation').innerText(), /20 × 15 × 10/);
    assert.deepEqual(await productCards.first().locator('.remaining-space dd').allTextContents(), ['7 cm', '3 cm', '5 cm']);

    // A single-box purchase cannot fit, but the 5호 bundle can.
    await search([45, 35, 30]);
    await page.locator('#quantity-single').check();
    assert.equal(await productCards.count(), 0);
    assert.match(await page.locator('#results').innerText(), /맞는 1장 상품이 없어요/);
    await page.getByRole('button', { name: '묶음 상품 보기' }).click();
    assert.equal(await page.locator('#quantity-all').isChecked(), true);
    assert.equal(await productCards.count(), 1);
    assert.match(await productCards.innerText(), /5호 크기/);

    // Empty custom inventory has an actionable add flow and hides products/examples.
    await page.locator('#quantity-single').check();
    await page.locator('#scope-custom').check();
    assert.equal(await page.locator('#quantity-filter').isVisible(), false);
    assert.equal(await page.locator('.box-card').count(), 0);
    assert.match(await page.locator('#results').innerText(), /저장한 내 박스가 없어요/);
    await page.getByRole('button', { name: '내 박스 추가하기', exact: true }).click();
    await saveBox('회전용 내 박스', [30, 25, 20]);
    assert.match(await page.locator('#results').innerText(), /내 박스 중에는 맞는 박스가 없어요/);
    await search([18, 28, 23]);
    assert.equal(await customCards.count(), 1);
    assert.equal(await productCards.count(), 0);
    assert.deepEqual(await customCards.locator('.remaining-space dd').allTextContents(), ['2 cm', '2 cm', '2 cm']);

    // Filtering must happen before the three-card limit, even for tiny objects.
    await search([1, 1, 1], 0);
    assert.equal(await customCards.count(), 1);
    await page.locator('#scope-all').check();
    assert.equal(await page.locator('#quantity-single').isChecked(), true);
    assert.equal(await productCards.count(), 1);
    await page.locator('#scope-custom').check();
    assert.equal(await customCards.count(), 1);

    // Saved boxes from previous visits still work with the new filters.
    await page.reload();
    assert.match(await page.locator('#custom-box-list').innerText(), /회전용 내 박스/);
    await page.locator('#scope-custom').check();
    await search([30, 25, 20], 0);
    assert.deepEqual(await customCards.locator('.remaining-space dd').allTextContents(), ['0 cm', '0 cm', '0 cm']);
    await page.locator('#custom-box-list button').click();
    assert.equal(await page.locator('.box-card').count(), 0);
    assert.match(await page.locator('#results').innerText(), /저장한 내 박스가 없어요/);

    // Reset restores all filters and the empty result without losing storage behavior.
    await page.getByRole('button', { name: '초기화', exact: true }).click();
    assert.equal(await page.locator('#scope-all').isChecked(), true);
    assert.equal(await page.locator('#quantity-all').isChecked(), true);
    assert.equal(await page.locator('#quantity-filter').isVisible(), true);
    assert.equal(await page.locator('#width').inputValue(), '');
    assert.match(await page.locator('#results').innerText(), /딱 맞는 박스를 기다리고 있어요/);
    await submit.click();
    assert.equal(await page.locator('#input-error').isVisible(), true);
    await page.click('#example');
    for (const width of [375, 320]) {
      await page.setViewportSize({ width, height: 812 });
      await page.locator('#quantity-single').check();
      assert.equal(await productCards.count(), 1);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      const chips = await page.locator('.filter-options span').all();
      for (const chip of chips) assert.ok((await chip.boundingBox()).height >= 40);
    }
    await page.locator('#result-filters').scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(screenshots, 'mobile.png') });
    await search([99, 99, 99]);
    assert.equal(await page.locator('.box-card').count(), 0);
    assert.equal(await page.getByRole('button', { name: '묶음 상품 보기' }).count(), 0);
    assert.equal(await page.locator('#copy-needed-size').isVisible(), true);
    assert.deepEqual(errors, []);
    console.log('PASS: purchase filter, empty/recovery states, custom-only, saved boxes, rotation/gaps, reset, mobile widths and zero JS errors.');
    console.log('Screenshots: ' + screenshots);
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
