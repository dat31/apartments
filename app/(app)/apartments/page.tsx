import { Browse } from "./components/browse";
import { type SearchParams } from "./lib/query";

export default async function ApartmentsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  return <Browse searchParams={await searchParams} />;
}
