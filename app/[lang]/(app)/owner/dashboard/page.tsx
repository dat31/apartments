import { redirect } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";

export default async function OwnerDashboardPage({
  params,
}: PageProps<"/[lang]/owner/dashboard">) {
  const { lang } = await params;
  // next-intl's redirect localizes the path per the routing strategy.
  redirect({ href: "/owner/dashboard/overview", locale: lang as Locale });
}
