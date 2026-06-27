import type { Metadata } from "next";
import { Lexend } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Providers } from "@/components/providers";
import { Toaster } from "@/components/ui/sonner";
import { routing } from "@/i18n/routing";

const lexend = Lexend({
  variable: "--font-lexend",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Danapa — apartment renting in Da Nang",
  description: "A calm, simple way to rent in Da Nang.",
};

// Non-localized root layout. <html>/<body> and the theme provider live here so
// they are NOT remounted when the [lang] segment changes — that keeps the
// next-themes anti-flash <script> from re-rendering on a client-side locale
// switch (which React forbids). The `lang` attribute is set per-locale from the
// nested layout via <HtmlLang>; it defaults to the primary locale at SSR.
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang={routing.defaultLocale}
      className={`${lexend.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          <Providers>{children}</Providers>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
