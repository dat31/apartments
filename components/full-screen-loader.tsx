import { cn } from "@/lib/utils";
import { DanapaMark } from "@/components/danapa-mark";

/* Branded splash: Danapa mark breathing + indeterminate progress bar. */
export function FullScreenLoader({
  label = "Loading homes in Da Nang…",
  fixed = true,
}: {
  label?: string;
  fixed?: boolean;
}) {
  return (
    <div
      className={cn(
        "z-[80] flex flex-col items-center justify-center bg-background anim-overlay",
        fixed ? "fixed inset-0" : "absolute inset-0"
      )}
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-col items-center">
        <div className="loader-breathe">
          <DanapaMark size={72} />
        </div>
        <span
          className="mt-6 text-2xl font-semibold tracking-tight"
          style={{ letterSpacing: "-0.02em" }}
        >
          Danapa
        </span>
        <span
          className="mt-1 text-[11px] font-medium uppercase text-muted-foreground"
          style={{ letterSpacing: "0.28em" }}
        >
          Da Nang
        </span>

        <div className="loadbar mt-9 h-[3px] w-56">
          <span />
        </div>

        <p className="mt-4 text-sm text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}
