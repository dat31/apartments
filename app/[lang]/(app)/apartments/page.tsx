import { Browse } from "./components/browse";
import { type SearchParams } from "./lib/query";

export default function ApartmentsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  // Pass the promise down un-awaited: the static shell never reads it, and only
  // the Suspense islands below resolve it, so the shell stays prerenderable.
  return <Browse searchParams={searchParams} />;
}
