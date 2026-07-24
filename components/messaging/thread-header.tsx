"use client";

import { useFormatter, useTranslations } from "next-intl";
import { useChannelStateContext, useChatContext } from "stream-chat-react";
import { ChevronLeft, Check } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { ProfileAvatar } from "@/components/profile-avatar";
import { PALETTE } from "@/lib/data/listings";
import { useMoney } from "@/hooks/use-money";
import { useProfile } from "@/hooks/use-profile";
import { parseYmd } from "@/app/[lang]/(app)/apartments/[id]/constants/tours";

/* Bespoke: Stream's ChannelHeader has no slot for the listing chip, and the
   subtitle is app knowledge (which tour this thread belongs to), not channel
   state. Everything it needs is already on the channel — the two members and
   the custom data written at provisioning — so it costs no extra request. */
export function ThreadHeader({ onBack }: { onBack?: () => void }) {
  const t = useTranslations("messaging");
  const format = useFormatter();
  const money = useMoney();
  const { profile } = useProfile();
  const { client } = useChatContext("ThreadHeader");
  const { channel } = useChannelStateContext("ThreadHeader");

  const other = Object.values(channel.state.members).find(
    (member) => member.user_id !== client.userID
  )?.user;
  const name = other?.name || t("unknownPerson");
  const palette = other?.palette ?? 1;

  const {
    listing_id: listingId,
    listing_title: listingTitle,
    listing_image: listingImage,
    listing_price: listingPrice,
    tour_date: tourDate,
    tour_time: tourTime,
  } = channel.data ?? {};

  /* Stored dates are locale-agnostic plumbing ("2026-07-29" / "14:00");
     they are formatted here, never interpolated raw into copy. */
  const slot =
    tourDate && tourTime
      ? t("tourSlot", {
          date: format.dateTime(parseYmd(tourDate), {
            weekday: "short",
            month: "short",
            day: "numeric",
          }),
          time: format.dateTime(
            new Date(2000, 0, 1, ...(tourTime.split(":").map(Number) as [number, number])),
            { hour: "numeric", minute: "2-digit" }
          ),
        })
      : null;

  return (
    <div className="flex shrink-0 items-center gap-3 py-3 pl-4 sm:pl-5">
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          aria-label={t("back")}
          className="-ml-1 inline-flex h-9 w-9 shrink-0 items-center justify-center text-muted-foreground transition-colors hover:text-foreground focus-ring lg:hidden"
        >
          <ChevronLeft size={20} />
        </button>
      )}

      <ProfileAvatar name={name} palette={palette} size={40} />

      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 truncate font-semibold leading-tight">
          {name}
          {other?.verified && <Check size={14} className="shrink-0 text-primary" />}
        </p>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {/* Tour threads say which viewing they belong to; listing threads
              fall back to the other party's role, as the design specifies. */}
          {slot ?? (profile.role === "owner" ? t("roleRenter") : t("roleOwner"))}
        </p>
      </div>

      {listingId && (
        <Link
          href={`/apartments/${listingId}`}
          className="hidden max-w-56 shrink-0 items-center gap-2.5 bg-muted py-1.5 pl-2.5 pr-3 text-left transition-colors hover:bg-accent hover:text-accent-foreground focus-ring sm:flex"
        >
          <span
            className="h-8 w-8 shrink-0 bg-cover bg-center"
            style={{
              background: listingImage
                ? `center/cover no-repeat url(${listingImage})`
                : PALETTE[palette % PALETTE.length][0],
            }}
            aria-hidden="true"
          />
          <span className="min-w-0">
            <span className="block truncate text-xs font-medium">
              {listingTitle || t("viewListing")}
            </span>
            {/* Truncated because a VND price is far longer than the design's
                "$950/mo" — the chip stays two lines at its max-w-56. */}
            <span className="block truncate text-xs text-muted-foreground">
              {listingPrice
                ? t("chipPrice", { price: money(listingPrice) })
                : t("viewListing")}
            </span>
          </span>
        </Link>
      )}
    </div>
  );
}
