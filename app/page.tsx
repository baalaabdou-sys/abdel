import Header from "@/components/Header";
import Hero from "@/components/Hero";
import CategoryNav from "@/components/CategoryNav";
import MenuSection from "@/components/MenuSection";
import Footer from "@/components/Footer";
import ProductModalProvider from "@/components/ProductModalContext";
import { categories, products } from "@/data/menu";

export default function Home() {
  const sortedCategories = [...categories].sort((a, b) => a.order - b.order);

  return (
    <ProductModalProvider>
      <main>
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
