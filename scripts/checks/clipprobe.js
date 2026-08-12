const { chromium } = require('/opt/node22/lib/node_modules/playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
    args: ['--autoplay-policy=no-user-gesture-required'] });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addInitScript(() => sessionStorage.setItem('intro-seen', '1'));
  const p = await ctx.newPage();
  await p.goto('http://localhost:3272/', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(1500);
  await p.getByRole('button', { name: /Watch ad/ }).click();
  for (let i = 0; i < 130; i++) {
    if (/READY TO BREAK/.test(await p.evaluate(() => document.body.innerText))) break;
    await p.waitForTimeout(500);
  }
  for (let i = 0; i < 4; i++) {
    await p.getByRole('button', { name: 'Continue' }).click({ force: true });
    await p.waitForTimeout(600);
    if (/TRY TO (CATCH|TAP)/.test(await p.evaluate(() => document.body.innerText))) break;
  }
  await p.waitForTimeout(4000);

  // Every sample is keyed to the clip's own file, so a number can never be
  // attributed to the wrong shot the way the last probe did.
  const per = {};
  for (let i = 0; i < 280; i++) {
    const rows = await p.evaluate(() => {
      const root = document.querySelector('[data-act2-shot]');
      if (!root) return [];
      const shot = +root.getAttribute('data-act2-shot');
      return [...root.querySelectorAll('video')].map(v => ({
        name: (v.currentSrc || '').split('/').pop(),
        t: +v.currentTime.toFixed(2), paused: v.paused, shot,
      }));
    });
    rows.forEach(r => { if (r.name) (per[r.name] ||= []).push(r); });
    if (/Replay Act 2/.test(await p.evaluate(() => document.body.innerText))) break;
    await p.waitForTimeout(230);
  }

  console.log('\nclip                    min t    max t   samples   verdict');
  for (const [name, rows] of Object.entries(per)) {
    const play = rows.filter(r => !r.paused);
    if (!play.length) { console.log('  ' + name.padEnd(22) + '  never played'); continue; }
    const ts = play.map(r => r.t);
    const mn = Math.min(...ts), mx = Math.max(...ts);
    const ok = mn <= 0.4 && mx >= 4.7;
    console.log('  ' + name.padEnd(22) + String(mn).padStart(5) + 's ' + String(mx).padStart(7) + 's '
      + String(play.length).padStart(8) + '   ' + (ok ? 'plays in full' : '*** ' + (mn > 0.4 ? `starts ${mn}s in` : `stops at ${mx}s`) + ' ***'));
  }
  await b.close();
})();
