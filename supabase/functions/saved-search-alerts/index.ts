import { createClient } from "npm:@supabase/supabase-js@2";

/* ============================================================
   Saved-search alerts (improvement #3) — the email side.

   NOT WIRED UP YET — deployed but nothing invokes it. When email ships,
   add a DB trigger (pg_net POST with { listing_id }) that fires whenever
   a listing transitions into `active`, and set the RESEND_API_KEY secret.
   Loads every saved search with alerts on, re-runs the browse filter
   predicate against the freshly published listing, and emails each
   matching renter once per (search, listing) pair — the
   saved_search_notifications table is the dedupe, written only after
   a successful send.

   The predicate mirrors filterListings() in
   app/[lang]/(app)/apartments/lib/query.ts — keep the two in sync.

   Required secrets (supabase secrets set):
     ALERT_TRIGGER_SECRET — shared secret the DB trigger sends in the
                          `x-alert-secret` header. This function runs with
                          the service-role key and resolves private emails,
                          so without this gate any holder of the public anon
                          key could invoke it. Requests without the matching
                          header get 401. This check is the authoritative
                          gate regardless of the deploy's verify_jwt setting;
                          if verify_jwt stays on it is simply an additional
                          requirement on top.
     RESEND_API_KEY     — without it the function matches but sends
                          nothing (logs a warning), so it's safe to
                          deploy before the provider is configured.
   Optional:
     ALERTS_FROM_EMAIL  — sender, default "Danapa <onboarding@resend.dev>"
     SITE_URL           — email link origin, default production domain
   ============================================================ */

const SITE_URL = (
  Deno.env.get("SITE_URL") ?? "https://apartments-theta.vercel.app"
).replace(/\/+$/, "");
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const ALERT_TRIGGER_SECRET = Deno.env.get("ALERT_TRIGGER_SECRET");
const FROM = Deno.env.get("ALERTS_FROM_EMAIL") ?? "Danapa <onboarding@resend.dev>";

/* ---- Domain mirrors (schemas/listing, lib/services/listings-map) ---- */

type ListingRow = {
  id: string;
  title: string;
  type: string;
  price: number;
  beds: number;
  baths: number;
  area: number | null;
  district: string;
  city: string;
  owner_id: string;
  status: string;
  amenities: string[];
  available_from: string | null;
  images: string[];
};

const TYPE_LABELS: Record<string, string> = {
  studio: "Studio",
  apartment: "Apartment",
  loft: "Loft",
  townhouse: "Townhouse",
  house: "House",
};

const DISTRICT_LABELS: Record<string, string> = {
  "lien-chieu": "Liên Chiểu",
  "hai-chau": "Hải Châu",
  "cam-le": "Cẩm Lệ",
  "ngu-hanh-son": "Ngũ Hành Sơn",
  "thanh-khe": "Thanh Khê",
  "son-tra": "Sơn Trà",
};

const OWNER_ID_BY_KEY: Record<string, string> = {
  you: "11111111-1111-1111-1111-111111111111",
  maya: "22222222-2222-2222-2222-222222222222",
  leo: "33333333-3333-3333-3333-333333333333",
};

const AVAIL_MAX_DAYS: Record<string, number> = {
  now: 0,
  "1w": 7,
  "2w": 14,
  "1m": 31,
};

const USD_TO_VND = 25000;

type Filters = {
  q: string;
  type: string;
  district: string;
  minPrice: string;
  maxPrice: string;
  beds: string;
  amenities: string[];
  owner: string;
  avail: string;
  minArea: string;
};

function parseFilters(queryString: string): Filters {
  const p = new URLSearchParams(queryString);
  return {
    q: p.get("q") ?? "",
    type: p.get("type") ?? "All",
    district: p.get("district") ?? "All",
    minPrice: p.get("minPrice") ?? "",
    maxPrice: p.get("maxPrice") ?? "",
    beds: p.get("beds") ?? "Any",
    amenities: (p.get("amenities") ?? "").split(",").filter(Boolean),
    owner: p.get("owner") ?? "All",
    avail: p.get("avail") ?? "any",
    minArea: p.get("minArea") ?? "",
  };
}

