import { redirect } from "next/navigation";

export default async function OwnerDashboardPage({
  params,
}: PageProps<"/[lang]/owner/dashboard">) {
  const { lang } = await params;
  redirect(`/${lang}/owner/dashboard/overview`);
}
