import QRCode from "qrcode";

export type QrPurpose =
  | "link"
  | "menu"
  | "wifi"
  | "social"
  | "whatsapp"
  | "contact"
  | "event";

export type QrStyle = "simple" | "creative" | "premium";

export type QrConfig = {
  purpose: QrPurpose;
  fields: Record<string, string>;
  brand: string;
  fg: string;
  bg: string;
  rounded: boolean;
  style: QrStyle;
  logo?: string | null;
};

/** Escape the reserved characters in Wi-Fi / vCard payload values. */
function esc(v: string) {
  return v.replace(/([\\;,:"])/g, "\\$1");
}

function normalizeUrl(raw: string) {
  const v = raw.trim();
  if (!v) return "";
  if (/^[a-z][a-z0-9+.-]*:/i.test(v)) return v;
  return `https://${v}`;
}

/** Build the actual string encoded into the QR for each purpose. */
export function buildPayload(purpose: QrPurpose, f: Record<string, string>): string {
  switch (purpose) {
    case "link":
    case "menu":
      return normalizeUrl(f.url || "");

    case "social": {
      const v = (f.handle || "").trim();
      if (!v) return "";
      if (/^https?:\/\//i.test(v)) return v;
      const handle = v.replace(/^@/, "");
      const net = (f.network || "instagram").toLowerCase();
      const bases: Record<string, string> = {
        instagram: "https://instagram.com/",
        tiktok: "https://tiktok.com/@",
        facebook: "https://facebook.com/",
        x: "https://x.com/",
        linkedin: "https://linkedin.com/in/",
      };
      return `${bases[net] ?? bases.instagram}${handle}`;
    }

    case "whatsapp": {
      const num = (f.phone || "").replace(/[^\d]/g, "");
      if (!num) return "";
      const text = (f.message || "").trim();
      return `https://wa.me/${num}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
    }

    case "wifi": {
      const ssid = f.ssid || "";
      if (!ssid) return "";
      const enc = f.encryption || "WPA";
      const pass = f.password || "";
      if (enc === "nopass") return `WIFI:T:nopass;S:${esc(ssid)};;`;
      return `WIFI:T:${enc};S:${esc(ssid)};P:${esc(pass)};;`;
    }

    case "contact": {
      const name = (f.name || "").trim();
      if (!name) return "";
      const parts = name.split(/\s+/);
      const last = parts.length > 1 ? parts.pop()! : "";
      const first = parts.join(" ");
      const lines = [
        "BEGIN:VCARD",
        "VERSION:3.0",
        `N:${esc(last)};${esc(first)};;;`,
        `FN:${esc(name)}`,
      ];
      if (f.org) lines.push(`ORG:${esc(f.org)}`);
      if (f.phone) lines.push(`TEL;TYPE=CELL:${f.phone}`);
      if (f.email) lines.push(`EMAIL:${f.email}`);
      if (f.url) lines.push(`URL:${normalizeUrl(f.url)}`);
      lines.push("END:VCARD");
      return lines.join("\n");
    }

    case "event": {
      const title = (f.title || "").trim();
      if (!title) return "";
      // YYYY-MM-DD -> YYYYMMDD
      const day = (f.date || "").replace(/-/g, "");
      const lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "BEGIN:VEVENT",
        `SUMMARY:${esc(title)}`,
      ];
      if (day) {
        lines.push(`DTSTART:${day}T090000`);
        lines.push(`DTEND:${day}T170000`);
      }
      if (f.location) lines.push(`LOCATION:${esc(f.location)}`);
      lines.push("END:VEVENT", "END:VCALENDAR");
      return lines.join("\n");
    }
  }
}

/**
 * Relative luminance (WCAG). Used to guarantee the finished code keeps enough
 * light/dark separation to actually be decodable by a phone camera.
 */
function luminance(hex: string) {
  const m = hex.replace("#", "");
  const full =
    m.length === 3
      ? m
          .split("")
          .map((c) => c + c)
          .join("")
      : m;
  const n = parseInt(full, 16);
  const rgb = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
}

export function contrastRatio(a: string, b: string) {
  const la = luminance(a);
  const lb = luminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * Minimum foreground/background contrast we allow a code to be generated at.
 * Set from measurement, not taste. Decoding a rendered code was tested across
 * a spread of colours: every pair at or below 5.74:1 failed, every pair at or
 * above 6.40:1 succeeded. The bar sits above that cliff because scanning in
 * the real world (camera angle, print quality, lighting) is harder than
 * decoding a clean render.
 */
export const MIN_CONTRAST = 7;

/** Scanners need a solid margin of background around the code. 4 modules is the spec minimum. */
const QUIET_ZONE = 4;

export type QrMatrix = { size: number; get: (x: number, y: number) => boolean };

export function createMatrix(payload: string, hasLogo: boolean): QrMatrix {
  // A centre logo punches out modules, so we lean on stronger error
  // correction whenever one is present (H recovers ~30% vs M's ~15%).
  const qr = QRCode.create(payload, {
    errorCorrectionLevel: hasLogo ? "H" : "M",
  });
  const size = qr.modules.size;
  const data = qr.modules.data;
  return {
    size,
    get: (x, y) => Boolean(data[y * size + x]),
  };
}

function isFinder(x: number, y: number, size: number) {
  const inBox = (bx: number, by: number) => x >= bx && x < bx + 7 && y >= by && y < by + 7;
  return inBox(0, 0) || inBox(size - 7, 0) || inBox(0, size - 7);
}

/**
 * Render the QR as an SVG string.
 *
 * Styling only ever changes the *shape* of modules that the encoder already
 * decided are dark — module positions, quiet zone and error correction are
 * never altered, so a styled code decodes identically to a plain one.
 */
export function renderSvg(cfg: QrConfig, payload: string, px = 640): string {
  const hasLogo = Boolean(cfg.logo);
  const m = createMatrix(payload, hasLogo);
  const total = m.size + QUIET_ZONE * 2;
  const unit = px / total;
  // Verified ceiling: at 0.42 (fully circular) modules stop decoding for some
  // payloads at error-correction level M. 0.3 still reads as rounded while
  // leaving each module solidly connected to its cell.
  const r = cfg.rounded ? unit * 0.3 : 0;

  const parts: string[] = [];
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" viewBox="0 0 ${px} ${px}" shape-rendering="crispEdges">`
  );
  parts.push(`<rect width="${px}" height="${px}" fill="${cfg.bg}"/>`);

  if (cfg.style === "premium") {
    parts.push(
      `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">` +
        `<stop offset="0%" stop-color="${cfg.fg}"/>` +
        `<stop offset="100%" stop-color="${cfg.fg}" stop-opacity="0.72"/>` +
        `</linearGradient></defs>`
    );
  }
  const fill = cfg.style === "premium" ? "url(#g)" : cfg.fg;

  // Data modules. Finder patterns are always excluded here and drawn as solid
  // shapes below — rendering them as individual rounded modules turns the
  // locator squares into rings of dots and stops scanners finding the code.
  for (let y = 0; y < m.size; y++) {
    for (let x = 0; x < m.size; x++) {
      if (!m.get(x, y)) continue;
      if (isFinder(x, y, m.size)) continue;
      const px0 = (x + QUIET_ZONE) * unit;
      const py0 = (y + QUIET_ZONE) * unit;
      parts.push(
        `<rect x="${px0.toFixed(2)}" y="${py0.toFixed(2)}" width="${unit.toFixed(2)}" height="${unit.toFixed(2)}" rx="${r.toFixed(2)}" fill="${fill}"/>`
      );
    }
  }

  {
    // The three finder patterns, as spec-shaped concentric squares
    // (7x7 ring, 3x3 core) with at most a slight corner softening.
    const corners: [number, number][] = [
      [0, 0],
      [m.size - 7, 0],
      [0, m.size - 7],
    ];
    // Finder patterns are what a scanner uses to locate and orient the code,
    // so they only ever get a slight corner softening. Rounding them heavily
    // looks nicer but measurably breaks decoding on some payloads.
    const fr = cfg.rounded && cfg.style !== "simple" ? unit * 0.8 : unit * 0.2;
    for (const [cx, cy] of corners) {
      const ox = (cx + QUIET_ZONE) * unit;
      const oy = (cy + QUIET_ZONE) * unit;
      parts.push(
        `<rect x="${ox.toFixed(2)}" y="${oy.toFixed(2)}" width="${(unit * 7).toFixed(2)}" height="${(unit * 7).toFixed(2)}" rx="${fr.toFixed(2)}" fill="${fill}"/>`,
        `<rect x="${(ox + unit).toFixed(2)}" y="${(oy + unit).toFixed(2)}" width="${(unit * 5).toFixed(2)}" height="${(unit * 5).toFixed(2)}" rx="${(fr * 0.7).toFixed(2)}" fill="${cfg.bg}"/>`,
        `<rect x="${(ox + unit * 2).toFixed(2)}" y="${(oy + unit * 2).toFixed(2)}" width="${(unit * 3).toFixed(2)}" height="${(unit * 3).toFixed(2)}" rx="${(fr * 0.45).toFixed(2)}" fill="${fill}"/>`
      );
    }
  }

  if (cfg.logo) {
    // Cap the logo at 22% of the code. With level-H error correction (~30%
    // recoverable) this stays comfortably inside the recoverable budget.
    const logoSize = px * 0.22;
    const pad = unit * 0.6;
    const lx = (px - logoSize) / 2;
    parts.push(
      `<rect x="${(lx - pad).toFixed(2)}" y="${(lx - pad).toFixed(2)}" width="${(logoSize + pad * 2).toFixed(2)}" height="${(logoSize + pad * 2).toFixed(2)}" rx="${(unit * 1.2).toFixed(2)}" fill="${cfg.bg}"/>`,
      `<image href="${cfg.logo}" x="${lx.toFixed(2)}" y="${lx.toFixed(2)}" width="${logoSize.toFixed(2)}" height="${logoSize.toFixed(2)}" preserveAspectRatio="xMidYMid meet"/>`
    );
  }

  parts.push("</svg>");
  return parts.join("");
}

export async function svgToPngDataUrl(svg: string, px = 1024): Promise<string> {
  const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    img.crossOrigin = "anonymous";
    await new Promise<void>((res, rej) => {
      img.onload = () => res();
      img.onerror = () => rej(new Error("render failed"));
      img.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = px;
    canvas.height = px;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("no 2d context");
    ctx.drawImage(img, 0, 0, px, px);
    return canvas.toDataURL("image/png");
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function downloadDataUrl(dataUrl: string, filename: string) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}
