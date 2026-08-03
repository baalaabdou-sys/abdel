type Vessel = "cup" | "mug" | "glass" | "tea" | "milkshake";

interface DrinkConfig {
  liquidTop: string;
  liquidBottom: string;
  vessel: Vessel;
  foam?: boolean;
  cream?: boolean;
  ice?: boolean;
  mint?: boolean;
  steam?: boolean;
  drizzle?: string;
}

const drinkConfigs: Record<string, DrinkConfig> = {
  espresso: { liquidTop: "#6B4A30", liquidBottom: "#2B1B13", vessel: "cup", steam: true },
  "spiced-coffee": { liquidTop: "#7A5334", liquidBottom: "#2B1B13", vessel: "cup", steam: true, foam: true },
  "double-espresso": { liquidTop: "#5A3A25", liquidBottom: "#20140D", vessel: "cup", steam: true },
  americano: { liquidTop: "#4A2E1C", liquidBottom: "#1A0F09", vessel: "mug", steam: true },
  "espresso-macchiato": { liquidTop: "#6E4A2E", liquidBottom: "#2B1B13", vessel: "cup", steam: true, foam: true },

  cortado: { liquidTop: "#D8B48A", liquidBottom: "#8A5F3B", vessel: "glass", foam: true },
  "caffe-latte": { liquidTop: "#E0BC91", liquidBottom: "#8A5F3B", vessel: "glass", foam: true, steam: true },
  cappuccino: { liquidTop: "#E4C49B", liquidBottom: "#93643D", vessel: "cup", foam: true, steam: true },
  "biscoff-latte": { liquidTop: "#D9A24B", liquidBottom: "#8A5B23", vessel: "glass", foam: true, cream: true, drizzle: "#B8752B" },
  "nutella-latte": { liquidTop: "#8A5A34", liquidBottom: "#3D2312", vessel: "glass", cream: true, drizzle: "#4A2A16" },
  "honey-latte": { liquidTop: "#E7B65A", liquidBottom: "#A9741C", vessel: "glass", foam: true, drizzle: "#C98A1E" },
  moka: { liquidTop: "#7A4A2E", liquidBottom: "#3A2012", vessel: "glass", cream: true, drizzle: "#3A2012" },

  "the-normal": { liquidTop: "#D8C878", liquidBottom: "#8FA34C", vessel: "tea", mint: true },
  "the-chamali": { liquidTop: "#D3C46E", liquidBottom: "#7A9540", mint: true, vessel: "tea" },
  "the-fusion": { liquidTop: "#C97A5A", liquidBottom: "#8F3F2A", vessel: "tea", mint: true },

  "choco-milk": { liquidTop: "#9C6B45", liquidBottom: "#4A2C17", vessel: "mug", cream: true, drizzle: "#3A1F10" },
  "chocolat-chaud": { liquidTop: "#6B4226", liquidBottom: "#2B160A", vessel: "mug", steam: true, cream: true },

  "caffe-latte-glace": { liquidTop: "#E0BC91", liquidBottom: "#8A5F3B", vessel: "glass", ice: true, foam: true },
  "choco-milk-glace": { liquidTop: "#9C6B45", liquidBottom: "#4A2C17", vessel: "glass", ice: true, cream: true },
  "biscoff-latte-glace": { liquidTop: "#D9A24B", liquidBottom: "#8A5B23", vessel: "glass", ice: true, cream: true, drizzle: "#B8752B" },
  "nutella-latte-glace": { liquidTop: "#8A5A34", liquidBottom: "#3D2312", vessel: "glass", ice: true, cream: true, drizzle: "#4A2A16" },
  "honey-latte-glace": { liquidTop: "#E7B65A", liquidBottom: "#A9741C", vessel: "glass", ice: true, drizzle: "#C98A1E" },
  "moka-glace": { liquidTop: "#7A4A2E", liquidBottom: "#3A2012", vessel: "glass", ice: true, cream: true },

  "essfrapa-chocolat": { liquidTop: "#8A5A34", liquidBottom: "#3D2312", vessel: "milkshake", ice: true, cream: true, drizzle: "#3A1F10" },
  "essfrapa-caramel": { liquidTop: "#C98A3D", liquidBottom: "#7A4E17", vessel: "milkshake", ice: true, cream: true, drizzle: "#8A5518" },

  "tropical-frozen": { liquidTop: "#9BE0B4", liquidBottom: "#2E8B57", vessel: "glass", ice: true },
  "fruit-passion-frozen": { liquidTop: "#F7C874", liquidBottom: "#C9701A", vessel: "glass", ice: true },
  "fruit-peche": { liquidTop: "#F6CBA3", liquidBottom: "#D97B45", vessel: "glass", ice: true },
  "fruit-mangue": { liquidTop: "#FFD873", liquidBottom: "#E68A1E", vessel: "glass", ice: true },

  "strawberry-lemonade": { liquidTop: "#F7BFC8", liquidBottom: "#D94F63", vessel: "glass", ice: true, mint: true },
  "fruit-passion-limonade": { liquidTop: "#F6D384", liquidBottom: "#D98A1E", vessel: "glass", ice: true, mint: true },
  "fruit-passion-fraise": { liquidTop: "#F5AEC0", liquidBottom: "#D9425A", vessel: "glass", ice: true, mint: true },
  "dragon-bleu": { liquidTop: "#9AD8F0", liquidBottom: "#1E6FA8", vessel: "glass", ice: true, mint: true },
  "dragon-green": { liquidTop: "#B7EAB0", liquidBottom: "#2E8B4E", vessel: "glass", ice: true, mint: true },

  "ice-tea-hibiscus": { liquidTop: "#EF8E96", liquidBottom: "#9E1F2E", vessel: "glass", ice: true, mint: true },
  detox: { liquidTop: "#C8EAC0", liquidBottom: "#4E8B4A", vessel: "glass", ice: true, mint: true },
  "ice-tea-peach": { liquidTop: "#F6CBA3", liquidBottom: "#D97B45", vessel: "glass", ice: true, mint: true },

  "milkshake-fraise": { liquidTop: "#F7C1D8", liquidBottom: "#D9426E", vessel: "milkshake", cream: true, drizzle: "#D9426E" },
  "milkshake-chocolat": { liquidTop: "#8A5A34", liquidBottom: "#3D2312", vessel: "milkshake", cream: true, drizzle: "#3A1F10" },
};

