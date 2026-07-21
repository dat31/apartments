import { type Amenity, type Listing } from "@/schemas/listing";
import { type Owner } from "@/schemas/owner";
import { type Review } from "@/schemas/review";

/* ============================================================
   Danapa presentation config + seed data.
   Listings are now read from Supabase (see @/lib/services/listings);
   what remains here is the cover-color palette, the amenity catalog,
   the still-seeded owners/reviews (no tables yet), and pure display
   helpers. Domain schemas/types live in @/schemas/*.
   ============================================================ */

/* Cover-color palettes (solid blocks stand in for photos). */
export const PALETTE: string[][] = [
  ["oklch(0.74 0.07 150)", "oklch(0.68 0.06 150)", "oklch(0.8 0.05 145)"], // sage
  ["oklch(0.78 0.06 95)", "oklch(0.72 0.07 90)", "oklch(0.84 0.05 100)"], // moss/olive
  ["oklch(0.77 0.05 60)", "oklch(0.7 0.06 55)", "oklch(0.83 0.04 65)"], // sand/clay
  ["oklch(0.75 0.05 230)", "oklch(0.69 0.05 235)", "oklch(0.82 0.04 225)"], // slate blue
  ["oklch(0.76 0.06 25)", "oklch(0.7 0.07 28)", "oklch(0.83 0.05 30)"], // terracotta
  ["oklch(0.78 0.04 200)", "oklch(0.72 0.05 205)", "oklch(0.85 0.03 195)"], // stone teal
  ["oklch(0.8 0.05 130)", "oklch(0.74 0.06 135)", "oklch(0.86 0.04 125)"], // fern
  ["oklch(0.79 0.05 320)", "oklch(0.73 0.05 320)", "oklch(0.86 0.03 315)"], // muted plum
];

export const AMENITIES: Amenity[] = [
  { id: "wifi", label: "Fast Wi-Fi", icon: "wifi" },
  { id: "parking", label: "Parking", icon: "car" },
  { id: "pets", label: "Pet friendly", icon: "paw" },
  { id: "garden", label: "Garden / yard", icon: "leaf" },
  { id: "ac", label: "Air conditioning", icon: "snow" },
  { id: "laundry", label: "In-unit laundry", icon: "check-circle" },
];

export const OWNERS: Record<string, Owner> = {
  you: { key: "you", name: "Jordan Rivera", palette: 1, joined: "2021-03", verified: true, superhost: true, responseRate: 99, responseTime: "within an hour", languages: ["English", "Vietnamese"], bio: "Da Nang local renting out a small, well-loved collection of homes across the city. I look after each place like it's my own — quick to fix things, slow to cut corners." },
  maya: { key: "maya", name: "Maya Okonkwo", palette: 5, joined: "2019-08", verified: true, superhost: true, responseRate: 97, responseTime: "within a few hours", languages: ["English", "French"], bio: "Architect by training, host by habit. I restore older Da Nang buildings and rent them with the original character intact — good light, honest materials, room to breathe." },
  leo: { key: "leo", name: "Leo Hartmann", palette: 4, joined: "2022-11", verified: true, superhost: false, responseRate: 92, responseTime: "within a day", languages: ["English", "German"], bio: "I keep a handful of bright, low-fuss rentals near the river and the beach. Straightforward leases, fair prices, and a neighborhood guide waiting on the counter." },
};

