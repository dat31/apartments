import * as React from "react";
import { Link } from "@/i18n/navigation";
import { Logo } from "@/components/logo";

/* Shared shell for the 404 / error pages. */
export function ErrorShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <header className="flex items-center justify-between px-6 sm:px-10 h-20">
        <Link href="/apartments" className="focus-ring" aria-label="Danapa home">
          <Logo size={22} />
        </Link>
        <Link
          href="/signin"
          className="whitespace-nowrap text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          Sign in
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 pb-24">
        <div className="w-full max-w-xl text-center anim-up">{children}</div>
      </main>

      <footer className="px-6 sm:px-10 h-16 flex items-center justify-center">
        <p className="text-xs text-muted-foreground tracking-wide">
          Danapa — apartment renting in Da Nang
        </p>
      </footer>
    </div>
  );
}
