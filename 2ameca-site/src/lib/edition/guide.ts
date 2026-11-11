/**
 * « Guide d'édition » : vidéo tournée sur le vrai Mode édition (phases 1 à 5), avec chapitres.
 * Chargé seulement quand un administrateur ouvre le guide depuis le Mode édition.
 */
const base = import.meta.env.BASE_URL.replace(/\/$/, '');
const DOSSIER = `${base}/edition/guide`;

const CHAPITRES = [
  { debut: 6.7, titre: 'Textes, boutons et publication', resume: 'Activer le Mode édition, écrire un texte, modifier un bouton, Annuler / Rétablir, Sauver, Aperçu, Publier et Versions.' },
  { debut: 93, titre: 'Organiser les sections', resume: 'La poignée ⠿, monter et descendre, glisser, fond et alignement, appui long, dupliquer, supprimer et récupérer.' },
  { debut: 155.5, titre: 'Ajouter une section', resume: '« + Section », les huit modèles, remplacer les textes et la photo, l’alerte avant publication.' },
  { debut: 210.3, titre: 'Réorganiser les listes', resume: '« Réorganiser », l’ordre de l’équipe, glisser une carte, dupliquer, masquer et ajouter un élément.' },
  { debut: 266.3, titre: 'Textes du club, FAQ et contact', resume: 'Histoire, mission et valeurs sur la page, questions fréquentes, coordonnées, et la publication finale.' },
];

