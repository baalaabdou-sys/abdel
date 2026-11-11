// Image du QR code d'entrée d'un membre, pour l'e-mail « Inscription confirmée ».
// Les e-mails ne peuvent pas contenir l'image directement (Gmail les bloque) :
// ils pointent vers /qr/?m=<identifiant du membre>, et cette fonction dessine le code.
// Le contenu est le même que dans « Mon espace » : 2AMECA:<identifiant>.
import QRCode from 'qrcode';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async (req) => {
  const m = new URL(req.url).searchParams.get('m') ?? '';
  if (!UUID.test(m)) return new Response('Code invalide', { status: 400 });
  const png = await QRCode.toBuffer(`2AMECA:${m.toLowerCase()}`, {
    type: 'png', margin: 2, width: 440, errorCorrectionLevel: 'M',
    color: { dark: '#04223A', light: '#FFFFFF' },
  });
  return new Response(png, {
    headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=31536000, immutable' },
  });
};

export const config = { path: '/qr/' };
