/**
 * Petites icônes au trait (style « dessin technique » du site) associées aux rôles du bureau.
 * Elles tournent autour de la photo quand on touche la carte d'un membre.
 */

const I: Record<string, string> = {
  instagram: '<rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.2" cy="6.8" r=".9" fill="currentColor"/>',
  linkedin: '<rect x="3.5" y="3.5" width="17" height="17" rx="2.5"/><path d="M8 10.5V17M8 7.2v.1M12 17v-6.5M12 13.5a2.5 2.5 0 0 1 5 0V17"/>',
  coeur: '<path d="M12 20s-7.5-4.6-7.5-10.2A4.2 4.2 0 0 1 12 7a4.2 4.2 0 0 1 7.5 2.8C19.5 15.4 12 20 12 20z"/>',
  bulle: '<path d="M4 5.5h16v10.5H10l-6 4z"/><path d="M8.5 10.8h.1M12 10.8h.1M15.5 10.8h.1"/>',
  partage: '<circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="M8.2 10.9l7.6-3.8M8.2 13.1l7.6 3.8"/>',
  appareil: '<path d="M3.5 8h3.5l2-3h6l2 3h3.5v11.5h-17z"/><circle cx="12" cy="13.3" r="3.6"/>',
  lecture: '<rect x="3" y="5" width="18" height="14" rx="3"/><path d="M10 9l5 3-5 3z"/>',
  megaphone: '<path d="M3.5 10v4h3.5l8.5 5V5L7 10z"/><path d="M18.5 9a4.2 4.2 0 0 1 0 6"/>',
  micro: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"/>',
  image: '<rect x="3.5" y="4.5" width="17" height="15" rx="2"/><circle cx="9" cy="9.5" r="1.6"/><path d="M4 18l5-5 4 4 3-3 4 4"/>',
  etoile: '<path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.8l-5.2 2.8 1-5.8-4.3-4.1 5.9-.8z"/>',
  drapeau: '<path d="M5.5 21V4M5.5 4.5h11l-2 4 2 4h-11"/>',
  mains: '<path d="M3 11.5l3.5-3.5 4 2.5 2.5-2 4.5 1 3.5 3.5"/><path d="M6.5 13.5l3.5 3.5 2.5-.5 2-1.5 2-2M10 17l1.5-1.5M13 16.5l1.3-1.3"/>',
  cible: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/>',
  calendrier: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4M8.5 14h.1M12 14h.1M15.5 14h.1"/>',
  liste: '<rect x="5" y="4.5" width="14" height="16.5" rx="2"/><path d="M9 4.5h6v3H9zM9 14l2 2 4-4.5"/>',
  horloge: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  coche: '<circle cx="12" cy="12" r="8.5"/><path d="M8 12.3l2.8 2.8L16 9.5"/>',
  ampoule: '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.5 1 2.5h6c0-1 .3-1.8 1-2.5A6 6 0 0 0 12 3z"/>',
  ordinateur: '<rect x="5" y="5" width="14" height="10" rx="1.2"/><path d="M3 19h18"/>',
  regle: '<path d="M3.5 16.5L16.5 3.5l4 4-13 13z"/><path d="M7 13l2 2M10 10l2 2M13 7l2 2"/>',
  puce: '<rect x="7" y="7" width="10" height="10" rx="1.5"/><path d="M10 3.5V7M14 3.5V7M10 17v3.5M14 17v3.5M3.5 10H7M3.5 14H7M17 10h3.5M17 14h3.5"/>',
  stylo: '<path d="M4 20l4.2-1 11-11-3.2-3.2-11 11z"/><path d="M14 6.8l3.2 3.2"/>',
  document: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 12h6M9 16h6"/>',
  enveloppe: '<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3.5 7l8.5 6 8.5-6"/>',
  dossier: '<path d="M3 6.5h6l2 2h10V19H3z"/>',
  ballon: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5l3.8 2.8-1.4 4.4H9.6l-1.4-4.4z"/><path d="M12 3.5v4M15.8 10.3l4.2-1.3M14.4 14.7l2.5 3.6M9.6 14.7l-2.5 3.6M8.2 10.3L4 9"/>',
  musique: '<path d="M9 18V5.5l10.5-2v13"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="17" cy="16.5" r="2.5"/>',
  palette: '<path d="M12 3.5a8.5 8.5 0 1 0 0 17c1.4 0 1.9-.9 1.9-1.8s-.9-1.4-.9-2.3.8-1.7 1.8-1.7h1.7a4 4 0 0 0 4-4C20.5 6.6 16.7 3.5 12 3.5z"/><circle cx="7.5" cy="12" r="1"/><circle cx="9.5" cy="7.8" r="1"/><circle cx="14.5" cy="7.8" r="1"/>',
  trophee: '<path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M9 20.5h6M10 17h4"/>',
  badge: '<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="10.8" r="2"/><path d="M6 16a3 3 0 0 1 6 0M14.5 10h4M14.5 14h4"/>',
  ajout: '<circle cx="10" cy="8" r="3.5"/><path d="M3.5 20a6.5 6.5 0 0 1 13 0M19 8v6M16 11h6"/>',
  pinceau: '<path d="M14 4.5l5.5 5.5-7.5 7.5L6.5 12z"/><path d="M6.5 12L3.5 18.5l6.5-3"/>',
  formes: '<circle cx="8" cy="8" r="4.5"/><rect x="12" y="12" width="8.5" height="8.5" rx="1"/><path d="M15.5 3.5l4 6.5h-8z"/>',
};

