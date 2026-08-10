import Link from "next/link";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import CategoryNav from "@/components/CategoryNav";
import MenuSection from "@/components/MenuSection";
import Footer from "@/components/Footer";
import ProductModalProvider from "@/components/ProductModalContext";
import { categories, products } from "@/data/menu";

export default function CafeCaseStudy() {
  const sortedCategories = [...categories].sort((a, b) => a.order - b.order);

  return (
    <ProductModalProvider>
      <main>
        <Link
          href="/"
          className="fixed left-4 top-4 z-50 rounded-full bg-espresso/90 px-4 py-2 text-xs font-medium tracking-wide text-surface shadow-soft backdrop-blur transition hover:bg-espresso"
        >
          ← Portfolio
        </Link>
        <Header />
        <Hero />
        <CategoryNav />

        <div id="menu">
          {sortedCategories.map((category, index) => (
            <MenuSection
              key={category.id}
              category={category}
              products={products.filter((p) => p.categoryId === category.id)}
              alternate={index % 2 === 1}
            />
          ))}
        </div>

        <Footer />
      </main>
    </ProductModalProvider>
  );
}
