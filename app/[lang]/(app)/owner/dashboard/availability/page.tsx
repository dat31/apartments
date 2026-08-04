import { Suspense } from "react";
import { setRequestLocale } from "next-intl/server";
import { AvailabilityEditor } from "../components/availability-editor";
import { SkeletonAvailability } from "../components/skeleton-availability";
import { getAvailability } from "@/lib/services/availability";
import { getSessionUser } from "@/lib/services/session";

export default async function AvailabilityPage({
  params,
}: PageProps<"/[lang]/owner/dashboard/availability">) {
  const { lang } = await params;
  setRequestLocale(lang);

  return (
    <Suspense fallback={<SkeletonAvailability />}>
      <AvailabilitySlot />
    </Suspense>
  );
}

/* Reads the owner's week server-side and hands it to the editor, which stays
   a client component (see the note on AvailabilityEditor). The session read
   is what makes this dynamic, so it lives inside the boundary. */
async function AvailabilitySlot() {
  const user = await getSessionUser();
  // The route is auth-gated by lib/supabase/middleware, so this is defensive
  // rather than a real state: an empty week is the honest thing to show.
  if (!user) return <AvailabilityEditor seed={{ ownerId: "", template: {} }} />;

  return (
    <AvailabilityEditor
      seed={{ ownerId: user.id, template: await getAvailability(user.id) }}
    />
  );
}
