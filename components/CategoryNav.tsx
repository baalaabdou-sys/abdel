"use client";

import { useEffect, useState } from "react";
import {
  Coffee,
  Milk,
  CupSoda,
  Snowflake,
  IceCreamCone,
  IceCream2,
  Citrus,
  Leaf,
  GlassWater,
  LucideIcon,
} from "lucide-react";
import { categories } from "@/data/menu";

const iconMap: Record<string, LucideIcon> = {
  Coffee,
  Milk,
  CupSoda,
  Snowflake,
  IceCreamCone,
  IceCream2,
  Citrus,
  Leaf,
  GlassWater,
  Milkshake: GlassWater,
};

export default function CategoryNav() {
  const [active, setActive] = useState(categories[0].id);

  useEffect(() => {
    const sections = categories
      .map((c) => document.getElementById(c.id))
      .filter(Boolean) as HTMLElement[];

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActive(entry.target.id);
          }
        });
      },
      { rootMargin: "-40% 0px -50% 0px", threshold: 0 }
    );

    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, []);

  return (
    <div className="sticky top-[57px] z-40 border-b border-border bg-background/95 backdrop-blur sm:top-[65px]">
      <nav
        aria-label="Catégories du menu"
        className="no-scrollbar mx-auto flex max-w-6xl gap-2 overflow-x-auto px-4 py-3 sm:px-6"
      >
        {categories.map((category) => {
          const Icon = iconMap[category.icon] ?? Coffee;
          const isActive = active === category.id;
          return (
            <a
              key={category.id}
              href={`#${category.id}`}
              className={`flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? "border-gold bg-gold text-white"
                  : "border-border bg-surface text-coffee hover:border-gold/50"
              }`}
            >
              <Icon className="h-4 w-4" strokeWidth={1.8} />
              {category.name}
            </a>
          );
        })}
      </nav>
    </div>
  );
}
