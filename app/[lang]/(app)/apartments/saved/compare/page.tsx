import { CompareView } from "./components/compare-view";
import { privateMetadata } from "@/lib/seo";

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/apartments/saved/compare">) {
  const { lang } = await params;
  return privateMetadata(lang, "compare");
}

/* Side-by-side comparison of homes picked on the Saved page. The compared
   ids live in the URL (?ids=a,b,c) so a comparison is shareable and works
   for guests too; like the Saved page there's no SEO need, so this is a thin
   server shell around a client island that fetches the listings itself. */
export default function ComparePage() {
  return <CompareView />;
}
