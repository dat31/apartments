import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { OwnerProfile } from "./components/owner-profile";
import { getListingsByOwner } from "@/lib/services/listings";
import { getOwnerProfile } from "@/lib/services/owners";
import { reviewsFor, SEED_REVIEWS, OWNERS } from "@/lib/data/listings";
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

export default async function OwnerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const owner = await getOwnerProfile(id);
  if (!owner) notFound();

  const homes = await getListingsByOwner(id);
  const reviews = reviewsFor(SEED_REVIEWS, id);

  return <OwnerProfile owner={owner} homes={homes} reviews={reviews} />;
}