export const SEED_REVIEWS: Review[] = [
  { id: "r1", owner: "you", author: "Priya Nair", initials: "PN", rating: 5, date: "2026-04", stay: "Sunlit studio near Mỹ Khê", text: "Jordan handed over the keys with a hand-drawn map of the best coffee within walking distance. The studio was spotless and exactly as listed — morning light is no joke." },
  { id: "r2", owner: "you", author: "Marcus Webb", initials: "MW", rating: 5, date: "2026-02", stay: "Garden loft by the Hàn River", text: "Fastest host I've ever rented from. A dripping faucet was fixed the same afternoon I mentioned it. The terrace alone is worth the price." },
  { id: "r3", owner: "you", author: "Helena Cho", initials: "HC", rating: 4, date: "2025-11", stay: "Quiet 2-bed near Thanh Khê Beach", text: "Calm, green, and genuinely quiet. Jordan was easy to reach and respected our space. The only nit: parking can be tight on weekends." },
  { id: "r4", owner: "you", author: "Tomás Vega", initials: "TV", rating: 5, date: "2025-09", stay: "Sunlit studio near Mỹ Khê", text: "Everything just worked. Clear lease, no surprises, and a thoughtful welcome note. Would rent from Jordan again without hesitation." },
  { id: "r5", owner: "maya", author: "Daniela Rossi", initials: "DR", rating: 5, date: "2026-03", stay: "Modern 1-bed by the river", text: "Maya's eye for detail shows everywhere — the way the light moves through the place is unreal. She left a binder of neighborhood favorites that we used daily." },
  { id: "r6", owner: "maya", author: "Owen Brennan", initials: "OB", rating: 5, date: "2026-01", stay: "Cozy room in Cẩm Lệ", text: "Small space, big care. Maya thought of things I didn't know I needed. Communication was warm and prompt the entire time." },
  { id: "r7", owner: "maya", author: "Sasha Kim", initials: "SK", rating: 4, date: "2025-10", stay: "Bright 2-bed in Thanh Khê", text: "Beautiful corner unit, lovely morning light. Maya was responsive and kind. The A/C took a day to sort out but she stayed on it." },
  { id: "r8", owner: "leo", author: "Greta Lindqvist", initials: "GL", rating: 5, date: "2026-04", stay: "Top-floor loft in An Thượng", text: "Leo's neighborhood guide was gold — sent us straight to the best roasters and breweries. The loft is even better in person." },
  { id: "r9", owner: "leo", author: "Andre Sullivan", initials: "AS", rating: 4, date: "2026-02", stay: "Beachside house in Nam Ô", text: "Spacious and full of character. Leo was friendly and fair. Replies took a bit longer than expected but he always followed through." },
  { id: "r10", owner: "leo", author: "Mina Farah", initials: "MF", rating: 5, date: "2025-12", stay: "Compact studio near Non Nước", text: "Exactly what was promised — clean, well-located, no fuss. Check-in was simple and Leo answered every question clearly." },
  { id: "r11", owner: "you", author: "Elena Brooks", initials: "EB", rating: 5, date: "2025-07", stay: "Sunlit studio near Mỹ Khê", text: "Jordan goes above and beyond. The kitchen had everything I needed and the building was quiet and secure. Felt like home within a day." },
  { id: "r12", owner: "you", author: "Devon Pratt", initials: "DP", rating: 4, date: "2025-05", stay: "Garden loft by the Hàn River", text: "Lovely loft with great light. Jordan was responsive throughout. Street noise picked up on weekends but earplugs sorted it." },
  { id: "r13", owner: "you", author: "Aisha Rahman", initials: "AR", rating: 5, date: "2025-03", stay: "Quiet 2-bed near Thanh Khê Beach", text: "Spotless, spacious, and the park across the street made morning runs a joy. Jordan even left local recommendations on the fridge." },
  { id: "r14", owner: "you", author: "Caleb Munro", initials: "CM", rating: 5, date: "2025-01", stay: "Sunlit studio near Mỹ Khê", text: "Seamless from booking to checkout. The place stayed cool through the summer and the A/C worked perfectly. Would absolutely rent again." },
  { id: "r15", owner: "you", author: "Nora Whitfield", initials: "NW", rating: 4, date: "2024-11", stay: "Garden loft by the Hàn River", text: "Charming space with thoughtful touches. Communication was excellent. A couple of light bulbs were out on arrival but fixed fast." },
  { id: "r16", owner: "you", author: "Felix Tanaka", initials: "FT", rating: 5, date: "2024-09", stay: "Quiet 2-bed near Thanh Khê Beach", text: "One of the smoothest rentals I've had. Jordan is organized, kind, and genuinely cares that you settle in well." },
  { id: "r17", owner: "maya", author: "Liam Donovan", initials: "LD", rating: 5, date: "2025-08", stay: "Modern 1-bed by the river", text: "Maya's restorations are something else — original wood floors, perfect light. She checked in just enough without ever hovering." },
  { id: "r18", owner: "maya", author: "Yuki Tanaka", initials: "YT", rating: 4, date: "2025-06", stay: "Bright 2-bed in Thanh Khê", text: "Beautiful, calm space. Maya answered quickly and clearly. The Wi-Fi was patchy one evening but resolved by morning." },
  { id: "r19", owner: "maya", author: "Carla Mendes", initials: "CM", rating: 5, date: "2025-04", stay: "Cozy room in Cẩm Lệ", text: "Tiny but mighty — every inch is considered. Maya's neighborhood binder is the best I've come across. Felt cared for the whole stay." },
  { id: "r20", owner: "leo", author: "Hannah Voss", initials: "HV", rating: 5, date: "2025-10", stay: "Top-floor loft in An Thượng", text: "Great value and an unbeatable location. Leo's guide pointed us to spots we'd never have found. The loft views are the real deal." },
  { id: "r21", owner: "leo", author: "Ravi Iyer", initials: "RI", rating: 4, date: "2025-08", stay: "Beachside house in Nam Ô", text: "Roomy, full of character, and a great street. Leo was fair and easygoing. Replies were a touch slow but always followed through." },
];

/* ---- helpers ---- */
/* Prices are stored as a single USD amount. For Vietnamese, callers convert
   to VND at this fixed display rate (demo-only — not a live FX rate) and
   format with `useMoney()`. */
export const USD_TO_VND = 25000;

/* Availability as structured data so callers can localize it. Returns either
   "available now" or a concrete future date. */
export type AvailInfo = { kind: "now" } | { kind: "date"; date: Date };

/* `now` defaults to the current time, so most callers pass nothing. Static
   (prerendered) call sites must pass a time captured inside a cache boundary
   instead — reading the clock during a prerender isn't allowed under Cache
   Components (see the landing showcase fetchers in lib/services/listings). */
export const availInfo = (l: Listing, now: Date = new Date()): AvailInfo => {
  if (!l.available || l.available === "now") return { kind: "now" };
  const d = new Date(l.available + "T00:00:00");
  if (isNaN(d.getTime())) return { kind: "now" };
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  if (d <= today) return { kind: "now" };
  return { kind: "date", date: d };
};

export const initialsOf = (name: string) =>
  name.split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase();

export const reviewsFor = (reviews: Review[], key: string) =>
  reviews.filter((r) => r.owner === key);
export const avgOf = (rs: Review[]) =>
  rs.length ? rs.reduce((s, r) => s + r.rating, 0) / rs.length : 0;

export const getOwner = (key: string): Owner | undefined => OWNERS[key];
