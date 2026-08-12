const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = process.env.U || 'http://localhost:3268/';

const run = async (b, name, vp, touch) => {
  const ctx = await b.newContext({ viewport: vp, hasTouch: touch, isMobile: touch });
  // Skip the entrance: this test is about the film, not the front door.
  await ctx.addInitScript(() => sessionStorage.setItem('intro-seen', '1'));
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(String(e).slice(0, 150)));
  await p.goto(URL, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(1000);

  // real user state, so we can prove it survives both acts
  await p.evaluate(() => document.getElementById('build').scrollIntoView({ block: 'start', behavior: 'instant' }));
  await p.waitForTimeout(500);
  await p.getByRole('button', { name: /A Custom QR Code/ }).click(); await p.waitForTimeout(700);
  await p.locator('#build button').nth(1).click(); await p.waitForTimeout(700);
  const inp = p.locator('#build input, #build textarea').first();
  if (await inp.count()) await inp.fill('ACT2-STATE-5');
  await p.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await p.waitForTimeout(1200);

  await p.getByRole('button', { name: /Watch ad/ }).click();
  const yPress = await p.evaluate(() => window.scrollY);

  // Act 1 through to the interstitial
  let reachedInter = false;
  for (let i = 0; i < 110; i++) {
    if (/READY TO BREAK REALITY/.test(await p.evaluate(() => document.body.innerText))) { reachedInter = true; break; }
    await p.waitForTimeout(500);
  }

  // the Continue button should refuse at least once
  let pressesNeeded = 0, inCursor = false;
  if (!reachedInter) {
    console.log('  !! no interstitial. player state:', await p.evaluate(() => {
      const r = document.querySelector('[data-ad-scene]');
      return r ? r.getAttribute('data-ad-state') + ' scene=' + r.getAttribute('data-ad-scene') : 'NO PLAYER MOUNTED';
    }));
  }
  const cont = p.getByRole('button', { name: 'Continue' });
  for (let i = 0; i < 4 && !inCursor; i++) {
    await cont.click({ force: true }); pressesNeeded++;
    await p.waitForTimeout(700);
    inCursor = /TRY TO (CATCH|TAP) IT/.test(await p.evaluate(() => document.body.innerText));
  }

  // chase the cursor a little, then let him take it
  for (let i = 0; i < 8; i++) {
    await p.mouse.move(200 + i * 60, 400 + (i % 3) * 60);
    await p.waitForTimeout(180);
  }

  // Act 2
  const shots = new Set(); let sawAct2 = false, maxOvf = 0;
  const caps = new Set();
  for (let i = 0; i < 300; i++) {
    const s = await p.evaluate(() => {
      const root = document.querySelector('[data-act2-shot]');
      return {
        shot: root ? Number(root.getAttribute('data-act2-shot')) : -1,
        layers: document.querySelectorAll('[data-act2-shot] > div[style*="z-index"]').length,
        txt: (document.querySelector('[data-act2-shot]')?.innerText || '').replace(/\n/g, ' | '),
        ovf: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
        end: /Replay Act 2/.test(document.body.innerText),
      };
    });
    if (s.shot >= 0) { shots.add(s.shot); sawAct2 = true; }
    if (s.txt) s.txt.split(' | ').forEach(t => { if (t) caps.add(t); });
    maxOvf = Math.max(maxOvf, s.ovf);
    if (s.end) break;
    await p.waitForTimeout(450);
  }

  const ended = await p.getByRole('button', { name: 'Replay Act 2' }).count() > 0;
  const endButtons = await p.evaluate(() =>
    [...document.querySelectorAll('.z-\\[80\\] a, .z-\\[80\\] button')].map(b => b.innerText.trim()).filter(Boolean));
  if (ended) await p.getByRole('button', { name: /Back to portfolio/ }).click();
  await p.waitForTimeout(900);

  const after = await p.evaluate(() => ({
    y: window.scrollY,
    overlay: document.querySelectorAll('.z-\\[80\\]').length,
    cls: document.documentElement.className.match(/ad-\S+/g) || 'none',
    qr: document.querySelector('#build input, #build textarea')?.value ?? null,
  }));

  console.log(`\n── ${name}`);
  console.log('  reached interstitial :', reachedInter, '| Continue presses needed:', pressesNeeded, '| cursor beat:', inCursor);
  console.log('  act 2 ran            :', sawAct2, '| shots seen:', [...shots].sort((a, b) => a - b).join(','), 'of', 18);
  console.log('  act 2 captions       :', [...caps].filter(t => t.length < 34).join(' / '));
  console.log('  end card             :', ended, '|', JSON.stringify(endButtons));
  console.log('  scroll press/after   :', yPress, '/', after.y, yPress === after.y ? 'RESTORED' : '*** LOST ***');
  console.log('  QR after both acts   :', JSON.stringify(after.qr), after.qr === 'ACT2-STATE-5' ? 'PRESERVED' : '*** LOST ***');
  console.log('  overlay left         :', after.overlay, '| class:', after.cls, '| max overflow:', maxOvf);
  console.log('  page errors          :', errs.length, errs.slice(0, 3));
  await p.close();
};

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  await run(b, 'mobile 390x844', { width: 390, height: 844 }, true);
  await b.close();
})();
