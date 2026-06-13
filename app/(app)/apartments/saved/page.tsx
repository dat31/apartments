import { SavedList } from "./components/saved-list";
import { SEED_LISTINGS } from "@/lib/data/listings";

export default function SavedPage() {
  return <SavedList listings={SEED_LISTINGS} />;
}
