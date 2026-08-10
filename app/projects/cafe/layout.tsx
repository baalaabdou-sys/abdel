import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "الفاضلي — Menu Digital | Case Study",
  description: "Découvrez la carte des boissons du café الفاضلي. Menu digital, sur place uniquement.",
};

export default function CafeLayout({ children }: { children: React.ReactNode }) {
  return <div className="bg-background text-espresso font-body">{children}</div>;
}
