import { Suspense } from "react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { TourContent } from "./components/tour-content";
import { TourSkeleton } from "./components/tour-skeleton";
import { getListingById } from "@/lib/services/listings";
import { getListingIdsWithTour, getVirtualTour } from "@/lib/services/virtual-tours";
import { ogDefaults, pageAlternates } from "@/lib/seo";

/* Prerender the tour of every listing that has one, next to the detail pages
   they hang off. Listings whose tour is published after the build render on
   demand (dynamicParams defaults to true). Same build-time fallback as the
   detail route: an unreachable Supabase must not fail the build. */
export async function generateStaticParams() {
  try {
    return (await getListingIdsWithTour()).map((id) => ({ id }));
  } catch {
    return [];
  }
}

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/apartments/[id]/virtual-tour">): Promise<Metadata> {
  const { lang, id } = await params;
  const [listing, tour, t] = await Promise.all([
    getListingById(id),
    getVirtualTour(id),
    getTranslations({ locale: lang, namespace: "virtualTour" }),
  ]);
  if (!listing || !tour) return {};

  const title = t("metaTitle", { title: listing.title });
  const description = t("metaDescription", {
    title: listing.title,
    rooms: tour.scenes.length,
  });
  const entry = tour.scenes.find((s) => s.id === tour.entryScene) ?? tour.scenes[0];

  return {
    title,
    description,
    alternates: pageAlternates(lang, `/apartments/${id}/virtual-tour`),
    openGraph: {
      ...ogDefaults(lang),
      title,
      description,
      // The room the tour opens on, as the share image.
      images: [entry.preview],
    },
  };
}

export default async function VirtualTourPage({
  params,
}: PageProps<"/[lang]/apartments/[id]/virtual-tour">) {
  // Same shape as the detail page: resolve params and opt into static
  // rendering here, then stream the listing-dependent half below Suspense.
  const { lang, id } = await params;
  setRequestLocale(lang);
  const t = await getTranslations("virtualTour");

  return (
    <Suspense fallback={<TourSkeleton label={t("loading")} />}>
      <TourContent id={id} />
    </Suspense>
  );
}