const ICO = {
  lecture: '<path d="M8 5.5v13l11-6.5z" fill="currentColor" stroke="none"/>',
  pause: '<rect x="6.5" y="5" width="4" height="14" rx="1" fill="currentColor" stroke="none"/><rect x="13.5" y="5" width="4" height="14" rx="1" fill="currentColor" stroke="none"/>',
  revoir: '<path d="M4 12a8 8 0 1 0 2.4-5.7L4 8.5"/><path d="M4 3.5v5h5"/>',
  prec: '<path d="M6 5v14"/><path d="M19 5.5v13L9 12z" fill="currentColor" stroke="none"/>',
  suiv: '<path d="M18 5v14"/><path d="M5 5.5v13L15 12z" fill="currentColor" stroke="none"/>',
  cc: '<rect x="3" y="5.5" width="18" height="13" rx="2.5"/><path d="M10.5 10.2a2.4 2.4 0 1 0 0 3.6M17 10.2a2.4 2.4 0 1 0 0 3.6"/>',
  fermer: '<path d="M6 6l12 12M18 6L6 18"/>',
};
const svg = (n: keyof typeof ICO) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICO[n]}</svg>`;
const temps = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

export function ouvrirGuide() {
  if (document.getElementById('ed-guide')) return;
  styles();
  const racine = document.createElement('div');
  racine.id = 'ed-guide';
  racine.setAttribute('role', 'dialog'); racine.setAttribute('aria-modal', 'true'); racine.setAttribute('aria-label', 'Guide d’édition');
  racine.innerHTML = `
    <div class="gd-boite">
      <header class="gd-tete">
        <div><span class="gd-sur">Guide d’édition · vidéo</span><h2>Modifier le site depuis votre téléphone</h2></div>
        <button type="button" class="gd-x" aria-label="Fermer le guide">${svg('fermer')}</button>
      </header>
      <div class="gd-corps">
        <div class="gd-lecteur">
          <video playsinline preload="metadata" poster="${DOSSIER}/poster.jpg" aria-describedby="gd-chap-titre">
            <source src="${DOSSIER}/guide.mp4" type="video/mp4" />
            <source src="${DOSSIER}/guide.webm" type="video/webm" />
            <track kind="subtitles" srclang="fr" label="Français" src="${DOSSIER}/guide.vtt" />
          </video>
          <button type="button" class="gd-grand" aria-label="Lire la vidéo">${svg('lecture')}</button>
          <div class="gd-barre">
            <div class="gd-temps-ligne"><div class="gd-piste" role="slider" tabindex="0" aria-label="Position dans la vidéo" aria-valuemin="0"><div class="gd-lu"></div>
              ${CHAPITRES.slice(1).map(() => '<span class="gd-repere"></span>').join('')}</div></div>
            <div class="gd-boutons">
              <button type="button" class="gd-b gd-prec" aria-label="Chapitre précédent">${svg('prec')}</button>
              <button type="button" class="gd-b gd-lire" aria-label="Lecture">${svg('lecture')}</button>
              <button type="button" class="gd-b gd-suiv" aria-label="Chapitre suivant">${svg('suiv')}</button>
              <button type="button" class="gd-b gd-revoir" aria-label="Revoir depuis le début">${svg('revoir')}</button>
              <span class="gd-horloge">0:00</span>
              <button type="button" class="gd-b gd-cc" aria-pressed="false" aria-label="Sous-titres en français">${svg('cc')}</button>
            </div>
          </div>
        </div>
        <aside class="gd-chapitres">
          <p class="gd-chap-en-cours" id="gd-chap-titre"></p>
          <ol>${CHAPITRES.map((c, i) => `<li><button type="button" data-i="${i}"><span class="gd-num">${i + 1}</span><span><strong>${c.titre}</strong><small>Phase ${i + 1} · ${temps(c.debut)}</small><em>${c.resume}</em></span></button></li>`).join('')}</ol>
          <p class="gd-note">Vidéo tournée sur le vrai Mode édition du site. Les légendes à l’écran sont en français ; « CC » affiche aussi des sous-titres.</p>
        </aside>
      </div>
    </div>`;
  document.body.append(racine);
  const $ = <T extends Element>(s: string) => racine.querySelector<T>(s)!;
  const v = $<HTMLVideoElement>('video'), piste = $<HTMLElement>('.gd-piste'), lu = $<HTMLElement>('.gd-lu');
  const lire = $<HTMLButtonElement>('.gd-lire'), grand = $<HTMLButtonElement>('.gd-grand'), cc = $<HTMLButtonElement>('.gd-cc');
  const boutons = [...racine.querySelectorAll<HTMLButtonElement>('.gd-chapitres button')];
  const duree = () => (Number.isFinite(v.duration) && v.duration > 0 ? v.duration : 335);
  const chapitreA = (t: number) => CHAPITRES.reduce((k, c, i) => (t + 0.2 >= c.debut ? i : k), 0);
  const placerReperes = () => racine.querySelectorAll<HTMLElement>('.gd-repere').forEach((r, i) => (r.style.left = `${(CHAPITRES[i + 1].debut / duree()) * 100}%`));
  const maj = () => {
    const t = v.currentTime, k = chapitreA(t);
    lu.style.width = `${(t / duree()) * 100}%`;
    piste.setAttribute('aria-valuemax', String(Math.round(duree()))); piste.setAttribute('aria-valuenow', String(Math.round(t)));
    piste.setAttribute('aria-valuetext', `${temps(t)} sur ${temps(duree())}`);
    $('.gd-horloge').textContent = `${temps(t)} / ${temps(duree())}`;
    boutons.forEach((b, i) => b.toggleAttribute('aria-current', i === k && t > 1));
    $('#gd-chap-titre').textContent = t > 1 ? `Chapitre ${k + 1} — ${CHAPITRES[k].titre}` : 'Cinq chapitres, un par phase du Mode édition.';
  };
  const etat = () => {
    const enLecture = !v.paused && !v.ended;
    lire.innerHTML = svg(enLecture ? 'pause' : 'lecture'); lire.setAttribute('aria-label', enLecture ? 'Pause' : 'Lecture');
    grand.hidden = enLecture; racine.classList.toggle('gd-joue', enLecture);
  };
  const aller = (t: number) => { v.currentTime = Math.max(0, Math.min(duree() - 0.1, t)); maj(); };
  const basculer = () => (v.paused || v.ended ? v.play().catch(() => {}) : v.pause());
  lire.onclick = basculer; grand.onclick = basculer; v.onclick = basculer;
  $<HTMLButtonElement>('.gd-revoir').onclick = () => { aller(0); v.play().catch(() => {}); };
  $<HTMLButtonElement>('.gd-prec').onclick = () => { const k = chapitreA(v.currentTime); aller(v.currentTime - CHAPITRES[k].debut > 3 ? CHAPITRES[k].debut : CHAPITRES[Math.max(0, k - 1)].debut); };
  $<HTMLButtonElement>('.gd-suiv').onclick = () => { const k = chapitreA(v.currentTime); if (k < CHAPITRES.length - 1) aller(CHAPITRES[k + 1].debut); };
  boutons.forEach((b) => (b.onclick = () => { aller(CHAPITRES[Number(b.dataset.i)].debut); v.play().catch(() => {}); }));
  cc.onclick = () => {
    const piste0 = v.textTracks[0]; if (!piste0) return;
    const on = piste0.mode !== 'showing'; piste0.mode = on ? 'showing' : 'hidden'; cc.setAttribute('aria-pressed', String(on));
    if (on) [...(piste0.cues ?? [])].forEach((c) => { (c as VTTCue).line = -4; });   // au-dessus des commandes
  };
  const viser = (x: number) => { const r = piste.getBoundingClientRect(); aller(((x - r.left) / r.width) * duree()); };
  piste.addEventListener('pointerdown', (e) => {
    piste.setPointerCapture(e.pointerId); viser(e.clientX);
    const bouge = (ev: PointerEvent) => viser(ev.clientX);
    piste.addEventListener('pointermove', bouge);
    piste.addEventListener('pointerup', () => piste.removeEventListener('pointermove', bouge), { once: true });
  });
  piste.addEventListener('keydown', (e) => { if (e.key === 'ArrowRight') aller(v.currentTime + 5); if (e.key === 'ArrowLeft') aller(v.currentTime - 5); });
  v.addEventListener('timeupdate', maj); v.addEventListener('loadedmetadata', () => { placerReperes(); maj(); });
  v.addEventListener('play', etat); v.addEventListener('pause', etat); v.addEventListener('ended', etat);
  v.textTracks[0] && (v.textTracks[0].mode = 'hidden');
  const fermer = () => { v.pause(); racine.remove(); removeEventListener('keydown', clavier); };
  const clavier = (e: KeyboardEvent) => {
    if (e.key === 'Escape') fermer();
    if (e.key === ' ' && !(e.target as Element).closest('button, [role=slider]')) { e.preventDefault(); basculer(); }
  };
  addEventListener('keydown', clavier);
  $<HTMLButtonElement>('.gd-x').onclick = fermer;
  racine.addEventListener('click', (e) => { if (e.target === racine) fermer(); });
  placerReperes(); maj(); etat();
  $<HTMLButtonElement>('.gd-x').focus();
}

function styles() {
  if (document.getElementById('gd-styles')) return;
  const css = `
  #ed-guide { position: fixed; inset: 0; z-index: 200; display: grid; place-items: center; padding: max(.5rem, env(safe-area-inset-top)) .5rem max(.5rem, env(safe-area-inset-bottom)); background: rgb(2 18 32 / .82); backdrop-filter: blur(6px); font-family: var(--f-texte); animation: gd-fondu .3s ease; }
  @keyframes gd-fondu { from { opacity: 0; } }
  .gd-boite { width: min(1100px, 100%); max-height: 100%; overflow-y: auto; border-radius: 22px; background: linear-gradient(160deg, #04223A, #072f50 70%, #0A4A7A); color: #fff; box-shadow: 0 30px 80px -20px rgb(0 0 0 / .7); border: 1px solid rgb(159 208 245 / .2); }
  .gd-tete { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; padding: 1rem 1rem .6rem 1.2rem; }
  .gd-sur { font: 600 .72rem var(--f-label); letter-spacing: .2em; text-transform: uppercase; color: #9FD0F5; }
  .gd-tete h2 { margin: .25rem 0 0; font-family: var(--f-titre); font-weight: 400; font-size: clamp(1.4rem, 5vw, 2rem); line-height: 1; text-transform: uppercase; color: #fff; }
  .gd-x { flex: none; display: grid; place-items: center; width: 44px; height: 44px; border: 0; border-radius: 50%; background: rgb(255 255 255 / .1); color: #fff; cursor: pointer; }
  .gd-x svg { width: 22px; height: 22px; }
  .gd-corps { display: grid; gap: 1rem; padding: 0 1rem 1.1rem; }
  @media (min-width: 860px) { .gd-corps { grid-template-columns: minmax(0, 420px) 1fr; align-items: start; } }
  .gd-lecteur { position: relative; border-radius: 16px; overflow: hidden; background: #021220; }
  .gd-lecteur video { display: block; width: 100%; height: auto; max-height: 70dvh; aspect-ratio: 9 / 16; object-fit: contain; background: #021220; cursor: pointer; }
  .gd-lecteur video::cue { font-family: var(--f-texte); font-size: .9rem; background: rgb(4 34 58 / .85); }
  .gd-grand { position: absolute; left: 50%; top: 45%; translate: -50% -50%; display: grid; place-items: center; width: 84px; height: 84px; border: 0; border-radius: 50%; background: #9FD0F5; color: #04223A; cursor: pointer; box-shadow: 0 14px 40px -10px rgb(0 0 0 / .6), 0 0 0 10px rgb(159 208 245 / .2); transition: transform .2s; }
  .gd-grand svg { width: 40px; height: 40px; margin-left: 4px; }
  @media (hover: hover) { .gd-grand:hover { transform: scale(1.06); } }
  .gd-barre { position: absolute; left: 0; right: 0; bottom: 0; padding: 1.6rem .6rem .45rem; background: linear-gradient(transparent, rgb(2 18 32 / .92) 45%); transition: opacity .3s; }
  .gd-joue .gd-barre { opacity: .25; } .gd-joue .gd-lecteur:hover .gd-barre, .gd-joue .gd-barre:focus-within { opacity: 1; }
  @media (hover: none) { .gd-joue .gd-barre { opacity: 1; } }
  .gd-temps-ligne { padding: .55rem .25rem; cursor: pointer; touch-action: none; }
  .gd-piste { position: relative; height: 6px; border-radius: 3px; background: rgb(255 255 255 / .22); }
  .gd-lu { position: absolute; left: 0; top: 0; bottom: 0; width: 0; border-radius: 3px; background: #9FD0F5; }
  .gd-lu::after { content: ''; position: absolute; right: -8px; top: 50%; width: 16px; height: 16px; margin-top: -8px; border-radius: 50%; background: #fff; box-shadow: 0 2px 8px rgb(0 0 0 / .4); }
  .gd-repere { position: absolute; top: -3px; width: 3px; height: 12px; margin-left: -1.5px; border-radius: 2px; background: #fff; opacity: .7; }
  .gd-piste:focus-visible { outline: 3px solid #9FD0F5; outline-offset: 6px; }
  .gd-boutons { display: flex; align-items: center; gap: .15rem; }
  .gd-b { display: grid; place-items: center; width: 44px; height: 44px; border: 0; border-radius: 12px; background: transparent; color: #fff; cursor: pointer; }
  .gd-b svg { width: 24px; height: 24px; }
  .gd-b:focus-visible, .gd-chapitres button:focus-visible, .gd-x:focus-visible, .gd-grand:focus-visible { outline: 3px solid #9FD0F5; outline-offset: 2px; }
  @media (hover: hover) { .gd-b:hover { background: rgb(159 208 245 / .15); } }
  .gd-cc { margin-left: auto; } .gd-cc[aria-pressed="true"] { background: #9FD0F5; color: #04223A; }
  .gd-horloge { margin-left: .35rem; font: 500 .82rem var(--f-label); letter-spacing: .06em; color: rgb(255 255 255 / .8); font-variant-numeric: tabular-nums; }
  .gd-chap-en-cours { margin: 0 0 .6rem; font: 600 .78rem var(--f-label); letter-spacing: .14em; text-transform: uppercase; color: #9FD0F5; min-height: 1.2em; }
  .gd-chapitres ol { list-style: none; margin: 0; padding: 0; display: grid; gap: .45rem; }
  .gd-chapitres button { width: 100%; display: flex; gap: .8rem; align-items: flex-start; text-align: left; padding: .7rem .8rem; border: 1px solid rgb(159 208 245 / .2); border-radius: 14px; background: rgb(255 255 255 / .04); color: #fff; cursor: pointer; font: inherit; transition: background .2s, border-color .2s; }
  @media (hover: hover) { .gd-chapitres button:hover { background: rgb(159 208 245 / .1); } }
  .gd-chapitres button[aria-current] { border-color: #9FD0F5; background: rgb(159 208 245 / .14); }
  .gd-num { flex: none; display: grid; place-items: center; width: 34px; height: 34px; border-radius: 50%; background: rgb(159 208 245 / .16); font-family: var(--f-titre); font-size: 1.1rem; color: #9FD0F5; }
  .gd-chapitres button[aria-current] .gd-num { background: #9FD0F5; color: #04223A; }
  .gd-chapitres strong { display: block; font: 600 .95rem var(--f-label); letter-spacing: .06em; text-transform: uppercase; }
  .gd-chapitres small { display: block; margin-top: .1rem; font-size: .76rem; color: #9FD0F5; }
  .gd-chapitres em { display: block; margin-top: .3rem; font-style: normal; font-size: .85rem; line-height: 1.4; color: rgb(255 255 255 / .75); }
  .gd-note { margin: .8rem 0 0; font-size: .78rem; color: rgb(255 255 255 / .6); }
  `;
  document.head.append(Object.assign(document.createElement('style'), { id: 'gd-styles', textContent: css }));
}
