import { Suspense } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ChevronLeft } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { OwnerInfo, OwnerInfoSkeleton } from "./components/owner-info";
import { OwnerReviews, OwnerReviewsSkeleton } from "./components/owner-reviews";
import { OwnerHomes, OwnerHomesSkeleton } from "./components/owner-homes";
import { getOwnerProfile } from "@/lib/services/owners";
import { OWNERS } from "@/lib/data/listings";
import { pageAlternates } from "@/lib/seo";

export function generateStaticParams() {
  return Object.keys(OWNERS).map((id) => ({ id }));
}

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/owner/[id]">): Promise<Metadata> {
  const { lang, id } = await params;
  const owner = await getOwnerProfile(id);
  if (!owner) return {};
  const t = await getTranslations({ locale: lang, namespace: "meta.owner" });
  return {
    title: t("title", { name: owner.name }),
    description: t("description", { name: owner.name }),
    alternates: pageAlternates(lang, `/owner/${id}`),
  };
}

/* Owner profile. The page itself awaits only the entity it's about — the
   owner, for the 404 — and hands the id to three self-fetching regions that
   query in parallel below their own Suspense boundaries: the hero, the
   reviews, and the owner's homes. getOwnerProfile is "use cache"d, so the
   regions that need the owner's name share this read rather than re-querying.
   A slow listings read no longer holds up the hero, and vice versa. */
export default async function OwnerPage({
  params,
}: PageProps<"/[lang]/owner/[id]">) {
  const { lang, id } = await params;
  setRequestLocale(lang);

  const owner = await getOwnerProfile(id);
  if (!owner) notFound();

  const t = await getTranslations("owner");

  return (
    <div className="container mx-auto px-5 sm:px-8 py-6 anim-up">
      <Link
        href="/apartments"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground mb-5 focus-ring"
      >
        <ChevronLeft size={18} /> {t("back")}
      </Link>

      <Suspense fallback={<OwnerInfoSkeleton />}>
        <OwnerInfo id={id} />
      </Suspense>

      <Suspense fallback={<OwnerReviewsSkeleton />}>
        <OwnerReviews id={id} />
      </Suspense>

      <Suspense fallback={<OwnerHomesSkeleton />}>
        <OwnerHomes id={id} />
      </Suspense>
    </div>
  );
}
