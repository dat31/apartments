"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Link } from "@/i18n/navigation";
import { deleteListingAction } from "@/lib/actions/listings";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Ellipsis, Pencil, Trash2 } from "lucide-react";

/* Four icon buttons crowded the title at tablet widths, so a listing row's
   whole-listing actions collapse into one trigger and a labelled menu. Preview
   isn't among them: the row itself is a link to the public page, so a menu
   entry doing the same thing was a second way in. Editing is a real link; only
   deleting is a handler.

   It owns the delete rather than taking an onDelete, which is what lets the
   row and the list above it be Server Components. The row goes on the screen
   until router.refresh() lands — the menu has closed by then, so there is
   nowhere to put a spinner, and a delete that fails now says so instead of
   rolling a cache back in silence. */
export function ListingRowMenu({ listingId }: { listingId: string }) {
  const t = useTranslations("dashboard");
  const router = useRouter();
  const [, startTransition] = useTransition();

  const remove = () =>
    startTransition(async () => {
      const result = await deleteListingAction(listingId);
      if (!result.ok) {
        toast.error(t("listings.deleteFailed"));
        return;
      }
      router.refresh();
    });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-lg"
          className="text-muted-foreground"
          aria-label={t("listings.actions")}
        >
          <Ellipsis size={18} />
        </Button>
      </DropdownMenuTrigger>
      {/* Wide enough for the longest label in either language on one line —
          a two-line row in a 36px-tall item reads as a wrapping accident. */}
      <DropdownMenuContent align="end" className="w-52 whitespace-nowrap">
        <DropdownMenuItem asChild className="h-9 gap-2.5 px-2">
          <Link href={`/apartments/${listingId}/edit`}>
            <Pencil size={16} /> {t("listings.edit")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          className="h-9 gap-2.5 px-2"
          onSelect={remove}
        >
          <Trash2 size={16} /> {t("listings.delete")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
