export interface Category {
  id: string;
  name: string;
  icon: string;
  order: number;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  image: string;
  categoryId: string;
}

export const categories: Category[] = [
  { id: "cafeine", name: "Caféine", icon: "Coffee", order: 1 },
  { id: "latte", name: "Latte", icon: "Milk", order: 2 },
  { id: "the-marocain", name: "Thé marocain", icon: "CupSoda", order: 3 },
  { id: "choco-milk", name: "Choco Milk", icon: "GlassWater", order: 4 },
  { id: "ice", name: "Ice", icon: "Snowflake", order: 5 },
  { id: "essfrapa", name: "Essfrapa", icon: "IceCreamCone", order: 6 },
  { id: "frozen", name: "Frozen", icon: "IceCream2", order: 7 },
  { id: "limonades", name: "Limonades", icon: "Citrus", order: 8 },
  { id: "thes-glaces", name: "Thés glacés", icon: "Leaf", order: 9 },
  { id: "milkshakes", name: "Milkshakes", icon: "Milkshake", order: 10 },
];

export const products: Product[] = [
  // Caféine
  { id: "espresso", name: "Espresso", price: 7, image: "/menu/espresso.jpg", categoryId: "cafeine" },
  { id: "spiced-coffee", name: "Spiced Coffee", price: 15, image: "/menu/spiced-coffee.jpg", categoryId: "cafeine" },
  { id: "double-espresso", name: "Double Espresso", price: 12, image: "/menu/double-espresso.jpg", categoryId: "cafeine" },
  { id: "americano", name: "Americano", price: 10, image: "/menu/americano.jpg", categoryId: "cafeine" },
  { id: "espresso-macchiato", name: "Espresso Macchiato", price: 8, image: "/menu/espresso-macchiato.jpg", categoryId: "cafeine" },

  // Latte
  { id: "cortado", name: "Cortado", price: 9, image: "/menu/cortado.jpg", categoryId: "latte" },
  { id: "caffe-latte", name: "Caffè Latte", price: 9, image: "/menu/caffe-latte.jpg", categoryId: "latte" },
  { id: "cappuccino", name: "Cappuccino", price: 9, image: "/menu/cappuccino.jpg", categoryId: "latte" },
  { id: "biscoff-latte", name: "Biscoff Latte", price: 18, image: "/menu/biscoff-latte.jpg", categoryId: "latte" },
  { id: "nutella-latte", name: "Nutella Latte", price: 20, image: "/menu/nutella-latte.jpg", categoryId: "latte" },
  { id: "honey-latte", name: "Honey Latte", price: 20, image: "/menu/honey-latte.jpg", categoryId: "latte" },
  { id: "moka", name: "Moka", price: 20, image: "/menu/moka.jpg", categoryId: "latte" },

  // Thé marocain
  { id: "the-normal", name: "Thé Normal", price: 10, image: "/menu/the-normal.jpg", categoryId: "the-marocain" },
  { id: "the-chamali", name: "Thé Chamali", price: 10, image: "/menu/the-chamali.jpg", categoryId: "the-marocain" },
  { id: "the-fusion", name: "Thé Fusion", price: 10, image: "/menu/the-fusion.jpg", categoryId: "the-marocain" },

  // Choco Milk
  { id: "choco-milk", name: "Choco Milk", price: 11, image: "/menu/choco-milk.jpg", categoryId: "choco-milk" },
  { id: "chocolat-chaud", name: "Chocolat Chaud", price: 15, image: "/menu/chocolat-chaud.jpg", categoryId: "choco-milk" },

  // Ice
  { id: "caffe-latte-glace", name: "Caffè Latte Glacé", price: 13, image: "/menu/caffe-latte-glace.jpg", categoryId: "ice" },
  { id: "choco-milk-glace", name: "Choco Milk Glacé", price: 20, image: "/menu/choco-milk-glace.jpg", categoryId: "ice" },
  { id: "biscoff-latte-glace", name: "Biscoff Latte Glacé", price: 23, image: "/menu/biscoff-latte-glace.jpg", categoryId: "ice" },
  { id: "nutella-latte-glace", name: "Nutella Latte Glacé", price: 23, image: "/menu/nutella-latte-glace.jpg", categoryId: "ice" },
  { id: "honey-latte-glace", name: "Honey Latte Glacé", price: 23, image: "/menu/honey-latte-glace.jpg", categoryId: "ice" },
  { id: "moka-glace", name: "Moka Glacé", price: 23, image: "/menu/moka-glace.jpg", categoryId: "ice" },

  // Essfrapa
  { id: "essfrapa-chocolat", name: "Essfrapa Chocolat", price: 25, image: "/menu/essfrapa-chocolat.jpg", categoryId: "essfrapa" },
  { id: "essfrapa-caramel", name: "Essfrapa Caramel", price: 25, image: "/menu/essfrapa-caramel.jpg", categoryId: "essfrapa" },

  // Frozen
  { id: "tropical-frozen", name: "Tropical Frozen", price: 23, image: "/menu/tropical-frozen.jpg", categoryId: "frozen" },
  { id: "fruit-passion-frozen", name: "Fruit Passion Frozen", price: 23, image: "/menu/fruit-passion-frozen.jpg", categoryId: "frozen" },
  { id: "fruit-peche", name: "Fruit Pêche", price: 23, image: "/menu/fruit-peche.jpg", categoryId: "frozen" },
  { id: "fruit-mangue", name: "Fruit Mangue", price: 23, image: "/menu/fruit-mangue.jpg", categoryId: "frozen" },

  // Limonades
  { id: "strawberry-lemonade", name: "Strawberry Lemonade", price: 25, image: "/menu/strawberry-lemonade.jpg", categoryId: "limonades" },
  { id: "fruit-passion-limonade", name: "Fruit de Passion Limonade", price: 25, image: "/menu/fruit-passion-limonade.jpg", categoryId: "limonades" },
  { id: "fruit-passion-fraise", name: "Fruit de Passion Fraise", price: 25, image: "/menu/fruit-passion-fraise.jpg", categoryId: "limonades" },
  { id: "dragon-bleu", name: "Dragon Bleu", price: 23, image: "/menu/dragon-bleu.jpg", categoryId: "limonades" },
  { id: "dragon-green", name: "Dragon Green", price: 26, image: "/menu/dragon-green.jpg", categoryId: "limonades" },

  // Thés glacés
  { id: "ice-tea-hibiscus", name: "Ice Tea Hibiscus", price: 20, image: "/menu/ice-tea-hibiscus.jpg", categoryId: "thes-glaces" },
  { id: "detox", name: "Detox", price: 20, image: "/menu/detox.jpg", categoryId: "thes-glaces" },
  { id: "ice-tea-peach", name: "Ice Tea Peach", price: 20, image: "/menu/ice-tea-peach.jpg", categoryId: "thes-glaces" },

  // Milkshakes
  { id: "milkshake-fraise", name: "Milkshake Fraise", price: 22, image: "/menu/milkshake-fraise.jpg", categoryId: "milkshakes" },
  { id: "milkshake-chocolat", name: "Milkshake Chocolat", price: 22, image: "/menu/milkshake-chocolat.jpg", categoryId: "milkshakes" },
];

export interface Supplement {
  id: string;
  name: string;
  price: number;
}

export const supplements: Supplement[] = [
  { id: "miel", name: "Miel", price: 2 },
  { id: "eau", name: "Eau", price: 5 },
  { id: "sirop", name: "Sirop", price: 3 },
];
