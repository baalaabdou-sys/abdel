import {
  Coffee,
  Milk,
  CupSoda,
  Snowflake,
  IceCreamCone,
  Citrus,
  Leaf,
  GlassWater,
} from "lucide-react";

// Category/drink-specific gradient + icon so every card looks intentional
// even without a photograph on file (graceful, no broken images).
const productVisuals: Record<string, { from: string; to: string; icon: keyof typeof iconMap }> = {
  espresso: { from: "#5A3A25", to: "#2B1B13", icon: "coffee" },
  "spiced-coffee": { from: "#6B4423", to: "#2B1B13", icon: "coffee" },
  "double-espresso": { from: "#4A2E1C", to: "#1F130D", icon: "coffee" },
  americano: { from: "#3B2416", to: "#1A0F09", icon: "coffee" },
  "espresso-macchiato": { from: "#6E4A2E", to: "#3A2415", icon: "coffee" },

  cortado: { from: "#C9A374", to: "#7A5636", icon: "milk" },
  "caffe-latte": { from: "#D8B48A", to: "#8A5F3B", icon: "milk" },
  cappuccino: { from: "#E4C49B", to: "#93643D", icon: "milk" },
  "biscoff-latte": { from: "#D9A24B", to: "#8A5B23", icon: "milk" },
  "nutella-latte": { from: "#8A5A34", to: "#3D2312", icon: "milk" },
  "honey-latte": { from: "#E7B65A", to: "#A9741C", icon: "milk" },
  moka: { from: "#7A4A2E", to: "#3A2012", icon: "milk" },

  "the-normal": { from: "#B7C98A", to: "#5F7A3D", icon: "cup" },
  "the-chamali": { from: "#C7D79E", to: "#6E8B4A", icon: "cup" },
  "the-fusion": { from: "#A9C97E", to: "#597A38", icon: "cup" },

  "choco-milk": { from: "#9C6B45", to: "#4A2C17", icon: "glass" },
  "chocolat-chaud": { from: "#6B4226", to: "#2B160A", icon: "glass" },

  "caffe-latte-glace": { from: "#D8B48A", to: "#8A5F3B", icon: "snow" },
  "choco-milk-glace": { from: "#9C6B45", to: "#4A2C17", icon: "snow" },
  "biscoff-latte-glace": { from: "#D9A24B", to: "#8A5B23", icon: "snow" },
  "nutella-latte-glace": { from: "#8A5A34", to: "#3D2312", icon: "snow" },
  "honey-latte-glace": { from: "#E7B65A", to: "#A9741C", icon: "snow" },
  "moka-glace": { from: "#7A4A2E", to: "#3A2012", icon: "snow" },

  "essfrapa-chocolat": { from: "#6B4226", to: "#2B160A", icon: "ice" },
  "essfrapa-caramel": { from: "#C98A3D", to: "#7A4E17", icon: "ice" },

  "tropical-frozen": { from: "#7FCB9E", to: "#2E8B57", icon: "ice" },
  "fruit-passion-frozen": { from: "#F2A33D", to: "#C9701A", icon: "ice" },
  "fruit-peche": { from: "#F3B98A", to: "#D97B45", icon: "ice" },
  "fruit-mangue": { from: "#FFC94D", to: "#E68A1E", icon: "ice" },

  "strawberry-lemonade": { from: "#F4A6B0", to: "#D94F63", icon: "citrus" },
  "fruit-passion-limonade": { from: "#F2C14E", to: "#D98A1E", icon: "citrus" },
  "fruit-passion-fraise": { from: "#F290A0", to: "#D9425A", icon: "citrus" },
  "dragon-bleu": { from: "#6EC3E8", to: "#1E6FA8", icon: "citrus" },
  "dragon-green": { from: "#8CD98A", to: "#2E8B4E", icon: "citrus" },

  "ice-tea-hibiscus": { from: "#E85D6B", to: "#9E1F2E", icon: "leaf" },
  detox: { from: "#A9D9A0", to: "#4E8B4A", icon: "leaf" },
  "ice-tea-peach": { from: "#F3B98A", to: "#D97B45", icon: "leaf" },

  "milkshake-fraise": { from: "#F4A6C1", to: "#D9426E", icon: "milk" },
  "milkshake-chocolat": { from: "#8A5A34", to: "#3D2312", icon: "milk" },
};

const iconMap = {
  coffee: Coffee,
  milk: Milk,
  cup: CupSoda,
  glass: GlassWater,
  snow: Snowflake,
  ice: IceCreamCone,
  citrus: Citrus,
  leaf: Leaf,
};

export default function DrinkVisual({
  productId,
  name,
}: {
  productId: string;
  name: string;
}) {
  const visual = productVisuals[productId] ?? {
    from: "#D9B98A",
    to: "#8A5F3B",
    icon: "coffee" as const,
  };
  const Icon = iconMap[visual.icon];

  return (
    <div
      className="relative flex h-40 w-full items-center justify-center overflow-hidden sm:h-44"
      style={{
        background: `linear-gradient(150deg, ${visual.from} 0%, ${visual.to} 100%)`,
      }}
      role="img"
      aria-label={name}
    >
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            "radial-gradient(circle at 30% 20%, rgba(255,255,255,0.5), transparent 40%)",
        }}
      />
      <Icon
        className="relative h-12 w-12 text-white/90 drop-shadow-sm sm:h-14 sm:w-14"
        strokeWidth={1.4}
      />
    </div>
  );
}
