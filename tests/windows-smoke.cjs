'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {pathToFileURL} = require('node:url');
const {chromium} = require(process.env.CLINIC_PLAYWRIGHT || 'playwright');
const root = path.resolve(__dirname, '..');
const sample = kind => path.join(root, 'docs', 'examples', kind + '.json');

(async () => {
  assert.equal(process.platform, 'win32');
  const browser = await chromium.launch({channel: 'msedge', headless: true});
  console.log('OS: ' + os.version() + ' | Edge: ' + browser.version());
  try {
    const context = await browser.newContext({offline: true});
    for (const [lang, prefix] of [['en', ''], ['zh-CN', 'zh/']]) {
      const page = await context.newPage();
      const unexpected = [];
      page.on('pageerror', error => unexpected.push(error.message));
      page.on('request', req => {
        if (!req.url().startsWith('file:')) unexpected.push('External request: ' + req.url());
      });
      const open = async file => {
        await page.goto(pathToFileURL(path.join(root, prefix + file)).href, {waitUntil: 'load'});
        assert.equal(await page.locator('html').getAttribute('lang'), lang);
      };
      const visible = id => page.locator(id).waitFor({state: 'visible'});
      const hidden = id => page.locator(id).waitFor({state: 'hidden'});
      await open('index.html');
      await page.locator('#quick-one').click();
      await page.locator('#quick-paste').click();
      await page.locator('#snapshot-file').setInputFiles(sample('network-v1'));
      await page.locator('#message').filter({hasText: /selected file was loaded|已导入所选文件/}).waitFor();
      assert.match(await page.locator('#result-title').innerText(), /one app or website|局限于一个应用或网站/);
      await page.locator('#snapshot-file').setInputFiles({
        name: 'invalid-summary.json', mimeType: 'application/json', buffer: Buffer.from('{')
      });
      await page.locator('#message.error').waitFor();
      assert.doesNotMatch(await page.locator('#findings').innerText(), /reports 1 enabled|报告有 1 个/);
      await open('keyboard/index.html');
      await page.locator('#start').click();
      assert.equal(await page.locator('#stop').isEnabled(), true);
      await page.keyboard.press('a');
      await visible('[data-code="KeyA"].done');
      assert.equal((await page.locator('#seen').innerText()).trim(), '1');
      await page.locator('#stop').click();
      await page.keyboard.press('b');
      assert.equal(await page.locator('[data-code="KeyB"].done').count(), 0);
      assert.equal((await page.locator('#seen').innerText()).trim(), '1');
      console.log(lang + ': A recorded while active; B ignored after pause');
      await open('display/index.html');
      await page.locator('#start').click();
      await visible('#testStage');
      console.log(lang + ': observed browser fullscreen: ' +
        await page.evaluate(() => document.fullscreenElement?.id === 'testStage'));
      await page.locator('#next').click();
      assert.match(await page.locator('#current').innerText(), /2\s*\/\s*6/);
      await page.locator('#exit').click();
      await hidden('#testStage');
      await open('freeze/index.html');
      await page.locator('#summary-file').setInputFiles(sample('restarts-v2'));
      await visible('#results');
      assert.match(await page.locator('#reboot').innerText(), /1/);
      assert.match(await page.locator('#bugcheck').innerText(), /Unknown|未知/);
      await page.locator('#clear').click();
      await hidden('#results');
      assert.deepEqual(unexpected, []);
      console.log(lang + ': network import, keyboard start/pause, display color change, restart import/clear passed');
      await page.close();
    }
  } finally {
    await browser.close();
  }
})().catch(err => { console.error(err); process.exitCode = 1; });