/* ── Scènes animées par rôle (SVG 200 × 250, même format que le portrait) ───────── */

const D = (t: number, du?: number) => `style="--t:${t}s${du ? `;--du:${du}s` : ''}"`;
const pol = (cx: number, cy: number, r: number, deg: number) => {
  const a = (deg * Math.PI) / 180;
  return [+(cx + r * Math.cos(a)).toFixed(1), +(cy + r * Math.sin(a)).toFixed(1)];
};
/** Icône dans une pastille ronde, centrée en (x, y). */
const pastille = (nom: string, x: number, y: number, t: number, extra = '') =>
  `<g transform="translate(${x} ${y})"><g class="${extra}"><g class="pp" ${D(t)}><circle r="15" class="past"/><g transform="translate(-10.8 -10.8) scale(.9)" class="ic">${I[nom]}</g></g></g></g>`;

function orbite(noms: string[], extra = '') {
  const n = noms.length;
  return `<circle cx="100" cy="102" r="62" pathLength="1" class="tr fin" ${D(0, 1)}/>
    <g class="orb">${noms.map((nom, i) => { const [x, y] = pol(100, 102, 62, -90 + (360 / n) * i); return pastille(nom, x, y, 0.25 + i * 0.09, 'droit'); }).join('')}</g>${extra}`;
}

