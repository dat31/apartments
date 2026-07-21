import { type ReactNode } from "react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { ListingCard } from "@/components/listing-card";
import { type Listing } from "@/schemas/listing";

/* Fixed-width listing scroller built on the shared embla Carousel. A Server
   Component: it renders the client Carousel primitives but the ListingCards it
   slots in stay server-rendered (passed as children through CarouselItem). */
export function ListingCarousel({
  listings,
  badgeFor,
  now,
}: {
  listings: Listing[];
  badgeFor: (listing: Listing) => { icon: ReactNode; label: string };
  /** Reference time for the cards' availability labels — see ListingCard. */
  now?: number;
}) {
  return (
    <Carousel opts={{ align: "start" }} className="w-full">
      <CarouselContent className="-ml-5">
        {listings.map((l) => (
          <CarouselItem
            key={l.id}
            className="pl-5 basis-[280px] sm:basis-[300px]"
          >
            <ListingCard listing={l} badge={badgeFor(l)} now={now} />
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious className="hidden sm:flex left-2 rounded-none" />
      <CarouselNext className="hidden sm:flex right-2 rounded-none" />
    </Carousel>
  );
}
