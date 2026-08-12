const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = process.env.U || 'http://localhost:3233/';

const snap = () => ({
  cs: document.querySelector('[data-character-state]')?.getAttribute('data-character-state'),
  cls: (document.documentElement.className.match(/brain-\S+|rb-\S+/g) || []).join('+'),
  ovf: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
  y: window.scrollY,
  orbs: document.querySelectorAll('[aria-label*="—"], [aria-label="Unlabelled thought"]').length,
  txt: document.body.innerText.slice(0, 0),
});

const run = async (b, name, vp, touch) => {
  const p = await b.newPage({ viewport: vp, hasTouch: touch, isMobile: touch });
  const errs = []; p.on('pageerror', e => errs.push(String(e).slice(0, 140)));
  await p.goto(URL, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(900);

  // real state first: a QR value typed into the build studio
  await p.evaluate(() => document.getElementById('build').scrollIntoView({ block: 'start', behavior: 'instant' }));
  await p.waitForTimeout(500);
  await p.getByRole('button', { name: /A Custom QR Code/ }).click();
  await p.waitForTimeout(700);
  await p.locator('#build button').nth(1).click();
  await p.waitForTimeout(700);
  const input = p.locator('#build input, #build textarea').first();
  if (await input.count()) await input.fill('BRAIN-STATE-77');
  await p.evaluate(() => document.getElementById('skills').scrollIntoView({ block: 'center', behavior: 'instant' }));
  await p.waitForTimeout(1400);

  const yBefore = await p.evaluate(() => window.scrollY);
  await p.getByRole('button', { name: /Enter my brain/ }).click();
  const yPress = await p.evaluate(() => window.scrollY);

  const states = new Set(); let maxOvf = 0, sawWorld = false, sawTerminal = false, sawFlood = 0;
  for (let i = 0; i < 55; i++) {
    const s = await p.evaluate(() => ({
      ...({
        cs: document.querySelector('[data-character-state]')?.getAttribute('data-character-state'),
        cls: (document.documentElement.className.match(/brain-\S+/g) || []).join('+'),
        ovf: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
      }),
      world: !!document.querySelector('svg text'),
      term: /cd ~\/apps/.test(document.body.innerText),
      flood: document.querySelectorAll('.z-\\[55\\] > span.font-mono').length,
      back: /Back to reality/.test(document.body.innerText),
    }));
    if (s.cs) states.add(s.cs);
    maxOvf = Math.max(maxOvf, s.ovf);
    sawWorld ||= s.world; sawTerminal ||= s.term; sawFlood = Math.max(sawFlood, s.flood);
    if (s.back) break;
    await p.waitForTimeout(250);
  }

  // explore: switch region, open a thought, close it, find the secret
  const inWorld = await p.getByRole('button', { name: 'Back to reality' }).count();
  let opened = false, secretShown = false, orbCount = 0;
  if (inWorld) {
    orbCount = await p.locator('[aria-label*="—"]').count();
    const first = p.locator('[aria-label*="—"]').first();
    await first.click({ force: true }); // orbs float continuously; Playwright needs force
    for (let i = 0; i < 5; i++) {
      const cs = await p.evaluate(() => document.querySelector('[data-character-state]')?.getAttribute('data-character-state'));
      if (cs) states.add(cs);
      await p.waitForTimeout(200);
    }
    opened = await p.getByRole('button', { name: /put it back/ }).count() > 0;
    await p.getByRole('button', { name: /put it back/ }).click();
    await p.waitForTimeout(700);

    await p.getByRole('button', { name: /cd ~\/code/ }).click();
    await p.waitForTimeout(900);
    const sec = p.locator('[aria-label="Unlabelled thought"]');
    console.log('  secret orbs found:', await sec.count(), '| visible:', await sec.count() ? await sec.first().isVisible() : false);
    if (await sec.count()) {
      await sec.click({ force: true });
      await p.waitForTimeout(900);
      secretShown = /Not yet/.test(await p.evaluate(() => document.body.innerText));
      await p.waitForTimeout(1800);
    }
    await p.getByRole('button', { name: 'Back to reality' }).click();
  }

  for (let i = 0; i < 34; i++) {
    const s = await p.evaluate(() => ({
      cs: document.querySelector('[data-character-state]')?.getAttribute('data-character-state'),
    }));
    if (s.cs) states.add(s.cs);
    await p.waitForTimeout(250);
  }
  await p.waitForTimeout(1200);

  const after = await p.evaluate(() => ({
    y: window.scrollY,
    cls: document.documentElement.className.match(/brain-\S+/g) || 'none',
    overlay: document.querySelectorAll('.z-\\[55\\]').length,
    qr: document.querySelector('#build input, #build textarea')?.value ?? null,
    ovf: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
  }));

  console.log(`\n── ${name}`);
  console.log('  states seen     :', [...states].join(' → '));
  console.log('  world / terminal:', sawWorld, '/', sawTerminal, '| flood pieces:', sawFlood, '| orbs:', orbCount);
  console.log('  detail opened   :', opened, '| secret "Not yet":', secretShown);
  console.log('  scroll press/aft:', yPress, '/', after.y, yPress === after.y ? 'RESTORED' : '*** LOST ***', `(before press ${yBefore})`);
  console.log('  QR value after  :', JSON.stringify(after.qr), after.qr === 'BRAIN-STATE-77' ? 'PRESERVED' : '*** LOST ***');
  console.log('  overlay left    :', after.overlay, '| leftover class:', after.cls, '| overflow now:', after.ovf, 'max during:', maxOvf);
  console.log('  page errors     :', errs.length, errs.slice(0, 3));
  await p.close();
};

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  await run(b, 'mobile 390x844', { width: 390, height: 844 }, true);
  await run(b, 'desktop 1440x900', { width: 1440, height: 900 }, false);
  await b.close();
})();
