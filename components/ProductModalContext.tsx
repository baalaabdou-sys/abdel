"use client";

import { createContext, useContext, useState, useMemo } from "react";
import { Product } from "@/data/menu";
import ProductModal from "./ProductModal";

interface ProductModalContextValue {
  openProduct: (product: Product) => void;
}

const ProductModalContext = createContext<ProductModalContextValue | null>(null);

export function useProductModal() {
  const ctx = useContext(ProductModalContext);
  if (!ctx) throw new Error("useProductModal must be used within ProductModalProvider");
  return ctx;
}

export default function ProductModalProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [selected, setSelected] = useState<Product | null>(null);

  const value = useMemo(() => ({ openProduct: setSelected }), []);

  return (
    <ProductModalContext.Provider value={value}>
      {children}
      <ProductModal product={selected} onClose={() => setSelected(null)} />
    </ProductModalContext.Provider>
  );
}