/** Does one active listing pass a saved search's filters?
    Mirror of filterListings() applied to a single row. */
function listingMatches(l: ListingRow, f: Filters): boolean {
  const typeLabel = TYPE_LABELS[l.type] ?? l.type;
  const q = f.q.trim().toLowerCase();
  if (q) {
    const hay = (
      l.title +
      l.district +
      (DISTRICT_LABELS[l.district] ?? "") +
      l.city +
      typeLabel
    ).toLowerCase();
    if (!hay.includes(q)) return false;
  }
  if (f.type !== "All" && typeLabel !== f.type) return false;
  if (f.district !== "All" && l.district !== f.district) return false;
  if (f.owner !== "All") {
    const ownerId = OWNER_ID_BY_KEY[f.owner] ?? f.owner;
    if (l.owner_id !== ownerId) return false;
  }
  // Mirror filterListings() exactly, including its NaN behavior: a malformed
  // (non-numeric) bound makes the comparison false, which EXCLUDES the listing
  // — matching the site, which shows nothing for such a search. Using the
  // inverted `l.price < +bound` form here would instead let everything through
  // and email phantom alerts.
  if (f.minPrice && !(l.price >= +f.minPrice)) return false;
  if (f.maxPrice && !(l.price <= +f.maxPrice)) return false;
  if (f.beds !== "Any") {
    if (f.beds === "Studio") {
      if (l.beds !== 0) return false;
    } else if (f.beds === "3+") {
      if (l.beds < 3) return false;
    } else if (l.beds !== +f.beds) return false;
  }
  if (f.minArea && !((l.area ?? 0) >= +f.minArea)) return false;
  if (f.avail !== "any") {
    const max = AVAIL_MAX_DAYS[f.avail];
    if (max === undefined) return false;
    // available_from null = available now, which passes every horizon.
    if (l.available_from) {
      const date = new Date(l.available_from + "T00:00:00Z");
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);
      const days = Math.round((date.getTime() - today.getTime()) / 86400000);
      if (days > max) return false;
    }
  }
  if (f.amenities.length && !f.amenities.every((a) => l.amenities.includes(a)))
    return false;
  return true;
}

/* ---- Email rendering (ported from the "Alert Email" design) ---- */

const COPY = {
  en: {
    subject: (name: string) => `A new home matches “${name}”`,
    eyebrow: "Saved-search alert",
    headline: "A new home just matched your saved search",
    sub: "Good places go fast in Da Nang — here’s one that fits, posted moments ago.",
    newBadge: "New today",
    locIn: "in",
    perMonth: "/mo",
    studio: "Studio",
    beds: (n: number) => `${n} bed${n === 1 ? "" : "s"}`,
    baths: (n: number) => `${n} bath${n === 1 ? "" : "s"}`,
    cta: "View this home",
    seeAll: "See all matches on Danapa →",
    why: "You’re getting this because you saved this search on Danapa and turned on email alerts. We’ll only email you when a new home matches — never a digest, never spam.",
    turnOff: "Turn off alerts for this search",
    or: "or ",
    manage: "manage all saved searches",
    addr: "Da Nang, Vietnam",
    unsub: "Manage email alerts on Danapa",
  },
  vi: {
    subject: (name: string) => `Có nhà mới khớp với “${name}”`,
    eyebrow: "Cảnh báo tìm kiếm đã lưu",
    headline: "Một căn nhà mới vừa khớp với tìm kiếm đã lưu của bạn",
    sub: "Những căn tốt ở Đà Nẵng thường hết rất nhanh — đây là một căn phù hợp, vừa được đăng.",
    newBadge: "Mới hôm nay",
    locIn: "tại",
    perMonth: "/tháng",
    studio: "Studio",
    beds: (n: number) => `${n} phòng ngủ`,
    baths: (n: number) => `${n} phòng tắm`,
    cta: "Xem căn nhà này",
    seeAll: "Xem tất cả kết quả trên Danapa →",
    why: "Bạn nhận được email này vì đã lưu tìm kiếm này trên Danapa và bật cảnh báo qua email. Chúng tôi chỉ gửi email khi có nhà mới khớp — không tổng hợp, không spam.",
    turnOff: "Tắt cảnh báo cho tìm kiếm này",
    or: "hoặc ",
    manage: "quản lý tất cả tìm kiếm đã lưu",
    addr: "Đà Nẵng, Việt Nam",
    unsub: "Quản lý cảnh báo email trên Danapa",
  },
} as const;

