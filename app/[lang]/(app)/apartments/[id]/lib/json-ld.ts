import { localePath, SITE_URL } from "@/lib/seo";
import { USD_TO_VND } from "@/lib/data/listings";
import { districtLabel, type Listing } from "@/schemas/listing";
import type { Locale } from "@/i18n/routing";

/* schema.org JSON-LD for a listing detail page: a RealEstateListing (lease
   offer priced per month, in the locale's display currency) plus the
   Home → Apartments → listing breadcrumb trail. */

/** Broad schema.org accommodation type for our finer-grained listing types. */
const schemaType = (type: Listing["type"]) =>
  type === "House" || type === "Townhouse" ? "House" : "Apartment";

export function listingJsonLd(
  listing: Listing,
  lang: Locale,
  crumbs: { home: string; apartments: string }
): object[] {
  const url = SITE_URL + localePath(lang, `/apartments/${listing.id}`);

  return [
    {
      "@context": "https://schema.org",
      "@type": "RealEstateListing",
      name: listing.title,
      url,
      description: listing.desc,
      ...(listing.images?.length ? { image: listing.images } : {}),
      about: {
        "@type": schemaType(listing.type),
        numberOfBedrooms: listing.beds,
        numberOfBathroomsTotal: listing.baths,
        floorSize: {
          "@type": "QuantitativeValue",
          value: listing.area,
          unitCode: "MTK",
        },
        address: {
          "@type": "PostalAddress",
          addressLocality: districtLabel(listing.district),
          addressRegion: listing.city,
          addressCountry: "VN",
        },
      },
      offers: {
        "@type": "Offer",
        url,
        // Lease, not sale — same convention Google's examples use.
        businessFunction: "http://purl.org/goodrelations/v1#LeaseOut",
        availabilityStarts: listing.available,
        priceSpecification: {
          "@type": "UnitPriceSpecification",
          price: lang === "vi" ? listing.price * USD_TO_VND : listing.price,
          priceCurrency: lang === "vi" ? "VND" : "USD",
          unitCode: "MON",
        },
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: crumbs.home,
          item: SITE_URL + localePath(lang, "/"),
        },
        {
          "@type": "ListItem",
          position: 2,
          name: crumbs.apartments,
          item: SITE_URL + localePath(lang, "/apartments"),
        },
        { "@type": "ListItem", position: 3, name: listing.title },
      ],
    },
  ];
}
