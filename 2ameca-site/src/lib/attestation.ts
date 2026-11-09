import { PDFDocument, rgb, degrees } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import QRCode from 'qrcode';
import { dateLongue } from './dom';

export interface DonneesAttestation {
  prenom: string;
  nom: string;
  titre: string;
  type: 'formation' | 'atelier' | 'evenement';
  date: string;          // AAAA-MM-JJ
  lieu: string;
  code: string;
  delivree_at: string;   // ISO
}

const BLEU = rgb(10 / 255, 74 / 255, 122 / 255);
const MARINE = rgb(4 / 255, 34 / 255, 58 / 255);
const CIEL = rgb(159 / 255, 208 / 255, 245 / 255);
const ENCRE = rgb(45 / 255, 45 / 255, 45 / 255);

const base = () => import.meta.env.BASE_URL.replace(/\/$/, '');
const charger = (chemin: string) => fetch(base() + chemin).then((r) => {
  if (!r.ok) throw new Error(`Fichier introuvable : ${chemin}`);
  return r.arrayBuffer();
});

const libelle = { formation: 'à la formation', atelier: 'à l’atelier', evenement: 'à l’événement' } as const;

/** Construit l'attestation (A4 paysage) et renvoie le PDF. */
export async function genererAttestation(d: DonneesAttestation): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  pdf.setTitle(`Attestation — ${d.prenom} ${d.nom} — ${d.titre}`);
  pdf.setAuthor('Club 2AMECA — FSAC');

  const [anton, barlow, barlowB, logoClub, logoFsac] = await Promise.all([
    charger('/fonts/Anton-Regular.ttf'), charger('/fonts/Barlow-Regular.ttf'), charger('/fonts/Barlow-SemiBold.ttf'),
    charger('/logos/2ameca-640.png'), charger('/logos/fsac-355.jpg'),
  ]);
  const fTitre = await pdf.embedFont(anton, { subset: true });
  const fTexte = await pdf.embedFont(barlow, { subset: true });
  const fGras = await pdf.embedFont(barlowB, { subset: true });
  const imgClub = await pdf.embedPng(logoClub);
  const imgFsac = await pdf.embedJpg(logoFsac);

  const W = 841.89, H = 595.28;           // A4 paysage
  const page = pdf.addPage([W, H]);
  const centre = (texte: string, police: typeof fTexte, taille: number, y: number, couleur = ENCRE) => {
    const w = police.widthOfTextAtSize(texte, taille);
    page.drawText(texte, { x: (W - w) / 2, y, size: taille, font: police, color: couleur });
  };
  // Réduit la taille d'un texte pour qu'il tienne dans la largeur donnée.
  const ajuste = (texte: string, police: typeof fTexte, taille: number, max: number) => {
    let t = taille; while (t > 10 && police.widthOfTextAtSize(texte, t) > max) t -= 1; return t;
  };

  // Cadre et lignes de construction (rappel du logo)
  page.drawRectangle({ x: 24, y: 24, width: W - 48, height: H - 48, borderColor: BLEU, borderWidth: 1.2 });
  page.drawRectangle({ x: 30, y: 30, width: W - 60, height: H - 60, borderColor: CIEL, borderWidth: .6 });
  for (const [x1, y1, x2, y2] of [[30, 170, 190, 30], [30, 215, 235, 30], [W - 30, H - 170, W - 190, H - 30], [W - 30, H - 215, W - 235, H - 30]])
    page.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, thickness: .6, color: CIEL });

  // Logos
  const hClub = 36, hFsac = 50;
  page.drawImage(imgFsac, { x: 70, y: H - 70 - hFsac, width: (imgFsac.width / imgFsac.height) * hFsac, height: hFsac });
  const wClub = (imgClub.width / imgClub.height) * hClub;
  page.drawImage(imgClub, { x: W - 70 - wClub, y: H - 70 - hClub, width: wClub, height: hClub });

  // Texte
  centre('ATTESTATION DE PARTICIPATION', fTitre, 40, H - 190, BLEU);
  centre('Le Club 2AMECA de la FSAC atteste que', fTexte, 14, H - 232);
  const nom = `${d.prenom} ${d.nom.toUpperCase()}`.trim();
  centre(nom, fTitre, ajuste(nom, fTitre, 38, W - 200), H - 290, MARINE);
  page.drawLine({ start: { x: W / 2 - 150, y: H - 302 }, end: { x: W / 2 + 150, y: H - 302 }, thickness: .8, color: CIEL });
  centre(`a participé ${libelle[d.type]}`, fTexte, 14, H - 335);
  const titre = `« ${d.titre} »`;
  centre(titre, fGras, ajuste(titre, fGras, 20, W - 200), H - 365, BLEU);
  centre(`le ${dateLongue(d.date)}${d.lieu ? ` — ${d.lieu}` : ''}.`, fTexte, 14, H - 392);

  // Pied : lieu et date de délivrance, code de vérification et QR code
  const delivree = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Africa/Casablanca' }).format(new Date(d.delivree_at));
  page.drawText(`Fait à Casablanca, le ${delivree}`, { x: 70, y: 112, size: 11.5, font: fTexte, color: ENCRE });
  page.drawText('Le bureau du Club 2AMECA', { x: 70, y: 92, size: 11.5, font: fGras, color: MARINE });
  page.drawText('Faculté des Sciences Aïn Chock — Université Hassan II de Casablanca', { x: 70, y: 66, size: 9, font: fTexte, color: ENCRE, opacity: .75 });

  const urlVerif = `${location.origin}${base()}/verifier/?code=${d.code}`;
  const qr = await QRCode.toDataURL(urlVerif, { margin: 1, width: 300, errorCorrectionLevel: 'M', color: { dark: '#04223A', light: '#FFFFFF' } });
  const imgQr = await pdf.embedPng(qr);
  page.drawImage(imgQr, { x: W - 70 - 78, y: 58, width: 78, height: 78 });
  const lignes = ['Vérifier cette attestation :', `Code ${d.code}`];
  lignes.forEach((t, n) => {
    const police = n ? fGras : fTexte;
    const w = police.widthOfTextAtSize(t, 9.5);
    page.drawText(t, { x: W - 70 - 78 - 12 - w, y: 104 - n * 14, size: 9.5, font: police, color: n ? BLEU : ENCRE });
  });
  page.drawText('Esprit citoyen au centre', { x: W - 70 - 78 - 12 - fTexte.widthOfTextAtSize('Esprit citoyen au centre', 9), y: 64, size: 9, font: fTexte, color: BLEU, opacity: .8, rotate: degrees(0) });

  return pdf.save();
}

/** Lance le téléchargement d'un fichier généré dans le navigateur. */
export function telecharger(donnees: Uint8Array | Blob, nom: string, type = 'application/pdf') {
  const blob = donnees instanceof Blob ? donnees : new Blob([donnees as unknown as BlobPart], { type });
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), { href: url, download: nom });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export const nomFichier = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
