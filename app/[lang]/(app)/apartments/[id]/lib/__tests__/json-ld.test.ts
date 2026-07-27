import { describe, expect, it } from "vitest";
import { listingJsonLd } from "../json-ld";
import { SITE_URL } from "@/lib/seo";
import { USD_TO_VND } from "@/lib/data/listings";
import { District } from "@/schemas/listing";
import { makeListing } from "@/tests/factories";

/* Structured data Google parses: a malformed field here is invisible in the
   UI but costs a rich result. */

const crumbs = { home: "Trang chủ", apartments: "Nhà ở" };
const build = (listing = makeListing(), lang: "vi" | "en" = "vi") =>
  listingJsonLd(listing, lang, crumbs);

type Node = Record<string, never> & Record<string, unknown>;
const listingNode = (nodes: object[]) => nodes[0] as Node;
const breadcrumbNode = (nodes: object[]) => nodes[1] as Node;

describe("listingJsonLd", () => {
  it("emits a RealEstateListing and a BreadcrumbList", () => {
    const nodes = build();
    expect(listingNode(nodes)["@type"]).toBe("RealEstateListing");
    expect(breadcrumbNode(nodes)["@type"]).toBe("BreadcrumbList");
    for (const node of nodes) {
      expect((node as Node)["@context"]).toBe("https://schema.org");
    }
  });

  it("uses an absolute, locale-correct listing URL", () => {
    const listing = makeListing({ id: "listing-1" });
    expect(listingNode(build(listing, "vi")).url).toBe(
      `${SITE_URL}/apartments/listing-1`
    );
    expect(listingNode(build(listing, "en")).url).toBe(
      `${SITE_URL}/en/apartments/listing-1`
    );
  });

  it("maps houses and townhouses to the broader House type", () => {
    for (const type of ["House", "Townhouse"]) {
      const about = listingNode(build(makeListing({ type }))).about as Node;
      expect(about["@type"]).toBe("House");
    }
  });

  it("maps every other listing type to Apartment", () => {
    for (const type of ["Studio", "Apartment", "Loft"]) {
      const about = listingNode(build(makeListing({ type }))).about as Node;
      expect(about["@type"]).toBe("Apartment");
    }
  });

  it("prices in the locale's display currency", () => {
    const listing = makeListing({ price: 400 });
    const vi = (listingNode(build(listing, "vi")).offers as Node)
      .priceSpecification as Node;
    expect(vi.price).toBe(400 * USD_TO_VND);
    expect(vi.priceCurrency).toBe("VND");

    const en = (listingNode(build(listing, "en")).offers as Node)
      .priceSpecification as Node;
    expect(en.price).toBe(400);
    expect(en.priceCurrency).toBe("USD");
  });

  it("marks the offer as a monthly lease that is in stock", () => {
    const offers = listingNode(build()).offers as Node;
    expect(offers.businessFunction).toContain("LeaseOut");
    expect(offers.availability).toBe("https://schema.org/InStock");
    expect((offers.priceSpecification as Node).unitCode).toBe("MON");
  });

  it("omits availabilityStarts for an available-now listing", () => {
    // "now" isn't an ISO 8601 DateTime, so emitting it would be invalid.
    const offers = listingNode(build(makeListing({ available: "now" }))).offers as Node;
    expect(offers).not.toHaveProperty("availabilityStarts");
  });

  it("emits availabilityStarts for a concrete future date", () => {
    const future = new Date(Date.now() + 90 * 86_400_000).toISOString().slice(0, 10);
    const offers = listingNode(build(makeListing({ available: future }))).offers as Node;
    expect(offers.availabilityStarts).toBe(future);
  });

  it("omits availabilityStarts once the date has passed", () => {
    const offers = listingNode(build(makeListing({ available: "2020-01-01" }))).offers as Node;
    expect(offers).not.toHaveProperty("availabilityStarts");
  });

  it("describes the address with the localized district label", () => {
    const about = listingNode(build(makeListing({ district: District.SonTra }))).about as Node;
    const address = about.address as Node;
    expect(address.addressLocality).toBe("Sơn Trà");
    expect(address.addressCountry).toBe("VN");
  });

  it("reports floor size in square metres", () => {
    const about = listingNode(build(makeListing({ area: 42 }))).about as Node;
    const size = about.floorSize as Node;
    expect(size.value).toBe(42);
    expect(size.unitCode).toBe("MTK"); // UN/CEFACT for square metre
  });

  it("includes images only when the listing has some", () => {
    expect(listingNode(build(makeListing({ images: ["a.jpg"] }))).image).toEqual(["a.jpg"]);
    expect(listingNode(build(makeListing({ images: [] })))).not.toHaveProperty("image");
    expect(listingNode(build(makeListing({ images: undefined })))).not.toHaveProperty("image");
  });

  it("builds a three-step breadcrumb ending at the listing", () => {
    const items = breadcrumbNode(build(makeListing({ title: "Riverside loft" })))
      .itemListElement as Node[];
    expect(items.map((i) => i.position)).toEqual([1, 2, 3]);
    expect(items[0].name).toBe(crumbs.home);
    expect(items[1].name).toBe(crumbs.apartments);
    expect(items[2].name).toBe("Riverside loft");
    // The current page carries no `item` URL, per Google's guidance.
    expect(items[2]).not.toHaveProperty("item");
  });

  it("localizes the breadcrumb URLs", () => {
    const items = breadcrumbNode(build(makeListing(), "en")).itemListElement as Node[];
    expect(items[0].item).toBe(`${SITE_URL}/en`);
    expect(items[1].item).toBe(`${SITE_URL}/en/apartments`);
  });

  it("serializes to JSON without throwing", () => {
    expect(() => JSON.stringify(build())).not.toThrow();
  });
});
