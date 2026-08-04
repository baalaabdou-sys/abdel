import { Category, Product } from "@/data/menu";
import ProductCard from "./ProductCard";
import CategoryIcon from "./CategoryIcon";

export default function MenuSection({
  category,
  products,
  alternate,
}: {
  category: Category;
  products: Product[];
  alternate: boolean;
}) {
  return (
    <section
      id={category.id}
      className={`scroll-mt-32 py-12 sm:py-16 ${alternate ? "bg-surface/60" : ""}`}
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-gold/10 text-gold-dark">
            <CategoryIcon categoryId={category.id} className="h-5 w-5" />
          </span>
          <h2 className="font-display text-2xl font-bold text-espresso sm:text-3xl">
            {category.name}
          </h2>
        </div>
        <div className="mb-8 h-px w-24 bg-gradient-to-r from-gold to-transparent" />

        <div className="grid grid-cols-2 gap-4 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
}