const SCENES: Record<string, () => string> = {
  reseaux: () => orbite(['instagram', 'linkedin', 'bulle', 'partage'],
    [[38, 1.0, 1.3], [74, 1.5, 1], [118, 1.2, 1.5], [158, 1.8, 1.2], [96, 2.2, .9], [140, 2.5, 1.3]].map(([x, t, k]) =>
      `<g transform="translate(${x} 214) scale(${k})"><path class="up plein" ${D(t, 1.7)} d="M0 8s-9-5.5-9-12.2A5 5 0 0 1 0-7a5 5 0 0 1 9 2.8C9 2.5 0 8 0 8z"/></g>`).join('')),

  media: () => `
    <g class="fd fin" ${D(.1)}><path d="M67 0v250M133 0v250M0 83h200M0 167h200" opacity=".45"/></g>
    ${[[42, 40, 1, 1], [158, 40, -1, 1], [42, 166, 1, -1], [158, 166, -1, -1]].map(([x, y, sx, sy], i) =>
      `<path pathLength="1" class="tr gras" ${D(.15 + i * .08, .5)} d="M${x} ${y + 20 * sy}V${y}H${x + 20 * sx}"/>`).join('')}
    <rect x="72" y="72" width="56" height="56" class="focus"/>
    <path class="fd" ${D(1.1)} d="M100 92v20M90 102h20"/>
    <circle cx="20" cy="20" r="4.5" class="plein rec"/><text x="29" y="24" class="txt fd" ${D(.3)}>REC</text>
    <g class="fd" ${D(.5)}><rect x="160" y="14" width="22" height="11" rx="2"/><path d="M184 17.5v4"/><rect x="162.5" y="16.5" width="12" height="6" class="plein" stroke="none"/></g>
    <rect width="200" height="250" class="flash"/>`,

  communication: () => {
    const arcs = [34, 62, 90, 118, 146].map((r, i) => {
      const [x1, y1] = pol(46, 176, r, -78), [x2, y2] = pol(46, 176, r, 4);
      return `<path class="onde" ${D(.45 + i * .16)} d="M${x1} ${y1}A${r} ${r} 0 0 1 ${x2} ${y2}"/>`;
    }).join('');
    return `${arcs}
      <g transform="translate(40 182) rotate(-22)"><g class="pp" ${D(.1)}><circle r="21" class="past"/><g transform="translate(-16.8 -16.8) scale(1.4)" class="ic">${I.megaphone}</g></g></g>
      ${pastille('bulle', 160, 46, 1.3)}${pastille('micro', 168, 150, 1.6)}${pastille('coeur', 118, 28, 1.9)}`;
  },

  design: () => `
    <path pathLength="1" class="tr pinceau" ${D(.1, 1.1)} d="M-12 196C30 150 70 214 112 182S178 150 214 172"/>
    <path pathLength="1" class="tr fin" ${D(.5, .5)} d="M30 74L58 22"/><path pathLength="1" class="tr fin" ${D(.5, .5)} d="M170 74L142 22"/>
    <path pathLength="1" class="tr gras" ${D(.8, 1)} d="M30 74C58 22 142 22 170 74"/>
    <rect x="25.5" y="69.5" width="9" height="9" class="pp past" ${D(.35)}/><rect x="165.5" y="69.5" width="9" height="9" class="pp past" ${D(.35)}/>
    <circle cx="58" cy="22" r="4" class="pp plein" ${D(.9)}/><circle cx="142" cy="22" r="4" class="pp plein" ${D(.9)}/>
    ${[['#FFFFFF', 96], ['#9FD0F5', 119], ['#0A4A7A', 142], ['#04223A', 165]].map(([c, y], i) =>
      `<circle cx="180" cy="${y}" r="9" fill="${c}" class="pp nuance" ${D(1.5 + i * .12)}/>`).join('')}
    <g transform="translate(22 150)"><g class="pp" ${D(1.9)}><circle r="15" class="past"/><g transform="translate(-10.8 -10.8) scale(.9)" class="ic">${I.stylo}</g></g></g>`,

  president: () => {
    const rayons = Array.from({ length: 13 }, (_, i) => {
      const a = -165 + i * 12.5, [x1, y1] = pol(100, 104, 74, a), [x2, y2] = pol(100, 104, i % 2 ? 84 : 90, a);
      return `<path pathLength="1" class="tr" ${D(.9 + i * .04, .4)} d="M${x1} ${y1}L${x2} ${y2}"/>`;
    }).join('');
    const feuilles = [1, -1].map((cote) => Array.from({ length: 5 }, (_, i) => {
      const a = cote === 1 ? 74 - i * 13 : 106 + i * 13, [x, y] = pol(100, 104, 79 + (i % 2) * 5, a);
      return `<g transform="translate(${x} ${y}) rotate(${cote === 1 ? a - 125 : a + 125})"><path class="pp plein" ${D(1.3 + i * .1)} d="M-9 0C-4-5 4-5 10 0C4 5-4 5-9 0z"/></g>`;
    }).join('')).join('');
    return `<circle cx="100" cy="104" r="66" pathLength="1" class="tr gras" ${D(.1, 1)} transform="rotate(-90 100 104)"/>
      <circle cx="100" cy="104" r="59" class="fd fin pointille" ${D(.7)}/>
      ${rayons}${feuilles}
      <g transform="translate(100 30)"><g class="pp pulse" ${D(.8)}><circle r="19" class="past"/><g transform="translate(-15.6 -15.6) scale(1.3)" class="ic plein-ic">${I.etoile}</g></g></g>`;
  },

  vice: () => `
    <path pathLength="1" class="tr gras" ${D(.1, 1)} d="M100 38A66 66 0 0 0 100 170"/>
    <path pathLength="1" class="tr gras" ${D(.1, 1)} d="M100 38A66 66 0 0 1 100 170"/>
    <circle cx="100" cy="104" r="59" class="fd fin pointille" ${D(.8)}/>
    <g transform="translate(100 174)"><g class="pp pulse" ${D(1)}><circle r="19" class="past"/><g transform="translate(-15.6 -15.6) scale(1.3)" class="ic">${I.mains}</g></g></g>
    ${pastille('etoile', 34, 44, 1.4)}${pastille('etoile', 166, 44, 1.55)}
    ${[-150, -130, -50, -30].map((a, i) => { const [x1, y1] = pol(100, 104, 74, a), [x2, y2] = pol(100, 104, 88, a); return `<path pathLength="1" class="tr" ${D(1.2 + i * .06, .4)} d="M${x1} ${y1}L${x2} ${y2}"/>`; }).join('')}`,

  organisation: () => `
    <g transform="translate(36 42)"><g class="pp" ${D(.1)}><circle r="19" class="past"/><path d="M0-13v2M0 11v2M-13 0h2M11 0h2" /><path class="aig" d="M0 0V-10"/><path class="aig lente" d="M0 0V-6.5"/><circle r="1.6" class="plein"/></g></g>
    <path pathLength="1" class="tr fin pointille2" ${D(.4, .9)} d="M56 50C110 50 150 80 150 140"/>
    <g class="gl" ${D(.5)}>
      <rect x="104" y="140" width="86" height="70" rx="5" class="past"/>
      ${[0, 1, 2].map((i) => `<rect x="113" y="${150 + i * 19}" width="10" height="10" rx="2"/><path class="fin" d="M130 ${155 + i * 19}h${[48, 38, 44][i]}"/>
        <path pathLength="1" class="tr gras coche" ${D(1.2 + i * .45, .3)} d="M115 ${155 + i * 19}l2.6 2.8 4.6-5.6"/>`).join('')}
    </g>
    ${pastille('calendrier', 164, 44, 2.3)}`,

  technique: () => {
    const [bx, by] = pol(100, 104, 58, -42);
    return `<g class="fd fin axe" ${D(.1)}><path d="M14 104h172M100 22v170"/></g>
      <circle cx="100" cy="104" r="58" pathLength="1" class="tr gras" ${D(.3, 1.1)} transform="rotate(-42 100 104)"/>
      <path pathLength="1" class="tr" ${D(1.2, .4)} d="M100 104L${bx} ${by}"/><path class="pp plein" ${D(1.5)} d="M${bx} ${by}l-9.2 2.4 5.6 6.2z"/>
      <text x="${bx + 6}" y="${by - 5}" class="txt fd" ${D(1.6)}>R 58</text>
      <path pathLength="1" class="tr fin" ${D(1.5, .4)} d="M42 110v88"/><path pathLength="1" class="tr fin" ${D(1.5, .4)} d="M158 110v88"/>
      <path pathLength="1" class="tr" ${D(1.8, .5)} d="M42 192h116"/>
      <path class="pp plein" ${D(2.2)} d="M42 192l8-3.4v6.8z"/><path class="pp plein" ${D(2.2)} d="M158 192l-8-3.4v6.8z"/>
      <text x="100" y="187" text-anchor="middle" class="txt fd" ${D(2.3)}>Ø 116</text>
      <circle cx="100" cy="104" r="2.2" class="pp plein" ${D(.3)}/>`;
  },

  secretariat: () => `
    <g class="gl" ${D(.1)}><path d="M140 22h28l12 12v44h-40z" class="past"/><path d="M168 22v12h12" class="fin"/>
      ${[0, 1, 2].map((i) => `<path pathLength="1" class="tr fin" ${D(.6 + i * .2, .4)} d="M147 ${46 + i * 9}h${[26, 26, 16][i]}"/>`).join('')}</g>
    <path class="fd fin pointille2" ${D(.6)} d="M26 204h148"/>
    <path pathLength="1" class="tr gras signe" ${D(.9, 1.5)} d="M30 198c6-24 16-26 14-6s8 14 16-4 10-12 14 2 12 10 20-8 12 8 22 4 22-6 44-4"/>
    <g transform="translate(26 178)"><g class="stylo-ecrit" ${D(.9, 1.5)}><g transform="scale(1.1)" class="ic">${I.stylo}</g></g></g>
    <g transform="translate(40 46)"><g class="vol" ${D(2.3)}><circle r="17" class="past"/><g transform="translate(-12 -12)" class="ic">${I.enveloppe}</g></g></g>`,

  parascolaire: () => `
    <path pathLength="1" class="tr fin pointille2" ${D(.1, .8)} d="M10 192h180"/>
    <g class="balle-x" ${D(.3)}><g class="balle-y" ${D(.3)}><g transform="translate(22 178)"><g class="balle-r" ${D(.3)}><circle r="13" class="past"/><g transform="translate(-10.8 -10.8) scale(.9)" class="ic">${I.ballon}</g></g></g></g></g>
    ${[[40, .9, 1.1], [158, 1.3, 1.3], [128, 1.9, .9], [70, 2.3, 1]].map(([x, t, k]) =>
      `<g transform="translate(${x} 140) scale(${k})"><g class="up" ${D(t, 1.8)}><g transform="translate(-12 -12)" class="ic">${I.musique}</g></g></g>`).join('')}
    ${pastille('trophee', 164, 44, 2.2)}${pastille('etoile', 36, 44, 2.5)}`,

  inscription: () => `
    <g class="gl" ${D(.15)}>
      <rect x="32" y="138" width="136" height="62" rx="7" class="past"/>
      <text x="44" y="152" class="txt petit">CARTE DE MEMBRE</text>
      <circle cx="58" cy="172" r="8"/><path d="M44 194a14 14 0 0 1 28 0"/>
      <path class="fin" d="M84 166h56M84 177h40M84 188h48"/>
    </g>
    <circle cx="150" cy="180" r="17" class="onde-tampon"/>
    <g transform="translate(150 180) rotate(-12)"><g class="tampon"><circle r="17" class="past plein-tampon"/><path class="gras" d="M-8 0l5.5 6 10.5-12" /></g></g>
    ${pastille('ajout', 38, 44, 2.1)}${pastille('coche', 164, 44, 2.35)}`,
};

const CLES: [RegExp, string][] = [
  [/r[ée]seaux|social/i, 'reseaux'],
  [/design|graphi/i, 'design'],
  [/communication/i, 'communication'],
  [/m[ée]dia|photo|vid[ée]o/i, 'media'],
  [/vice/i, 'vice'],
  [/pr[ée]sid/i, 'president'],
  [/organisation|logistique/i, 'organisation'],
  [/atelier|technique|formation/i, 'technique'],
  [/secr[ée]tariat|secr[ée]taire/i, 'secretariat'],
  [/parascolaire|sport|culture|activit[ée]s/i, 'parascolaire'],
  [/inscription|adh[ée]sion|membres/i, 'inscription'],
];

/** Scène SVG (contenu interne, sûr : aucune donnée du rôle n'y est insérée) et sa clé. */
export function sceneDuRole(role: string): { cle: string; svg: string } {
  const cle = CLES.find(([re]) => re.test(role))?.[1] ?? 'defaut';
  const svg = SCENES[cle]?.() ?? orbite(['etoile', 'ampoule', 'mains', 'coche']);
  return { cle, svg };
}
