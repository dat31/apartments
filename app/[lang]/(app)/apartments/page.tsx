import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Browse } from "./components/browse";
import { type SearchParams } from "./lib/query";
import { pageAlternates } from "@/lib/seo";

// Metadata never reads searchParams: every filter/sort/page permutation keeps
// the same title and canonicalizes to the clean /apartments URL.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const t = await getTranslations({ locale: lang, namespace: "meta.apartments" });
  return {
    title: t("title"),
    description: t("description"),
    alternates: pageAlternates(lang, "/apartments"),
  };
}

export default function ApartmentsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  // Pass the promise down un-awaited: the static shell never reads it, and only
  // the Suspense islands below resolve it, so the shell stays prerenderable.
  return <Browse searchParams={searchParams} />;
}
