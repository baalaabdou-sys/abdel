"use client";

import Image from "next/image";
import { Product } from "@/data/menu";
import { useProductModal } from "./ProductModalContext";

export default function ProductCard({ product }: { product: Product }) {
  const { openProduct } = useProductModal();

  return (
    <button
      type="button"
      onClick={() => openProduct(product)}
      className="group overflow-hidden rounded-xl2 border border-border bg-surface text-left shadow-card transition-transform duration-300 ease-out hover:-translate-y-1 hover:shadow-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
    >
      <div className="relative h-40 w-full overflow-hidden bg-[#F3ECDF] sm:h-44">
        <Image
          src={product.image}
          alt={product.name}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          className="object-cover transition-transform duration-300 ease-out group-hover:scale-105"
          loading="lazy"
        />
      </div>
      <div className="space-y-1 p-4">
        <h3 className="font-display text-base font-semibold leading-snug text-espresso sm:text-lg">
          {product.name}
        </h3>
        <p className="text-sm font-medium text-gold-dark">{product.price} DHS</p>
      </div>
    </button>
  );
}
