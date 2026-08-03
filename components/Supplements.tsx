import { supplements } from "@/data/menu";

export default function Supplements() {
  return (
    <section className="py-12 sm:py-16">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <h2 className="text-center font-display text-2xl font-bold text-espresso sm:text-3xl">
          Suppléments
        </h2>
        <div className="mx-auto mt-3 mb-8 h-px w-24 bg-gradient-to-r from-transparent via-gold to-transparent" />

        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {supplements.map((item) => (
            <li
              key={item.id}
              className="flex items-center justify-between rounded-xl2 border border-border bg-surface px-5 py-4 shadow-card sm:flex-col sm:items-center sm:gap-2 sm:text-center"
            >
              <span className="font-medium text-espresso">{item.name}</span>
              <span className="text-sm font-medium text-gold-dark">
                {item.price} DHS
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
