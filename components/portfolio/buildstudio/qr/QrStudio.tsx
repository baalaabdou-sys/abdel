"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { QR_PURPOSES, getPurposeDef, type QrField } from "@/data/qrPurposes";
import {
  buildPayload,
  contrastRatio,
  MIN_CONTRAST,
  downloadDataUrl,
  renderSvg,
  svgToPngDataUrl,
  type QrConfig,
  type QrPurpose,
  type QrStyle,
} from "@/lib/qr";
import { useAvatarContext } from "../../avatar/AvatarContext";
import MagneticButton from "../../MagneticButton";
import CustomQrPitch from "./CustomQrPitch";

type Stage = "purpose" | "customize" | "building" | "ready";

const BUILD_MS = 3200;
const STYLES: { value: QrStyle; label: string }[] = [
  { value: "simple", label: "Simple" },
  { value: "creative", label: "Creative" },
  { value: "premium", label: "Premium" },
];

const fade = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -16 },
  transition: { duration: 0.35 },
};

export default function QrStudio({ onRestart }: { onRestart: () => void }) {
  const prefersReducedMotion = useReducedMotion();
  const { requestAction } = useAvatarContext();

  const [stage, setStage] = useState<Stage>("purpose");
  const [purpose, setPurpose] = useState<QrPurpose | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [brand, setBrand] = useState("");
  const [fg, setFg] = useState("#0B0E1A");
  const [bg, setBg] = useState("#FFFFFF");
  const [rounded, setRounded] = useState(true);
  const [style, setStyle] = useState<QrStyle>("creative");
  const [logo, setLogo] = useState<string | null>(null);
  const [logoError, setLogoError] = useState<string | null>(null);

  const timer = useRef<ReturnType<typeof setTimeout>>();
  const reactLock = useRef(0);

  useEffect(() => () => clearTimeout(timer.current), []);

  /** Small, rate-limited character reactions while customising. */
  const react = (clip: "skills_tap" | "point_action") => {
    if (prefersReducedMotion) return;
    const now = Date.now();
    if (now - reactLock.current < 2500) return;
    reactLock.current = now;
    requestAction(clip, { holdMs: 1600 });
  };

  const def = purpose ? getPurposeDef(purpose) : null;
  const payload = useMemo(
    () => (purpose ? buildPayload(purpose, fields) : ""),
    [purpose, fields]
  );

  const config: QrConfig | null = purpose
    ? { purpose, fields, brand, fg, bg, rounded, style, logo }
    : null;

  const contrast = contrastRatio(fg, bg);
  const lowContrast = contrast < MIN_CONTRAST;
  const canCreate = Boolean(payload) && !lowContrast;

  const svg = useMemo(() => {
    if (!config || !payload) return null;
    try {
      return renderSvg(config, payload);
    } catch {
      // Payload too long for a single QR symbol, etc.
      return null;
    }
  }, [config, payload]);

  const pickPurpose = (p: QrPurpose) => {
    setPurpose(p);
    setFields(p === "wifi" ? { encryption: "WPA" } : p === "social" ? { network: "instagram" } : {});
    setStage("customize");
  };

  const setField = (name: string, value: string) =>
    setFields((prev) => ({ ...prev, [name]: value }));

  const onLogo = (file?: File) => {
    setLogoError(null);
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setLogoError("That file isn't an image.");
      return;
    }
    if (file.size > 1024 * 1024) {
      setLogoError("Please use an image under 1 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setLogo(String(reader.result));
      react("skills_tap");
    };
    reader.readAsDataURL(file);
  };

  const create = () => {
    if (!canCreate) return;
    setStage("building");
    if (!prefersReducedMotion) requestAction("build_qr", { holdMs: 7200 });
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setStage("ready"), BUILD_MS);
  };

  const downloadPng = async () => {
    if (!svg) return;
    const png = await svgToPngDataUrl(svg, 1024);
    downloadDataUrl(png, `${(brand || "qr").toLowerCase().replace(/\s+/g, "-")}-qr.png`);
  };

  const downloadSvg = () => {
    if (!svg) return;
    downloadDataUrl(
      `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`,
      `${(brand || "qr").toLowerCase().replace(/\s+/g, "-")}-qr.svg`
    );
  };

  const restartAll = () => {
    clearTimeout(timer.current);
    setStage("purpose");
    setPurpose(null);
    setFields({});
    setLogo(null);
    setBrand("");
    onRestart();
  };

  const inputCls =
    "w-full rounded-lg border border-ink-line bg-ink/70 px-3 py-2.5 text-sm text-paper placeholder:text-haze/50 outline-none transition focus:border-accent/70";
  const labelCls = "mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-haze";

  const renderField = (f: QrField) => (
    <div key={f.name} className={f.full ? "sm:col-span-2" : ""}>
      <label className={labelCls} htmlFor={`qr-${f.name}`}>
        {f.label}
        {f.required && <span className="text-accent"> *</span>}
      </label>
      {f.type === "select" ? (
        <select
          id={`qr-${f.name}`}
          className={inputCls}
          value={fields[f.name] ?? f.options?.[0]?.value ?? ""}
          onChange={(e) => setField(f.name, e.target.value)}
        >
          {f.options?.map((o) => (
            <option key={o.value} value={o.value} className="bg-ink">
              {o.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          id={`qr-${f.name}`}
          className={inputCls}
          type={f.type ?? "text"}
          placeholder={f.placeholder}
          value={fields[f.name] ?? ""}
          onChange={(e) => setField(f.name, e.target.value)}
        />
      )}
    </div>
  );

  return (
    <div>
    <div className="grid items-start gap-10 lg:grid-cols-[1.05fr_0.95fr]">
      {/* ── left: flow ─────────────────────────────── */}
      <div className="min-h-[300px]">
        <AnimatePresence mode="wait">
          {stage === "purpose" && (
            <motion.div key="purpose" {...fade}>
              <div className="mb-4 flex items-center gap-3">
                <p className="text-xs font-medium uppercase tracking-wider text-haze">
                  Step 2 — what should your QR do?
                </p>
                <button
                  type="button"
                  onClick={onRestart}
                  data-cursor-hover
                  className="text-xs text-haze underline-offset-4 transition hover:text-accent hover:underline"
                >
                  back
                </button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {QR_PURPOSES.map((p) => (
                  <button
                    key={p.purpose}
                    type="button"
                    data-cursor-hover
                    onClick={() => pickPurpose(p.purpose)}
                    className="group rounded-2xl border border-ink-line bg-ink/60 p-4 text-left transition duration-300 hover:-translate-y-1 hover:border-accent-soft/60 hover:shadow-[0_20px_50px_-25px_rgba(94,230,208,0.5)]"
                  >
                    <p className="font-medium text-paper">{p.label}</p>
                    <p className="mt-1 text-xs leading-relaxed text-haze">{p.blurb}</p>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {stage === "customize" && def && (
            <motion.div key="customize" {...fade} className="space-y-5">
              <div className="flex items-center gap-3">
                <p className="text-xs font-medium uppercase tracking-wider text-haze">
                  Step 3 — make it yours
                </p>
                <button
                  type="button"
                  onClick={() => setStage("purpose")}
                  data-cursor-hover
                  className="text-xs text-haze underline-offset-4 transition hover:text-accent hover:underline"
                >
                  back
                </button>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {def.fields.map(renderField)}
                <div className="sm:col-span-2">
                  <label className={labelCls} htmlFor="qr-brand">
                    Business name (optional)
                  </label>
                  <input
                    id="qr-brand"
                    className={inputCls}
                    value={brand}
                    placeholder="Shown under the code"
                    onChange={(e) => setBrand(e.target.value)}
                  />
                </div>
              </div>

              {/* colours */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className={labelCls} htmlFor="qr-fg">Main colour</label>
                  <div className="flex items-center gap-2">
                    <input
                      id="qr-fg"
                      type="color"
                      value={fg}
                      onChange={(e) => {
                        setFg(e.target.value);
                        react("point_action");
                      }}
                      className="h-10 w-12 cursor-pointer rounded-lg border border-ink-line bg-ink/70"
                    />
                    <input
                      className={inputCls}
                      value={fg}
                      onChange={(e) => setFg(e.target.value)}
                      aria-label="Main colour hex"
                    />
                  </div>
                </div>
                <div>
                  <label className={labelCls} htmlFor="qr-bg">Background</label>
                  <div className="flex items-center gap-2">
                    <input
                      id="qr-bg"
                      type="color"
                      value={bg}
                      onChange={(e) => {
                        setBg(e.target.value);
                        react("point_action");
                      }}
                      className="h-10 w-12 cursor-pointer rounded-lg border border-ink-line bg-ink/70"
                    />
                    <input
                      className={inputCls}
                      value={bg}
                      onChange={(e) => setBg(e.target.value)}
                      aria-label="Background hex"
                    />
                  </div>
                </div>
              </div>

              {lowContrast && (
                <div className="flex flex-wrap items-center gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2.5 text-xs text-amber-200">
                  <span>
                    Not enough contrast to scan reliably (ratio {contrast.toFixed(1)}:1, needs {MIN_CONTRAST}:1+).
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setFg("#0B0E1A");
                      setBg("#FFFFFF");
                    }}
                    className="rounded-full bg-amber-400/90 px-3 py-1 font-medium text-ink"
                  >
                    Fix it
                  </button>
                </div>
              )}

              {/* shape + style */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className={labelCls}>Module shape</p>
                  <div className="flex gap-2">
                    {[
                      { v: true, label: "Rounded" },
                      { v: false, label: "Square" },
                    ].map((o) => (
                      <button
                        key={String(o.v)}
                        type="button"
                        data-cursor-hover
                        onClick={() => {
                          setRounded(o.v);
                          react("skills_tap");
                        }}
                        className={`flex-1 rounded-lg border px-3 py-2 text-sm transition ${
                          rounded === o.v
                            ? "border-accent bg-accent text-ink"
                            : "border-ink-line bg-ink/60 text-paper hover:border-accent/50"
                        }`}
                      >
                        {o.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className={labelCls}>Style</p>
                  <div className="flex gap-2">
                    {STYLES.map((s) => (
                      <button
                        key={s.value}
                        type="button"
                        data-cursor-hover
                        onMouseEnter={() => react("point_action")}
                        onClick={() => setStyle(s.value)}
                        className={`flex-1 rounded-lg border px-2 py-2 text-xs transition ${
                          style === s.value
                            ? "border-accent-soft bg-accent-soft text-ink"
                            : "border-ink-line bg-ink/60 text-paper hover:border-accent-soft/50"
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* logo */}
              <div>
                <p className={labelCls}>Logo (optional)</p>
                <div className="flex flex-wrap items-center gap-3">
                  <label
                    data-cursor-hover
                    className="cursor-pointer rounded-lg border border-dashed border-ink-line px-4 py-2 text-sm text-haze transition hover:border-accent/60 hover:text-paper"
                  >
                    {logo ? "Replace logo" : "Upload logo"}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => onLogo(e.target.files?.[0])}
                    />
                  </label>
                  {logo && (
                    <button
                      type="button"
                      onClick={() => setLogo(null)}
                      className="text-xs text-haze underline-offset-4 transition hover:text-accent hover:underline"
                    >
                      remove
                    </button>
                  )}
                  {logo && (
                    <span className="text-xs text-accent-soft">
                      Error correction raised to keep it scannable
                    </span>
                  )}
                </div>
                {logoError && <p className="mt-2 text-xs text-amber-300">{logoError}</p>}
              </div>

              <button
                type="button"
                data-cursor-hover
                disabled={!canCreate}
                onClick={create}
                className="w-full rounded-full bg-accent px-6 py-3.5 text-sm font-semibold text-ink transition hover:bg-accent-soft disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto sm:px-8"
              >
                Create my QR
              </button>
              {!payload && (
                <p className="text-xs text-haze/70">Fill the required field to continue.</p>
              )}
            </motion.div>
          )}

          {(stage === "building" || stage === "ready") && (
            <motion.div key="done" {...fade}>
              <p className="text-xs font-medium uppercase tracking-wider text-accent-soft">
                {stage === "building" ? "Assembling…" : "Done"}
              </p>
              <h3 className="mt-3 font-display text-3xl text-paper">
                {stage === "building" ? "Building your QR" : "Your QR is ready."}
              </h3>
              <p className="mt-2 text-haze">
                {stage === "building"
                  ? "Placing modules, applying your colours…"
                  : "Scan it with your phone camera — it works right now."}
              </p>

              <AnimatePresence>
                {stage === "ready" && (
                  <motion.div
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.45 }}
                    className="mt-7 space-y-5"
                  >
                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        data-cursor-hover
                        onClick={downloadPng}
                        className="rounded-full border border-ink-line px-5 py-2.5 text-sm font-medium text-paper transition hover:border-accent hover:text-accent"
                      >
                        Download PNG
                      </button>
                      <button
                        type="button"
                        data-cursor-hover
                        onClick={downloadSvg}
                        className="rounded-full border border-ink-line px-5 py-2.5 text-sm font-medium text-paper transition hover:border-accent hover:text-accent"
                      >
                        Download SVG
                      </button>
                      <button
                        type="button"
                        data-cursor-hover
                        onClick={() => setStage("customize")}
                        className="rounded-full border border-ink-line px-5 py-2.5 text-sm font-medium text-paper transition hover:border-accent hover:text-accent"
                      >
                        Change design
                      </button>
                    </div>

                    <div className="border-t border-ink-line pt-6">
                      <p className="font-display text-xl text-paper">
                        Imagine what I can build for your business.
                      </p>
                      <div className="mt-4 flex flex-wrap items-center gap-4">
                        <MagneticButton
                          href="#contact"
                          className="inline-flex rounded-full bg-accent px-6 py-3 text-sm font-semibold text-ink transition hover:bg-accent-soft"
                        >
                          Start a project with me
                        </MagneticButton>
                        <button
                          type="button"
                          onClick={restartAll}
                          data-cursor-hover
                          className="text-sm text-haze underline-offset-4 transition hover:text-accent hover:underline"
                        >
                          Start over
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── right: live preview ───────────────────── */}
      <div className="flex min-h-[340px] items-center justify-center">
        <AnimatePresence mode="wait">
          {svg && stage !== "purpose" ? (
            <motion.div
              key={stage === "building" ? "building" : "preview"}
              initial={
                // The "pushed toward the camera" hand-off: the finished code
                // arrives oversized and settles into the real preview.
                stage === "ready" && !prefersReducedMotion
                  ? { opacity: 0, scale: 2.1, filter: "blur(14px)" }
                  : { opacity: 0, scale: 0.95 }
              }
              animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: stage === "ready" ? 0.75 : 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="w-full max-w-[300px]"
            >
              <div className="rounded-2xl border border-ink-line bg-ink/60 p-5 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.8)]">
                {/* The SVG carries a fixed pixel size so it can be rasterised
                    for the PNG download — force it to scale to the preview
                    box here instead of overflowing it. */}
                <div
                  className={`overflow-hidden rounded-xl transition-opacity [&>svg]:block [&>svg]:h-auto [&>svg]:w-full ${
                    stage === "building" ? "opacity-40" : "opacity-100"
                  }`}
                  dangerouslySetInnerHTML={{ __html: svg }}
                />
                {brand && (
                  <p className="mt-3 text-center text-sm font-medium text-paper">{brand}</p>
                )}
                <p className="mt-1 text-center text-[11px] text-haze">
                  {stage === "ready" ? "Live — scan to test" : "Live preview"}
                </p>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex h-[280px] w-full max-w-[300px] items-center justify-center rounded-2xl border border-dashed border-ink-line/70"
            >
              <p className="px-8 text-center text-sm text-haze/70">
                Your QR appears here as you type.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>

    {/* Once they have a working code in hand, show what fully custom work
        looks like — the generator proves the tech, this proves the craft. */}
    {stage === "ready" && <CustomQrPitch />}
    </div>
  );
}
