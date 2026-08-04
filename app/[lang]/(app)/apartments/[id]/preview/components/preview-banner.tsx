import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, EyeOff, Pencil } from "lucide-react";

/* "Only you can see this." Sits above the listing rather than floating over
   it: the point of the page is to read the home the way a renter would, and a
   sticky bar would cover the thing being judged.

   Takes its copy as props — the page resolves it on the server, so nothing
   here needs a translation runtime. */
export function PreviewBanner({
  title,
  body,
  back,
  edit,
  listingId,
}: {
  title: string;
  body: string;
  back: string;
  edit: string;
  listingId: string;
}) {
  return (
    <div className="mb-6 bg-secondary text-secondary-foreground p-5 flex flex-wrap items-start justify-between gap-x-6 gap-y-4">
      <div className="min-w-0 flex gap-3">
        <EyeOff size={20} className="shrink-0 mt-0.5" />
        <div className="min-w-0">
          <p className="font-semibold leading-tight">{title}</p>
          <p className="mt-1 text-sm opacity-90 text-pretty max-w-prose">{body}</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button asChild variant="ghost" className="h-10">
          <Link href="/owner/dashboard">
            <ArrowLeft size={16} /> {back}
          </Link>
        </Button>
        <Button asChild className="h-10">
          <Link href={`/apartments/${listingId}/edit`}>
            <Pencil size={16} /> {edit}
          </Link>
        </Button>
      </div>
    </div>
  );
}
