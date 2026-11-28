'use strict';
const assert = require('node:assert/strict');
const os = require('node:os');
const path = require('node:path');
const {pathToFileURL} = require('node:url');
const {chromium} = require(process.env.CLINIC_PLAYWRIGHT || 'playwright');
const root = path.resolve(__dirname, '..');
const sample = kind => path.join(root, 'docs', 'examples', kind + '.json');

(async () => {
  const expectedPlatform = process.argv[2] || 'win32';
  assert.ok(['win32', 'linux'].includes(expectedPlatform), 'Unsupported runner platform');
  assert.equal(process.platform, expectedPlatform);
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
      const networkSummary = ipv6 => JSON.stringify({
        version: 1, adapters: 'ok', up: 1, ipv4: 1, route4: 0, pair4: 0,
        ipv6, route6: ipv6, pair6: ipv6
      });
      const headline = page.locator('#result-title');
      const next = page.locator('#next');
      const recheckSummary = /summary shows no candidate network configuration|摘要未显示可用的候选联网配置/;
      for (const [scope, symptom, normal] of [
        ['one', /one failing app or site|仅一个应用或网站失败/, /limited to one app or website|局限于一个应用或网站/],
        ['portal', /sign-in prompt|你看到了登录提示/, /public network may require sign-in|公共网络需要登录/]
      ]) {
        for (const mode of ['paste', 'file']) for (const ipv6 of [0, null, 1]) {
          await page.locator('#quick-' + scope).click();
          const value = networkSummary(ipv6);
          if (mode === 'paste') {
            await page.locator('#quick-paste').click();
            await page.locator('#snapshot').fill(value);
            await page.locator('#load').click();
          } else {
            await page.locator('#snapshot-file').setInputFiles({
              name: 'synthetic-network.json', mimeType: 'application/json', buffer: Buffer.from(value)
            });
            await page.locator('#message').filter({hasText: /selected file was loaded|已导入所选文件/}).waitFor();
          }
          if (ipv6 === 0) {
            assert.match(await headline.innerText(), symptom);
            assert.match(await headline.innerText(), recheckSummary);
            assert.match(await next.innerText(), /fresh summary from this PC|重新获取这台电脑/);
          } else {
            assert.match(await headline.innerText(), normal);
            assert.doesNotMatch(await headline.innerText(), recheckSummary);
          }
          const ipv6Finding = (await page.locator('#findings li').allTextContents())
            .find(line => /^IPv6[:：]/.test(line));
          assert.ok(ipv6Finding);
          if (ipv6 === null) assert.equal((ipv6Finding.match(/unavailable|未取得/g) || []).length, 3);
          else assert.deepEqual(ipv6Finding.slice(5).match(/\d+/g), Array(3).fill(String(ipv6)));
        }
      }
      await page.locator('#quick-all').click();
      await page.locator('#quick-paste').click();
      await page.locator('#snapshot').fill(networkSummary(0));
      await page.locator('#load').click();
      assert.match(await headline.innerText(), /No default route was found|没有观测到默认路由/);
      console.log(lang + ': conflicting symptoms, incomplete and positive IPv6, and full outage passed for network summary');
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
      await page.locator('#start').click();
      const watch = await page.evaluateHandle(() => {
        const observed = [];
        document.addEventListener('keydown', event => {
          if (event.code === 'ArrowDown' || event.code === 'Space') {
            observed.push([event.code, event.repeat, event.defaultPrevented]);
          }
        });
        return observed;
      });
      for (const [key, code] of [['ArrowDown', 'ArrowDown'], ['Space', 'Space']]) {
        await page.keyboard.down(key);
        await visible('[data-code="' + code + '"].down');
        await page.keyboard.down(key);
        await page.keyboard.up(key);
        assert.equal(await page.locator('[data-code="' + code + '"].down').count(), 0);
        assert.equal(await page.locator('[data-code="' + code + '"].done').count(), 1);
      }
      assert.deepEqual(await watch.jsonValue(), [
        ['ArrowDown', false, true], ['ArrowDown', true, true],
        ['Space', false, true], ['Space', true, true]
      ]);
      await watch.dispose();
      assert.equal((await page.locator('#seen').innerText()).trim(), '3');
      const behavior = await page.locator('#capture').evaluate(capture => {
        const check = (code, extra) => {
          const event = new KeyboardEvent('keydown', {code, bubbles:true, cancelable:true, ...extra});
          capture.dispatchEvent(event);
          return event.defaultPrevented;
        };
        return [check('ArrowDown', {ctrlKey:true, repeat:true}),
          check('Space', {isComposing:true, repeat:true}), check('F5', {repeat:true})];
      });
      assert.deepEqual(behavior, [false, false, false]);
      await page.keyboard.down('c');
      await visible('[data-code="KeyC"].down');
      await page.locator('#stop').click();
      assert.equal(await page.locator('.key.down').count(), 0);
      await page.keyboard.up('c');
      await page.locator('#reset').click();
      assert.equal((await page.locator('#seen').innerText()).trim(), '0');
      console.log(lang + ': keyboard repeats do not scroll or add marks; shortcuts, composition, pause and reset checked');
      // Verify leaving capture with only the keyboard, not a pointer or element.focus().
      await open('keyboard/index.html');
      const activeId = () => page.evaluate(() => document.activeElement.id);
      for (let i = 0; i < 8 && await activeId() !== 'start'; i++) {
        await page.keyboard.press('Tab');
      }
      assert.equal(await activeId(), 'start');
      await page.keyboard.press('Enter');
      assert.equal(await activeId(), 'capture');
      await page.keyboard.press('Shift+Tab');
      assert.notEqual(await activeId(), 'capture');
      assert.equal(await page.locator('#stop').isEnabled(), false);
      assert.match(await page.locator('#status').innerText(), /Paused|已暂停/);

      for (let i = 0; i < 8 && await activeId() !== 'start'; i++) {
        await page.keyboard.press('Tab');
      }
      assert.equal(await activeId(), 'start');
      await page.keyboard.press('Enter');
      assert.equal(await activeId(), 'capture');
      await page.keyboard.down('a');
      await visible('[data-code="KeyA"].down');
      await page.keyboard.press('Escape');
      assert.equal(await activeId(), 'start');
      assert.equal(await page.locator('#start').isEnabled(), true);
      assert.equal(await page.locator('#stop').isEnabled(), false);
      assert.equal(await page.locator('.key.down').count(), 0);
      await page.keyboard.up('a');
      await page.keyboard.press('b');
      assert.equal(await page.locator('[data-code="KeyB"].done').count(), 0);
      console.log(lang + ': keyboard-only start, Shift+Tab leaves and pauses, Escape clears held keys and restores focus');
      await open('display/index.html');
      await page.locator('#start').click();
      await visible('#testStage');
      // Native control: a real click, with no Fullscreen API test double.
      await page.waitForFunction(() => document.fullscreenElement?.id === 'testStage', null, {timeout: 5000});
      console.log(lang + ': native request entered fullscreen');
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
      assert.equal(await page.locator('#notice').textContent(), '');
      assert.equal(await activeId(), 'start');
      // New document: hold only the API promise so the timing case is deterministic.
      const pending = await context.newPage();
      try {
        pending.on('pageerror', error => unexpected.push(error.message));
        pending.on('request', req => {
          if (!req.url().startsWith('file:')) unexpected.push('External request: ' + req.url());
        });
        await pending.addInitScript(() => {
          let reject;
          let calls = 0;
          Object.defineProperty(Element.prototype, 'requestFullscreen', {
            configurable: true, value() {
              ++calls;
              return new Promise((_, fail) => { reject = fail; });
            }
          });
          window.clinicFullscreenTest = {
            count: () => calls,
            reject: () => reject(new DOMException('Simulated fullscreen rejection', 'NotAllowedError'))
          };
        });
        await pending.goto(pathToFileURL(path.join(root, prefix + 'display/index.html')).href, {waitUntil:'load'});
        assert.equal(await pending.locator('html').getAttribute('lang'), lang);
        const stage = pending.locator('#testStage');
        const start = pending.locator('#start');
        const notice = pending.locator('#notice');
        const early = lang === 'en' ? /before fullscreen was confirmed/ : /在确认全屏前退出/;
        for (const [i, mode] of ['Escape', 'button'].entries()) {
          await start.click();
          await stage.waitFor({state:'visible'});
          assert.equal(await pending.evaluate(() => window.clinicFullscreenTest.count()), i + 1);
          if (mode === 'Escape') await pending.keyboard.press('Escape');
          else await pending.locator('#exit').click();
          await stage.waitFor({state:'hidden'});
          await pending.locator('#review').waitFor({state:'visible'});
          assert.equal(await pending.evaluate(() => document.activeElement.id), 'start');
          assert.match(await notice.textContent(), early);
          await pending.evaluate(() => window.clinicFullscreenTest.reject());
          assert.match(await notice.textContent(), early);
        }
        await start.click();
        await stage.waitFor({state:'visible'});
        assert.equal(await pending.evaluate(() => window.clinicFullscreenTest.count()), 3);
        assert.equal(await notice.textContent(), '');
        await pending.evaluate(() => window.clinicFullscreenTest.reject());
        await pending.locator('#exit').click();
        await stage.waitFor({state:'hidden'});
        assert.match(await notice.textContent(), lang === 'en' ? /Fullscreen was unavailable/ : /浏览器未允许全屏/);
        console.log(lang + ': simulated pending fullscreen, Escape and Exit, stable warning, focus and restart passed');
      } finally {
        await pending.close();
      }
      await open('freeze/index.html');
      await page.locator('#summary-file').setInputFiles(sample('restarts-v2'));
      await visible('#results');
      assert.match(await page.locator('#reboot').innerText(), /1/);
      assert.match(await page.locator('#bugcheck').innerText(), /Unknown|未知/);
      const envelope = {schema_version: 2, source: 'synthetic_fixture', window_days: 7,
        channels: {System: 'complete', Application: 'complete'}};
      const wer = {reported_at: '2026-01-02T12:00:00Z', channel: 'System',
        provider: 'Microsoft-Windows-WER-SystemErrorReporting', event_id: 1001};
      const kp = {...wer, provider: 'Microsoft-Windows-Kernel-Power', event_id: 41, bugcheck_code: 0};
      const laterWer = {...wer, reported_at: '2026-01-03T12:00:00Z'};
      const recordCount = count => lang === 'en' ? (count === 1 ? '1 record' : `${count} records`) : `${count} 条记录`;
      for (const [events, count, blueScreens] of [[[wer], 1, 1], [[wer, kp], 2, 1], [[wer, laterWer], 2, 2]]) {
        await page.locator('#summary-file').setInputFiles({name: 'synthetic-restarts.json',
          mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({...envelope, events}))});
        await visible('#results');
        assert.equal(await page.locator('#reboot').innerText(), lang === 'en' ?
          `Markers found (${recordCount(count)})` : `有标记（${recordCount(count)}）`);
        assert.equal(await page.locator('#bugcheck').innerText(), lang === 'en' ?
          `Evidence found (${recordCount(blueScreens)})` : `有证据（${recordCount(blueScreens)}）`);
        assert.equal(await page.locator('#timeline > li').count(), count);
      }
      console.log(lang + ': WER-only report confirms restart and blue-screen evidence; combined result counts records');
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