const fallbackConfig: DrinkConfig = {
  liquidTop: "#D9B98A",
  liquidBottom: "#8A5F3B",
  vessel: "glass",
};

export default function DrinkVisual({
  productId,
  name,
}: {
  productId: string;
  name: string;
}) {
  const c = drinkConfigs[productId] ?? fallbackConfig;
  const gradId = `liquid-${productId}`;

  return (
    <div
      className="relative flex h-40 w-full items-end justify-center overflow-hidden bg-gradient-to-b from-[#F3ECDF] to-[#E9DFCC] sm:h-44"
      role="img"
      aria-label={name}
    >
      <div
        className="absolute inset-0 opacity-60"
        style={{
          backgroundImage:
            "radial-gradient(circle at 30% 15%, rgba(255,255,255,0.6), transparent 45%)",
        }}
      />

      <svg
        viewBox="0 0 160 160"
        className="relative h-32 w-32 sm:h-36 sm:w-36"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={c.liquidTop} />
            <stop offset="100%" stopColor={c.liquidBottom} />
          </linearGradient>
        </defs>

        {c.steam && (
          <g stroke="#C9BBA8" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.7">
            <path d="M62 38 C 58 30, 68 26, 64 18" />
            <path d="M82 38 C 78 30, 88 26, 84 18" />
          </g>
        )}

        {c.vessel === "cup" && (
          <>
            <ellipse cx="80" cy="128" rx="46" ry="9" fill="#EDE3D2" />
            <path d="M40 62 L46 108 a34 12 0 0 0 68 0 L120 62 Z" fill="#FFFFFF" stroke="#E3D6C2" strokeWidth="2" />
            <path d="M46 70 L52 108 a28 10 0 0 0 56 0 L114 70 Z" fill={`url(#${gradId})`} />
            {c.foam && <ellipse cx="80" cy="72" rx="30" ry="7" fill="#FBF6EC" opacity="0.9" />}
            <path d="M118 78 q18 2 16 20 q-2 16 -18 14" fill="none" stroke="#E3D6C2" strokeWidth="5" />
          </>
        )}

        {c.vessel === "mug" && (
          <>
            <ellipse cx="78" cy="132" rx="44" ry="8" fill="#EDE3D2" />
            <rect x="38" y="52" width="80" height="72" rx="10" fill="#FFFFFF" stroke="#E3D6C2" strokeWidth="2" />
            <rect x="44" y="62" width="68" height="56" rx="6" fill={`url(#${gradId})`} />
            {c.foam && <ellipse cx="78" cy="66" rx="30" ry="6" fill="#FBF6EC" opacity="0.9" />}
            {c.cream && (
              <path d="M50 62 q28 -18 62 0 q-6 8 -14 4 q-8 6 -16 0 q-8 6 -16 0 q-8 6 -16 -4 z" fill="#FBF6EC" />
            )}
            <path d="M118 66 q20 2 18 24 q-2 18 -20 16" fill="none" stroke="#E3D6C2" strokeWidth="6" />
          </>
        )}

        {c.vessel === "glass" && (
          <>
            <ellipse cx="80" cy="132" rx="40" ry="7" fill="#EDE3D2" />
            <path d="M46 46 L54 126 a30 8 0 0 0 52 0 L114 46 Z" fill="#FFFFFF" fillOpacity="0.55" stroke="#E3D6C2" strokeWidth="2" />
            <path d="M52 58 L58 122 a24 6 0 0 0 44 0 L108 58 Z" fill={`url(#${gradId})`} fillOpacity="0.92" />
            {c.foam && <ellipse cx="80" cy="60" rx="26" ry="6" fill="#FBF6EC" opacity="0.9" />}
            {c.cream && (
              <path d="M56 58 q24 -16 48 0 q-5 7 -12 3 q-7 5 -12 0 q-7 5 -12 0 q-7 5 -12 -3 z" fill="#FBF6EC" />
            )}
            {c.drizzle && (
              <path d="M58 62 q10 6 6 14 q10 4 4 12 q10 4 6 12" fill="none" stroke={c.drizzle} strokeWidth="2.5" opacity="0.85" />
            )}
            {c.ice &&
              [0, 1, 2].map((i) => (
                <rect
                  key={i}
                  x={62 + i * 14}
                  y={70 + (i % 2) * 10}
                  width="12"
                  height="12"
                  rx="2"
                  fill="#FFFFFF"
                  opacity="0.55"
                />
              ))}
          </>
        )}

        {c.vessel === "tea" && (
          <>
            <ellipse cx="80" cy="136" rx="48" ry="8" fill="#D8CBAE" />
            <ellipse cx="80" cy="132" rx="36" ry="6" fill="#C9AF7C" />
            <path d="M58 60 L62 118 a20 8 0 0 0 36 0 L102 60 Z" fill="#FFFFFF" fillOpacity="0.5" stroke="#E3D6C2" strokeWidth="2" />
            <path d="M62 70 L65 116 a16 6 0 0 0 30 0 L98 70 Z" fill={`url(#${gradId})`} />
            {c.mint && <path d="M64 66 q6 -10 14 -4" stroke="#5F7A3D" strokeWidth="3" fill="none" strokeLinecap="round" />}
          </>
        )}

        {c.vessel === "milkshake" && (
          <>
            <ellipse cx="80" cy="134" rx="40" ry="7" fill="#EDE3D2" />
            <path d="M50 44 L56 124 a24 8 0 0 0 48 0 L110 44 Z" fill="#FFFFFF" fillOpacity="0.55" stroke="#E3D6C2" strokeWidth="2" />
            <path d="M55 56 L60 120 a19 6 0 0 0 40 0 L105 56 Z" fill={`url(#${gradId})`} />
            <path d="M58 44 q22 -20 44 0 q-6 10 -16 5 q-6 6 -12 0 q-6 6 -12 0 q-6 5 -4 -5 z" fill="#FBF6EC" />
            {c.drizzle && (
              <path d="M62 48 q8 4 4 10 q8 4 4 10" fill="none" stroke={c.drizzle} strokeWidth="2.5" opacity="0.85" />
            )}
            <rect x="76" y="16" width="6" height="30" rx="3" fill="#E3D6C2" transform="rotate(-8 79 31)" />
          </>
        )}
      </svg>
    </div>
  );
}
