import { SavedList } from "./components/saved-list";

/* The saved page has no SEO need, so it renders client-side end to end:
   <SavedList> fetches both the saved-id shortlist and the active-listing set
   in the browser (via react-query) and shows its own loading skeleton. This
   thin server shell just mounts that client island — no server data fetch. */
export default function SavedPage() {
  return <SavedList />;
}
