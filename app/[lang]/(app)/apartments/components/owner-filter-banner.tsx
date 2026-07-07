import { getTranslations } from "next-intl/server";
import { X, User } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { getOwnerProfile } from "@/lib/services/owners";
import { parseFilters, type SearchParams } from "../lib/query";

/* Shown above the results when the browse page carries an owner filter — the
   only way to set it is the "See all homes" link on a host profile. It names
   the host and offers a Clear link back to the unfiltered browse (other active
   filters are preserved; owner + page are dropped). */
export async function OwnerFilterBanner({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const { owner } = parseFilters(sp);
  if (owner === "All") return null;

  const [profile, t] = await Promise.all([
    getOwnerProfile(owner),
    getTranslations("apartments.ownerFilter"),
  ]);
  const name = owner === "you" ? t("you") : profile?.name ?? owner;

  // Clear = drop the owner filter (and page) while keeping every other param.
  const clear = new URLSearchParams();
  for (const [key, value] of Object.entries(sp)) {
    if (key === "owner" || key === "page" || value === undefined) continue;
    clear.set(key, Array.isArray(value) ? value[0] : value);
  }
  const clearQs = clear.toString();

  return (
    <div className="mb-5 flex items-center gap-3 bg-accent text-accent-foreground px-4 py-3 anim-fade">
      <User size={16} className="text-primary shrink-0" />
      <p className="text-sm text-pretty">
        {t("listedBy")} <span className="font-semibold">{name}</span>
      </p>
      <Link
        href={clearQs ? `/apartments?${clearQs}` : "/apartments"}
        className="ml-auto inline-flex items-center gap-1.5 h-8 px-3 text-sm font-medium bg-background text-foreground hover:bg-secondary transition-colors focus-ring shrink-0"
      >
        {t("clear")} <X size={15} />
      </Link>
    </div>
  );
}
