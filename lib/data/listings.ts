import { z } from "zod";

/* ============================================================
   Danapa sample data + schemas.
   Reusable types are derived from zod schemas (z.infer).
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

export const AmenitySchema = z.object({
  id: z.string(),
  label: z.string(),
  icon: z.string(),
});
export type Amenity = z.infer<typeof AmenitySchema>;

export const AMENITIES: Amenity[] = [
  { id: "wifi", label: "Fast Wi-Fi", icon: "wifi" },
  { id: "parking", label: "Parking", icon: "car" },
  { id: "pets", label: "Pet friendly", icon: "paw" },
  { id: "garden", label: "Garden / yard", icon: "leaf" },
  { id: "ac", label: "Heating & A/C", icon: "snow" },
  { id: "laundry", label: "In-unit laundry", icon: "check-circle" },
];

export const TYPES = ["Studio", "Apartment", "Loft", "Townhouse", "House"] as const;

export const ListingSchema = z.object({
  id: z.string(),
  title: z.string(),
  type: z.string(),
  price: z.number(),
  beds: z.number(),
  baths: z.number(),
  area: z.number(),
  neighborhood: z.string(),
  city: z.string(),
  palette: z.number(),
  amenities: z.array(z.string()),
  owner: z.string(),
  status: z.enum(["active", "draft"]),
  views: z.number(),
  available: z.string(),
  desc: z.string(),
});
export type Listing = z.infer<typeof ListingSchema>;

export const OwnerSchema = z.object({
  key: z.string(),
  name: z.string(),
  palette: z.number(),
  joined: z.string(),
  location: z.string(),
  verified: z.boolean(),
  superhost: z.boolean(),
  responseRate: z.number(),
  responseTime: z.string(),
  languages: z.array(z.string()),
  bio: z.string(),
});
export type Owner = z.infer<typeof OwnerSchema>;

export const ReviewSchema = z.object({
  id: z.string(),
  owner: z.string(),
  author: z.string(),
  initials: z.string(),
  rating: z.number(),
  date: z.string(),
  stay: z.string().optional(),
  text: z.string(),
});
export type Review = z.infer<typeof ReviewSchema>;

export const SEED_LISTINGS: Listing[] = [
  { id: "l1", title: "Sunlit studio off Alberta", type: "Studio", price: 1450, beds: 0, baths: 1, area: 38, neighborhood: "Alberta Arts", city: "Portland, OR", palette: 0, amenities: ["wifi", "laundry", "ac"], owner: "you", status: "active", views: 312, available: "now", desc: "A bright, efficient studio a block from Alberta Street's cafes and the Thursday market. South-facing windows keep it warm and full of light all afternoon." },
  { id: "l2", title: "Garden loft in the Pearl", type: "Loft", price: 2380, beds: 1, baths: 1, area: 71, neighborhood: "Pearl District", city: "Portland, OR", palette: 1, amenities: ["wifi", "parking", "garden", "ac"], owner: "you", status: "active", views: 521, available: "2026-07-01", desc: "Open-plan loft with 11-ft ceilings and a private planted terrace. Walk to the streetcar, galleries, and Jamison Square fountain." },
  { id: "l3", title: "Quiet 2-bed near Laurelhurst Park", type: "Apartment", price: 1990, beds: 2, baths: 1, area: 84, neighborhood: "Laurelhurst", city: "Portland, OR", palette: 6, amenities: ["wifi", "pets", "garden", "laundry"], owner: "you", status: "active", views: 244, available: "now", desc: "Calm tree-lined block, two-minute stroll to the duck pond. Refinished fir floors, a sunny breakfast nook, and a shared back garden." },
  { id: "l4", title: "Hawthorne townhouse with yard", type: "Townhouse", price: 2750, beds: 3, baths: 2, area: 122, neighborhood: "Hawthorne", city: "Portland, OR", palette: 4, amenities: ["wifi", "parking", "pets", "garden", "ac", "laundry"], owner: "you", status: "draft", views: 0, available: "2026-08-15", desc: "Three-story townhouse steps from Hawthorne's shops and food carts. Fenced backyard, attached garage, and a roof deck with West Hills views." },
  { id: "l5", title: "Cozy room in Sellwood", type: "Studio", price: 1180, beds: 0, baths: 1, area: 30, neighborhood: "Sellwood", city: "Portland, OR", palette: 2, amenities: ["wifi", "ac"], owner: "maya", status: "active", views: 188, available: "now", desc: "Snug studio in a quiet riverside neighborhood. Antique row, Oaks Park, and the Springwater trail are all within walking distance." },
  { id: "l6", title: "Modern 1-bed by the river", type: "Apartment", price: 1875, beds: 1, baths: 1, area: 58, neighborhood: "South Waterfront", city: "Portland, OR", palette: 3, amenities: ["wifi", "parking", "ac", "laundry"], owner: "maya", status: "active", views: 402, available: "2026-06-20", desc: "Floor-to-ceiling windows over the Willamette, with the aerial tram and riverfront path at your door. Bright, minimal, move-in ready." },
  { id: "l7", title: "Craftsman house in Mississippi", type: "House", price: 3200, beds: 4, baths: 2, area: 168, neighborhood: "Mississippi Ave", city: "Portland, OR", palette: 5, amenities: ["wifi", "parking", "pets", "garden", "laundry"], owner: "leo", status: "active", views: 276, available: "now", desc: "Restored 1912 Craftsman with original built-ins and a wraparound porch. Big kitchen, mature garden, and easy reach to the avenue's restaurants." },
  { id: "l8", title: "Top-floor loft, Central Eastside", type: "Loft", price: 2150, beds: 1, baths: 1, area: 76, neighborhood: "Central Eastside", city: "Portland, OR", palette: 7, amenities: ["wifi", "parking", "ac"], owner: "leo", status: "active", views: 159, available: "2026-07-15", desc: "Converted warehouse loft with exposed timber, polished concrete, and skyline views. Roasters, breweries, and studios fill the block below." },
  { id: "l9", title: "Bright 2-bed in Beaumont", type: "Apartment", price: 2040, beds: 2, baths: 2, area: 92, neighborhood: "Beaumont-Wilshire", city: "Portland, OR", palette: 0, amenities: ["wifi", "garden", "ac", "laundry"], owner: "maya", status: "active", views: 221, available: "now", desc: "Spacious corner unit with morning light in both bedrooms. Friendly village of shops below and Alameda ridge walks just up the hill." },
  { id: "l10", title: "Compact studio, Goose Hollow", type: "Studio", price: 1320, beds: 0, baths: 1, area: 33, neighborhood: "Goose Hollow", city: "Portland, OR", palette: 6, amenities: ["wifi", "ac"], owner: "leo", status: "active", views: 134, available: "now", desc: "Smart, well-laid-out studio with a MAX stop on the corner and Washington Park trails minutes away. Everything you need, nothing you don't." },
];

export const OWNERS: Record<string, Owner> = {
  you: { key: "you", name: "Jordan Rivera", palette: 1, joined: "2021-03", location: "Portland, OR", verified: true, superhost: true, responseRate: 99, responseTime: "within an hour", languages: ["English", "Spanish"], bio: "Born-and-raised Portlander renting out a small, well-loved collection of homes across the east side. I look after each place like it's my own — quick to fix things, slow to cut corners." },
  maya: { key: "maya", name: "Maya Okonkwo", palette: 5, joined: "2019-08", location: "Portland, OR", verified: true, superhost: true, responseRate: 97, responseTime: "within a few hours", languages: ["English", "French"], bio: "Architect by training, host by habit. I restore older Portland buildings and rent them with the original character intact — good light, honest materials, room to breathe." },
  leo: { key: "leo", name: "Leo Hartmann", palette: 4, joined: "2022-11", location: "Portland, OR", verified: true, superhost: false, responseRate: 92, responseTime: "within a day", languages: ["English", "German"], bio: "I keep a handful of bright, low-fuss rentals near the river and the central eastside. Straightforward leases, fair prices, and a neighborhood guide waiting on the counter." },
};

export const SEED_REVIEWS: Review[] = [
  { id: "r1", owner: "you", author: "Priya Nair", initials: "PN", rating: 5, date: "2026-04", stay: "Sunlit studio off Alberta", text: "Jordan handed over the keys with a hand-drawn map of the best coffee within walking distance. The studio was spotless and exactly as listed — afternoon light is no joke." },
  { id: "r2", owner: "you", author: "Marcus Webb", initials: "MW", rating: 5, date: "2026-02", stay: "Garden loft in the Pearl", text: "Fastest host I've ever rented from. A dripping faucet was fixed the same afternoon I mentioned it. The terrace alone is worth the price." },
  { id: "r3", owner: "you", author: "Helena Cho", initials: "HC", rating: 4, date: "2025-11", stay: "Quiet 2-bed near Laurelhurst Park", text: "Calm, green, and genuinely quiet. Jordan was easy to reach and respected our space. The only nit: parking can be tight on weekends." },
  { id: "r4", owner: "you", author: "Tomás Vega", initials: "TV", rating: 5, date: "2025-09", stay: "Sunlit studio off Alberta", text: "Everything just worked. Clear lease, no surprises, and a thoughtful welcome note. Would rent from Jordan again without hesitation." },
  { id: "r5", owner: "maya", author: "Daniela Rossi", initials: "DR", rating: 5, date: "2026-03", stay: "Modern 1-bed by the river", text: "Maya's eye for detail shows everywhere — the way the light moves through the place is unreal. She left a binder of neighborhood favorites that we used daily." },
  { id: "r6", owner: "maya", author: "Owen Brennan", initials: "OB", rating: 5, date: "2026-01", stay: "Cozy room in Sellwood", text: "Small space, big care. Maya thought of things I didn't know I needed. Communication was warm and prompt the entire time." },
  { id: "r7", owner: "maya", author: "Sasha Kim", initials: "SK", rating: 4, date: "2025-10", stay: "Bright 2-bed in Beaumont", text: "Beautiful corner unit, lovely morning light. Maya was responsive and kind. Heating took a day to sort out but she stayed on it." },
  { id: "r8", owner: "leo", author: "Greta Lindqvist", initials: "GL", rating: 5, date: "2026-04", stay: "Top-floor loft, Central Eastside", text: "Leo's neighborhood guide was gold — sent us straight to the best roasters and breweries. The loft is even better in person." },
  { id: "r9", owner: "leo", author: "Andre Sullivan", initials: "AS", rating: 4, date: "2026-02", stay: "Craftsman house in Mississippi", text: "Spacious and full of character. Leo was friendly and fair. Replies took a bit longer than expected but he always followed through." },
  { id: "r10", owner: "leo", author: "Mina Farah", initials: "MF", rating: 5, date: "2025-12", stay: "Compact studio, Goose Hollow", text: "Exactly what was promised — clean, well-located, no fuss. Check-in was simple and Leo answered every question clearly." },
  { id: "r11", owner: "you", author: "Elena Brooks", initials: "EB", rating: 5, date: "2025-07", stay: "Sunlit studio off Alberta", text: "Jordan goes above and beyond. The kitchen had everything I needed and the building was quiet and secure. Felt like home within a day." },
  { id: "r12", owner: "you", author: "Devon Pratt", initials: "DP", rating: 4, date: "2025-05", stay: "Garden loft in the Pearl", text: "Lovely loft with great light. Jordan was responsive throughout. Street noise picked up on weekends but earplugs sorted it." },
  { id: "r13", owner: "you", author: "Aisha Rahman", initials: "AR", rating: 5, date: "2025-03", stay: "Quiet 2-bed near Laurelhurst Park", text: "Spotless, spacious, and the park across the street made morning runs a joy. Jordan even left local recommendations on the fridge." },
  { id: "r14", owner: "you", author: "Caleb Munro", initials: "CM", rating: 5, date: "2025-01", stay: "Sunlit studio off Alberta", text: "Seamless from booking to checkout. The place was warm in winter and the heating worked perfectly. Would absolutely rent again." },
  { id: "r15", owner: "you", author: "Nora Whitfield", initials: "NW", rating: 4, date: "2024-11", stay: "Garden loft in the Pearl", text: "Charming space with thoughtful touches. Communication was excellent. A couple of light bulbs were out on arrival but fixed fast." },
  { id: "r16", owner: "you", author: "Felix Tanaka", initials: "FT", rating: 5, date: "2024-09", stay: "Quiet 2-bed near Laurelhurst Park", text: "One of the smoothest rentals I've had. Jordan is organized, kind, and genuinely cares that you settle in well." },
  { id: "r17", owner: "maya", author: "Liam Donovan", initials: "LD", rating: 5, date: "2025-08", stay: "Modern 1-bed by the river", text: "Maya's restorations are something else — original wood floors, perfect light. She checked in just enough without ever hovering." },
  { id: "r18", owner: "maya", author: "Yuki Tanaka", initials: "YT", rating: 4, date: "2025-06", stay: "Bright 2-bed in Beaumont", text: "Beautiful, calm space. Maya answered quickly and clearly. The Wi-Fi was patchy one evening but resolved by morning." },
  { id: "r19", owner: "maya", author: "Carla Mendes", initials: "CM", rating: 5, date: "2025-04", stay: "Cozy room in Sellwood", text: "Tiny but mighty — every inch is considered. Maya's neighborhood binder is the best I've come across. Felt cared for the whole stay." },
  { id: "r20", owner: "leo", author: "Hannah Voss", initials: "HV", rating: 5, date: "2025-10", stay: "Top-floor loft, Central Eastside", text: "Great value and an unbeatable location. Leo's guide pointed us to spots we'd never have found. The loft views are the real deal." },
  { id: "r21", owner: "leo", author: "Ravi Iyer", initials: "RI", rating: 4, date: "2025-08", stay: "Craftsman house in Mississippi", text: "Roomy, full of character, and a great street. Leo was fair and easygoing. Replies were a touch slow but always followed through." },
];

/* ---- helpers ---- */
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export const money = (n: number) => "$" + n.toLocaleString();
export const specStr = (l: Listing) => (l.beds === 0 ? "Studio" : `${l.beds} bed`);

export const availLabel = (l: Listing) => {
  if (!l.available || l.available === "now") return "Available now";
  const d = new Date(l.available + "T00:00:00");
  if (isNaN(d.getTime())) return "Available now";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (d <= today) return "Available now";
  return "Available " + d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

export const monthLabel = (key: string) => {
  if (!key) return "";
  const [y, m] = key.split("-");
  return `${MONTHS[+m - 1]} ${y}`;
};

export const initialsOf = (name: string) =>
  name.split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase();

export const ownerListings = (listings: Listing[], key: string) =>
  listings.filter((l) => l.owner === key && l.status === "active");
export const reviewsFor = (reviews: Review[], key: string) =>
  reviews.filter((r) => r.owner === key);
export const avgOf = (rs: Review[]) =>
  rs.length ? rs.reduce((s, r) => s + r.rating, 0) / rs.length : 0;

export const getListing = (id: string) => SEED_LISTINGS.find((l) => l.id === id);
export const getOwner = (key: string): Owner | undefined => OWNERS[key];