function money(usd: number, locale: "en" | "vi"): string {
  return locale === "vi"
    ? new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: "VND",
        maximumFractionDigits: 0,
      }).format(usd * USD_TO_VND)
    : new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      }).format(usd);
}

function escapeHtml(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function renderAlertEmail(opts: {
  listing: ListingRow;
  searchName: string;
  queryString: string;
  locale: "en" | "vi";
}): { subject: string; html: string } {
  const { listing, searchName, queryString, locale } = opts;
  const c = COPY[locale];
  const prefix = locale === "en" ? "/en" : "";
  const viewUrl = `${SITE_URL}${prefix}/apartments/${listing.id}`;
  const browseUrl = `${SITE_URL}${prefix}/apartments`;
  const seeAllUrl = queryString ? `${browseUrl}?${queryString}` : browseUrl;

  const title = escapeHtml(listing.title);
  const name = escapeHtml(searchName);
  const districtLabel = DISTRICT_LABELS[listing.district] ?? listing.district;
  const location = escapeHtml(`${districtLabel}, ${listing.city}`);
  const price = money(listing.price, locale);
  const bedsChip = listing.beds === 0 ? c.studio : c.beds(listing.beds);
  const chips = [bedsChip, c.baths(listing.baths)];
  if (listing.area) chips.push(`${listing.area} m²`);
  const chipCells = chips
    .map(
      (chip, i) =>
        `${i > 0 ? '<td style="width:8px"></td>' : ""}<td style="background:#e6ebe4;color:#4d564e;font-size:13px;font-weight:500;padding:6px 11px">${escapeHtml(chip)}</td>`
    )
    .join("");
  const image = listing.images[0]
    ? `<tr><td style="padding:0"><a href="${viewUrl}" style="text-decoration:none;color:inherit;display:block"><img src="${escapeHtml(listing.images[0])}" width="528" alt="${title}" style="display:block;width:100%;height:auto;max-height:228px;object-fit:cover" /></a></td></tr>`
    : "";

  const html = `<!DOCTYPE html>
<html lang="${locale}">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><title>${escapeHtml(c.subject(searchName))}</title></head>
<body style="margin:0;background:#fbfcfa">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">
  <tr><td align="center" style="padding:0">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="border-collapse:collapse;width:600px;max-width:600px;background:#fbfcfa;font-family:'Be Vietnam Pro',ui-sans-serif,system-ui,sans-serif">

      <tr><td style="font-size:1px;line-height:1px;color:#fbfcfa;height:0;overflow:hidden">&nbsp;</td></tr>

      <tr><td style="padding:28px 36px 8px">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
          <td style="vertical-align:middle">
            <table role="presentation" cellpadding="0" cellspacing="0"><tr>
              <td style="width:30px;height:30px;background:#3d7a51;vertical-align:middle;text-align:center">
                <span style="display:inline-block;padding-top:6px">
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 21V4h9v17M14 9h5v12M8 8h2M8 12h2M8 16h2"/></svg>
                </span>
              </td>
              <td style="padding-left:10px;vertical-align:middle">
                <span style="font-size:17px;font-weight:700;letter-spacing:-.01em;color:#222b26">Danapa</span>
              </td>
            </tr></table>
          </td>
          <td align="right" style="vertical-align:middle">
            <span style="font-size:12px;font-weight:500;color:#6a736a;letter-spacing:.02em">${c.eyebrow}</span>
          </td>
        </tr></table>
      </td></tr>

      <tr><td style="padding:16px 36px 0">
        <h1 style="margin:0;font-size:23px;line-height:1.3;font-weight:700;letter-spacing:-.01em;color:#222b26">${c.headline}</h1>
        <p style="margin:10px 0 0;font-size:15px;line-height:1.6;color:#6a736a">${c.sub}</p>
        <div style="margin-top:16px">
          <span style="display:inline-block;background:rgba(61,122,81,.1);color:#2f6242;font-size:13px;font-weight:600;padding:7px 12px">🔔 ${name}</span>
        </div>
      </td></tr>

      <tr><td style="padding:22px 36px 4px">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;background:#f2f5f0;outline:1px solid #e3e8e2">
          ${image}
          <tr><td style="padding:18px 20px 20px">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
              <td style="vertical-align:top">
                <span style="font-size:22px;font-weight:700;letter-spacing:-.01em;color:#222b26">${price}</span><span style="font-size:14px;color:#6a736a">${c.perMonth}</span>
              </td>
              <td align="right" style="vertical-align:top">
                <span style="display:inline-block;background:rgba(61,122,81,.1);color:#2f6242;font-size:12px;font-weight:600;padding:5px 10px">${c.newBadge}</span>
              </td>
            </tr></table>
            <p style="margin:8px 0 0;font-size:17px;font-weight:600;color:#222b26">${title}</p>
            <p style="margin:4px 0 0;font-size:14px;color:#6a736a">${c.locIn} ${location}</p>
            <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:14px"><tr>${chipCells}</tr></table>
          </td></tr>
        </table>
      </td></tr>

      <tr><td style="padding:20px 36px 4px">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%"><tr><td>
          <a href="${viewUrl}" style="display:block;background:#3d7a51;color:#ffffff;text-decoration:none;text-align:center;font-size:15px;font-weight:600;padding:15px 20px">${c.cta}</a>
        </td></tr></table>
        <p style="margin:14px 0 0;text-align:center">
          <a href="${escapeHtml(seeAllUrl)}" style="color:#2f6242;text-decoration:none;font-size:14px;font-weight:600">${c.seeAll}</a>
        </p>
      </td></tr>

      <tr><td style="padding:26px 36px 0"><div style="border-top:1px solid #e3e8e2;font-size:0;line-height:0">&nbsp;</div></td></tr>

      <tr><td style="padding:20px 36px 30px">
        <p style="margin:0;font-size:13px;line-height:1.65;color:#7b847b">${c.why}</p>
        <p style="margin:12px 0 0;font-size:13px;line-height:1.65;color:#7b847b">
          <a href="${browseUrl}" style="color:#2f6242;text-decoration:underline;font-weight:600">${c.turnOff}</a>
          ${c.or}<a href="${browseUrl}" style="color:#2f6242;text-decoration:underline;font-weight:600">${c.manage}</a>
        </p>
      </td></tr>

      <tr><td style="padding:22px 36px 34px;background:#fbfcfa">
        <div style="border-top:1px solid #e3e8e2;font-size:0;line-height:0;margin-bottom:18px">&nbsp;</div>
        <p style="margin:0;font-size:12px;line-height:1.6;color:#8b938a">
          <span style="font-weight:600;color:#222b26">Danapa</span> · ${c.addr}
        </p>
        <p style="margin:8px 0 0;font-size:12px;line-height:1.6;color:#8b938a">
          <a href="${browseUrl}" style="color:#8b938a;text-decoration:underline">${c.unsub}</a>
        </p>
      </td></tr>

    </table>
  </td></tr>
</table>
</body>
</html>`;

  return { subject: c.subject(searchName), html };
}

async function sendEmail(
  to: string,
  subject: string,
  html: string
): Promise<boolean> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: FROM, to: [to], subject, html }),
  });
  if (!res.ok) {
    console.error(`Resend ${res.status}: ${await res.text()}`);
  }
  return res.ok;
}

