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
      // Inspect rendered screenshot pixels, not the CSS property or the color label.
      const colors = [
        [0,0,0,255], [255,255,255,255], [255,0,0,255],
        [0,255,0,255], [0,0,255,255], [128,128,128,255]
      ];
      await page.emulateMedia({forcedColors: lang === 'zh-CN' ? 'active' : 'none'});
      assert.equal(await page.evaluate(() => matchMedia('(forced-colors: active)').matches), lang === 'zh-CN');
      for (const [index, expected] of colors.entries()) {
        if (index) {
          // The app deliberately ignores color changes less than 500 ms apart.
          if (index > 1) await new Promise(resolve => setTimeout(resolve, 525));
          await page.locator('#next').click();
        }
        await page.locator('#current').filter({hasText: new RegExp(String(index + 1) + '\\s*/\\s*6')}).waitFor();
        const png = await page.screenshot({type:'png'});
        const rgba = await page.evaluate(async array => {
          const bmp = await createImageBitmap(new Blob([new Uint8Array(array)], {type:'image/png'}));
          try {
            const canvas = document.createElement('canvas');
            canvas.width = canvas.height = 1;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(bmp, Math.floor(bmp.width / 2), Math.floor(bmp.height / 2), 1, 1, 0, 0, 1, 1);
            return Array.from(ctx.getImageData(0, 0, 1, 1).data);
          } finally {
            bmp.close();
          }
        }, Array.from(png));
        assert.deepEqual(rgba, expected, lang + ' screenshot color ' + (index + 1));
      }
      console.log(lang + ': six rendered PNG center pixels matched (forced colors: ' + (lang === 'zh-CN' ? 'active' : 'none') + ')');
      await page.emulateMedia({forcedColors:'none'});
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
