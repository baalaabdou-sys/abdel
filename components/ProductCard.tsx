import { Product } from "@/data/menu";
import DrinkVisual from "./DrinkVisual";

export default function ProductCard({ product }: { product: Product }) {
  return (
    <div className="group overflow-hidden rounded-xl2 border border-border bg-surface shadow-card transition-transform duration-300 ease-out hover:-translate-y-1 hover:shadow-soft">
      <DrinkVisual productId={product.id} name={product.name} />
      <div className="space-y-1 p-4">
        <h3 className="font-display text-base font-semibold leading-snug text-espresso sm:text-lg">
          {product.name}
        </h3>
        <p className="text-sm font-medium text-gold-dark">{product.price} DHS</p>
      </div>
    </div>
  );
}