/* ---- Handler ---- */

Deno.serve(async (req: Request) => {
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    });

  // Caller authorization: only the DB trigger, which sends the shared secret,
  // may invoke this. The function runs with the service-role key and resolves
  // private emails, so the default verify_jwt (which the public anon key
  // satisfies) is not a sufficient gate — require the secret explicitly.
  if (
    !ALERT_TRIGGER_SECRET ||
    req.headers.get("x-alert-secret") !== ALERT_TRIGGER_SECRET
  ) {
    return json({ error: "unauthorized" }, 401);
  }

  let listingId: string | undefined;
  try {
    ({ listing_id: listingId } = await req.json());
  } catch {
    return json({ error: "invalid JSON body" }, 400);
  }
  if (!listingId) return json({ error: "listing_id required" }, 400);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data: listing, error: listingError } = await supabase
    .from("listings")
    .select("*")
    .eq("id", listingId)
    .maybeSingle<ListingRow>();
  if (listingError) return json({ error: listingError.message }, 500);
  // Deleted or unpublished again between trigger and invocation — nothing to do.
  if (!listing || listing.status !== "active") return json({ matched: 0, sent: 0 });

  const { data: searches, error: searchError } = await supabase
    .from("saved_searches")
    .select("*")
    .eq("alerts", true);
  if (searchError) return json({ error: searchError.message }, 500);

  const matching = (searches ?? []).filter(
    (s) =>
      // Owners aren't alerted about their own homes.
      s.profile_id !== listing.owner_id &&
      listingMatches(listing, parseFilters(s.query_string))
  );
  if (matching.length === 0) return json({ matched: 0, sent: 0 });

  // Drop pairs already emailed (e.g. the listing was unpublished and re-published).
  const { data: notified, error: notifiedError } = await supabase
    .from("saved_search_notifications")
    .select("saved_search_id")
    .eq("listing_id", listing.id)
    .in("saved_search_id", matching.map((s) => s.id));
  if (notifiedError) return json({ error: notifiedError.message }, 500);
  const alreadySent = new Set((notified ?? []).map((n) => n.saved_search_id));
  const pending = matching.filter((s) => !alreadySent.has(s.id));

  if (!RESEND_API_KEY) {
    console.warn(
      `RESEND_API_KEY not set — ${pending.length} matching saved search(es) for listing ${listing.id} not emailed`
    );
    return json({ matched: pending.length, sent: 0, reason: "no RESEND_API_KEY" });
  }

  // Sends stay per-user cheap: the cap trigger bounds searches per renter,
  // and volume is one publish event at a time.
  const emailByProfile = new Map<string, string | null>();
  let sent = 0;
  for (const s of pending) {
    let email = emailByProfile.get(s.profile_id);
    if (email === undefined) {
      const { data } = await supabase.auth.admin.getUserById(s.profile_id);
      email = data?.user?.email ?? null;
      emailByProfile.set(s.profile_id, email);
    }
    if (!email) continue;

    const locale = s.locale === "en" ? "en" : "vi";
    const { subject, html } = renderAlertEmail({
      listing,
      searchName: s.name,
      queryString: s.query_string,
      locale,
    });
    if (await sendEmail(email, subject, html)) {
      sent++;
      await supabase.from("saved_search_notifications").upsert(
        { saved_search_id: s.id, listing_id: listing.id },
        { onConflict: "saved_search_id,listing_id", ignoreDuplicates: true }
      );
    }
  }

  return json({ matched: pending.length, sent });
});
