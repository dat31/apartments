"use client";

import * as React from "react";
import { Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { type Listing } from "@/lib/data/listings";
import { BookTourDialog } from "./book-tour-dialog";

/* Self-contained tour trigger — owns the dialog open state so the booking
   card stays a server component. Rendered once per layout (desktop aside,
   mobile bar); only one is visible at a breakpoint. */
export function BookTourButton({
  listing,
  mode,
}: {
  listing: Listing;
  mode: "full" | "compact";
}) {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      {mode === "full" ? (
        <Button size="lg" className="h-12 gap-2" onClick={() => setOpen(true)}>
          <Calendar size={18} /> Book tour
        </Button>
      ) : (
        <Button className="h-11 gap-2" onClick={() => setOpen(true)}>
          <Calendar size={18} /> Book tour
        </Button>
      )}
      <BookTourDialog
        open={open}
        onClose={() => setOpen(false)}
        listing={listing}
      />
    </>
  );
}
