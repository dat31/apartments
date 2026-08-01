"use client";

import { User } from "lucide-react";
import { useUser } from "@/hooks/auth";
import { initialsOf } from "@/lib/data/listings";

/* "Is the viewer this listing's host?" answered on the client.

   Answering it on the server means reading cookies() during the render, which
   opts the whole detail route out of prerendering: the response becomes a PPR
   resume, which Next serves with `Cache-Control: no-store`, which in turn costs
   the route its back/forward cache. Since the answer only toggles cosmetic
   chrome — hosts don't need a "book a tour" CTA on their own listing — it isn't
   worth the static shell, so these islands resolve it after hydration instead.

   While the session is still loading we render the guest view. Guests and
   renters are the overwhelmingly common case, so the primary CTA is never
   delayed; a host briefly sees it before it swaps out. Note this is presentation
   only and never a security boundary — booking a tour on your own listing is
   rejected server-side regardless of what the UI shows. */

/** Renders `children` unless the signed-in viewer owns this listing. */
export function NotOwner({
  ownerId,
  children,
}: {
  ownerId: string;
  children: React.ReactNode;
}) {
  const { data: user } = useUser();
  return user?.id === ownerId ? null : <>{children}</>;
}

/** Renders `children` only for the listing's own host — the mirror of
    NotOwner, for controls that make sense on your own home and nowhere else
    (editing its 360° tour). Same caveat: presentation only, never a security
    boundary. The writes behind it are refused by RLS regardless. */
export function OnlyOwner({
  ownerId,
  children,
}: {
  ownerId: string;
  children: React.ReactNode;
}) {
  const { data: user } = useUser();
  return user?.id === ownerId ? <>{children}</> : null;
}

/** The host's display name on the "listed by" card: "You" when the viewer owns
    the listing, the owner's real name otherwise. `isSeedOwner` covers the seed
    data's demo "you" owner, which is a static fact and needs no session. */
export function OwnerName({
  ownerId,
  isSeedOwner,
  youLabel,
  name,
}: {
  ownerId: string;
  isSeedOwner: boolean;
  youLabel: string;
  name: string;
}) {
  const { data: user } = useUser();
  return <>{isSeedOwner || user?.id === ownerId ? youLabel : name}</>;
}

/** The "listed by" avatar glyph: a person icon for your own listing, the
    owner's initials otherwise. Pairs with <OwnerName> above. */
export function OwnerAvatarGlyph({
  ownerId,
  isSeedOwner,
  name,
}: {
  ownerId: string;
  isSeedOwner: boolean;
  name: string;
}) {
  const { data: user } = useUser();
  return isSeedOwner || user?.id === ownerId ? (
    <User size={20} className="text-background/95" />
  ) : (
    <>{initialsOf(name)}</>
  );
}
