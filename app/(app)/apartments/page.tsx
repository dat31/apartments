import { Browse } from "./components/browse";
import { SEED_LISTINGS } from "@/lib/data/listings";

export default function ApartmentsPage() {
  return <Browse listings={SEED_LISTINGS} />;
}
