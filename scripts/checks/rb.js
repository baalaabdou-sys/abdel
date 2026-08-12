const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const URL = 'http://localhost:3233/';

const run = async (b, name, vp, touch) => {
  const p = await b.newPage({ viewport: vp, hasTouch: touch, isMobile: touch });
  const errs = []; p.on('pageerror', e => errs.push(String(e).slice(0, 120)));
  await p.goto(URL, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(700);

  // Put real user state on the page first: a scroll offset and typed input.
  await p.evaluate(() => document.getElementById('build').scrollIntoView({ block: 'start', behavior: 'instant' }));
  await p.waitForTimeout(500);
  await p.getByRole('button', { name: /A Custom QR Code/ }).click();
  await p.waitForTimeout(700);
  // The form only exists once a purpose is chosen.
  await p.locator('#build button').nth(1).click();
  await p.waitForTimeout(700);
  const input = p.locator('#build input, #build textarea').first();
  const hasInput = await input.count();
  if (hasInput) await input.fill('MEMORY-CHECK-42');
  await p.evaluate(() => document.getElementById('about').scrollIntoView({ block: 'center', behavior: 'instant' }));
  await p.waitForTimeout(600);

  await p.waitForTimeout(1200); // let any layout from those clicks settle
  const baselineOverflow = await p.evaluate(() =>
    Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth));
  const scrollBefore = await p.evaluate(() => window.scrollY);
  const stylesBefore = await p.evaluate(() =>
    [...document.querySelectorAll('[data-rb-scatter]')].map(e => e.getAttribute('style')));

  await p.getByRole('button', { name: /Break the portfolio/ }).click();
  const scrollAtStart = await p.evaluate(() => window.scrollY);

  const states = new Set(); const classes = new Set();
  let maxOverflow = 0, disabledSeen = false, chipsSeen = 0, slabSeen = false, movedMax = 0;
  for (let i = 0; i < 78; i++) {
    const s = await p.evaluate(() => ({
      cs: document.querySelector('[data-character-state]')?.getAttribute('data-character-state'),
      cls: document.documentElement.className,
      dis: !!document.querySelector('button[aria-label="Rebuild sequence playing"]'),
      chips: document.querySelectorAll('.z-\\[60\\] .font-mono').length,
      slab: /default export/.test(document.body.innerText),
      ovf: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
      moved: Math.max(0, ...[...document.querySelectorAll('[data-rb-scatter]')].map(e => {
        const m = new DOMMatrixReadOnly(getComputedStyle(e).transform);
        return Math.hypot(m.m41, m.m42);
      })),
    }));
    if (s.cs) states.add(s.cs);
    s.cls.split(/\s+/).filter(Boolean).forEach(c => classes.add(c));
    disabledSeen ||= s.dis; chipsSeen = Math.max(chipsSeen, s.chips); slabSeen ||= s.slab;
    maxOverflow = Math.max(maxOverflow, s.ovf); movedMax = Math.max(movedMax, s.moved);
    await p.waitForTimeout(200);
  }
  await p.waitForTimeout(1500);

  const after = await p.evaluate(() => ({
    scroll: window.scrollY,
    styles: [...document.querySelectorAll('[data-rb-scatter]')].map(e => e.getAttribute('style')),
    cls: document.documentElement.className,
    moved: Math.max(0, ...[...document.querySelectorAll('[data-rb-scatter]')].map(e => {
      const m = new DOMMatrixReadOnly(getComputedStyle(e).transform);
      return Math.hypot(m.m41, m.m42);
    })),
    qr: document.querySelector('#build input, #build textarea')?.value ?? null,
  }));
  const label = await p.locator('#about button').first().innerText();

  console.log(`\n── ${name}`);
  console.log('  states seen      :', [...states].join(' → '));
  console.log('  rb-* classes     :', [...classes].filter(c => c.startsWith('rb-')).join(', ') || 'NONE');
  console.log('  max piece travel :', Math.round(movedMax), 'px');
  console.log('  chips / slab     :', chipsSeen, '/', slabSeen);
  console.log('  disabled while on:', disabledSeen, '| label after:', JSON.stringify(label));
  console.log('  scroll before/aft:', scrollBefore, '/', after.scroll,
    scrollBefore === after.scroll ? 'PRESERVED' : '*** LOST ***',
    '| at press:', scrollAtStart, scrollAtStart === after.scroll ? '(restored to press position)' : '(drifted during sequence)');
  console.log('  form value after :', JSON.stringify(after.qr),
    after.qr === 'MEMORY-CHECK-42' ? 'PRESERVED' : '*** LOST/absent ***');
  console.log('  styles restored  :',
    JSON.stringify(stylesBefore) === JSON.stringify(after.styles) ? 'EXACT' : '*** DIFFERS ***',
    '| residual transform:', Math.round(after.moved), 'px');
  console.log('  leftover rb-*    :', after.cls.match(/rb-\S+/g) || 'none');
  console.log('  h-overflow base  :', baselineOverflow, 'px');
  console.log('  max h-overflow   :', maxOverflow, 'px | page errors:', errs.length, errs.slice(0, 2));
  await p.close();
};

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  await run(b, 'mobile 390x844', { width: 390, height: 844 }, true);
  await run(b, 'desktop 1440x900', { width: 1440, height: 900 }, false);
  await b.close();
})();
