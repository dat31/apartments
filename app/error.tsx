"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ErrorShell } from "@/components/error-shell";
import { Home } from "lucide-react";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <ErrorShell>
      <div className="flex items-center justify-center" aria-hidden="true">
        <div className="grid size-26 place-items-center overflow-hidden rounded-2xl bg-destructive p-2">
          {/* Animated WebP (optimized from a 401 KB GIF → 126 KB); served as a
              plain <img> since next/image does not optimize animated images. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/error-dog.webp"
            alt=""
            width={88}
            height={88}
            className="size-full object-contain"
          />
        </div>
      </div>

      <h1 className="mt-10 text-[2rem] font-semibold tracking-tight text-balance">
        Something went wrong
      </h1>
      <p className="mt-3 text-muted-foreground text-pretty max-w-md mx-auto">
        An unexpected error stopped this page from loading. It&apos;s on our side
        — trying again usually fixes it.
      </p>

      <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
        <Button size="lg" className="h-14 px-7 text-base" onClick={() => reset()}>
          Try again
        </Button>
        <Button asChild variant="ghost" size="lg" className="h-14 px-7 text-base gap-2">
          <Link href="/apartments">
            <Home size={18} /> Go home
          </Link>
        </Button>
      </div>

      <p className="mt-9 text-sm text-muted-foreground">
        Still stuck? Write to{" "}
        <a
          href="mailto:support@danapa.vn"
          className="text-primary font-medium hover:underline"
        >
          support@danapa.vn
        </a>
      </p>
    </ErrorShell>
  );
}
