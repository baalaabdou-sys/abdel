"use client";

import { useEffect } from "react";
import Image from "next/image";
import { X } from "lucide-react";
import { Product } from "@/data/menu";

export default function ProductModal({
  product,
  onClose,
}: {
  product: Product | null;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!product) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [product, onClose]);

  if (!product) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={product.name}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-espresso/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg overflow-hidden rounded-xl2 bg-surface shadow-soft"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer"
          className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-surface/90 text-espresso shadow-card transition-colors hover:bg-gold hover:text-white"
        >
          <X className="h-5 w-5" strokeWidth={1.8} />
        </button>

        <div className="relative aspect-square w-full bg-[#F3ECDF]">
          <Image
            src={product.image}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 100vw, 512px"
            className="object-cover"
            priority
          />
        </div>

        <div className="space-y-1 p-6 text-center">
          <h3 className="font-display text-2xl font-semibold text-espresso">
            {product.name}
          </h3>
          <p className="text-base font-medium text-gold-dark">
            {product.price} DHS
          </p>
        </div>
      </div>
    </div>
  );
}
