import { escapeHtml } from '@/lib/utils';

export type RenderEmailInput = {
  bodyText: string;
  ctaLabel: string;
  ctaUrl: string;
  unsubscribeUrl: string;
  senderName: string;
  companyName: string;
  legalNotice?: string;
  privacyUrl?: string;
  logoUrl?: string | null;
  trackingPixelUrl?: string | null;
};

/**
 * Renders campaign copy to a table-based, dark-mode-tolerant HTML email.
 * `[[CTA]]` in the body text marks where the call-to-action button goes.
 */
export function renderCampaignEmail(input: RenderEmailInput): { html: string; text: string } {
  const paragraphs = input.bodyText
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);

  const bodyBlocks = paragraphs
    .map((block) => {
      if (block.includes('[[CTA]]')) return ctaBlock(input.ctaLabel, input.ctaUrl);
      const lines = block.split('\n').map((l) => escapeHtml(l)).join('<br />');
      return `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#1f2937;">${lines}</p>`;
    })
    .join('\n');

  const hasCta = input.bodyText.includes('[[CTA]]');

  const html = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<meta name="color-scheme" content="light" />
<title>${escapeHtml(input.companyName)}</title>
</head>
<body style="margin:0;padding:0;background:#f4f5f7;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:24px 12px;">
  <tr><td align="center">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:12px;border:1px solid #e5e7eb;">
      <tr><td style="padding:24px 28px 8px;">
        ${input.logoUrl ? `<img src="${escapeHtml(input.logoUrl)}" alt="${escapeHtml(input.companyName)}" height="32" style="height:32px;display:block;" />` : `<p style="margin:0;font-size:15px;font-weight:700;color:#111827;">${escapeHtml(input.companyName)}</p>`}
      </td></tr>
      <tr><td style="padding:16px 28px 8px;">
        ${bodyBlocks}
        ${hasCta ? '' : ctaBlock(input.ctaLabel, input.ctaUrl)}
      </td></tr>
      <tr><td style="padding:8px 28px 24px;border-top:1px solid #f3f4f6;">
        <p style="margin:12px 0 0;font-size:11px;line-height:1.6;color:#6b7280;">
          ${escapeHtml(input.legalNotice ?? '')}
        </p>
        <p style="margin:8px 0 0;font-size:11px;line-height:1.6;color:#6b7280;">
          ${input.privacyUrl ? `<a href="${escapeHtml(input.privacyUrl)}" style="color:#6b7280;">Politique de confidentialité</a> · ` : ''}
          <a href="${escapeHtml(input.unsubscribeUrl)}" style="color:#6b7280;text-decoration:underline;">Se désinscrire</a>
        </p>
      </td></tr>
    </table>
    <p style="max-width:600px;margin:14px auto 0;font-size:11px;color:#9ca3af;text-align:center;">
      ${escapeHtml(input.senderName)} · ${escapeHtml(input.companyName)}
    </p>
  </td></tr>
</table>
${input.trackingPixelUrl ? `<img src="${escapeHtml(input.trackingPixelUrl)}" width="1" height="1" alt="" style="display:block;border:0;" />` : ''}
</body>
</html>`;

  const text = [
    input.bodyText.replace('[[CTA]]', `${input.ctaLabel} : ${input.ctaUrl}`),
    '',
    '—',
    input.legalNotice ?? '',
    `Se désinscrire : ${input.unsubscribeUrl}`,
  ]
    .filter(Boolean)
    .join('\n');

  return { html, text };
}

function ctaBlock(label: string, url: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 20px;">
  <tr><td style="border-radius:8px;background:#1d4ed8;">
    <a href="${escapeHtml(url)}" style="display:inline-block;padding:12px 22px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">${escapeHtml(label)}</a>
  </td></tr>
</table>`;
}
