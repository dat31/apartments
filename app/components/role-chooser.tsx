import { RoleCards } from "./role-cards";

export function RoleChooser() {
  return (
    <div className="w-full max-w-xl">
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-primary mb-4">
        Welcome to Danapa
      </p>
      <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight text-balance leading-[1.05]">
        Find a place, or fill one.
      </h1>
      <p className="mt-5 text-lg text-muted-foreground text-pretty">
        A calm, simple way to rent in Da Nang. Pick how you&apos;d like to start
        — switch anytime.
      </p>

      <RoleCards />
    </div>
  );
}
