import { Logo } from "@/components/logo";
import { IconCheck } from "@/components/icons";

const BRAND_POINTS = [
  "Browse calm, clutter-free listings",
  "Tour details, amenities & true costs",
  "Message owners — no middlemen",
];

export function BrandPanel() {
  return (
    <aside className="hidden lg:flex flex-col justify-between bg-primary text-primary-foreground p-12 xl:p-16">
      <Logo size={26} onDark className="anim-fade" />
      <div className="max-w-md anim-up">
        <p className="text-sm font-medium uppercase tracking-[0.22em] opacity-70 mb-4">
          Danapa · Da Nang
        </p>
        <h2 className="text-[2.6rem] xl:text-5xl font-semibold tracking-tight leading-[1.04] text-balance">
          Find a place, or fill one.
        </h2>
        <p className="mt-5 text-lg leading-relaxed opacity-85 text-pretty">
          A quiet, honest way to rent in Da Nang — for the people looking, and
          the people listing.
        </p>
        <ul className="mt-9 space-y-3.5 stagger">
          {BRAND_POINTS.map((p) => (
            <li key={p} className="flex items-start gap-3 text-[15px]">
              <span className="mt-0.5 inline-flex items-center justify-center w-6 h-6 bg-primary-foreground/15 shrink-0">
                <IconCheck size={15} />
              </span>
              <span className="opacity-90">{p}</span>
            </li>
          ))}
        </ul>
      </div>
      <p className="text-sm opacity-60">© 2026 Danapa — a demo prototype.</p>
    </aside>
  );
}
