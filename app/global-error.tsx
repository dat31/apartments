"use client";

import "./globals.css";

/* Last-resort boundary for errors thrown by the root/[lang] layout itself —
   app/[lang]/error.tsx only covers segments below it. Replaces the root
   layout when active, so it must render its own <html>/<body>, and it runs
   without the intl provider, hence the static bilingual copy. */
export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="vi">
      <body className="min-h-screen flex items-center justify-center bg-background text-foreground antialiased">
        <div className="max-w-md px-6 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">
            Đã có lỗi xảy ra
          </h1>
          <p className="mt-2 text-muted-foreground">
            Something went wrong on our end. Please try again.
          </p>
          <button
            onClick={() => reset()}
            className="mt-6 inline-flex h-11 items-center bg-primary px-6 font-medium text-primary-foreground"
          >
            Thử lại · Try again
          </button>
        </div>
      </body>
    </html>
  );
}
